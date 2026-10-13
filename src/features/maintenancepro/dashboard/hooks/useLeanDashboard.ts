import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { fleetApi } from '@/features/asset/fleet/server/api/fleetApi';
import { istToday } from '@/features/asset/fleet/lib/format';

// Lean dashboard data. Every call is scoped by the workspace firm (undefined = all permitted firms).
const opts = { staleTime: 60_000, refetchOnWindowFocus: false } as const;
const firmParams = (firmId?: string) => (firmId ? { firmId } : {});

export interface AttentionWorkOrder {
  id: string;
  workOrderCode?: string | null;
  title?: string | null;
  priority?: number | null;
  actualDueDate?: string | null;
  status?: string;
  machine?: { name: string } | null;
}

export const useWoStats = (firmId?: string) =>
  useQuery({
    queryKey: ['maintenance', 'lean-dashboard', 'wo-stats', firmId ?? 'all'],
    queryFn: async () => {
      const r = await api.get('/maintenance/work-orders/stats', { params: firmParams(firmId) });
      return r.data?.data as { pending: number; overdue: number };
    },
    ...opts,
  });

export const useOverdueWorkOrders = (firmId?: string) =>
  useQuery({
    queryKey: ['maintenance', 'lean-dashboard', 'overdue-wo', firmId ?? 'all'],
    queryFn: async () => {
      const r = await api.get('/maintenance/work-orders', {
        params: { ...firmParams(firmId), overdue: true, page: 1, limit: 8 },
      });
      return (r.data?.data ?? []) as AttentionWorkOrder[];
    },
    ...opts,
  });

export interface OpenBreakdown {
  id: string;
  breakdownNumber?: string | null;
  machineName: string;
  severity: string;
  description: string;
  reportedAt: string;
}

export const useOpenBreakdowns = (firmId?: string) =>
  useQuery({
    queryKey: ['maintenance', 'lean-dashboard', 'open-breakdowns', firmId ?? 'all'],
    queryFn: async () => {
      const r = await api.get('/maintenance/breakdowns', {
        params: { ...firmParams(firmId), isResolved: false, page: 1, limit: 8 },
      });
      return {
        total: (r.data?.pagination?.total ?? 0) as number,
        items: (r.data?.data ?? []) as OpenBreakdown[],
      };
    },
    ...opts,
  });

export const useMachinesDown = (firmId?: string) =>
  useQuery({
    queryKey: ['maintenance', 'lean-dashboard', 'machines-down', firmId ?? 'all'],
    queryFn: async () => {
      const count = async (status: string) => {
        const r = await api.get('/maintenance/machines', {
          params: { ...firmParams(firmId), status, page: 1, limit: 1 },
        });
        return (r.data?.pagination?.total ?? 0) as number;
      };
      const [a, b] = await Promise.all([count('BREAKDOWN'), count('UNDER_MAINTENANCE')]);
      return a + b;
    },
    ...opts,
  });

/** Litres of diesel issued from the 1st of the current IST month to today (sum of GET /fleet/efficiency). */
export const useDieselThisMonth = (firmId?: string) => {
  const to = istToday();
  const from = `${to.slice(0, 7)}-01`;
  return useQuery({
    queryKey: ['fleet', 'efficiency-month-total', firmId ?? 'all', from, to],
    queryFn: async () => {
      const rows = await fleetApi.efficiency({ firmId, from, to });
      return rows.reduce((s, r) => s + (Number(r.litres) || 0), 0);
    },
    ...opts,
  });
};
