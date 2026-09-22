import { useQuery } from '@tanstack/react-query';
import { fetchMaintenanceDailyReport } from '../../services/dailyReportApi';

export const useDailyReport = () =>
  useQuery({
    queryKey: ['maintenance', 'daily-report'],
    queryFn: fetchMaintenanceDailyReport,
    staleTime: 2 * 60 * 1000,
    gcTime: 4 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
