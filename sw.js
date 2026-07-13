// sw.js — app shell + runtime caching so CARGA works offline after first use
const SHELL_CACHE = 'carga-shell-v1';
const MEDIA_CACHE = 'carga-media-v1';
const DATA_CACHE = 'carga-data-v1';

const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/app.js',
  './js/router.js',
  './js/db.js',
  './js/dataset.js',
  './js/utils.js',
  './js/plate.js',
  './js/chart.js',
  './js/modal.js',
  './js/tracking.js',
  './js/generator.js',
  './js/swap.js',
  './js/exerciseDetail.js',
  './js/views/dashboard.js',
  './js/views/library.js',
  './js/views/routines.js',
  './js/views/generate.js',
  './js/views/workout.js',
  './js/views/progress.js',
  './js/views/settings.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![SHELL_CACHE, MEDIA_CACHE, DATA_CACHE].includes(k))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Exercise media (images/gifs): cache-first, fetch in background to refresh.
  if (url.hostname === 'raw.githubusercontent.com' && url.pathname.includes('/data/exercises.json') === false && (url.pathname.includes('/images/') || url.pathname.includes('/videos/'))) {
    event.respondWith(
      caches.open(MEDIA_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        const fetchPromise = fetch(event.request).then((res) => {
          if (res.ok) cache.put(event.request, res.clone());
          return res;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Exercise dataset JSON: network-first, fallback to cache when offline.
  if (url.hostname === 'raw.githubusercontent.com' && url.pathname.includes('/data/exercises.json')) {
    event.respondWith(
      caches.open(DATA_CACHE).then(async (cache) => {
        try {
          const res = await fetch(event.request);
          if (res.ok) cache.put(event.request, res.clone());
          return res;
        } catch (err) {
          const cached = await cache.match(event.request);
          if (cached) return cached;
          throw err;
        }
      })
    );
    return;
  }

  // App shell: cache-first.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
  }
});
