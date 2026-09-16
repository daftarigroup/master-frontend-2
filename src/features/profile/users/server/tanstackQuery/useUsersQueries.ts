import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export interface ManagerRecord {
  id: string;
  name: string;
  email: string;
  department?: string;
  employeeId?: string | null;
  empCode?: string | null;
}

export function useUsersQuery(_params?: any) {
  return useQuery({
    queryKey: ['users', _params],
    queryFn: async (): Promise<ManagerRecord[]> => {
      const res = await api.get('/hrfms/managers');
      const items = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
      return items.map((u: any) => ({
        id: String(u.id),
        name: u.name || u.userName || u.user_name || 'User',
        email: u.email || '',
        department: u.department || '',
        employeeId: u.employeeId || null,
        empCode: u.empCode || null,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useManagers(_tenantId?: string | null) {
  return useQuery({
    queryKey: ['managers', _tenantId],
    queryFn: async (): Promise<ManagerRecord[]> => {
      const res = await api.get('/hrfms/managers');
      const items = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
      return items.map((u: any) => ({
        id: String(u.id),
        name: u.name || u.userName || u.user_name || 'User',
        email: u.email || '',
        department: u.department || '',
        employeeId: u.employeeId || null,
        empCode: u.empCode || null,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}
