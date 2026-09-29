import type { UserPermissions } from '@/types/sheets';
import { GATEKEY_TO_PAGE_ID, PAGE_ID_TO_GATEKEY } from '@/lib/permissionMapping';

export { GATEKEY_TO_PAGE_ID, PAGE_ID_TO_GATEKEY };

export const SYSTEM_PREFIXES: Record<string, string[]> = {
    hr: ['hr_'],
    asset: ['asset_'],
    maintenance: ['maint_'],
    repair: ['repair_'],
    document: ['doc_'],
    petty_cash: ['petty_cash_'],
    checklist: ['checklist_'],
    store: [
        'store_',
        'indent_',
        'po_',
        'grn_',
        'create_indent',
        'inventory',
        'create_po',
        'orders_view',
        'vendor_rates',
        'technical_approval',
        'management_approval',
        'bill_not_received',
        'make_payment',
        'freight_payment',
        'debit_note',
        'audit_data',
        'tally_entry',
        'pc_report',
        'create_enquiry',
        'hod_',
        'tally_',
    ],
    master_settings: ['master_registry', 'manage_users', 'working_calendar', 'holidays'],
};

/**
 * Helper function to check if a user has access to a specific system module
 */
export function hasSystemAccess(
    user: UserPermissions | null | undefined,
    systemId: string
): boolean {
    if (!user) return false;

    // Super admin, admin or legacy administrate flag grants all systems
    const isAdmin =
        user.role === 'SUPER_ADMIN' ||
        user.role === 'ADMIN' ||
        user.administrate === true ||
        String(user.administrate).toLowerCase() === 'true';
    if (isAdmin) return true;

    // 1. Check system_access JSON array or string
    let sysAccess = user.system_access;
    if (typeof sysAccess === 'string' && sysAccess.trim().startsWith('[')) {
        try {
            sysAccess = JSON.parse(sysAccess);
        } catch {
            // keep as string
        }
    }

    if (sysAccess) {
        if (typeof sysAccess === 'string' && (sysAccess === 'ALL' || sysAccess === 'all')) return true;
        if (Array.isArray(sysAccess)) {
            const normalizedTarget = systemId.toLowerCase().replace(/[-_]/g, '');
            if (
                sysAccess.includes('ALL') ||
                sysAccess.includes('all') ||
                sysAccess.includes(systemId) ||
                sysAccess.some((s) => typeof s === 'string' && s.toLowerCase().replace(/[-_]/g, '') === normalizedTarget)
            ) {
                return true;
            }
        }
    }

    // 2. Grant system access if user has ANY active page within this system
    const prefixes = SYSTEM_PREFIXES[systemId] || [systemId + '_'];

    let pageAccess = user.page_access;
    if (typeof pageAccess === 'string' && pageAccess.trim().startsWith('{')) {
        try {
            pageAccess = JSON.parse(pageAccess);
        } catch {
            // keep as is
        }
    }

    if (pageAccess && typeof pageAccess === 'object') {
        const pageAccessRecord = pageAccess as Record<string, unknown>;
        const hasMatchingActivePage = Object.entries(pageAccessRecord).some(([pKey, rawVal]) => {
            if (!rawVal || rawVal === 'NONE' || rawVal === 'none' || rawVal === false) return false;
            const mode = typeof rawVal === 'object' && rawVal !== null
                ? (rawVal as { mode?: unknown }).mode
                : rawVal;
            if (!mode || mode === 'NONE' || mode === 'none' || mode === false) return false;
            return prefixes.some((pfx) => pKey.startsWith(pfx) || pKey === pfx);
        });
        if (hasMatchingActivePage) return true;
    }

    // 3. Check active permissions list against system prefix mapping
    if (Array.isArray(user.permissions) && user.permissions.length > 0) {
        const hasMatchingPerm = user.permissions.some((perm) => {
            const mappedPageId = GATEKEY_TO_PAGE_ID[perm] || perm;
            return prefixes.some((pfx) => mappedPageId.startsWith(pfx) || mappedPageId === pfx);
        });
        if (hasMatchingPerm) return true;
    }

    return false;
}

/**
 * Helper to check if a SystemNavConfig should be visible to a user.
 * A system is visible if user is Super Admin, has explicit system_access,
 * or has permission for at least one page inside that system.
 */
export function isSystemPermitted(
    user: UserPermissions | null | undefined,
    system: { id: string; disabled?: boolean; groups?: { items: { gateKey?: string }[] }[] }
): boolean {
    if (!user) return false;

    const isAdmin =
        user.role === 'SUPER_ADMIN' ||
        user.role === 'ADMIN' ||
        user.administrate === true ||
        String(user.administrate).toLowerCase() === 'true';
    if (isAdmin) return true;

    if (system.disabled) return false;

    if (hasSystemAccess(user, system.id)) return true;

    if (system.groups && Array.isArray(system.groups)) {
        for (const group of system.groups) {
            if (group.items && Array.isArray(group.items)) {
                for (const item of group.items) {
                    if (item.gateKey && hasPageAccess(user, undefined, 'VIEW', item.gateKey as keyof UserPermissions)) {
                        return true;
                    }
                }
            }
        }
    }

    return false;
}

/**
 * Unified helper function to check page-level permissions across JSON and legacy boolean structures
 */
export function hasPageAccess(
    user: UserPermissions | null | undefined,
    pageId?: string,
    requiredMode: 'VIEW' | 'EDIT' = 'VIEW',
    legacyIdentifier?: keyof UserPermissions
): boolean {
    if (!user) return false;

    // Super admin, admin or legacy administrate flag grants all permissions
    const isAdmin =
        user.role === 'SUPER_ADMIN' ||
        user.role === 'ADMIN' ||
        user.administrate === true ||
        String(user.administrate).toLowerCase() === 'true';
    if (isAdmin) return true;

    // Resolve target pageId and canonical gateKey
    const resolvedPageId = pageId || (legacyIdentifier ? (GATEKEY_TO_PAGE_ID[legacyIdentifier] || legacyIdentifier) : undefined);
    const targetGateKey = legacyIdentifier || (resolvedPageId ? (PAGE_ID_TO_GATEKEY[resolvedPageId] as keyof UserPermissions) : undefined);

    // 1. Check page_access JSON dictionary or string if available
    let pageAccess = user.page_access;
    if (typeof pageAccess === 'string' && pageAccess.trim().startsWith('{')) {
        try {
            pageAccess = JSON.parse(pageAccess);
        } catch {
            // keep as is
        }
    }

    if (pageAccess) {
        if (typeof pageAccess === 'string' && (pageAccess === 'ALL' || pageAccess === 'all')) return true;
        if (typeof pageAccess === 'object') {
            const pageAccessRecord = pageAccess as Record<string, unknown>;
            const allMode = pageAccessRecord['ALL'] || pageAccessRecord['all'];
            const directGateKeyMode = targetGateKey ? pageAccessRecord[targetGateKey] : undefined;
            const rawMode = resolvedPageId
                ? (pageAccessRecord[resolvedPageId] ?? directGateKeyMode ?? allMode)
                : (directGateKeyMode ?? allMode);

            if (rawMode === false || rawMode === 'NONE' || rawMode === 'none') {
                return false;
            }

            const mode = typeof rawMode === 'object' && rawMode !== null
                ? (rawMode as { mode?: unknown }).mode
                : rawMode;

            if (mode !== undefined && mode !== null && mode !== false && mode !== 'NONE' && mode !== 'none') {
                const normalizedMode = String(mode).toUpperCase();
                if (normalizedMode === 'EDIT' || mode === true || normalizedMode === 'TRUE') {
                    if (requiredMode === 'EDIT' && String(user.modify_access).toUpperCase() === 'VIEW') {
                        return false;
                    }
                    return true;
                }
                if (normalizedMode === 'VIEW') {
                    return requiredMode === 'VIEW';
                }
            }
        }
    }

    // 2. Check legacy boolean identifier or user permissions array
    const checkKey = targetGateKey || (resolvedPageId as keyof UserPermissions | undefined);
    if (checkKey) {
        const val = user[checkKey];
        const isGranted =
            val === true ||
            val === 'true' ||
            val === 'TRUE' ||
            (Array.isArray(user.permissions) && (user.permissions.includes(String(checkKey)) || (resolvedPageId && user.permissions.includes(resolvedPageId))));

        if (isGranted) {
            if (requiredMode === 'EDIT' && String(user.modify_access).toUpperCase() === 'VIEW') {
                return false;
            }
            return true;
        }
    }

    return false;
}
