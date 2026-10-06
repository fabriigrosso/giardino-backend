const CACHE = 'giardino-sj-v1';
const ASSETS = ['/index.html', '/manifest.json', '/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Cache-first para el shell de la app; todo lo demás (API) va directo a la red.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.pathname.startsWith('/api/')) return; // nunca cachear la API/MCP
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
