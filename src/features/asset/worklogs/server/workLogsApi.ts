import { api } from '@/lib/axios';
import { equipmentApi } from '@/features/asset/equipment/server/equipmentApi';
import type { BulkApproveResult, CreateWorkLogBody, WorkLogDetail, WorkLog, WorkLogFields, WorkLogList, WorkLogPrefill, WorkLogQuery, WorkLogSaveResult, WorkType } from '../types';

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;
const clean = (p: object) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== '' && v !== undefined && v !== null));

export const workLogsApi = {
  list: (p: WorkLogQuery) => api.get('/fleet/work-logs', { params: clean(p) }).then((r) => unwrap<WorkLogList>(r)),
  get: (id: string) => api.get(`/fleet/work-logs/${id}`).then((r) => unwrap<WorkLogDetail>(r)),
  prefill: (machineId: string) => api.get(`/fleet/work-logs/prefill/${machineId}`).then((r) => unwrap<WorkLogPrefill>(r)),
  workTypes: (firmId?: string) => api.get('/fleet/work-types', { params: clean({ firmId }) }).then((r) => unwrap<WorkType[]>(r)),
  /** The machine picker reuses the equipment list: it carries the photo, category and status the machine card shows. */
  machines: (firmId?: string) => equipmentApi.list({ firmId, limit: 1000 }).then((r) => r.items),

  create: (body: CreateWorkLogBody) => api.post('/fleet/work-logs', body).then((r) => unwrap<WorkLogSaveResult>(r)),
  update: (id: string, body: WorkLogFields) => api.patch(`/fleet/work-logs/${id}`, body).then((r) => unwrap<WorkLogSaveResult>(r)),
  approve: (id: string) => api.post(`/fleet/work-logs/${id}/approve`).then((r) => unwrap<{ log: WorkLog }>(r)),
  reject: (id: string, reason: string) => api.post(`/fleet/work-logs/${id}/reject`, { reason }).then((r) => unwrap<{ log: WorkLog }>(r)),
  reopen: (id: string, note: string) => api.post(`/fleet/work-logs/${id}/reopen`, { note }).then((r) => unwrap<{ log: WorkLog }>(r)),
  bulkApprove: (ids: string[]) => api.post('/fleet/work-logs/bulk-approve', { ids }).then((r) => unwrap<BulkApproveResult>(r)),

};
