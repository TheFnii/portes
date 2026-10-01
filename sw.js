// Service worker : l'application reste utilisable même si le réseau flanche pendant le live.
// Réseau d'abord (les mises à jour, dont messages.json, arrivent tout de suite), cache en secours.
const CACHE = 'portes-v7';
const SHELL = [
  './',
  'index.html',
  'admin.html',
  'messages.json',
  'regles.json',
  'manifest.webmanifest',
  'css/base.css',
  'css/scene.css',
  'css/doors.css',
  'css/ui.css',
  'css/admin.css',
  'css/dash.css',
  'css/celebrate.css',
  'fonts/fonts.css',
  'fonts/cinzel-0.woff2',
  'fonts/cinzel-decorative-1.woff2',
  'fonts/cormorant-garamond-2.woff2',
  'fonts/cormorant-garamond-3.woff2',
  'js/main.js',
  'js/admin.js',
  'js/messages.js',
  'js/shell.js',
  'js/dashboard.js',
  'js/queue.js',
  'js/gifts.js',
  'js/features.js',
  'js/radio.js',
  'js/settings.js',
  'js/celebrate.js',
  'js/config.js',
  'js/prefs.js',
  'js/random.js',
  'js/scene.js',
  'js/doors.js',
  'js/doors-art.js',
  'js/doors-data.js',
  'js/dice.js',
  'js/fx.js',
  'js/sound.js',
  'js/ticker.js',
  'js/game.js',
  'js/tiktok.js',
  'icons/icon-192.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(req) {
  try {
    const fresh = req.mode === 'navigate'
      ? new Request(req.url, { cache: 'no-cache', credentials: 'same-origin' })
      : new Request(req, { cache: 'no-cache' });
    const res = await fetch(fresh);
    if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
    return res;
  } catch (e) {
    const hit = await caches.match(req, { ignoreSearch: true });
    if (hit) return hit;
    if (req.mode === 'navigate') return caches.match('index.html');
    throw e;
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(networkFirst(req));
});
