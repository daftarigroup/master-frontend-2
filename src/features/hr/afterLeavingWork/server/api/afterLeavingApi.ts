import { actAsTenantHeaders } from '@/features/organization/utils/actAsTenant';
import { api } from '@/lib/axios';

export interface ActiveLoan {
  id: string;
  amount: number;
  outstandingBalance: number;
  purpose: string | null;
  status: string;
}

export interface LeavingEmployee {
  id: number;
  employeeId: string;
  name: string;
  email: string | null;
  phone: string | null;
  designation: string | null;
  department: { id: string; name: string } | null;
  status: string;
  resignationDate: string | null;
  terminationDate: string | null;
  separationType: string | null;
  lastWorkingDay: string | null;
  leavingReason: string | null;
  exitChecklist: Record<string, unknown> | null;
  advancePaymentTaken: boolean;
  advancePaymentAmount: number | null;
  advancePaymentSettled: boolean;
  experienceLetterIssued: boolean;
  userAccount: { id: string; isActive: boolean } | null;
  loans: ActiveLoan[];
  exitTatPlannedAt?: string | null;
  exitTatDelayMinutes?: number | null;
  exitProcessedAt?: string | null;
  exitProcessedById?: string | null;
  exitProcessedBy?: { id: string; name: string | null } | null;
  yourProjectedExitPlannedAt?: string | null;
  // Present only under "All Companies" (merged) view.
  tenant?: { id: string; name: string } | null;
}

export interface ActiveEmployee {
  id: number;
  name: string;
  designation: string | null;
  department: { id: string; name: string } | null;
  // Present only under "All Companies" (merged) view.
  tenant?: { id: string; name: string } | null;
}

export interface RecordResignationPayload {
  employeeId: number;
  resignationDate: string;
  lastWorkingDay: string;
  leavingReason?: string;
}

export interface ProcessExitPayload {
  status?: string;
  exitChecklist?: Record<string, unknown>;
  advancePaymentTaken?: boolean;
  advancePaymentAmount?: number | null;
  advancePaymentSettled?: boolean;
  experienceLetterIssued?: boolean;
}

export const fetchLeavingEmployees = async (): Promise<LeavingEmployee[]> => {
  const res = await api.get('/hrfms/employee/leaving');
  return res.data.data;
};

export const fetchActiveEmployees = async (): Promise<ActiveEmployee[]> => {
  const res = await api.get('/hrfms/employee');
  const all: ActiveEmployee[] = res.data.data ?? [];
  return all.filter((e: any) => e.status === 'active');
};

export const recordResignation = async (
  payload: RecordResignationPayload,
  actAsTenantId?: string
): Promise<LeavingEmployee> => {
  const res = await api.post('/hrfms/employee/resign', payload, actAsTenantHeaders(actAsTenantId));
  return res.data.data;
};

export const processExit = async (
  id: number,
  payload: ProcessExitPayload,
  actAsTenantId?: string
): Promise<LeavingEmployee> => {
  const res = await api.patch(
    `/hrfms/employee/${id}/process-exit`,
    payload,
    actAsTenantHeaders(actAsTenantId)
  );
  return res.data.data;
};

export const deactivateUserAccount = async (
  id: number,
  actAsTenantId?: string
): Promise<{ id: string; isActive: boolean; email: string }> => {
  const res = await api.patch(
    `/hrfms/employee/${id}/deactivate-user`,
    undefined,
    actAsTenantHeaders(actAsTenantId)
  );
  return res.data.data;
};

export const settleLoan = async (loanId: string, actAsTenantId?: string): Promise<void> => {
  await api.patch(
    `/hrfms/advance-request/loan/${loanId}/settle`,
    undefined,
    actAsTenantHeaders(actAsTenantId)
  );
};
