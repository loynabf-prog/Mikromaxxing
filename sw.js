// Mikromaxxing – Service Worker (Offline-Cache)
const CACHE = 'mikromaxxing-v41';
const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/data.js',
  './js/store.js',
  './js/parser.js',
  './js/lookup.js',
  './js/knowledge.js',
  './js/icons.js',
  './js/ui.js',
  './js/views/today.js',
  './js/views/quickadd.js',
  './js/views/food.js',
  './js/views/sport.js',
  './js/views/workout.js',
  './js/views/progress.js',
  './js/views/setup.js',
  './js/views/onboarding.js',
  './js/views/scan.js',
  './js/views/aisetup.js',
  './vendor/zxing.min.js',
  './manifest.webmanifest',
  './icons/icon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(ASSETS.map(a => c.add(a))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  // Netzwerk zuerst (immer aktuelle, zueinander passende Dateien), offline aus dem Cache.
  e.respondWith(
    fetch(request).then(res => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(request, copy)).catch(() => {});
      }
      return res;
    }).catch(() => caches.match(request).then(hit => hit || (request.mode === 'navigate' ? caches.match('./index.html') : Response.error())))
  );
});
