import { actAsTenantHeaders } from '@/features/organization/utils/actAsTenant';
import { uploadFileViaPresignedUrl } from '@/lib/api/storage.api';
import { api } from '@/lib/axios';
import type { GatePass, GatePassStats } from '../../types/types';

export interface IssueGatePassPayload {
  employeeId: string;
  placeToVisit: string;
  reason: string;
  departureTime: string; // ISO
  expectedArrival: string; // ISO
  whatsappNo?: string;
  status?: string;
}

export const fetchGatePasses = async (): Promise<GatePass[]> => {
  const response = await api.get('/hrfms/gatepass');
  return response.data.data;
};

export const fetchGatePassStats = async (): Promise<GatePassStats> => {
  const response = await api.get('/hrfms/gatepass/stats');
  return response.data.data;
};

export const fetchGatePassById = async (id: string | number): Promise<GatePass | null> => {
  const response = await api.get(`/hrfms/gatepass/${id}`);
  return response.data.data;
};

export const fetchGatePassesByEmployee = async (employeeId: string): Promise<GatePass[]> => {
  const response = await api.get(`/hrfms/gatepass/employee/${employeeId}`);
  return response.data.data;
};

export const issueGatePass = async (
  data: IssueGatePassPayload,
  attachment?: File,
  actAsTenantId?: string
): Promise<GatePass> => {
  const attachmentUrl = attachment
    ? await uploadFileViaPresignedUrl(attachment, 'uploads', 'gate-passes', actAsTenantId)
    : undefined;
  const response = await api.post(
    '/hrfms/gatepass/issue',
    { ...data, attachment: attachmentUrl },
    actAsTenantHeaders(actAsTenantId)
  );
  return response.data.data;
};

export const updateGatePassStatus = async (
  id: string | number,
  status: string,
  actAsTenantId?: string
): Promise<GatePass> => {
  const response = await api.patch(
    `/hrfms/gatepass/${id}/status`,
    { status },
    actAsTenantHeaders(actAsTenantId)
  );
  return response.data.data;
};

export const deleteGatePass = async (
  id: string | number,
  actAsTenantId?: string
): Promise<void> => {
  await api.delete(`/hrfms/gatepass/${id}`, actAsTenantHeaders(actAsTenantId));
};
