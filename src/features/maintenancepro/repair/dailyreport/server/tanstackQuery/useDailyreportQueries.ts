'use client';
import { useQuery } from '@tanstack/react-query';
import { useAppSelector } from '@/store/hook';
import { selectOrgViewMode } from '@/store/slice/userAccountData';
import * as api from '../api/dailyreportApi';
export const dailyreportKeys = {
  all: ['repairbotivate', 'dailyreport'] as const,
  list: () => [...dailyreportKeys.all, 'list'] as const,
};
// orgViewMode folded into the key so toggling "All Companies" doesn't keep
// serving a stale single-company (or stale merged) response past staleTime —
// see docs/organizationplan/08-all-companies-rollout.md.
export const useDailyReport = (date?: string, firmId?: string) => {
  const orgViewMode = useAppSelector(selectOrgViewMode);
  return useQuery({
    queryKey: [...dailyreportKeys.list(), date, firmId ?? 'all', orgViewMode],
    queryFn: () => api.fetchDailyReport(date, firmId),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};
