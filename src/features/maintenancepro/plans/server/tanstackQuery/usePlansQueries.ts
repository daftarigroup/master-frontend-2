import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppSelector } from '@/store/hook';
import { selectOrgViewMode } from '@/store/slice/userAccountData';
import type { CreatePlanDto, PlansQueryParams, UpdatePlanDto } from '../../types/types';
import * as api from '../api/plansApi';

export const plansKeys = {
  all: ['maintenancepro', 'plans'] as const,
  list: (params?: PlansQueryParams) => [...plansKeys.all, 'list', params] as const,
  detail: (id: string) => [...plansKeys.all, 'detail', id] as const,
};

// "All Companies" (docs/organizationplan/08-all-companies-rollout.md) —
// orgViewMode folded into the key so toggling doesn't keep serving a stale
// single-company list past this query's staleTime.
export const usePlans = (params?: PlansQueryParams) => {
  const orgViewMode = useAppSelector(selectOrgViewMode);
  return useQuery({
    queryKey: [...plansKeys.list(params), orgViewMode],
    queryFn: () => api.fetchPlans(params),
    staleTime: 2 * 60_000,
    gcTime: 4 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const usePlanDetail = (id: string) => {
  return useQuery({
    queryKey: plansKeys.detail(id),
    queryFn: () => api.fetchPlanById(id),
    enabled: !!id,
    staleTime: 2 * 60_000,
    gcTime: 4 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

// `actAsTenantId` is an optional additive field on top of the plain DTO —
// existing callers that pass a bare CreatePlanDto are unaffected; a
// create-flow with a company picker (e.g. New Repair Task) can attach it to
// pin the write to the picked company.
export const useCreatePlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePlanDto & { actAsTenantId?: string }) => {
      const { actAsTenantId, ...dto } = data;
      return api.createPlan(dto, actAsTenantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: plansKeys.all });
      // Creating a plan also generates work orders — invalidate so lists stay in sync
      queryClient.invalidateQueries({ queryKey: ['maintenance', 'work-orders'] });
    },
  });
};

export const useUpdatePlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePlanDto }) => api.updatePlan(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: plansKeys.list() });
      queryClient.invalidateQueries({ queryKey: plansKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: ['maintenance', 'work-orders'] });
    },
  });
};

export const usePausePlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data?: { pausedUntil?: string; pauseReason?: string };
    }) => api.pausePlan(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: plansKeys.all });
      queryClient.invalidateQueries({ queryKey: ['maintenance', 'work-orders'] });
    },
  });
};

export const useResumePlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.resumePlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: plansKeys.all });
      queryClient.invalidateQueries({ queryKey: ['maintenance', 'work-orders'] });
    },
  });
};

export const useArchivePlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.archivePlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: plansKeys.all });
      queryClient.invalidateQueries({ queryKey: ['maintenance', 'work-orders'] });
    },
  });
};
