import { useQuery } from '@tanstack/react-query';

export function useCompanyShiftQueries(_tenantId?: string | null) {
  return {
    useGetShifts: () =>
      useQuery({
        queryKey: ['company-shifts', _tenantId],
        queryFn: async () => [
          { id: 'shift-1', name: 'General Shift', startTime: '09:00', endTime: '18:00', isDefault: true },
          { id: 'shift-2', name: 'Morning Shift', startTime: '06:00', endTime: '14:30', isDefault: false },
          { id: 'shift-3', name: 'Evening Shift', startTime: '14:00', endTime: '22:30', isDefault: false },
          { id: 'shift-4', name: 'Night Shift', startTime: '22:00', endTime: '06:30', isDefault: false },
        ],
      }),
  };
}
