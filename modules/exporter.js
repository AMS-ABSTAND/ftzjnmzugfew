// ===== Module: exporter.js =====
export class DataExporter {
    exportToCSV(treatments) {
        const headers = [
            'Sau-Nr',
            'Tiertyp',
            'Datum',
            'Diagnose',
            'Medikament',
            'Dosierung',
            'Verabreichung',
            'Behandler',
            'Dauer (Tage)',
            'Wartezeit (Tage)',
            'Status',
            'Notizen'
        ];
        
        const rows = treatments.map(t => [
            t.sauNumber,
            t.tiertyp,
            t.treatmentDate,
            t.diagnosis,
            t.medication,
            t.dosage || '',
            t.administrationMethod || '',
            t.person || '',
            t.duration || '',
            t.waitingPeriod || '',
            t.status,
            t.notes || ''
        ]);
        
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
        const json = JSON.stringify(treatments, null, 2);
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