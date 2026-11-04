// @ts-nocheck
export interface Minor {
  id: string;
  name: string;
  order: number;
}

export interface SurveyRow {
  id?: string;
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
  length_adjustment: number; // e.g. -2.91 or +9.0
  reason?: string;
}

export interface MeasuredQtyRecord {
  qty: number;
  source: string; // e.g. 'Abstract sheet IMPORTRANGE' or 'Measurement Book #12'
  last_refreshed: string; // ISO date string
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  user?: string;
}

export interface FinalComparativeInputs {
  snapshot_date: string; // e.g. '18-Jun-2026'
  recorded_upto_ra2_pdn: Record<number, number>;
  recorded_upto_ra2_cad: Record<number, number>;
  measured_qty: Record<number, MeasuredQtyRecord>;
  ra1_qty: Record<number, number>;
  rate: Record<number, number>;
  tolerance_pct: number; // default 2%
  cad_source_mode: 'RA2_PLANNING' | 'ABSTRACT';
  labels_config?: {
    pdn?: string;
    cadwm?: string;
    ra1?: string;
    ra2?: string;
    ra3?: string;
  };
}

export interface DatedSnapshot {
  id: string;
  name: string;
  date: string; // e.g. '18-Jun-2026'
  created_at: string;
  inputs: FinalComparativeInputs;
  notes?: string;
}

export interface CalculatedFinalComparative {
  pipe_dias: number[];
  active_dias: number[];

  // PDN Section
  pdn_executed_by_minor: Record<string, Record<number, number>>;
  pdn_minor_totals: Record<string, number>;
  total_pdn_per_dia: Record<number, number>;
  total_pdn_grand: number;

  recorded_upto_ra2_pdn_per_dia: Record<number, number>;
  recorded_upto_ra2_pdn_grand: number;

  to_record_in_ra3_per_dia: Record<number, number>;
  to_record_in_ra3_grand: number;

  measured_qty_per_dia: Record<number, number>;
  measured_qty_grand: number;

  pdn_vs_measurement_per_dia: Record<number, number>;
  pdn_vs_measurement_grand: number;

  // CADWM Section
  cad_executed_by_minor: Record<string, Record<number, number>>;
  cad_minor_totals: Record<string, number>;
  total_cad_per_dia: Record<number, number>;
  total_cad_grand: number;

  recorded_upto_ra2_cad_per_dia: Record<number, number>;
  recorded_upto_ra2_cad_grand: number;

  // Total Upto Date Work Done
  total_upto_date_per_dia: Record<number, number>;
  total_upto_date_grand: number; // Correct sum across dias: 53,772.4

  // Billing Section
  ra1_qty_per_dia: Record<number, number>;
  ra1_qty_grand: number;

  difference_per_dia: Record<number, number>;
  difference_grand: number;

  rate_per_dia: Record<number, number>;

  amount_as_per_ra1_per_dia: Record<number, number>;
  amount_as_per_ra1_grand: number;

  amount_upto_date_per_dia: Record<number, number>;
  amount_upto_date_grand: number;

  // Diagnostics & Warnings
  missing_rate_dias: number[];
  stale_measured_qty: boolean;
  tolerance_warnings: Record<number, boolean>;
}
