
const CACHE = 'pwa-fillable-pdf-v1';
const ASSETS = [
  './',
  './index.html',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => (k === CACHE ? null : caches.delete(k)))))
  );
  self.clients.claim();
});

// Cache-first for same-origin; network-first+cache for others (like the CDN for pdf-lib)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(event.request).then(res => res || fetch(event.request))
    );
  } else {
    event.respondWith(
      fetch(event.request).then(resp => {
        const respClone = resp.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, respClone));
        return resp;
      }).catch(() => caches.match(event.request))
    );
  }
});
