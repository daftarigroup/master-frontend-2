import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppSelector } from '@/store/hook';
import { selectOrgViewMode } from '@/store/slice/userAccountData';
import type { UpsertStructureDto } from '../../types/types';
import {
  type AllTransactionsFilters,
  fetchAllTransactions,
  fetchEmployeeLoans,
  fetchEmployeeMonthlyAttendance,
  fetchEmployeeStructureApi,
  fetchPayrollOverview,
  fetchSalaryEmployeeList,
  generatePayslipApi,
  holdSalaryApi,
  markPayslipPaidApi,
  upsertEmployeeStructureApi,
} from '../api/salaryManagementApi';

export const usePayrollOverview = (month: number, year: number) => {
  const orgViewMode = useAppSelector(selectOrgViewMode);
  return useQuery({
    queryKey: ['hr', 'payroll', month, year, orgViewMode],
    queryFn: () => fetchPayrollOverview(month, year),
    staleTime: 2 * 60 * 1000,
    gcTime: 4 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useHoldSalary = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      employeeId,
      hold,
      reason,
      actAsTenantId,
    }: {
      employeeId: string;
      hold: boolean;
      reason?: string;
      actAsTenantId?: string;
    }) => holdSalaryApi(employeeId, hold, reason, actAsTenantId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr', 'payroll'] }),
  });
};

export const useGeneratePayslip = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      actAsTenantId,
      ...payload
    }: {
      employeeId: string;
      month: number;
      year: number;
      actAsTenantId?: string;
    }) => generatePayslipApi(payload, actAsTenantId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr', 'payroll'] });
      qc.invalidateQueries({ queryKey: ['hr', 'salary-employees'] });
    },
  });
};

export const useMarkPayslipPaid = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ payslipId, actAsTenantId }: { payslipId: number; actAsTenantId?: string }) =>
      markPayslipPaidApi(payslipId, actAsTenantId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr', 'payroll'] });
      qc.invalidateQueries({ queryKey: ['hr', 'all-transactions'] });
    },
  });
};

export const useAllTransactions = (filters: AllTransactionsFilters) => {
  const orgViewMode = useAppSelector(selectOrgViewMode);
  return useQuery({
    queryKey: ['hr', 'all-transactions', filters, orgViewMode],
    queryFn: () => fetchAllTransactions(filters),
    staleTime: 2 * 60 * 1000,
    gcTime: 4 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useSalaryEmployeeList = (filters: { search?: string; dept?: string }) => {
  const orgViewMode = useAppSelector(selectOrgViewMode);
  return useQuery({
    queryKey: ['hr', 'salary-employees', filters, orgViewMode],
    queryFn: () => fetchSalaryEmployeeList(filters),
    staleTime: 3 * 60 * 1000,
    gcTime: 6 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useEmployeeMonthlyAttendance = (
  employeeId: string,
  month: number,
  year: number,
  actAsTenantId?: string
) =>
  useQuery({
    queryKey: ['hr', 'attendance-monthly', employeeId, month, year, actAsTenantId ?? ''],
    queryFn: () => fetchEmployeeMonthlyAttendance(employeeId, month, year, actAsTenantId),
    enabled: !!employeeId,
    staleTime: 2 * 60 * 1000,
    gcTime: 4 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

export const useEmployeeLoans = (employeeId: string, actAsTenantId?: string) =>
  useQuery({
    queryKey: ['hr', 'employee-loans', employeeId, actAsTenantId ?? ''],
    queryFn: () => fetchEmployeeLoans(employeeId, actAsTenantId),
    enabled: !!employeeId,
    staleTime: 3 * 60 * 1000,
    gcTime: 6 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

export const useEmployeeStructure = (employeeId: string, actAsTenantId?: string) =>
  useQuery({
    queryKey: ['hr', 'employee-structure', employeeId, actAsTenantId ?? ''],
    queryFn: () => fetchEmployeeStructureApi(employeeId, actAsTenantId),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

export const useUpsertEmployeeStructure = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      employeeId,
      data,
      actAsTenantId,
    }: {
      employeeId: string;
      data: UpsertStructureDto;
      actAsTenantId?: string;
    }) => upsertEmployeeStructureApi(employeeId, data, actAsTenantId),
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({ queryKey: ['hr', 'employee-structure', variables.employeeId] });
      qc.invalidateQueries({ queryKey: ['hr', 'payroll'] });
    },
  });
};
