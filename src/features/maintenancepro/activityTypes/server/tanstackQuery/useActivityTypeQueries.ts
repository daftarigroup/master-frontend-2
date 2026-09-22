import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createActivityType, deleteActivityType, fetchActivityTypes } from '../api/activityTypeApi';

const ACTIVITY_TYPES_KEY = ['maintenance', 'activity-types'];

// actAsTenantId: the company picked via CompanySelectField/useCompanyPinForCreate
// for a create-flow (e.g. New Repair Task) — resolves the REPAIR activity type
// id for that company, instead of whatever the merged/active list happens to
// return first.
export const useActivityTypes = (actAsTenantId?: string) =>
  useQuery({
    queryKey: [...ACTIVITY_TYPES_KEY, actAsTenantId],
    queryFn: () => fetchActivityTypes(actAsTenantId),
    staleTime: 60_000,
  });

export const useCreateActivityType = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, actAsTenantId }: { name: string; actAsTenantId?: string }) =>
      createActivityType(name, actAsTenantId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ACTIVITY_TYPES_KEY }),
  });
};

export const useDeleteActivityType = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteActivityType(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ACTIVITY_TYPES_KEY }),
  });
};
