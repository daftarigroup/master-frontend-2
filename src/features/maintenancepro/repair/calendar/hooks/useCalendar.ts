'use client';
// Calendar hooks
import { useCallback, useState } from 'react';
import type { CalendarFilters } from '../types/types';

export const useCalendarFilters = () => {
  const now = new Date();
  const [filters, setFilters] = useState<CalendarFilters>({
    month: now.getMonth(),
    year: now.getFullYear(),
    type: '',
  });
  const setMonth = useCallback((month: number) => setFilters((prev) => ({ ...prev, month })), []);
  const setYear = useCallback((year: number) => setFilters((prev) => ({ ...prev, year })), []);
  const setType = useCallback((type: string) => setFilters((prev) => ({ ...prev, type })), []);
  return { filters, setMonth, setYear, setType };
};
