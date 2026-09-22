import { useQuery } from '@tanstack/react-query';
import { useAppSelector } from '@/store/hook';
import { selectOrgViewMode } from '@/store/slice/userAccountData';
import type { ReportFilters } from '../api/reportsApi';
import * as api from '../api/reportsApi';

export const reportsKeys = {
  all: ['maintenancepro', 'reports'] as const,
  costAnalysis: (filters: ReportFilters) => [...reportsKeys.all, 'cost-analysis', filters] as const,
  machineReliability: (filters: ReportFilters) =>
    [...reportsKeys.all, 'machine-reliability', filters] as const,
  departments: () => [...reportsKeys.all, 'departments'] as const,
};

// orgViewMode folded into the key so toggling "All Companies" doesn't keep
// serving a stale single-company (or stale merged) response past staleTime —
// see docs/organizationplan/08-all-companies-rollout.md.
export const useCostAnalysisReport = (filters: ReportFilters) => {
  const orgViewMode = useAppSelector(selectOrgViewMode);
  return useQuery({
    queryKey: [...reportsKeys.costAnalysis(filters), orgViewMode],
    queryFn: () => api.fetchCostAnalysis(filters),
    staleTime: 60_000,
    gcTime: 2 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useMachineReliabilityReport = (filters: ReportFilters) => {
  const orgViewMode = useAppSelector(selectOrgViewMode);
  return useQuery({
    queryKey: [...reportsKeys.machineReliability(filters), orgViewMode],
    queryFn: () => api.fetchMachineReliability(filters),
    staleTime: 60_000,
    gcTime: 2 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useReportDepartments = () => {
  return useQuery({
    queryKey: reportsKeys.departments(),
    queryFn: () => api.fetchReportDepartments(),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};
