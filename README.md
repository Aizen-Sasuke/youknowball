# Guess the Player

A football quiz you can play with friends. Each round shows five clues about a player, in a random order. The fewer clues you need, the more you score.

## Modes

- **Classic**: pass the phone around, with an optional turn timer, teams, and a letter-hint lifeline.
- **Career path**: clubs unlock one at a time.
- **Daily**: the same five players for everyone each day, with a shareable result grid.
- **Online**: host a room, share the 4-letter code (or an invite link), and race friends on their own phones.

118 players, difficulty tiers with bonus points, streaks, stats saved on your device, sage light and dark themes, and a stadium intro.

## Run it

It is a static site with no build step. Open `index.html` in a browser, or serve the folder:

```
npx serve .
```

## Deploy on Vercel

1. Push this folder to a GitHub repository.
2. In Vercel, choose Add New, then Project, and import the repository.
3. Set the framework preset to Other and leave the build command empty.
4. Deploy. Online rooms work as soon as the site is live over HTTPS.

Or from this folder: `npx vercel --prod`.

## How online play works

Online rooms use [PeerJS](https://peerjs.com/) (WebRTC) with its free public signaling server. The host's browser runs the game and everyone else connects to it, so there is no backend to run.

Some strict networks block direct connections. If a friend cannot join, add a TURN relay in `config.js`.

## Notes

- Player facts are written from memory and may contain mistakes. Open an issue or edit the data at the top of the script in `index.html` (the `RAW` and `SPR` blocks).
- Add a `LICENSE` file before sharing the repository publicly.
- For a link preview image, add an `og:image` meta tag with the absolute URL of an image on your domain.
