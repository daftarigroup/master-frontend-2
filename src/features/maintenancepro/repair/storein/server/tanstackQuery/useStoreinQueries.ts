'use client';
import { useQuery } from '@tanstack/react-query';
import * as api from '../api/storeinApi';
export const storeinKeys = {
  all: ['repairbotivate', 'storein'] as const,
  list: () => [...storeinKeys.all, 'list'] as const,
};
export const useStorein = () =>
  useQuery({
    queryKey: storeinKeys.list(),
    queryFn: () => api.fetchStorein(),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
