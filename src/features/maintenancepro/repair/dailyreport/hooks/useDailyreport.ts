'use client';
import { useCallback, useState } from 'react';
import type { DailyReportFilters } from '../types/types';
export const useDailyReportFilters = () => {
  const [filters, setFilters] = useState<DailyReportFilters>({
    date: '',
    technician: '',
  });
  const setDate = useCallback((date: string) => setFilters((p) => ({ ...p, date })), []);
  const setTechnician = useCallback(
    (technician: string) => setFilters((p) => ({ ...p, technician })),
    []
  );
  return { filters, setDate, setTechnician };
};
