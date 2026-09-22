import { useQueries } from '@tanstack/react-query';
import { fetchBreakdowns } from '../../../breakdown_log/services/breakdownApi';
import { fetchWorkOrders } from '../../../unique_task/server/api/workordersApi';

export interface MaintenanceProSidebarCounts {
  adminApproval: number;
  repair: number;
  breakdownLog: number;
  scheduleMaintenance: number;
}

// Asia/Kolkata is a fixed UTC+5:30 offset year-round (no DST). Due dates are
// stored as IST midnight in UTC (e.g. 2026-08-04T18:30:00.000Z for Aug 5
// IST), so "today's IST midnight" is the exact instant to cap `to` at for a
// due-today-or-earlier ("Pending") count — same definition the page's own
// Pending stat card uses server-side.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
function todayISTMidnightISO() {
  const istNow = new Date(Date.now() + IST_OFFSET_MS);
  const ms = Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate());
  return new Date(ms - IST_OFFSET_MS).toISOString();
}

// Reuses the exact query keys/fetchers each page's own "pending" hook already
// uses, so this shares cache with those pages and picks up their
// invalidateQueries() calls immediately.
export function useMaintenanceProSidebarCountsQuery(): {
  data: MaintenanceProSidebarCounts | undefined;
} {
  const results = useQueries({
    queries: [
      {
        queryKey: ['maintenance', 'work-orders', { status: 'PENDING_APPROVAL', limit: 100 }],
        queryFn: () => fetchWorkOrders({ status: 'PENDING_APPROVAL', limit: 100 }),
        staleTime: 30_000,
      },
      {
        queryKey: ['maintenance', 'work-orders', 'repair', {}],
        queryFn: () => fetchWorkOrders({ repairOnly: true, limit: 100 }),
        staleTime: 30_000,
      },
      {
        queryKey: ['maintenance', 'breakdowns', { isResolved: false }],
        queryFn: () => fetchBreakdowns({ isResolved: false, limit: 100 }),
        staleTime: 30_000,
      },
      {
        // Same definition as the "Pending" stat card on Schedule Maintenance
        // itself (status PENDING/IN_PROGRESS/OVERDUE, due today-or-earlier,
        // repair-flagged tasks excluded since those are already counted under
        // the separate Repair badge) — backend scopes this to the current
        // user's own tasks automatically when they're not an admin, same as
        // every other count here. Without the `to` cap this counted every
        // occurrence out to the full 60-day generation horizon instead of
        // just what's actually due now (hence badges reading "99+" while the
        // page's own Pending card showed a single-digit number). OVERDUE is
        // included alongside PENDING/IN_PROGRESS to match
        // WorkOrderService.getStats' "pending" bucket — a task the cron has
        // already flipped to the literal OVERDUE status is still incomplete
        // work, not a separate thing from "pending" (see WorkOrderService.ts).
        queryKey: [
          'maintenance',
          'work-orders',
          {
            status: 'PENDING,IN_PROGRESS,OVERDUE',
            excludeRepair: true,
            to: todayISTMidnightISO(),
            limit: 100,
          },
        ],
        queryFn: () =>
          fetchWorkOrders({
            status: 'PENDING,IN_PROGRESS,OVERDUE',
            excludeRepair: true,
            to: todayISTMidnightISO(),
            limit: 100,
          }),
        staleTime: 30_000,
      },
    ],
  });

  const [adminApprovalQ, repairQ, breakdownQ, scheduleMaintenanceQ] = results;

  return {
    data: {
      adminApproval:
        adminApprovalQ.data?.pagination?.total ?? adminApprovalQ.data?.data.length ?? 0,
      repair: repairQ.data?.pagination?.total ?? repairQ.data?.data.length ?? 0,
      breakdownLog: breakdownQ.data?.pagination?.total ?? breakdownQ.data?.data.length ?? 0,
      scheduleMaintenance:
        scheduleMaintenanceQ.data?.pagination?.total ?? scheduleMaintenanceQ.data?.data.length ?? 0,
    },
  };
}
