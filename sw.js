// Service worker — estrategia network-first
// Consultoría Jurídica Educativa - Panamá

const CACHE_NAME = 'consulta-juridica-v2';
// Nota: corpus.json NO se precachea en el install. Es un archivo grande
// (2+ MB) y si la descarga se corta a medio camino (conexión débil),
// cache.addAll() fallaría la instalación completa del service worker.
// Se cachea de forma oportunista en el manejador de "fetch" de abajo,
// y solo si la respuesta es JSON válido y completo.
const CORE_ASSETS = [
  './index.html',
  './manifest.json'
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

  const isJsonData = event.request.url.endsWith('/data/corpus.json');

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response.ok) return response;

        if (isJsonData) {
          // Antes de cachear el corpus, confirmamos que la descarga llegó
          // completa y es JSON válido. Si la conexión se cortó a medio
          // camino, esto falla y simplemente NO se cachea la versión rota,
          // dejando la caché anterior (o ninguna) intacta.
          const copy = response.clone();
          copy.json()
            .then(() => {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
            })
            .catch(() => { /* descarga incompleta o inválida: no se cachea */ });
        } else {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }

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
