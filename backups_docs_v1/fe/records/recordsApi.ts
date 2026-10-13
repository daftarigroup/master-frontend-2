import { api } from '@/lib/axios';
import type {
  AddDocumentBody, AddPartBody, ChecklistState, ChecklistTemplate, DocRow, HistoryPage, PartRow, RecordList, RecordListQuery,
  RecordSummary, ScheduleBody, ScheduledWorkOrder, ScheduleRow, ScheduleServiceBody,
} from '../types';

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;
/** Empty filter values are left out so the server sees only what the user chose. */
const clean = (p: object) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== '' && v !== undefined && v !== null));

export const recordsApi = {
  list: (p: RecordListQuery) => api.get('/maintenance/records', { params: clean(p) }).then((r) => unwrap<RecordList>(r)),
  summary: (id: string) => api.get(`/maintenance/records/${id}`).then((r) => unwrap<RecordSummary>(r)),
  history: (id: string, p: { limit?: number; offset?: number }) => api.get(`/maintenance/records/${id}/history`, { params: clean(p) }).then((r) => unwrap<HistoryPage>(r)),
  parts: (id: string, p: { limit?: number; offset?: number }) => api.get(`/maintenance/records/${id}/parts`, { params: clean(p) }).then((r) => unwrap<PartRow[]>(r)),
  documents: (id: string) => api.get(`/maintenance/records/${id}/documents`).then((r) => unwrap<DocRow[]>(r)),

  schedules: (machineId: string) => api.get('/maintenance/schedules', { params: { machineId } }).then((r) => unwrap<ScheduleRow[]>(r)),
  createSchedule: (machineId: string, body: ScheduleBody) => api.post('/maintenance/schedules', { machineId, ...body }).then((r) => unwrap<ScheduleRow>(r)),
  updateSchedule: (id: string, body: ScheduleBody) => api.patch(`/maintenance/schedules/${id}`, body).then((r) => unwrap<ScheduleRow>(r)),
  scheduleService: (id: string, body: ScheduleServiceBody) =>
    api.post(`/maintenance/schedules/${id}/schedule-service`, body).then((r) => unwrap<{ workOrder: ScheduledWorkOrder; created: boolean }>(r)),

  templates: (firmId: string) => api.get('/maintenance/checklist-templates', { params: { firmId } }).then((r) => unwrap<ChecklistTemplate[]>(r)),
  saveTemplate: (body: { id?: string; firmId: string; name: string; items: string[]; isActive?: boolean }) =>
    api.put('/maintenance/checklist-templates', body).then((r) => unwrap<ChecklistTemplate>(r)),

  setChecklistItem: (workOrderId: string, itemId: string, body: { state: ChecklistState; note?: string }) =>
    api.patch(`/maintenance/work-orders/${workOrderId}/checklist/${itemId}`, body).then((r) => unwrap<unknown>(r)),
  addPart: (workOrderId: string, body: AddPartBody) => api.post(`/maintenance/work-orders/${workOrderId}/parts`, body).then((r) => unwrap<unknown>(r)),

  addDocument: (body: AddDocumentBody) => api.post('/maintenance/documents', body).then((r) => unwrap<{ id: string }>(r)),
  voidDocument: (id: string, reason: string) => api.post(`/maintenance/documents/${id}/void`, { reason }).then((r) => unwrap<{ id: string }>(r)),
};
