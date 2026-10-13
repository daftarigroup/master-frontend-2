import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppSelector } from '@/store/hook';
import { selectOrgViewMode } from '@/store/slice/userAccountData';
import {
  approveWorkOrder,
  deleteWorkOrder,
  fetchMachineParts,
  fetchWorkOrderById,
  fetchWorkOrderStats,
  fetchWorkOrders,
  type ProcessRepairDto,
  processRepairWorkOrder,
  type ReportWorkOrderDto,
  rejectWorkOrder,
  reportWorkOrder,
  skipWorkOrder,
  type WorkOrderStatsParams,
  type WorkOrdersQueryParams,
} from '../api/workordersApi';

// "All Companies" (docs/organizationplan/08-all-companies-rollout.md) —
// orgViewMode folded into every key below so toggling doesn't keep serving a
// stale single-company list past each query's staleTime.
//
// NOTE: none of the queries below set `refetchOnMount: false`. Mutations
// elsewhere (e.g. Assign Task's useCreatePlan) invalidate the
// ['maintenance','work-orders'] key while this page is unmounted/inactive,
// which only marks the cached query stale — it doesn't refetch until
// something re-subscribes. `refetchOnMount:false` used to suppress exactly
// that refetch on remount, so navigating back to Schedule Maintenance kept
// showing the old list until a full page reload. Leaving refetchOnMount at
// its default (true) means a stale query refetches on mount; `staleTime`
// below still avoids refetching on every remount when nothing has changed.
export const useWorkOrders = (params: WorkOrdersQueryParams = {}, options?: { enabled?: boolean }) => {
  const orgViewMode = useAppSelector(selectOrgViewMode);
  return useQuery({
    queryKey: ['maintenance', 'work-orders', params, orgViewMode],
    queryFn: () => fetchWorkOrders(params),
    enabled: options?.enabled ?? true,
    staleTime: 2 * 60 * 1000,
    gcTime: 4 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useWorkOrderStats = (params: WorkOrderStatsParams = {}) => {
  const orgViewMode = useAppSelector(selectOrgViewMode);
  return useQuery({
    queryKey: ['maintenance', 'work-orders', 'stats', params, orgViewMode],
    queryFn: () => fetchWorkOrderStats(params),
    staleTime: 2 * 60 * 1000,
    gcTime: 4 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useRepairWorkOrders = (params: Omit<WorkOrdersQueryParams, 'repairOnly'> = {}) => {
  const orgViewMode = useAppSelector(selectOrgViewMode);
  return useQuery({
    queryKey: ['maintenance', 'work-orders', 'repair', params, orgViewMode],
    queryFn: () => fetchWorkOrders({ ...params, repairOnly: true }),
    staleTime: 2 * 60 * 1000,
    gcTime: 4 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useRepairHistoryWorkOrders = (
  params: Omit<WorkOrdersQueryParams, 'repairHistory'> = {}
) => {
  const orgViewMode = useAppSelector(selectOrgViewMode);
  return useQuery({
    queryKey: ['maintenance', 'work-orders', 'repair-history', params, orgViewMode],
    queryFn: () => fetchWorkOrders({ ...params, repairHistory: true }),
    staleTime: 2 * 60 * 1000,
    gcTime: 4 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useWorkOrderById = (id: string | null) =>
  useQuery({
    queryKey: ['maintenance', 'work-order', id],
    queryFn: () => fetchWorkOrderById(id!),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
    gcTime: 4 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

export const useReportWorkOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReportWorkOrderDto }) =>
      reportWorkOrder(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maintenance', 'work-orders'] });
      qc.invalidateQueries({ queryKey: ['maintenance', 'breakdowns'] });
      qc.invalidateQueries({ queryKey: ['maintenance', 'records'] });
    },
  });
};

export const useApproveWorkOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reviewNote }: { id: string; reviewNote?: string }) =>
      approveWorkOrder(id, reviewNote),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maintenance', 'work-orders'] });
      qc.invalidateQueries({ queryKey: ['maintenance', 'breakdowns'] });
      qc.invalidateQueries({ queryKey: ['maintenance', 'records'] });
    },
  });
};

export const useRejectWorkOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reviewNote }: { id: string; reviewNote?: string }) =>
      rejectWorkOrder(id, reviewNote),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maintenance', 'work-orders'] });
      qc.invalidateQueries({ queryKey: ['maintenance', 'breakdowns'] });
    },
  });
};

export const useSkipWorkOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, skipReason }: { id: string; skipReason: string }) =>
      skipWorkOrder(id, skipReason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maintenance', 'work-orders'] });
      qc.invalidateQueries({ queryKey: ['maintenance', 'breakdowns'] });
    },
  });
};

export const useDeleteWorkOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteWorkOrder(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maintenance', 'work-orders'] });
      qc.invalidateQueries({ queryKey: ['maintenance', 'breakdowns'] });
    },
  });
};

export const useMachineParts = (machineId: string | null) =>
  useQuery({
    queryKey: ['maintenance', 'machine-parts', machineId],
    queryFn: () => fetchMachineParts(machineId!),
    enabled: !!machineId,
    staleTime: 2 * 60 * 1000,
    gcTime: 4 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

export const useProcessRepairWorkOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProcessRepairDto }) =>
      processRepairWorkOrder(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['maintenance', 'work-orders'] }),
  });
};
