import { useQuery } from '@tanstack/react-query';
import { fetchAssignableUsers } from '../api/usersApi';

export const usersKeys = {
  all: ['maintenancepro', 'assignable-users'] as const,
};

// actAsTenantId: the company picked via CompanySelectField/useCompanyPinForCreate
// for a create-flow (e.g. New Repair Task) — scopes this dropdown's options to
// that company instead of whatever the active session tenant happens to be.
export const useAssignableUsers = (actAsTenantId?: string) => {
  return useQuery({
    queryKey: [...usersKeys.all, actAsTenantId],
    queryFn: () => fetchAssignableUsers(actAsTenantId),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};
