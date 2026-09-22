// Types for Part and Vendor management

export interface MachineRepair {
  task_id: number;
  part_row_id: string;
  created_at: string;
  form_filled_by: string | null;
  assigned_to: string | null;
  machine_name: string | null;
  issue_detail: string | null;
  part_replaced: string | null;
  task_start_date: string | null;
  actual_date: string | null;
  delay: string | null;
  work_done: string | null;
  photo_url: string | null;
  status: string | null;
  machine_type?: string | null;
  vendor_name: string | null;
  bill_copy_url: string | null;
  qty: number | null;
  bill_amount: number | null;
  remarks: string | null;
  motor_name: string | null;
  warranty_start_date: string | null;
  warranty_end_date: string | null;
  Work_Done_By?: string | null;
  Type_of_Work?: string | null;
  purchase_date?: string | null;
  // Only present in "All Companies" mode
  tenant?: { id: string; name: string } | null;
}

export interface RepairFetchResponse {
  data: MachineRepair[];
  totalCount: number;
}

export interface RepairRequestFormData {
  formFilledBy: string;
  assignedTo: string;
  machineType?: string;
  machineName: string;
  motorName?: string;
  issueDetail: string;
  task_start_date?: string;
  part_replaced?: string[];
  bill_amount?: number;
  qty?: number;
  vendorName?: string;
  purchaseDate?: string;
}

export interface RepairProcessFormData {
  partReplaced?: string;
  workDone?: string;
  photoUrl?: string;
  status: string;
  vendorName?: string;
  billCopyUrl?: string;
  billAmount?: number;
  remarks?: string;
  warrantyFromDate?: string;
  warrantyToDate?: string;
  workDoneBy?: string;
  typeOfWork?: string;
}
