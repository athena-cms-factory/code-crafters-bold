const CACHE_NAME = 'athena-cache-v' + Date.now(); // Unieke naam per build
const urlsToCache = [
  './athena-icon.svg',
  './manifest.json'
];

self.addEventListener('install', event => {
  self.skipWaiting(); // Forceer activatie van nieuwe SW
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('SW: Pre-caching assets');
      return Promise.allSettled(
        urlsToCache.map(url => cache.add(url).catch(err => console.warn(`SW: Kon ${url} niet cachen:`, err)))
      );
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME).map(name => {
          console.log('SW: Verwijderen oude cache:', name);
          return caches.delete(name);
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  // Voor HTML bestanden: ALTIJD eerst netwerk proberen (Network-First)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Voor andere assets: Cache-First
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).catch(() => {
        // Fallback als zowel cache als netwerk falen (voorkomt TypeError)
        if (event.request.destination === 'image') {
          return caches.match('./placeholder.jpg'); // Optioneel: cache ook een placeholder afbeelding
        }
        return new Response('Offline content niet beschikbaar', { status: 503, statusText: 'Service Unavailable' });
      });
    })
  );
});