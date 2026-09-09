import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { GeneratePayslipDto, UpsertStructureDto } from '../../types/types';
import {
  deletePayslip,
  fetchAttendanceSummary,
  fetchMyPayslips,
  fetchPayslips,
  fetchStructure,
  generatePayslip,
  markPayslipPaid,
  upsertStructure,
} from '../api/salaryApi';

const KEY = ['hr', 'salary'] as const;

export const useGlobalStructure = () =>
  useQuery({
    queryKey: [...KEY, 'structure'],
    queryFn: fetchStructure,
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

export const useUpsertStructure = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpsertStructureDto) => upsertStructure(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useMyPayslips = (employeeId: string) =>
  useQuery({
    queryKey: [...KEY, 'myPayslips', employeeId],
    queryFn: fetchMyPayslips,
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

export const usePayslips = (employeeId: string, actAsTenantId?: string) =>
  useQuery({
    queryKey: [...KEY, 'payslips', employeeId, actAsTenantId ?? ''],
    queryFn: () => fetchPayslips(employeeId, actAsTenantId),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

export const useGeneratePayslip = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ data, actAsTenantId }: { data: GeneratePayslipDto; actAsTenantId?: string }) =>
      generatePayslip(data, actAsTenantId),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useMarkPayslipPaid = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, actAsTenantId }: { id: number; actAsTenantId?: string }) =>
      markPayslipPaid(id, actAsTenantId),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useAttendanceSummary = (month: number, year: number) =>
  useQuery({
    queryKey: [...KEY, 'attendanceSummary', month, year],
    queryFn: () => fetchAttendanceSummary(month, year),
    staleTime: 2 * 60 * 1000,
    gcTime: 4 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

export const useDeletePayslip = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, actAsTenantId }: { id: number; actAsTenantId?: string }) =>
      deletePayslip(id, actAsTenantId),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};
