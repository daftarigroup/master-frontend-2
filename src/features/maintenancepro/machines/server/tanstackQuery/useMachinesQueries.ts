import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppSelector } from '@/store/hook';
import { selectOrgViewMode } from '@/store/slice/userAccountData';
import type { CreateMachinePayload } from '../../types/types';
import * as api from '../api/machinesApi';

export const machinesKeys = {
  all: ['maintenancepro', 'machines'] as const,
  list: () => [...machinesKeys.all, 'list'] as const,
  detail: (id: string | number) => [...machinesKeys.all, 'detail', id] as const,
};

// actAsTenantId: the company picked via CompanySelectField/useCompanyPinForCreate
// for a create-flow (e.g. New Repair Task) — scopes this dropdown's options to
// that company instead of the merged "All Companies" list once one is picked.
export const useMachines = (
  params?: {
    firmId?: string;
    needMaintenance?: boolean;
    departmentId?: string;
    assetId?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
    ownershipType?: 'OWNED' | 'RENTED';
  },
  actAsTenantId?: string,
  options?: { enabled?: boolean }
) => {
  // "All Companies" (docs/organizationplan/08-all-companies-rollout.md) —
  // orgViewMode folded into the key so toggling doesn't keep serving a
  // stale single-company page past this query's 5min staleTime.
  const orgViewMode = useAppSelector(selectOrgViewMode);
  return useQuery({
    queryKey: [...machinesKeys.list(), params, orgViewMode, actAsTenantId],
    queryFn: () => api.fetchAllMachines(params, actAsTenantId),
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useMachineDetails = (id: string | number) => {
  return useQuery({
    queryKey: machinesKeys.detail(id),
    queryFn: () => api.fetchMachineDetails(id),
    enabled: !!id,
    staleTime: 2 * 60_000,
    gcTime: 4 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useCreateMachine = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateMachinePayload) => api.createMachine(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: machinesKeys.list() });
    },
  });
};

export const useUpdateMachine = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: Partial<CreateMachinePayload> }) =>
      api.updateMachine(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: machinesKeys.list() });
      queryClient.invalidateQueries({
        queryKey: machinesKeys.detail(variables.id),
      });
    },
  });
};

export const useDeleteMachine = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => api.deleteMachine(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: machinesKeys.list() });
    },
  });
};
