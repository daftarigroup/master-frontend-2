import { api } from '@/lib/axios';
import type { MachineRepair, RepairFetchResponse } from '../../types/types';

export const fetchPartsAndVendors = async (
  page = 1,
  limit = 20,
  searchTerm = '',
  vendorFilter = '',
  partFilter = '',
  typeFilter = ''
): Promise<RepairFetchResponse> => {
  const res = await api.get('/repair-system/spare-parts');
  const parts: any[] = res.data?.data ?? [];

  let mapped: MachineRepair[] = parts.map((p, idx) => ({
    task_id: idx + 1,
    part_row_id: p.id,
    created_at: new Date().toISOString().slice(0, 10),
    form_filled_by: 'Maintenance Admin',
    assigned_to: '',
    machine_name: p.machineType || 'General',
    issue_detail: p.description || 'Spare part stock replacement',
    part_replaced: p.partName,
    task_start_date: new Date().toISOString().slice(0, 10),
    actual_date: new Date().toISOString().slice(0, 10),
    delay: '0 days',
    work_done: 'Replaced and verified',
    photo_url: null,
    status: 'COMPLETED',
    machine_type: p.machineType,
    vendor_name: p.vendorName,
    bill_copy_url: null,
    qty: p.stockQty,
    bill_amount: p.unitPrice * (p.stockQty || 1),
    remarks: p.description || null,
    motor_name: null,
    warranty_start_date: null,
    warranty_end_date: null,
    tenant: null,
  }));

  if (searchTerm) {
    const q = searchTerm.toLowerCase();
    mapped = mapped.filter(
      (m) =>
        m.part_replaced?.toLowerCase().includes(q) ||
        m.vendor_name?.toLowerCase().includes(q) ||
        m.machine_name?.toLowerCase().includes(q)
    );
  }

  if (vendorFilter) {
    mapped = mapped.filter((m) => m.vendor_name === vendorFilter);
  }
  if (partFilter) {
    mapped = mapped.filter((m) => m.part_replaced === partFilter);
  }
  if (typeFilter) {
    mapped = mapped.filter((m) => m.machine_type === typeFilter);
  }

  const start = (page - 1) * limit;
  const data = mapped.slice(start, start + limit);

  return {
    data,
    totalCount: mapped.length,
  };
};

export const getUniqueVendors = async (): Promise<string[]> => {
  const res = await api.get('/repair-system/spare-parts/vendors');
  return res.data?.data ?? [];
};

export const getUniqueParts = async (): Promise<string[]> => {
  const res = await api.get('/repair-system/spare-parts/parts');
  return res.data?.data ?? [];
};

export const getUniqueMachineTypes = async (): Promise<{ type_name: string }[]> => {
  const res = await api.get('/repair-system/spare-parts/machine-types');
  return res.data?.data ?? [];
};

export const deleteRepair = async (partRowId: string): Promise<boolean> => {
  await api.delete(`/repair-system/spare-parts/${partRowId}`);
  return true;
};
