import { useAuth } from '@/context/AuthContext';
import { selectUser } from './slice/userAccountData';
import { Role } from '@/types/permissions';

/**
 * useAppSelector adapter that bridges Redux selector calls to AuthContext or fallback state
 */
export const useAppSelector = <T>(selector: (state: any) => T): T => {
  const auth = useAuth() as any;
  const user = auth?.user;

  const mockState = {
    user: user
      ? {
          id: user.id || 'usr-1',
          name: user.name || user.username || 'Admin User',
          email: user.email || 'admin@master.com',
          role: user.role === 'SUPER_ADMIN' ? 'SUPERADMIN' : user.role || (user.administrate ? Role.ADMIN : Role.USER),
          administrate: !!user.administrate,
          tenantId: user.firm_id?.toString() || 'tenant-1',
          tenant: { id: user.firm_id?.toString() || 'tenant-1', name: user.firmNameMatch || 'Master Org' },
          company: { id: user.firm_id?.toString() || '1', name: user.firmNameMatch || 'Master' },
        }
      : selectUser({}),
    role: user?.role === 'SUPER_ADMIN' ? 'SUPERADMIN' : user?.role || (user?.administrate ? Role.ADMIN : Role.USER),
    orgViewMode: 'all',
  };

  return selector(mockState);
};

export const useAppDispatch = () => {
  return (action: any) => action;
};
