/* YouKnowBall service worker — cache the app shell for offline play.
   Small on purpose: no routing tricks, only GET, always fall back to network. */
const VER = "ykb-v17";
const XV = "17";
const SHELL = [
  "./",
  "index.html",
  "404.html",
  "config.js",
  "css/main.css?v=" + XV,
  "js/data.js?v=" + XV,
  "js/fx.js?v=" + XV,
  "js/app.js?v=" + XV,
  "manifest.webmanifest",
  "icon.svg",
  "icon-192.png",
  "icon-512.png",
  "apple-touch-icon.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VER).then(c => Promise.allSettled(SHELL.map(u => c.add(u))))).then(() => self.skipWaiting());
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== VER).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  // Page navigations: serve the shell offline; network first when online.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).catch(() => caches.match("index.html").catch(() => caches.match("./")))
    );
    return;
  }

  const same = new URL(req.url).origin === location.origin;
  if (same) {
    // App shell: cache first, refresh in the background.
    e.respondWith(
      caches.match(req).then(hit => {
        const net = fetch(req).then(res => {
          if (res && res.ok) caches.open(VER).then(c => c.put(req, res.clone()));
          return res.clone();
        }).catch(() => hit);
        return hit || net;
      })
    );
    return;
  }

  // Cross-origin (Google Fonts, PeerJS CDN): stale-while-revalidate.
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res && res.ok) caches.open(VER).then(c => c.put(req, res.clone()));
        return res.clone();
      }).catch(() => hit);
      return hit || net;
    })
  );
});
