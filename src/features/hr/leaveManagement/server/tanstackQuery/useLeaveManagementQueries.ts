// HR Leave Management TanStack Query Hooks
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppSelector } from '@/store/hook';
import { selectOrgViewMode, selectUser } from '@/store/slice/userAccountData';
import type { LeaveRequest } from '../../types/types';
import {
  deleteLeave,
  fetchAvailableTransferUsers,
  fetchLeaveById,
  fetchLeaveRequests,
  fetchLeavesByEmployee,
  fetchPendingLeaves,
  fetchTaskImpact,
  type SubmitLeavePayload,
  submitLeave,
  updateLeaveStatus,
} from '../api/leaveManagementApi';

export const useLeaveRequests = (enabled = true) => {
  const orgViewMode = useAppSelector(selectOrgViewMode);
  return useQuery({
    queryKey: ['hr', 'leaveManagement', 'requests', orgViewMode],
    queryFn: fetchLeaveRequests,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled,
  });
};

export const useLeaveById = (id: string | number) => {
  return useQuery({
    queryKey: ['hr', 'leaveManagement', 'request', id],
    queryFn: () => fetchLeaveById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useLeavesByEmployee = (employeeId: string) => {
  return useQuery({
    queryKey: ['hr', 'leaveManagement', 'byEmployee', employeeId],
    queryFn: () => fetchLeavesByEmployee(employeeId),
    enabled: !!employeeId,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const usePendingLeaves = () => {
  return useQuery({
    queryKey: ['hr', 'leaveManagement', 'pending'],
    queryFn: fetchPendingLeaves,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useSubmitLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SubmitLeavePayload) => submitLeave(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'leaveManagement'] });
    },
  });
};

export const useUpdateLeaveStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      remarks,
      leaveDays,
      taskDecisions,
      actAsTenantId,
    }: {
      id: string | number;
      status: LeaveRequest['status'];
      remarks?: string;
      leaveDays?: import('../api/leaveManagementApi').LeaveDayEntry[];
      taskDecisions?: import('../../types/types').TaskTransferDecision[];
      /** Set only when this leave belongs to a company other than the
       * caller's active tenant — see resolveActAsTenant. */
      actAsTenantId?: string;
    }) => updateLeaveStatus(id, status, remarks, leaveDays, taskDecisions, actAsTenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'leaveManagement'] });
    },
  });
};

export const useTaskImpact = () => {
  return useMutation({
    mutationFn: ({ id, actAsTenantId }: { id: string | number; actAsTenantId?: string }) =>
      fetchTaskImpact(id, actAsTenantId),
  });
};

export const useAvailableTransferUsers = (actAsTenantId?: string, enabled = true) => {
  const tenantId = useAppSelector(selectUser)?.tenantId;
  return useQuery({
    // Keyed on whichever company this list is actually being requested for
    // (actAsTenantId when acting cross-company, else the caller's own
    // tenantId) — never served stale across a switch between them.
    queryKey: ['hr', 'leaveManagement', 'availableTransferUsers', actAsTenantId ?? tenantId],
    queryFn: () => fetchAvailableTransferUsers(actAsTenantId),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled,
  });
};

export const useDeleteLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => deleteLeave(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'leaveManagement'] });
    },
  });
};
