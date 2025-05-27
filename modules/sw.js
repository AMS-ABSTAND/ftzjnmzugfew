// Sauen Behandlung App - Service Worker
// Version 1.0.0

const CACHE_NAME = 'sauen-app-v1.0.0';
const STATIC_CACHE_NAME = 'sauen-app-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'sauen-app-dynamic-v1.0.0';

// Statische Dateien die beim Install gecacht werden
const STATIC_FILES = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/manifest.json',
    '/modules/database.js',
    '/modules/virtualScroller.js',
    '/modules/search.js',
    '/modules/exporter.js',
    '/modules/sync.js',
    '/modules/serviceWorker.js'
];

// Install Event - Cache statische Dateien
self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching static files');
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                console.log('Service Worker: Installation complete');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('Service Worker: Installation failed', error);
            })
    );
});

// Activate Event - Cleanup alte Caches
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        // Lösche alte Caches
                        if (cacheName !== STATIC_CACHE_NAME && 
                            cacheName !== DYNAMIC_CACHE_NAME && 
                            (cacheName.startsWith('sauen-app-') || cacheName.startsWith('sauen-app'))) {
                            console.log('Service Worker: Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker: Activation complete');
                return self.clients.claim();
            })
    );
});

// Fetch Event - Serve cached content
self.addEventListener('fetch', event => {
    const requestUrl = new URL(event.request.url);
    
    // Nur requests zur eigenen Domain bearbeiten
    if (requestUrl.origin !== location.origin) {
        return;
    }
    
    // Spezielle Behandlung für verschiedene Request-Typen
    if (event.request.destination === 'document') {
        // HTML Requests - Cache First mit Network Fallback
        event.respondWith(handleDocumentRequest(event.request));
    } else if (STATIC_FILES.some(file => event.request.url.endsWith(file))) {
        // Statische Dateien - Cache First
        event.respondWith(handleStaticRequest(event.request));
    } else {
        // Dynamische Requests - Network First mit Cache Fallback
        event.respondWith(handleDynamicRequest(event.request));
    }
});

// HTML Document Requests
async function handleDocumentRequest(request) {
    try {
        // Versuche zuerst aus Cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Falls nicht im Cache, lade vom Network
        const networkResponse = await fetch(request);
        
        // Cache die Response für später
        if (networkResponse.status === 200) {
            const cache = await caches.open(STATIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        // Offline Fallback
        const cachedResponse = await caches.match('/index.html');
        if (cachedResponse) {
            return cachedResponse;
        }
        
        return new Response(
            '<h1>Offline</h1><p>Die App ist offline verfügbar, aber diese Seite konnte nicht geladen werden.</p>',
            { 
                headers: { 'Content-Type': 'text/html' },
                status: 503,
                statusText: 'Service Unavailable'
            }
        );
    }
}

// Statische Dateien (CSS, JS, etc.)
async function handleStaticRequest(request) {
    try {
        // Cache First Strategie
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Vom Network laden und cachen
        const networkResponse = await fetch(request);
        
        if (networkResponse.status === 200) {
            const cache = await caches.open(STATIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('Failed to fetch static resource:', request.url, error);
        
        // Fallback Response
        return new Response('Resource not available offline', {
            status: 503,
            statusText: 'Service Unavailable'
        });
    }
}

// Dynamische Requests (API calls, etc.)
async function handleDynamicRequest(request) {
    try {
        // Network First Strategie
        const networkResponse = await fetch(request);
        
        // Cache erfolgreiche GET requests
        if (request.method === 'GET' && networkResponse.status === 200) {
            const cache = await caches.open(DYNAMIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        // Fallback zu Cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Keine cached version verfügbar
        return new Response(
            JSON.stringify({ 
                error: 'Network error', 
                message: 'Request failed and no cached version available',
                offline: true 
            }),
            {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

// Background Sync für Daten-Synchronisation
self.addEventListener('sync', event => {
    console.log('Service Worker: Background sync triggered:', event.tag);
    
    if (event.tag === 'sync-treatments') {
        event.waitUntil(syncTreatments());
    }
});

async function syncTreatments() {
    try {
        console.log('Service Worker: Syncing treatments...');
        
        // Hier würde die tatsächliche Synchronisation mit dem Backend stattfinden
        // Da wir kein Backend haben, loggen wir nur
        
        // Benachrichtige die App über erfolgreiche Synchronisation
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'SYNC_COMPLETE',
                success: true
            });
        });
        
        console.log('Service Worker: Sync complete');
    } catch (error) {
        console.error('Service Worker: Sync failed:', error);
        
        // Benachrichtige die App über fehlgeschlagene Synchronisation
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'SYNC_COMPLETE',
                success: false,
                error: error.message
            });
        });
    }
}

// Push Notifications
self.addEventListener('push', event => {
    console.log('Service Worker: Push received');
    
    const options = {
        body: event.data ? event.data.text() : 'Neue Benachrichtigung von der Sauen App',
        icon: '/icon-192.png',
        badge: '/icon-72.png',
        vibrate: [200, 100, 200],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'open',
                title: 'App öffnen',
                icon: '/icon-192.png'
            },
            {
                action: 'close',
                title: 'Schließen'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('Sauen Behandlung', options)
    );
});

// Notification Click Handler
self.addEventListener('notificationclick', event => {
    console.log('Service Worker: Notification clicked');
    
    event.notification.close();
    
    if (event.action === 'open' || !event.action) {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Message Handler für Kommunikation mit der App
self.addEventListener('message', event => {
    console.log('Service Worker: Message received:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_NAME });
    }
});

// Error Handler
self.addEventListener('error', event => {
    console.error('Service Worker: Error:', event.error);
});

self.addEventListener('unhandledrejection', event => {
    console.error('Service Worker: Unhandled rejection:', event.reason);
});

console.log('Service Worker: Script loaded');