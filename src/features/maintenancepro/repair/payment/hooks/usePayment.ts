'use client';
import { useCallback, useState } from 'react';
import type { PaymentFilters } from '../types/types';
export const usePaymentFilters = () => {
  const [filters, setFilters] = useState<PaymentFilters>({
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
