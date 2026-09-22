'use client';
import { useQuery } from '@tanstack/react-query';
import * as api from '../api/sentmachineApi';
export const sentmachineKeys = {
  all: ['repairbotivate', 'sentmachine'] as const,
  list: () => [...sentmachineKeys.all, 'list'] as const,
};
export const useSentmachines = () =>
  useQuery({
    queryKey: sentmachineKeys.list(),
    queryFn: () => api.fetchSentmachines(),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
