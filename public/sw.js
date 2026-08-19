const CACHE_NAME = 'bms-stock-v3';
const BASE_URL = self.registration.scope;
const APP_SHELL = [BASE_URL, `${BASE_URL}manifest.json`, `${BASE_URL}assets/logo.png`, `${BASE_URL}assets/icon-192.png`, `${BASE_URL}assets/icon-512.png`];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match(BASE_URL)));
    return;
  }

  const cacheableDestinations = ['font', 'image', 'script', 'style'];
  const isStaticAsset = cacheableDestinations.includes(event.request.destination) || event.request.url === `${BASE_URL}manifest.json`;
  if (!isStaticAsset) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request).then((networkResponse) => {
        if (networkResponse.ok) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      });
    })
  );
});
