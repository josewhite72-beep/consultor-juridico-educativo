// Service worker — estrategia network-first
// Consultoría Jurídica Educativa - Panamá

const CACHE_NAME = 'consulta-juridica-v1';
const CORE_ASSETS = [
  './index.html',
  './manifest.json',
  './data/corpus.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

// Network-first: intenta red, si falla usa caché. Así el usuario siempre
// recibe la versión más reciente cuando hay conexión, y la app sigue
// funcionando offline con la última versión guardada.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Permite que la página pida el borrado total de caché (botón "Limpiar caché")
self.addEventListener('message', (event) => {
  if (event.data === 'CLEAR_CACHE') {
    caches.keys().then((names) => {
      names.forEach((n) => caches.delete(n));
    });
  }
});
