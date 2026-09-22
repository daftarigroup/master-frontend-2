// Calendar API
import { api } from '@/lib/axios';
import type { CalendarEvent } from '../../types/types';

export const fetchCalendarEvents = async (): Promise<CalendarEvent[]> => {
  const res = await api.get('/repair-system/calendar');
  return res.data?.data ?? [];
};
