import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { repairSystemApi } from '../../../repair/server/api/repairSystemApi';
import { useMachines } from '../../../machines/server/tanstackQuery/useMachinesQueries';
import {
  cancelWorkOrder,
  createWorkOrder,
  fetchPartsNeeded,
  fetchWorkOrderList,
  outsourcePay,
  outsourceReceive,
  outsourceSend,
  raisePartsIndent,
  reassignWorkOrder,
  removePartNeeded,
  saveRepairPlan,
  updatePartNeeded,
  type CreateWorkOrderPayload,
  type PartInput,
  type WorkOrderListParams,
} from '../api/workOrdersApi';

const WO_KEY = ['maintenance', 'work-orders'] as const;

/** Paged list. The key starts with the shared work-order key so every existing mutation invalidates it. */
export const useWorkOrderList = (params: WorkOrderListParams) =>
  useQuery({
    queryKey: [...WO_KEY, 'wo-screen', params],
    queryFn: () => fetchWorkOrderList(params),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });

/** Total-only count (limit 1) for the stats strip. */
export const useWorkOrderCount = (params: WorkOrderListParams) =>
  useQuery({
    queryKey: [...WO_KEY, 'wo-count', params],
    queryFn: async () => (await fetchWorkOrderList({ ...params, page: 1, limit: 1 })).pagination?.total ?? 0,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

export const useVendors = () =>
  useQuery({
    queryKey: ['repair-system', 'vendors'],
    queryFn: () => repairSystemApi.getAllVendors(),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

/** Machines for filters / the create dialog, plus an id -> ownershipType map (the work-order DTO has no ownership). */
export const useMachineOptions = (firmId?: string) => {
  const query = useMachines({ firmId, limit: 500 });
  const machines = query.data?.data;
  const ownership = useMemo(() => {
    const map = new Map<string, string>();
    (machines ?? []).forEach((m) => map.set(String(m.id), String(m.ownershipType ?? 'OWNED')));
    return map;
  }, [machines]);
  return { machines: machines ?? [], ownership, isLoading: query.isLoading };
};

const useInvalidating = <TVars, TRes>(fn: (v: TVars) => Promise<TRes>) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WO_KEY });
      qc.invalidateQueries({ queryKey: ['maintenance', 'breakdowns'] });
    },
  });
};

export const useCreateWorkOrder = () => useInvalidating((p: CreateWorkOrderPayload) => createWorkOrder(p));
export const useReassignWorkOrder = () => useInvalidating((v: { id: string; toUserId: string; reason: string }) => reassignWorkOrder(v.id, { toUserId: v.toUserId, reason: v.reason }));
export const useCancelWorkOrder = () =>
  useInvalidating((v: { id: string; reason: string }) => cancelWorkOrder(v.id, v.reason));
export const useOutsourceSend = () =>
  useInvalidating((v: { id: string; body: Parameters<typeof outsourceSend>[1] }) => outsourceSend(v.id, v.body));
export const useOutsourceReceive = () =>
  useInvalidating((v: { id: string; body: Parameters<typeof outsourceReceive>[1] }) => outsourceReceive(v.id, v.body));
export const useOutsourcePay = () =>
  useInvalidating((v: { id: string; body: Parameters<typeof outsourcePay>[1] }) => outsourcePay(v.id, v.body));

// ---- repair parts from the Store ----

export const usePartsNeeded = (id: string | null, enabled = true) =>
  useQuery({
    queryKey: [...WO_KEY, 'parts-needed', id],
    queryFn: () => fetchPartsNeeded(id!),
    enabled: !!id && enabled,
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  });

const useRepairPartsMutation = <TVars, TRes>(fn: (v: TVars) => Promise<TRes>) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WO_KEY });
      qc.invalidateQueries({ queryKey: ['maintenance', 'breakdowns'] });
    },
  });
};

export const useSaveRepairPlan = () =>
  useRepairPartsMutation(({ id, ...body }: { id: string; materialRequired: boolean; partsNeeded?: PartInput[] }) => saveRepairPlan(id, body));
export const useUpdatePartNeeded = () =>
  useRepairPartsMutation(({ id, partId, ...body }: { id: string; partId: string; quantity?: number; note?: string }) => updatePartNeeded(id, partId, body));
export const useRemovePartNeeded = () => useRepairPartsMutation(({ id, partId }: { id: string; partId: string }) => removePartNeeded(id, partId));
export const useRaisePartsIndent = () => useRepairPartsMutation(({ id, again }: { id: string; again?: boolean }) => raisePartsIndent(id, { again }));
