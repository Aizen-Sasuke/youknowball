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
