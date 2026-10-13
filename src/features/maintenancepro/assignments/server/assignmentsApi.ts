import { api } from '@/lib/axios';
import type {
  AssignBody, AssignmentList, AssignmentQuery, Availability, DispatchBody, FirmOption, OperatorBody, OperatorRow, ReceiveBody, ReleaseBody, Transfer, TransferBody, TransferList,
} from '../types';

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;
const clean = (p: object) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== '' && v !== undefined && v !== null && v !== false));

export const assignmentsApi = {
  list: (p: AssignmentQuery) => api.get('/fleet/assignments', { params: clean(p) }).then((r) => unwrap<AssignmentList>(r)),
  assign: (b: AssignBody) => api.post('/fleet/assignments', b).then((r) => unwrap<{ id: string }>(r)),
  release: (id: string, b: ReleaseBody) => api.post(`/fleet/assignments/${id}/release`, b).then((r) => unwrap<{ id: string }>(r)),

  operators: () => api.get('/fleet/operator-assignments').then((r) => unwrap<OperatorRow[]>(r)),
  assignOperator: (b: OperatorBody) => api.post('/fleet/operator-assignments', b).then((r) => unwrap<{ id: string }>(r)),
  endOperator: (id: string) => api.post(`/fleet/operator-assignments/${id}/end`).then((r) => unwrap<{ id: string }>(r)),

  availability: (days: number, firmId?: string) => api.get('/fleet/availability', { params: clean({ days, firmId }) }).then((r) => unwrap<Availability>(r)),

  transfers: (firmId?: string) => api.get('/fleet/transfers', { params: clean({ status: 'OPEN', firmId }) }).then((r) => unwrap<TransferList>(r)),
  requestTransfer: (b: TransferBody) => api.post('/fleet/transfers', b).then((r) => unwrap<Transfer>(r)),
  approve: (id: string) => api.post(`/fleet/transfers/${id}/approve`).then((r) => unwrap<Transfer>(r)),
  dispatch: (id: string, b: DispatchBody) => api.post(`/fleet/transfers/${id}/dispatch`, b).then((r) => unwrap<Transfer>(r)),
  receive: (id: string, b: ReceiveBody) => api.post(`/fleet/transfers/${id}/receive`, b).then((r) => unwrap<Transfer>(r)),
  cancel: (id: string, reason: string) => api.post(`/fleet/transfers/${id}/cancel`, { reason }).then((r) => unwrap<Transfer>(r)),

  firms: () => api.get('/maintenance/firms').then((r) => (r.data?.data ?? []) as FirmOption[]),
};
