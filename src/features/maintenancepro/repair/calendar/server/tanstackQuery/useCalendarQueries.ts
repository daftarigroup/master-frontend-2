'use client';
// Calendar TanStack Query hooks
import { useQuery } from '@tanstack/react-query';
import * as api from '../api/calendarApi';
export const calendarKeys = {
  all: ['repairbotivate', 'calendar'] as const,
  events: (firmId?: string) => [...calendarKeys.all, 'events', firmId ?? 'all'] as const,
};
export const useCalendarEvents = (firmId?: string) =>
  useQuery({
    queryKey: calendarKeys.events(firmId),
    queryFn: () => api.fetchCalendarEvents(firmId),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
