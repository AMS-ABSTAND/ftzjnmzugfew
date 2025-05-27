// ===== Module: serviceWorker.js - Fixed Version =====
export class ServiceWorkerManager {
    constructor() {
        this.registration = null;
    }

    async register() {
        if ('serviceWorker' in navigator) {
            try {
                // Use the actual sw.js file instead of blob URL
                this.registration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered successfully');

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
            }
        }
    }

    showUpdateBanner() {
        const banner = document.getElementById('update-banner');
        if (banner) {
            banner.style.display = 'block';
        }
    }
}