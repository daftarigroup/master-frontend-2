import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppSelector } from '@/store/hook';
import { selectOrgViewMode } from '@/store/slice/userAccountData';
import {
  createDailyMachineLog,
  fetchDailyMachineLogs,
  fetchMachineLogStats,
  fetchRealMachines,
} from '../../services/dailyMachineLogApi';
import type { CreateDailyMachineLogDto } from '../../types/types';

const KEYS = {
  logs: (params?: { machineId?: string; firmId?: string; date?: string; page?: number; limit?: number }) => [
    'maintenance',
    'daily-machine-logs',
    params ?? {},
  ],
  stats: ['maintenance', 'daily-machine-logs', 'stats'],
  machines: ['maintenance', 'machines-simple'],
};

// "All Companies" (docs/organizationplan/08-all-companies-rollout.md) —
// orgViewMode folded into the key so toggling doesn't keep serving a stale
// single-company list past this query's staleTime.
export const useDailyMachineLogs = (params?: {
  machineId?: string;
  firmId?: string;
  date?: string;
  page?: number;
  limit?: number;
}) => {
  const orgViewMode = useAppSelector(selectOrgViewMode);
  return useQuery({
    queryKey: [...KEYS.logs(params), orgViewMode],
    queryFn: () => fetchDailyMachineLogs(params),
    staleTime: 2 * 60 * 1000,
    gcTime: 4 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useMachineLogStats = () =>
  useQuery({
    queryKey: KEYS.stats,
    queryFn: fetchMachineLogStats,
    staleTime: 2 * 60 * 1000,
    gcTime: 4 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

export const useRealMachinesForLog = (actAsTenantId?: string) =>
  useQuery({
    queryKey: [...KEYS.machines, actAsTenantId],
    queryFn: () => fetchRealMachines(actAsTenantId),
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

export const useCreateDailyMachineLog = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      dto,
      actAsTenantId,
    }: {
      dto: CreateDailyMachineLogDto;
      actAsTenantId?: string;
    }) => createDailyMachineLog(dto, actAsTenantId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maintenance', 'daily-machine-logs'] });
    },
  });
};
