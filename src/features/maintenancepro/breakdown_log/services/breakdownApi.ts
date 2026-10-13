// Real Breakdown Report API — talks to master-backend's Maintenance module.
import { api } from '@/lib/axios';
import type {
  BreakdownReport,
  BreakdownStatus,
  CreateBreakdownDto,
  RealUser,
  ResolveBreakdownDto,
} from '../types/types';

export const fetchBreakdowns = async (params?: {
  machineId?: string;
  isResolved?: boolean;
  severity?: string;
  firmId?: string;
  page?: number;
  limit?: number;
}): Promise<{
  data: BreakdownReport[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}> => {
  const res = await api.get('/maintenance/breakdowns', { params });
  return res.data;
};

export const createBreakdown = async (dto: CreateBreakdownDto, _actAsTenantId?: string): Promise<BreakdownReport> => {
  const res = await api.post('/maintenance/breakdowns', dto);
  return res.data.data;
};

export const resolveBreakdown = async (id: string, dto: ResolveBreakdownDto): Promise<void> => {
  await api.put(`/maintenance/breakdowns/${id}/resolve`, dto);
};

export const updateBreakdownStatus = async (id: string, status: BreakdownStatus): Promise<void> => {
  await api.put(`/maintenance/breakdowns/${id}/status`, { status });
};

export const fetchUsersForBreakdown = async (): Promise<RealUser[]> => {
  const res = await api.get('/user/list');
  const items: any[] = res.data?.data ?? [];
  return items.map((u) => ({ id: u.id, name: u.name, role: u.role || 'Technician' }));
};

export const fetchAvailableTechnicians = async (_actAsTenantId?: string): Promise<RealUser[]> => {
  return fetchUsersForBreakdown();
};

export const fetchMachinesForBreakdown = async (
  actAsTenantId?: string
): Promise<
  {
    id: string;
    name: string;
    assetCode: string;
    firmId?: string | number | null;
    firmName?: string | null;
    firm?: { id: string | number; name: string } | null;
  }[]
> => {
  const res = await api.get('/maintenance/machines', {
    params: { limit: 200, page: 1, ...(actAsTenantId ? { firmId: actAsTenantId } : {}) },
  });
  const items: any[] = res.data?.data ?? [];
  return items.map((m) => ({
    id: m.id,
    name: m.name,
    assetCode: m.assetCode,
    firmId: m.firmId,
    firmName: m.firmName,
    firm: m.firm,
  }));
};
