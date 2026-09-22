'use client';
import { useQuery } from '@tanstack/react-query';
import * as api from '../api/paymentApi';
export const paymentKeys = {
  all: ['repairbotivate', 'payment'] as const,
  list: () => [...paymentKeys.all, 'list'] as const,
};
export const usePayments = () =>
  useQuery({
    queryKey: paymentKeys.list(),
    queryFn: () => api.fetchPayments(),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
