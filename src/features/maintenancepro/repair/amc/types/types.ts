export type AMCMachineItem = {
  id: string;
  indentNumber: string;
  machineName: string;
  machineSerialNo: string;
  taskStatus: string;
  approvalStatus: string | null;
  cost: number;
  createdAt: string;
  source: 'indent' | 'workorder';
  // Only present in "All Companies" mode.
  tenant?: { id: string; name: string } | null;
};

export type AMCVendorDetailItem = {
  id: string;
  partName: string;
  quantity: number | null;
  cost: number;
  warrantyFromDate: string | null;
  warrantyToDate: string | null;
  machineName: string | null;
  source: 'indent' | 'workorder';
  date: string;
};

export type AMCVendorItem = {
  vendorName: string;
  totalAmount: number;
  count: number;
  details: AMCVendorDetailItem[];
};

export type AMCData = {
  machineData: AMCMachineItem[];
  allTimeTotalCost: number;
  vendorData: AMCVendorItem[];
};
