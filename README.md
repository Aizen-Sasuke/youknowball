# YouKnowBall

Football player guessing game. Five clues per round, plus Wordle-style hints, a 3x3 grid challenge, and online rooms.

## Modes

- **Classic**: pass the phone around, with optional timer, teams, and a letter-hint lifeline.
- **Career path**: clubs unlock one at a time.
- **Daily**: the same five players for everyone each day, with a shareable grid and a previous-days archive.
- **Wordle**: find the mystery player in six tries. Each guess colors league, nation, position, club, and birth year.
- **Grid**: fill a 3x3 board by naming players who fit a club row and a nation column. Three strikes ends the game.
- **Solo**: 10 rounds, 20 rounds, or endless with three strikes. Beat your personal best.
- **Online**: host a room, share the 6-letter code or invite link, and race friends on their phones.

Pools: everyone, current stars, legends, or a league (Premier League, La Liga, Serie A, Bundesliga, Ligue 1).

## Run it

Static site, no build step. Open `index.html`, or run `npx serve .`

## Deploy on Vercel

1. Push this folder to a GitHub repository.
2. In Vercel, import the repository, set the framework preset to Other, and leave the build command empty.
3. Deploy. Online rooms work once the site is served over HTTPS.

## Online play

Rooms use PeerJS (WebRTC) with its public signaling server. The host's browser runs the game. Rooms cap at 8 players and lock once the game starts. Strict networks may need a TURN relay, set in `config.js`.

## Notes

- Player facts and league tags were written from memory and may contain mistakes. Check the `RAW`, `SPR`, and `LG` data at the top of `index.html` before wide release.
- Add a `LICENSE` file before making the repository public.

## Adding players

`tools/wikidata_players.py` pulls candidate footballers from Wikidata's open API (CC0 licence). Review the output before adding it to the `RAW` block in `index.html`.
