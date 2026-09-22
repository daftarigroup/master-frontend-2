// Dashboard TanStack Query hooks for Maintenance Pro

import { useQuery } from '@tanstack/react-query';
import * as api from '../api/dashboardApi';

export type DashboardPeriod = 'thisMonth' | 'lastMonth' | 'lastQuarter' | 'thisYear';

export const getDateRangeForPeriod = (period: DashboardPeriod): { from: string; to: string } => {
  const now = new Date();
  let start: Date;
  let end: Date;

  switch (period) {
    case 'lastMonth':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;
    case 'lastQuarter':
      start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;
    case 'thisYear':
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  // "thisMonth"/"thisYear" both run their nominal end past today — without
  // this cap, every occurrence a recurring plan already generated out to its
  // full 60-day horizon (due later this month/year but not actually due yet)
  // gets counted alongside genuinely due/overdue work, wildly inflating
  // "Maintenance Tasks"/"Tasks Pending". "lastMonth"/"lastQuarter" are
  // already fully in the past, so this is a no-op for them.
  if (end.getTime() > now.getTime()) {
    end = now;
  }

  return { from: start.toISOString(), to: end.toISOString() };
};

// Query Keys
export const dashboardKeys = {
  all: ['maintenancepro', 'dashboard'] as const,
  summary: () => [...dashboardKeys.all, 'summary'] as const,
  machines: () => [...dashboardKeys.all, 'machines'] as const,
  tasks: () => [...dashboardKeys.all, 'tasks'] as const,
  checklist: () => [...dashboardKeys.all, 'checklist'] as const,
  v3: (period: DashboardPeriod) => [...dashboardKeys.all, 'v3', period] as const,
};

export const useMaintenanceDashboardV3 = (period: DashboardPeriod = 'thisMonth') => {
  const { from, to } = getDateRangeForPeriod(period);
  return useQuery({
    queryKey: dashboardKeys.v3(period),
    queryFn: () => api.fetchMaintenanceDashboardV3(from, to),
    staleTime: 60_000,
    gcTime: 2 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnMount: false,
  });
};

export const useDashboardSummary = () => {
  return useQuery({
    queryKey: dashboardKeys.summary(),
    queryFn: () => api.fetchDashboardSummary(),
    staleTime: 30_000,
    gcTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useMachines = () => {
  return useQuery({
    queryKey: dashboardKeys.machines(),
    queryFn: () => api.fetchAllMachines(),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useTasks = () => {
  return useQuery({
    queryKey: dashboardKeys.tasks(),
    queryFn: () => api.fetchAllTasks(),
    staleTime: 2 * 60_000,
    gcTime: 4 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useMaintenanceChecklist = () => {
  return useQuery({
    queryKey: dashboardKeys.checklist(),
    queryFn: () => api.fetchAllMaintenanceChecklistItems(),
    staleTime: 2 * 60_000,
    gcTime: 4 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};
