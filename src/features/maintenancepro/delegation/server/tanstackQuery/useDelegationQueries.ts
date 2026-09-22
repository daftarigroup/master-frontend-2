import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateTransferDto,
  ExtendDueDateDto,
  MarkDoneDto,
  MarkNotDoneDto,
  WorkOrdersQueryParams,
} from '../../types/types';
import {
  approveWorkOrder,
  cancelWorkOrder,
  extendWorkOrderDueDate,
  fetchApprovalHistory,
  fetchWorkOrders,
  holdWorkOrder,
  markWorkOrderDone,
  markWorkOrderNotDone,
  rejectWorkOrder,
  transferWorkOrder,
} from '../api/delegationApi';

const WO_KEY = ['maintenance', 'work-orders'] as const;

export const useWorkOrders = (params: WorkOrdersQueryParams = {}) =>
  useQuery({
    queryKey: [...WO_KEY, params],
    queryFn: () => fetchWorkOrders(params),
    staleTime: 30_000,
    gcTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

export const useApprovalHistory = (
  params: { scope?: string; status?: string; page?: number; limit?: number; mode?: string } = {}
) =>
  useQuery({
    queryKey: [...WO_KEY, 'approval-history', params],
    queryFn: () => fetchApprovalHistory(params),
    staleTime: 30_000,
    gcTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

export const useApproveWorkOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workOrderId, note }: { workOrderId: string; note?: string }) =>
      approveWorkOrder(workOrderId, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: WO_KEY }),
  });
};

export const useRejectWorkOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      workOrderId,
      note,
      newDueDate,
    }: {
      workOrderId: string;
      note: string;
      newDueDate?: string;
    }) => rejectWorkOrder(workOrderId, note, newDueDate),
    onSuccess: () => qc.invalidateQueries({ queryKey: WO_KEY }),
  });
};

export const useTransferWorkOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTransferDto) => transferWorkOrder(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: WO_KEY }),
  });
};

export const useMarkWorkOrderDone = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: MarkDoneDto) => markWorkOrderDone(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: WO_KEY }),
  });
};

export const useMarkWorkOrderNotDone = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: MarkNotDoneDto) => markWorkOrderNotDone(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: WO_KEY }),
  });
};

export const useExtendWorkOrderDueDate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ExtendDueDateDto) => extendWorkOrderDueDate(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: WO_KEY }),
  });
};

export const useHoldWorkOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workOrderId, reason }: { workOrderId: string; reason?: string }) =>
      holdWorkOrder(workOrderId, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: WO_KEY }),
  });
};

export const useCancelWorkOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workOrderId, reason }: { workOrderId: string; reason: string }) =>
      cancelWorkOrder(workOrderId, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: WO_KEY }),
  });
};
