import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppSelector } from '@/store/hook';
import { selectOrgViewMode } from '@/store/slice/userAccountData';
import {
  deleteGatePass,
  fetchGatePassById,
  fetchGatePasses,
  fetchGatePassesByEmployee,
  fetchGatePassStats,
  type IssueGatePassPayload,
  issueGatePass,
  updateGatePassStatus,
} from '../api/gatePassApi';

export const useGatePasses = () => {
  const orgViewMode = useAppSelector(selectOrgViewMode);
  return useQuery({
    queryKey: ['hr', 'gatePasses', orgViewMode],
    queryFn: fetchGatePasses,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useGatePassStats = () => {
  const orgViewMode = useAppSelector(selectOrgViewMode);
  return useQuery({
    queryKey: ['hr', 'gatePasses', 'stats', orgViewMode],
    queryFn: fetchGatePassStats,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useGatePassById = (id: string | number) => {
  return useQuery({
    queryKey: ['hr', 'gatePasses', id],
    queryFn: () => fetchGatePassById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useGatePassesByEmployee = (employeeId: string) => {
  return useQuery({
    queryKey: ['hr', 'gatePasses', 'byEmployee', employeeId],
    queryFn: () => fetchGatePassesByEmployee(employeeId),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useIssueGatePass = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      data,
      attachment,
      actAsTenantId,
    }: {
      data: IssueGatePassPayload;
      attachment?: File;
      actAsTenantId?: string;
    }) => issueGatePass(data, attachment, actAsTenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'gatePasses'] });
    },
  });
};

export const useUpdateGatePassStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      actAsTenantId,
    }: {
      id: string | number;
      status: string;
      actAsTenantId?: string;
    }) => updateGatePassStatus(id, status, actAsTenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'gatePasses'] });
    },
  });
};

export const useDeleteGatePass = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, actAsTenantId }: { id: string | number; actAsTenantId?: string }) =>
      deleteGatePass(id, actAsTenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'gatePasses'] });
    },
  });
};
