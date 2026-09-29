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

export function isAllowedFirm(firm: { id?: number | string | null; name?: string | null }, permitted?: (string | number)[]) {
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

export function getUserPermittedFirms(user?: { role?: string; administrate?: boolean; firm_access?: string[] } | null): string[] | undefined {
    if (!user) return [];
    const isAdmin = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.administrate === true;
    if (isAdmin) return undefined; // undefined = all access granted
    return user.firm_access && user.firm_access.length > 0 ? user.firm_access : [];
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
        if (!row) return false;

        // Use provided accessors or extract firm id/name from known schemas
        const firmId = accessors.id
            ? accessors.id(row)
            : (row.firm_id ?? row.firmId ?? row.firm?.id ?? row.machine?.firmId ?? row.machine?.firm_id ?? row.machine?.firm?.id ?? (row.projectId ? row.projectId : undefined) ?? (row.id && row.name && !row.productName && !row.category ? row.id : undefined));

        const firmName = accessors.name
            ? accessors.name(row)
            : (row.firm_name ?? row.firmName ?? row.firmNameMatch ?? row.firm?.name ?? row.firm?.firm_name ?? row.machine?.firmName ?? row.machine?.firm?.name ?? row.machine?.firm?.firm_name ?? row.projectName ?? (row.name && !row.productName && !row.category && !row.assetCode ? row.name : undefined));
        
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
