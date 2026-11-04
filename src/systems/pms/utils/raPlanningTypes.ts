// @ts-nocheck
export type WorkType = 'PDN' | 'CAD';

export interface Minor {
  id: string;
  name: string;
  order: number;
}

export interface SurveyRow {
  minor_id: string;
  seq: number;
  alignment: string;
  chainage: number;
  pipe_dia: number;
  back_filling_done: boolean;
  remarks?: string;
}

export interface Adjustment {
  id: string;
  minor_id: string;
  pipe_dia: number;
  length_adjustment: number;
  reason: string;
  created_by?: string;
  created_at?: string;
}

export interface CADExecutedRecord {
  qty: number;
  source_note?: string;
  last_refreshed?: string;
  is_error?: boolean;
}

export interface RAPlanningInputs {
  bill_no: string; // e.g. 'RA2', 'RA3', 'RA4'
  tolerance_percent: number; // e.g. 10 (warn if executed > planned by > tolerance)
  labels_config: {
    pdn: string;
    cadwm: string;
  };
  cad_source_config?: {
    source_name: string;
    last_synced?: string;
    is_live_sync: boolean;
  };
}

export interface RAPlannedState {
  // [bill_no][work_type][minor_id][dia] -> planned length in metres
  planned: Record<string, Record<WorkType, Record<string, Record<number, number>>>>;
  // [minor_id][dia] -> CAD record
  cad_executed: Record<string, Record<number, CADExecutedRecord>>;
  inputs: RAPlanningInputs;
}

export interface MinorBlockPlanning {
  minor: Minor;
  work_type: WorkType;
  // per dia quantities
  executed_per_dia: Record<number, number>;
  planned_per_dia: Record<number, number>;
  balance_per_dia: Record<number, number>; // planned - executed
  // warning flags per dia
  tolerance_warn_per_dia: Record<number, boolean>; // executed > planned * (1 + tol)
  zero_plan_warn_per_dia: Record<number, boolean>; // executed > 0 && planned == 0
  // row totals (across dias)
  total_executed: number;
  total_planned: number;
  total_balance_qty: number; // planned - executed
  completion_ratio: number | null; // executed / planned (null if planned == 0)
}

export interface CalculatedRAPlanning {
  bill_no: string;
  pipe_dias: number[];
  active_dias: number[]; // dias where at least one executed or planned > 0
  minors: Minor[];
  // Section A: PDN blocks per minor
  pdn_blocks: Record<string, MinorBlockPlanning>;
  // Section B: CADWM blocks per minor
  cad_blocks: Record<string, MinorBlockPlanning>;
  // Section C: TOTAL UPTO DATE WORK DONE (executed PDN + executed CAD)
  total_upto_date_executed_per_dia: Record<number, number>;
  total_upto_date_grand: number;
  // Totals for acceptance test verification
  total_pdn_executed_grand: number;
  total_cad_executed_grand: number;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: 'UPDATE_PLANNED' | 'UPDATE_CAD' | 'SYNC_CAD' | 'RESET_SEED';
  details: string;
  bill_no?: string;
  minor_id?: string;
  work_type?: WorkType;
  pipe_dia?: number;
  old_val?: number;
  new_val?: number;
}
