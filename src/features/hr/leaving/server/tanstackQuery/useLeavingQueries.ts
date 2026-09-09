// HR Leaving TanStack Query Hooks
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchLeavingEmployees,
  fetchMyOffboardingStatus,
  type SubmitResignationPayload,
  submitResignation,
  type UpdateSeparationStatusPayload,
  updateSeparationStatus,
} from '../api/leavingApi';

export const useLeavingEmployees = () =>
  useQuery({
    queryKey: ['hr', 'leaving'],
    queryFn: fetchLeavingEmployees,
    staleTime: 2 * 60 * 1000,
    gcTime: 4 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

export const useMyOffboardingStatus = () =>
  useQuery({
    queryKey: ['hr', 'leaving', 'my-status'],
    queryFn: fetchMyOffboardingStatus,
    staleTime: 2 * 60 * 1000,
    gcTime: 4 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

export const useSubmitResignation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SubmitResignationPayload) => submitResignation(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr', 'leaving'] });
    },
  });
};

export const useUpdateSeparationStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateSeparationStatus(id, { status } satisfies UpdateSeparationStatusPayload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr', 'leaving'] });
    },
  });
};
