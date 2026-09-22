// Real Maintenance Plan API — talks to master-backend's Maintenance module.
import { api } from '@/lib/axios';
import type {
  CreatePlanDto,
  MaintenancePlan,
  PlansListResponse,
  PlansQueryParams,
  UpdatePlanDto,
} from '../../types/types';

export const fetchPlans = async (params: PlansQueryParams = {}): Promise<PlansListResponse> => {
  const res = await api.get('/maintenance/plans', { params });
  return res.data;
};

export const fetchPlanById = async (id: string): Promise<MaintenancePlan> => {
  const res = await api.get(`/maintenance/plans/${id}`);
  return res.data.data;
};

export const createPlan = async (data: CreatePlanDto, _actAsTenantId?: string): Promise<MaintenancePlan> => {
  const res = await api.post('/maintenance/plans', data);
  return res.data.data;
};

export const updatePlan = async (id: string, data: UpdatePlanDto): Promise<MaintenancePlan> => {
  const res = await api.patch(`/maintenance/plans/${id}`, data);
  return res.data.data;
};

export const pausePlan = async (id: string, _data?: { pausedUntil?: string; pauseReason?: string }): Promise<void> => {
  await api.post(`/maintenance/plans/${id}/pause`);
};

export const resumePlan = async (id: string): Promise<void> => {
  await api.post(`/maintenance/plans/${id}/resume`);
};

export const archivePlan = async (id: string): Promise<void> => {
  await api.post(`/maintenance/plans/${id}/archive`);
};
