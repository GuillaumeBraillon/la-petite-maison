// Ce Service Worker est requis pour que Chrome détecte l'app comme "Installable" (PWA).
// Nous n'utilisons pas de stratégie de cache complexe ici car l'app dépend de Supabase (online).

const CACHE_NAME = "la-petite-maison-v1";

self.addEventListener("install", () => {
  // Force l'activation immédiate
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Prend le contrôle des clients immédiatement
  event.waitUntil(self.clients.claim());
});

// On doit intercepter les fetch pour que Chrome considère l'app comme installable
// Mais on laisse tout passer vers le réseau sans cache
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
