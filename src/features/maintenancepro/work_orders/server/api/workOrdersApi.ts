import { api } from '@/lib/axios';
import type { WorkOrder, WorkOrdersListResponse } from '../../../unique_task/server/api/workordersApi';

export type WorkOrderKind = 'SCHEDULED' | 'BREAKDOWN' | 'REPAIR' | 'ONE_TIME';
export type OutsourceStage = 'TO_SEND' | 'SENT' | 'RECEIVED' | 'PAID';

export interface OutsourceInfo {
  status: OutsourceStage;
  vendorId: string | null;
  vendorName: string | null;
  sentAt: string | null;
  receivedAt: string | null;
  paidAt: string | null;
  billNo: string | null;
  billAmount: number | null;
  billUrl: string | null;
}

/** One part (Store item) an in-house repair needs, and how much of it the Store has issued (approved Store issues only). */
export interface PartLine {
  id: string;
  itemId: string | null;
  itemName: string;
  groupHead: string;
  uom: string | null;
  quantity: number;
  issued: number;
  remaining: number;
  pending?: number;
  open?: number;
  complete: boolean;
  note: string | null;
  /** the Store indent raised from this line (SI-0001), if any */
  indentNumber: string | null;
  /** absent for users without cost access */
  issuedAmount?: number | null;
  vendorName?: string | null;
}

export interface PartsInfo {
  lines: PartLine[];
  total: number;
  complete: number;
  /** some listed part is not fully issued yet (or none is listed): the repair cannot be completed */
  waiting: boolean;
  suggestedVendor?: string | null;
}

export interface PartInput {
  itemName: string;
  groupHead: string;
  quantity: number;
  note?: string;
}

/** The list DTO carries a few fields the older WorkOrder type does not declare. */
export type WorkOrderRow = WorkOrder & {
  /** in-house "Material required?": null = not decided yet (older work orders) */
  materialRequired?: boolean | null;
  documentUrl?: string | null;
  parts?: PartsInfo | null;
  title?: string | null;
  priority?: number | null;
  outsource?: OutsourceInfo | null;
  /** Assigned To does the work; the Responsible Person is accountable and approves (never their own work) */
  assignedToId?: string | null;
  responsibleId?: string | null;
  responsible?: { id: string; name: string } | null;
  scheduleName?: string | null;
  serviceMode?: 'IN_HOUSE' | 'VENDOR';
  /** estimate / actual split: absent for users without cost access */
  costDetail?: { estPartsCost: number | null; estLabourCost: number | null; actualPartsCost: number | null; actualLabourCost: number | null };
};

export interface WorkOrderListParams {
  page?: number;
  limit?: number;
  type?: WorkOrderKind;
  status?: string;
  machineId?: string;
  search?: string;
  overdue?: boolean;
  outsourced?: boolean;
  /** repairs that need Store parts and are not finished */
  waitingParts?: boolean;
  outsourceStatus?: OutsourceStage;
  firmId?: string;
  /** Assigned to me | I'm responsible | Created by me; leave out for all (a site user always sees only their own) */
  view?: 'assigned' | 'responsible' | 'created';
  assigneeId?: string;
  responsibleId?: string;
  pendingMyApproval?: boolean;
}

export interface CreateWorkOrderPayload {
  type: WorkOrderKind;
  machineId: string;
  title: string;
  description?: string;
  activityTypeId?: string;
  dueAt: string;
  assigneeId?: string;
  responsibleId?: string;
  priority: number;
  documentUrl?: string;
  firmId?: string;
  failureType?: string;
  failureTime?: string;
  estimatedDowntimeHours?: number;
  rootCause?: string;
  remarks?: string;
}

export const fetchWorkOrderList = async (
  params: WorkOrderListParams
): Promise<Omit<WorkOrdersListResponse, 'data'> & { data: WorkOrderRow[] }> => {
  const res = await api.get('/maintenance/work-orders', { params });
  return res.data;
};

export const createWorkOrder = async (payload: CreateWorkOrderPayload) => {
  const res = await api.post('/maintenance/work-orders', payload);
  return res.data;
};

/** Reassign (the older name is transfer): a reason is required and is written to the work order's history. */
export const reassignWorkOrder = async (id: string, body: { toUserId: string; reason: string }) => {
  const res = await api.post(`/maintenance/work-orders/${id}/reassign`, { ...body, type: 'OCCURRENCE_TRANSFER' });
  return res.data;
};

export const cancelWorkOrder = async (id: string, reason: string) => {
  const res = await api.post(`/maintenance/work-orders/${id}/cancel`, { reason });
  return res.data;
};

export const outsourceSend = async (id: string, body: { vendorId?: string; vendorName?: string; sentAt?: string }) => {
  const res = await api.post(`/maintenance/work-orders/${id}/outsource/send`, body);
  return res.data;
};

export const outsourceReceive = async (
  id: string,
  body: { receivedAt?: string; billNo?: string; billAmount: number; billUrl?: string }
) => {
  const res = await api.post(`/maintenance/work-orders/${id}/outsource/receive`, body);
  return res.data;
};

export const outsourcePay = async (id: string, body: { paidAt?: string; amount?: number }) => {
  const res = await api.post(`/maintenance/work-orders/${id}/outsource/pay`, body);
  return res.data;
};

// ---- Repair parts from the Store: list the parts, raise the indent in one click, the Store issues them ----

export interface RepairPartsResult {
  materialRequired: boolean | null;
  parts: PartsInfo;
}

/** The in-house decision: "material required?" and the parts the repair needs. Saving keeps the repair in progress. */
export const saveRepairPlan = async (id: string, body: { materialRequired: boolean; partsNeeded?: PartInput[] }) => {
  const res = await api.post(`/maintenance/work-orders/${id}/process-repair`, { status: 'in_progress', typeOfWork: 'in_house', ...body });
  return res.data;
};

export const fetchPartsNeeded = async (id: string): Promise<RepairPartsResult> => {
  const res = await api.get(`/maintenance/work-orders/${id}/parts-needed`);
  return res.data.data;
};

export const updatePartNeeded = async (id: string, partId: string, body: { quantity?: number; note?: string }): Promise<RepairPartsResult> => {
  const res = await api.patch(`/maintenance/work-orders/${id}/parts-needed/${partId}`, body);
  return res.data.data;
};

export const removePartNeeded = async (id: string, partId: string): Promise<RepairPartsResult> => {
  const res = await api.delete(`/maintenance/work-orders/${id}/parts-needed/${partId}`);
  return res.data.data;
};

/** One click: raises the Store indent for the listed parts that are not indented yet (`again` raises all of them again). */
export const raisePartsIndent = async (id: string, body: { again?: boolean } = {}): Promise<RepairPartsResult & { indentNumber: string; count: number }> => {
  const res = await api.post(`/maintenance/work-orders/${id}/parts-needed/indent`, body);
  return res.data.data;
};
