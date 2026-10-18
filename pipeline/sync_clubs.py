"""
YouKnowBall club-list sync (offline; Wikidata CC0).

The Grid (and the Career-path clues, the player card and Wordle's "Shared club"
column) all read the `clubs` field of each player row in js/data.js. That field is
hand-curated and only lists a player's *notable* clubs, so it drifts: a player who
moved in the last window (or a learner who was cut short) can be missing a club that
fans will type into the Grid, and the Grid then rejects a correct answer.

This tool re-derives each player's senior club history from the machine-readable
enrichment (pipeline/data/enrich.json, produced by enrich_players.py), keeps only the
clubs that already exist as canonical tokens in the deck, and adds the ones the row is
missing. It never removes a club, and it inserts each new club at its chronological
position so the Career-path clues keep revealing a plausible career.

What is deliberately left out (and why):
  * youth / reserve / "B" / "II" / academy sides, and Olympic/national teams;
  * clubs that have no canonical token in the deck (the vocabulary stays stable);
  * a short, explicit list of youth-only spells at clubs that *do* have a token
    (see MANUAL_EXCLUDE) — Wikidata stores these as ordinary P54 statements.

Source: each added club is a P54 ("member of sports team") statement on the player's
own Wikidata item, visible in enrich.json and enrich-report.csv.

Usage (Python 3.9+, pip install requests), from the pipeline folder:
  python sync_clubs.py             # dry run: report what would change
  python sync_clubs.py --apply     # patch js/data.js (ranks + clubs; CRLF preserved)
"""
import argparse, csv, json, os, re, sys, unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA_JS = os.path.join(ROOT, "js", "data.js")
ENRICH = os.path.join(HERE, "data", "enrich.json")
REPORT = os.path.join(HERE, "data", "club-sync-report.csv")

# Clubs whose Wikidata label does not reduce to the deck token by suffix-stripping.
ALIAS = {
    "real madrid club de futbol": "Real Madrid", "tottenham hotspur": "Tottenham",
    "clube de regatas do flamengo": "Flamengo", "s l benfica": "Benfica",
    "s c corinthians paulista": "Corinthians", "corinthians paulista": "Corinthians",
    "bayer 04 leverkusen": "Leverkusen", "west ham united": "West Ham",
    "fenerbahce istanbul": "Fenerbahce", "club atletico river plate": "River Plate",
    "cr vasco da gama": "Vasco", "vasco da gama": "Vasco", "newcastle united": "Newcastle",
    "u c sampdoria": "Sampdoria", "botafogo f r": "Botafogo", "botafogo": "Botafogo",
    "rcd mallorca": "Mallorca", "fc red bull salzburg": "Salzburg",
    "red bull salzburg": "Salzburg", "sociedade esportiva palmeiras": "Palmeiras",
    "getafe cf": "Getafe", "ogc nice": "Nice", "coventry city": "Coventry",
    "besiktas": "Besiktas", "besiktas j k": "Besiktas", "club alianza lima": "Alianza Lima",
    "deportivo de a coruna": "Deportivo", "como 1907": "Como", "bologna f c 1909": "Bologna",
    "udinese calcio": "Udinese", "feyenoord rotterdam": "Feyenoord", "fc groningen": "Groningen",
    "fc porto": "Porto", "manchester united": "Man United", "manchester city": "Man City",
    "paris saint germain": "PSG", "paris saint germain fc": "PSG", "bayern munich": "Bayern",
    "inter milan": "Inter", "milan": "AC Milan", "ac milan": "AC Milan",
    "atletico madrid": "Atletico", "atletico de madrid": "Atletico",
    "club atletico de madrid": "Atletico", "borussia dortmund": "Dortmund",
    "borussia monchengladbach": "Gladbach", "sporting cp": "Sporting",
    "sporting lisbon": "Sporting", "sporting clube de portugal": "Sporting",
    "queens park rangers": "QPR", "los angeles galaxy": "LA Galaxy", "la galaxy": "LA Galaxy",
    "inter miami": "Inter Miami", "new york cosmos": "New York Cosmos",
    "wolverhampton wanderers": "Wolves", "as roma": "Roma", "ssc napoli": "Napoli",
    "ss lazio": "Lazio", "lazio": "Lazio", "atalanta bc": "Atalanta", "atalanta": "Atalanta",
    "psv": "PSV", "psv eindhoven": "PSV", "as monaco": "Monaco", "saint etienne": "Saint-Etienne",
    "as saint etienne": "Saint-Etienne", "olympique de marseille": "Marseille",
    "olympique lyonnais": "Lyon", "losc lille": "Lille", "sevilla fc": "Sevilla",
    "real sociedad": "Real Sociedad", "acf fiorentina": "Fiorentina",
    "brighton and hove albion": "Brighton", "stade rennais": "Rennes", "leicester city": "Leicester",
    "rb leipzig": "Leipzig", "santos fc": "Santos", "villarreal cf": "Villarreal",
    "boca juniors": "Boca Juniors", "fluminense fc": "Fluminense", "cr flamengo": "Flamengo",
    "fc basel": "Basel", "hamburger sv": "Hamburg", "parma calcio 1913": "Parma",
    "sao paulo fc": "Sao Paulo", "fc schalke 04": "Schalke", "al hilal": "Al-Hilal",
    "al hilal sfc": "Al-Hilal", "vfb stuttgart": "Stuttgart", "gnk dinamo zagreb": "Dinamo Zagreb",
    "girondins de bordeaux": "Bordeaux", "brescia calcio": "Brescia", "leeds united": "Leeds",
    "leeds united afc": "Leeds", "sv werder bremen": "Werder Bremen", "torino fc": "Torino",
    "eintracht frankfurt": "Frankfurt", "valencia cf": "Valencia", "crystal palace": "Crystal Palace",
    "afc ajax": "Ajax", "real betis": "Real Betis", "galatasaray": "Galatasaray",
    "galatasaray s k": "Galatasaray", "parma": "Parma",
    "e c vitoria": "Vitoria", "bolton wanderers": "Bolton", "exeter city": "Exeter",
    "gremio fbpa": "Gremio", "steaua bucuresti": "Steaua", "fcsb": "Steaua",
    "hnk hajduk split": "Hajduk Split", "stade malherbe caen": "Caen", "s m caen": "Caen",
    "brondby if": "Brondby", "r s c anderlecht": "Anderlecht", "anderlecht": "Anderlecht",
    "hebei china fortune": "Hebei", "fc tokyo": "FC Tokyo", "vissel kobe": "Vissel Kobe",
    "sunderland afc": "Sunderland", "sunderland a f c": "Sunderland",
}

SUF = re.compile(r"\b(e c|a f c|f c|fc|cf|afc|sc|ac|as|ss|ssc|sv|vfl|vfb|tsv|bk|fk|sk|jk|kv|ud|cd|sd|ca|rc|rcd|cr|se|us|"
                 r"club|clube|football club|futebol clube|calcio|sport|sports club|1899|1900|1901|1904|1907|1909|"
                 r"1913|1860|1898|1897|osc|04|05|07|09|de futbol|de futebol|de)\b")
PRE = re.compile(r"^(club atletico de|club atletico|club|clube de regatas do|clube|sociedade esportiva|"
                 r"esporte clube|associacao|k r c|krc|as|ac|ec|se|cr|cs|cd|ca|sd|ss|ssc|sv|vfl|vfb|tsv|fc|cf|sc|us|ud|rc|rcd)\b\s*")

# youth / reserve / B-team / national sides: never added to a senior club list
BAD = re.compile(r"youth|reserve|academy|under\b|\bolympic\b|national|\bb team\b|\bii\b|\bc team\b|"
                 r"atletic|castilla|women|\s(b|ii)$", re.I)

# Youth-only spells at clubs that DO have a token in the deck (so BAD can't catch them).
MANUAL_EXCLUDE = {
    "Pierre-Emerick Aubameyang": {"AC Milan"},
    "David Luiz": {"Sao Paulo"},
    "Thiago Silva": {"Porto"},
    "Yassine Bounou": {"Atletico"},
    "Ciro Immobile": {"Juventus"},
}

MIN_CLUB_COUNT = 4   # only add clubs that can actually appear as a Grid row

def norm(x):
    if not x:
        return ""
    x = (x.replace("\u00f8", "o").replace("\u00d8", "O").replace("\u00e6", "ae").replace("\u00c6", "Ae")
          .replace("\u00df", "ss").replace("\u0142", "l").replace("\u0141", "L").replace("\u0111", "d"))
    x = unicodedata.normalize("NFD", x)
    x = "".join(c for c in x if unicodedata.category(c) != "Mn").lower()
    x = re.sub(r"[^a-z0-9 ]", " ", x.replace("&", " and "))
    return re.sub(r"\s+", " ", x).strip()

def core(x):
    c = norm(x)
    for _ in range(3):
        c2 = PRE.sub("", c).strip()
        if c2 == c:
            break
        c = c2
    return re.sub(r"\s+", " ", SUF.sub(" ", c)).strip()

UNKNOWN = (9999, 0, 0)

def start_key(s):
    """Wikidata start date -> sortable (year, month, day); missing dates sort last."""
    if not s:
        return UNKNOWN
    p = s.split("-")
    def n(i):
        return int(p[i]) if len(p) > i and p[i].isdigit() else 0
    return (int(p[0]) if p[0].isdigit() else 9999, n(1), n(2))

def read_players(src):
    m = re.search(r"const RAW=`(.*?)`", src, re.S)
    if not m:
        raise SystemExit("could not find the RAW block in js/data.js")
    players = []
    for line in m.group(1).split("\n"):
        line = line.rstrip("\r")
        if not line.strip():
            continue
        f = line.split("|")
        players.append({"name": f[0], "yr": f[3], "clubs": f[4].split(", "), "line": line})
    return players, m.group(1)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="patch js/data.js")
    args = ap.parse_args()

    src = open(DATA_JS, encoding="utf-8").read()
    newline = "\r\n" if "\r\n" in src else "\n"
    players, raw_block = read_players(src)
    if not os.path.exists(ENRICH):
        raise SystemExit("no " + ENRICH + " — run enrich_players.py first")
    enrich = json.load(open(ENRICH, encoding="utf-8"))["players"]

    vocab = set()
    for p in players:
        vocab.update(p["clubs"])
    def counts():
        c = {}
        for p in players:
            for t in p["clubs"]:
                c[t] = c.get(t, 0) + 1
        return c
    def eligible(tok):
        # a club is worth adding only if it is (or will be) a possible Grid row and
        # already exists as a canonical token in the deck.
        return tok in vocab and counts().get(tok, 0) >= MIN_CLUB_COUNT

    def resolve(label):
        n, c = norm(label), core(label)
        if n in ALIAS:
            return ALIAS[n]
        if c in ALIAS:
            return ALIAS[c]
        for t in vocab:
            if norm(t) == n or core(t) == c:
                return t
        return None

    # per-player, token -> earliest start key, from every senior spell. A token that has
    # any dateless spell is left as UNKNOWN (so it keeps its curated slot) rather than
    # borrowing a later spell's date, which would sort a whole career wrongly.
    stints = {}
    for p in players:
        e = enrich.get(p["name"], {})
        if not e.get("resolved") or not e.get("clubs"):
            continue
        known, unknown, order = {}, set(), []
        for st in e["clubs"]:
            if BAD.search(st.get("role") or "") or BAD.search(st.get("club") or ""):
                continue
            tok = resolve(st.get("club") or "")
            if not tok:
                continue
            if tok not in known and tok not in unknown:
                order.append(tok)
            if not st.get("start"):
                unknown.add(tok)
                continue
            y = start_key(st["start"])
            if tok not in known or y < known[tok]:
                known[tok] = y
        stints[p["name"]] = {t: (UNKNOWN if t in unknown else known[t]) for t in order}

    # fixed point: adding a club can push a token over the Grid-row threshold,
    # which can make another player's row wrong, so repeat until nothing changes.
    added = {p["name"]: [] for p in players}
    report = []
    for _ in range(6):
        changed = 0
        for p in players:
            have = set(p["clubs"]) | {t for t, _ in added[p["name"]]}
            for tok, y in sorted(stints.get(p["name"], {}).items(), key=lambda kv: kv[1]):
                if tok in have or tok in MANUAL_EXCLUDE.get(p["name"], set()):
                    continue
                if not eligible(tok):
                    continue
                added[p["name"]].append((tok, y))
                report.append([p["name"], tok, y[0] if y[0] != 9999 else "", "P54"])
                changed += 1
        if not changed:
            break

    # new club lists: insert each addition at its chronological slot (never drop one)
    out_lines, changed_players = [], 0
    unresolved = []
    for p in players:
        adds = added[p["name"]]
        if not adds:
            out_lines.append(p["line"])
            continue
        years = stints.get(p["name"], {})
        cur = p["clubs"]
        # forward-fill years so an unresolved club keeps its place instead of letting a
        # dated addition jump in front of it.
        ys = [years.get(t, UNKNOWN) for t in cur]
        unresolved.extend(f"{p['name']}::{t}" for t, y in zip(cur, ys) if y[0] == 9999)
        # The curated list is chronological, so a club dated *later* than the next one
        # is a return/loan-only spell whose earlier spell Wikidata omits (Perisic's first
        # Hajduk spell, e.g.). Drop that date so the club keeps its curated slot.
        for i in range(len(ys) - 1):
            if ys[i][0] != 9999 and ys[i + 1][0] != 9999 and ys[i] > ys[i + 1]:
                ys[i] = UNKNOWN
        # forward-fill the rest so an unresolved club keeps its place instead of letting
        # a dated addition jump in front of it.
        last = (0, 0, 0)
        for i, y in enumerate(ys):
            if y[0] == 9999:
                ys[i] = last
            else:
                last = y
        existing = list(zip(cur, ys))
        pend = sorted(adds, key=lambda kv: kv[1])
        merged = []
        for t, y in existing:
            while pend and pend[0][1] < y:
                merged.append(pend.pop(0)[0])
            merged.append(t)
        merged += [a[0] for a in pend]
        f = p["line"].split("|")
        f[4] = ", ".join(merged)
        out_lines.append("|".join(f))
        changed_players += 1

    total = sum(len(v) for v in added.values())
    print(f"{total} club additions across {changed_players} players "
          f"({len(players)} rows)", file=sys.stderr)
    if unresolved:
        print(f"  note: {len(unresolved)} existing club tokens had no resolved Wikidata year", file=sys.stderr)
        for pair in sorted(set(unresolved)):
            print("    ~ " + pair, file=sys.stderr)
    os.makedirs(os.path.dirname(REPORT), exist_ok=True)
    with open(REPORT, "w", encoding="utf-8", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["player", "club_added", "first_start_year", "source"])
        w.writerows(report)

    if args.apply:
        new_raw = newline.join(out_lines)
        src = re.sub(r"(const RAW=`)(.*?)(`)",
                     lambda m: m.group(1) + new_raw + m.group(3), src, count=1, flags=re.S)
        open(DATA_JS, "w", encoding="utf-8", newline="").write(src)
        print(f"patched js/data.js: {total} club additions", file=sys.stderr)
    else:
        print("dry run — pass --apply to write js/data.js", file=sys.stderr)
        for r in report[:60]:
            print("  +", r[0], "->", r[1], f"({r[2]})")

if __name__ == "__main__":
    main()
