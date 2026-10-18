"""
YouKnowBall player-data enrichment (offline; Wikidata CC0).

Resolves every player already listed in js/data.js to a Wikidata item, then pulls
the fields that go stale fastest: current club, position, nationality, date of birth,
full club history and retirement status.

Why not SPARQL: the WDQS endpoint query-timeouts (HTTP 504) on club-history queries.
This uses the plain MediaWiki/Wikidata Action API instead:
  1. batch-resolve names to Wikidata IDs via English Wikipedia titles
     (action=query&prop=pageprops, ~40 names a call) and fall back to
     wbsearchentities for the handful that need disambiguating;
  2. wbgetentities for the claims (batched ~50 items a call).
Same source, no query planner, a fraction of the requests.

Writes (working files, gitignored):
  data/enrich.json         the machine-readable result
  data/enrich-report.csv   one row per player/field: old, new, changed?, confidence, source

Usage (Python 3.9+, pip install requests), from the pipeline folder:
  python enrich_players.py                 # refresh data/enrich.json + data/enrich-report.csv
  python enrich_players.py --apply         # also patch js/data.js with CONFIRMED changes only

What "confirmed" means, and what is never touched:
  * A birth year is corrected only when the name resolves to exactly ONE Wikidata
    footballer whose P569 disagrees with ours.
  * The CURRENT map (current club, or "Retired") and DATA_UPDATED come from the same run.
    Only players with an unambiguous club situation are included.
  * Nationality, position and club-history differences are ALWAYS reported for a human to
    review and NEVER applied automatically: multiple/contested nationalities, coarse
    position buckets and loan/youth-club clutter are all judgement calls.

Every reported value carries the Wikidata QID and the property (claim) it came from.
"""
import argparse, csv, datetime, json, os, re, sys, time, unicodedata
import requests

ENWIKI_API = "https://en.wikipedia.org/w/api.php"
WD_API = "https://www.wikidata.org/w/api.php"
UA = {"User-Agent": "YouKnowBall-pipeline/3.0 (https://github.com/Aizen-Sasuke/youknowball; data refresh)",
      "Accept": "application/json"}

FOOTBALLER = "Q937857"          # association football player

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA_JS = os.path.join(ROOT, "js", "data.js")
OUT_DIR = os.path.join(HERE, "data")
TODAY = datetime.date.today()
TODAY_ISO = TODAY.isoformat()

BLOCK_START = "/* --- Wikidata enrichment (offline; regenerate with pipeline/enrich_players.py) --- */"
BLOCK_RE = re.compile(re.escape(BLOCK_START) + r".*?const CURRENT=\{[^}]*\};", re.S)

NATT = re.compile(r"\bnational\b.*\bteam\b", re.I)

# ---------- helpers ----------

def log(msg):
    print(msg, file=sys.stderr, flush=True)

def norm(s):
    if not s:
        return ""
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"[^a-z0-9 ]", " ", s.lower())
    return re.sub(r"\s+", " ", s).strip()

def chunks(seq, n):
    for i in range(0, len(seq), n):
        yield seq[i:i + n]

# ---------- Action API (rate-limit aware) ----------

def api_get(url, params, retries=8):
    for attempt in range(retries):
        r = requests.get(url, params=params, headers=UA, timeout=60)
        if r.status_code == 200:
            return r.json()
        if r.status_code in (429, 500, 502, 503, 504):
            wait = float(r.headers.get("Retry-After") or 0) or min(30, 4 * (attempt + 1))
            log(f"  {r.status_code} from {url.split('/')[2]}, retry in {wait:.0f}s")
            time.sleep(wait)
            continue
        r.raise_for_status()
    raise SystemExit("API kept failing (rate limit or outage). Try again later.")

def enwiki_resolve(names):
    """English Wikipedia title -> Wikidata QID, batched. Handles normalisation + redirects;
    disambiguation pages and missing pages return None."""
    resolved = {}
    for batch in chunks(list(names), 40):
        data = api_get(ENWIKI_API, {
            "action": "query", "titles": "|".join(batch), "prop": "pageprops",
            "ppprop": "wikibase_item|disambiguation", "redirects": "1",
            "format": "json", "formatversion": "2"})
        q = data.get("query", {})
        norm_map = {n["from"]: n["to"] for n in q.get("normalized", [])}
        redir = {r["from"]: r["to"] for r in q.get("redirects", [])}
        pages = {p.get("title", ""): p for p in q.get("pages", [])}
        for name in batch:
            title = norm_map.get(name, name)
            title = redir.get(title, title)
            page = pages.get(title)
            pp = (page or {}).get("pageprops", {})
            resolved[name] = pp.get("wikibase_item") if (page and not page.get("missing")
                                                         and "disambiguation" not in pp) else None
        time.sleep(0.4)
    return resolved

def enwiki_search_qid(name):
    """Last resort for accented / disambiguated names: Wikipedia full-text search."""
    data = api_get(ENWIKI_API, {"action": "query", "list": "search",
                                "srsearch": name + " footballer", "srlimit": 1,
                                "format": "json", "formatversion": "2"})
    hits = data.get("query", {}).get("search", [])
    if not hits:
        return None
    title = hits[0].get("title", "")
    return enwiki_resolve([title]).get(title) if title else None

def search_candidates(name):
    data = api_get(WD_API, {"action": "wbsearchentities", "search": name, "language": "en",
                            "uselang": "en", "type": "item", "limit": 8, "format": "json"})
    return data.get("search", [])
def get_entities(ids, props="claims|labels|aliases"):
    out = {}
    for batch in chunks(sorted(set(ids)), 50):
        data = api_get(WD_API, {"action": "wbgetentities", "ids": "|".join(batch),
                                "props": props, "languages": "en", "format": "json"})
        for q, e in data.get("entities", {}).items():
            if "missing" not in e:
                out[q] = e
        time.sleep(0.3)
    return out

def labels_for(ids):
    out = {}
    for q, e in get_entities(ids, props="labels").items():
        lab = e.get("labels", {}).get("en", {}).get("value", "")
        if lab:
            out[q] = lab
    return out

# ---------- claim readers ----------

def claim_snaks(entity, prop):
    for st in entity.get("claims", {}).get(prop, []):
        if st.get("rank") == "deprecated":
            continue
        yield st

def entity_ids(entity, prop):
    out = []
    for st in claim_snaks(entity, prop):
        dv = st.get("mainsnak", {}).get("datavalue", {})
        if dv.get("type") == "wikibase-entityid":
            out.append(dv["value"]["id"])
    return out

def parse_time(dv):
    """Wikidata time *datavalue* ({"value":{"time":...},"type":"time"}) -> (year, date|year)."""
    val = dv.get("value") if dv.get("type") == "time" else dv
    if not isinstance(val, dict):
        return "", ""
    t = val.get("time", "")
    if not t:
        return "", ""
    sign = -1 if t[0] == "-" else 1
    parts = t[1:].split("T")[0].split("-")
    y = int(parts[0]) if parts and parts[0] else 0
    mo = parts[1] if len(parts) > 1 else "00"
    d = parts[2] if len(parts) > 2 else "00"
    prec = val.get("precision", 11)
    y = y * sign
    if prec >= 11 and mo != "00" and d != "00":
        return str(y), f"{y:04d}-{mo}-{d}"
    if prec >= 10 and mo != "00":
        return str(y), f"{y:04d}-{mo}"
    return str(y), str(y)

def dob_of(entity):
    for st in claim_snaks(entity, "P569"):
        dv = st.get("mainsnak", {}).get("datavalue", {})
        if dv.get("type") == "time":
            return parse_time(dv)
    return "", ""

def club_statements(entity, club_labels, club_ok=None):
    out = []
    for st in claim_snaks(entity, "P54"):
        dv = st.get("mainsnak", {}).get("datavalue", {})
        if dv.get("type") != "wikibase-entityid":
            continue
        club = dv["value"]["id"]
        label = club_labels.get(club, club)
        if label == club:
            continue
        if NATT.search(label):
            continue
        if club_ok is not None and club not in club_ok:
            continue
        q = st.get("qualifiers", {})
        start = end = role = ""
        for key, prop in (("start", "P580"), ("end", "P582")):
            snak = (q.get(prop) or [None])[0]
            qdv = snak.get("datavalue") if isinstance(snak, dict) else None
            if qdv and qdv.get("type") == "time":
                value = parse_time(qdv)[1]
                if key == "start":
                    start = value
                else:
                    end = value
        if q.get("P3831"):
            rv = (q["P3831"][0] or {}).get("datavalue", {})
            role = rv.get("value", {}).get("id", "") if rv.get("type") == "wikibase-entityid" else ""
        if not start and not end:
            continue  # undated statements carry no information (often stray/spam)
        out.append({"club": club, "start": start, "end": end, "role": role,
                    "preferred": st.get("rank") == "preferred"})
    return out

def football_club_ids(candidate_ids):
    """Keep only clubs whose P31 (instance of) is a football class — drops ice-hockey,
    basketball and other sports clubs that share a name with a football club."""
    ents = get_entities(candidate_ids, props="claims")
    classes = set()
    per = {}
    for q, e in ents.items():
        per[q] = entity_ids(e, "P31")
        classes.update(per[q])
    class_labels = labels_for(classes)
    good = set()
    for q, cs in per.items():
        for c in cs:
            lab = class_labels.get(c, "").lower()
            if "football" in lab and "american" not in lab and "gaelic" not in lab:
                good.add(q)
                break
    return good

# ---------- read the current data ----------

def read_players():
    src = open(DATA_JS, encoding="utf-8").read()
    m = re.search(r"const RAW=`(.*?)`", src, re.S)
    if not m:
        raise SystemExit("could not find the RAW block in js/data.js")
    players = []
    for line in m.group(1).split("\n"):
        if not line.strip():
            continue
        f = line.split("|")
        players.append({"name": f[0], "nat": f[1], "pos": f[2], "yr": f[3],
                        "clubs": f[4], "line": line})
    return players, src

# ---------- interpretation ----------

POS_MAP = [
    ("goalkeeper", "goalkeeper"),
    ("centre-back", "defender"), ("center-back", "defender"), ("defender", "defender"),
    ("full-back", "defender"), ("wing-back", "defender"), ("sweeper", "defender"),
    ("defensive midfield", "midfielder"), ("midfield", "midfielder"),
    ("playmaker", "midfielder"), ("winger", "winger"),
    ("forward", "forward"), ("striker", "striker"), ("centre-forward", "striker"),
]

def map_positions(labels):
    out = []
    for l in labels:
        low = l.lower()
        for needle, bucket in POS_MAP:
            if needle in low:
                if bucket not in out:
                    out.append(bucket)
                break
    return out

def club_situation(stints, birth_year):
    """(value, confidence, note): current club, "Retired", or None. Conservative: an overlap,
    a live loan, a missing start date or a suspicious gap is treated as ambiguous, not guessed.
    A preferred-ranked club with no end date is authoritative, because loan spells are also
    stored as P54 (so "latest start" would wrongly pick the parent club's loans, not the club).
    Retirement additionally needs a plausible age, since a player whose Wikidata is simply
    incomplete must not be reported as retired."""
    if not stints:
        return None, "none", "no club history on Wikidata"
    active = [s for s in stints if not s["end"] or s["end"] >= TODAY_ISO]
    ended = [s for s in stints if s["end"]]

    def age():
        try:
            return TODAY.year - int(birth_year)
        except (TypeError, ValueError):
            return None

    def retirement_plausible(items):
        years = [int(x["end"][:4]) for x in items if x["end"]]
        if not years:
            return False
        a = age()
        return max(years) <= TODAY.year - 1 and (a is None or a >= 32)

    if len(active) > 1:
        pref = [s for s in active if s["preferred"]]
        if len(pref) == 1:
            return pref[0]["club"], "confirmed", "preferred-ranked live club"
        return None, "ambiguous", "more than one club without an end date"
    if len(active) == 1:
        s = active[0]
        if s["preferred"] and not s["role"]:
            return s["club"], "confirmed", "preferred-ranked club with no end date"
        reasons = []
        if s["role"]:
            reasons.append("live spell is a loan/role")
        if not s["start"]:
            reasons.append("live club has no start date")
        else:
            start_y = int(s["start"][:4])
            if start_y > TODAY.year:
                reasons.append("live club starts in the future")
            prev_end = max((int(x["end"][:4]) for x in stints if x is not s and x["end"]), default=None)
            if prev_end is not None and prev_end + 2 < start_y:
                reasons.append("gap since the previous club")
        if not reasons:
            return s["club"], "confirmed", "club statement with no end date"
        others = [x for x in stints if x is not s]
        if retirement_plausible(others):
            return "Retired", "confirmed", "stray live statement ignored; all other clubs ended"
        return None, "ambiguous", ", ".join(reasons)
    if ended and len(ended) == len(stints):
        latest = max(s["end"] for s in ended)
        if retirement_plausible(ended):
            return "Retired", "confirmed", "all clubs ended, latest " + latest
        return None, "ambiguous", "last club ended recently (or age implausible), cannot confirm"
    return None, "ambiguous", "mix of ended and missing dates"

# ---------- main ----------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true",
                    help="patch js/data.js with confirmed changes (years + CURRENT + DATA_UPDATED)")
    ap.add_argument("--apply-json", action="store_true",
                    help="apply using an existing data/enrich.json (no network); pairs with a reviewed run")
    ap.add_argument("--limit", type=int, default=0, help="only process the first N players (testing)")
    ap.add_argument("--out", default=OUT_DIR)
    args = ap.parse_args()

    players, src = read_players()
    if args.apply_json:
        path = os.path.join(args.out, "enrich.json")
        if not os.path.exists(path):
            raise SystemExit("no " + path + " — run without --apply-json first")
        enrich = json.load(open(path, encoding="utf-8"))["players"]
        apply_changes(players, enrich, src)
        return
    if args.limit:
        players = players[:args.limit]
    names = [p["name"] for p in players]
    log(f"{len(players)} players to enrich")

    log("1/4 resolving names via English Wikipedia...")
    enwiki_ids = enwiki_resolve(names)
    ents = get_entities([q for q in enwiki_ids.values() if q])
    # titles that resolved to a non-footballer (or nothing): retry as "<name> (footballer)"
    alt_names = [n for n in names
                 if FOOTBALLER not in entity_ids(ents.get(enwiki_ids.get(n) or "", {}), "P106")]
    if alt_names:
        alt = enwiki_resolve([n + " (footballer)" for n in alt_names])
        fresh = []
        for n in alt_names:
            q = alt.get(n + " (footballer)")
            if q:
                enwiki_ids[n] = q
                fresh.append(q)
        if fresh:
            ents.update(get_entities(fresh))
    log(f"    {sum(1 for q in enwiki_ids.values() if q)} titles resolved")

    log("2/4 disambiguating the rest...")
    meta, need_fetch = {}, []
    for p in players:
        name = p["name"]
        q = enwiki_ids.get(name)
        if q and FOOTBALLER in entity_ids(ents.get(q, {}), "P106"):
            continue
        # a) English Wikipedia full-text search ("<name> footballer") for accented/ambiguous titles
        wq = enwiki_search_qid(name)
        if wq:
            enwiki_ids[name] = wq
            ents.update(get_entities([wq]))
        # b) Wikidata search as the last resort
        hits = search_candidates(name)
        meta[name] = [h["id"] for h in hits]
        need_fetch += [h["id"] for h in hits]
        time.sleep(0.3)
    if need_fetch:
        ents.update(get_entities(need_fetch))
    log(f"    searched {len(meta)} names")

    log("3/4 matching identities and resolving labels...")
    def names_of(e):
        out = [e.get("labels", {}).get("en", {}).get("value", "")]
        out += [a.get("value", "") for a in e.get("aliases", {}).get("en", [])]
        return [norm(x) for x in out if x]

    def is_footballer(q):
        return bool(q) and FOOTBALLER in entity_ids(ents.get(q, {}), "P106")

    def dob_year(q):
        return dob_of(ents.get(q, {}))[0]

    def dob_close(q, yr):
        d = dob_year(q)
        return (not d) or abs(int(d) - int(yr)) <= 1

    matches = {}
    for p in players:
        name, yr = p["name"], p["yr"]
        enq = enwiki_ids.get(name)
        entry = None
        # 1) English Wikipedia title resolution (strong), unless the birth year disagrees
        if is_footballer(enq) and dob_close(enq, yr):
            entry = {"qid": enq, "ambiguous": False, "method": "enwiki"}
        else:
            # 2) Wikidata search, confirmed by a matching birth year (guards against
            #    same-name people: the Brazilian "Socrates" vs a journeyman keeper)
            n = norm(name)
            cands = [q for q in meta.get(name, []) if is_footballer(q)]
            exact = [q for q in cands if n in names_of(ents[q])]
            dob_ok = [q for q in exact if dob_year(q) and abs(int(dob_year(q)) - int(yr)) <= 1]
            if len(dob_ok) == 1:
                entry = {"qid": dob_ok[0], "ambiguous": False, "method": "search"}
            elif len(dob_ok) > 1 or len(exact) > 1:
                entry = {"qid": None, "ambiguous": True, "method": "search",
                         "note": "several exact matches, birth year could not decide"}
            elif cands:
                entry = {"qid": None, "ambiguous": True, "method": "search",
                         "note": "no exact match with a matching birth year"}
        matches[name] = entry

    matched_qids = [m["qid"] for m in matches.values() if m and m.get("qid")]
    ref = set()
    club_ids = set()
    for q in matched_qids:
        e = ents[q]
        ref.update(entity_ids(e, "P27"))
        ref.update(entity_ids(e, "P413"))
        for st in claim_snaks(e, "P54"):
            dv = st.get("mainsnak", {}).get("datavalue", {})
            if dv.get("type") == "wikibase-entityid":
                club_ids.add(dv["value"]["id"])
            for s2 in st.get("qualifiers", {}).get("P3831", []):
                v = s2.get("datavalue", {}).get("value", {})
                if isinstance(v, dict) and v.get("id"):
                    ref.add(v["id"])
    log(f"    validating {len(club_ids)} club items against P31...")
    good_clubs = football_club_ids(club_ids)
    log(f"    {len(good_clubs)}/{len(club_ids)} are football clubs; resolving referenced labels...")
    ref_labels = labels_for(ref | club_ids)

    log("4/4 building report...")
    enrich, report = {}, []
    def row(name, field, old, new, changed, conf, source):
        report.append([name, field, old, new, "yes" if changed else "no", conf, source])

    for p in players:
        name = p["name"]
        m = matches.get(name)
        if not m or not m.get("qid"):
            enrich[name] = {"resolved": False, "note": (m or {}).get("note", "not found")}
            row(name, "identity", "", "", False, "review", (m or {}).get("note", "not found"))
            continue
        q = m["qid"]
        e = ents[q]
        year, _ = dob_of(e)
        nats = [ref_labels.get(x, x) for x in entity_ids(e, "P27")]
        poss = [ref_labels.get(x, x) for x in entity_ids(e, "P413")]
        stints = club_statements(e, ref_labels, good_clubs)
        for s in stints:
            s["club"] = ref_labels.get(s["club"], s["club"])
            s["role"] = ref_labels.get(s["role"], s["role"]) if s["role"] else ""
        entry = {"resolved": True, "qid": q, "ambiguous": bool(m.get("ambiguous")),
                 "method": m.get("method", ""), "note": m.get("note", ""), "dob": year,
                 "nationalities": nats, "positions": poss, "clubs": stints}
        year_ok = bool(year) and not m.get("ambiguous") and year != p["yr"]
        entry["year_change"] = year if year_ok else None
        row(name, "birth_year", p["yr"], year or p["yr"], year_ok,
            "confirmed" if year_ok else "review", q + " P569" + ("" if year else " (none)"))
        nat_change = bool(nats) and p["nat"] not in nats
        entry["nationality_change"] = ", ".join(nats) if nat_change else None
        row(name, "nationality", p["nat"], ", ".join(nats) or p["nat"], nat_change, "review", q + " P27")
        mapped = map_positions(poss)
        pos_change = bool(mapped) and p["pos"] not in mapped
        entry["position_change"] = ", ".join(mapped) if pos_change else None
        row(name, "position", p["pos"], ", ".join(mapped) or p["pos"], pos_change, "review", q + " P413")
        hist = "; ".join(
            s["club"] + (f" ({s['start'] or '?'}-{s['end'] or 'now'})" if (s["start"] or s["end"]) else "")
            + (f" [{s['role']}]" if s["role"] else "") for s in stints)
        entry["club_history"] = hist
        row(name, "clubs", p["clubs"], hist or p["clubs"], bool(hist) and hist != p["clubs"],
            "review", q + " P54")
        value, conf, note = club_situation(stints, p["yr"])
        entry["current"] = value if conf == "confirmed" else None
        entry["current_note"] = note
        row(name, "current_club", "", value or "", bool(value), conf, q + " P54")
        enrich[name] = entry

    os.makedirs(args.out, exist_ok=True)
    with open(os.path.join(args.out, "enrich.json"), "w", encoding="utf-8") as fh:
        json.dump({"updated": TODAY_ISO, "players": enrich}, fh, ensure_ascii=False, indent=1)
    with open(os.path.join(args.out, "enrich-report.csv"), "w", encoding="utf-8", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["player", "field", "old", "new", "changed", "confidence", "source"])
        w.writerows(report)

    resolved = sum(1 for e in enrich.values() if e.get("resolved"))
    year_fix = sum(1 for e in enrich.values() if e.get("year_change"))
    cur = sum(1 for e in enrich.values() if e.get("current"))
    retired = sum(1 for e in enrich.values() if e.get("current") == "Retired")
    nat_diff = sum(1 for e in enrich.values() if e.get("nationality_change"))
    pos_diff = sum(1 for e in enrich.values() if e.get("position_change"))
    log(f"resolved {resolved}/{len(players)}; year corrections {year_fix}; "
        f"current clubs {cur - retired} + retired {retired}; nationality review {nat_diff}; "
        f"position review {pos_diff}")
    log(f"wrote {args.out}/enrich.json and enrich-report.csv")

    if args.apply:
        apply_changes(players, enrich, src)

def apply_changes(players, enrich, src):
    out_lines = []
    for p in players:
        e = enrich.get(p["name"], {})
        if e.get("year_change"):
            f = p["line"].split("|")
            f[3] = e["year_change"]
            out_lines.append("|".join(f))
        else:
            out_lines.append(p["line"])
    new_raw = "\n".join(out_lines)
    src = re.sub(r"(const RAW=`)(.*?)(`)",
                 lambda m: m.group(1) + new_raw + m.group(3), src, count=1, flags=re.S)

    entries = [f'"{name}":{json.dumps(enrich[name]["current"], ensure_ascii=False)}'
               for name in sorted(enrich) if enrich[name].get("current")]
    block = (BLOCK_START + "\n"
             f'const DATA_UPDATED="{TODAY_ISO}";\n'
             "const CURRENT={" + ",".join(entries) + "};")
    if BLOCK_RE.search(src):
        src = BLOCK_RE.sub(lambda m: block, src, count=1)
    else:
        src = src.rstrip("\n") + "\n\n" + block + "\n"

    open(DATA_JS, "w", encoding="utf-8").write(src)
    log(f"patched js/data.js: CURRENT entries {len(entries)}, DATA_UPDATED {TODAY_ISO}")

if __name__ == "__main__":
    main()
