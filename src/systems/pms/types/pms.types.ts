// @ts-nocheck
export interface PMSProject {
  id: string;
  serial_no: string;
  project_type: string;
  project_name: string;
  agreement_number?: string | null;
  department?: string | null;
  division?: string | null;
  sub_division?: string | null;
  irrigation_capacity?: string | null;
  project_location?: string | null;
  village?: string | null;
  district?: string | null;
  state?: string | null;
  contractor_name?: string | null;
  contractor_phone?: string | null;
  contractor_email?: string | null;
  contractor_address?: string | null;
  start_date?: string | null;
  planned_end_date?: string | null;
  work_period?: string | null;
  work_order?: string | null;
  work_order_date?: string | null;
  work_order_document?: string | null;
  work_order_doc_name?: string | null;
  tender_id?: string | null;
  tender_amount?: number | string | null;
  percentage?: number | string | null;
  maintenance_period?: string | null;
  project_description?: string | null;
  status: string;
  created_at?: string;
  updated_at?: string;
  minors?: PMSProjectMinor[];
  designs?: PMSProjectDesign[];
  mobilization?: any;
  finalize_consultant?: any;
  sent_po?: any;
  survey?: any;
  drawing_upload?: any;
  final_approval?: any;
  drawing?: any;
}

export interface PMSProjectMinor {
  id: string;
  project_id: string;
  project_no: string;
  minor_name: string;
  contractor_name?: string | null;
  po_number?: string | null;
  schedule_file?: string | null;
  schedule_file_id?: string | null;
  schedule_file_name?: string | null;
  schedule_rows?: any;
  schedule_headers?: any;
  created_at?: string;
  updated_at?: string;
  schedule?: PMSSchedule | null;
}

export interface PMSProjectDesign {
  id: string;
  project_id: string;
  project_no: string;
  rows: any[];
  created_at?: string;
  updated_at?: string;
}

export interface PMSProjectExecution {
  id: string;
  project_id: string;
  project_no: string;
  entry_id?: string | null;
  date?: string | null;
  stage_number?: number | null;
  stage_name?: string | null;
  submission_date_time?: string | null;
  data: any;
  created_at?: string;
  updated_at?: string;
}

export interface PMSProjectActual {
  id: string;
  project_id: string;
  project_no: string;
  entry_id?: string | null;
  date?: string | null;
  stage_number?: number | null;
  stage_name?: string | null;
  submission_date_time?: string | null;
  data: any;
  created_at?: string;
  updated_at?: string;
}

export interface PMSStageEntry {
  id: string;
  project_id: string;
  project_no: string;
  stage_number: number;
  step_index: number;
  status?: string | null;
  data?: any;
  created_at?: string;
  updated_at?: string;
}

export interface PMSSchedule {
  id: string;
  minor_id: string;
  file_id?: string | null;
  file_url?: string | null;
  file_name?: string | null;
  rows?: any;
  headers?: any;
  created_at?: string;
  updated_at?: string;
}

export interface PMSRMBill {
  id: string;
  project_id: string;
  project_no: string;
  bill_no?: string | null;
  rm_no?: string | null;
  bill_type: 'Execution' | 'Actual' | string;
  bill_date?: string | null;
  total_amount?: number | string | null;
  status: 'pending' | 'billed' | string;
  remarks?: string | null;
  entries: any[];
  calculations?: any;
  created_at?: string;
  updated_at?: string;
}

export interface PMSDocument {
  id: string;
  document_uid: string;
  project_no?: string | null;
  project_name?: string | null;
  agreement_no?: string | null;
  title: string;
  doc_type: string;
  file_name: string;
  file_url: string;
  file_size?: string | null;
  file_type?: string | null;
  recipient?: string | null;
  ref_no?: string | null;
  date?: string | null;
  remarks?: string | null;
  uploaded_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PMSEmailLog {
  id: string;
  log_uid: string;
  project_no?: string | null;
  project_name?: string | null;
  agreement_no?: string | null;
  to: string;
  cc?: string | null;
  subject: string;
  body?: string | null;
  attached_docs?: any;
  sent_at?: string;
  status?: string;
  sender?: string | null;
}
