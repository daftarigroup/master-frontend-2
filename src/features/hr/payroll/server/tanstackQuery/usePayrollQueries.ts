// HR Payroll TanStack Query Hooks

import { useQuery } from '@tanstack/react-query';
import { fetchPayrollData, fetchPayrollSummary } from '../api/payrollApi';

export const usePayrollData = () => {
  return useQuery({
    queryKey: ['hr', 'payroll', 'data'],
    queryFn: fetchPayrollData,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const usePayrollSummary = () => {
  return useQuery({
    queryKey: ['hr', 'payroll', 'summary'],
    queryFn: fetchPayrollSummary,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};
