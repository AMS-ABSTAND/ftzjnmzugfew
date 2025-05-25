// ===== Module: search.js =====
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
            // Text search
            const matchesText = !query || 
                treatment.sauNumber.toLowerCase().includes(query.toLowerCase()) ||
                treatment.diagnosis.toLowerCase().includes(query.toLowerCase()) ||
                treatment.medication.toLowerCase().includes(query.toLowerCase()) ||
                (treatment.notes && treatment.notes.toLowerCase().includes(query.toLowerCase()));
            
            // Date filter
            const matchesDate = this.checkDateRange(treatment.treatmentDate);
            
            // Status filter
            const matchesStatus = this.filters.status.length === 0 || 
                this.filters.status.includes(treatment.status);
            
            // Tiertyp filter
            const matchesTiertyp = this.filters.tiertyp.length === 0 || 
                this.filters.tiertyp.includes(treatment.tiertyp);
            
            return matchesText && matchesDate && matchesStatus && matchesTiertyp;
        });
    }
    
    checkDateRange(date) {
        const treatmentDate = new Date(date);
        const start = this.filters.dateRange.start ? new Date(this.filters.dateRange.start) : null;
        const end = this.filters.dateRange.end ? new Date(this.filters.dateRange.end) : null;
        
        if (start && treatmentDate < start) return false;
        if (end && treatmentDate > end) return false;
        return true;
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