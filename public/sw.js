const CACHE = 'scanlabb-v2';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x !== CACHE).map((x) => caches.delete(x)))));
  self.clients.claim();
});
self.addEventListener('fetch', (e) => {
  if (!e.request.url.startsWith('http') || e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then((cached) => {
    if (cached) return cached;
    return fetch(e.request).then((r) => {
      if (r.ok && r.type !== 'opaque') {
        const c = r.clone();
        caches.open(CACHE).then((cache) => cache.put(e.request, c).catch(() => {}));
      }
      return r;
    }).catch(() => cached || new Response('Offline', { status: 503 }));
  }));
});
