// Saves Magic Sea on the device so it works in airplane mode.
// Shows the saved copy instantly, and quietly grabs any updates when online.
// If you change the game, bump the version so old copies get cleaned up.
const CACHE = 'magic-sea-v2';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const cached = caches.open(CACHE).then((c) => c.match(req, { ignoreSearch: true }));
  let saving = Promise.resolve();
  const fresh = fetch(req).then((res) => {
    if (res && (res.ok || res.type === 'opaque')) {
      const copy = res.clone();
      saving = caches.open(CACHE).then((c) => c.put(req, copy));
    }
    return res;
  }).catch(() => null);
  event.waitUntil(fresh.then(() => saving).catch(() => {}));

  event.respondWith((async () => {
    const hit = await cached;
    if (hit) return hit;
    const res = await fresh;
    if (res) return res;
    if (req.mode === 'navigate') {
      const shell = await caches.match('./index.html', { ignoreSearch: true });
      if (shell) return shell;
    }
    return Response.error();
  })());
});
