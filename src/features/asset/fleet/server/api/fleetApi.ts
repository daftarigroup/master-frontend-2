// Client for master-backend /api/fleet. Every read is firm-scoped on the server; `firmId` here is a filter,
// never a permission. Never send 'all' where the API needs a single firm (ledger, receipts).
import { api } from '@/lib/axios';
import type {
  DieselLogListResponse,
  DieselLogQuery,
  EfficiencyRow,
  FleetAlerts,
  FleetMachine,
  LastReading,
  MachineHistory,
  MonthLedger,
  OwnershipType,
  UsageLog,
  Warning,
} from '../../types/types';

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;
const warningsOf = (res: { data: { warnings?: Warning[] } }): Warning[] => res.data.warnings ?? [];

export const fleetApi = {
  machines: (p: { firmId?: string; ownership?: OwnershipType; q?: string }) =>
    api.get('/fleet/machines', { params: p }).then((r) => unwrap<FleetMachine[]>(r)),
  lastReading: (machineId: string) =>
    api.get(`/fleet/machines/${machineId}/last-reading`).then((r) => unwrap<LastReading>(r)),
  history: (machineId: string, p: { from?: string; to?: string } = {}) =>
    api.get(`/fleet/machines/${machineId}/history`, { params: p }).then((r) => unwrap<MachineHistory>(r)),

  dieselLogs: (p: DieselLogQuery) =>
    api.get('/fleet/diesel/logs', { params: p }).then((r) => unwrap<DieselLogListResponse>(r)),

  voidUsage: (id: string, reason: string) => api.post(`/fleet/usage-logs/${id}/void`, { reason }).then(unwrap),
  voidDiesel: (id: string, reason: string) => api.post(`/fleet/diesel/logs/${id}/void`, { reason }).then(unwrap),

  ledger: (p: { firmId: string; month: string; includeIdle?: boolean }) =>
    api.get('/fleet/ledger', { params: p }).then((r) => unwrap<MonthLedger>(r)),
  exportLedger: async (p: { firmId: string; month: string; format: 'xlsx' | 'csv'; includeIdle?: boolean }) => {
    const res = await api.get('/fleet/ledger/export', { params: p, responseType: 'blob' });
    const cd = String(res.headers['content-disposition'] ?? '');
    const name = /filename="?([^";]+)"?/.exec(cd)?.[1] ?? `diesel-ledger-${p.month}.${p.format}`;
    return { blob: res.data as Blob, name };
  },
  efficiency: (p: { firmId?: string; from: string; to: string; machineId?: string }) =>
    api.get('/fleet/efficiency', { params: p }).then((r) => unwrap<EfficiencyRow[]>(r)),
  alerts: (p: { firmId?: string } = {}) => api.get('/fleet/alerts', { params: p }).then((r) => unwrap<FleetAlerts>(r)),
};
