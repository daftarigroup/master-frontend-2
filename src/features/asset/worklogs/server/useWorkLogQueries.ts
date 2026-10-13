import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DailyEntryBody } from '@/features/asset/fleet/types/types';
import type { CreateWorkLogBody, WorkLogFields, WorkLogQuery } from '../types';
import { workLogsApi } from './workLogsApi';

export const useWorkLogs = (p: WorkLogQuery, enabled = true) =>
  useQuery({ queryKey: ['fleet', 'worklogs', 'list', p], queryFn: () => workLogsApi.list(p), enabled, placeholderData: keepPreviousData, staleTime: 15_000 });

export const useWorkLog = (id: string | null) =>
  useQuery({ queryKey: ['fleet', 'worklogs', 'one', id], queryFn: () => workLogsApi.get(id!), enabled: !!id, staleTime: 15_000 });

export const useWorkLogPrefill = (machineId: string | undefined) =>
  useQuery({ queryKey: ['fleet', 'worklogs', 'prefill', machineId], queryFn: () => workLogsApi.prefill(machineId!), enabled: !!machineId, staleTime: 10_000 });

export const useWorkTypes = (firmId: string | undefined) =>
  useQuery({ queryKey: ['fleet', 'worklogs', 'work-types', firmId ?? null], queryFn: () => workLogsApi.workTypes(firmId), staleTime: 5 * 60_000 });

export const usePickerMachines = (firmId?: string) =>
  useQuery({ queryKey: ['fleet', 'equipment', 'picker', firmId], queryFn: () => workLogsApi.machines(firmId), staleTime: 60_000 });

/** A work log feeds hours, fuel, cost and utilization, so every change refreshes all of those queries. */
function useRefresh() {
  const qc = useQueryClient();
  return () => Promise.all([qc.invalidateQueries({ queryKey: ['fleet', 'worklogs'] }), qc.invalidateQueries({ queryKey: ['fleet', 'equipment'] }), qc.invalidateQueries({ queryKey: ['fleet', 'cost'] })]);
}

export const useCreateWorkLog = () => {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (b: CreateWorkLogBody) => workLogsApi.create(b), onSuccess: refresh });
};
export const useUpdateWorkLog = () => {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (v: { id: string; body: WorkLogFields }) => workLogsApi.update(v.id, v.body), onSuccess: refresh });
};
export const useApproveWorkLog = () => {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (id: string) => workLogsApi.approve(id), onSuccess: refresh });
};
export const useRejectWorkLog = () => {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (v: { id: string; reason: string }) => workLogsApi.reject(v.id, v.reason), onSuccess: refresh });
};
export const useReopenWorkLog = () => {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (v: { id: string; note: string }) => workLogsApi.reopen(v.id, v.note), onSuccess: refresh });
};
export const useBulkApprove = () => {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (ids: string[]) => workLogsApi.bulkApprove(ids), onSuccess: refresh });
};
