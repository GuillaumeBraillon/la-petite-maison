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

self.addEventListener("push", (event) => {
  const fallbackPayload = {
    title: "La Petite Maison",
    body: "Vous avez une nouvelle notification.",
    url: "/",
    type: "request_pending",
  };

  let payload = fallbackPayload;

  if (event.data) {
    try {
      payload = event.data.json();
    } catch (_error) {
      payload = {
        ...fallbackPayload,
        body: event.data.text() || fallbackPayload.body,
      };
    }
  }

  const options = {
    body: payload.body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: {
      url: payload.url || "/",
      type: payload.type,
    },
    actions: [
      { action: "open", title: "Ouvrir" },
      { action: "close", title: "Fermer" },
    ],
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(payload.title, options),
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsList) => {
        for (const client of clientsList) {
          client.postMessage({ type: "user-notifications-updated" });
        }
      }),
    ])
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "close") {
    return;
  }

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsList) => {
      for (const client of clientsList) {
        const url = new URL(client.url);
        if (url.origin === self.location.origin) {
          client.focus();
          if ("navigate" in client) {
            return client.navigate(targetUrl);
          }
          return undefined;
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
