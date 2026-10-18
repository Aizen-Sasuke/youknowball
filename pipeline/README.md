# YouKnowBall data pipeline

Builds the player data for the game from Wikidata (CC0, free to reuse).

## Run

    pip install requests
    python build_players.py

Takes several minutes. Progress prints to the screen. Output goes to `data/`:

- `players.json`: the answer list. Only players with a birth year, nationality, position, and at least two clubs.
- `guess_names.json`: every footballer we can recognise. Used to check typed guesses. Keep this on the server, not in the browser.
- `report.csv`: every candidate and its status, so you can see what was dropped and why.

Options:

    python build_players.py --min-sitelinks 60 --answer-limit 1500

Higher `--min-sitelinks` gives fewer, more famous players.

## What it does

1. Gets footballers with at least N Wikipedia language editions (a popularity proxy).
2. Gets nationality, birth year, position, and awards in batches.
3. Gets club histories, keeping only association football clubs so national teams drop out.
4. Cleans positions into five groups and builds a clue list from the structured data.

## Refresh the existing list (`enrich_players.py`)

`build_players.py` produces a fresh answer list. `enrich_players.py` is the other direction: it
takes the players **already** in `js/data.js` and re-checks the fields that go stale, so the shipped
data can be corrected without a full rebuild.

    python enrich_players.py            # writes data/enrich.json + data/enrich-report.csv
    python enrich_players.py --apply-json   # patch js/data.js from the last reviewed run (no network)

It resolves each name to a Wikidata item and pulls current club, position, nationality, date of
birth, full club history and retirement status. Identity is pinned by the English Wikipedia title
(and a birth-year check), so same-name people are not confused. Club statements are kept only when
`P31` is a football class, so shared-name ice-hockey or basketball clubs drop out.

**What gets applied automatically, and what does not.** Only two things are written to `js/data.js`:
the `DATA_UPDATED` date and the `CURRENT` map (current club, or `"Retired"`; omitted when the evidence
is ambiguous — more than one club with no end date, a live loan, a stray statement, a gap, or an
implausible age for retirement). Nationality, position and club-history differences are reported in
`enrich-report.csv` for a human to review and are **never** applied automatically: multiple or
contested nationalities, coarse position buckets and loan/youth-club clutter are judgement calls.
Birth-year corrections are applied only for an unambiguous match that disagrees with ours (this run
found none — the curated years already matched Wikidata). Every reported value carries the source
QID and property.

### Why the Action API, not SPARQL

The Wikidata Query Service (WDQS) 504s on club-history queries (the `wdt:P31/wdt:P279*` property
paths are too expensive). This uses the plain MediaWiki/Wikidata Action API instead: names are
batch-resolved through English Wikipedia titles (`action=query&prop=pageprops`), a few stragglers
through `wbsearchentities`, and the claims come from `wbgetentities` (~50 items a call). Same CC0
source, no query planner, and a fraction of the requests. Requests are rate-limit aware (honours
`Retry-After`).

### Working files

`data/enrich.json` and `data/enrich-report.csv` are working files and are gitignored — the committed
artefact is the `DATA_UPDATED`/`CURRENT` block in `js/data.js`.

## Known limits

- Wikidata data can be incomplete. Check `report.csv` for players with missing fields.
- Popularity is measured by Wikipedia coverage, so some well-known players may rank low and some obscure ones may rank high.
- Clues are generated from structured facts, so they're accurate to the source but less witty than hand-written ones.
