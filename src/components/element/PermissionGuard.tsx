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
    administrate: 'admin_users',
    createIndent: 'create_indent',
    indentApprovalView: 'indent_approval',
    indentApprovalAction: 'indent_approval',
    updateVendorView: 'vendor_update',
    updateVendorAction: 'vendor_update',
    threePartyApprovalView: 'technical_approval',
    threePartyApprovalAction: 'management_approval',
    createPo: 'create_po',
    pendingPo: 'pending_indents',
    ordersView: 'orders_view',
    storeIn: 'store_in',
    hodStoreApproval: 'hod_store_approval',
    insteadOfQualityCheckInReceivedItem: 'grn_rejection',
    billNotReceived: 'bill_pending',
    makePayment: 'make_payment',
    fullkiting: 'freight_payment',
    sendDebitNote: 'debit_note',
    auditData: 'audit_data',
    takeEntryByTelly: 'tally_entry',
    dbForPc: 'pc_report',
    inventory: 'inventory_stock',
    storeIssue: 'store_issue',
    storeIssueReturn: 'store_issue_return',
    issueData: 'issue_data',
    checklistDash: 'checklist_dash',
    checklistQuickTask: 'checklist_quick_task',
    checklistAssign: 'checklist_assign',
    checklistSubmitChecklist: 'checklist_submit_checklist',
    checklistSubmitDelegation: 'checklist_submit_delegation',
    checklistApproval: 'checklist_approval',
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
    const resolvedPageId = pageId || (legacyIdentifier ? GATEKEY_TO_PAGE_ID[legacyIdentifier] : undefined);

    // 1. Check page_access JSON dictionary or string if available
    if (user.page_access) {
        if (typeof user.page_access === 'string' && (user.page_access === 'ALL' || user.page_access === 'all')) return true;
        if (typeof user.page_access === 'object') {
            const allMode = (user.page_access as any)['ALL'] || (user.page_access as any)['all'];
            const mode = resolvedPageId ? user.page_access[resolvedPageId] || allMode : allMode;
            if (mode) {
                if (requiredMode === 'VIEW') return mode === 'VIEW' || mode === 'EDIT';
                if (requiredMode === 'EDIT') return mode === 'EDIT';
            }
        }
    }

    // 2. Fallback to legacy boolean identifier if provided
    if (legacyIdentifier && user[legacyIdentifier] !== undefined) {
        const val = user[legacyIdentifier];
        const isGranted = val === true || val === 'true';
        
        if (isGranted) {
            if (requiredMode === 'EDIT' && user.modify_access === 'VIEW') {
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
