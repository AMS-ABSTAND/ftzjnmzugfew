// ===== Module: search.js - Updated for multiple treatments =====
export class AdvancedSearch {
    constructor() {
        this.filters = {
            dateRange: { start: null, end: null },
            status: [],
            tiertyp: [],
            medications: []
        };
    }
    
    search(treatments, query) {
        return treatments.filter(treatment => {
            // Text search - now searches through all treatments in the record
            const matchesText = !query || this.searchInTreatment(treatment, query);
            
            // Date filter - checks all treatment dates
            const matchesDate = this.checkDateRange(treatment);
            
            // Status filter
            const matchesStatus = this.filters.status.length === 0 || 
                this.filters.status.includes(treatment.status);
            
            // Tiertyp filter
            const matchesTiertyp = this.filters.tiertyp.length === 0 || 
                this.filters.tiertyp.includes(treatment.tiertyp);
            
            return matchesText && matchesDate && matchesStatus && matchesTiertyp;
        });
    }
    
    searchInTreatment(treatment, query) {
        const lowerQuery = query.toLowerCase();
        
        // Search in main treatment data
        if (treatment.sauNumber.toLowerCase().includes(lowerQuery)) return true;
        
        // Search in all treatments within this record
        const treatments = treatment.treatments || [{
            diagnosis: treatment.diagnosis,
            medication: treatment.medication,
            notes: treatment.notes,
            person: treatment.person
        }];
        
        return treatments.some(t => {
            return (t.diagnosis && t.diagnosis.toLowerCase().includes(lowerQuery)) ||
                   (t.medication && t.medication.toLowerCase().includes(lowerQuery)) ||
                   (t.notes && t.notes.toLowerCase().includes(lowerQuery)) ||
                   (t.person && t.person.toLowerCase().includes(lowerQuery));
        });
    }
    
    checkDateRange(treatment) {
        const start = this.filters.dateRange.start ? new Date(this.filters.dateRange.start) : null;
        const end = this.filters.dateRange.end ? new Date(this.filters.dateRange.end) : null;
        
        // Get all treatment dates
        const treatments = treatment.treatments || [{
            date: treatment.treatmentDate || treatment.date
        }];
        
        // Check if any treatment date falls within the range
        return treatments.some(t => {
            if (!t.date) return false;
            
            const treatmentDate = new Date(t.date);
            if (start && treatmentDate < start) return false;
            if (end && treatmentDate > end) return false;
            return true;
        });
    }
    
    resetFilters() {
        this.filters = {
            dateRange: { start: null, end: null },
            status: [],
            tiertyp: [],
            medications: []
        };
    }
}