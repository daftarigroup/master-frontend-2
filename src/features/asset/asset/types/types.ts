export type AssetStatus = 'Active' | 'Inactive' | 'Under Repair' | 'Disposed';
export type MaintenanceStatus = 'Yes' | 'No';
export type AssetCategory = 'IT' | 'Electronics' | 'Furniture' | 'Machinery' | 'Tools' | 'Vehicle';
export type AssetType = 'Asset' | 'Non-Consumable' | 'Consumable';

export interface Asset {
  id: string;
  sn: string;
  productName: string;
  category: AssetCategory;
  type: AssetType;
  brand: string;
  model: string;
  serialNo: string;
  sku: string;
  mfgDate: string;
  origin: string;
  status: AssetStatus;
  assetDate: string;
  invoiceNo: string;
  cost: number;
  quantity: number;
  supplierName: string;
  supplierPhone: string;
  paymentMode: string;
  location: string;
  department: string;
  firmId?: string | null;
  firmName?: string;
  assignedTo: string;
  responsiblePerson: string;
  warrantyAvailable: 'Yes' | 'No';
  warrantyEnd: string;
  amc: 'Yes' | 'No';
  amcEnd: string;
  maintenanceRequired: MaintenanceStatus;
  maintenanceType: string;
  frequency: string;
  maintenanceCount?: number;
  lastMaintenanceDate?: string;
  nextService: string;
  priority: 'Low' | 'Medium' | 'High' | '';
  repairCount: number;
  lastRepairDate: string;
  repairCost: number;
  partChanged: 'Yes' | 'No';
  partNames: string[];
  totalRepairCost: number;
  assetValue: number;
  depMethod: string;
  createdBy: string;
}

export const CATEGORY_COLORS: Record<AssetCategory, { bg: string; text: string; dot: string }> = {
  IT: {
    bg: 'bg-blue-50 border-blue-200 dark:bg-blue-950/40',
    text: 'text-blue-600 dark:text-blue-400',
    dot: 'bg-blue-500',
  },
  Electronics: {
    bg: 'bg-violet-50 border-violet-200 dark:bg-violet-950/40',
    text: 'text-violet-600 dark:text-violet-400',
    dot: 'bg-violet-500',
  },
  Furniture: {
    bg: 'bg-amber-50 border-amber-200 dark:bg-amber-950/40',
    text: 'text-amber-600 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  Machinery: {
    bg: 'bg-orange-50 border-orange-200 dark:bg-orange-950/40',
    text: 'text-orange-600 dark:text-orange-400',
    dot: 'bg-orange-500',
  },
  Tools: {
    bg: 'bg-teal-50 border-teal-200 dark:bg-teal-950/40',
    text: 'text-teal-600 dark:text-teal-400',
    dot: 'bg-teal-500',
  },
  Vehicle: {
    bg: 'bg-slate-50 border-slate-200 dark:bg-slate-950/40',
    text: 'text-slate-600 dark:text-slate-400',
    dot: 'bg-slate-500',
  },
};

export const STATUS_COLORS: Record<AssetStatus, { bg: string; text: string; border: string }> = {
  Active: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  Inactive: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
  'Under Repair': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  Disposed: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
};

export function formatCurrency(val: number): string {
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
  return `₹${val}`;
}

export function formatDateOnly(value: unknown): string {
  if (!value) return '—';
  const str = String(value).trim();
  if (!str) return '—';
  const match = str.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const d = new Date(str);
  if (isNaN(d.getTime())) return str;
  return d.toISOString().slice(0, 10);
}
