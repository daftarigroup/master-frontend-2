// Asset Management TanStack Query Hooks
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { createAsset, deleteAsset, getAsset, getAssets, updateAsset } from '../api/assetApi';
import type { Asset } from '../../types/types';

export interface UserOption {
  id: string;
  name: string;
  email?: string;
  role?: string;
  employeeId?: string | null;
}

export const useUsersList = () => {
  return useQuery({
    queryKey: ['users', 'list'],
    queryFn: async (): Promise<UserOption[]> => {
      const res = await api.get('/user/list');
      const items = Array.isArray(res.data?.data) ? res.data.data : [];
      return items.map((u: any) => ({
        id: String(u.id),
        name: u.name || u.user_name || 'User',
        email: u.email || '',
        role: u.role || '',
        employeeId: u.employeeId ?? null,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useAssets = (params?: {
  firmId?: string;
  search?: string;
  status?: string;
  department?: string;
}) => {
  return useQuery({
    queryKey: ['asset', 'assets', params],
    queryFn: () => getAssets(params),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useAsset = (id: string | number) => {
  return useQuery({
    queryKey: ['asset', 'assets', id],
    queryFn: () => getAsset(id),
    enabled: id !== undefined && id !== null && id !== '',
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useCreateAsset = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Asset> & Pick<Asset, 'productName'>) => createAsset(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset', 'assets'] });
    },
  });
};

export const useUpdateAsset = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: Partial<Asset> }) =>
      updateAsset(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['asset', 'assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset', 'assets', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['asset', 'assets', String(variables.id)] });
      queryClient.invalidateQueries({ queryKey: ['asset', 'assets', Number(variables.id)] });
    },
  });
};

export const useDeleteAsset = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => deleteAsset(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset', 'assets'] });
    },
  });
};
