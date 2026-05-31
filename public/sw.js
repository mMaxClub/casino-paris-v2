/* eslint-disable no-restricted-globals */
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

// Precachear assets estáticos
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Estrategia: NavigationRoute (HTML)
const navigationRoute = new NavigationRoute(
  new NetworkFirst({
    cacheName: 'pages-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  }),
  {
    allowlist: [/^\/$/],
  }
);
registerRoute(navigationRoute);

// Estrategia: Assets (CSS, JS, imágenes)
registerRoute(
  ({ request }) =>
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image',
  new CacheFirst({
    cacheName: 'assets-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 días
      }),
    ],
  })
);

// Estrategia: API calls (Supabase)
const bgSyncPlugin = new BackgroundSyncPlugin('api-queue', {
  maxRetentionTime: 24 * 60, // 24 horas
  onSync: async ({ queue }) => {
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        await fetch(entry.request);
        console.log('Replay successful for request', entry.request.url);
      } catch (error) {
        console.error('Replay failed for request', entry.request.url, error);
        await queue.unshiftRequest(entry);
        throw error;
      }
    }
  },
});

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/') || url.hostname.includes('supabase.co'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 10,
    plugins: [
      bgSyncPlugin,
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// Estrategia: Datos JSON estáticos
registerRoute(
  ({ url }) => url.pathname.endsWith('.json') && !url.pathname.includes('api'),
  new StaleWhileRevalidate({
    cacheName: 'json-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 días
      }),
    ],
  })
);

// Manejar instalación
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker instalándose...');
  self.skipWaiting();
});

// Manejar activación
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activado');
  event.waitUntil(clients.claim());
});

// Notificar a los clientes cuando hay actualización
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background sync para cuando se restaura la conexión
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync:', event.tag);
  if (event.tag === 'sync-mutations') {
    event.waitUntil(syncMutations());
  }
});

async function syncMutations() {
  // Notificar a la app principal para que procese la cola
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: 'SYNC_REQUESTED' });
  });
}

// Push notifications (opcional)
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || 'Casino Paris';
  const options = {
    body: data.body || 'Nueva notificación',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [200, 100, 200],
  };
  
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});