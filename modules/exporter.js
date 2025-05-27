// ===== Module: exporter.js - Updated for multiple treatments =====
export class DataExporter {
    exportToCSV(treatments) {
        const headers = [
            'Sau-Nr',
            'Tiertyp',
            'Status',
            'Behandlung #',
            'Datum',
            'Diagnose',
            'Medikament',
            'Dosierung',
            'Verabreichung',
            'Behandler',
            'Dauer (Tage)',
            'Wartezeit (Tage)',
            'Notizen'
        ];
        
        const rows = [];
        
        treatments.forEach(treatment => {
            // Handle both new format (with treatments array) and old format
            const treatmentData = treatment.treatments || [{
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
            
            treatmentData.forEach((t, index) => {
                rows.push([
                    treatment.sauNumber,
                    treatment.tiertyp,
                    treatment.status,
                    index + 1, // Treatment number
                    t.date,
                    t.diagnosis,
                    t.medication || '',
                    t.dosage || '',
                    t.administrationMethod || '',
                    t.person || '',
                    t.duration || '',
                    t.waitingPeriod || '',
                    t.notes || ''
                ]);
            });
        });
        
        // Build CSV string
        const csv = [
            headers.join(','),
            ...rows.map(row => 
                row.map(cell => {
                    // Escape quotes and wrap in quotes if contains comma
                    const escaped = String(cell).replace(/"/g, '""');
                    return escaped.includes(',') ? `"${escaped}"` : escaped;
                }).join(',')
            )
        ].join('\n');
        
        // Add BOM for Excel UTF-8 recognition
        const bom = '\uFEFF';
        this.downloadFile(bom + csv, `behandlungen_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8');
    }
    
    exportToJSON(treatments) {
        // Export with full structure including multiple treatments
        const exportData = treatments.map(treatment => ({
            ...treatment,
            // Ensure backwards compatibility
            treatments: treatment.treatments || [{
                date: treatment.treatmentDate || treatment.date,
                diagnosis: treatment.diagnosis,
                medication: treatment.medication,
                dosage: treatment.dosage,
                administrationMethod: treatment.administrationMethod,
                person: treatment.person,
                duration: treatment.duration,
                waitingPeriod: treatment.waitingPeriod,
                notes: treatment.notes
            }]
        }));
        
        const json = JSON.stringify(exportData, null, 2);
        this.downloadFile(json, `behandlungen_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
    }
    
    downloadFile(content, filename, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}