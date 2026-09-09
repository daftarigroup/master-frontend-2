// HR Dashboard TanStack Query Hooks
import { useQuery } from '@tanstack/react-query';
import { useAppSelector } from '@/store/hook';
import { selectOrgViewMode } from '@/store/slice/userAccountData';
import { fetchHrDashboardData, fetchHrDashboardV3 } from '../api/dashboardApi';

export const useHrDashboardData = () => {
  const query = useQuery({
    queryKey: ['hr', 'dashboard'],
    queryFn: fetchHrDashboardData,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  return {
    stats: query.data?.stats,
    monthlyHiringData: query.data?.monthlyHiringData,
    departmentData: query.data?.departmentData,
    designationData: query.data?.designationData,
    leaveStatusData: query.data?.leaveStatusData,
    leaveTypeData: query.data?.leaveTypeData,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
};

export const useHrDashboardV3 = () => {
  const orgViewMode = useAppSelector(selectOrgViewMode);
  return useQuery({
    queryKey: ['hr', 'dashboard', 'v3', orgViewMode],
    queryFn: () => fetchHrDashboardV3(),
    staleTime: 60_000,
    gcTime: 2 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnMount: false,
  });
};
