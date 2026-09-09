import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppSelector } from '@/store/hook';
import { selectOrgViewMode } from '@/store/slice/userAccountData';
import {
  type CreateIndentPayload,
  createIndent,
  deleteIndent,
  fetchIndentById,
  fetchIndents,
  fetchPendingIndents,
  updateIndent,
} from '../api/indentApi';

export const useIndents = () => {
  const orgViewMode = useAppSelector(selectOrgViewMode);
  return useQuery({
    queryKey: ['hr', 'indents', orgViewMode],
    queryFn: fetchIndents,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const usePendingIndents = () => {
  const orgViewMode = useAppSelector(selectOrgViewMode);
  return useQuery({
    queryKey: ['hr', 'indents', 'pending', orgViewMode],
    queryFn: fetchPendingIndents,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useIndentById = (id: string) => {
  return useQuery({
    queryKey: ['hr', 'indents', id],
    queryFn: () => fetchIndentById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useCreateIndent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createIndent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'indents'] });
    },
  });
};

export const useUpdateIndent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
      actAsTenantId,
    }: {
      id: string;
      data: Partial<CreateIndentPayload>;
      actAsTenantId?: string;
    }) => updateIndent(id, data, actAsTenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'indents'] });
    },
  });
};

export const useDeleteIndent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteIndent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'indents'] });
    },
  });
};
