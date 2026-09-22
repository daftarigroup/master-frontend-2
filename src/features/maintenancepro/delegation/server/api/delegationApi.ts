import { api } from '@/lib/axios';
import type {
  CreateTransferDto,
  ExtendDueDateDto,
  MarkDoneDto,
  MarkNotDoneDto,
  WorkOrder,
  WorkOrdersListResponse,
  WorkOrdersQueryParams,
} from '../../types/types';

export const fetchWorkOrders = async (
  params: WorkOrdersQueryParams = {}
): Promise<WorkOrdersListResponse> => {
  const res = await api.get('/maintenance/work-orders', { params });
  return res.data;
};

export const transferWorkOrder = async (data: CreateTransferDto): Promise<{ message: string }> => {
  const { workOrderId, ...body } = data;
  const res = await api.post(`/maintenance/work-orders/${workOrderId}/transfer`, body);
  return res.data?.data ?? { message: 'Transferred' };
};

export const markWorkOrderDone = async (data: MarkDoneDto): Promise<void> => {
  const { workOrderId, ...body } = data;
  await api.post(`/maintenance/work-orders/${workOrderId}/mark-done`, body);
};

export const markWorkOrderNotDone = async (data: MarkNotDoneDto): Promise<void> => {
  const { workOrderId, ...body } = data;
  await api.post(`/maintenance/work-orders/${workOrderId}/mark-not-done`, body);
};

export const extendWorkOrderDueDate = async (data: ExtendDueDateDto): Promise<WorkOrder> => {
  const { workOrderId, ...body } = data;
  const res = await api.post(`/maintenance/work-orders/${workOrderId}/extend`, body);
  return res.data?.data ?? res.data;
};

export const holdWorkOrder = async (workOrderId: string, reason?: string): Promise<void> => {
  await api.post(`/maintenance/work-orders/${workOrderId}/hold`, { reason });
};

export const cancelWorkOrder = async (workOrderId: string, reason: string): Promise<void> => {
  await api.post(`/maintenance/work-orders/${workOrderId}/cancel`, { reason });
};

export const approveWorkOrder = async (workOrderId: string, reviewNote?: string): Promise<void> => {
  await api.post(`/maintenance/work-orders/${workOrderId}/approve`, { reviewNote });
};

export const rejectWorkOrder = async (
  workOrderId: string,
  reviewNote: string,
  newDueDate?: string
): Promise<void> => {
  await api.post(`/maintenance/work-orders/${workOrderId}/reject`, { reviewNote, newDueDate });
};

export const fetchApprovalHistory = async (
  params: { scope?: string; status?: string; page?: number; limit?: number; mode?: string } = {}
): Promise<{ data: WorkOrder[]; pagination: unknown }> => {
  const res = await api.get('/maintenance/work-orders/approval-history', { params });
  return { data: res.data?.data ?? [], pagination: res.data?.pagination ?? {} };
};
