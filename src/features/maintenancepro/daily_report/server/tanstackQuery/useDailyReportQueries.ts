import { useQuery } from '@tanstack/react-query';
import { fetchMaintenanceDailyReport } from '../../services/dailyReportApi';

export const useDailyReport = (firmId?: string) =>
  useQuery({
    queryKey: ['maintenance', 'daily-report', firmId ?? 'all'],
    queryFn: () => fetchMaintenanceDailyReport(firmId),
    staleTime: 2 * 60 * 1000,
    gcTime: 4 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
