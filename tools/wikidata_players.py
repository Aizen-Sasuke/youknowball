"""Pull footballer candidates from Wikidata (CC0, public API).

Usage (from the tools folder):
    python wikidata_players.py > candidates.txt

Progress messages go to the screen (stderr), data goes to candidates.txt (stdout).
Output: name|nation|position|birth_year|clubs|fact|aliases|rank
"""
import sys
import time
import requests

URL = "https://query.wikidata.org/sparql"
HEADERS = {
    "User-Agent": "YouKnowBall-data/1.0 (personal project)",
    "Accept": "application/sparql-results+json",
}
MIN_SITELINKS = 60   # raise for fewer, more famous players
LIMIT = 300          # how many players to pull

PLAYERS_Q = """
SELECT ?p ?pLabel ?natLabel ?posLabel ?dob ?sitelinks WHERE {
  ?p wdt:P106 wd:Q937857 ; wikibase:sitelinks ?sitelinks .
  FILTER(?sitelinks >= %d)
  OPTIONAL { ?p wdt:P27 ?nat . }
  OPTIONAL { ?p wdt:P413 ?pos . }
  OPTIONAL { ?p wdt:P569 ?dob . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
ORDER BY DESC(?sitelinks)
LIMIT %d
""" % (MIN_SITELINKS, LIMIT)

CLUBS_Q = """
SELECT ?p ?clubLabel WHERE {
  VALUES ?p { %s }
  ?p wdt:P54 ?club .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
"""


def log(msg):
    print(msg, file=sys.stderr)


def sparql(query):
    """Run a query, retrying when the server is busy."""
    for attempt in range(6):
        r = requests.get(URL, params={"query": query, "format": "json"},
                         headers=HEADERS, timeout=180)
        if r.status_code == 200:
            return r.json()["results"]["bindings"]
        if r.status_code in (429, 500, 502, 503, 504):
            wait = 10 * (attempt + 1)
            log(f"Wikidata busy (HTTP {r.status_code}), retrying in {wait}s...")
            time.sleep(wait)
            continue
        r.raise_for_status()
    raise SystemExit("Wikidata kept failing. Wait a few minutes and run again.")


def qid(uri):
    return uri.rsplit("/", 1)[-1]


def main():
    sys.stdout.reconfigure(encoding="utf-8")   # add this line
    log("Step 1/2: fetching players...")
    rows = sparql(PLAYERS_Q)
    players = {}
    for row in rows:
        q = qid(row["p"]["value"])
        if q in players:               # OPTIONAL joins can repeat a player
            continue
        g = lambda k: row.get(k, {}).get("value", "")
        name = g("pLabel")
        if not name or name.startswith("Q"):
            continue
        players[q] = {"name": name, "nat": g("natLabel"),
                      "pos": g("posLabel"), "yr": g("dob")[:4]}
    log(f"  got {len(players)} players")

    log("Step 2/2: fetching club histories in batches...")
    ids = list(players)
    clubs = {q: [] for q in ids}
    for i in range(0, len(ids), 40):
        batch = ids[i:i + 40]
        values = " ".join(f"wd:{q}" for q in batch)
        for row in sparql(CLUBS_Q % values):
            c = row.get("clubLabel", {}).get("value", "")
            q = qid(row["p"]["value"])
            if c and c not in clubs[q] and not c.startswith("Q"):
                clubs[q].append(c)
        log(f"  {min(i + 40, len(ids))}/{len(ids)}")
        time.sleep(2)                  # be gentle with the public service

    for q, p in players.items():
        fields = [p["name"], p["nat"], p["pos"], p["yr"],
                  ", ".join(clubs[q]), "Wikidata profile", "", "1"]
        print("|".join(f.replace("|", " ").replace("\n", " ") for f in fields))
    log("Done.")


if __name__ == "__main__":
    main()