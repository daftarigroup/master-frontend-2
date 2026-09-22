// Types for Maintenance Delegation / Work Order Transfer

export type WorkOrderStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'PENDING_APPROVAL'
  | 'COMPLETED'
  | 'COMPLETED_LATE'
  | 'OVERDUE'
  | 'ON_LEAVE'
  | 'MISSED'
  | 'SKIPPED'
  | 'CANCELLED'
  | 'ON_HOLD';

export type WorkOrderType = 'SCHEDULED' | 'BREAKDOWN' | 'ONE_TIME';

export type TransferType = 'OCCURRENCE_TRANSFER' | 'PERMANENT_TRANSFER' | 'TEMPORARY_COVER';

export interface WorkOrderMachine {
  id: string;
  name: string;
  assetCode: string;
}

export interface WorkOrderPlan {
  id: string;
  title: string;
  activityType: { id: string; name: string; code: string | null } | null;
  frequency?: string;
  description?: string;
}

export interface WorkOrderAssignee {
  id: string;
  name: string;
  email: string;
}

export interface WorkOrderApprovalRequest {
  id: string;
  submissionType: string;
  submissionNote: string | null;
  status: string;
  reviewNote: string | null;
  submittedAt: string | null;
  submittedBy?: {
    id?: string;
    name?: string;
  } | null;
  reviewedAt: string | null;
  reviewer?: {
    id: string;
    name: string;
  };
}

export interface WorkOrderTransfer {
  id: string;
  fromUserId: string;
  toUserId: string;
  type: string;
  status: string;
  reason: string | null;
  createdAt: string;
  fromUser?: { name: string };
  toUser?: { name: string };
}

export interface WorkOrder {
  id: string;
  tenantId: string;
  planId: string | null;
  machineId: string;
  currentAssigneeId: string;
  type: WorkOrderType;
  status: WorkOrderStatus;
  priority: number;
  scheduledDate: string;
  actualDueDate: string;
  wasShifted: boolean;
  startedAt: string | null;
  completedAt: string | null;
  notes?: string | null;
  slaBreach: boolean;
  escalationLevel: number;
  createdAt: string;
  updatedAt: string;

  machine: WorkOrderMachine | null;
  plan: WorkOrderPlan | null;
  currentAssignee: WorkOrderAssignee | null;
  completedBy: WorkOrderAssignee | null;
  approvalRequest: WorkOrderApprovalRequest | null;
  transfers?: WorkOrderTransfer[];
}

export interface WorkOrdersPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface WorkOrdersListResponse {
  status: string;
  data: WorkOrder[];
  pagination: WorkOrdersPagination;
}

export interface WorkOrdersQueryParams {
  machineId?: string;
  status?: WorkOrderStatus;
  type?: WorkOrderType;
  assigneeId?: string;
  view?: string;
  scope?: 'checklist' | 'delegation' | 'outbox' | 'transfer';
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateTransferDto {
  workOrderId: string;
  toUserId: string;
  type: TransferType;
  reason?: string;
  tempStartDate?: string;
  tempEndDate?: string;
  newDueDate?: string;
}

export interface MarkDoneDto {
  workOrderId: string;
  completionNote?: string;
}

export interface MarkNotDoneDto {
  workOrderId: string;
  reason: string;
}

export interface ExtendDueDateDto {
  workOrderId: string;
  newDueDate: string;
  reason?: string;
}

export const TRANSFER_TYPE_LABELS: Record<TransferType, string> = {
  OCCURRENCE_TRANSFER: 'Single Occurrence',
  PERMANENT_TRANSFER: 'Permanent Transfer',
  TEMPORARY_COVER: 'Temporary Cover',
};

export const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  PENDING_APPROVAL: 'Pending Approval',
  COMPLETED: 'Completed',
  COMPLETED_LATE: 'Completed Late',
  OVERDUE: 'Overdue',
  ON_LEAVE: 'On Leave',
  MISSED: 'Missed',
  SKIPPED: 'Skipped',
  CANCELLED: 'Cancelled',
  ON_HOLD: 'On Hold',
};

export const WORK_ORDER_TYPE_LABELS: Record<WorkOrderType, string> = {
  SCHEDULED: 'Scheduled',
  BREAKDOWN: 'Breakdown',
  ONE_TIME: 'One Time',
};
