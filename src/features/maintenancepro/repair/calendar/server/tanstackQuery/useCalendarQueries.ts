'use client';
// Calendar TanStack Query hooks
import { useQuery } from '@tanstack/react-query';
import * as api from '../api/calendarApi';
export const calendarKeys = {
  all: ['repairbotivate', 'calendar'] as const,
  events: () => [...calendarKeys.all, 'events'] as const,
};
export const useCalendarEvents = () =>
  useQuery({
    queryKey: calendarKeys.events(),
    queryFn: () => api.fetchCalendarEvents(),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
