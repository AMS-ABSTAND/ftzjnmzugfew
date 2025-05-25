// Corrected version using inline Service Worker blob
export class ServiceWorkerManager {
  constructor() {
    this.registration = null;
  }

  async register() {
    if ('serviceWorker' in navigator) {
      try {
        const swCode = this.getServiceWorkerCode();
        const blob = new Blob([swCode], { type: 'application/javascript' });
        const swUrl = URL.createObjectURL(blob);

        this.registration = await navigator.serviceWorker.register(swUrl);
        console.log('Service Worker registered successfully');

        this.registration.addEventListener('updatefound', () => {
          const newWorker = this.registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this.showUpdateBanner();
            }
          });
        });

        setInterval(() => {
          this.registration.update();
        }, 60000);
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  showUpdateBanner() {
    const banner = document.getElementById('update-banner');
    if (banner) {
      banner.style.display = 'block';
    }
  }

  getServiceWorkerCode() {
    return `
      const CACHE_NAME = 'sauen-app-v2';
      const urlsToCache = [
        '/',
        '/index.html',
        '/styles.css',
        '/app.js',
        '/manifest.json'
      ];

      self.addEventListener('install', event => {
        event.waitUntil(
          caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
            .then(() => self.skipWaiting())
        );
      });

      self.addEventListener('activate', event => {
        event.waitUntil(
          caches.keys().then(cacheNames => {
            return Promise.all(
              cacheNames.map(cacheName => {
                if (cacheName !== CACHE_NAME) {
                  return caches.delete(cacheName);
                }
              })
            );
          }).then(() => self.clients.claim())
        );
      });

      self.addEventListener('fetch', event => {
        event.respondWith(
          caches.match(event.request)
            .then(response => {
              if (response) return response;
              return fetch(event.request).then(networkResponse => {
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                  return networkResponse;
                }
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME)
                  .then(cache => cache.put(event.request, responseToCache));
                return networkResponse;
              });
            })
            .catch(() => new Response('Offline - Keine Internetverbindung', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/plain' }
            }))
        );
      });

      self.addEventListener('sync', event => {
        if (event.tag === 'sync-treatments') {
          event.waitUntil(syncTreatments());
        }
      });

      async function syncTreatments() {
        try {
          const cache = await caches.open(CACHE_NAME);
          const requests = await cache.matchAll('/api/treatments', {
            ignoreSearch: true,
            ignoreMethod: false
          });

          for (const request of requests) {
            try {
              await fetch(request);
              await cache.delete(request);
            } catch (error) {
              console.error('Failed to sync treatment:', error);
            }
          }
        } catch (error) {
          console.error('Sync failed:', error);
        }
      }

      self.addEventListener('push', event => {
        const options = {
          body: event.data ? event.data.text() : 'Neue Benachrichtigung',
          icon: '/icon-192.png',
          badge: '/badge-72.png',
          vibrate: [200, 100, 200]
        };
        event.waitUntil(
          self.registration.showNotification('Sauen Behandlung', options)
        );
      });

      self.addEventListener('notificationclick', event => {
        event.notification.close();
        event.waitUntil(
          clients.openWindow('/')
        );
      });
    `;
  }
}
