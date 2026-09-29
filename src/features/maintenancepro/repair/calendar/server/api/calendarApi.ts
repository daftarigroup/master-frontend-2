// Calendar API
import { api } from '@/lib/axios';
import type { CalendarEvent } from '../../types/types';

export const fetchCalendarEvents = async (firmId?: string): Promise<CalendarEvent[]> => {
  const res = await api.get('/repair-system/calendar', {
    params: firmId ? { firmId } : undefined,
  });
  return res.data?.data ?? [];
};
