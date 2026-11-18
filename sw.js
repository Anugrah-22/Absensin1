// Ubah angka versi ini (misal v2, v3, dst.) setiap kali Anda update aplikasi
const CACHE_NAME = 'siandal-cache-v2';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 1. Saat install: langsung aktifkan SW baru tanpa menunggu tab ditutup (skipWaiting)
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

// 2. Saat activate: hapus semua cache versi lama secara otomatis & ambil alih halaman
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Strategi Fetch: Network-First untuk HTML, Bypass untuk Firebase
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Jangan pernah cache request ke Firebase / Google API
  if (url.includes('firestore.googleapis.com') || 
      url.includes('firebase') || 
      url.includes('gstatic.com')) {
    return;
  }

  // Untuk navigasi / file HTML: selalu ambil versi terbaru dari internet (Network-First)
  if (event.request.mode === 'navigate' || url.endsWith('index.html')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Untuk aset statis (ikon, manifest): ambil dari cache, jika tidak ada ambil dari internet
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});
