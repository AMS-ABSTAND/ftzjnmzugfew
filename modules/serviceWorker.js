// ===== Module: serviceWorker.js - Robuste Lösung =====
export class ServiceWorkerManager {
    constructor() {
        this.registration = null;
        this.isEnabled = false;
    }

    async register() {
        if (!('serviceWorker' in navigator)) {
            console.log('Service Worker wird von diesem Browser nicht unterstützt');
            return this.disableServiceWorker();
        }

        try {
            // Versuche externe sw.js zu laden
            console.log('Versuche Service Worker von /sw.js zu registrieren...');
            this.registration = await navigator.serviceWorker.register('/sw.js');
            console.log('✅ Service Worker erfolgreich registriert von /sw.js');
            this.isEnabled = true;
            this.setupUpdateListener();
            return;
        } catch (error) {
            console.log('❌ /sw.js nicht gefunden:', error.message);
        }

        // Fallback: Versuche mit relativer URL
        try {
            console.log('Versuche Service Worker von ./sw.js zu registrieren...');
            this.registration = await navigator.serviceWorker.register('./sw.js');
            console.log('✅ Service Worker erfolgreich registriert von ./sw.js');
            this.isEnabled = true;
            this.setupUpdateListener();
            return;
        } catch (error) {
            console.log('❌ ./sw.js nicht gefunden:', error.message);
        }

        // Alle Versuche fehlgeschlagen - Service Worker deaktivieren
        console.log('🔄 Service Worker deaktiviert - App läuft trotzdem normal');
        return this.disableServiceWorker();
    }

    setupUpdateListener() {
        if (!this.registration) return;

        this.registration.addEventListener('updatefound', () => {
            const newWorker = this.registration.installing;
            if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        this.showUpdateBanner();
                    }
                });
            }
        });

        // Prüfe alle 5 Minuten auf Updates (nicht jede Minute um Performance zu schonen)
        setInterval(() => {
            if (this.registration) {
                this.registration.update().catch(err => {
                    console.log('Update check failed:', err);
                });
            }
        }, 5 * 60 * 1000);
    }

    disableServiceWorker() {
        this.isEnabled = false;
        this.registration = null;
        
        // Verstecke alle Service Worker bezogenen UI Elemente
        this.hideServiceWorkerFeatures();
        
        // Simuliere erfolgreiche Registrierung für den Rest der App
        return Promise.resolve();
    }

    hideServiceWorkerFeatures() {
        // Verstecke Update Banner wenn vorhanden
        const updateBanner = document.getElementById('update-banner');
        if (updateBanner) {
            updateBanner.style.display = 'none';
        }

        // Verstecke Sync Button oder ändere sein Verhalten
        const syncButton = document.getElementById('sync-button');
        if (syncButton) {
            syncButton.title = 'Synchronisieren (Online only)';
        }
    }

    showUpdateBanner() {
        if (!this.isEnabled) return;
        
        const banner = document.getElementById('update-banner');
        if (banner) {
            banner.style.display = 'block';
        }
    }

    // Hilfsmethode um zu prüfen ob Service Worker aktiv ist
    isServiceWorkerEnabled() {
        return this.isEnabled;
    }

    // Hilfsmethode für andere Module
    async requestSync(tag = 'sync-treatments') {
        if (!this.isEnabled || !this.registration) {
            console.log('Service Worker nicht verfügbar - Sync wird übersprungen');
            return false;
        }

        try {
            if ('sync' in window.ServiceWorkerRegistration.prototype) {
                await this.registration.sync.register(tag);
                return true;
            } else {
                console.log('Background Sync nicht unterstützt');
                return false;
            }
        } catch (error) {
            console.log('Background Sync Registrierung fehlgeschlagen:', error);
            return false;
        }
    }
}