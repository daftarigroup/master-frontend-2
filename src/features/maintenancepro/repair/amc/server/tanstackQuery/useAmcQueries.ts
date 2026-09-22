'use client';
import { useQuery } from '@tanstack/react-query';
import { useAppSelector } from '@/store/hook';
import { selectOrgViewMode } from '@/store/slice/userAccountData';
import * as amcApi from '../api/amcApi';

export const amcKeys = {
  all: ['repairbotivate', 'amc'] as const,
};

// orgViewMode folded into the key so toggling "All Companies" doesn't keep
// serving a stale single-company (or stale merged) response past staleTime —
// see docs/organizationplan/08-all-companies-rollout.md.
export const useAMCData = () => {
  const orgViewMode = useAppSelector(selectOrgViewMode);
  return useQuery({
    queryKey: [...amcKeys.all, orgViewMode],
    queryFn: () => amcApi.fetchAMCData(),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};
