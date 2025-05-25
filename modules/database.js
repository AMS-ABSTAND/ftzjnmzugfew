// ===== Module: database.js =====
export class DatabaseManager {
    constructor() {
        this.dbName = 'SauenBehandlungDB';
        this.version = 1;
        this.db = null;
    }
    
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains('treatments')) {
                    const store = db.createObjectStore('treatments', { keyPath: 'id' });
                    store.createIndex('sauNumber', 'sauNumber', { unique: false });
                    store.createIndex('treatmentDate', 'treatmentDate', { unique: false });
                    store.createIndex('status', 'status', { unique: false });
                    store.createIndex('synced', 'synced', { unique: false });
                }
            };
        });
    }
    
    async addTreatment(treatment) {
        const transaction = this.db.transaction(['treatments'], 'readwrite');
        const store = transaction.objectStore('treatments');
        return store.add(treatment);
    }
    
    async updateTreatment(treatment) {
        const transaction = this.db.transaction(['treatments'], 'readwrite');
        const store = transaction.objectStore('treatments');
        return store.put(treatment);
    }
    
    async deleteTreatment(id) {
        const transaction = this.db.transaction(['treatments'], 'readwrite');
        const store = transaction.objectStore('treatments');
        return store.delete(id);
    }
    
    async getTreatmentById(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['treatments'], 'readonly');
            const store = transaction.objectStore('treatments');
            const request = store.get(id);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    async getAllTreatments() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['treatments'], 'readonly');
            const store = transaction.objectStore('treatments');
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    async getUnsyncedTreatments() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['treatments'], 'readonly');
            const store = transaction.objectStore('treatments');
            const index = store.index('synced');
            const request = index.getAll(false);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}