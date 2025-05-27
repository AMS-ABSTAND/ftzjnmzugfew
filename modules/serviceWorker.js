// ===== Module: serviceWorker.js - Alternative ohne externe Datei =====
export class ServiceWorkerManager {
    constructor() {
        this.registration = null;
    }

    async register() {
        if ('serviceWorker' in navigator) {
            try {
                // Erstelle Service Worker Code als Data URL statt Blob URL
                const swCode = this.getServiceWorkerCode();
                
                // Versuche zuerst die externe sw.js zu laden
                try {
                    this.registration = await navigator.serviceWorker.register('/sw.js');
                    console.log('Service Worker registered successfully from /sw.js');
                } catch (error) {
                    console.log('External sw.js not found, using inline service worker');
                    
                    // Fallback: Verwende Data URL
                    const dataUrl = `data:application/javascript;base64,${btoa(swCode)}`;
                    this.registration = await navigator.serviceWorker.register(dataUrl);
                    console.log('Service Worker registered successfully from data URL');
                }

                this.registration.addEventListener('updatefound', () => {
                    const newWorker = this.registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this.showUpdateBanner();
                        }
                    });
                });

                // Check for updates every minute
                setInterval(() => {
                    this.registration.update();
                }, 60000);
            } catch (error) {
                console.error('Service Worker registration failed:', error);
                // Deaktiviere Service Worker funktionen, aber lass die App weiterlaufen
                console.log('App continues without service worker');
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
            .then(cache => {
                return cache.addAll(urlsToCache).catch(err => {
                    console.log('Some resources failed to cache:', err);
                    // Cache what we can
                    return Promise.all(
                        urlsToCache.map(url => {
                            return cache.add(url).catch(err => {
                                console.log('Failed to cache:', url, err);
                            });
                        })
                    );
                });
            })
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
    // Nur für same-origin requests cachen
    if (event.request.url.startsWith(self.location.origin)) {
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
                            .then(cache => cache.put(event.request, responseToCache))
                            .catch(err => console.log('Failed to cache response:', err));
                        
                        return networkResponse;
                    });
                })
                .catch(() => {
                    // Fallback für offline
                    if (event.request.mode === 'navigate') {
                        return caches.match('/index.html');
                    }
                    return new Response('Offline - Keine Internetverbindung', {
                        status: 503,
                        statusText: 'Service Unavailable',
                        headers: { 'Content-Type': 'text/plain' }
                    });
                })
        );
    }
});

self.addEventListener('sync', event => {
    if (event.tag === 'sync-treatments') {
        event.waitUntil(syncTreatments());
    }
});

async function syncTreatments() {
    try {
        console.log('Background sync triggered');
        // Hier würde normalerweise die Synchronisation stattfinden
    } catch (error) {
        console.error('Sync failed:', error);
    }
}

self.addEventListener('push', event => {
    const options = {
        body: event.data ? event.data.text() : 'Neue Benachrichtigung',
        icon: '/icon-192.png',
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