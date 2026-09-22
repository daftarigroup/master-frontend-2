import { actAsTenantHeaders } from '@/features/organization/utils/actAsTenant';
import { api } from '@/lib/axios';

export interface AssignableUser {
  id: string;
  name: string;
  email: string;
  role: string;
  employeeId: string | null;
}

export const fetchAssignableUsers = async (actAsTenantId?: string): Promise<AssignableUser[]> => {
  const res = await api.get('/user/list', actAsTenantHeaders(actAsTenantId));
  return res.data?.data ?? [];
};
