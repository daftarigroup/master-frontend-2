import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppSelector } from '@/store/hook';
import { selectOrgViewMode } from '@/store/slice/userAccountData';
import type {
  SubmitAdvanceRequestDto,
  UpdateAdvanceRequestDto,
  UpdateAdvanceStatusDto,
} from '../../types/types';
import {
  deleteAdvanceRequest,
  fetchAdvanceDashboardStats,
  fetchAdvanceRequestById,
  fetchAdvanceRequests,
  fetchAdvanceRequestsByEmployee,
  fetchLoanHistory,
  markAdvanceComplete,
  submitAdvanceRequest,
  updateAdvanceRequest,
  updateAdvanceRequestStatus,
} from '../api/advanceRequestApi';

export const useAdvanceRequests = (options?: { enabled?: boolean }) => {
  const orgViewMode = useAppSelector(selectOrgViewMode);
  return useQuery({
    queryKey: ['hr', 'advanceRequest', 'all', orgViewMode],
    queryFn: fetchAdvanceRequests,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: options?.enabled !== false,
  });
};

export const useAdvanceRequestsByEmployee = (employeeId: string) =>
  useQuery({
    queryKey: ['hr', 'advanceRequest', 'byEmployee', employeeId],
    queryFn: () => fetchAdvanceRequestsByEmployee(employeeId),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

export const useAdvanceRequestById = (id: number) =>
  useQuery({
    queryKey: ['hr', 'advanceRequest', 'single', id],
    queryFn: () => fetchAdvanceRequestById(id),
    enabled: id > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

export const useSubmitAdvanceRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SubmitAdvanceRequestDto) => submitAdvanceRequest(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr', 'advanceRequest'] }),
  });
};

export const useUpdateAdvanceRequestStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
      actAsTenantId,
    }: {
      id: number;
      data: UpdateAdvanceStatusDto;
      actAsTenantId?: string;
    }) => updateAdvanceRequestStatus(id, data, actAsTenantId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr', 'advanceRequest'] }),
  });
};

export const useUpdateAdvanceRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
      actAsTenantId,
    }: {
      id: number;
      data: UpdateAdvanceRequestDto;
      actAsTenantId?: string;
    }) => updateAdvanceRequest(id, data, actAsTenantId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr', 'advanceRequest'] }),
  });
};

export const useLoanHistory = (id: number, enabled = true) =>
  useQuery({
    queryKey: ['hr', 'advanceRequest', 'loanHistory', id],
    queryFn: () => fetchLoanHistory(id),
    enabled: enabled && id > 0,
    staleTime: 2 * 60 * 1000,
    gcTime: 4 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

export const useDeleteAdvanceRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteAdvanceRequest(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr', 'advanceRequest'] }),
  });
};

export const useAdvanceDashboardStats = () => {
  const orgViewMode = useAppSelector(selectOrgViewMode);
  return useQuery({
    queryKey: ['hr', 'advanceRequest', 'stats', orgViewMode],
    queryFn: fetchAdvanceDashboardStats,
    staleTime: 2 * 60 * 1000,
    gcTime: 4 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useMarkAdvanceComplete = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, actAsTenantId }: { id: number; actAsTenantId?: string }) =>
      markAdvanceComplete(id, actAsTenantId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr', 'advanceRequest'] }),
  });
};
