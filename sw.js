/* Service worker — Staff AJapp
   Cachea el shell de la app para que funcione sin conexión.
   Estrategia: red primero, caché como respaldo si no hay conexión.
   IMPORTANTE: sube el número de CACHE cada vez que cambie JS/CSS/HTML —
   si este archivo no cambia byte a byte, el navegador nunca detecta que
   hay una versión nueva y los móviles se quedan con el código viejo
   cacheado indefinidamente (bug real encontrado probando en iPhone). */
const CACHE = 'ajapp-v4';
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
  './icons/icon.svg',
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
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
