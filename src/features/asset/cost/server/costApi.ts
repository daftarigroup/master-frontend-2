import { api } from '@/lib/axios';
import type { CreateEntryBody, CreateRateBody, FleetCosts, LogKind, LogRows, MachineCost, TrendPoint, WbsActivity } from '../types';

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;
const clean = (p: object) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== '' && v !== undefined && v !== null));

export interface FleetCostQuery {
  firmId?: string;
  month?: string;
  ownership?: string;
  category?: string;
  siteId?: string;
  sort?: string;
  dir?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export const costApi = {
  machine: (id: string, p: { month?: string; category?: string; wbsId?: string }) => api.get(`/fleet/costs/machines/${id}`, { params: clean(p) }).then((r) => unwrap<MachineCost>(r)),
  trend: (id: string, p: { month?: string; months?: number }) => api.get(`/fleet/costs/machines/${id}/trend`, { params: clean(p) }).then((r) => unwrap<TrendPoint[]>(r)),
  logs: <K extends LogKind>(id: string, kind: K, p: { month?: string; limit?: number; offset?: number }) =>
    api.get(`/fleet/costs/machines/${id}/logs/${kind}`, { params: clean(p) }).then((r) => unwrap<LogRows[K]>(r)),
  fleet: (p: FleetCostQuery) => api.get('/fleet/costs/fleet', { params: clean(p) }).then((r) => unwrap<FleetCosts>(r)),
  report: async (p: { scope: 'machine' | 'fleet'; machineId?: string; month: string; format: 'xlsx' | 'csv' }) => {
    const res = await api.get('/fleet/costs/report', { params: clean(p), responseType: 'blob' });
    const cd = String(res.headers['content-disposition'] ?? '');
    const name = /filename="?([^";]+)"?/.exec(cd)?.[1] ?? `cost-${p.month}.${p.format}`;
    return { blob: res.data as Blob, name };
  },

  createRate: (machineId: string, body: CreateRateBody) => api.post(`/fleet/machines/${machineId}/rates`, body).then((r) => unwrap<{ id: string }>(r)),
  endRate: (machineId: string, rateId: string, endDate: string) => api.post(`/fleet/machines/${machineId}/rates/${rateId}/end`, { endDate }).then((r) => unwrap<{ id: string }>(r)),
  createEntry: (body: CreateEntryBody) => api.post('/fleet/cost-entries', body).then((r) => unwrap<{ id: string }>(r)),
  voidEntry: (id: string, reason: string) => api.post(`/fleet/cost-entries/${id}/void`, { reason }).then((r) => unwrap<{ id: string }>(r)),

  wbs: (p: { firmId?: string | null; includeClosed?: boolean }) => api.get('/fleet/wbs', { params: clean(p) }).then((r) => unwrap<WbsActivity[]>(r)),
  createWbs: (body: { firmId: string | number; code: string; name: string; parentId?: string | null; siteLocationId?: string | number | null }) =>
    api.post('/fleet/wbs', body).then((r) => unwrap<WbsActivity>(r)),
};
