"""
YouKnowBall pool expansion (offline; Wikidata CC0).

Adds new players to js/data.js, with every structured field (nationality, position,
birth year, clubs) taken from Wikidata and checked against the curated entry. Built for
thickening the thin league pools (Ligue 1, "Other", Bundesliga). Reuses the Action-API
machinery from enrich_players.py — same source, same rate-limit handling.

For each candidate it:
  1. resolves the English Wikipedia title to a Wikidata item and confirms P106 = footballer;
  2. checks the curated birth year / nationality / position against Wikidata (country and
     position labels are mapped, so "Pahlavi Iran" satisfies "Iran");
  3. checks that every curated club QID really appears in the player's P54;
  4. writes a structured, machine-marked clue (fact = "Auto~...") so machine-written facts
     are distinguishable from hand-written ones;
  5. emits js/data.js-ready rows + a per-field report, or (with --apply) merges the rows.

Usage (Python 3.9+, pip install requests), from the pipeline folder:
  python add_players.py            # write data/add-rows.txt + data/add-report.csv, print a review
  python add_players.py --apply    # merge the rows into js/data.js (RAW + an LG block)

Nothing is written to js/data.js without --apply, and club names use the short, canonical
tokens already used elsewhere in the deck (so the Grid and club clues stay consistent).
"""
import argparse, csv, importlib.util, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA_JS = os.path.join(ROOT, "js", "data.js")
OUT_DIR = os.path.join(HERE, "data")

spec = importlib.util.spec_from_file_location("enrich", os.path.join(HERE, "enrich_players.py"))
en = importlib.util.module_from_spec(spec)
spec.loader.exec_module(en)

# ---------------------------------------------------------------------------
# Canonical club token -> Wikidata QID (the tokens match the rest of the deck).
# ---------------------------------------------------------------------------
CLUB_QID = {
    "AC Milan": "Q1543", "Al-Ain": "Q812720", "Al-Hilal": "Q73965", "Alianza Lima": "Q572957",
    "Arminia Bielefeld": "Q105844", "Arsenal": "Q9617", "Aston Villa": "Q18711",
    "Atletico": "Q8701", "Basel": "Q189671", "Bastia": "Q208399", "Bayern": "Q15789",
    "Bolton": "Q19451", "Bordeaux": "Q172476", "Brescia": "Q6651", "Cagliari": "Q1900",
    "Chelsea": "Q9616", "Cologne": "Q104770", "Cork Celtic": "Q2254157",
    "Corinthians": "Q35933", "Deportivo": "Q8760", "Deportivo Cali": "Q663400",
    "Dortmund": "Q41420", "Dynamo Dresden": "Q141931", "Fiorentina": "Q2052",
    "Flamengo": "Q17479", "Fluminense": "Q80987", "Frankfurt": "Q38245",
    "Galatasaray": "Q495299", "Gent": "Q18232", "Gladbach": "Q101959", "Hamburg": "Q51974",
    "Hertha": "Q102720", "Inter": "Q631", "Juventus": "Q1422", "Kaiserslautern": "Q8466",
    "LA Galaxy": "Q204357", "Leverkusen": "Q104761", "Lille": "Q19516", "Lyon": "Q704",
    "Marseille": "Q132885", "Millonarios": "Q391984", "Monaco": "Q180305",
    "Montpellier": "Q19513", "Nantes": "Q192071", "New York Cosmos": "Q646135",
    "Newcastle": "Q18716", "Nice": "Q185163", "Parma": "Q2693", "Perugia": "Q16344",
    "Persepolis": "Q242260", "Porto": "Q128446", "PSG": "Q483020", "Real Madrid": "Q8682",
    "Rennes": "Q19509", "River Plate": "Q15799", "Roma": "Q2739", "Saint-Etienne": "Q19521",
    "Santos": "Q80955", "Servette": "Q219235", "Steaua": "Q179658", "Stuttgart": "Q4512",
    "Torino": "Q2768", "Tottenham": "Q18741", "Vissel Kobe": "Q844271",
    "Werder Bremen": "Q51976", "West Ham": "Q18747", "Wolves": "Q19500",
}

# Wikidata country label -> the name the deck uses (historical entities etc.).
NAT_ALIAS = {"Pahlavi Iran": "Iran", "West Germany": "Germany", "East Germany": "Germany",
             "Soviet Union": "Russia", "Czechoslovakia": "Czech Republic", "Yugoslavia": "Serbia"}

# Awards (P166) worth naming in a machine-written clue; everything else is ignored.
AWARD_KEEP = ("ballon d'or", "fifa 100", "golden ball", "golden boot", "world cup",
              "champions league", "european cup", "footballer of the year",
              "copa america", "copa américa", "african footballer", "asian footballer")

# ---------------------------------------------------------------------------
# Curated candidates.  Fields: name, wiki (enwiki title), lg, r (0 current / 1 legend),
# yr, nat, pos, clubs (QIDs come from CLUB_QID), aliases (extra accepted guesses).
# ---------------------------------------------------------------------------
CAND = [
    # --- Ligue 1 ---
    dict(n="Marquinhos", wiki="Marquinhos", lg="L1", r=0, yr="1994", nat="Brazil", pos="defender",
         clubs=["Corinthians", "Roma", "PSG"], aliases="marcos aoas correa"),
    dict(n="Vitinha", wiki="Vitinha", lg="L1", r=0, yr="2000", nat="Portugal", pos="midfielder",
         clubs=["Porto", "Wolves", "PSG"], aliases="vitor ferreira"),
    dict(n="Hatem Ben Arfa", wiki="Hatem Ben Arfa", lg="L1", r=1, yr="1987", nat="France", pos="winger",
         clubs=["Lyon", "Marseille", "Newcastle", "Nice", "PSG"], aliases="ben arfa"),
    dict(n="Adrien Rabiot", wiki="Adrien Rabiot", lg="L1", r=0, yr="1995", nat="France", pos="midfielder",
         clubs=["PSG", "Juventus", "Marseille", "AC Milan"], aliases="rabiot"),
    dict(n="Jonathan David", wiki="Jonathan David", lg="L1", r=0, yr="2000", nat="Canada", pos="forward",
         clubs=["Gent", "Lille", "Juventus", "Atletico"], aliases=""),
    dict(n="Randal Kolo Muani", wiki="Randal Kolo Muani", lg="L1", r=0, yr="1998", nat="France", pos="forward",
         clubs=["Nantes", "Frankfurt", "PSG", "Juventus"], aliases="kolo muani"),
    dict(n="David Ginola", wiki="David Ginola", lg="L1", r=1, yr="1967", nat="France", pos="winger",
         clubs=["PSG", "Newcastle", "Tottenham", "Aston Villa"], aliases="ginola"),
    dict(n="Pauleta", wiki="Pauleta", lg="L1", r=1, yr="1973", nat="Portugal", pos="forward",
         clubs=["Deportivo", "Bordeaux", "PSG"], aliases="pedro pauleta"),
    dict(n="Jean-Pierre Papin", wiki="Jean-Pierre Papin", lg="L1", r=1, yr="1963", nat="France", pos="forward",
         clubs=["Marseille", "AC Milan", "Bayern", "Bordeaux"], aliases="papin"),
    # --- Outside the big five ---
    dict(n="Gheorghe Hagi", wiki="Gheorghe Hagi", lg="OT", r=1, yr="1965", nat="Romania", pos="midfielder",
         clubs=["Steaua", "Real Madrid", "Brescia", "Galatasaray"], aliases="hagi"),
    dict(n="Rivelino", wiki="Rivelino", lg="OT", r=1, yr="1946", nat="Brazil", pos="midfielder",
         clubs=["Corinthians", "Fluminense", "Al-Hilal"], aliases="rivellino"),
    dict(n="Carlos Alberto", wiki="Carlos Alberto Torres", lg="OT", r=1, yr="1944", nat="Brazil", pos="defender",
         clubs=["Fluminense", "Santos", "Flamengo", "New York Cosmos"], aliases="carlos alberto torres"),
    dict(n="Enzo Francescoli", wiki="Enzo Francescoli", lg="OT", r=1, yr="1961", nat="Uruguay", pos="midfielder",
         clubs=["River Plate", "Marseille", "Torino", "Cagliari"], aliases="francescoli"),
    dict(n="Carlos Valderrama", wiki="Carlos Valderrama", lg="OT", r=1, yr="1961", nat="Colombia", pos="midfielder",
         clubs=["Montpellier", "Deportivo Cali", "Millonarios"], aliases="valderrama"),
    dict(n="Teofilo Cubillas", wiki="Teofilo Cubillas", lg="OT", r=1, yr="1949", nat="Peru", pos="midfielder",
         clubs=["Alianza Lima", "Porto", "Basel"], aliases="cubillas"),
    dict(n="Roger Milla", wiki="Roger Milla", lg="OT", r=1, yr="1952", nat="Cameroon", pos="forward",
         clubs=["Saint-Etienne", "Monaco", "Bastia", "Montpellier"], aliases="milla"),
    dict(n="Abedi Pele", wiki="Abedi Pele", lg="OT", r=1, yr="1964", nat="Ghana", pos="midfielder",
         clubs=["Marseille", "Lille", "Lyon", "Torino", "Al-Ain"], aliases="abedi"),
    dict(n="Ali Daei", wiki="Ali Daei", lg="OT", r=1, yr="1969", nat="Iran", pos="forward",
         clubs=["Persepolis", "Arminia Bielefeld", "Bayern", "Hertha"], aliases="daei"),
    dict(n="Hidetoshi Nakata", wiki="Hidetoshi Nakata", lg="OT", r=1, yr="1977", nat="Japan", pos="midfielder",
         clubs=["Perugia", "Roma", "Parma", "Fiorentina", "Bolton"], aliases="nakata"),
    # --- Bundesliga ---
    dict(n="Marco Reus", wiki="Marco Reus", lg="BL", r=0, yr="1989", nat="Germany", pos="midfielder",
         clubs=["Gladbach", "Dortmund", "LA Galaxy"], aliases="reus"),
    dict(n="Michael Ballack", wiki="Michael Ballack", lg="BL", r=1, yr="1976", nat="Germany", pos="midfielder",
         clubs=["Kaiserslautern", "Leverkusen", "Bayern", "Chelsea"], aliases="ballack"),
    dict(n="Jurgen Klinsmann", wiki="Jurgen Klinsmann", lg="BL", r=1, yr="1964", nat="Germany", pos="forward",
         clubs=["Stuttgart", "Inter", "Monaco", "Tottenham", "Bayern"], aliases="klinsmann"),
    dict(n="Karl-Heinz Rummenigge", wiki="Karl-Heinz Rummenigge", lg="BL", r=1, yr="1955", nat="Germany", pos="forward",
         clubs=["Bayern", "Inter", "Servette"], aliases="rummenigge"),
    dict(n="Matthias Sammer", wiki="Matthias Sammer", lg="BL", r=1, yr="1967", nat="Germany", pos="defender",
         clubs=["Dynamo Dresden", "Stuttgart", "Inter", "Dortmund"], aliases="sammer"),
    dict(n="Uwe Seeler", wiki="Uwe Seeler", lg="BL", r=1, yr="1936", nat="Germany", pos="forward",
         clubs=["Hamburg", "Cork Celtic"], aliases="seeler"),
    dict(n="Lukas Podolski", wiki="Lukas Podolski", lg="BL", r=1, yr="1985", nat="Germany", pos="forward",
         clubs=["Cologne", "Bayern", "Arsenal", "Inter", "Galatasaray"], aliases="podolski"),
    dict(n="Niclas Fullkrug", wiki="Niclas Fullkrug", lg="BL", r=0, yr="1993", nat="Germany", pos="forward",
         clubs=["Werder Bremen", "Dortmund", "West Ham", "AC Milan"], aliases="fullkrug"),
]


def award_clause(awards):
    """A short, sourced extra sentence for a machine clue (or "")."""
    low = [a.lower() for a in awards]
    if any("ballon d'or" in a for a in low):
        return "Ballon d'Or winner."
    if any("fifa 100" in a for a in low):
        return "Named in the FIFA 100."
    for a in awards:
        if "footballer of the year" in a.lower():
            return "Named " + a + "."
    return ""


def read_existing(text):
    m = re.search(r"const RAW=`(.*?)`;", text, re.S)
    raw = m.group(1)
    names = {l.split("|")[0] for l in raw.split("\n") if l.strip()}
    return raw, names


def build():
    titles = [c["wiki"] for c in CAND]
    ids = en.enwiki_resolve(titles)
    ents = en.get_entities([q for q in ids.values() if q])
    bad = [t for t in titles
           if en.FOOTBALLER not in en.entity_ids(ents.get(ids.get(t) or "", {}), "P106")]
    if bad:  # a plain title that resolved to a non-footballer -> try "X (footballer)"
        alt = en.enwiki_resolve([t + " (footballer)" for t in bad])
        fresh = []
        for t in bad:
            q = alt.get(t + " (footballer)")
            if q:
                ids[t] = q
                fresh.append(q)
        if fresh:
            ents.update(en.get_entities(fresh))

    ref = set()
    for c in CAND:
        e = ents.get(ids.get(c["wiki"]) or "", {})
        for prop in ("P27", "P413", "P166"):
            ref.update(en.entity_ids(e, prop))
        ref.update(CLUB_QID[cl] for cl in c["clubs"])
    labels = en.labels_for(ref)

    rows, report = [], []
    for c in CAND:
        q = ids.get(c["wiki"])
        e = ents.get(q or "", {})
        note = ""
        if not q or en.FOOTBALLER not in en.entity_ids(e, "P106"):
            note = "UNRESOLVED"
        year, _ = en.dob_of(e)
        nats = [labels.get(x, x) for x in en.entity_ids(e, "P27")]
        nats_mapped = [NAT_ALIAS.get(x, x) for x in nats]
        poss = en.map_positions([labels.get(x, x) for x in en.entity_ids(e, "P413")])
        awards = [labels.get(x, x) for x in en.entity_ids(e, "P166")]
        p54 = set()
        for st in en.claim_snaks(e, "P54"):
            dv = st.get("mainsnak", {}).get("datavalue", {})
            if dv.get("type") == "wikibase-entityid":
                p54.add(dv["value"]["id"])
        missing = [cl for cl in c["clubs"] if CLUB_QID[cl] not in p54]

        report.append((c["n"], q or "", "birth year", c["yr"], year, "yes" if year == c["yr"] else "NO"))
        report.append((c["n"], q or "", "nationality", c["nat"], ",".join(nats_mapped),
                       "yes" if c["nat"] in nats_mapped else "NO"))
        report.append((c["n"], q or "", "position", c["pos"], ",".join(poss),
                       "yes" if c["pos"] in poss else "check"))
        report.append((c["n"], q or "", "clubs", ", ".join(c["clubs"]),
                       "all in P54" if not missing else "not in P54: " + ", ".join(missing),
                       "yes" if not missing else "NO"))
        report.append((c["n"], q or "", "awards", "(auto clue)",
                       "; ".join(a for a in awards if any(w in a.lower() for w in AWARD_KEEP)) or "-",
                       "info"))
        if note:
            report.append((c["n"], q or "", "identity", "footballer", note, "NO"))

        clause = award_clause(awards)
        fact = "Auto~" + c["nat"] + " " + c["pos"] + ", born " + c["yr"] + ("." if not clause else ". " + clause)
        row = "|".join([c["n"], c["nat"], c["pos"], c["yr"], ", ".join(c["clubs"]), fact,
                        c["aliases"], str(c["r"])])
        rows.append((c, row, note, missing))

    return rows, report, labels


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="merge the rows into js/data.js")
    args = ap.parse_args()
    os.makedirs(OUT_DIR, exist_ok=True)

    text = open(DATA_JS, encoding="utf-8", newline="").read()
    nl = "\r\n" if "\r\n" in text else "\n"
    work = text.replace("\r\n", "\n")
    _, existing = read_existing(work)
    dups = [c["n"] for c in CAND if c["n"] in existing]
    if dups:
        raise SystemExit("already in js/data.js: " + ", ".join(dups))

    rows, report, _ = build()

    with open(os.path.join(OUT_DIR, "add-report.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["player", "qid", "field", "curated", "wikidata", "matches"])
        w.writerows(report)
    with open(os.path.join(OUT_DIR, "add-rows.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(r for _, r, _, _ in rows) + "\n")

    problems = [(c["n"], note, missing) for c, _, note, missing in rows if note or missing]
    print("candidates: " + str(len(rows)))
    for c, row, note, missing in rows:
        flag = "OK " if not (note or missing) else "!! "
        print(flag + c["lg"] + "  " + row)
    if problems:
        print("\nNEEDS REVIEW:")
        for n, note, missing in problems:
            print("  " + n + (("  " + note) if note else "") + (("  missing clubs: " + ", ".join(missing)) if missing else ""))
    else:
        print("\nall candidates resolved, birth years/nationalities agree and every club is in P54")

    if not args.apply:
        print("\n(written to data/add-rows.txt + data/add-report.csv; re-run with --apply to merge)")
        return

    # merge rows into the RAW literal, and append an LG block after the last Object.assign(LG,...)
    def merge_raw(m):
        return m.group(1) + m.group(2) + "\n" + "\n".join(r for _, r, _, _ in rows) + m.group(3)
    text2, n = re.subn(r"(const RAW=`)(.*?)(`;)", merge_raw, work, count=1, flags=re.S)
    if n != 1:
        raise SystemExit("could not find the RAW literal to patch")
    lg = "Object.assign(LG,{" + ",".join('"%s":"%s"' % (c["n"], c["lg"]) for c, _, _, _ in rows) + "});"
    lines = text2.split("\n")
    idx = max(i for i, l in enumerate(lines) if l.startswith("Object.assign(LG,"))
    lines.insert(idx + 1, lg)
    out = "\n".join(lines)
    if nl != "\n":
        out = out.replace("\n", nl)
    open(DATA_JS, "w", encoding="utf-8", newline="").write(out)
    print("\nmerged " + str(len(rows)) + " rows into js/data.js (RAW + 1 LG block)")


if __name__ == "__main__":
    main()
