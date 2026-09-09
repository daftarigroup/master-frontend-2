export interface AssetSpec {
  name: string;
  value?: string;
}

export type AssetLifecycleStatus = 'Active' | 'Inactive' | 'Disposed';
export type AssetOperationalStatus = 'Running' | 'Under Repair' | 'Breakdown' | 'Maintenance Due' | 'Inactive';
export type YesNo = 'Yes' | 'No';

export interface AssetProduct {
  id: number;
  sn: string;

  // Basic Information
  productName: string;
  category: string;
  type: string;
  brand?: string;
  model?: string;
  serialNo?: string;
  sku?: string;
  mfgDate?: string;
  origin?: string;
  status: AssetLifecycleStatus;

  // Location & Custody
  location?: string;
  department?: string;
  division?: string;
  machineArea?: string;
  assignedTo?: string;
  usageType?: string;
  storageLoc?: string;
  responsiblePerson?: string;

  // Financial & Purchase
  assetDate?: string;
  invoiceNo?: string;
  assetValue?: number | string;
  /** Legacy alias some views read for purchase cost; kept in sync with assetValue. */
  cost?: number | string;
  quantity?: number | string;
  supplierName?: string;
  supplierPhone?: string;
  supplierEmail?: string;
  paymentMode?: string;
  depMethod?: string;
  depRate?: number | string;
  assetLife?: number | string;
  residualValue?: number | string;

  // Warranty & AMC
  warrantyAvailable?: YesNo;
  warrantyProvider?: string;
  warrantyStart?: string;
  warrantyEnd?: string;
  amc?: YesNo;
  amcProvider?: string;
  amcStart?: string;
  amcEnd?: string;
  serviceContact?: string;

  // Operational & Maintenance
  runningHours?: number | string;
  installationDate?: string;
  operationalStatus?: AssetOperationalStatus;
  maintenanceRequired?: YesNo;
  maintenanceType?: string;
  frequency?: string;
  nextService?: string;
  priority?: 'Low' | 'Medium' | 'High';
  technician?: string;
  maintenanceNotes?: string;

  // Technical Specs
  specs: AssetSpec[];

  // Notes & Remarks
  internalNotes?: string;
  usageRemarks?: string;
  condition?: string;

  // Attached documents (kept in-memory only in this mock/frontend-only pass)
  documents?: AssetDocumentRef[];

  // Machine Parts Master linkage
  machineId?: number | string | null;
  initialEntryDate?: string;
  isFromMachineParts?: boolean;

  // Repair history (aggregated on the product for list/detail display)
  lastRepairDate?: string;
  repairCost?: number | string;
  repairCount?: number;
  totalRepairCost?: number | string;
  partChanged?: YesNo;
  partNames?: string[];

  createdBy?: string;
  createdDate?: string;
}

export interface AssetDocumentRef {
  name: string;
  size?: number;
}

export interface AssetUser {
  id: number | string;
  user_name: string;
  unit?: string;
}

export interface MachinePart {
  id: number | string;
  machine_name: string;
  machine_area?: string;
  machine_division?: string;
  machine_department?: string;
  part_name?: string[] | string;
  created_at?: string;
}

export interface AssetRepair {
  productId: number | string;
  repairDate: string;
  repairCost?: number | string;
  partChanged?: YesNo;
  partNames?: string[];
  notes?: string;
}

export type NewAssetProduct = Omit<AssetProduct, 'id' | 'sn' | 'createdDate'> & {
  id?: number;
  sn?: string;
};
