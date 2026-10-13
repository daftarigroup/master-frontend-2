import { useQueries } from '@tanstack/react-query';
import { api } from '@/lib/axios';

/**
 * Sidebar badges for the work-log, service, transfer and task screens. Each is one cheap request that returns a number only:
 *   work logs awaiting MY approval, services overdue, transfers on the road, work orders assigned to me.
 * A failed or forbidden request counts as zero (a badge must never break the sidebar).
 */
export function useOpsBadgeCounts(enabled: boolean): Record<string, number> {
  const [workLogs, overdue, transit, mine] = useQueries({
    queries: [
      { queryKey: ['sidebar-badges', 'work-log-approvals'], queryFn: () => api.get('/fleet/work-logs/approval-count').then((r) => Number(r.data?.data?.count ?? 0)).catch(() => 0), staleTime: 45_000, enabled },
      { queryKey: ['sidebar-badges', 'services-overdue'], queryFn: () => api.get('/maintenance/records', { params: { limit: 1, dueStatus: 'OVERDUE' } }).then((r) => Number(r.data?.data?.stats?.overdue ?? 0)).catch(() => 0), staleTime: 60_000, enabled },
      { queryKey: ['sidebar-badges', 'transfers-in-transit'], queryFn: () => api.get('/fleet/transfers', { params: { status: 'IN_TRANSIT', limit: 1 } }).then((r) => Number(r.data?.data?.total ?? 0)).catch(() => 0), staleTime: 60_000, enabled },
      { queryKey: ['sidebar-badges', 'tasks-assigned-to-me'], queryFn: () => api.get('/maintenance/work-orders', { params: { view: 'assigned', status: 'PENDING,IN_PROGRESS,OVERDUE', limit: 1 } }).then((r) => Number(r.data?.pagination?.total ?? 0)).catch(() => 0), staleTime: 45_000, enabled },
    ],
  });
  return {
    '/asset/work-logs': workLogs.data ?? 0,
    '/maintenance/records': overdue.data ?? 0,
    '/maintenance/assignments': transit.data ?? 0,
    // tasks assigned to me show on the existing Work Orders entry
    '/maintenance/work-orders': mine.data ?? 0,
  };
}
