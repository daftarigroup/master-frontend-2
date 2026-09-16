import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ConnectAccountDto, SyncAccountDto } from '../../types/types';
import {
  connectSocialAccount,
  disconnectSocialAccount,
  fetchSocialAccounts,
  reconnectSocialAccount,
  syncSocialAccount,
} from '../api/socialSiteApi';

const KEY = ['hr', 'social', 'accounts'] as const;

export const useSocialAccounts = () =>
  useQuery({
    queryKey: KEY,
    queryFn: fetchSocialAccounts,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

export const useConnectAccount = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ConnectAccountDto) => connectSocialAccount(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useDisconnectAccount = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => disconnectSocialAccount(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useReconnectAccount = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => reconnectSocialAccount(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};

export const useSyncAccount = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: SyncAccountDto }) => syncSocialAccount(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
};
