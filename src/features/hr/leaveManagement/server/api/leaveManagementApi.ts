// HR Leave Management API - real backend
import { actAsTenantHeaders } from '@/features/organization/utils/actAsTenant';
import { api } from '@/lib/axios';
import type { LeaveRequest, TaskImpact, TaskTransferDecision } from '../../types/types';

export interface AvailableTransferUser {
  id: string;
  name: string;
  employeeId: string | null;
  leaves: { fromDate: string; toDate: string }[];
}

export interface LeaveDayEntry {
  date: string; // YYYY-MM-DD
  type: 'full' | 'half';
  half?: 'first' | 'second'; // only when type === 'half'
  decision?: 'approved' | 'rejected'; // set by HR when processing
}

export interface SubmitLeavePayload {
  employeeId: string;
  employeeName: string;
  departmentId?: string;
  hodName: string;
  hodId: string;
  substitute: string;
  fromDate: string; // ISO
  toDate: string; // ISO
  leaveDays: LeaveDayEntry[];
  reason: string;
  status?: LeaveRequest['status'];
}

export const fetchLeaveRequests = async (): Promise<LeaveRequest[]> => {
  const response = await api.get('/hrfms/leave');
  return response.data.data;
};

export const fetchLeaveById = async (id: string): Promise<LeaveRequest | null> => {
  const response = await api.get(`/hrfms/leave/${id}`);
  return response.data.data;
};

export const fetchLeavesByEmployee = async (employeeId: string): Promise<LeaveRequest[]> => {
  const response = await api.get(`/hrfms/leave/employee/${employeeId}`);
  return response.data.data;
};

export const fetchPendingLeaves = async (): Promise<LeaveRequest[]> => {
  const response = await api.get('/hrfms/leave');
  const all: LeaveRequest[] = response.data.data;
  return all.filter((l) => l.status === 'pending');
};

export const submitLeave = async (data: SubmitLeavePayload): Promise<LeaveRequest> => {
  const response = await api.post('/hrfms/leave/submit', data);
  return response.data.data;
};

export const fetchPendingApprovals = async (): Promise<LeaveRequest[]> => {
  const response = await api.get('/hrfms/leave/approvals/pending');
  return response.data.data;
};

export const updateLeaveStatus = async (
  id: string,
  status: LeaveRequest['status'],
  remarks?: string,
  leaveDays?: LeaveDayEntry[],
  taskDecisions?: TaskTransferDecision[],
  actAsTenantId?: string
): Promise<LeaveRequest> => {
  const response = await api.patch(
    `/hrfms/leave/${id}/status`,
    { status, remarks, leaveDays, taskDecisions },
    actAsTenantHeaders(actAsTenantId)
  );
  return response.data.data;
};

export const deleteLeave = async (id: string): Promise<void> => {
  await api.delete(`/hrfms/leave/${id}`);
};

// Preview what approving this leave would affect — call BEFORE submitting the
// approval so the reviewer can resolve every item; the backend blocks the
// approval itself until matching taskDecisions are submitted. Needs the same
// actAsTenantId as the approval itself when the leave belongs to a
// non-active company — this call happens first, and without it the impact
// preview would silently run against the wrong company's tasks.
export const fetchTaskImpact = async (id: string, actAsTenantId?: string): Promise<TaskImpact> => {
  const response = await api.get(
    `/hrfms/leave/${id}/task-impact`,
    actAsTenantHeaders(actAsTenantId)
  );
  return response.data.data;
};

// Same tenant-wide "who's on leave when" list the Checklist & Delegation
// leave-delegation feature uses, reused here so the transfer-decision modal
// can gray out/flag candidates who are also on leave during this range.
export const fetchAvailableTransferUsers = async (
  actAsTenantId?: string
): Promise<AvailableTransferUser[]> => {
  const response = await api.get(
    '/checklist-delegation/leave-delegation/available-users',
    actAsTenantHeaders(actAsTenantId)
  );
  return response.data?.data ?? response.data ?? [];
};

export const getDepartments = (): string[] => {
  return ['Engineering', 'Production', 'Quality', 'Sales', 'Marketing', 'HR', 'Finance', 'Admin'];
};
