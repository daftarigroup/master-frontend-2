'use client';
import { useCallback, useState } from 'react';
import type { SentmachineFilters } from '../types/types';
export const useSentmachineFilters = () => {
  const [filters, setFilters] = useState<SentmachineFilters>({
    searchTerm: '',
    status: '',
  });
  const setSearchTerm = useCallback(
    (searchTerm: string) => setFilters((p) => ({ ...p, searchTerm })),
    []
  );
  const setStatus = useCallback((status: string) => setFilters((p) => ({ ...p, status })), []);
  return { filters, setSearchTerm, setStatus };
};
