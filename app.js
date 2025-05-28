// ===== Sauen Behandlung App - Mobile-Optimierte JavaScript =====

// Import modules
import { DatabaseManager } from './modules/database.js';
import { VirtualScroller } from './modules/virtualScroller.js';
import { AdvancedSearch } from './modules/search.js';
import { DataExporter } from './modules/exporter.js';
import { SyncManager } from './modules/sync.js';
import { ServiceWorkerManager } from './modules/serviceWorker.js';

// ===== Global Variables =====
let db;
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
        
        // Initialize modules
        advancedSearch = new AdvancedSearch();
        dataExporter = new DataExporter();
        syncManager = new SyncManager();
        
        // Initialize service worker (graceful fallback if it fails)
        const swManager = new ServiceWorkerManager();
        window.swManager = swManager;
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
                            showNotification('Sync OK!', 'success');
                        } else {
                            console.log('Background sync failed:', event.data.error);
                        }
                    }
                });
            }
        } catch (error) {
            console.log('Service Worker init failed, but app continues:', error);
        }
        
        // Set up event listeners
        setupEventListeners();
        
        // Initialize mobile optimizations
        setupMobileOptimizations();
        
        // Initialize pull-to-refresh
        const pullToRefreshEnabled = localStorage.getItem('pullToRefreshEnabled') !== 'false';
        if (pullToRefreshEnabled) {
            setupPullToRefresh();
            console.log('🔄 Pull-to-Refresh aktiviert');
        } else {
            console.log('❌ Pull-to-Refresh deaktiviert');
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
        showNotification('Fehler beim Laden!', 'error');
    }
});

// ===== Mobile Optimizations Setup =====
function setupMobileOptimizations() {
    // Mobile viewport optimization
    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', () => {
        setTimeout(setViewportHeight, 100);
    });
    
    // Touch optimizations
    setupTouchOptimizations();
    
    // Scroll performance
    optimizeScrollPerformance();
    
    // Prevent iOS bounce
    document.addEventListener('touchmove', function(e) {
        if (e.target.closest('.treatment-list-container, .form-group, .search-form')) {
            return;
        }
        e.preventDefault();
    }, { passive: false });
}

function setViewportHeight() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}

function setupTouchOptimizations() {
    // Verbessere Touch-Targets für mobile
    const actionButtons = document.querySelectorAll('.action-btn');
    actionButtons.forEach(button => {
        button.style.minHeight = '44px';
        button.style.minWidth = '44px';
    });
    
    // Reduziere Hover-Effekte auf Touch-Geräten
    if ('ontouchstart' in window) {
        document.body.classList.add('touch-device');
        const style = document.createElement('style');
        style.textContent = `
            .touch-device .simple-treatment-card:hover {
                transform: none;
                box-shadow: var(--shadow-md);
            }
            .touch-device .action-btn:hover {
                transform: none;
            }
        `;
        document.head.appendChild(style);
    }
}

function optimizeScrollPerformance() {
    const treatmentContainer = document.getElementById('treatment-list-container');
    if (!treatmentContainer) return;
    
    let ticking = false;
    
    function updateScrollPosition() {
        ticking = false;
    }
    
    treatmentContainer.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(updateScrollPosition);
            ticking = true;
        }
    }, { passive: true });
}

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
    
    // Mobile-specific checkbox handling
    setupMobileCheckboxes();
}

function setupMobileCheckboxes() {
    document.querySelectorAll('.checkbox-label').forEach(label => {
        label.addEventListener('click', (e) => {
            e.preventDefault();
            const checkbox = label.querySelector('input[type="checkbox"]');
            checkbox.checked = !checkbox.checked;
            label.classList.toggle('checked', checkbox.checked);
        });
    });
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
            await addFollowUpTreatment(followUpParentId, newTreatmentData);
            showNotification('Nachbehandlung hinzugefügt!', 'success');
        } else if (isEditMode) {
            const treatment = await db.getTreatmentById(editingId);
            if (treatment) {
                treatment.tiertyp = document.getElementById('tiertyp').value;
                treatment.sauNumber = document.getElementById('sauNumber').value;
                treatment.status = document.getElementById('status').value;
                treatment.lastModified = new Date().toISOString();
                treatment.synced = false;
                
                if (treatment.treatments && treatment.treatments.length > 0) {
                    treatment.treatments[0] = { ...treatment.treatments[0], ...newTreatmentData };
                } else {
                    Object.assign(treatment, newTreatmentData);
                }
                
                treatment.history = treatment.history || [];
                treatment.history.push({
                    date: new Date().toISOString(),
                    action: 'Behandlung aktualisiert',
                    status: treatment.status
                });
                
                await db.updateTreatment(treatment);
                showNotification('Aktualisiert!', 'success');
            }
        } else {
            const treatment = {
                id: Date.now(),
                tiertyp: document.getElementById('tiertyp').value,
                sauNumber: document.getElementById('sauNumber').value,
                status: document.getElementById('status').value,
                treatments: [newTreatmentData],
                history: [{
                    date: new Date().toISOString(),
                    action: 'Behandlung erstellt',
                    status: document.getElementById('status').value
                }],
                synced: false,
                lastModified: new Date().toISOString()
            };
            
            await db.addTreatment(treatment);
            showNotification('Gespeichert!', 'success');
        }
        
        clearForm();
        showTab('tab-list');
        
        // Trigger sync if online
        if (navigator.onLine) {
            syncData();
        }
        
    } catch (error) {
        console.error('Error saving treatment:', error);
        showNotification('Fehler beim Speichern!', 'error');
    }
}

// ===== Follow-up Treatment =====
async function addFollowUpTreatment(parentId, treatmentData) {
    const parentTreatment = await db.getTreatmentById(parentId);
    
    if (parentTreatment) {
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
        
        parentTreatment.treatments.push(treatmentData);
        parentTreatment.status = 'In Behandlung';
        parentTreatment.lastModified = new Date().toISOString();
        parentTreatment.synced = false;
        
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
        
        // Mobile feedback
        showNotification('Vorlage angewendet', 'success');
        
        // Focus next field on mobile
        if (window.innerWidth <= 768) {
            setTimeout(() => {
                document.getElementById('sauNumber').focus();
            }, 300);
        }
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
        }, 100);
    }
}

// ===== MOBILE-OPTIMIERTE Treatment Management =====
async function loadTreatments() {
    try {
        const treatments = await db.getAllTreatments();
        
        // Update statistics
        updateStatistics(treatments);
        
        // Sort by last modified date (newest first)
        treatments.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
        
        const listContainer = document.getElementById('treatment-list');
        listContainer.innerHTML = '';
        
        if (treatments.length === 0) {
            listContainer.innerHTML = `
                <div style="text-align: center; padding: var(--spacing-xl); color: var(--gray-500);">
                    <h3>🐷 Keine Behandlungen</h3>
                    <p>Klicken Sie auf + für neue Behandlung.</p>
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

// ===== MOBILE-OPTIMIERTE createTreatmentElement =====
function createTreatmentElement(treatment) {
    const item = document.createElement('div');
    item.className = 'treatment-item simplified';
    item.dataset.id = treatment.id;
    
    // Determine status class
    let statusClass = 'status-active';
    if (treatment.status === 'Abgeschlossen' || treatment.status === 'Genesen') {
        statusClass = 'status-completed';
    } else if (treatment.status === 'Nachbehandlung nötig') {
        statusClass = 'status-follow-up';
    }
    
    // Get all treatments (support both new and old format)
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
    const hasMultipleTreatments = treatments.length > 1;
    
    // Calculate waiting period from latest treatment
    let waitingInfo = '';
    if (latestTreatment.waitingPeriod && latestTreatment.date) {
        const endDate = new Date(latestTreatment.date);
        endDate.setDate(endDate.getDate() + parseInt(latestTreatment.waitingPeriod));
        const today = new Date();
        const daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
        
        if (daysRemaining > 0) {
            waitingInfo = `<div class="waiting-warning">⚠️ ${daysRemaining}T Wartezeit</div>`;
        }
    }
    
    // Treatment count info
    const treatmentCountText = hasMultipleTreatments ? ` (${treatments.length}x)` : '';
    
    // Format date compactly
    const formattedDate = new Date(latestTreatment.date).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit'
    });
    
    // Create compact additional details for latest treatment
    const additionalDetails = [];
    if (latestTreatment.person) additionalDetails.push(`👤${latestTreatment.person}`);
    if (latestTreatment.duration) additionalDetails.push(`⏱️${latestTreatment.duration}T`);
    if (latestTreatment.waitingPeriod) additionalDetails.push(`⏳${latestTreatment.waitingPeriod}T`);
    if (latestTreatment.administrationMethod) additionalDetails.push(`💉${latestTreatment.administrationMethod}`);
    
    const additionalDetailsHTML = additionalDetails.length > 0 ? 
        `<div class="additional-details">
            ${additionalDetails.map(detail => `<span class="detail-item">${detail}</span>`).join('')}
        </div>` : '';
    
    // Compact medication line for latest treatment
    const medicationLine = latestTreatment.medication ? 
        `<div class="medication-line">
            <strong>💊</strong> ${latestTreatment.medication}${latestTreatment.dosage ? ` (${latestTreatment.dosage})` : ''}
        </div>` : '';
    
    // Compact notes for latest treatment
    const notesLine = latestTreatment.notes ? 
        `<div class="notes-line">📝 ${latestTreatment.notes.length > 50 ? latestTreatment.notes.substring(0, 47) + '...' : latestTreatment.notes}</div>` : '';
    
    // Status text mapping for mobile
    const statusText = {
        'In Behandlung': 'Aktiv',
        'Abgeschlossen': 'OK',
        'Nachbehandlung nötig': 'Follow-up',
        'Genesen': 'Genesen'
    }[treatment.status] || treatment.status;
    
    // Create timeline HTML for multiple treatments
    const timelineHTML = hasMultipleTreatments ? createTimelineHTML(treatments) : '';
    
    // Expand/Collapse button for multiple treatments
    const expandButton = hasMultipleTreatments ? 
        `<button class="expand-toggle" onclick="toggleTimeline(${treatment.id})" aria-label="Verlauf anzeigen">
            <span class="expand-icon">▼</span>
            <span class="expand-text">Verlauf anzeigen</span>
        </button>` : '';
    
    item.innerHTML = `
        <div class="simple-treatment-card">
            <div class="treatment-main-info">
                <div class="treatment-left">
                    <div class="pig-icon">🐷</div>
                    <div class="treatment-basic">
                        <div class="sau-info">
                            <span class="sau-number">${treatment.sauNumber}</span>
                            <span class="tiertyp">${treatment.tiertyp}${treatmentCountText}</span>
                        </div>
                        <div class="treatment-date">Letzte: ${formattedDate}</div>
                    </div>
                </div>
                <div class="status-badge ${statusClass}">${statusText}</div>
            </div>
            
            <div class="treatment-details">
                <div class="treatment-summary">
                    <strong>Aktuelle Behandlung:</strong>
                </div>
                
                <div class="diagnosis-line">
                    <strong>🔍</strong> ${latestTreatment.diagnosis}
                </div>
                
                ${medicationLine}
                ${additionalDetailsHTML}
                ${notesLine}
                ${waitingInfo}
                
                ${expandButton}
            </div>
            
            ${timelineHTML}
            
            <div class="action-buttons compact">
                <button class="action-btn edit-btn" onclick="editTreatment(${treatment.id})">
                    ✏️
                </button>
                ${treatment.status !== 'Abgeschlossen' && treatment.status !== 'Genesen' ? 
                    `<button class="action-btn follow-up-btn" onclick="createFollowUp(${treatment.id})">
                        🔄
                    </button>` : ''}
                ${treatment.status === 'In Behandlung' ? 
                    `<button class="action-btn complete-btn" onclick="changeStatus(${treatment.id}, 'Abgeschlossen')">
                        ✅
                    </button>` : ''}
            </div>
        </div>
    `;
    
    return item;
}

// Neue Funktion: Timeline HTML erstellen
function createTimelineHTML(treatments) {
    const timelineItems = treatments.map((treatment, index) => {
        const treatmentDate = new Date(treatment.date).toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit'
        });
        
        const isLatest = index === treatments.length - 1;
        const isFirst = index === 0;
        
        // Timeline item status
        let timelineStatus = 'completed';
        if (isLatest) timelineStatus = 'current';
        
        // Compact treatment details
        const treatmentDetails = [];
        if (treatment.medication) treatmentDetails.push(`💊 ${treatment.medication}`);
        if (treatment.dosage) treatmentDetails.push(`⚖️ ${treatment.dosage}`);
        if (treatment.person) treatmentDetails.push(`👤 ${treatment.person}`);
        if (treatment.duration) treatmentDetails.push(`⏱️ ${treatment.duration}T`);
        
        return `
            <div class="timeline-item ${timelineStatus}">
                <div class="timeline-marker">
                    <div class="timeline-dot ${timelineStatus}">
                        ${isFirst ? '🏁' : isLatest ? '📍' : '💊'}
                    </div>
                    ${index < treatments.length - 1 ? '<div class="timeline-line"></div>' : ''}
                </div>
                <div class="timeline-content">
                    <div class="timeline-header">
                        <span class="timeline-title">
                            ${isFirst ? 'Erstbehandlung' : `Behandlung ${index + 1}`}
                        </span>
                        <span class="timeline-date">${treatmentDate}</span>
                    </div>
                    <div class="timeline-diagnosis">🔍 ${treatment.diagnosis}</div>
                    ${treatmentDetails.length > 0 ? 
                        `<div class="timeline-details">
                            ${treatmentDetails.map(detail => `<span class="timeline-detail-item">${detail}</span>`).join('')}
                        </div>` : ''}
                    ${treatment.notes ? 
                        `<div class="timeline-notes">📝 ${treatment.notes.length > 40 ? treatment.notes.substring(0, 37) + '...' : treatment.notes}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');
    
    return `
        <div class="treatment-timeline" id="timeline-${Date.now()}" style="display: none;">
            <div class="timeline-header-section">
                <h4 class="timeline-title">📋 Behandlungsverlauf</h4>
                <div class="timeline-summary">${treatments.length} Behandlungen</div>
            </div>
            <div class="timeline-container">
                ${timelineItems}
            </div>
        </div>
    `;
}

// Neue Funktion: Timeline Toggle
window.toggleTimeline = function(treatmentId) {
    const treatmentCard = document.querySelector(`[data-id="${treatmentId}"]`);
    if (!treatmentCard) return;
    
    const timeline = treatmentCard.querySelector('.treatment-timeline');
    const expandButton = treatmentCard.querySelector('.expand-toggle');
    const expandIcon = expandButton.querySelector('.expand-icon');
    const expandText = expandButton.querySelector('.expand-text');
    
    if (!timeline) return;
    
    const isExpanded = timeline.style.display !== 'none';
    
    if (isExpanded) {
        // Collapse Timeline
        timeline.style.animation = 'slideUp 0.3s ease-out';
        setTimeout(() => {
            timeline.style.display = 'none';
            timeline.style.animation = '';
        }, 300);
        
        expandIcon.textContent = '▼';
        expandText.textContent = 'Verlauf anzeigen';
        expandButton.setAttribute('aria-expanded', 'false');
        
        // Haptic feedback (if supported)
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    } else {
        // Expand Timeline
        timeline.style.display = 'block';
        timeline.style.animation = 'slideDown 0.3s ease-out';
        
        expandIcon.textContent = '▲';
        expandText.textContent = 'Verlauf verstecken';
        expandButton.setAttribute('aria-expanded', 'true');
        
        // Haptic feedback (if supported)
        if (navigator.vibrate) {
            navigator.vibrate([50, 100, 50]);
        }
        
        // Scroll into view on mobile
        setTimeout(() => {
            if (window.innerWidth <= 768) {
                timeline.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'nearest',
                    inline: 'nearest' 
                });
            }
        }, 350);
    }
};

// Verbesserte mobile Animationen
const timelineAnimations = `
    @keyframes slideDown {
        from {
            opacity: 0;
            max-height: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            max-height: 500px;
            transform: translateY(0);
        }
    }
    
    @keyframes slideUp {
        from {
            opacity: 1;
            max-height: 500px;
            transform: translateY(0);
        }
        to {
            opacity: 0;
            max-height: 0;
            transform: translateY(-10px);
        }
    }
    
    @keyframes timelineFadeIn {
        from {
            opacity: 0;
            transform: translateX(-20px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
`;

// Timeline Animationen zu Stylesheet hinzufügen
if (!document.getElementById('timeline-animations')) {
    const timelineStyleSheet = document.createElement('style');
    timelineStyleSheet.id = 'timeline-animations';
    timelineStyleSheet.textContent = timelineAnimations;
    document.head.appendChild(timelineStyleSheet);
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
            
            const latestTreatment = treatment.treatments && treatment.treatments.length > 0 
                ? treatment.treatments[treatment.treatments.length - 1]
                : treatment;
            
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
            document.getElementById('form-title').textContent = 'Bearbeiten';
            document.getElementById('save-btn').textContent = '💾 Speichern';
            document.getElementById('edit-buttons').style.display = 'block';
            document.getElementById('new-buttons').style.display = 'none';
            
            showTab('tab-form');
        }
    } catch (error) {
        console.error('Error loading treatment for edit:', error);
        showNotification('Fehler beim Laden!', 'error');
    }
};

// ===== Delete Treatment =====
async function deleteTreatment() {
    if (confirm('Behandlung wirklich löschen?')) {
        try {
            await db.deleteTreatment(editingId);
            showNotification('Gelöscht!', 'success');
            clearForm();
            showTab('tab-list');
        } catch (error) {
            console.error('Error deleting treatment:', error);
            showNotification('Fehler beim Löschen!', 'error');
        }
    }
}

// ===== Follow-up Treatment =====
window.createFollowUp = async function(parentId) {
    try {
        const parentTreatment = await db.getTreatmentById(parentId);
        
        if (parentTreatment) {
            clearForm();
            
            isFollowUpMode = true;
            followUpParentId = parentId;
            
            document.getElementById('tiertyp').value = parentTreatment.tiertyp;
            document.getElementById('sauNumber').value = parentTreatment.sauNumber;
            
            const originalDiagnosis = parentTreatment.treatments && parentTreatment.treatments.length > 0 
                ? parentTreatment.treatments[0].diagnosis 
                : parentTreatment.diagnosis;
            
            document.getElementById('diagnosis').value = `Nachbehandlung: ${originalDiagnosis}`;
            
            document.getElementById('form-title').textContent = `Nachbehandlung für ${parentTreatment.sauNumber}`;
            document.getElementById('save-btn').textContent = '🔄 Hinzufügen';
            
            showTab('tab-form');
        }
    } catch (error) {
        console.error('Error creating follow-up:', error);
        showNotification('Fehler bei Nachbehandlung!', 'error');
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
            
            treatment.history = treatment.history || [];
            treatment.history.push({
                date: new Date().toISOString(),
                action: 'Status geändert',
                oldStatus: oldStatus,
                newStatus: newStatus
            });
            
            await db.updateTreatment(treatment);
            await loadTreatments();
            showNotification('Status aktualisiert!', 'success');
        }
    } catch (error) {
        console.error('Error changing status:', error);
        showNotification('Fehler bei Status!', 'error');
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
    document.getElementById('form-title').textContent = 'Neue Behandlung';
    document.getElementById('save-btn').textContent = '💾 Speichern';
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

// ===== MOBILE-OPTIMIERTE Statistics =====
function updateStatistics(treatments) {
    const today = new Date().toDateString();
    
    // Active treatments
    const activeCount = treatments.filter(t => 
        t.status === 'In Behandlung' || t.status === 'Nachbehandlung nötig'
    ).length;
    
    // Today's treatments
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
            resultsContainer.innerHTML = '<div class="card"><p style="text-align: center; color: var(--gray-500);">Keine Ergebnisse</p></div>';
            return;
        }
        
        results.forEach(treatment => {
            const element = createTreatmentElement(treatment);
            resultsContainer.appendChild(element);
        });
        
        showNotification(`${results.length} Ergebnisse`, 'success');
        
    } catch (error) {
        console.error('Error performing search:', error);
        showNotification('Suchfehler!', 'error');
    }
}

function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('filter-date-start').value = '';
    document.getElementById('filter-date-end').value = '';
    
    document.querySelectorAll('.filter-status, .filter-tiertyp').forEach(cb => {
        cb.checked = false;
    });
    
    document.querySelectorAll('.checkbox-label').forEach(label => {
        label.classList.remove('checked');
    });
    
    document.getElementById('search-results').innerHTML = '';
    showNotification('Filter zurückgesetzt', 'success');
}

// ===== Export Functions =====
async function exportToCSV() {
    try {
        const treatments = await db.getAllTreatments();
        dataExporter.exportToCSV(treatments);
        showNotification('CSV exportiert!', 'success');
    } catch (error) {
        console.error('Error exporting to CSV:', error);
        showNotification('Export-Fehler!', 'error');
    }
}

async function exportToJSON() {
    try {
        const treatments = await db.getAllTreatments();
        dataExporter.exportToJSON(treatments);
        showNotification('JSON exportiert!', 'success');
    } catch (error) {
        console.error('Error exporting to JSON:', error);
        showNotification('Export-Fehler!', 'error');
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
        showNotification('Sync erfolgreich!', 'success');
        await loadTreatments();
    } catch (error) {
        console.error('Sync error:', error);
        syncStatus.classList.remove('visible');
        showNotification('Sync fehlgeschlagen', 'error');
    }
}

// ===== MOBILE-OPTIMIERTE Utility Functions =====
function showNotification(message, type = 'info') {
    // Entferne existierende Notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    // Kürze Nachrichten für mobile
    const shortMessage = message.length > 30 ? message.substring(0, 27) + '...' : message;
    notification.textContent = shortMessage;
    
    notification.style.cssText = `
        position: fixed;
        top: 60px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'error' ? 'var(--danger-color)' : 
                    type === 'success' ? 'var(--success-color)' : 
                    'var(--gray-800)'};
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        z-index: 1000;
        font-size: 12px;
        font-weight: 600;
        box-shadow: var(--shadow-lg);
        animation: slideDown 0.3s ease;
        max-width: 90vw;
        text-align: center;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideUp 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 2000); // Kürzere Anzeigezeit für mobile
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
    const debugUrl = './sw-status.html';
    
    fetch(debugUrl, { method: 'HEAD' })
        .then(response => {
            if (response.ok) {
                window.open(debugUrl, '_blank');
            } else {
                showDebugModal();
            }
        })
        .catch(() => {
            showDebugModal();
        });
}

function showDebugModal() {
    const modal = document.createElement('div');
    modal.className = 'debug-modal';
    modal.innerHTML = `
        <div class="debug-modal-content" style="
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border-radius: 12px;
            padding: 20px;
            max-width: 90vw;
            max-height: 80vh;
            overflow-y: auto;
            z-index: 10000;
            box-shadow: var(--shadow-xl);
        ">
            <div class="debug-modal-header" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                border-bottom: 1px solid var(--gray-200);
                padding-bottom: 10px;
            ">
                <h3>🔧 Service Worker Debug</h3>
                <button class="debug-modal-close" style="
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: var(--gray-500);
                ">&times;</button>
            </div>
            <div class="debug-modal-body">
                <div class="debug-section" style="margin-bottom: 15px; padding: 10px; background: var(--gray-100); border-radius: 6px;">
                    <h4>Browser Support</h4>
                    <div id="debug-support">Prüfe...</div>
                </div>
                <div class="debug-section" style="margin-bottom: 15px; padding: 10px; background: var(--gray-100); border-radius: 6px;">
                    <h4>Registration Status</h4>
                    <div id="debug-registration">Prüfe...</div>
                </div>
                <div class="debug-section" style="margin-bottom: 15px; padding: 10px; background: var(--gray-100); border-radius: 6px;">
                    <h4>Cache Status</h4>
                    <div id="debug-cache">Prüfe...</div>
                </div>
                <div class="debug-section">
                    <h4>Aktionen</h4>
                    <button class="btn btn-secondary" onclick="clearAllCaches()" style="margin: 5px;">Caches löschen</button>
                    <button class="btn btn-secondary" onclick="updateServiceWorker()" style="margin: 5px;">SW aktualisieren</button>
                    <button class="btn btn-secondary" onclick="togglePullToRefresh()" style="margin: 5px;">PTR umschalten</button>
                </div>
            </div>
        </div>
    `;
    
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
    `;
    
    const closeBtn = modal.querySelector('.debug-modal-close');
    closeBtn.onclick = () => modal.remove();
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
    
    document.body.appendChild(modal);
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
            showNotification('SW Update eingeleitet!', 'success');
        } else {
            showNotification('Kein SW registriert', 'error');
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
        showNotification('PTR aktiviert', 'success');
    } else {
        showNotification('PTR deaktiviert. Reload...', 'info');
        setTimeout(() => window.location.reload(), 1500);
    }
};

// ===== Debug Functions für Konsole =====
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
console.log('🐷 Mobile Sauen App geladen!');
console.log('Debug: debugServiceWorker() für Cache-Info');

// ===== MOBILE-OPTIMIERTE Pull to Refresh =====
function setupPullToRefresh() {
    let startY = 0;
    let isPulling = false;
    let pullStartTime = 0;
    let hasScrolled = false;
    const pullElement = document.getElementById('pull-to-refresh');
    
    // SEHR restriktive mobile Konfiguration
    const config = {
        minDistance: 150,       // Noch mehr Abstand
        triggerDistance: 250,   // Viel mehr zum Triggern
        minDuration: 1000,      // Länger halten erforderlich
        scrollTolerance: 15,    // Mehr Scroll-Toleranz
        velocityThreshold: 0.3, // Niedrigere Geschwindigkeit
        maxInitialVelocity: 1.5 // Verhindert schnelle Gesten
    };
    
    let scrollDetectionTimer;
    let lastScrollTop = 0;
    
    function isAtTop() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        return scrollTop <= config.scrollTolerance;
    }
    
    function detectScrollIntent(currentY) {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (Math.abs(scrollTop - lastScrollTop) > 3) {
            hasScrolled = true;
            return true;
        }
        lastScrollTop = scrollTop;
        return false;
    }
    
    document.addEventListener('touchstart', (e) => {
        hasScrolled = false;
        lastScrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (isAtTop() && !hasScrolled) {
            startY = e.touches[0].clientY;
            pullStartTime = Date.now();
            isPulling = true;
            
            clearTimeout(scrollDetectionTimer);
            scrollDetectionTimer = setTimeout(() => {
                if (!isAtTop()) {
                    isPulling = false;
                    pullElement.classList.remove('visible', 'refreshing');
                }
            }, 150);
        }
    }, { passive: true });
    
    document.addEventListener('touchmove', (e) => {
        if (!isPulling) return;
        
        if (detectScrollIntent() || !isAtTop()) {
            isPulling = false;
            pullElement.classList.remove('visible', 'refreshing');
            return;
        }
        
        const currentY = e.touches[0].clientY;
        const diff = currentY - startY;
        const duration = Date.now() - pullStartTime;
        const velocity = diff / duration;
        
        // Verhindere zu schnelle Gesten
        if (velocity > config.maxInitialVelocity) {
            isPulling = false;
            pullElement.classList.remove('visible', 'refreshing');
            return;
        }
        
        // Sehr restriktive Bedingungen für mobile
        if (diff > config.minDistance && 
            duration > config.minDuration && 
            isAtTop() && 
            !hasScrolled &&
            velocity > config.velocityThreshold &&
            velocity < config.maxInitialVelocity) {
            
            pullElement.classList.add('visible');
            
            if (diff > config.triggerDistance) {
                pullElement.classList.add('refreshing');
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
    
    // Touch-Cancel für bessere mobile Robustheit
    document.addEventListener('touchcancel', () => {
        pullElement.classList.remove('visible', 'refreshing');
        isPulling = false;
        hasScrolled = false;
    }, { passive: true });
}

// Mobile-spezifische Animationen hinzufügen
const mobileAnimations = `
    @keyframes slideDown {
        from { 
            transform: translateX(-50%) translateY(-20px); 
            opacity: 0; 
        }
        to { 
            transform: translateX(-50%) translateY(0); 
            opacity: 1; 
        }
    }
    
    @keyframes slideUp {
        from { 
            transform: translateX(-50%) translateY(0); 
            opacity: 1; 
        }
        to { 
            transform: translateX(-50%) translateY(-20px); 
            opacity: 0; 
        }
    }
`;

// Füge mobile Animationen hinzu
const styleSheet = document.createElement('style');
styleSheet.textContent = mobileAnimations;
document.head.appendChild(styleSheet);