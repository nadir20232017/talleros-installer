var CACHE_NAME = "talleros-v3";

// Instalar - no cachear nada por ahora
self.addEventListener("install", function(e) {
  self.skipWaiting();
});

// Activar - limpiar todas las caches
self.addEventListener("activate", function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(k){ return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

// Fetch - pasar todo directo sin cache
self.addEventListener("fetch", function(e) {
  e.respondWith(fetch(e.request));
});
