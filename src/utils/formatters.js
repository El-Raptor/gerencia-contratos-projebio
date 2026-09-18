export function parseFloatSafe(val) {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return val;
    
    let str = String(val).trim();
    if (str.includes(',') && str.includes('.')) {
        str = str.replace(/\./g, '').replace(',', '.');
    } else if (str.includes(',')) {
        str = str.replace(',', '.');
    }
    
    const parsed = parseFloat(str);
    return isNaN(parsed) ? 0 : parsed;
}

export function formatCurrency(value) {
    const num = parseFloatSafe(value);
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatNumber(value) {
    const num = parseFloatSafe(value);
    return num.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

// Novo parser seguro para lidar com as datas que vêm do banco (ex: "18/03/2026")
export function parseDateSafe(dateVal) {
    if (!dateVal) return null;
    if (dateVal instanceof Date) {
        return isNaN(dateVal.getTime()) ? null : dateVal;
    }
    
    if (typeof dateVal === 'string') {
        if (dateVal.includes('/')) {
            const parts = dateVal.split(' ')[0].split('/');
            if (parts.length === 3) {
                // parts: [DD, MM, YYYY]
                const d = new Date(parts[2], parts[1] - 1, parts[0]);
                if (!isNaN(d.getTime())) return d;
            }
        }
        
        const strT = dateVal.includes('T') ? dateVal : `${dateVal}T00:00:00`;
        const d = new Date(strT);
        if (!isNaN(d.getTime())) return d;
        
        const fallback = new Date(dateVal);
        return isNaN(fallback.getTime()) ? null : fallback;
    }
    
    if (typeof dateVal === 'number') {
        const d = new Date(dateVal);
        return isNaN(d.getTime()) ? null : d;
    }
    
    return null;
}

export function formatDate(dateString) {
    const date = parseDateSafe(dateString);
    if (!date) return '-';
    return date.toLocaleDateString('pt-BR');
}