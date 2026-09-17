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
    createEnquiry: 'create_enquiry',
    create_enquiry: 'create_enquiry',
    ordersView: 'orders_view',
    orders_view: 'orders_view',
    poHistory: 'po_history',
    po_history: 'po_history',
    updateVendorView: 'vendor_rates',
    updateVendorAction: 'vendor_rates',
    vendor_rates: 'vendor_rates',
    threePartyApprovalView: 'technical_approval',
    threePartyApprovalAction: 'technical_approval',
    technical_approval: 'technical_approval',
    managementApprovalView: 'management_approval',
    managementApprovalAction: 'management_approval',
    management_approval: 'management_approval',
    pendingPo: 'pending_po',
    pending_po: 'pending_po',
    storeIssue: 'store_issue',
    store_issue: 'store_issue',
    storeIssueReturn: 'store_issue_return',
    store_issue_return: 'store_issue_return',
    issueData: 'store_data',
    store_data: 'store_data',
    inventory: 'inventory',
    storeIn: 'store_in',
    store_in: 'store_in',
    hodStoreApproval: 'hod_check',
    hod_check: 'hod_check',
    receiveItemView: 'grn_rejection',
    receiveItemAction: 'grn_rejection',
    insteadOfQualityCheckInReceivedItem: 'grn_rejection',
    grn_rejection: 'grn_rejection',
    storeOutApprovalView: 'store_out',
    storeOutApprovalAction: 'store_out',
    store_out: 'store_out',

    // Audits & Finance
    auditData: 'audit_data',
    audit_data: 'audit_data',
    reauditData: 'audit_data',
    againAuditing: 'audit_data',
    rectifyTheMistake: 'audit_data',
    takeEntryByTelly: 'tally_entry',
    tally_entry: 'tally_entry',
    dbForPc: 'pc_report',
    pc_report: 'pc_report',
    sendDebitNote: 'debit_note',
    debit_note: 'debit_note',
    billNotReceived: 'bill_not_received',
    bill_not_received: 'bill_not_received',
    returnMaterialToParty: 'debit_note',
    exchangeMaterials: 'debit_note',
    fullKiting: 'freight_payment',
    fullkiting: 'freight_payment',
    freight_payment: 'freight_payment',
    makePayment: 'make_payment',
    make_payment: 'make_payment',

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

    // Document & Subscription
    docDash: 'doc_dashboard',
    doc_dashboard: 'doc_dashboard',
    docResourceManager: 'doc_resources',
    doc_resources: 'doc_resources',
    docAllDocuments: 'doc_all',
    doc_all: 'doc_all',
    docRenewal: 'doc_renewal',
    doc_renewal: 'doc_renewal',
    docShared: 'doc_shared',
    doc_shared: 'doc_shared',
    docAllSubscriptions: 'doc_sub_all',
    doc_sub_all: 'doc_sub_all',
    docSubApproval: 'doc_sub_approval',
    doc_sub_approval: 'doc_sub_approval',
    docSubPayment: 'doc_sub_payment',
    doc_sub_payment: 'doc_sub_payment',
    docSubRenewal: 'doc_sub_renewal',
    doc_sub_renewal: 'doc_sub_renewal',
    docAllLoans: 'doc_loan_all',
    doc_loan_all: 'doc_loan_all',
    docLoanForeclosure: 'doc_loan_foreclosure',
    doc_loan_foreclosure: 'doc_loan_foreclosure',
    docLoanNoc: 'doc_loan_noc',
    doc_loan_noc: 'doc_loan_noc',

    // Petty Cash
    pettyCashDash: 'petty_cash_dash',
    petty_cash_dash: 'petty_cash_dash',
    pettyCashEntries: 'petty_cash_entries',
    petty_cash_entries: 'petty_cash_entries',
    pettyCashLedger: 'petty_cash_ledger',
    petty_cash_ledger: 'petty_cash_ledger',
    pettyCashReports: 'petty_cash_reports',
    petty_cash_reports: 'petty_cash_reports',
    pettyCashSettings: 'petty_cash_settings',
    petty_cash_settings: 'petty_cash_settings',

    // Maintenance
    maintDash: 'maint_dash',
    maint_dash: 'maint_dash',
    maintMachines: 'maint_machines',
    maint_machines: 'maint_machines',
    maintBreakdowns: 'maint_breakdowns',
    maint_breakdowns: 'maint_breakdowns',


    // HR & Facilities Management
    hrDash: 'hr_dashboard',
    hr_dashboard: 'hr_dashboard',
    hrIndent: 'hr_indent',
    hr_indent: 'hr_indent',
    hrCandidate: 'hr_candidate',
    hr_candidate: 'hr_candidate',
    hrEmployee: 'hr_employee',
    hr_employee: 'hr_employee',
    hrAttendance: 'hr_attendance',
    hr_attendance: 'hr_attendance',
    hrLeave: 'hr_leave',
    hr_leave: 'hr_leave',
    hrGatePass: 'hr_gate_pass',
    hr_gate_pass: 'hr_gate_pass',
    hrAdvance: 'hr_advance',
    hr_advance: 'hr_advance',
    hrSalary: 'hr_salary',
    hr_salary: 'hr_salary',
    hrLetter: 'hr_letter',
    hr_letter: 'hr_letter',
    hrCalendar: 'hr_calendar',
    hr_calendar: 'hr_calendar',
    hrReports: 'hr_reports',
    hr_reports: 'hr_reports',
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
    const isAdmin = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.administrate === true || (user.administrate as any) === 'true';
    if (isAdmin) return true;

    // HR module: Accessible by default during frontend preview unless explicitly disabled
    if (systemId === 'hr') {
        if (user.system_access && Array.isArray(user.system_access) && user.system_access.length > 0) {
            if (user.system_access.includes('hr') || user.system_access.includes('ALL') || user.system_access.includes('all')) {
                return true;
            }
        }
        return true;
    }

    // Check system_access JSON array or string
    if (user.system_access) {
        if (typeof user.system_access === 'string' && (user.system_access === 'ALL' || user.system_access === 'all')) return true;
        if (Array.isArray(user.system_access)) {
            const normalizedTarget = systemId.toLowerCase().replace(/[-_]/g, '');
            if (
                user.system_access.includes('ALL') ||
                user.system_access.includes('all') ||
                user.system_access.includes(systemId) ||
                user.system_access.some((s) => typeof s === 'string' && s.toLowerCase().replace(/[-_]/g, '') === normalizedTarget)
            ) {
                return true;
            }
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

    const isAdmin = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.administrate === true || (user.administrate as any) === 'true';
    if (isAdmin) return true;

    if (hasSystemAccess(user, system.id)) return true;

    if (system.disabled) return false;

    // HR module preview access
    if (system.id === 'hr') return true;

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
    const isAdmin = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.administrate === true || (user.administrate as any) === 'true';
    if (isAdmin) return true;

    // Resolve target pageId using mapping if not directly passed
    const resolvedPageId = pageId || (legacyIdentifier ? (GATEKEY_TO_PAGE_ID[legacyIdentifier] || legacyIdentifier) : undefined);

    // HR module pages default to accessible during preview unless explicitly disabled
    if ((resolvedPageId && resolvedPageId.startsWith('hr_')) || (legacyIdentifier && String(legacyIdentifier).startsWith('hr'))) {
        if (legacyIdentifier && user[legacyIdentifier] === false) return false;
        if (resolvedPageId && user.page_access && user.page_access[resolvedPageId] === undefined) return true;
        return true;
    }

    // 1. Check page_access JSON dictionary or string if available
    if (user.page_access) {
        if (typeof user.page_access === 'string' && (user.page_access === 'ALL' || user.page_access === 'all')) return true;
        if (typeof user.page_access === 'object') {
            const allMode = (user.page_access as any)['ALL'] || (user.page_access as any)['all'];
            const directMode = legacyIdentifier ? (user.page_access as any)[legacyIdentifier] : undefined;
            const rawMode = resolvedPageId 
                ? (user.page_access[resolvedPageId] || directMode || allMode) 
                : (directMode || allMode);
            const mode = typeof rawMode === 'object' && rawMode !== null ? rawMode.mode : rawMode;

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
