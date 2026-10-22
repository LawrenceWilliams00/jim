// Offline support. Every file is served from the cache straight away (so the app opens with no signal),
// and refreshed from the network in the background, so a new deploy shows up on the next open.
// Bump VERSION on every deploy: the app sees the new worker, fetches fresh files and reloads itself
// (straight away on the Today screen, otherwise the next time it's put in the background).
const VERSION = 'jim-8';
const FILES = [
  './',
  './index.html',
  './app.css',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-192.png',
  './icons/maskable-512.png',
  './fonts/bricolage-grotesque-latin-400-normal.woff2',
  './fonts/bricolage-grotesque-latin-500-normal.woff2',
  './fonts/bricolage-grotesque-latin-600-normal.woff2',
  './fonts/bricolage-grotesque-latin-700-normal.woff2',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const cached = await cache.match(req, { ignoreSearch: true });
    const fresh = fetch(req)
      .then(res => { if (res.ok && res.type === 'basic') cache.put(req, res.clone()); return res; })
      .catch(() => cached || (req.mode === 'navigate' ? cache.match('./') : Response.error()));
    if (cached) { event.waitUntil(fresh.catch(() => {})); return cached; }
    return fresh;
  })());
});
