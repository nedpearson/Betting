/**
 * Service Worker for Betting Intelligence OS (PWA)
 * Safe Offline & Caching Strategy
 */

const CACHE_NAME = 'boi-shell-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Strict Security Rule: NEVER cache mutating endpoints or live trading orders
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api/orders')) {
    return; // Pass directly to network
  }

  // 2. Market Data & Intelligence APIs: Network-Only with Explicit Offline Fallback
  // Financial Rule: Never serve stale/cached prices as "live"
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({
            offline: true,
            error: 'DEVICE_OFFLINE',
            message: 'You are currently offline. Market prices and trade execution are disabled until connectivity is restored.',
            timestamp: new Date().toISOString(),
          }),
          {
            status: 503,
            statusText: 'Service Unavailable (Offline)',
            headers: { 'Content-Type': 'application/json' },
          }
        );
      })
    );
    return;
  }

  // 3. Application Shell & Static Assets: Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
