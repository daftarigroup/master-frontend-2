// HR Leaving / Offboarding API
import { api } from '@/lib/axios';

export interface EmployeeOffboard {
  id: string;
  employeeId: string;
  name: string;
  email?: string | null;
  status: string;
  lastWorkingDay: string | null;
  leavingReason?: string | null;
  designation?: string | null;
  department?: { id: string; name: string } | null;
  noticePeriodDays?: number | null;
}

export interface SubmitResignationPayload {
  leavingReason: string;
  lastWorkingDay: string;
}

export interface UpdateSeparationStatusPayload {
  status: string;
  exitInterviewDate?: string;
  exitInterviewNotes?: string;
}

export const fetchLeavingEmployees = async (): Promise<EmployeeOffboard[]> => {
  const res = await api.get('/hrfms/leaving');
  return res.data.data ?? [];
};

export const fetchMyOffboardingStatus = async (): Promise<EmployeeOffboard | null> => {
  const res = await api.get('/hrfms/leaving/my-status');
  return res.data.data ?? null;
};

export const submitResignation = async (
  payload: SubmitResignationPayload
): Promise<EmployeeOffboard> => {
  const res = await api.post('/hrfms/leaving/resign', payload);
  return res.data.data;
};

export const updateSeparationStatus = async (
  id: string,
  data: UpdateSeparationStatusPayload
): Promise<EmployeeOffboard> => {
  const res = await api.patch(`/hrfms/leaving/${id}`, data);
  return res.data.data;
};
