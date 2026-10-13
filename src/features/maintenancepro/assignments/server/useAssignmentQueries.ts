import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { filterByFirmAccess } from '@/lib/firmAccess';
import type { AssignmentQuery, DispatchBody, FirmOption, ReceiveBody, ReleaseBody } from '../types';
import { assignmentsApi } from './assignmentsApi';

export const useAssignments = (p: AssignmentQuery) =>
  useQuery({ queryKey: ['fleet', 'assignments', 'list', p], queryFn: () => assignmentsApi.list(p), placeholderData: keepPreviousData, staleTime: 20_000 });

/** Every machine (for the "Assign machine" picker opened from the page header). */
export const useMachineOptions = (enabled: boolean, firmId?: string) =>
  useQuery({ queryKey: ['fleet', 'assignments', 'machines', firmId], queryFn: () => assignmentsApi.list({ firmId, limit: 500 }), enabled, staleTime: 60_000 });

export const useOperatorRows = () => useQuery({ queryKey: ['fleet', 'assignments', 'operators'], queryFn: assignmentsApi.operators, staleTime: 20_000 });

export const useAvailability = (days: number, firmId?: string) =>
  useQuery({ queryKey: ['fleet', 'assignments', 'availability', days, firmId], queryFn: () => assignmentsApi.availability(days, firmId), staleTime: 60_000 });

export const useOpenTransfers = (firmId?: string) => useQuery({ queryKey: ['fleet', 'transfers', 'open', firmId], queryFn: () => assignmentsApi.transfers(firmId), staleTime: 20_000 });

/** The same firm list (and cache entry) the company picker uses, limited to the firms this user may access. */
export const useFirmOptions = () => {
  const { user } = useAuth();
  const q = useQuery({ queryKey: ['maintenance', 'firms', 'list'], queryFn: assignmentsApi.firms, staleTime: 5 * 60_000 });
  const firms = useMemo(() => filterByFirmAccess<FirmOption>(q.data ?? [], user?.firm_access), [q.data, user?.firm_access]);
  return { ...q, firms };
};

/** Any change here moves the tiles, the lists, the timeline, the transfer queue and the Equipment Master status. */
function useRefresh() {
  const qc = useQueryClient();
  return () => Promise.all(['assignments', 'equipment', 'transfers', 'availability'].map((k) => qc.invalidateQueries({ queryKey: ['fleet', k] })));
}

export const useAssignMachine = () => {
  const onSuccess = useRefresh();
  return useMutation({ mutationFn: assignmentsApi.assign, onSuccess });
};
export const useReleaseAssignment = () => {
  const onSuccess = useRefresh();
  return useMutation({ mutationFn: (v: { id: string } & ReleaseBody) => assignmentsApi.release(v.id, { reason: v.reason, returnedToVendor: v.returnedToVendor }), onSuccess });
};
export const useAssignOperator = () => {
  const onSuccess = useRefresh();
  return useMutation({ mutationFn: assignmentsApi.assignOperator, onSuccess });
};
export const useEndOperator = () => {
  const onSuccess = useRefresh();
  return useMutation({ mutationFn: assignmentsApi.endOperator, onSuccess });
};
export const useRequestTransfer = () => {
  const onSuccess = useRefresh();
  return useMutation({ mutationFn: assignmentsApi.requestTransfer, onSuccess });
};
export const useApproveTransfer = () => {
  const onSuccess = useRefresh();
  return useMutation({ mutationFn: assignmentsApi.approve, onSuccess });
};
export const useDispatchTransfer = () => {
  const onSuccess = useRefresh();
  return useMutation({ mutationFn: (v: { id: string; body: DispatchBody }) => assignmentsApi.dispatch(v.id, v.body), onSuccess });
};
export const useReceiveTransfer = () => {
  const onSuccess = useRefresh();
  return useMutation({ mutationFn: (v: { id: string; body: ReceiveBody }) => assignmentsApi.receive(v.id, v.body), onSuccess });
};
export const useCancelTransfer = () => {
  const onSuccess = useRefresh();
  return useMutation({ mutationFn: (v: { id: string; reason: string }) => assignmentsApi.cancel(v.id, v.reason), onSuccess });
};
