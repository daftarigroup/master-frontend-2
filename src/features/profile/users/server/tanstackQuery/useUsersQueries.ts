import { useQuery } from '@tanstack/react-query';

export interface ManagerRecord {
  id: string;
  name: string;
  email: string;
  department?: string;
}

export function useUsersQuery(_params?: any) {
  return useQuery({
    queryKey: ['users', _params],
    queryFn: async (): Promise<ManagerRecord[]> => [
      { id: 'usr-1', name: 'Rajesh Kumar', email: 'rajesh@master.com', department: 'Engineering' },
      { id: 'usr-2', name: 'Priya Sharma', email: 'priya@master.com', department: 'HR' },
      { id: 'usr-3', name: 'Anil Verma', email: 'anil@master.com', department: 'Finance' },
      { id: 'usr-4', name: 'Sunil Patel', email: 'sunil@master.com', department: 'Operations' },
    ],
  });
}

export function useManagers(_tenantId?: string | null) {
  return useQuery({
    queryKey: ['managers', _tenantId],
    queryFn: async (): Promise<ManagerRecord[]> => [
      { id: 'usr-1', name: 'Rajesh Kumar', email: 'rajesh@master.com', department: 'Engineering' },
      { id: 'usr-2', name: 'Priya Sharma', email: 'priya@master.com', department: 'HR' },
      { id: 'usr-3', name: 'Anil Verma', email: 'anil@master.com', department: 'Finance' },
      { id: 'usr-4', name: 'Sunil Patel', email: 'sunil@master.com', department: 'Operations' },
    ],
  });
}
