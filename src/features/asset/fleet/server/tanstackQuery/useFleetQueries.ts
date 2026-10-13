import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fleetApi } from '../api/fleetApi';
import type { DailyEntryBody, DieselLogQuery, OwnershipType } from '../../types/types';

const K = 'fleet';
/** The API needs a real firm id; 'all', '' and junk mean "no specific firm". */
export const isFirmId = (v?: string | null): v is string => !!v && /^\d+$/.test(v);

export const useFleetMachines = (p: { firmId?: string | null; ownership?: OwnershipType; q?: string }) =>
  useQuery({
    queryKey: [K, 'machines', p],
    queryFn: () => fleetApi.machines({ ...p, firmId: isFirmId(p.firmId) ? p.firmId : undefined }),
    staleTime: 30_000,
  });

export const useDieselLogs = (p: DieselLogQuery) =>
  useQuery({
    queryKey: [K, 'diesel-logs', p],
    queryFn: () => fleetApi.dieselLogs({ ...p, firmId: isFirmId(p.firmId) ? p.firmId : undefined }),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });

export const useMachineHistory = (machineId: string | undefined, range: { from?: string; to?: string }) =>
  useQuery({
    queryKey: [K, 'history', machineId, range],
    queryFn: () => fleetApi.history(machineId!, range),
    enabled: !!machineId,
  });

export const useLedger = (p: { firmId?: string | null; month: string; includeIdle?: boolean }) =>
  useQuery({
    queryKey: [K, 'ledger', p],
    queryFn: () => fleetApi.ledger({ firmId: p.firmId!, month: p.month, includeIdle: p.includeIdle }),
    enabled: isFirmId(p.firmId),
    placeholderData: keepPreviousData,
  });

export const useEfficiency = (p: { firmId?: string | null; from: string; to: string }) =>
  useQuery({
    queryKey: [K, 'efficiency', p],
    queryFn: () => fleetApi.efficiency({ firmId: isFirmId(p.firmId) ? p.firmId : undefined, from: p.from, to: p.to }),
  });

export const useFleetAlerts = (firmId?: string | null) =>
  useQuery({
    queryKey: [K, 'alerts', firmId ?? 'all'],
    queryFn: () => fleetApi.alerts({ firmId: isFirmId(firmId) ? firmId : undefined }),
    staleTime: 60_000,
  });

/** Every fleet write invalidates every fleet read: ledger, machine pickers, history and alerts move together. */
function useFleetMutation<TArgs, TRes>(fn: (a: TArgs) => Promise<TRes>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: [K] }) });
}

export const useVoidUsage = () => useFleetMutation((a: { id: string; reason: string }) => fleetApi.voidUsage(a.id, a.reason));
export const useVoidDiesel = () => useFleetMutation((a: { id: string; reason: string }) => fleetApi.voidDiesel(a.id, a.reason));
