import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMyMonthly, fetchMyToday, selfCheckIn, selfCheckOut } from '../api/myAttendanceApi';

const KEYS = {
  today: ['hr', 'my-attendance', 'today'] as const,
  monthly: (y: number, m: number) => ['hr', 'my-attendance', 'monthly', y, m] as const,
};

export const useMyToday = (options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: KEYS.today,
    queryFn: fetchMyToday,
    enabled: options?.enabled ?? true,
    staleTime: 2 * 60 * 1000,
    gcTime: 4 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

export const useMyMonthly = (year: number, month: number) =>
  useQuery({
    queryKey: KEYS.monthly(year, month),
    queryFn: () => fetchMyMonthly(year, month),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

export const useSelfCheckIn = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: selfCheckIn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr', 'my-attendance'] }),
  });
};

export const useSelfCheckOut = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: selfCheckOut,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr', 'my-attendance'] }),
  });
};
