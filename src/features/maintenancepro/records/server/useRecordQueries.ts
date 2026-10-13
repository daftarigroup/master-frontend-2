import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AddPartBody, ChecklistState, RecordListQuery, ScheduleBody, ScheduleServiceBody } from '../types';
import { recordsApi } from './recordsApi';

const RECORDS = ['maintenance', 'records'] as const;
const WORK_ORDERS = ['maintenance', 'work-orders'] as const;

export const useRecordList = (p: RecordListQuery) =>
  useQuery({ queryKey: [...RECORDS, 'list', p], queryFn: () => recordsApi.list(p), placeholderData: keepPreviousData, staleTime: 20_000 });

export const useRecordSummary = (id: string | undefined) =>
  useQuery({ queryKey: [...RECORDS, 'summary', id], queryFn: () => recordsApi.summary(id!), enabled: !!id, staleTime: 20_000 });

export const useRecordHistory = (id: string | undefined, p: { limit: number; offset: number }, enabled = true) =>
  useQuery({ queryKey: [...RECORDS, 'history', id, p], queryFn: () => recordsApi.history(id!, p), enabled: !!id && enabled, placeholderData: keepPreviousData, staleTime: 20_000 });

export const useRecordParts = (id: string | undefined, enabled = true) =>
  useQuery({ queryKey: [...RECORDS, 'parts', id], queryFn: () => recordsApi.parts(id!, { limit: 200 }), enabled: !!id && enabled, staleTime: 20_000 });

export const useSchedules = (machineId: string | undefined, enabled: boolean) =>
  useQuery({ queryKey: [...RECORDS, 'schedules', machineId], queryFn: () => recordsApi.schedules(machineId!), enabled: !!machineId && enabled, staleTime: 10_000 });

export const useChecklistTemplates = (firmId: string | null | undefined, enabled: boolean) =>
  useQuery({ queryKey: [...RECORDS, 'templates', firmId], queryFn: () => recordsApi.templates(firmId!), enabled: !!firmId && enabled, staleTime: 30_000 });

/** Every records number depends on work orders, schedules and documents, so any successful change refreshes all of them. */
function useRefresh() {
  const qc = useQueryClient();
  return () => Promise.all([qc.invalidateQueries({ queryKey: RECORDS }), qc.invalidateQueries({ queryKey: WORK_ORDERS })]);
}

export const useScheduleService = () => {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (v: { scheduleId: string; body: ScheduleServiceBody }) => recordsApi.scheduleService(v.scheduleId, v.body), onSuccess: refresh });
};
export const useSaveSchedule = (machineId: string) => {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (v: { id?: string; body: ScheduleBody }) => (v.id ? recordsApi.updateSchedule(v.id, v.body) : recordsApi.createSchedule(machineId, v.body)),
    onSuccess: refresh,
  });
};
export const useSaveTemplate = () => {
  const refresh = useRefresh();
  return useMutation({ mutationFn: recordsApi.saveTemplate, onSuccess: refresh });
};
export const useSetChecklistItem = () => {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (v: { workOrderId: string; itemId: string; state: ChecklistState; note?: string }) => recordsApi.setChecklistItem(v.workOrderId, v.itemId, { state: v.state, note: v.note }), onSuccess: refresh });
};
export const useAddPart = () => {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (v: { workOrderId: string; body: AddPartBody }) => recordsApi.addPart(v.workOrderId, v.body), onSuccess: refresh });
};
