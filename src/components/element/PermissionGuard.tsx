import React from 'react';
import { useAuth } from '@/context/AuthContext';
import type { UserPermissions } from '@/types/sheets';

export interface PermissionGuardProps {
    system?: string;
    page?: string;
    identifier?: keyof UserPermissions;
    requiredMode?: 'VIEW' | 'EDIT';
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

/**
 * Mapping between legacy boolean property names (gateKey) and unified JSON page IDs
 */
export const GATEKEY_TO_PAGE_ID: Record<string, string> = {
    // Master Settings
    administrate: 'manage_users',
    manageUsers: 'manage_users',
    manage_users: 'manage_users',
    masterRegistry: 'master_registry',
    master_registry: 'master_registry',
    workingCalendar: 'working_calendar',
    working_calendar: 'working_calendar',
    holidays: 'holidays',

    // Store & Procurement
    createIndent: 'create_indent',
    create_indent: 'create_indent',
    indentApprovalView: 'indent_approval',
    indentApprovalAction: 'indent_approval',
    indent_approval: 'indent_approval',
    pendingIndentsView: 'pending_indents',
    pending_indents: 'pending_indents',
    createPo: 'create_po',
    create_po: 'create_po',
    ordersView: 'orders_view',
    orders_view: 'orders_view',
    poHistory: 'orders_view',
    updateVendorView: 'vendor_rates',
    updateVendorAction: 'vendor_rates',
    vendor_rates: 'vendor_rates',
    threePartyApprovalView: 'technical_approval',
    threePartyApprovalAction: 'technical_approval',
    technical_approval: 'technical_approval',
    pendingPo: 'pending_po',
    pending_po: 'pending_po',
    storeIssue: 'store_issue',
    storeIssueReturn: 'store_issue',
    issueData: 'store_issue',
    store_issue: 'store_issue',
    inventory: 'inventory',
    storeIn: 'store_in',
    hodStoreApproval: 'store_in',
    store_in: 'store_in',
    receiveItemView: 'grn_rejection',
    receiveItemAction: 'grn_rejection',
    insteadOfQualityCheckInReceivedItem: 'grn_rejection',
    grn_rejection: 'grn_rejection',
    storeOutApprovalView: 'store_out',
    storeOutApprovalAction: 'store_out',
    store_out: 'store_out',

    // Audits & Finance
    auditData: 'audits',
    reauditData: 'audits',
    againAuditing: 'audits',
    rectifyTheMistake: 'audits',
    takeEntryByTelly: 'audits',
    dbForPc: 'audits',
    audits: 'audits',
    sendDebitNote: 'finance_logistics',
    billNotReceived: 'finance_logistics',
    returnMaterialToParty: 'finance_logistics',
    exchangeMaterials: 'finance_logistics',
    fullKiting: 'finance_logistics',
    fullkiting: 'finance_logistics',
    makePayment: 'finance_logistics',
    finance_logistics: 'finance_logistics',

    // Checklist & Delegation
    checklistDash: 'checklist_dash',
    checklist_dash: 'checklist_dash',
    checklistQuickTask: 'checklist_quick',
    checklist_quick: 'checklist_quick',
    checklistAssign: 'checklist_assign',
    checklist_assign: 'checklist_assign',
    checklistSubmitChecklist: 'checklist_submit_check',
    checklist_submit_check: 'checklist_submit_check',
    checklistSubmitDelegation: 'checklist_submit_del',
    checklist_submit_del: 'checklist_submit_del',
    checklistApproval: 'checklist_approval',
    checklist_approval: 'checklist_approval',
};

/**
 * Helper function to check if a user has access to a specific system module
 */
export function hasSystemAccess(
    user: UserPermissions | null | undefined,
    systemId: string
): boolean {
    if (!user) return false;
    
    // Super admin or legacy administrate flag grants all systems
    const isAdmin = user.role === 'SUPER_ADMIN' || user.administrate === true || (user.administrate as any) === 'true';
    if (isAdmin) return true;

    // Check system_access JSON array or string
    if (user.system_access) {
        if (typeof user.system_access === 'string' && (user.system_access === 'ALL' || user.system_access === 'all')) return true;
        if (Array.isArray(user.system_access)) {
            if (user.system_access.includes('ALL') || user.system_access.includes('all') || user.system_access.includes(systemId)) return true;
        }
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

    const isAdmin = user.role === 'SUPER_ADMIN' || user.administrate === true || (user.administrate as any) === 'true';
    if (isAdmin) return true;

    if (hasSystemAccess(user, system.id)) return true;

    if (system.disabled) return false;

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

    // Super admin or legacy administrate flag grants all permissions
    const isAdmin = user.role === 'SUPER_ADMIN' || user.administrate === true || (user.administrate as any) === 'true';
    if (isAdmin) return true;

    // Resolve target pageId using mapping if not directly passed
    const resolvedPageId = pageId || (legacyIdentifier ? (GATEKEY_TO_PAGE_ID[legacyIdentifier] || legacyIdentifier) : undefined);

    // 1. Check page_access JSON dictionary or string if available
    if (user.page_access) {
        if (typeof user.page_access === 'string' && (user.page_access === 'ALL' || user.page_access === 'all')) return true;
        if (typeof user.page_access === 'object') {
            const allMode = (user.page_access as any)['ALL'] || (user.page_access as any)['all'];
            const directMode = legacyIdentifier ? (user.page_access as any)[legacyIdentifier] : undefined;
            const mode = resolvedPageId 
                ? (user.page_access[resolvedPageId] || directMode || allMode) 
                : (directMode || allMode);

            if (mode) {
                if (requiredMode === 'VIEW') return mode === 'VIEW' || mode === 'EDIT';
                if (requiredMode === 'EDIT') return mode === 'EDIT';
            }
        }
    }

    // 2. Fallback to legacy boolean identifier if provided
    if (legacyIdentifier && user[legacyIdentifier] !== undefined) {
        const val = user[legacyIdentifier];
        const isGranted = val === true || val === 'true' || val === 'TRUE';
        
        if (isGranted) {
            if (requiredMode === 'EDIT' && String(user.modify_access).toUpperCase() === 'VIEW') {
                return false;
            }
            return true;
        }
    }

    return false;
}

/**
 * Unified PermissionGuard component for conditional component rendering
 */
export function PermissionGuard({
    system,
    page,
    identifier,
    requiredMode = 'VIEW',
    children,
    fallback = null,
}: PermissionGuardProps) {
    const { user } = useAuth();

    // Check system access if specified
    if (system && !hasSystemAccess(user, system)) {
        return <>{fallback}</>;
    }

    // Check page or legacy identifier access if specified
    if ((page || identifier) && !hasPageAccess(user, page, requiredMode, identifier)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}

export default PermissionGuard;
