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
- Dark is now the default; theme toggle no longer follows the OS (one line in the `#tg` handler).
- Confetti is hidden with CSS (decorative, longer than 600ms). `confetti()` still runs.
- Online "last 5 seconds" orange now uses 5 (was 3) and ignores the reveal countdown.
- Old `.row` animation re-fired every second in the online scoreboard; disabled there.
- `hostTick` re-renders `#obd` each second, so online score numbers do not tween.
- No separate "Reveal" action exists in JS: Skip to next clue = reveal next; Give up = reveal answer.
- Fragile: markup is string-built in many places, so a missing ID throws silently in handlers; `post()` styles `#app`'s first child; `cp()` swallows clipboard errors; Wordle/Grid errors write to `#er` outside any redraw; PeerJS 6s host timeout paths use `alert` in gridStart.
- Small additive JS (display only): `S.nk`, `S.sk` for fresh-clue and streak-tab detection, share grid in end screen and copied text, `fit()`, `flipList()`, `pulse()`.
