import { api } from '@/lib/axios';
import type { ConnectAccountDto, SocialAccount, SyncAccountDto } from '../../types/types';

export const fetchSocialAccounts = async (): Promise<SocialAccount[]> => {
  const res = await api.get('/hrfms/social/accounts');
  return res.data.data;
};

export const connectSocialAccount = async (data: ConnectAccountDto): Promise<SocialAccount> => {
  const res = await api.post('/hrfms/social/accounts/connect', data);
  return res.data.data;
};

export const disconnectSocialAccount = async (id: number): Promise<SocialAccount> => {
  const res = await api.patch(`/hrfms/social/accounts/${id}/disconnect`);
  return res.data.data;
};

export const reconnectSocialAccount = async (id: number): Promise<SocialAccount> => {
  const res = await api.patch(`/hrfms/social/accounts/${id}/reconnect`);
  return res.data.data;
};

export const syncSocialAccount = async (id: number, data: SyncAccountDto): Promise<SocialAccount> => {
  const res = await api.post(`/hrfms/social/accounts/${id}/sync`, data);
  return res.data.data;
};
