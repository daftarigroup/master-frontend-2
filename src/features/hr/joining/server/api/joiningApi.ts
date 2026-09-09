// HR Joining API
import { actAsTenantHeaders } from '@/features/organization/utils/actAsTenant';
import { api } from '@/lib/axios';
import type { Joining } from '../../types/types';

export interface InitiateJoiningPayload {
  candidateId: number;
  joiningDate: string;
  status?: string;
}

export interface UpdateJoiningPayload {
  status?: string;
  documents?: Record<string, unknown>;
}

export const fetchJoinings = async (): Promise<Joining[]> => {
  const res = await api.get('/hrfms/joining');
  return res.data.data ?? [];
};

export const initiateJoining = async (
  payload: InitiateJoiningPayload,
  actAsTenantId?: string
): Promise<Joining> => {
  // Real route is POST /hrfms/joining/initiate (see joining.routes.ts) — this
  // used to call the wrong path entirely (POST /hrfms/joining, which doesn't
  // exist), a pre-existing bug unrelated to cross-company support.
  const res = await api.post('/hrfms/joining/initiate', payload, actAsTenantHeaders(actAsTenantId));
  return res.data.data;
};

export const updateJoining = async (
  id: number,
  data: UpdateJoiningPayload,
  actAsTenantId?: string
): Promise<Joining> => {
  // Real route is PUT /hrfms/joining/:id, not PATCH (see joining.routes.ts) —
  // same pre-existing wrong-method bug as initiateJoining above.
  const res = await api.put(`/hrfms/joining/${id}`, data, actAsTenantHeaders(actAsTenantId));
  return res.data.data;
};
