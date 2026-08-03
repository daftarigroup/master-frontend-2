export function normalizeFirmAccess(firms?: (string | number)[]) {
    if (firms === undefined || firms === null) return undefined;

    const normalized = firms
        .map((firm) => String(firm || '').trim())
        .filter(Boolean);
    
    const lowercaseFirms = normalized.map(f => f.toLowerCase());
    if (lowercaseFirms.length === 0 || lowercaseFirms.includes('all')) return undefined;

    return Array.from(new Set(normalized));
}

export function hasNoFirmAccess(firms?: (string | number)[]) {
    const normalized = normalizeFirmAccess(firms);
    return normalized !== undefined && normalized.length === 0;
}

export function isAllowedFirm(firm: { id?: number | string; name?: string }, permitted?: (string | number)[]) {
    const allowed = normalizeFirmAccess(permitted);
    if (allowed === undefined) return true; // 'all' access
    if (allowed.length === 0) return false;

    const firmId = String(firm.id || '').trim();
    const firmName = String(firm.name || '').trim().toLowerCase();

    return allowed.some(val => {
        const normalizedVal = String(val).trim();
        return (firmId && normalizedVal === firmId) || (firmName && normalizedVal.toLowerCase() === firmName);
    });
}

export function filterByFirmAccess<T>(
    rows: T[],
    firms?: (string | number)[],
    accessors: { 
        id?: (row: T) => number | string | undefined; 
        name?: (row: T) => string | undefined; 
    } = {}
) {
    const allowed = normalizeFirmAccess(firms);
    if (allowed === undefined) return rows;
    if (allowed.length === 0) return [];

    return rows.filter((row: any) => {
        // Use provided accessors or fall back to common property names
        const firmId = accessors.id ? accessors.id(row) : (row.firm_id || row.id);
        const firmName = accessors.name ? accessors.name(row) : (row.firm_name || row.firmNameMatch || row.name);
        
        return isAllowedFirm({ id: firmId, name: firmName }, allowed);
    });
}

export function applyFirmAccessFilter(query: any, firms?: (string | number)[]) {
    if (!query) return null;
    const allowed = normalizeFirmAccess(firms);
    if (allowed === undefined || allowed.length === 0) return query; // 'all' access — no filter

    const ids = allowed.filter((firm) => /^\d+$/.test(String(firm))).map(Number);
    const names = allowed.filter((firm) => !/^\d+$/.test(String(firm)));

    if (ids.length > 0 && names.length > 0) {
        return query.or(`firm_id.in.(${ids.join(',')}),firm_name.in.(${names.map(n => `"${n}"`).join(',')})`);
    } else if (ids.length > 0) {
        return query.or ? query.or(`firm_id.in.(${ids.join(',')}),firm_id.is.null`) : query;
    } else if (names.length > 0) {
        return query.in ? query.in('firm_name', names) : query;
    }

    return query;
}
