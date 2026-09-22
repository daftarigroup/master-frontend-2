'use client';
import { useCallback, useState } from 'react';
import type { StoreinFilters } from '../types/types';
export const useStoreinFilters = () => {
  const [filters, setFilters] = useState<StoreinFilters>({
    searchTerm: '',
    condition: '',
  });
  const setSearchTerm = useCallback(
    (searchTerm: string) => setFilters((p) => ({ ...p, searchTerm })),
    []
  );
  const setCondition = useCallback(
    (condition: string) => setFilters((p) => ({ ...p, condition })),
    []
  );
  return { filters, setSearchTerm, setCondition };
};
