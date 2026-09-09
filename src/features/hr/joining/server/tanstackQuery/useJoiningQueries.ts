// HR Joining TanStack Query Hooks
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppSelector } from '@/store/hook';
import { selectOrgViewMode } from '@/store/slice/userAccountData';
import {
  fetchJoinings,
  type InitiateJoiningPayload,
  initiateJoining,
  type UpdateJoiningPayload,
  updateJoining,
} from '../api/joiningApi';

export const useJoinings = () => {
  const orgViewMode = useAppSelector(selectOrgViewMode);
  return useQuery({
    queryKey: ['hr', 'joining', orgViewMode],
    queryFn: fetchJoinings,
    staleTime: 2 * 60 * 1000,
    gcTime: 4 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useInitiateJoining = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      payload,
      actAsTenantId,
    }: {
      payload: InitiateJoiningPayload;
      actAsTenantId?: string;
    }) => initiateJoining(payload, actAsTenantId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr', 'joining'] });
      qc.invalidateQueries({ queryKey: ['hr', 'candidates'] });
    },
  });
};

export const useUpdateJoining = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
      actAsTenantId,
    }: {
      id: number;
      data: UpdateJoiningPayload;
      actAsTenantId?: string;
    }) => updateJoining(id, data, actAsTenantId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr', 'joining'] });
    },
  });
};
