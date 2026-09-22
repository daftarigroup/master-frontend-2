import { actAsTenantHeaders } from '@/features/organization/utils/actAsTenant';
import { api } from '@/lib/axios';
import type { ActivityType } from '../../types/types';

export const fetchActivityTypes = async (actAsTenantId?: string): Promise<ActivityType[]> => {
  const res = await api.get('/maintenance/activity-types', actAsTenantHeaders(actAsTenantId));
  return res.data.data;
};

export const createActivityType = async (
  name: string,
  actAsTenantId?: string
): Promise<ActivityType> => {
  const res = await api.post(
    '/maintenance/activity-types',
    { name },
    actAsTenantHeaders(actAsTenantId)
  );
  return res.data.data;
};

export const deleteActivityType = async (id: string): Promise<void> => {
  await api.delete(`/maintenance/activity-types/${id}`);
};
