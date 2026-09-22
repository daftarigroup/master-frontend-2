// Asset Management API — talks to the real master-backend Asset module
// (src/modules/asset). The backend maps its normalized DB schema back to this
// exact Asset shape, so call sites (the tanstack query hooks) don't need to change.
import { api } from '@/lib/axios';
import type { Asset } from '../../types/types';

export const getAssets = async (params?: {
  firmId?: string;
  search?: string;
  status?: string;
  department?: string;
}): Promise<Asset[]> => {
  const res = await api.get('/assets', { params });
  return res.data.data;
};

export const getAsset = async (id: string | number): Promise<Asset | null> => {
  try {
    const res = await api.get(`/assets/${id}`);
    return res.data.data;
  } catch (err: any) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
};

export const createAsset = async (
  data: Partial<Asset> & Pick<Asset, 'productName'>
): Promise<Asset> => {
  const res = await api.post('/assets', data);
  return res.data.data;
};

export const updateAsset = async (id: string | number, data: Partial<Asset>): Promise<Asset | undefined> => {
  const res = await api.patch(`/assets/${id}`, data);
  return res.data.data;
};

export const deleteAsset = async (id: string | number): Promise<void> => {
  await api.delete(`/assets/${id}`);
};
