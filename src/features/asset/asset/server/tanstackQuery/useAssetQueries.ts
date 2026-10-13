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

export interface DepartmentOption {
  id: string;
  name: string;
}

export const useDepartmentsList = () => {
  return useQuery({
    queryKey: ['departments', 'list'],
    queryFn: async (): Promise<DepartmentOption[]> => {
      const res = await api.get('/maintenance/departments', { params: { limit: 200 } });
      const items = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
          ? res.data
          : [];
      return items
        .filter((d: any) => d && (d.name || d.department))
        .map((d: any) => ({
          id: String(d.id),
          name: String(d.name || d.department || '').trim(),
        }))
        .filter((d: DepartmentOption) => Boolean(d.name));
    },
    staleTime: 5 * 60 * 1000,
  });
};

export interface SiteLocationOption {
  id: string;
  location: string;
  firmId?: string | null;
  firmName?: string | null;
}

export const useSiteLocationsList = () => {
  return useQuery({
    queryKey: ['site_locations', 'list'],
    queryFn: async (): Promise<SiteLocationOption[]> => {
      const res = await api.get('/store/entity/site_location_details', {
        params: { limit: 'all', order: 'location.asc' },
      });
      const items = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
          ? res.data
          : [];
      return items
        .filter((l: any) => l && l.location)
        .map((l: any) => ({
          id: String(l.id),
          location: String(l.location).trim(),
          firmId: l.firm_id ? String(l.firm_id) : (l.firm?.id ? String(l.firm.id) : null),
          firmName: l.firm?.firm_name || l.firm_name || null,
        }))
        .filter((l: SiteLocationOption) => Boolean(l.location));
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useAssets = (params?: {
  firmId?: string;
  search?: string;
  status?: string;
  department?: string;
  ownership?: 'OWNED' | 'RENTED';
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
