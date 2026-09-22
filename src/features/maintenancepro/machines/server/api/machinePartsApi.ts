import { actAsTenantHeaders } from '@/features/organization/utils/actAsTenant';
import { api } from '@/lib/axios';
import type {
  CreateMachinePartPayload,
  MachinePart,
  UpdateMachinePartPayload,
} from '../../types/types';

export const fetchMachineParts = async (
  params?: {
    machineId?: string;
    search?: string;
    page?: number;
    limit?: number;
  },
  actAsTenantId?: string
) => {
  const response = await api.get('/maintenance/machine-parts', {
    params,
    ...actAsTenantHeaders(actAsTenantId),
  });
  return response.data;
};

export const fetchMachinePartDetails = async (id: string): Promise<MachinePart> => {
  const response = await api.get(`/maintenance/machine-parts/${id}`);
  return response.data.data;
};

export const createMachinePart = async (
  payload: CreateMachinePartPayload
): Promise<MachinePart> => {
  const response = await api.post('/maintenance/machine-parts', payload);
  return response.data.data;
};

export const updateMachinePart = async (
  id: string,
  payload: UpdateMachinePartPayload
): Promise<MachinePart> => {
  const response = await api.patch(`/maintenance/machine-parts/${id}`, payload);
  return response.data.data;
};

export const deleteMachinePart = async (id: string): Promise<void> => {
  await api.delete(`/maintenance/machine-parts/${id}`);
};
