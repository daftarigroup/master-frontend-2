import { api } from '@/lib/axios';
import type { EquipmentFilters, EquipmentList, EquipmentSummary } from '../types';

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export interface EquipmentQuery extends Partial<EquipmentFilters> {
  firmId?: string;
  month?: string;
  limit?: number;
  offset?: number;
  includeInactive?: boolean;
}

/** Empty filter values are left out so the server sees only what the user chose. */
const clean = (p: object) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== '' && v !== undefined && v !== null));

export const equipmentApi = {
  list: (p: EquipmentQuery) => api.get('/fleet/equipment', { params: clean(p) }).then((r) => unwrap<EquipmentList>(r)),
  summary: (id: string, month?: string) => api.get(`/fleet/equipment/${id}/summary`, { params: clean({ month }) }).then((r) => unwrap<EquipmentSummary>(r)),
};
