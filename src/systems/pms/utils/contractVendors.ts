// Contract vendors: details come from the Vendors master (/store/entity/vendors); default contract items are stored in the DB (/pms/contract-vendors).
import { apiClient } from '@/lib/apiClient';
import { pmsApi } from '../services/pmsApi';

export interface ContractVendorItem {
  product_name: string; quantity: number; uom: string; rate: number; gst_percent: number; discount_percent: number;
}
export interface ContractVendor {
  id?: number; vendor_id?: string | null; name: string; address: string; gstin: string; email: string; phone: string; items: ContractVendorItem[];
}

export const fetchVendorMaster = async (): Promise<any[]> => {
  try {
    const res: any = await apiClient.get('/store/entity/vendors', { params: { order: 'vendor_name.asc', limit: 'all' } });
    return Array.isArray(res) ? res : res?.data || [];
  } catch { return []; }
};

// Saved contract vendors merged with the live vendor master details
export const fetchContractVendors = async (): Promise<ContractVendor[]> => {
  const [res, master]: any = await Promise.all([pmsApi.get('/contract-vendors'), fetchVendorMaster()]);
  const rows = Array.isArray(res) ? res : res?.data || [];
  return rows.map((r: any) => {
    const m = master.find((v: any) => String(v.id) === String(r.vendor_id)) || master.find((v: any) => v.vendor_name === r.vendor_name) || {};
    return {
      id: r.id, vendor_id: r.vendor_id, name: r.vendor_name,
      address: m.address || '', gstin: m.gstin || '', email: m.email || '', phone: m.phone || '',
      items: Array.isArray(r.items) ? r.items : [],
    };
  });
};

export const saveContractVendor = (v: { vendor_id?: any; name: string; items: ContractVendorItem[] }) =>
  pmsApi.post('/contract-vendors', { vendor_id: v.vendor_id ?? null, vendor_name: v.name, items: v.items });

export const deleteContractVendor = (id: number) => pmsApi.delete(`/contract-vendors/${id}`);
