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
// let virtualScroller; // Entfernt - normales Rendering verwenden
let advancedSearch;
let dataExporter;
let syncManager;
let isEditMode = false;
let editingId = null;
let isFollowUpMode = false;
let followUpParentId = null;

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
        
        // Initialize modules - Vereinfacht ohne Virtual Scroller
        // virtualScroller = new VirtualScroller(
        //     document.getElementById('treatment-list'),
        //     100, // Erhöhte Item-Höhe für besseres Scrolling
        //     (item) => createTreatmentElement(item)
        // );
        
        advancedSearch = new AdvancedSearch();
        dataExporter = new DataExporter();
        syncManager = new SyncManager();
        
        // Enhance virtual scroller for better mobile experience
        // enhanceVirtualScroller(); // Entfernt - verursachte Scroll-Probleme
        
        // Initialize service worker (graceful fallback if it fails)
        const swManager = new ServiceWorkerManager();
        window.swManager = swManager; // Global verfügbar machen
        try {
            await swManager.register();
            
            // Show debug button if service worker is enabled
            if (swManager.isServiceWorkerEnabled()) {
                document.getElementById('debug-button').style.display = 'block';
            }
            
            // Listen for service worker messages
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.addEventListener('message', (event) => {
                    if (event.data && event.data.type === 'SYNC_COMPLETE') {
                        if (event.data.success) {
                            showNotification('Synchronisation im Hintergrund erfolgreich!', 'success');
                        } else {
                            console.log('Background sync failed:', event.data.error);
                        }
                    }
                });
            }
        } catch (error) {
            console.log('Service Worker initialization failed, but app continues normally:', error);
        }
        
        // Set up event listeners
        setupEventListeners();
        
        // Initialize pull-to-refresh (mit Einstellungen)
        const pullToRefreshEnabled = localStorage.getItem('pullToRefreshEnabled') !== 'false';
        if (pullToRefreshEnabled) {
            setupPullToRefresh();
            console.log('🔄 Pull-to-Refresh aktiviert (sehr konservativ) - 5x FAB zum Deaktivieren');
        } else {
            console.log('❌ Pull-to-Refresh deaktiviert - 5x FAB zum Aktivieren');
            // Verstecke Pull-to-Refresh Element
            const pullElement = document.getElementById('pull-to-refresh');
            if (pullElement) {
                pullElement.style.display = 'none';
            }
        }
        
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
    
    // Debug button
    document.getElementById('debug-button').addEventListener('click', openDebugPage);
    
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
    
    const newTreatmentData = {
        date: document.getElementById('treatmentDate').value,
        diagnosis: document.getElementById('diagnosis').value,
        medication: document.getElementById('medication').value,
        dosage: document.getElementById('dosage').value,
        administrationMethod: document.getElementById('administrationMethod').value,
        person: document.getElementById('person').value,
        duration: document.getElementById('treatment-duration').value,
        waitingPeriod: document.getElementById('waitingPeriod').value,
        notes: document.getElementById('notes').value
    };
    
    try {
        if (isFollowUpMode && followUpParentId) {
            // Add follow-up treatment to existing record
            await addFollowUpTreatment(followUpParentId, newTreatmentData);
            showNotification('Nachbehandlung hinzugefügt!');
        } else if (isEditMode) {
            // Update existing treatment
            const treatment = await db.getTreatmentById(editingId);
            if (treatment) {
                // Update the main treatment data
                treatment.tiertyp = document.getElementById('tiertyp').value;
                treatment.sauNumber = document.getElementById('sauNumber').value;
                treatment.status = document.getElementById('status').value;
                treatment.lastModified = new Date().toISOString();
                treatment.synced = false;
                
                // Update the primary treatment in the treatments array
                if (treatment.treatments && treatment.treatments.length > 0) {
                    treatment.treatments[0] = { ...treatment.treatments[0], ...newTreatmentData };
                } else {
                    // Backwards compatibility
                    Object.assign(treatment, newTreatmentData);
                }
                
                // Update history
                treatment.history = treatment.history || [];
                treatment.history.push({
                    date: new Date().toISOString(),
                    action: 'Behandlung aktualisiert',
                    status: treatment.status
                });
                
                await db.updateTreatment(treatment);
                showNotification('Behandlung aktualisiert!');
            }
        } else {
            // Create new treatment record
            const treatment = {
                id: Date.now(),
                tiertyp: document.getElementById('tiertyp').value,
                sauNumber: document.getElementById('sauNumber').value,
                status: document.getElementById('status').value,
                treatments: [newTreatmentData], // Array of treatments
                history: [{
                    date: new Date().toISOString(),
                    action: 'Behandlung erstellt',
                    status: document.getElementById('status').value
                }],
                synced: false,
                lastModified: new Date().toISOString()
            };
            
            await db.addTreatment(treatment);
            showNotification('Behandlung gespeichert!');
        }
        
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

// ===== Follow-up Treatment =====
async function addFollowUpTreatment(parentId, treatmentData) {
    const parentTreatment = await db.getTreatmentById(parentId);
    
    if (parentTreatment) {
        // Initialize treatments array if it doesn't exist (backwards compatibility)
        if (!parentTreatment.treatments) {
            parentTreatment.treatments = [{
                date: parentTreatment.treatmentDate || parentTreatment.date,
                diagnosis: parentTreatment.diagnosis,
                medication: parentTreatment.medication,
                dosage: parentTreatment.dosage,
                administrationMethod: parentTreatment.administrationMethod,
                person: parentTreatment.person,
                duration: parentTreatment.duration,
                waitingPeriod: parentTreatment.waitingPeriod,
                notes: parentTreatment.notes
            }];
        }
        
        // Add new treatment to the array
        parentTreatment.treatments.push(treatmentData);
        
        // Update main record
        parentTreatment.status = 'In Behandlung'; // Reset status for follow-up
        parentTreatment.lastModified = new Date().toISOString();
        parentTreatment.synced = false;
        
        // Add to history
        parentTreatment.history = parentTreatment.history || [];
        parentTreatment.history.push({
            date: new Date().toISOString(),
            action: 'Nachbehandlung hinzugefügt',
            medication: treatmentData.medication,
            diagnosis: treatmentData.diagnosis
        });
        
        await db.updateTreatment(parentTreatment);
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
        setTimeout(() => {
            loadTreatments();
        }, 100); // Kleine Verzögerung für bessere Performance
    }
}

// ===== Treatment Management - Vereinfachtes Rendering =====
async function loadTreatments() {
    try {
        const treatments = await db.getAllTreatments();
        
        // Update statistics
        updateStatistics(treatments);
        
        // Sort by last modified date (newest first)
        treatments.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
        
        // Direct rendering instead of virtual scroller
        const listContainer = document.getElementById('treatment-list');
        listContainer.innerHTML = ''; // Clear existing content
        
        if (treatments.length === 0) {
            listContainer.innerHTML = `
                <div style="text-align: center; padding: var(--spacing-xl); color: var(--gray-500);">
                    <h3>🐷 Keine Behandlungen vorhanden</h3>
                    <p>Klicken Sie auf + um eine neue Behandlung zu erfassen.</p>
                </div>
            `;
            return;
        }
        
        // Render all treatments directly
        treatments.forEach(treatment => {
            const element = createTreatmentElement(treatment);
            listContainer.appendChild(element);
        });
        
        console.log(`✅ ${treatments.length} Behandlungen geladen`);
        
    } catch (error) {
        console.error('Error loading treatments:', error);
        const listContainer = document.getElementById('treatment-list');
        listContainer.innerHTML = `
            <div style="text-align: center; padding: var(--spacing-xl); color: var(--danger-color);">
                <h3>❌ Fehler beim Laden</h3>
                <p>Bitte versuchen Sie es erneut.</p>
            </div>
        `;
    }
}

// Ersetzen Sie die createTreatmentElement Funktion in app.js mit dieser verbesserten Version:

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
    
    // Get treatment data (support both new and old format)
    const treatments = treatment.treatments || [{
        date: treatment.treatmentDate || treatment.date,
        diagnosis: treatment.diagnosis,
        medication: treatment.medication,
        dosage: treatment.dosage,
        administrationMethod: treatment.administrationMethod,
        person: treatment.person,
        duration: treatment.duration,
        waitingPeriod: treatment.waitingPeriod,
        notes: treatment.notes
    }];
    
    const latestTreatment = treatments[treatments.length - 1];
    const firstTreatment = treatments[0];
    
    // Calculate waiting period from latest treatment
    let waitingInfo = '';
    if (latestTreatment.waitingPeriod && latestTreatment.date) {
        const endDate = new Date(latestTreatment.date);
        endDate.setDate(endDate.getDate() + parseInt(latestTreatment.waitingPeriod));
        const today = new Date();
        const daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
        
        if (daysRemaining > 0) {
            waitingInfo = `<div class="waiting-warning">⚠️ Wartezeit: noch ${daysRemaining} Tag(e)</div>`;
        }
    }
    
    // Create treatments display
    let treatmentsDisplay = '';
    treatments.forEach((t, index) => {
        const isLatest = index === treatments.length - 1;
        const treatmentClass = isLatest ? 'current-treatment' : 'previous-treatment';
        
        treatmentsDisplay += `
            <div class="${treatmentClass}">
                <div class="treatment-date">
                    ${index === 0 ? 'Erstbehandlung' : `Nachbehandlung ${index}`} - ${new Date(t.date).toLocaleDateString('de-DE')}
                </div>
                <div class="diagnosis">${t.diagnosis}</div>
                <div class="medication"><strong>Behandlung:</strong> ${t.medication} ${t.dosage ? `(${t.dosage})` : ''}</div>
                ${createAdditionalInfo(t)}
            </div>
        `;
    });
    
    // Summary text for multiple treatments
    const summaryText = treatments.length > 1 
        ? `Mehrfachbehandlung • ${treatments.length} Behandlungen`
        : `Einzelbehandlung • ${new Date(latestTreatment.date).toLocaleDateString('de-DE')}`;
    
    item.innerHTML = `
        <div class="treatment-header">
            <div class="treatment-header-left">
                <div class="pig-icon">🐷</div>
                <div class="treatment-title">
                    <div class="sau-number">${treatment.sauNumber}</div>
                    <div class="tiertyp-info">${treatment.tiertyp} - ${treatments.length} Behandlung${treatments.length > 1 ? 'en' : ''}</div>
                </div>
            </div>
            <div class="status-badge ${statusClass}">${treatment.status}</div>
        </div>
        
        <div class="treatment-content">
            <div class="treatment-summary">${summaryText}</div>
            
            <div class="treatment-details">
                ${treatmentsDisplay}
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
        </div>
    `;
    
    return item;
}

// Neue Hilfsfunktion für zusätzliche Informationen
function createAdditionalInfo(treatment) {
    const items = [];
    
    if (treatment.person) {
        items.push(`<div class="info-item"><div class="info-label">Behandler</div><div class="info-value">${treatment.person}</div></div>`);
    }
    
    if (treatment.duration) {
        items.push(`<div class="info-item"><div class="info-label">Dauer</div><div class="info-value">${treatment.duration} Tage</div></div>`);
    }
    
    if (treatment.administrationMethod) {
        items.push(`<div class="info-item"><div class="info-label">Verabreichung</div><div class="info-value">${treatment.administrationMethod}</div></div>`);
    }
    
    if (treatment.notes) {
        items.push(`<div class="info-item"><div class="info-label">Notizen</div><div class="info-value">${treatment.notes}</div></div>`);
    }
    
    if (items.length > 0) {
        return `<div class="additional-info">${items.join('')}</div>`;
    }
    
    return '';
}

// Verbesserte History HTML-Funktion
function createHistoryHTML(history) {
    let html = '<div class="history-card"><div class="history-title">Verlauf</div><div class="history-timeline">';
    
    history.slice(-3).reverse().forEach(entry => {
        const date = new Date(entry.date).toLocaleString('de-DE');
        html += `<div class="history-item">${date}: ${entry.action}</div>`;
    });
    
    html += '</div></div>';
    return html;
}



// ===== Edit Treatment =====
window.editTreatment = async function(id) {
    try {
        const treatment = await db.getTreatmentById(id);
        
        if (treatment) {
            isEditMode = true;
            editingId = id;
            isFollowUpMode = false;
            followUpParentId = null;
            
            // Get the latest treatment data
            const latestTreatment = treatment.treatments && treatment.treatments.length > 0 
                ? treatment.treatments[treatment.treatments.length - 1]
                : treatment; // Backwards compatibility
            
            // Fill form
            document.getElementById('treatment-id').value = treatment.id;
            document.getElementById('tiertyp').value = treatment.tiertyp || 'Altsau';
            document.getElementById('sauNumber').value = treatment.sauNumber;
            document.getElementById('treatmentDate').value = latestTreatment.date || latestTreatment.treatmentDate;
            document.getElementById('diagnosis').value = latestTreatment.diagnosis;
            document.getElementById('medication').value = latestTreatment.medication;
            document.getElementById('dosage').value = latestTreatment.dosage || '';
            document.getElementById('administrationMethod').value = latestTreatment.administrationMethod || 'i.m.';
            document.getElementById('person').value = latestTreatment.person || '';
            document.getElementById('treatment-duration').value = latestTreatment.duration || '';
            document.getElementById('waitingPeriod').value = latestTreatment.waitingPeriod || '';
            document.getElementById('status').value = treatment.status;
            document.getElementById('notes').value = latestTreatment.notes || '';
            
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
            
            // Set follow-up mode
            isFollowUpMode = true;
            followUpParentId = parentId;
            
            // Pre-fill form with parent data
            document.getElementById('tiertyp').value = parentTreatment.tiertyp;
            document.getElementById('sauNumber').value = parentTreatment.sauNumber;
            
            // Get original diagnosis for reference
            const originalDiagnosis = parentTreatment.treatments && parentTreatment.treatments.length > 0 
                ? parentTreatment.treatments[0].diagnosis 
                : parentTreatment.diagnosis;
            
            document.getElementById('diagnosis').value = `Nachbehandlung: ${originalDiagnosis}`;
            
            document.getElementById('form-title').textContent = `Nachbehandlung für ${parentTreatment.sauNumber}`;
            document.getElementById('save-btn').textContent = 'Nachbehandlung hinzufügen';
            
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
    isFollowUpMode = false;
    followUpParentId = null;
    
    document.getElementById('treatment-form').reset();
    document.getElementById('treatment-id').value = '';
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
    
    // Today's treatments (check all treatment dates)
    const todayCount = treatments.filter(t => {
        if (t.treatments && t.treatments.length > 0) {
            return t.treatments.some(treatment => 
                new Date(treatment.date).toDateString() === today
            );
        }
        return new Date(t.treatmentDate || t.date).toDateString() === today;
    }).length;
    
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

// ===== Debug Functions =====
function openDebugPage() {
    // Versuche zuerst externe Debug-Seite zu öffnen
    const debugUrl = './sw-status.html';
    
    // Prüfe ob die Seite existiert
    fetch(debugUrl, { method: 'HEAD' })
        .then(response => {
            if (response.ok) {
                window.open(debugUrl, '_blank');
            } else {
                // Fallback: Zeige Debug-Modal
                showDebugModal();
            }
        })
        .catch(() => {
            // Fallback: Zeige Debug-Modal  
            showDebugModal();
        });
}

function showDebugModal() {
    // Erstelle Modal
    const modal = document.createElement('div');
    modal.className = 'debug-modal';
    modal.innerHTML = `
        <div class="debug-modal-content">
            <div class="debug-modal-header">
                <h3>🔧 Service Worker Debug</h3>
                <button class="debug-modal-close">&times;</button>
            </div>
            <div class="debug-modal-body">
                <div class="debug-section">
                    <h4>Browser Support</h4>
                    <div id="debug-support">Prüfe...</div>
                </div>
                <div class="debug-section">
                    <h4>Registration Status</h4>
                    <div id="debug-registration">Prüfe...</div>
                </div>
                <div class="debug-section">
                    <h4>Cache Status</h4>
                    <div id="debug-cache">Prüfe...</div>
                </div>
                <div class="debug-section">
                    <h4>Aktionen</h4>
                    <button class="btn btn-secondary" onclick="clearAllCaches()">Caches löschen</button>
                    <button class="btn btn-secondary" onclick="updateServiceWorker()">SW aktualisieren</button>
                    <button class="btn btn-secondary" onclick="togglePullToRefresh()">Pull-to-Refresh umschalten</button>
                </div>
            </div>
        </div>
    `;
    
    // Styles für Modal
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0,0,0,0.5);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: var(--spacing-md);
    `;
    
    const content = modal.querySelector('.debug-modal-content');
    content.style.cssText = `
        background: white;
        border-radius: var(--border-radius);
        max-width: 600px;
        width: 100%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: var(--shadow-lg);
    `;
    
    const header = modal.querySelector('.debug-modal-header');
    header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--spacing-md);
        border-bottom: 1px solid var(--gray-200);
    `;
    
    const body = modal.querySelector('.debug-modal-body');
    body.style.cssText = `
        padding: var(--spacing-md);
    `;
    
    const sections = modal.querySelectorAll('.debug-section');
    sections.forEach(section => {
        section.style.cssText = `
            margin-bottom: var(--spacing-md);
            padding: var(--spacing-sm);
            background: var(--gray-100);
            border-radius: var(--border-radius-sm);
        `;
    });
    
    const closeBtn = modal.querySelector('.debug-modal-close');
    closeBtn.style.cssText = `
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: var(--gray-500);
    `;
    
    // Event Listeners
    closeBtn.onclick = () => modal.remove();
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
    
    document.body.appendChild(modal);
    
    // Debug-Informationen laden
    loadDebugInfo();
}

async function loadDebugInfo() {
    // Browser Support
    const supportDiv = document.getElementById('debug-support');
    if ('serviceWorker' in navigator) {
        supportDiv.innerHTML = '✅ Service Worker unterstützt';
        supportDiv.style.color = 'var(--success-color)';
    } else {
        supportDiv.innerHTML = '❌ Service Worker nicht unterstützt';
        supportDiv.style.color = 'var(--danger-color)';
        return;
    }
    
    // Registration Status
    const regDiv = document.getElementById('debug-registration');
    try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
            const state = registration.active ? registration.active.state : 'unknown';
            regDiv.innerHTML = `✅ Service Worker aktiv (${state})`;
            regDiv.style.color = 'var(--success-color)';
        } else {
            regDiv.innerHTML = '⚠️ Kein Service Worker registriert';
            regDiv.style.color = 'var(--warning-color)';
        }
    } catch (error) {
        regDiv.innerHTML = `❌ Fehler: ${error.message}`;
        regDiv.style.color = 'var(--danger-color)';
    }
    
    // Cache Status
    const cacheDiv = document.getElementById('debug-cache');
    try {
        const cacheNames = await caches.keys();
        if (cacheNames.length > 0) {
            let totalFiles = 0;
            for (const cacheName of cacheNames) {
                const cache = await caches.open(cacheName);
                const requests = await cache.keys();
                totalFiles += requests.length;
            }
            cacheDiv.innerHTML = `✅ ${cacheNames.length} Cache(s), ${totalFiles} Dateien`;
            cacheDiv.style.color = 'var(--success-color)';
        } else {
            cacheDiv.innerHTML = '⚠️ Keine Caches gefunden';
            cacheDiv.style.color = 'var(--warning-color)';
        }
    } catch (error) {
        cacheDiv.innerHTML = `❌ Cache Fehler: ${error.message}`;
        cacheDiv.style.color = 'var(--danger-color)';
    }
    
    // Pull-to-Refresh Status hinzufügen
    const pullToRefreshEnabled = localStorage.getItem('pullToRefreshEnabled') !== 'false';
    const statusText = pullToRefreshEnabled ? '✅ Pull-to-Refresh aktiv' : '❌ Pull-to-Refresh deaktiviert';
    const statusColor = pullToRefreshEnabled ? 'var(--success-color)' : 'var(--warning-color)';
    
    cacheDiv.innerHTML += `<br><span style="color: ${statusColor}">${statusText}</span>`;
}

window.clearAllCaches = async function() {
    if (!confirm('Alle Caches löschen?')) return;
    
    try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        showNotification('Alle Caches gelöscht!', 'success');
        loadDebugInfo();
    } catch (error) {
        showNotification('Fehler beim Löschen: ' + error.message, 'error');
    }
};

window.updateServiceWorker = async function() {
    try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
            await registration.update();
            showNotification('Service Worker Update eingeleitet!', 'success');
        } else {
            showNotification('Kein Service Worker registriert', 'error');
        }
    } catch (error) {
        showNotification('Update Fehler: ' + error.message, 'error');
    }
};

window.togglePullToRefresh = function() {
    const currentState = localStorage.getItem('pullToRefreshEnabled') !== 'false';
    const newState = !currentState;
    
    localStorage.setItem('pullToRefreshEnabled', newState.toString());
    
    if (newState) {
        setupPullToRefresh();
        showNotification('Pull-to-Refresh aktiviert', 'success');
    } else {
        // Remove event listeners by reloading (simplest approach)
        showNotification('Pull-to-Refresh deaktiviert. Seite wird neu geladen...', 'info');
        setTimeout(() => window.location.reload(), 1500);
    }
};

// ===== Debug Functions (können in der Konsole aufgerufen werden) =====
function enhanceVirtualScroller() {
    const container = document.getElementById('treatment-list-container');
    const list = document.getElementById('treatment-list');
    
    if (!container || !list) return;
    
    // Verhindere Scroll-Konflikte
    container.addEventListener('touchstart', (e) => {
        // Markiere als Liste-Scroll, nicht Pull-to-Refresh
        container.dataset.isScrolling = 'true';
    }, { passive: true });
    
    container.addEventListener('touchend', () => {
        // Reset nach kurzer Verzögerung
        setTimeout(() => {
            container.dataset.isScrolling = 'false';
        }, 100);
    }, { passive: true });
    
    // Bessere Scroll-Performance
    let scrollTimeout;
    container.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            // Smooth scrolling ended
            container.style.scrollBehavior = 'auto';
        }, 150);
    }, { passive: true });
    
    // Verhindere überscrollling das Pull-to-Refresh triggert
    container.addEventListener('scroll', (e) => {
        if (container.scrollTop < 0) {
            container.scrollTop = 0;
        }
    }, { passive: false });
}
window.debugServiceWorker = async function() {
    if (!('serviceWorker' in navigator)) {
        console.log('Service Worker nicht unterstützt');
        return;
    }
    
    try {
        const cacheNames = await caches.keys();
        console.log('📦 Verfügbare Caches:', cacheNames);
        
        for (const cacheName of cacheNames) {
            const cache = await caches.open(cacheName);
            const requests = await cache.keys();
            console.log(`\n📁 Cache: ${cacheName}`);
            console.log('   Gecachte Dateien:');
            requests.forEach(req => {
                console.log(`   ✅ ${req.url}`);
            });
        }
        
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
            console.log('\n🔧 Service Worker Status:');
            console.log('   Installing:', registration.installing);
            console.log('   Waiting:', registration.waiting);
            console.log('   Active:', registration.active);
        }
    } catch (error) {
        console.error('Debug failed:', error);
    }
};

// Füge Debug-Info zur Konsole hinzu
console.log('🐷 Sauen App geladen!');
console.log('Debug: Tippen Sie debugServiceWorker() in die Konsole für Cache-Info');

// ===== Pull to Refresh - Deutlich weniger aggressiv =====
function setupPullToRefresh() {
    let startY = 0;
    let isPulling = false;
    let pullStartTime = 0;
    let hasScrolled = false;
    const pullElement = document.getElementById('pull-to-refresh');
    
    // Viel weniger aggressive Konfiguration
    const config = {
        minDistance: 120,       // Deutlich mehr Abstand (war 80)
        triggerDistance: 200,   // Viel mehr zum Triggern (war 140)
        minDuration: 800,       // Längere Dauer erforderlich (war 300)
        scrollTolerance: 10,    // Mehr Scroll-Toleranz (war 5)
        velocityThreshold: 0.5, // Höhere Geschwindigkeit (war 0.3)
        maxInitialVelocity: 2.0 // Neue: Verhindert zu schnelle Gesten
    };
    
    // Verbesserte Scroll-Erkennung
    let scrollDetectionTimer;
    let lastScrollTop = 0;
    
    function isAtTop() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Einfache Prüfung - nur Window-Scroll
        return scrollTop <= config.scrollTolerance;
    }
    
    function detectScrollIntent(currentY) {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Wenn sich die Scroll-Position ändert, ist es ein Scroll nicht Pull
        if (Math.abs(scrollTop - lastScrollTop) > 2) {
            hasScrolled = true;
            return true;
        }
        lastScrollTop = scrollTop;
        return false;
    }
    
    document.addEventListener('touchstart', (e) => {
        // Reset
        hasScrolled = false;
        lastScrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Nur bei wirklich oberster Position UND nicht beim Scrollen
        if (isAtTop() && !hasScrolled) {
            startY = e.touches[0].clientY;
            pullStartTime = Date.now();
            isPulling = true;
            
            // Überwache Scroll-Aktivität
            clearTimeout(scrollDetectionTimer);
            scrollDetectionTimer = setTimeout(() => {
                if (!isAtTop()) {
                    isPulling = false;
                    pullElement.classList.remove('visible', 'refreshing');
                }
            }, 100);
        }
    }, { passive: true });
    
    document.addEventListener('touchmove', (e) => {
        if (!isPulling) return;
        
        // Prüfe auf Scroll-Intent
        if (detectScrollIntent() || !isAtTop()) {
            isPulling = false;
            pullElement.classList.remove('visible', 'refreshing');
            return;
        }
        
        const currentY = e.touches[0].clientY;
        const diff = currentY - startY;
        const duration = Date.now() - pullStartTime;
        const velocity = diff / duration;
        
        // Verhindere zu schnelle Gesten (Scroll-Intent)
        if (velocity > config.maxInitialVelocity) {
            isPulling = false;
            pullElement.classList.remove('visible', 'refreshing');
            return;
        }
        
        // Sehr restriktive Bedingungen
        if (diff > config.minDistance && 
            duration > config.minDuration && 
            isAtTop() && 
            !hasScrolled &&
            velocity > config.velocityThreshold &&
            velocity < config.maxInitialVelocity) {
            
            pullElement.classList.add('visible');
            
            // Trigger nur bei sehr bewusster Geste
            if (diff > config.triggerDistance) {
                pullElement.classList.add('refreshing');
                // Verhindere scroll während refresh-state
                e.preventDefault();
            }
        } else {
            pullElement.classList.remove('visible', 'refreshing');
        }
    }, { passive: false });
    
    document.addEventListener('touchend', (e) => {
        if (!isPulling) return;
        
        const duration = Date.now() - pullStartTime;
        const finalY = e.changedTouches[0].clientY;
        const totalDistance = finalY - startY;
        const velocity = totalDistance / duration;
        
        // Sehr strenge Bedingungen für Refresh
        if (pullElement.classList.contains('refreshing') && 
            duration > config.minDuration && 
            velocity > config.velocityThreshold &&
            velocity < config.maxInitialVelocity &&
            totalDistance > config.triggerDistance &&
            isAtTop() && 
            !hasScrolled) {
            
            // Länger warten vor Reload
            setTimeout(() => {
                window.location.reload();
            }, 500);
        }
        
        // Cleanup
        pullElement.classList.remove('visible', 'refreshing');
        isPulling = false;
        hasScrolled = false;
        startY = 0;
        pullStartTime = 0;
        clearTimeout(scrollDetectionTimer);
    }, { passive: true });
    
    // Robuste Scroll-Überwachung
    let scrollTimeout;
    document.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            if (isPulling && !isAtTop()) {
                pullElement.classList.remove('visible', 'refreshing');
                isPulling = false;
                hasScrolled = true;
            }
        }, 50);
    }, { passive: true });
    
    // Touch-Cancel für bessere Robustheit
    document.addEventListener('touchcancel', () => {
        pullElement.classList.remove('visible', 'refreshing');
        isPulling = false;
        hasScrolled = false;
    }, { passive: true });
}