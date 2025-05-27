// Sauen Behandlung App - Service Worker
// Version 1.3.0 - Auto Path Detection

const CACHE_NAME = 'sauen-app-v1.3.0';
const STATIC_CACHE_NAME = 'sauen-app-static-v1.3.0';
const DYNAMIC_CACHE_NAME = 'sauen-app-dynamic-v1.3.0';

// Automatische Pfaderkennung basierend auf Service Worker URL
const BASE_PATH = (() => {
    const swUrl = new URL(self.location);
    const path = swUrl.pathname.replace('/sw.js', '/');
    console.log('Service Worker: Detected base path:', path);
    return path;
})();

// Statische Dateien die beim Install gecacht werden
const STATIC_FILES = [
    BASE_PATH,
    BASE_PATH + 'index.html',
    BASE_PATH + 'styles.css',
    BASE_PATH + 'app.js'
];

// Optionale Dateien die gecacht werden wenn sie existieren
const OPTIONAL_FILES = [
    BASE_PATH + 'manifest.json',
    BASE_PATH + 'modules/database.js',
    BASE_PATH + 'modules/virtualScroller.js',
    BASE_PATH + 'modules/search.js',
    BASE_PATH + 'modules/exporter.js',
    BASE_PATH + 'modules/sync.js',
    BASE_PATH + 'modules/serviceWorker.js',
    BASE_PATH + 'icon-192.png',
    BASE_PATH + 'favicon.svg'
];

// Install Event - Cache statische Dateien mit robustem Fehlerhandling
self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching essential files');
                
                // Cache essential files first
                return cacheFilesWithFallback(cache, STATIC_FILES)
                    .then(() => {
                        console.log('Service Worker: Essential files cached');
                        // Try to cache optional files
                        return cacheFilesWithFallback(cache, OPTIONAL_FILES, true);
                    });
            })
            .then(() => {
                console.log('Service Worker: Installation complete');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('Service Worker: Installation failed', error);
                // Don't fail installation if some files can't be cached
                return self.skipWaiting();
            })
    );
});

// Robuste Cache-Funktion
async function cacheFilesWithFallback(cache, files, optional = false) {
    const cachePromises = files.map(async (file) => {
        try {
            const response = await fetch(file);
            if (response.ok) {
                await cache.put(file, response);
                console.log(`✅ Cached: ${file}`);
            } else {
                console.log(`⚠️ Skipped (${response.status}): ${file}`);
            }
        } catch (error) {
            if (optional) {
                console.log(`⚠️ Optional file not found: ${file}`);
            } else {
                console.error(`❌ Failed to cache: ${file}`, error);
            }
        }
    });
    
    await Promise.allSettled(cachePromises);
}

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
    
    // Nur requests zur eigenen Domain und dem korrekten Pfad bearbeiten
    if (requestUrl.origin !== location.origin || !requestUrl.pathname.startsWith(BASE_PATH)) {
        return;
    }

    // Skip chrome-extension requests
    if (requestUrl.protocol === 'chrome-extension:') {
        return;
    }
    
    // Spezielle Behandlung für verschiedene Request-Typen
    if (event.request.destination === 'document' || event.request.mode === 'navigate') {
        // HTML Requests - Cache First mit Network Fallback
        event.respondWith(handleDocumentRequest(event.request));
    } else if (isStaticAsset(event.request.url)) {
        // Statische Dateien - Cache First
        event.respondWith(handleStaticRequest(event.request));
    } else {
        // Dynamische Requests - Network First mit Cache Fallback
        event.respondWith(handleDynamicRequest(event.request));
    }
});

// Prüfe ob es sich um ein statisches Asset handelt
function isStaticAsset(url) {
    return url.includes('.css') || 
           url.includes('.js') || 
           url.includes('.png') || 
           url.includes('.jpg') || 
           url.includes('.svg') || 
           url.includes('.ico') ||
           url.includes('.json');
}

// HTML Document Requests
async function handleDocumentRequest(request) {
    try {
        // Network First für HTML
        const networkResponse = await fetch(request);
        
        // Cache die Response für später
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE_NAME);
            cache.put(request, networkResponse.clone()).catch(err => {
                console.log('Failed to cache document:', err);
            });
        }
        
        return networkResponse;
    } catch (error) {
        console.log('Network failed, trying cache for:', request.url);
        
        // Fallback zu Cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Fallback zu index.html
        const indexResponse = await caches.match(BASE_PATH + 'index.html');
        if (indexResponse) {
            return indexResponse;
        }
        
        // Letzter Fallback
        return new Response(
            `<!DOCTYPE html>
            <html>
            <head><title>Offline</title></head>
            <body>
                <h1>🐷 Sauen App - Offline</h1>
                <p>Die App ist offline. Bitte überprüfen Sie Ihre Internetverbindung.</p>
                <button onclick="window.location.reload()">Neu laden</button>
            </body>
            </html>`,
            { 
                headers: { 'Content-Type': 'text/html' },
                status: 200
            }
        );
    }
}

// Statische Dateien (CSS, JS, etc.)
async function handleStaticRequest(request) {
    try {
        // Cache First Strategie für statische Assets
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Vom Network laden und cachen
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE_NAME);
            cache.put(request, networkResponse.clone()).catch(err => {
                console.log('Failed to cache static asset:', err);
            });
        }
        
        return networkResponse;
    } catch (error) {
        console.error('Failed to fetch static resource:', request.url, error);
        
        // Fallback Response je nach Dateityp
        if (request.url.includes('.css')) {
            return new Response('/* Offline - CSS not available */', {
                headers: { 'Content-Type': 'text/css' }
            });
        } else if (request.url.includes('.js')) {
            return new Response('console.log("Offline - JS not available");', {
                headers: { 'Content-Type': 'application/javascript' }
            });
        }
        
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
        if (request.method === 'GET' && networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE_NAME);
            cache.put(request, networkResponse.clone()).catch(err => {
                console.log('Failed to cache dynamic request:', err);
            });
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
        // Da wir kein Backend haben, simulieren wir erfolgreiche Sync
        
        // Benachrichtige die App über erfolgreiche Synchronisation
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'SYNC_COMPLETE',
                success: true,
                timestamp: new Date().toISOString()
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
    
    let notificationData = {
        title: 'Sauen Behandlung',
        body: 'Neue Benachrichtigung von der Sauen App',
        icon: BASE_PATH + 'icon-192.png',
        badge: BASE_PATH + 'icon-72.png'
    };
    
    if (event.data) {
        try {
            notificationData = { ...notificationData, ...event.data.json() };
        } catch (e) {
            notificationData.body = event.data.text();
        }
    }
    
    const options = {
        body: notificationData.body,
        icon: notificationData.icon,
        badge: notificationData.badge,
        vibrate: [200, 100, 200],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'open',
                title: 'App öffnen'
            },
            {
                action: 'close',
                title: 'Schließen'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(notificationData.title, options)
    );
});

// Notification Click Handler
self.addEventListener('notificationclick', event => {
    console.log('Service Worker: Notification clicked');
    
    event.notification.close();
    
    if (event.action === 'open' || !event.action) {
        event.waitUntil(
            clients.openWindow(BASE_PATH)
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
    event.preventDefault(); // Verhindert, dass der Fehler in der Konsole angezeigt wird
});

console.log('Service Worker: Script loaded - Version 1.3.0 for', BASE_PATH);