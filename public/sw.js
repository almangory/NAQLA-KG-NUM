const CACHE_NAME = 'naqla-kg-journey-v2';

const ASSETS_TO_PRECACHE = [
  '/',
  '/index.html',
  '/logo.png',
  '/src/main.tsx',
  '/src/App.tsx',
  '/src/index.css',
  '/src/types.ts',
  '/src/data/numbersData.ts',
  '/src/utils/audio.ts',
  '/src/components/BalloonChallenge.tsx',
  '/src/components/DrawingBoard.tsx',
  '/src/components/MatchingGame.tsx',
  '/src/components/MoreGames.tsx',
  '/src/components/NumberBlocksGame.tsx',
  '/src/components/NumbersMemoryGame.tsx',
  '/src/components/NumbersRaceGame.tsx',
  '/src/components/QuizGame.tsx',
  '/src/components/SongCorner.tsx',
  '/src/components/StatsProgress.tsx',
  '/src/components/VoiceRecorder.tsx',
  '/src/components/WorksheetGenerator.tsx'
];

// Install Event - Pre-cache core files for immediate offline load
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(ASSETS_TO_PRECACHE).catch((err) => {
          console.warn('Pre-caching warning (some files might be generated dynamically):', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up stale cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing Old Cache', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Performance optimized Cache-First with Network Fallback & Update
self.addEventListener('fetch', (event) => {
  // Only handle GET requests and local/web schemes
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached asset instantly, but update the cache in the background for fresh updates
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => { /* Silent fallback when truly offline */ });

        return cachedResponse;
      }

      // If not in cache, fetch from network, cache it, and return
      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch(() => {
          // If completely offline and navigating to a page, serve the cached root
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
    })
  );
});
