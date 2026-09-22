// Real Maintenance Work Order API — talks to master-backend's Maintenance module
// (src/modules/maintenance). Converged onto the same `/maintenance/work-orders`
// endpoints `delegation/server/api/delegationApi.ts` already used, instead of the
// mock store this file used to read from — same response shape either way, so
// call sites don't need to change.
import { api } from '@/lib/axios';

export type WorkOrderStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'PENDING_APPROVAL'
  | 'COMPLETED'
  | 'COMPLETED_LATE'
  | 'COMPLETION_REJECTED'
  | 'OVERDUE'
  | 'ON_LEAVE'
  | 'MISSED'
  | 'SKIPPED'
  | 'CANCELLED'
  | 'ON_HOLD';

export interface ApprovalRequest {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
  reviewedBy: { id: string; name: string } | null;
  reviewer?: { id?: string; name?: string; email?: string } | null;
  submittedBy?: { id?: string; name?: string } | null;
  submissionNote?: string | null;
  [key: string]: any;
}

export interface ReportWorkOrderDto {
  workDone?: string;
  partsUsed?: string[];
  actualMinutesTaken?: number;
  remarks?: string;
  documentUrl?: string;
  reportStatus?: string;
  [key: string]: any;
}

export interface RepairProcessData {
  repairStatus?: string;
  parts?: Array<{
    partId?: string;
    partName: string;
    quantity: number;
    vendorName?: string;
    warrantyFromDate?: string;
    warrantyToDate?: string;
  }>;
  billAmount?: number;
  workDone?: string;
  remarks?: string;
  workDoneBy?: string;
  typeOfWork?: string;
  photoUrl?: string;
  billUrl?: string;
  savedStatus?: string | null;
  maintenanceCost?: number;
  processedAt?: string;
  [key: string]: any;
}

export interface WorkOrder {
  id: string;
  workOrderCode?: string;
  tenantId: string;
  planId: string | null;
  machineId: string;
  currentAssigneeId: string | null;
  status: WorkOrderStatus;
  type: string;
  scheduledDate: string | null;
  actualDueDate: string;
  startedAt: string | null;
  completedAt: string | null;
  skipReason: string | null;
  cancelReason: string | null;
  completionNote: string | null;
  cost?: number | null;
  photoUrl?: string;
  billUrl?: string;
  typeOfWork?: string;
  repairParts?: Array<{
    partId?: string;
    partName: string;
    quantity: number;
    vendorName?: string;
    warrantyFromDate?: string;
    warrantyToDate?: string;
  }>;
  actualMinutesTaken: number | null;
  checklistResponses?: {
    replacements?: ReplacementItem[];
    repairProcess?: RepairProcessData;
    repairProcessHistory?: (RepairProcessData & { savedStatus?: string })[];
  } | null;
  slaBreach: boolean;
  createdAt: string;
  machine: {
    id: string;
    name: string;
    assetCode: string;
    firmId?: string | number | null;
    firmName?: string | null;
    firm?: { id: string | number; name: string } | null;
  } | null;
  machinePart: { id: string; name: string; partNumber: string | null } | null;
  plan: {
    id: string;
    planCode?: string;
    title: string;
    activityType: { id: string; name: string; code: string | null } | null;
    frequency: string;
    description: string | null;
    creationType: string;
    documentUrl: string | null;
    documentMediaId: string | null;
    machinePart: { id: string; name: string; partNumber: string | null } | null;
    createdBy: { id: string; name: string } | null;
  } | null;
  currentAssignee: { id: string; name: string; email: string } | null;
  completedBy: { id: string; name: string } | null;
  transfers: Array<{
    fromUser: { name: string } | null;
    toUser: { name: string } | null;
  }>;
  approvalRequest: ApprovalRequest | null;
  statusLogs?: StatusLog[];
  repairLog?: {
    sendMachine: string | null;
    createdAt: string;
    changedBy: { id: string; name: string } | null;
  } | null;
  tenant?: { id: string; name: string } | null;
}

export interface WorkOrdersListResponse {
  status: string;
  data: WorkOrder[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface WorkOrdersQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  machineId?: string;
  assigneeId?: string;
  givenBy?: string;
  frequency?: string;
  from?: string;
  to?: string;
  search?: string;
  excludeRepair?: boolean;
  excludeWeekOff?: boolean;
  repairOnly?: boolean;
  isResolved?: boolean;
  overdue?: boolean;
  view?: 'personal';
  repairHistory?: boolean;
  [key: string]: any;
}

export interface WorkOrderStatsParams {
  machineId?: string;
  assigneeId?: string;
  givenBy?: string;
  frequency?: string;
  from?: string;
  to?: string;
  search?: string;
  excludeRepair?: boolean;
  excludeWeekOff?: boolean;
  view?: 'personal';
}

export interface WorkOrderStats {
  total: number;
  pending: number;
  completed: number;
  overdue: number;
  history: number;
  upcoming: number;
}

export interface StatusLog {
  id: string;
  fromStatus: WorkOrderStatus | null;
  toStatus: WorkOrderStatus;
  note: string | null;
  sendMachine: string | null;
  createdAt: string;
  changedBy: { id: string; name: string } | null;
}

export interface ReplacementItem {
  name: string;
  quantity: number;
  cost: number;
}

export const fetchWorkOrderById = async (id: string): Promise<{ status: string; data: WorkOrder }> => {
  const res = await api.get(`/maintenance/work-orders/${id}`);
  return res.data;
};

export const fetchWorkOrders = async (params: WorkOrdersQueryParams = {}): Promise<WorkOrdersListResponse> => {
  const res = await api.get('/maintenance/work-orders', { params });
  return res.data;
};

export const fetchWorkOrderStats = async (params: WorkOrderStatsParams = {}): Promise<{ status: string; data: WorkOrderStats }> => {
  const res = await api.get('/maintenance/work-orders/stats', { params });
  return res.data;
};

export const reportWorkOrder = async (id: string, data: ReportWorkOrderDto): Promise<{ status: string; data: WorkOrder }> => {
  const res = await api.post(`/maintenance/work-orders/${id}/mark-done`, {
    completionNote: data.workDone ?? data.remarks,
    actualMinutesTaken: data.actualMinutesTaken,
    partsUsed: data.partsUsed,
    documentUrl: data.documentUrl,
  });
  return { status: 'success', data: res.data?.data };
};

export const approveWorkOrder = async (id: string, reviewNote?: string): Promise<{ status: string; data: WorkOrder }> => {
  const res = await api.post(`/maintenance/work-orders/${id}/approve`, { reviewNote });
  return { status: 'success', data: res.data?.data };
};

export const rejectWorkOrder = async (id: string, reviewNote?: string): Promise<{ status: string; data: WorkOrder }> => {
  const res = await api.post(`/maintenance/work-orders/${id}/reject`, { reviewNote: reviewNote || 'Rejected' });
  return { status: 'success', data: res.data?.data };
};

export const deleteWorkOrder = async (id: string): Promise<void> => {
  await api.post(`/maintenance/work-orders/${id}/cancel`, { reason: 'Deleted from task list' });
};

export const skipWorkOrder = async (id: string, skipReason: string): Promise<{ status: string; data: WorkOrder }> => {
  const res = await api.post(`/maintenance/work-orders/${id}/skip`, { skipReason });
  return { status: 'success', data: res.data?.data };
};

export interface ProcessRepairPartInput {
  partId?: string;
  partName: string;
  quantity: number;
  vendorName?: string;
  warrantyFromDate?: string;
  warrantyToDate?: string;
}

export interface ProcessRepairDto {
  status: 'in_progress' | 'completed' | 'cancelled';
  parts?: ProcessRepairPartInput[];
  billAmount?: number;
  workDone?: string;
  remarks?: string;
  workDoneBy?: string;
  typeOfWork?: string;
  vendorName?: string;
  photoFile?: File;
  billFile?: File;
  photoUrl?: string;
  billUrl?: string;
}

export interface MachinePart {
  id: string;
  name: string;
  partNumber?: string | null;
}

export const fetchMachineParts = async (machineId: string): Promise<MachinePart[]> => {
  const res = await api.get('/maintenance/machine-parts', { params: { machineId, limit: 200 } });
  const items: any[] = res.data?.data ?? [];
  return items.map((p) => ({ id: p.id, name: p.name, partNumber: p.partNumber }));
};

export const processRepairWorkOrder = async (id: string, data: ProcessRepairDto): Promise<{ status: string; data: WorkOrder }> => {
  const res = await api.post(`/maintenance/work-orders/${id}/process-repair`, {
    status: data.status,
    parts: data.parts,
    billAmount: data.billAmount,
    workDone: data.workDone,
    remarks: data.remarks,
    workDoneBy: data.workDoneBy,
    typeOfWork: data.typeOfWork,
    photoUrl: data.photoUrl,
    billUrl: data.billUrl,
  });
  return res.data;
};

