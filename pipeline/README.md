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
QID and property. A reviewed subset of the club history can be applied with the separate
`sync_clubs.py` step below.

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

## Add players (`add_players.py`)

`enrich_players.py` refreshes the players already in the deck. `add_players.py` grows the deck,
aimed at the thin league pools:

    python add_players.py           # write data/add-rows.txt + data/add-report.csv, print a review
    python add_players.py --apply   # merge the rows into js/data.js (RAW + one LG block)

Candidates are curated (name, league, star/legend flag, birth year, nationality, position, clubs)
and then verified against Wikidata before anything is written:

- the English Wikipedia title must resolve to an item with `P106 = Q937857` (footballer);
- the curated birth year and nationality must agree with `P569`/`P27` (country labels are mapped,
  so "Pahlavi Iran" satisfies "Iran");
- every club is a canonical short token mapped to a QID in `CLUB_QID`, and that QID must appear in
  the player's `P54` — so a club the source does not support is refused, not invented;
- position buckets are compared but only reported (they are judgement calls, as above).

Each new row's `fact` is machine-written and labelled `Auto~…` (the same `Label~Text` shape as the
special clues), built from the structured fields with a FIFA-100 / Ballon d'Or / Footballer-of-the-Year
clause when Wikidata has one. Replace any `Auto~` fact with a hand-written one freely. Every field
carries its Wikidata QID in the review CSV. Club tokens reuse the deck's existing vocabulary so club
clues and the Grid stay consistent; add a token to `CLUB_QID` (and pick a short, deck-style name)
when a genuinely new club is needed.

After adding rows, re-run `enrich_players.py` so the new players get `CURRENT`/`DATA_UPDATED` entries.

## Sync club lists (`sync_clubs.py`)

The Grid, the Career-path clues, the player card and Wordle's "Shared club" column all read the
curated `clubs` field of a row. That field lists a player's *notable* clubs, so it drifts: after a
transfer window a player can be missing a club fans will type into the Grid, and the Grid then refuses
a correct answer. `sync_clubs.py` re-derives each row's senior club history from `data/enrich.json`
and adds the clubs the row is missing, keeping it consistent with the `CURRENT` data:

    python sync_clubs.py            # dry run: report the changes (data/club-sync-report.csv)
    python sync_clubs.py --apply    # patch the clubs field in js/data.js

The rules are deliberately conservative:

- only clubs that are already canonical tokens in the deck are added, so the vocabulary and the Grid
  rows stay stable;
- youth, reserve, "B"/"II" and academy sides and Olympic/national teams are skipped, as are a short
  hand-reviewed list of youth-only spells at clubs that *do* have a token (`MANUAL_EXCLUDE`);
- nothing is ever removed, and each added club is inserted at its chronological position (by its
  Wikidata start date) so the Career-path clues still read as a career;
- every added club is a `P54` statement on the player's own Wikidata item, listed with its start year
  in `data/club-sync-report.csv`.

`data/club-sync-report.csv` is a working file (gitignored); the committed artefact is the updated
`clubs` field in `js/data.js`.

## Known limits

- Wikidata data can be incomplete. Check `report.csv` for players with missing fields.
- Popularity is measured by Wikipedia coverage, so some well-known players may rank low and some obscure ones may rank high.
- Clues are generated from structured facts, so they're accurate to the source but less witty than hand-written ones.
