import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppSelector } from '@/store/hook';
import { selectOrgViewMode } from '@/store/slice/userAccountData';
import {
  createBreakdown,
  fetchAvailableTechnicians,
  fetchBreakdowns,
  fetchMachinesForBreakdown,
  resolveBreakdown,
  updateBreakdownStatus,
} from '../../services/breakdownApi';
import type { BreakdownStatus, CreateBreakdownDto, ResolveBreakdownDto } from '../../types/types';

const BD_KEY = ['maintenance', 'breakdowns'];

// "All Companies" (docs/organizationplan/08-all-companies-rollout.md) —
// orgViewMode folded into the key so toggling doesn't keep serving a stale
// single-company list past this query's staleTime.
export const useBreakdowns = (params?: {
  machineId?: string;
  isResolved?: boolean;
  severity?: string;
  page?: number;
  limit?: number;
}) => {
  const orgViewMode = useAppSelector(selectOrgViewMode);
  return useQuery({
    queryKey: [...BD_KEY, params, orgViewMode],
    queryFn: () => fetchBreakdowns(params),
    staleTime: 2 * 60 * 1000,
    gcTime: 4 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useBreakdownMachines = (actAsTenantId?: string) =>
  useQuery({
    queryKey: ['maintenance', 'machines-bd', actAsTenantId],
    queryFn: () => fetchMachinesForBreakdown(actAsTenantId),
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

// Excludes anyone on approved/partial leave today — see
// BreakdownService.getAvailableTechnicians. A short staleTime (unlike the
// machines list above) since who's on leave can change same-day.
export const useAvailableTechnicians = (actAsTenantId?: string) =>
  useQuery({
    queryKey: ['maintenance', 'available-technicians-bd', actAsTenantId],
    queryFn: () => fetchAvailableTechnicians(actAsTenantId),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

export const useCreateBreakdown = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dto, actAsTenantId }: { dto: CreateBreakdownDto; actAsTenantId?: string }) =>
      createBreakdown(dto, actAsTenantId),
    onSuccess: () => qc.invalidateQueries({ queryKey: BD_KEY }),
  });
};

export const useResolveBreakdown = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: ResolveBreakdownDto }) =>
      resolveBreakdown(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: BD_KEY }),
  });
};

export const useUpdateBreakdownStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: BreakdownStatus }) =>
      updateBreakdownStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: BD_KEY }),
  });
};
