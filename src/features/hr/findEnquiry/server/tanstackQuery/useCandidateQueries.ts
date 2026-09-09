import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppSelector } from '@/store/hook';
import { selectOrgViewMode } from '@/store/slice/userAccountData';
import {
  type DocVerificationPayload,
  deleteCandidate,
  fetchCandidateById,
  fetchCandidateHistory,
  type InitializeJoiningPayload,
  initializeJoining,
  logCandidateCall,
  markCandidateJoined,
  type SaveFollowUpPayload,
  type SubmitCandidatePayload,
  saveFollowUp,
  submitCandidate,
  updateCandidate,
  verifyDocuments,
} from '../api/candidateApi';

export const useCandidateHistory = () => {
  const orgViewMode = useAppSelector(selectOrgViewMode);
  return useQuery({
    queryKey: ['hr', 'candidates', orgViewMode],
    queryFn: fetchCandidateHistory,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useCandidateById = (id: string | number) => {
  return useQuery({
    queryKey: ['hr', 'candidates', id],
    queryFn: () => fetchCandidateById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useSubmitCandidate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      data,
      files,
    }: {
      data: SubmitCandidatePayload;
      files?: { photo?: File; resume?: File };
    }) => submitCandidate(data, files),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'candidates'] });
    },
  });
};

export const useUpdateCandidate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
      files,
      actAsTenantId,
    }: {
      id: string | number;
      data: Partial<SubmitCandidatePayload>;
      files?: { photo?: File; resume?: File };
      actAsTenantId?: string;
    }) => updateCandidate(id, data, files, actAsTenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'candidates'] });
    },
  });
};

export const useDeleteCandidate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, actAsTenantId }: { id: string | number; actAsTenantId?: string }) =>
      deleteCandidate(id, actAsTenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'candidates'] });
    },
  });
};

export const useLogCandidateCall = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
      actAsTenantId,
    }: {
      id: string | number;
      payload: { status: string; notes?: string };
      actAsTenantId?: string;
    }) => logCandidateCall(id, payload, actAsTenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'candidates'] });
    },
  });
};

export const useInitializeJoining = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
      actAsTenantId,
    }: {
      id: string | number;
      payload: InitializeJoiningPayload;
      actAsTenantId?: string;
    }) => initializeJoining(id, payload, actAsTenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'candidates'] });
    },
  });
};

export const useMarkJoined = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      joiningDate,
      actAsTenantId,
    }: {
      id: string | number;
      joiningDate?: string;
      actAsTenantId?: string;
    }) => markCandidateJoined(id, joiningDate, actAsTenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'candidates'] });
    },
  });
};

export const useSaveFollowUp = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
      actAsTenantId,
    }: {
      id: string | number;
      payload: SaveFollowUpPayload;
      actAsTenantId?: string;
    }) => saveFollowUp(id, payload, actAsTenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'candidates'] });
    },
  });
};

export const useVerifyDocuments = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
      actAsTenantId,
    }: {
      id: string | number;
      payload: DocVerificationPayload;
      actAsTenantId?: string;
    }) => verifyDocuments(id, payload, actAsTenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'candidates'] });
    },
  });
};
