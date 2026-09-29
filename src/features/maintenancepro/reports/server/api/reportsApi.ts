import { api } from '@/lib/axios';
import type {
  CostAnalysisReport,
  MachineReliabilityReport,
  ReportDepartmentOption,
  ReportTimeframe,
} from '../../types/types';

export interface ReportFilters {
  timeframe: ReportTimeframe;
  departmentId?: string;
  firmId?: string;
}

export const fetchCostAnalysis = async (filters: ReportFilters): Promise<CostAnalysisReport> => {
  const res = await api.get('/maintenance/reports/cost-analysis', {
    params: {
      timeframe: filters.timeframe,
      ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
      ...(filters.firmId ? { firmId: filters.firmId } : {}),
    },
  });
  return res.data.data;
};

export const fetchMachineReliability = async (
  filters: ReportFilters
): Promise<MachineReliabilityReport> => {
  const res = await api.get('/maintenance/reports/machine-reliability', {
    params: {
      timeframe: filters.timeframe,
      ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
      ...(filters.firmId ? { firmId: filters.firmId } : {}),
    },
  });
  return res.data.data;
};

export const fetchReportDepartments = async (): Promise<ReportDepartmentOption[]> => {
  const res = await api.get('/maintenance/departments', { params: { page: 1, limit: 100 } });
  const items: Array<{ id: string; name: string }> = res.data?.data ?? [];
  return items.map((d) => ({ id: d.id, name: d.name }));
};
