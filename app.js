// ===== Sauen Behandlung App - Main JavaScript =====

// Import modules
import { DatabaseManager } from './modules/database.js';
import { VirtualScroller } from './modules/virtualScroller.js';
import { AdvancedSearch } from './modules/search.js';
import { DataExporter } from './modules/exporter.js';
import { SyncManager } from './modules/sync.js';
import { ServiceWorkerManager } from './modules/serviceWorker.js';

// ===== Global Variables =====
let db;
let virtualScroller;
let advancedSearch;
let dataExporter;
let syncManager;
let isEditMode = false;
let editingId = null;

// ===== Template Definitions =====
const TEMPLATES = {
    'lahmheit-altsau': {
        tiertyp: 'Altsau',
        diagnosis: 'Lahmheit',
        medication: 'Procapen + Animeloxan',
        dosage: '15ml + 5ml',
        duration: '3',
        method: 'i.m.'
    },
    'lahmheit-jungsau': {
        tiertyp: 'Jungsau',
        diagnosis: 'Lahmheit',
        medication: 'Procapen + Animeloxan',
        dosage: '12ml + 5ml',
        duration: '3',
        method: 'i.m.'
    },
    'gelähmt-altsau': {
        tiertyp: 'Altsau',
        diagnosis: 'Gelähmt',
        medication: 'Dexatat',
        dosage: '10ml',
        duration: '2',
        method: 'i.m.'
    },
    'gelähmt-jungsau': {
        tiertyp: 'Jungsau',
        diagnosis: 'Gelähmt',
        medication: 'Dexatat',
        dosage: '10ml',
        duration: '2',
        method: 'i.m.'
    },
    'ferkel-woche1': {
        tiertyp: 'Ferkel',
        diagnosis: 'Lahmheit + liegt auf der Seite',
        medication: 'Vertimoxin + Dexatat',
        dosage: '0,6ml + 0,6ml',
        duration: '2',
        method: 'i.m.'
    },
    'ferkel-woche2': {
        tiertyp: 'Ferkel',
        diagnosis: 'Lahmheit + liegt auf der Seite',
        medication: 'Vertimoxin + Dexatat',
        dosage: '0,7ml + 0,7ml',
        duration: '2',
        method: 'i.m.'
    },
    'ferkel-woche3': {
        tiertyp: 'Ferkel',
        diagnosis: 'Lahmheit + liegt auf der Seite',
        medication: 'Vertimoxin + Dexatat',
        dosage: '0,8ml + 0,8ml',
        duration: '2',
        method: 'i.m.'
    },
    'ferkel-woche4': {
        tiertyp: 'Ferkel',
        diagnosis: 'Lahmheit + liegt auf der Seite',
        medication: 'Vertimoxin + Dexatat',
        dosage: '0,9ml + 0,9ml',
        duration: '2',
        method: 'i.m.'
    },
    'ferkel-woche5': {
        tiertyp: 'Ferkel',
        diagnosis: 'Lahmheit + liegt auf der Seite',
        medication: 'Vertimoxin + Dexatat',
        dosage: '1,0ml + 1,0ml',
        duration: '2',
        method: 'i.m.'
    },
    'ferkel-woche6': {
        tiertyp: 'Ferkel',
        diagnosis: 'Lahmheit + liegt auf der Seite',
        medication: 'Vertimoxin + Dexatat',
        dosage: '1,2ml + 1,2ml',
        duration: '2',
        method: 'i.m.'
    },
    'ferkel-woche7': {
        tiertyp: 'Ferkel',
        diagnosis: 'Lahmheit + liegt auf der Seite',
        medication: 'Vertimoxin + Dexatat',
        dosage: '1,4ml + 1,4ml',
        duration: '2',
        method: 'i.m.'
    }
};

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Initialize database
        db = new DatabaseManager();
        await db.init();
        
        // Initialize modules
        virtualScroller = new VirtualScroller(
            document.getElementById('treatment-list'),
            80,
            (item) => createTreatmentElement(item)
        );
        
        advancedSearch = new AdvancedSearch();
        dataExporter = new DataExporter();
        syncManager = new SyncManager();
        
        // Initialize service worker
        const swManager = new ServiceWorkerManager();
        await swManager.register();
        
        // Set up event listeners
        setupEventListeners();
        
        // Set today's date
        document.getElementById('treatmentDate').value = new Date().toISOString().split('T')[0];
        
        // Load initial data
        await loadTreatments();
        
        // Hide loading screen
        hideLoadingScreen();
        
        // Check for offline/online status
        updateOnlineStatus();
        
    } catch (error) {
        console.error('Initialization error:', error);
        alert('Fehler beim Laden der App. Bitte neu laden.');
    }
});

// ===== Event Listeners Setup =====
function setupEventListeners() {
    // Form submission
    document.getElementById('treatment-form').addEventListener('submit', handleFormSubmit);
    
    // Template selection
    document.getElementById('template-select').addEventListener('change', applyTemplate);
    
    // Template buttons
    document.querySelectorAll('.template-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const templateId = e.target.dataset.template;
            showTemplateCard(templateId);
        });
    });
    
    // Close template cards
    document.querySelectorAll('.close-template').forEach(btn => {
        btn.addEventListener('click', hideTemplateCards);
    });
    
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const tabId = e.currentTarget.dataset.tab;
            showTab(tabId);
        });
    });
    
    // FAB button
    document.getElementById('fab').addEventListener('click', newTreatment);
    
    // Edit mode buttons
    document.getElementById('cancel-edit').addEventListener('click', cancelEdit);
    document.getElementById('delete-treatment').addEventListener('click', deleteTreatment);
    document.getElementById('clear-form').addEventListener('click', clearForm);
    
    // Export buttons
    document.getElementById('export-csv').addEventListener('click', exportToCSV);
    document.getElementById('export-json').addEventListener('click', exportToJSON);
    
    // Search functionality
    document.getElementById('search-button').addEventListener('click', performSearch);
    document.getElementById('reset-filters').addEventListener('click', resetFilters);
    document.getElementById('searchInput').addEventListener('keyup', (e) => {
        if (e.key === 'Enter') performSearch();
    });
    
    // Sync button
    document.getElementById('sync-button').addEventListener('click', syncData);
    
    // Update app button
    document.getElementById('update-app').addEventListener('click', () => {
        window.location.reload();
    });
    
    // Online/offline events
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    // Pull to refresh
    setupPullToRefresh();
}

// ===== Form Handling =====
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const treatment = {
        id: isEditMode ? editingId : Date.now(),
        tiertyp: document.getElementById('tiertyp').value,
        sauNumber: document.getElementById('sauNumber').value,
        treatmentDate: document.getElementById('treatmentDate').value,
        diagnosis: document.getElementById('diagnosis').value,
        medication: document.getElementById('medication').value,
        dosage: document.getElementById('dosage').value,
        administrationMethod: document.getElementById('administrationMethod').value,
        person: document.getElementById('person').value,
        duration: document.getElementById('treatment-duration').value,
        waitingPeriod: document.getElementById('waitingPeriod').value,
        status: document.getElementById('status').value,
        notes: document.getElementById('notes').value,
        parentId: document.getElementById('parent-id').value || null,
        history: [],
        synced: false,
        lastModified: new Date().toISOString()
    };
    
    try {
        if (isEditMode) {
            // Update existing treatment
            const oldTreatment = await db.getTreatmentById(editingId);
            if (oldTreatment) {
                treatment.history = oldTreatment.history || [];
                treatment.history.push({
                    date: new Date().toISOString(),
                    action: 'Behandlung aktualisiert',
                    oldStatus: oldTreatment.status,
                    newStatus: treatment.status
                });
            }
            await db.updateTreatment(treatment);
        } else {
            // Create new treatment
            treatment.history.push({
                date: new Date().toISOString(),
                action: 'Behandlung erstellt',
                status: treatment.status
            });
            await db.addTreatment(treatment);
        }
        
        showNotification(isEditMode ? 'Behandlung aktualisiert!' : 'Behandlung gespeichert!');
        
        clearForm();
        showTab('tab-list');
        
        // Trigger sync if online
        if (navigator.onLine) {
            syncData();
        }
        
    } catch (error) {
        console.error('Error saving treatment:', error);
        alert('Fehler beim Speichern der Behandlung.');
    }
}

// ===== Template Handling =====
function applyTemplate() {
    const templateId = document.getElementById('template-select').value;
    if (templateId && TEMPLATES[templateId]) {
        const template = TEMPLATES[templateId];
        document.getElementById('tiertyp').value = template.tiertyp;
        document.getElementById('diagnosis').value = template.diagnosis;
        document.getElementById('medication').value = template.medication;
        document.getElementById('dosage').value = template.dosage;
        document.getElementById('treatment-duration').value = template.duration;
        document.getElementById('administrationMethod').value = template.method;
    }
}

function showTemplateCard(templateId) {
    hideTemplateCards();
    const card = document.getElementById(`template-${templateId}`);
    if (card) {
        card.style.display = 'block';
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function hideTemplateCards() {
    document.querySelectorAll('.template-card').forEach(card => {
        card.style.display = 'none';
    });
}

// ===== Tab Navigation =====
function showTab(tabId) {
    // Hide all tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Deactivate all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabId).classList.add('active');
    
    // Activate corresponding nav item
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    
    // Load data if list tab
    if (tabId === 'tab-list') {
        loadTreatments();
    }
}

// ===== Treatment Management =====
async function loadTreatments() {
    try {
        const treatments = await db.getAllTreatments();
        
        // Update statistics
        updateStatistics(treatments);
        
        // Sort by date (newest first)
        treatments.sort((a, b) => new Date(b.treatmentDate) - new Date(a.treatmentDate));
        
        // Update virtual scroller
        virtualScroller.setItems(treatments);
        
    } catch (error) {
        console.error('Error loading treatments:', error);
    }
}

function createTreatmentElement(treatment) {
    const item = document.createElement('div');
    item.className = 'treatment-item';
    item.dataset.id = treatment.id;
    
    // Determine status class
    let statusClass = 'status-active';
    if (treatment.status === 'Abgeschlossen' || treatment.status === 'Genesen') {
        statusClass = 'status-completed';
    } else if (treatment.status === 'Nachbehandlung nötig') {
        statusClass = 'status-follow-up';
    }
    
    // Calculate waiting period
    let waitingInfo = '';
    if (treatment.waitingPeriod && treatment.treatmentDate) {
        const endDate = new Date(treatment.treatmentDate);
        endDate.setDate(endDate.getDate() + parseInt(treatment.waitingPeriod));
        const today = new Date();
        const daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
        
        if (daysRemaining > 0) {
            waitingInfo = `<div style="color: var(--danger-color); font-size: var(--font-size-xs); margin-top: var(--spacing-xs);">⚠️ Wartezeit: noch ${daysRemaining} Tag(e)</div>`;
        }
    }
    
    item.innerHTML = `
        <div class="treatment-header">
            <span class="sau-number">${treatment.sauNumber}</span>
            <span class="status-badge ${statusClass}">${treatment.status}</span>
        </div>
        <div class="treatment-date">${new Date(treatment.treatmentDate).toLocaleDateString('de-DE')}</div>
        <div class="treatment-details">
            <strong>${treatment.tiertyp}:</strong> ${treatment.diagnosis}<br>
            <strong>Behandlung:</strong> ${treatment.medication} ${treatment.dosage ? `(${treatment.dosage})` : ''}<br>
            ${treatment.person ? `<strong>Behandler:</strong> ${treatment.person}<br>` : ''}
            ${treatment.notes ? `<strong>Notizen:</strong> ${treatment.notes}<br>` : ''}
        </div>
        ${waitingInfo}
        
        <div class="action-buttons">
            <button class="action-btn edit-btn" onclick="editTreatment(${treatment.id})">Bearbeiten</button>
            ${treatment.status !== 'Abgeschlossen' && treatment.status !== 'Genesen' ? 
                `<button class="action-btn follow-up-btn" onclick="createFollowUp(${treatment.id})">Nachbehandlung</button>` : ''}
            ${treatment.status === 'In Behandlung' ? 
                `<button class="action-btn complete-btn" onclick="changeStatus(${treatment.id}, 'Abgeschlossen')">Abschließen</button>` : ''}
        </div>
        
        ${treatment.history && treatment.history.length > 1 ? createHistoryHTML(treatment.history) : ''}
    `;
    
    return item;
}

function createHistoryHTML(history) {
    let html = '<div class="history-card"><div class="history-title">Verlauf:</div>';
    
    history.slice(-3).reverse().forEach(entry => {
        const date = new Date(entry.date).toLocaleString('de-DE');
        html += `<div class="history-item">${date}: ${entry.action}</div>`;
    });
    
    html += '</div>';
    return html;
}

// ===== Edit Treatment =====
window.editTreatment = async function(id) {
    try {
        const treatment = await db.getTreatmentById(id);
        
        if (treatment) {
            isEditMode = true;
            editingId = id;
            
            // Fill form
            document.getElementById('treatment-id').value = treatment.id;
            document.getElementById('tiertyp').value = treatment.tiertyp || 'Altsau';
            document.getElementById('sauNumber').value = treatment.sauNumber;
            document.getElementById('treatmentDate').value = treatment.treatmentDate;
            document.getElementById('diagnosis').value = treatment.diagnosis;
            document.getElementById('medication').value = treatment.medication;
            document.getElementById('dosage').value = treatment.dosage || '';
            document.getElementById('administrationMethod').value = treatment.administrationMethod || 'i.m.';
            document.getElementById('person').value = treatment.person || '';
            document.getElementById('treatment-duration').value = treatment.duration || '';
            document.getElementById('waitingPeriod').value = treatment.waitingPeriod || '';
            document.getElementById('status').value = treatment.status;
            document.getElementById('notes').value = treatment.notes || '';
            document.getElementById('parent-id').value = treatment.parentId || '';
            
            // Update UI
            document.getElementById('form-title').textContent = 'Behandlung bearbeiten';
            document.getElementById('save-btn').textContent = 'Änderungen speichern';
            document.getElementById('edit-buttons').style.display = 'block';
            document.getElementById('new-buttons').style.display = 'none';
            
            showTab('tab-form');
        }
    } catch (error) {
        console.error('Error loading treatment for edit:', error);
    }
};

// ===== Delete Treatment =====
async function deleteTreatment() {
    if (confirm('Möchten Sie diese Behandlung wirklich löschen?')) {
        try {
            await db.deleteTreatment(editingId);
            showNotification('Behandlung gelöscht!');
            clearForm();
            showTab('tab-list');
        } catch (error) {
            console.error('Error deleting treatment:', error);
            alert('Fehler beim Löschen der Behandlung.');
        }
    }
}

// ===== Follow-up Treatment =====
window.createFollowUp = async function(parentId) {
    try {
        const parentTreatment = await db.getTreatmentById(parentId);
        
        if (parentTreatment) {
            clearForm();
            
            // Pre-fill form with parent data
            document.getElementById('parent-id').value = parentId;
            document.getElementById('tiertyp').value = parentTreatment.tiertyp;
            document.getElementById('sauNumber').value = parentTreatment.sauNumber;
            document.getElementById('diagnosis').value = `Nachbehandlung: ${parentTreatment.diagnosis}`;
            
            document.getElementById('form-title').textContent = 'Nachbehandlung erfassen';
            
            showTab('tab-form');
        }
    } catch (error) {
        console.error('Error creating follow-up:', error);
    }
};

// ===== Change Status =====
window.changeStatus = async function(id, newStatus) {
    try {
        const treatment = await db.getTreatmentById(id);
        
        if (treatment) {
            const oldStatus = treatment.status;
            treatment.status = newStatus;
            treatment.lastModified = new Date().toISOString();
            treatment.synced = false;
            
            // Update history
            treatment.history = treatment.history || [];
            treatment.history.push({
                date: new Date().toISOString(),
                action: 'Status geändert',
                oldStatus: oldStatus,
                newStatus: newStatus
            });
            
            await db.updateTreatment(treatment);
            await loadTreatments();
            showNotification('Status aktualisiert!');
        }
    } catch (error) {
        console.error('Error changing status:', error);
    }
};

// ===== Form Utilities =====
function clearForm() {
    isEditMode = false;
    editingId = null;
    
    document.getElementById('treatment-form').reset();
    document.getElementById('treatment-id').value = '';
    document.getElementById('parent-id').value = '';
    document.getElementById('template-select').value = '';
    document.getElementById('treatmentDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('status').value = 'In Behandlung';
    
    // Reset UI
    document.getElementById('form-title').textContent = 'Neue Behandlung erfassen';
    document.getElementById('save-btn').textContent = 'Behandlung speichern';
    document.getElementById('edit-buttons').style.display = 'none';
    document.getElementById('new-buttons').style.display = 'block';
    
    hideTemplateCards();
}

function cancelEdit() {
    clearForm();
    showTab('tab-list');
}

function newTreatment() {
    clearForm();
    showTab('tab-form');
}

// ===== Statistics =====
function updateStatistics(treatments) {
    const today = new Date().toDateString();
    
    // Active treatments
    const activeCount = treatments.filter(t => 
        t.status === 'In Behandlung' || t.status === 'Nachbehandlung nötig'
    ).length;
    
    // Today's treatments
    const todayCount = treatments.filter(t => 
        new Date(t.treatmentDate).toDateString() === today
    ).length;
    
    // Total treatments
    const totalCount = treatments.length;
    
    document.getElementById('active-count').textContent = activeCount;
    document.getElementById('today-count').textContent = todayCount;
    document.getElementById('total-count').textContent = totalCount;
}

// ===== Search Functionality =====
async function performSearch() {
    try {
        const searchTerm = document.getElementById('searchInput').value;
        const treatments = await db.getAllTreatments();
        
        // Get filter values
        advancedSearch.filters.dateRange.start = document.getElementById('filter-date-start').value;
        advancedSearch.filters.dateRange.end = document.getElementById('filter-date-end').value;
        
        advancedSearch.filters.status = Array.from(
            document.querySelectorAll('.filter-status:checked')
        ).map(cb => cb.value);
        
        advancedSearch.filters.tiertyp = Array.from(
            document.querySelectorAll('.filter-tiertyp:checked')
        ).map(cb => cb.value);
        
        // Perform search
        const results = advancedSearch.search(treatments, searchTerm);
        
        // Display results
        const resultsContainer = document.getElementById('search-results');
        resultsContainer.innerHTML = '';
        
        if (results.length === 0) {
            resultsContainer.innerHTML = '<div class="card"><p style="text-align: center; color: var(--gray-500);">Keine Ergebnisse gefunden</p></div>';
            return;
        }
        
        results.forEach(treatment => {
            const element = createTreatmentElement(treatment);
            resultsContainer.appendChild(element);
        });
        
    } catch (error) {
        console.error('Error performing search:', error);
    }
}

function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('filter-date-start').value = '';
    document.getElementById('filter-date-end').value = '';
    
    document.querySelectorAll('.filter-status, .filter-tiertyp').forEach(cb => {
        cb.checked = false;
    });
    
    document.getElementById('search-results').innerHTML = '';
}

// ===== Export Functions =====
async function exportToCSV() {
    try {
        const treatments = await db.getAllTreatments();
        dataExporter.exportToCSV(treatments);
    } catch (error) {
        console.error('Error exporting to CSV:', error);
        alert('Fehler beim Exportieren.');
    }
}

async function exportToJSON() {
    try {
        const treatments = await db.getAllTreatments();
        dataExporter.exportToJSON(treatments);
    } catch (error) {
        console.error('Error exporting to JSON:', error);
        alert('Fehler beim Exportieren.');
    }
}

// ===== Sync Functions =====
async function syncData() {
    if (!navigator.onLine) {
        showNotification('Keine Internetverbindung', 'error');
        return;
    }
    
    const syncStatus = document.getElementById('sync-status');
    syncStatus.classList.add('visible');
    
    try {
        await syncManager.syncData();
        syncStatus.classList.remove('visible');
        showNotification('Synchronisation erfolgreich!', 'success');
        await loadTreatments();
    } catch (error) {
        console.error('Sync error:', error);
        syncStatus.classList.remove('visible');
        showNotification('Synchronisation fehlgeschlagen', 'error');
    }
}

// ===== Utility Functions =====
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        background-color: ${type === 'error' ? 'var(--danger-color)' : 
                           type === 'success' ? 'var(--success-color)' : 
                           'var(--gray-800)'};
        color: white;
        padding: var(--spacing-md);
        border-radius: var(--border-radius);
        z-index: 1000;
        animation: slideDown 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideUp 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    loadingScreen.classList.add('hidden');
    setTimeout(() => {
        loadingScreen.style.display = 'none';
    }, 300);
}

function updateOnlineStatus() {
    const indicator = document.getElementById('offline-indicator');
    if (navigator.onLine) {
        indicator.style.display = 'none';
    } else {
        indicator.style.display = 'block';
    }
}

// ===== Pull to Refresh =====
function setupPullToRefresh() {
    let startY = 0;
    let isPulling = false;
    const pullElement = document.getElementById('pull-to-refresh');
    
    document.addEventListener('touchstart', (e) => {
        if (window.scrollY === 0) {
            startY = e.touches[0].clientY;
            isPulling = true;
        }
    });
    
    document.addEventListener('touchmove', (e) => {
        if (!isPulling) return;
        
        const y = e.touches[0].clientY;
        const diff = y - startY;
        
        if (diff > 50 && window.scrollY === 0) {
            pullElement.classList.add('visible');
            if (diff > 100) {
                pullElement.classList.add('refreshing');
            }
        }
    });
    
    document.addEventListener('touchend', () => {
        if (pullElement.classList.contains('refreshing')) {
            window.location.reload();
        }
        pullElement.classList.remove('visible', 'refreshing');
        isPulling = false;
    });
}



