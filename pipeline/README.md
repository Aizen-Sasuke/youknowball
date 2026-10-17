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

## Known limits

- Wikidata data can be incomplete. Check `report.csv` for players with missing fields.
- Popularity is measured by Wikipedia coverage, so some well-known players may rank low and some obscure ones may rank high.
- Clues are generated from structured facts, so they're accurate to the source but less witty than hand-written ones.
