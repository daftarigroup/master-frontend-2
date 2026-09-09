import { actAsTenantHeaders } from '@/features/organization/utils/actAsTenant';
import { api } from '@/lib/axios';
import type {
  AdvanceDashboardStats,
  AdvanceRequest,
  LoanHistory,
  SubmitAdvanceRequestDto,
  UpdateAdvanceRequestDto,
  UpdateAdvanceStatusDto,
} from '../../types/types';

export const fetchAdvanceRequests = async (): Promise<AdvanceRequest[]> => {
  const response = await api.get('/hrfms/advance-request');
  return response.data.data;
};

export const fetchAdvanceRequestsByEmployee = async (
  employeeId: string
): Promise<AdvanceRequest[]> => {
  const response = await api.get(`/hrfms/advance-request/employee/${employeeId}`);
  return response.data.data;
};

export const fetchAdvanceRequestById = async (id: number): Promise<AdvanceRequest> => {
  const response = await api.get(`/hrfms/advance-request/${id}`);
  return response.data.data;
};

export const submitAdvanceRequest = async (
  data: SubmitAdvanceRequestDto
): Promise<AdvanceRequest> => {
  const response = await api.post('/hrfms/advance-request/submit', data);
  return response.data.data;
};

export const updateAdvanceRequestStatus = async (
  id: number,
  data: UpdateAdvanceStatusDto,
  actAsTenantId?: string
): Promise<AdvanceRequest> => {
  const response = await api.patch(
    `/hrfms/advance-request/${id}/status`,
    data,
    actAsTenantHeaders(actAsTenantId)
  );
  return response.data.data;
};

export const updateAdvanceRequest = async (
  id: number,
  data: UpdateAdvanceRequestDto,
  actAsTenantId?: string
): Promise<AdvanceRequest> => {
  const response = await api.patch(
    `/hrfms/advance-request/${id}`,
    data,
    actAsTenantHeaders(actAsTenantId)
  );
  return response.data.data;
};

export const deleteAdvanceRequest = async (id: number): Promise<void> => {
  await api.delete(`/hrfms/advance-request/${id}`);
};

export const fetchLoanHistory = async (id: number): Promise<LoanHistory | null> => {
  const response = await api.get(`/hrfms/advance-request/${id}/loan-history`);
  return response.data.data;
};

export const fetchAdvanceDashboardStats = async (): Promise<AdvanceDashboardStats> => {
  const response = await api.get('/hrfms/advance-request/stats');
  return response.data.data;
};

export const markAdvanceComplete = async (
  id: number,
  actAsTenantId?: string
): Promise<AdvanceRequest> => {
  const response = await api.patch(
    `/hrfms/advance-request/${id}/complete`,
    undefined,
    actAsTenantHeaders(actAsTenantId)
  );
  return response.data.data;
};
