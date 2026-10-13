import { useAuth } from '@/context/AuthContext';
import { hasPageAccess } from '@/lib/permissions';

/**
 * Whether to OFFER cost screens (spend tiles, the Cost Tracking link). This is a convenience only: the server decides what
 * data a user may receive, and omits cost fields for everyone else.
 */
export function useCostAccess(): boolean {
  const { user } = useAuth();
  return hasPageAccess(user, 'asset_cost', 'VIEW', 'assetCost');
}

/** Whether to OFFER rate and cost-entry editing. The server (ADMIN / SUPER_ADMIN only) is the real check. */
export function useCostEdit(): boolean {
  const { user } = useAuth();
  return user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
}
