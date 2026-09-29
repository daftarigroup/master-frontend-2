import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { filterByFirmAccess } from '@/lib/firmAccess';
import { fetchChecklistTasks } from '@/services/checklistTaskService';
import { fetchDelegationTasks } from '@/services/delegationTaskService';
import { dashboardApi as pettyCashDashboardApi, expensesApi } from '@/systems/petty-cash/services/pettyCash.api';
import { documentsApi, subscriptionsApi, loansApi } from '@/systems/document/services/document.api';
import { api } from '@/lib/axios';
import { useMaintenanceProSidebarCountsQuery } from '@/features/maintenancepro/shared/server/tanstackQuery/useMaintenanceProSidebarCountsQuery';
import { repairSystemApi } from '@/features/maintenancepro/repair/server/api/repairSystemApi';

interface UseSidebarBadgeCountsProps {
    user: any;
    indentSheet?: any[];
    storeInSheet?: any[];
    issueSheet?: any[];
    paymentsSheet?: any[];
}

export function useSidebarBadgeCounts({
    user,
    indentSheet = [],
    storeInSheet = [],
    issueSheet = [],
    paymentsSheet = [],
}: UseSidebarBadgeCountsProps): Record<string, number> {
    const isUserLoggedIn = Boolean(user);

    // Permitted firm filter for Store & Checklist modules
    const permittedFirms =
        user?.administrate || !user?.firm_access || user?.firm_access.length === 0
            ? undefined
            : user.firm_access;

    // ── 1. Checklist System ──────────────────────────────────────────────
    const { data: rawChecklistTasks = [] } = useQuery({
        queryKey: ['sidebar-badges', 'checklist-tasks'],
        queryFn: () => fetchChecklistTasks().catch(() => []),
        staleTime: 45_000,
        enabled: isUserLoggedIn,
    });

    const { data: rawDelegationTasks = [] } = useQuery({
        queryKey: ['sidebar-badges', 'delegation-tasks'],
        queryFn: () => fetchDelegationTasks().catch(() => []),
        staleTime: 45_000,
        enabled: isUserLoggedIn,
    });

    // ── 2. Petty Cash System ─────────────────────────────────────────────
    const { data: pettyCashSummary } = useQuery({
        queryKey: ['sidebar-badges', 'petty-cash-summary'],
        queryFn: async () => {
            try {
                const res: any = await pettyCashDashboardApi.getSummary();
                return res?.data ?? res;
            } catch {
                try {
                    const expRes: any = await expensesApi.list({ status: 'PENDING' });
                    const list = Array.isArray(expRes) ? expRes : expRes?.data || [];
                    return { pendingExpensesCount: list.length };
                } catch {
                    return null;
                }
            }
        },
        staleTime: 45_000,
        enabled: isUserLoggedIn,
    });

    // ── 3. Document & Subscription System ────────────────────────────────
    const { data: documents = [] } = useQuery({
        queryKey: ['sidebar-badges', 'documents'],
        queryFn: async () => {
            try {
                const res: any = await documentsApi.list();
                return Array.isArray(res) ? res : res?.data || [];
            } catch {
                return [];
            }
        },
        staleTime: 60_000,
        enabled: isUserLoggedIn,
    });

    const { data: subscriptions = [] } = useQuery({
        queryKey: ['sidebar-badges', 'subscriptions'],
        queryFn: async () => {
            try {
                const res: any = await subscriptionsApi.list();
                return Array.isArray(res) ? res : res?.data || [];
            } catch {
                return [];
            }
        },
        staleTime: 60_000,
        enabled: isUserLoggedIn,
    });

    const { data: loans = [] } = useQuery({
        queryKey: ['sidebar-badges', 'loans'],
        queryFn: async () => {
            try {
                const res: any = await loansApi.list();
                return Array.isArray(res) ? res : res?.data || [];
            } catch {
                return [];
            }
        },
        staleTime: 60_000,
        enabled: isUserLoggedIn,
    });

    // ── 4. HR System ─────────────────────────────────────────────────────
    const { data: hrCounts } = useQuery({
        queryKey: ['sidebar-badges', 'hr-pending'],
        queryFn: async () => {
            try {
                const [indentRes, candRes, empRes, leaveRes, advRes, gateRes] = await Promise.all([
                    api.get('/hrfms/indent/get-pending').catch(() => null),
                    api.post('/hrfms/candidate/history', {}).catch(() => null),
                    api.get('/hrfms/employee').catch(() => null),
                    api.get('/hrfms/leave').catch(() => null),
                    api.get('/hrfms/advance-request').catch(() => null),
                    api.get('/hrfms/gate-pass').catch(() => null),
                ]);

                const safeList = (val: any) => {
                    if (Array.isArray(val)) return val;
                    if (val?.data && Array.isArray(val.data)) return val.data;
                    return [];
                };

                const indents = safeList(indentRes?.data?.data ?? indentRes?.data);
                const candidates = safeList(candRes?.data?.data ?? candRes?.data);
                const employees = safeList(empRes?.data?.data ?? empRes?.data);
                const leaves = safeList(leaveRes?.data?.data ?? leaveRes?.data);
                const advances = safeList(advRes?.data?.data ?? advRes?.data);
                const gatePasses = safeList(gateRes?.data?.data ?? gateRes?.data);

                return {
                    indent: indents.length,
                    candidate: candidates.filter(
                        (c: any) =>
                            String(c.applicationStatus || c.status || '').toLowerCase() === 'pending'
                    ).length,
                    afterJoining: employees.filter(
                        (e: any) =>
                            e.joiningTasksDone === 0 ||
                            e.joiningTasksDone === null ||
                            e.joiningTasksDone === undefined
                    ).length,
                    leave: leaves.filter(
                        (l: any) => String(l.status || '').toLowerCase() === 'pending'
                    ).length,
                    advance: advances.filter(
                        (a: any) => String(a.status || '').toLowerCase() === 'pending'
                    ).length,
                    gatePass: gatePasses.filter(
                        (g: any) => String(g.status || '').toLowerCase() === 'pending'
                    ).length,
                };
            } catch {
                return { indent: 0, candidate: 0, afterJoining: 0, leave: 0, advance: 0, gatePass: 0 };
            }
        },
        staleTime: 60_000,
        enabled: isUserLoggedIn,
    });

    // ── 5. Maintenance System ────────────────────────────────────────────
    const { data: maintCounts } = useMaintenanceProSidebarCountsQuery();

    // ── 6. Repair System ─────────────────────────────────────────────────
    const { data: repairIndents = [] } = useQuery({
        queryKey: ['sidebar-badges', 'repair-indents'],
        queryFn: async () => {
            try {
                const list = await repairSystemApi.getAllIndents();
                return Array.isArray(list) ? list : [];
            } catch {
                return [];
            }
        },
        staleTime: 45_000,
        enabled: isUserLoggedIn,
    });

    // ── Aggregate and memoize counts for instant lookups during render ────
    return useMemo(() => {
        try {
            const counts: Record<string, number> = {};

            // 1. Store System
            const issueRows = filterByFirmAccess(issueSheet || [], permittedFirms);
            const indentRows = filterByFirmAccess(indentSheet || [], permittedFirms);
            const storeInRows = filterByFirmAccess(storeInSheet || [], permittedFirms);
            const paymentsRows = filterByFirmAccess(paymentsSheet || [], permittedFirms);

            counts['/store/inventory/issue-data'] = issueRows.filter(
                (s: any) =>
                    s.planned1 &&
                    s.planned1.toString().trim() !== '' &&
                    (!s.actual1 || s.actual1.toString().trim() === '')
            ).length;

            counts['/store/indents/approve'] = indentRows.filter(
                (s: any) => !s.actual1 || s.actual1.toString().trim() === ''
            ).length;

            counts['/store/indents/vendor-rates'] = indentRows.filter(
                (s: any) =>
                    s.planned2 &&
                    s.planned2.toString().trim() !== '' &&
                    (!s.actual2 || s.actual2.toString().trim() === '')
            ).length;

            counts['/store/indents/technical-approval'] = indentRows.filter(
                (s: any) =>
                    s.planned3 &&
                    s.planned3.toString().trim() !== '' &&
                    (!s.actual3 || s.actual3.toString().trim() === '') &&
                    !s.vendor1Rank &&
                    !s.vendor1_rank
            ).length;

            counts['/store/indents/management-approval'] = indentRows.filter(
                (s: any) =>
                    s.planned4 &&
                    s.planned4.toString().trim() !== '' &&
                    (!s.actual4 || s.actual4.toString().trim() === '') &&
                    (!s.approvedVendorName || s.approvedVendorName.toString().trim() === '') &&
                    (!s.approved_vendor_name || s.approved_vendor_name.toString().trim() === '')
            ).length;

            counts['/store/procurement/pending-po'] = indentRows.filter(
                (s: any) =>
                    (s.poRequred === 'Yes' ||
                        s.po_requred === 'Yes' ||
                        s.actual4 ||
                        s.approvedVendorName ||
                        s.approved_vendor_name) &&
                    (!s.poNumber || s.poNumber.toString().trim() === '') &&
                    (!s.po_number || s.po_number.toString().trim() === '')
            ).length;

            counts['/store/procurement/lifting'] = indentRows.filter((s: any) => {
                const poNum = String(s.poNumber || s.po_number || '').trim();
                const isPoCreated = Boolean(poNum !== '' && poNum !== '-');
                const appQty = Number(
                    s.approvedQuantity || s.approved_quantity || s.quantity || 0
                );
                const pendingQty = s.pendingPoQty != null ? Number(s.pendingPoQty) : appQty;
                return isPoCreated && pendingQty > 0;
            }).length;

            counts['/store/receipts/store-in'] = storeInRows.filter(
                (i: any) => i.planned6 && i.planned6 !== '' && !i.actual6
            ).length;

            counts['/store/receipts/hod-check'] = storeInRows.filter(
                (s: any) =>
                    s.hod_status === 'Pending' ||
                    s.hodStatus === 'Pending' ||
                    (s.plannedHod && (!s.actualHod || s.actualHod === ''))
            ).length;

            counts['/store/finance/make-payment'] = paymentsRows.filter(
                (p: any) => !p.actual && p.status1 !== 'hod_approval_pending'
            ).length;

            // 2. Checklist & Delegation System
            const permittedChecklist = filterByFirmAccess(rawChecklistTasks, permittedFirms, {
                id: (t: any) => t.firm_id ?? undefined,
                name: (t: any) => t.firm_name ?? undefined,
            });
            const permittedDelegation = filterByFirmAccess(rawDelegationTasks, permittedFirms, {
                id: (t: any) => t.firm_id ?? undefined,
                name: (t: any) => t.firm_name ?? undefined,
            });

            // Checklist Submission: pending doer submission
            counts['/checklist/submit/checklist'] = permittedChecklist.filter(
                (t: any) =>
                    (!t.status || t.status === 'pending' || t.status === 'rejected') &&
                    !t.submission_date
            ).length;

            // Delegation Submission: pending doer submission
            counts['/checklist/submit/delegation'] = permittedDelegation.filter(
                (t: any) =>
                    (!t.status || t.status === 'pending' || t.status === 'rejected') &&
                    !t.submission_date
            ).length;

            // Admin Approval: completed tasks awaiting verification
            counts['/checklist/approval'] =
                permittedChecklist.filter((t: any) => t.status === 'done').length +
                permittedDelegation.filter(
                    (t: any) => t.status === 'done' || t.status === 'extend'
                ).length;

            // 3. Petty Cash System
            counts['/petty-cash/entries'] = Number(pettyCashSummary?.pendingExpensesCount || 0);

            // 4. Document & Subscription System
            const in30Days = new Date();
            in30Days.setDate(in30Days.getDate() + 30);

            counts['/document/renewal'] = documents.filter((doc: any) => {
                if (!doc.needsRenewal) return false;
                if (!doc.renewalDate) return true;
                const renDate = new Date(doc.renewalDate);
                return renDate <= in30Days;
            }).length;

            counts['/document/subscription/approval'] = subscriptions.filter(
                (s: any) => !s.status || s.status === 'Pending'
            ).length;

            counts['/document/subscription/payment'] = subscriptions.filter(
                (s: any) => s.status === 'Approved'
            ).length;

            counts['/document/subscription/renewal'] = subscriptions.filter((sub: any) => {
                if (sub.status !== 'Paid' || !sub.endDate) return false;
                const endDate = new Date(sub.endDate);
                return endDate <= in30Days;
            }).length;

            counts['/document/loan/foreclosure'] = loans.filter(
                (l: any) => !l.foreclosureStatus && l.status !== 'Closed'
            ).length;

            counts['/document/loan/noc'] = loans.filter(
                (l: any) => l.documentStatus === 'Yes' && !l.collectNocStatus
            ).length;

            // 5. HR System
            if (hrCounts) {
                counts['/hr/indent'] = hrCounts.indent;
                counts['/hr/find-enquiry'] = hrCounts.candidate;
                counts['/hr/after-joining'] = hrCounts.afterJoining;
                counts['/hr/gate-pass'] = hrCounts.gatePass;
                counts['/hr/leave'] = hrCounts.leave;
                counts['/hr/advance'] = hrCounts.advance;
            }

            // 6. Maintenance Management System
            if (maintCounts) {
                counts['/maintenance/tasks'] = Number(maintCounts.scheduleMaintenance || 0);
                counts['/maintenance/pending'] = Number(maintCounts.adminApproval || 0);
                counts['/maintenance/breakdown-log'] = Number(maintCounts.breakdownLog || 0);
            }

            // 7. Repair Management System
            if (maintCounts) {
                counts['/repair/tasks'] = Number(maintCounts.repair || 0);
            }

            if (repairIndents.length > 0) {
                // Pending Store-In (Dispatched for repair but not yet received back in store)
                counts['/repair/storein'] = repairIndents.filter((i: any) => {
                    const isOuthouse =
                        i.approvalStatus === 'Outhouse' || i.routingType === 'OUTHOUSE';
                    if (!isOuthouse) return false;
                    const isDispatched = Boolean(
                        i.outhouseRepair?.transporterName ||
                        i.outhouseRepair?.sentAt ||
                        i.taskStatus === 'Sent for Repair' ||
                        i.taskStatus === 'Store In' ||
                        i.taskStatus === 'Completed' ||
                        i.taskStatus === 'Payment Done'
                    );
                    const isStoreIn = Boolean(
                        i.outhouseRepair?.receivedAt ||
                        i.storeInDetails?.receivedAt ||
                        i.taskStatus === 'Store In' ||
                        i.taskStatus === 'Completed' ||
                        i.taskStatus === 'Payment Done'
                    );
                    return isDispatched && !isStoreIn;
                }).length;

                // Pending Sent Machine (Approved for outhouse repair but not yet dispatched)
                counts['/repair/sentmachine'] = repairIndents.filter((i: any) => {
                    const isOuthouse =
                        i.approvalStatus === 'Outhouse' || i.routingType === 'OUTHOUSE';
                    if (!isOuthouse) return false;
                    const isDispatched = Boolean(
                        i.outhouseRepair?.transporterName ||
                        i.outhouseRepair?.sentAt ||
                        i.taskStatus === 'Sent for Repair' ||
                        i.taskStatus === 'Store In' ||
                        i.taskStatus === 'Completed' ||
                        i.taskStatus === 'Payment Done'
                    );
                    return !isDispatched;
                }).length;

                // Pending Repair Payment (Store in completed but payment not settled)
                counts['/repair/payment'] = repairIndents.filter((i: any) => {
                    const isOuthouse =
                        i.approvalStatus === 'Outhouse' || i.routingType === 'OUTHOUSE';
                    if (!isOuthouse) return false;
                    const isStoreIn = Boolean(
                        i.outhouseRepair?.receivedAt ||
                        i.storeInDetails?.receivedAt ||
                        i.taskStatus === 'Store In' ||
                        i.taskStatus === 'Completed' ||
                        i.taskStatus === 'Payment Done'
                    );
                    const remainingDue = i.outhouseRepair?.toBePaidAmount;
                    const isSettled =
                        i.taskStatus === 'Payment Done' ||
                        i.taskStatus === 'Completed' ||
                        (Boolean(i.outhouseRepair?.paidAt) &&
                            remainingDue !== undefined &&
                            remainingDue !== null &&
                            remainingDue <= 0);
                    return isStoreIn && !isSettled;
                }).length;
            }

            return counts;
        } catch (e) {
            console.error('Error computing sidebar badge counts:', e);
            return {};
        }
    }, [
        user,
        indentSheet,
        storeInSheet,
        issueSheet,
        paymentsSheet,
        rawChecklistTasks,
        rawDelegationTasks,
        pettyCashSummary,
        documents,
        subscriptions,
        loans,
        hrCounts,
        maintCounts,
        repairIndents,
    ]);
}
