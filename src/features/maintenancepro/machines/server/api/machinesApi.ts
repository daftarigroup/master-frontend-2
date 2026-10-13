// Real Machine API — talks to master-backend's Maintenance module.
import { api } from '@/lib/axios';
import type { CreateMachinePayload, Machine, MachineListResponse } from '../../types/types';

export const fetchAllMachines = async (
  params?: {
    firmId?: string;
    departmentId?: string;
    assetId?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
    needMaintenance?: boolean;
    ownershipType?: 'OWNED' | 'RENTED';
  },
  _actAsTenantId?: string
): Promise<MachineListResponse> => {
  const res = await api.get('/maintenance/machines', { params });
  return res.data;
};

export const fetchMachineDetails = async (id: string | number): Promise<Machine> => {
  const res = await api.get(`/maintenance/machines/${id}`);
  return res.data.data;
};

export const createMachine = async (payload: CreateMachinePayload): Promise<Machine> => {
  const res = await api.post('/maintenance/machines', payload);
  return res.data.data;
};

export const updateMachine = async (id: string | number, payload: Partial<CreateMachinePayload>): Promise<Machine> => {
  const res = await api.patch(`/maintenance/machines/${id}`, payload);
  return res.data.data;
};

export const deleteMachine = async (id: string | number): Promise<void> => {
  await api.delete(`/maintenance/machines/${id}`);
};
