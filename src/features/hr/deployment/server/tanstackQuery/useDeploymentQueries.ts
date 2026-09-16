import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppSelector } from '@/store/hook';
import { selectOrgViewMode } from '@/store/slice/userAccountData';
import {
  assignToProject,
  fetchAssignmentEvents,
  fetchEmployeeActiveAssignment,
  fetchProjectAssignments,
  putOnProjectLeave,
  removeFromProject,
  resumeProjectAssignment,
  shiftProjectAssignment,
} from '../api/deploymentApi';
import type {
  AssignToProjectPayload,
  ProjectAssignmentFilters,
  ProjectLeavePayload,
  RemoveFromProjectPayload,
  ResumeProjectPayload,
  ShiftProjectPayload,
} from '../../types/types';

export const useProjectAssignments = (filters?: ProjectAssignmentFilters) => {
  const orgViewMode = useAppSelector(selectOrgViewMode);
  return useQuery({
    queryKey: ['hr', 'project-assignments', filters, orgViewMode],
    queryFn: () => fetchProjectAssignments(filters),
    staleTime: 3 * 60 * 1000,
    gcTime: 6 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useEmployeeActiveAssignment = (employeeId?: string) => {
  const orgViewMode = useAppSelector(selectOrgViewMode);
  return useQuery({
    queryKey: ['hr', 'project-assignments', 'active', employeeId, orgViewMode],
    queryFn: () => fetchEmployeeActiveAssignment(employeeId || ''),
    enabled: !!employeeId,
    staleTime: 3 * 60 * 1000,
    gcTime: 6 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useAssignmentEvents = (filters?: { employeeId?: string; assignmentId?: string }) => {
  const orgViewMode = useAppSelector(selectOrgViewMode);
  return useQuery({
    queryKey: ['hr', 'project-assignments', 'events', filters, orgViewMode],
    queryFn: () => fetchAssignmentEvents(filters),
    staleTime: 3 * 60 * 1000,
    gcTime: 6 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useAssignToProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      payload,
      actAsTenantId,
    }: {
      payload: AssignToProjectPayload;
      actAsTenantId?: string;
    }) => assignToProject(payload, actAsTenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'project-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'employees'] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'dashboard'] });
    },
  });
};

export const useShiftProjectAssignment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      assignmentId,
      payload,
      actAsTenantId,
    }: {
      assignmentId: string;
      payload: ShiftProjectPayload;
      actAsTenantId?: string;
    }) => shiftProjectAssignment(assignmentId, payload, actAsTenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'project-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'employees'] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'dashboard'] });
    },
  });
};

export const useRemoveFromProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      assignmentId,
      payload,
      actAsTenantId,
    }: {
      assignmentId: string;
      payload: RemoveFromProjectPayload;
      actAsTenantId?: string;
    }) => removeFromProject(assignmentId, payload, actAsTenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'project-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'employees'] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'dashboard'] });
    },
  });
};

export const usePutOnProjectLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      assignmentId,
      payload,
      actAsTenantId,
    }: {
      assignmentId: string;
      payload: ProjectLeavePayload;
      actAsTenantId?: string;
    }) => putOnProjectLeave(assignmentId, payload, actAsTenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'project-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'employees'] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'dashboard'] });
    },
  });
};

export const useResumeProjectAssignment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      assignmentId,
      payload,
      actAsTenantId,
    }: {
      assignmentId: string;
      payload: ResumeProjectPayload;
      actAsTenantId?: string;
    }) => resumeProjectAssignment(assignmentId, payload, actAsTenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'project-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'employees'] });
      queryClient.invalidateQueries({ queryKey: ['hr', 'dashboard'] });
    },
  });
};
