// @ts-nocheck
// Types and data models for Project Abstract Engine

export const STANDARD_PIPE_DIAS = [
  110, 125, 140, 160, 180, 200, 225, 250, 280, 315, 355, 400, 450, 500, 560, 630, 710, 800, 900
] as const;

export type PipeDia = typeof STANDARD_PIPE_DIAS[number] | number;

export interface SurveyRow {
  id: string;
  minor_id: string;
  seq: number;
  alignment: string; // e.g. "SM-2", "L-1"
  chainage: number;  // metres, cumulative along the line
  pipe_dia: number;  // mm
  excavation_done: boolean;
  pipe_laying_done: boolean;
  back_filling_done: boolean;
  remark: string;
  // Optional reference fields
  elevation?: number;
  pipe_top?: number;
  pipe_bottom?: number;
  cutting_level?: number;
  invert_level?: number;
  hard_rock_recorded?: boolean;
  recorded_depth?: number;
  hard_rock?: number;
  // Diagnostic flags
  has_negative_segment?: boolean;
  has_blank_dia?: boolean;
}

export interface Minor {
  id: string;
  name: string;
  contractor?: string;
  village?: string;
  order?: number;
}

export interface Adjustment {
  id: string;
  minor_id: string;
  pipe_dia: number;
  value_m: number; // +/- correction in metres
  note: string;
  created_at: string;
  created_by?: string;
}

export interface AbstractInputs {
  recorded_upto_ra2: Record<number, number>; // billed quantity up to RA2 per pipe_dia
  ra1_qty: Record<number, number>;           // RA1 quantity per pipe_dia
  rate: Record<number, number>;              // Rate in Rupees per metre per pipe_dia
  cad_qty: Record<string, Record<number, number>>; // cad_qty[minor_id][pipe_dia]
  cad_previous_recorded: Record<number, number>;   // Hand-entered previous CAD row
  cad_previous_recorded_label: string;             // Label for above row (configurable)
  cad_last_refreshed?: string;                     // Timestamp for IMPORTRANGE / import job
  labels_config: {
    pdn: string;     // default "PDN (Pipe Distribution Network)"
    cadwm: string;   // default "CADWM (Command Area Development & Water Management)"
    rmt: string;     // default "RMT"
    ra1: string;     // default "RA1"
    ra2: string;     // default "RA2"
    ra3: string;     // default "RA3"
  };
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: 'UPDATE_CHECKBOX' | 'UPDATE_SURVEY_ROW' | 'ADD_SURVEY_ROW' | 'DELETE_SURVEY_ROW' | 'UPDATE_INPUT' | 'ADD_ADJUSTMENT' | 'DELETE_ADJUSTMENT' | 'IMPORT_DATA' | 'RESET_SEED';
  details: string;
  minor_id?: string;
  pipe_dia?: number;
  old_value?: any;
  new_value?: any;
}

export interface MinorDiaResult {
  executed_raw: number;
  adjustment: number;
  executed_final: number;
  planned: number;
  completion_pct: number | null; // null represents '-'
}

export interface MinorAbstractSummary {
  minor_id: string;
  minor_name: string;
  dias: Record<number, MinorDiaResult>;
  total_executed_raw: number;
  total_adjustment: number;
  total_executed_final: number;
  total_planned: number;
  overall_pct: number | null; // null if total_planned is 0
}

export interface RateWarning {
  pipe_dia: number;
  quantity: number;
  message: string;
}

export interface CalculatedAbstract {
  pipe_dias: number[];
  minors: Minor[];
  minor_summaries: Record<string, MinorAbstractSummary>;
  
  // Section A: PDN
  total_pdn_per_dia: Record<number, number>;
  total_pdn_grand: number;

  // Section B: RA2 & RA3
  recorded_upto_ra2_per_dia: Record<number, number>;
  recorded_upto_ra2_grand: number;
  to_record_in_ra3_per_dia: Record<number, number>;
  to_record_in_ra3_grand: number;

  // Section C: CADWM
  cad_per_minor_per_dia: Record<string, Record<number, number>>;
  cad_minor_totals: Record<string, number>;
  total_cad_per_dia: Record<number, number>;
  total_cad_grand: number;
  cad_previous_recorded_per_dia: Record<number, number>;
  cad_previous_recorded_grand: number;

  // Section D: TOTAL UPTO DATE WORK DONE
  total_upto_date_per_dia: Record<number, number>;
  total_upto_date_grand: number;

  // Section E: Billing Comparison
  ra1_qty_per_dia: Record<number, number>;
  ra1_qty_grand: number;
  difference_per_dia: Record<number, number>;
  difference_grand: number;
  rate_per_dia: Record<number, number>;
  amount_as_per_ra1_per_dia: Record<number, number>;
  amount_as_per_ra1_grand: number;
  amount_upto_date_per_dia: Record<number, number>;
  amount_upto_date_grand: number;

  // Warnings
  rate_warnings: RateWarning[];
}
