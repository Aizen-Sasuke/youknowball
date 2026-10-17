"""
YouKnowBall data pipeline.

Pulls footballers from Wikidata (CC0) and writes:
  data/players.json    answer list: players good enough to be a round's answer
  data/guess_names.json  guess list: every footballer we can recognise (server-side only)
  data/report.csv      what was dropped and why, so you can review it

Usage (Python 3.9+, pip install requests):
  python build_players.py                      # defaults
  python build_players.py --min-sitelinks 60 --answer-limit 2000
"""
import argparse, csv, json, re, sys, time
import requests

WD = "https://query.wikidata.org/sparql"
HEADERS = {"User-Agent": "YouKnowBall-pipeline/2.0 (personal project)",
           "Accept": "application/sparql-results+json"}
FOOTBALLER = "wd:Q937857"        # association football player
FOOTBALL_CLUB = "wd:Q476028"     # association football club (excludes national teams)
COUNTRY = "wd:Q6256"             # country (filters out nationalities that aren't countries)

# ---------- SPARQL ----------

def sparql(query, retries=6):
    for attempt in range(retries):
        r = requests.get(WD, params={"query": query, "format": "json"},
                         headers=HEADERS, timeout=180)
        if r.status_code == 200:
            return r.json()["results"]["bindings"]
        if r.status_code in (429, 500, 502, 503, 504):
            wait = 10 * (attempt + 1)
            print(f"  Wikidata busy ({r.status_code}), retry in {wait}s", file=sys.stderr)
            time.sleep(wait)
            continue
        r.raise_for_status()
    raise SystemExit("Wikidata kept failing. Try again later.")

def qid(uri):
    return uri.rsplit("/", 1)[-1]

def val(row, key):
    return row.get(key, {}).get("value", "")

def fetch_candidates(min_sitelinks, limit):
    q = f"""
    SELECT ?p ?pLabel ?sitelinks WHERE {{
      ?p wdt:P31 wd:Q5 ; wdt:P106 {FOOTBALLER} ; wikibase:sitelinks ?sitelinks .
      FILTER(?sitelinks >= {min_sitelinks})
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
    }} ORDER BY DESC(?sitelinks) LIMIT {limit}"""
    out = {}
    for row in sparql(q):
        out[qid(row["p"]["value"])] = {"name": val(row, "pLabel"),
                                       "sitelinks": int(val(row, "sitelinks") or 0)}
    return out

def fetch_batch_attributes(ids):
    values = " ".join(f"wd:{i}" for i in ids)
    q = f"""
    SELECT ?p ?pLabel ?cit ?citLabel ?dob ?posLabel ?awardLabel WHERE {{
      VALUES ?p {{ {values} }}
      OPTIONAL {{ ?p wdt:P27 ?cit . ?cit wdt:P31/wdt:P279* {COUNTRY} . }}
      OPTIONAL {{ ?p wdt:P569 ?dob . }}
      OPTIONAL {{ ?p wdt:P413 ?pos . }}
      OPTIONAL {{ ?p wdt:P166 ?award . }}
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
    }}"""
    return sparql(q)

def fetch_batch_clubs(ids):
    values = " ".join(f"wd:{i}" for i in ids)
    q = f"""
    SELECT ?p ?clubLabel ?start ?end WHERE {{
      VALUES ?p {{ {values} }}
      ?p p:P54 ?st . ?st ps:P54 ?club .
      ?club wdt:P31/wdt:P279* {FOOTBALL_CLUB} .
      OPTIONAL {{ ?st pq:P580 ?start . }}
      OPTIONAL {{ ?st pq:P582 ?end . }}
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
    }}"""
    return sparql(q)

# ---------- cleaning ----------

NAME_JUNK = re.compile(r"^Q\d+$")

def clean_positions(label):
    """Map Wikidata position labels to our short set."""
    if not label:
        return ""
    l = label.lower()
    if "goalkeeper" in l: return "goalkeeper"
    if "centre-back" in l or "defender" in l or "back" in l: return "defender"
    if "wing" in l and "half" not in l: return "winger"
    if "midfield" in l or "half" in l or "playmaker" in l: return "midfielder"
    if "forward" in l or "striker" in l: return "striker"
    return ""

def build_record(qid_, base, attrs, clubs):
    cits = {}
    awards = set()
    dob = ""
    pos = ""
    for row in attrs.get(qid_, []):
        if val(row, "citLabel") and not qid(row["cit"]["value"]) in cits:
            cits[qid(row["cit"]["value"])] = val(row, "citLabel")
        if val(row, "dob") and not dob:
            dob = val(row, "dob")[:4]
        if val(row, "posLabel") and not pos:
            pos = clean_positions(val(row, "posLabel"))
        if val(row, "awardLabel"):
            awards.add(val(row, "awardLabel"))
    seen = set()
    club_list = []
    for row in clubs.get(qid_, []):
        name = val(row, "clubLabel")
        if not name or name in seen or NAME_JUNK.match(name):
            continue
        seen.add(name)
        club_list.append({"name": name,
                          "start": val(row, "start")[:4],
                          "end": val(row, "end")[:4]})
    nat = next(iter(cits.values()), "")
    return {"id": qid_, "name": base["name"], "nationality": nat,
            "position": pos, "birth_year": dob,
            "clubs": club_list, "awards": sorted(awards),
            "sitelinks": base["sitelinks"]}

def review(rec):
    """Return a list of reasons a player is not answer-ready (empty = ready)."""
    reasons = []
    if NAME_JUNK.match(rec["name"]): reasons.append("no English label")
    if not rec["birth_year"]: reasons.append("no birth year")
    if not rec["nationality"]: reasons.append("no nationality")
    if not rec["position"]: reasons.append("no position")
    if len(rec["clubs"]) < 2: reasons.append("fewer than 2 clubs")
    return reasons

def make_clues(rec):
    """Generated clue facts. Structured data only, nothing hand-written."""
    clues = []
    if rec["position"]:
        clues.append(f"Position: {rec['position']}")
    if rec["birth_year"]:
        clues.append(f"Born in {rec['birth_year']}")
    if rec["clubs"]:
        clues.append("Clubs: " + ", ".join(c["name"] for c in rec["clubs"][:5]))
    if rec["nationality"]:
        clues.append(f"Nationality: {rec['nationality']}")
    if rec["awards"]:
        clues.append("Honours: " + ", ".join(rec["awards"][:3]))
    rec["clues"] = clues
    return rec

# ---------- main ----------

def chunks(seq, n):
    for i in range(0, len(seq), n):
        yield seq[i:i + n]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--min-sitelinks", type=int, default=40)
    ap.add_argument("--candidate-limit", type=int, default=3000)
    ap.add_argument("--answer-limit", type=int, default=2000)
    ap.add_argument("--out", default="data")
    args = ap.parse_args()

    print("1/4 candidates...", file=sys.stderr)
    base = fetch_candidates(args.min_sitelinks, args.candidate_limit)
    ids = list(base)
    print(f"    {len(ids)} footballers", file=sys.stderr)

    attrs, clubs = {}, {}
    for n, batch in enumerate(chunks(ids, 50), 1):
        print(f"2/4 attributes batch {n}", file=sys.stderr)
        for row in fetch_batch_attributes(batch):
            attrs.setdefault(qid(row["p"]["value"]), []).append(row)
        time.sleep(1)
    for n, batch in enumerate(chunks(ids, 50), 1):
        print(f"3/4 clubs batch {n}", file=sys.stderr)
        for row in fetch_batch_clubs(batch):
            clubs.setdefault(qid(row["p"]["value"]), []).append(row)
        time.sleep(1)

    print("4/4 cleaning and writing", file=sys.stderr)
    records, report = [], []
    for i in ids:
        rec = build_record(i, base[i], attrs, clubs)
        reasons = review(rec)
        report.append([rec["id"], rec["name"], rec["sitelinks"], "; ".join(reasons) or "ready"])
        if not reasons:
            records.append(rec)

    records.sort(key=lambda r: -r["sitelinks"])
    answers = [make_clues(r) for r in records[:args.answer_limit]]

    import os
    os.makedirs(args.out, exist_ok=True)
    with open(os.path.join(args.out, "players.json"), "w", encoding="utf-8") as f:
        json.dump(answers, f, ensure_ascii=False, indent=1)
    with open(os.path.join(args.out, "guess_names.json"), "w", encoding="utf-8") as f:
        json.dump(sorted({base[i]["name"] for i in ids}), f, ensure_ascii=False)
    with open(os.path.join(args.out, "report.csv"), "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["id", "name", "sitelinks", "status"])
        w.writerows(report)

    ready = len(records)
    print(f"done: {ready}/{len(ids)} ready, {len(answers)} written to answers",
          file=sys.stderr)

if __name__ == "__main__":
    main()
