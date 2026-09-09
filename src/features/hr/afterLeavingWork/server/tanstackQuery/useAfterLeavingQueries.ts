import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppSelector } from '@/store/hook';
import { selectOrgViewMode } from '@/store/slice/userAccountData';
import {
  deactivateUserAccount,
  fetchActiveEmployees,
  fetchLeavingEmployees,
  type ProcessExitPayload,
  processExit,
  type RecordResignationPayload,
  recordResignation,
  settleLoan,
} from '../api/afterLeavingApi';

export const useLeavingEmployees = () => {
  const orgViewMode = useAppSelector(selectOrgViewMode);
  return useQuery({
    queryKey: ['hr', 'leaving-employees', orgViewMode],
    queryFn: fetchLeavingEmployees,
    staleTime: 3 * 60 * 1000,
    gcTime: 6 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useActiveEmployees = () => {
  const orgViewMode = useAppSelector(selectOrgViewMode);
  return useQuery({
    queryKey: ['hr', 'active-employees-dropdown', orgViewMode],
    queryFn: fetchActiveEmployees,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useRecordResignation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      payload,
      actAsTenantId,
    }: {
      payload: RecordResignationPayload;
      actAsTenantId?: string;
    }) => recordResignation(payload, actAsTenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'leaving-employees'] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'active-employees-dropdown'] });
    },
  });
};

export const useProcessExit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
      actAsTenantId,
    }: {
      id: number;
      payload: ProcessExitPayload;
      actAsTenantId?: string;
    }) => processExit(id, payload, actAsTenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'leaving-employees'] });
    },
  });
};

export const useDeactivateUserAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, actAsTenantId }: { id: number; actAsTenantId?: string }) =>
      deactivateUserAccount(id, actAsTenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'leaving-employees'] });
    },
  });
};

export const useSettleLoan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ loanId, actAsTenantId }: { loanId: string; actAsTenantId?: string }) =>
      settleLoan(loanId, actAsTenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'leaving-employees'] });
    },
  });
};
