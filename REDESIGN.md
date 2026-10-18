# v12 redesign notes

## Changelog per screen
1. Intro: pitch lines draw, floodlights flicker, ball drops, title lands on a chalk slab. 2.4s total, tap or key to skip.
2. Home: slanted chalk title slab, 3-step start path, collapsed How to play.
3. Mode selector: 7 numbered tiles (2 cols on phone, 4 on desktop), selected tile inverts to chalk.
4. Setup: steps 01/02/03, name chips, option checkboxes, full-width Kick off.
5. Play: ticker rows (dimmer with age) above a chalk live slab (88-120px on big screens, auto-fits), chalk timer rail, bottom score strip, slanted orange streak tab.
6. Round result: reveal slab with letter-by-letter name and big +points block.
7. End: league-table rows (winner on a chalk bar), share grid, Play again.
8. Stats: tile board.
9. Online lobby: giant room code slab, roster tiles, host controls. Online play uses the same slab/ticker/strip.
10. Wordle: always shows 6 rows; 5 comparison cells per guess; stacked name-over-cells on phones.
11. Grid: broadcast-style slanted header tags for rows/columns.

## Test checklist (run per mode at 375px and 1280px, dark and light)
- Classic: add 2 names, wrong guess (shake + red flash), skip to clue 5, give up, correct guess (slab pulse, score tween), streak tab on 2nd solve, timer last 5s turns orange, teams on, letter hint.
- Career path: clue 1-4 are career steps, initials last.
- Daily: play 5 rounds, share grid, replay shows already-played, archive chips.
- Wordle: 6 guesses to loss, win in <6, unknown name error, random puzzle.
- Grid: fill a box, miss = shake, 3 strikes ends, New grid.
- Solo: 10 rounds, endless with 3 strikes, personal best.
- Online (2 phones): host, join by code, lobby list, start, correct/wrong feedback, scoreboard reorder glides, end, back to lobby.
- Long clue "Captained his country to a World Cup" and "Trent Alexander-Arnold" reveal: no overflow.
- Reduced motion on: state changes still visible, nothing slides.

## Flags (not fixed silently)
- Dark is now the default; the toggle no longer follows the OS, but the choice IS persisted since v12.1 (`cfg.light` in localStorage). First visit = dark regardless of OS setting (documented trade-off; one line can restore OS detection).
- Confetti: decorative fall is intentionally hidden by CSS (`.cf{display:none}`); since v12.1 `confetti()` early-returns so it no longer builds 36 DOM nodes on every solve.
- Online "last 5 seconds" orange now uses 5 (was 3) and ignores the reveal countdown.
- Old `.row` animation re-fired every second in the online scoreboard; disabled there.
- Since v12.1 `flipList` skips the rebuild when the markup is identical (hostTick's once-per-second tick no longer churns `#obd`), and score numbers in it tween via `tweenNum` (`data-to`/`data-from` with the previous DOM value).
- No separate "Reveal" action exists in JS: Skip to next clue = reveal next; Give up = reveal answer.
- Since v12.1: `setErr(id,msg)` writes through to a toast when the error element is missing instead of throwing; `cp()` falls back to a hidden execCommand copy on non-secure origins and restores its label; a guard in `start()`/`hostStart()` shows an error instead of crashing when a pool filter yields zero players.
Small additive JS (display only): `S.nk`, `S.sk` for fresh-clue and streak-tab detection, share grid in end screen and copied text, `fit()`, `flipList()`, `pulse()`.

## v14 additions
- Seedable rounds: the existing `hs()`/`rnd()` PRNG is now driven by a challenge code from the URL (`?seed=abc123&m=c|p|s|w|g`, plus `r`/`j`/`p`/`gd` options). Same seed + options = identical rounds everywhere. Daily already used this mechanism with the date as the seed; links can now also open a dated Daily directly (`?d=YYYY-MM-DD`).
- `chBanner()` renders a slim full-bleed challenge bar on setup/play/end/wordle/grid cards while a challenge is armed; "Create your own" (`#cown`, delegated click) disarms it without touching history.
- "Challenge a friend" on end screens (`chLink()`/`challenge()`): copies/shares a link reproducing the round set; with no armed challenge it mints a fresh seed (= a rematch with the same settings, not a replay of the finished rounds).
- Online rooms host a "Room seed" input (`cfg.rs`); `hostStart()` seeds the deck with it when set. Room-to-room identity, not needed for same-room fairness (the host already drives every peer's deck).
- Behaviour notes: (1) opening a challenge link auto-starts that game (additive — only when the URL has a valid `?seed`); (2) while a challenge is armed, every Classic/Solo/Career start and every Wordle "Random puzzle" uses the challenge seed, and Grid boards are seeded too; (3) a challenge Classic with no saved names stores one "You" player in `cfg.names`.
- Latent bug fixed: the boot IIFE (line 218) re-renders setup synchronously mid-file, so reloading with a saved Grid mode hit `GDN`/`GDD`/`gbest` before their declaration (TDZ crash, recovered only by a later re-render). Those constants now live above the boot IIFE.
- Cache: `sw.js` asset list is built from one `XV` const (+ `VER`) so future bumps are one line. This push = `ykb-v15`.

## v14.1 — per-mode share text
- Every mode now shares a proper result string via `share(txt, btn)`: `navigator.share` sheet when available, the existing `cp()` clipboard helper as fallback (including its execCommand path for non-secure origins). The system sheet appears INSTEAD of an immediate copy on phones — the fallback copies as before.
- Classic/Career/Solo end: "Copy results" → "Share results" — `YouKnowBall ⚽ Classic — solved X/Y · top N pts` (teams shows `Team A a – b Team B`), the round-result emoji grid, and a challenge link so sharing invites a rematch. With no armed challenge that link mints a NEW seed: a rematch with the same settings, not a replay of finished rounds.
- Wordle: "Copy result" → "Share result" — mode line + the 6-row emoji grid + a link: dated daily `?d=` for the Daily, a seeded random-puzzle link for a rematch.
- Grid: new "Share result" button on the finished screen — boxes count, difficulty, seeded rematch link.
- Daily: same share string as before (grid + score) plus a `?d=YYYY-MM-DD` replay link.

## v14.2 — granular haptics
- `navigator.vibrate` now uses distinct patterns instead of the old single generic buzz: wrong guess / grid strike = `[45,55,45]` (two short), grid box fill = `[30]`, correct guess / round solve / online correct / wordle target = `[35,45,70]`. Wordle solves and grid boxes previously had no haptic at all — added.
- Vibration is gated by its own `cfg.hap` toggle ("Vibration", default ON) instead of the old combined "Sound and haptics" checkbox, which is now "Sound effects". Behaviour change: a device with sound off previously also got no vibration; now vibration follows the Vibration toggle only. `cfg.hap` defaults to true even for users without a stored setting.
- The Vibration toggle ships on the Classic/Career/Solo, Online, and Grid setup screens (every screen that already had the sound checkbox). Wordle's setup screen has no options area, so no toggle there — turning it off in another mode applies app-wide.
- All callsites wrap `navigator.vibrate` in a guard + try/catch: absent API (iOS Safari) is a silent no-op.

## v15 — after-solve player card
- `pcard(p)` renders a compact card under the reveal slab (Classic/Career/Solo/Daily at the round result, Online at the round result, Wordle on the result screen) with the answer's nationality, position, birth year, league, clubs, tier and fact line. It reads only fields the deck already carries (`p.nat/pos/yr/cl/fl/ft/lg` + `tier()`), so it can never contradict the clues; Online looks the name up in `P` because the host only broadcasts name/nationality/fact.
- Tier is shown as the existing in-game word plus ★/★★ (`TN`), with the tier spelled out for screen readers ("Legend tier (2 stars)"). Plain `★`/`★★` rather than the words "star"/"legend" keep the same vocabulary as the play-screen badge.
- Markup is a `<section aria-label>` + `<dl>` of label/value pairs; the link is `https://en.wikipedia.org/wiki/Special:Search?search=<name>+footballer` with `target="_blank" rel="noopener noreferrer"` and visually-hidden "(opens in a new tab)" text. The card has no animation, so it is reduced-motion safe by construction; it does not replace or delay the existing reveal.
- One league label map: `LGL` (+ `LGO` for `<select>` options) feeds the card, the Wordle "League" column (`wcmp` now emits `Premier League` instead of `PL`) and the Players pickers in Classic/Career/Solo/Online. Behaviour change (display only): the Wordle league cell text is now the full league name. Grid's picker has no league options (Everyone/stars/legends) and is unchanged.
- Cache: `ykb-v17`.

## v15.1 — guess distribution
- New stats key `ST.dist` in the existing stats object (`ykbs`), shaped `{c:[5],p:[5],d:[5],s:[5],o:[5]}`: counts of rounds solved on clue 1..5, for Classic / Career path / Daily / Solo / Online. One increment per solved round from the correct-guess path only (`bumpDist`), so a give-up or an unsolved round never counts.
- Daily replay cannot double count: a played daily returns the "already played" screen before play (unchanged), and the increment only happens on a live correct guess. An archived daily you have not played yet counts once, like today's.
- Online counts your own correct round only (the guest/host client that is you), deduped by game-start stamp + round (`olCounted`) so a mid-round reconnect after solving cannot count twice. To make that stamp real, `hostStart()` now refreshes `HS.at` (the game-started-at value already broadcast to guests and never displayed) — a small behaviour change with no visible effect.
- Rendering: chalk-style rows (`Solved at clue`, one row per mode, 5 bars each) on the stats screen, scaled to the largest count. Each row is `role="img"` with an `aria-label` text summary ("Classic solved at clue 1: 1, clue 2: 0, …") because the bars are purely visual. No entry is shown at all until there is at least one solve. Correct in dark and light (uses `--ink`/`--soft`), and the bar transition is disabled under reduced motion.
- Cache: `ykb-v18`.

## v15.2 — resume an in-progress game
- New key `ST.rg` in the existing stats object (`ykbs`), versioned `{v:1}`: a serializable snapshot of an in-progress Classic / Career path / Solo game — the deck (by player name, resolved against `P` on load), round index, clue index, turn, scores, player names, the current round's five clue strings, results grid, streak/run, options, the PRNG state for seeded games, the armed challenge code and elapsed ms.
- Written on every play-screen render (`rgSave`), for those three modes only. Online is deliberately not resumable: the host owns the room's state. Grid/Wordle/Daily have no "in progress" state to restore.
- Home shows a **Game in progress** panel with **Resume** and **Discard** (semantic `<section aria-label>` + two native buttons). Nothing auto-resumes.
- Cleared on game end (`finish`) and on **Quit game** — but only when quitting a resumable mode, so quitting a Wordle/Grid/Online game leaves a paused Classic game alone. A mid-round give-up (revealing the answer) *keeps* the snapshot: the game is still in progress. Same for a new game started from Home: it replaces the snapshot with no prompt.
- Timer choice: **Resume restarts the current round's countdown** from its full length (the round is re-shown from the clue you were on), while the elapsed time is carried over, so a paused round cannot set a "fastest solve" record. Stated because the alternative (restoring a half-run countdown) was a judgement call.
- Defensive by design: an old, truncated, mistyped or otherwise incompatible snapshot is dropped silently (`rgGet` validates version, mode, deck/results shapes, clue index and known player names) — never a crash, never a half-restored game. Values are also normalised on the stats side.
- Behaviour change: reloading a challenge link (`?seed=`) for a game that is already in progress now lands on Home with the Resume panel instead of silently restarting the challenge. Opening a *different* challenge link still auto-starts (Batch 1 behaviour).
- Cache: `ykb-v19`.

## v16 — fresh player information from Wikidata (offline)
- Bug fix: the national-team filter only dropped labels up to 30 characters, so long ones like "England national under-16 association football team" leaked into club histories. That in turn made `club_situation()` reject a parent club whose loan spells had later start dates ("live club is not the latest spell") and mislabel active players (Saka, Foden, Saliba, Olise…) as retired. The filter is now open-ended and the "latest spell" heuristic is gone.
- `club_situation()` rewrite (in the pipeline, not the app): a preferred-ranked club with no end date is authoritative; ambiguity (several clubs with no end date, a live loan, a missing start, a gap, a relayed stray statement) is reported and omitted rather than guessed. A club spell that began over 20 years ago is treated as stale, and "Retired" now also needs a plausible age (≥32) — so a player whose Wikidata is merely incomplete is never called retired. The full 279-player pass went from 161 current / 107 retired (with active players wrongly marked retired) to 172 / 95 with no active player mislabelled.
- `js/data.js` gains a machine-written block: `DATA_UPDATED` (the check date) and `CURRENT` (player → current club, or `"Retired"`). The player card shows **Current club** (or **Status: Retired**) and the Stats screen prints the date under "Your stats on this device" via `aboutData()` — staleness is visible, not implied. Club labels are tidied for display only (`CURTIDY`); the stored value is unchanged.
- `tools/validate-data.mjs` additionally asserts `DATA_UPDATED` is a real date and every `CURRENT` key resolves to a real player. Nationality, position and club history differences stay report-only (judgement calls). Cache: `ykb-v20`.

## v16.1 — pool expansion (Ligue 1, Other, Bundesliga)
- 27 players added, 279 → **306** (spread PL 121, LL 69, SA 46, BL 29, L1 23, OT 18; tier split 169 stars / 137 legends). The thin pools were the target: OT 8 → 18, L1 14 → 23, BL 21 → 29.
- `pipeline/add_players.py` builds them from Wikidata: it resolves each curated name to a football item, checks the curated birth year / nationality / position against the source, and checks that every club (a canonical short token mapped to a QID) really appears in the player's P54. Club tokens reuse the deck's existing vocabulary (`CLUB_QID`), so club clues and the Grid stay consistent; anything that cannot be matched is refused rather than written (all 27 passed, with three idiomatic position-bucket differences reported, not applied).
- Machine-written facts carry the `Auto~` label (same `Label~Text` shape as the special clues) and are generated from structured data (a FIFA-100 / Ballon d'Or / Footballer-of-the-Year clause when Wikidata has one). Marquee players keep their hand-written facts; every new structured field has a Wikidata QID in `data/add-report.csv` (gitignored).
- `CURRENT`/`DATA_UPDATED` were regenerated for the expanded deck, so the new players get current-club rows too.
- Cache: `ykb-v21`.

## v16.2 — league / nation / era filtering
- One filter value (`cfg.pool`) now has three shapes: the star/legend flag (existing), a bare league code (existing), `n:<nation>` or `y:<birth decade>` (new). A single predicate, `inPool(p,pool)`, decodes them, and both the deck build (`start()`) and the Grid generator (`gridGen`) already used it, so filtered games reuse the whole seeded-round machinery — the deck is still `shuf(pool).slice(...)` from the challenge PRNG, and `chLink()` already serialised `p`.
- Fixed the link round-trip: the parser only accepted `x|0|1|PL|LL|SA|BL|L1`, so a shared **OT** game silently fell back to Everyone (a different deck on the other device). It now accepts anything in `POOLSET` (leagues, stars/legends, every nation and era present in the deck).
- UI: the "Players" picker is now built by `poolCtl()` — one native `<select id="pl">` with `<optgroup>`s (League / Nation / Era), so it stays a real form control for keyboard, screen readers and the phone picker, and the mode language is unchanged (the label and the surrounding steps are untouched). `NATIONS`/`ERAS` are derived from the deck, never hardcoded.
- Guarding thin selections (this replaces "No players match that player pool. Try Everyone."): a non-default filter renders a `role="status"` bar under the pickers with the human filter name and the match count, a text warning ("short round set") when it is under 3, and a **Clear filter** button (delegated click, so it works on every setup screen). A pool of 0 shows "No players match <filter>. Pick another filter (or Everyone)." and returns to Setup — the undo path is always visible; nothing crashes and a small pool is never silently padded or repeated (the deck is capped at the pool size).
- Cache: `ykb-v22`.
