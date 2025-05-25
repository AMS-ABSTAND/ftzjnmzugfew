export class ServiceWorkerManager {
    constructor() {
        this.swUrl = '/sw.js';
        this.registration = null;
    }

    async register() {
        if ('serviceWorker' in navigator) {
            try {
                this.registration = await navigator.serviceWorker.register(this.swUrl);
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
}
