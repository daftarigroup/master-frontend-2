import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateEntryBody, CreateRateBody, LogKind } from '../types';
import { costApi, type FleetCostQuery } from './costApi';

export const useMachineCost = (id: string | undefined, p: { month?: string; category?: string; wbsId?: string }) =>
  useQuery({ queryKey: ['fleet', 'cost', 'machine', id, p], queryFn: () => costApi.machine(id!, p), enabled: !!id, placeholderData: keepPreviousData, staleTime: 20_000 });

export const useMachineTrend = (id: string | undefined, month: string | undefined, enabled = true) =>
  useQuery({ queryKey: ['fleet', 'cost', 'trend', id, month], queryFn: () => costApi.trend(id!, { month, months: 6 }), enabled: !!id && enabled, staleTime: 60_000 });

export const useCostLogs = <K extends LogKind>(id: string | undefined, kind: K, month: string | undefined, enabled: boolean) =>
  useQuery({ queryKey: ['fleet', 'cost', 'logs', id, kind, month], queryFn: () => costApi.logs(id!, kind, { month, limit: 200 }), enabled: !!id && enabled, staleTime: 20_000 });

export const useFleetCosts = (p: FleetCostQuery) =>
  useQuery({ queryKey: ['fleet', 'cost', 'fleet', p], queryFn: () => costApi.fleet(p), placeholderData: keepPreviousData, staleTime: 20_000 });

export const useWbs = (firmId: string | null | undefined, enabled = true) =>
  useQuery({ queryKey: ['fleet', 'wbs', firmId ?? null], queryFn: () => costApi.wbs({ firmId }), enabled, staleTime: 5 * 60_000 });

/** Every cost number depends on rates and entries, so a successful change refreshes all cost and equipment queries. */
function useRefreshCosts() {
  const qc = useQueryClient();
  return () => Promise.all([qc.invalidateQueries({ queryKey: ['fleet', 'cost'] }), qc.invalidateQueries({ queryKey: ['fleet', 'equipment'] })]);
}

export const useCreateRate = (machineId: string) => {
  const refresh = useRefreshCosts();
  return useMutation({ mutationFn: (b: CreateRateBody) => costApi.createRate(machineId, b), onSuccess: refresh });
};
export const useEndRate = (machineId: string) => {
  const refresh = useRefreshCosts();
  return useMutation({ mutationFn: (v: { rateId: string; endDate: string }) => costApi.endRate(machineId, v.rateId, v.endDate), onSuccess: refresh });
};
export const useCreateCostEntry = () => {
  const refresh = useRefreshCosts();
  return useMutation({ mutationFn: (b: CreateEntryBody) => costApi.createEntry(b), onSuccess: refresh });
};
export const useVoidCostEntry = () => {
  const refresh = useRefreshCosts();
  return useMutation({ mutationFn: (v: { id: string; reason: string }) => costApi.voidEntry(v.id, v.reason), onSuccess: refresh });
};
export const useCreateWbs = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { firmId: string | number; code: string; name: string; parentId?: string | null; siteLocationId?: string | number | null }) =>
      costApi.createWbs(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fleet', 'wbs'] });
      qc.invalidateQueries({ queryKey: ['fleet', 'cost'] });
    },
  });
};
