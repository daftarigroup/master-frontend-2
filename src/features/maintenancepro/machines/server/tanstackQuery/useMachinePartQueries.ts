import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateMachinePartPayload, UpdateMachinePartPayload } from '../../types/types';
import * as api from '../api/machinePartsApi';
import { machinesKeys } from './useMachinesQueries';

export const machinePartsKeys = {
  all: ['maintenancepro', 'machine-parts'] as const,
  list: (machineId?: string) => [...machinePartsKeys.all, 'list', { machineId }] as const,
  detail: (id: string) => [...machinePartsKeys.all, 'detail', id] as const,
};

// actAsTenantId: the company picked via CompanySelectField/useCompanyPinForCreate
// for a create-flow (e.g. New Repair Task) — scopes this dropdown's options to
// that company instead of whatever the active session tenant happens to be.
export const useMachineParts = (machineId?: string, actAsTenantId?: string) => {
  return useQuery({
    queryKey: [...machinePartsKeys.list(machineId), actAsTenantId],
    queryFn: () => api.fetchMachineParts({ machineId }, actAsTenantId),
    staleTime: 2 * 60_000,
    gcTime: 4 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useMachinePartDetails = (id: string) => {
  return useQuery({
    queryKey: machinePartsKeys.detail(id),
    queryFn: () => api.fetchMachinePartDetails(id),
    enabled: !!id,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useCreateMachinePart = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateMachinePartPayload) => api.createMachinePart(payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: machinePartsKeys.list(variables.machineId) });
      queryClient.invalidateQueries({ queryKey: machinePartsKeys.list() });
      queryClient.invalidateQueries({ queryKey: machinesKeys.all });
    },
  });
};

export const useUpdateMachinePart = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMachinePartPayload }) =>
      api.updateMachinePart(id, data),
    onSuccess: (updatedPart) => {
      queryClient.invalidateQueries({ queryKey: machinePartsKeys.list(updatedPart.machineId) });
      queryClient.invalidateQueries({ queryKey: machinePartsKeys.list() });
      queryClient.invalidateQueries({ queryKey: machinePartsKeys.detail(updatedPart.id) });
      queryClient.invalidateQueries({ queryKey: machinesKeys.all });
    },
  });
};

export const useDeleteMachinePart = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteMachinePart(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: machinePartsKeys.all });
      queryClient.invalidateQueries({ queryKey: machinesKeys.all });
    },
  });
};
