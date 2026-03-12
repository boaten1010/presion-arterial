// ─── SERVICE WORKER ──────────────────────────────────────────────────────────
// Versión de la caché — cambiar este número fuerza actualización
const CACHE_NAME = 'presion-arterial-v1';

// Archivos que se guardan para funcionar sin internet
const ASSETS = [
  './presion-arterial.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
  'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap'
];

// INSTALACIÓN: guarda todos los archivos en caché
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Carga los recursos locales de forma segura
      return cache.addAll(ASSETS).catch(err => {
        console.warn('Algunos recursos no pudieron cachearse:', err);
      });
    })
  );
  self.skipWaiting();
});

// ACTIVACIÓN: elimina cachés viejas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// FETCH: estrategia Cache-First con fallback a red
// Los datos del usuario siempre quedan en localStorage (no pasan por el SW)
self.addEventListener('fetch', event => {
  // Solo intercepta GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      // No está en caché → buscar en la red y guardarlo
      return fetch(event.request).then(response => {
        // Solo cachear respuestas válidas
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });
        return response;
      }).catch(() => {
        // Sin red y sin caché: devuelve la página principal como fallback
        if (event.request.destination === 'document') {
          return caches.match('./presion-arterial.html');
        }
      });
    })
  );
});
