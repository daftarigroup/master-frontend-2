// HR Employee TanStack Query Hooks
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppSelector } from '@/store/hook';
import { selectOrgViewMode } from '@/store/slice/userAccountData';
import {
  type BulkImportRow,
  bulkImportEmployees,
  type ChecklistConfig,
  createEmployee,
  deleteEmployee,
  type EmployeePayload,
  fetchChecklistConfig,
  fetchEmployeeById,
  fetchEmployeeStats,
  fetchEmployees,
  fetchJoinedWithoutAccount,
  fetchLeavingEmployees,
  fetchOnboardingList,
  type OnboardingPayload,
  recordSeparation,
  type SeparationPayload,
  saveChecklistConfig,
  updateEmployee,
  updateEmployeeOnboarding,
} from '../api/employeeApi';

export const useEmployees = () => {
  const orgViewMode = useAppSelector(selectOrgViewMode);
  return useQuery({
    queryKey: ['hr', 'employees', orgViewMode],
    queryFn: fetchEmployees,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useEmployeeById = (id: string, actAsTenantId?: string) => {
  return useQuery({
    queryKey: ['hr', 'employees', id, actAsTenantId ?? ''],
    queryFn: () => fetchEmployeeById(id, actAsTenantId),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useEmployeeStats = () => {
  const orgViewMode = useAppSelector(selectOrgViewMode);
  return useQuery({
    queryKey: ['hr', 'employees', 'stats', orgViewMode],
    queryFn: fetchEmployeeStats,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useLeavingEmployees = () => {
  const orgViewMode = useAppSelector(selectOrgViewMode);
  return useQuery({
    queryKey: ['hr', 'employees', 'leaving', orgViewMode],
    queryFn: fetchLeavingEmployees,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useCreateEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      data,
      files,
      actAsTenantId,
    }: {
      data: EmployeePayload;
      files?: { photo?: File; resume?: File };
      actAsTenantId?: string;
    }) => createEmployee(data, files, actAsTenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'employees'] });
    },
  });
};

export const useBulkImportEmployees = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rows: BulkImportRow[]) => bulkImportEmployees(rows),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'employees'] });
      queryClient.invalidateQueries({
        queryKey: ['hr', 'employees', 'joined-without-account'],
      });
      queryClient.invalidateQueries({ queryKey: ['hr', 'employees', 'onboarding'] });
    },
  });
};

export const useUpdateEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
      files,
      actAsTenantId,
    }: {
      id: string;
      data: Partial<EmployeePayload>;
      files?: { photo?: File; resume?: File };
      actAsTenantId?: string;
    }) => updateEmployee(id, data, files, actAsTenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'employees'] });
    },
  });
};

export const useRecordSeparation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
      actAsTenantId,
    }: {
      id: string;
      data: SeparationPayload;
      actAsTenantId?: string;
    }) => recordSeparation(id, data, actAsTenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'employees'] });
    },
  });
};

export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, actAsTenantId }: { id: string; actAsTenantId?: string }) =>
      deleteEmployee(id, actAsTenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'employees'] });
    },
  });
};

export const useJoinedWithoutAccount = () => {
  const orgViewMode = useAppSelector(selectOrgViewMode);
  return useQuery({
    queryKey: ['hr', 'employees', 'joined-without-account', orgViewMode],
    queryFn: fetchJoinedWithoutAccount,
    staleTime: 2 * 60 * 1000,
    gcTime: 4 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useOnboardingList = () => {
  const orgViewMode = useAppSelector(selectOrgViewMode);
  return useQuery({
    queryKey: ['hr', 'employees', 'onboarding', orgViewMode],
    queryFn: fetchOnboardingList,
    staleTime: 2 * 60 * 1000,
    gcTime: 4 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useUpdateOnboarding = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
      actAsTenantId,
    }: {
      id: string;
      data: OnboardingPayload;
      actAsTenantId?: string;
    }) => updateEmployeeOnboarding(id, data, actAsTenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'employees', 'onboarding'] });
    },
  });
};

export const useChecklistConfig = () => {
  return useQuery({
    queryKey: ['hr', 'checklist-config'],
    queryFn: fetchChecklistConfig,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useSaveChecklistConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ChecklistConfig) => saveChecklistConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'checklist-config'] });
    },
  });
};
