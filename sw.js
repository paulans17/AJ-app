/* Service worker — Staff AJapp
   Cachea el shell de la app para que funcione sin conexión.
   Estrategia: red primero, caché como respaldo si no hay conexión.
   IMPORTANTE: sube el número de CACHE cada vez que cambie JS/CSS/HTML —
   si este archivo no cambia byte a byte, el navegador nunca detecta que
   hay una versión nueva y los móviles se quedan con el código viejo
   cacheado indefinidamente (bug real encontrado probando en iPhone). */
const CACHE = 'ajapp-v9';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/store.js',
  './js/scanner.js',
  './js/views.js',
  './js/app.js',
  './js/vendor/jsQR.min.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // Red primero para todo (propios y CDN): la app está en desarrollo activo,
  // las actualizaciones tienen que llegar sin depender de que alguien
  // reinstale. El caché es solo el respaldo para cuando de verdad no hay
  // conexión -- que es lo único que necesita el modo offline real.
  // { cache: 'no-store' } es imprescindible: GitHub Pages sirve los archivos
  // propios con Cache-Control: max-age=600 (10 min) -- sin esto, un fetch()
  // normal puede devolver una copia de la caché HTTP del navegador con hasta
  // 10 min de antigüedad y el Service Worker la daría por "de red" (bug real
  // encontrado 2026-09-15: un despliegue nuevo tardaba hasta 10 min en verse).
  e.respondWith(
    fetch(e.request, { cache: 'no-store' })
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
