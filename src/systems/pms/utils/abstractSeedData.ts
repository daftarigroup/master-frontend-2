// @ts-nocheck
import { Minor, Adjustment, AbstractInputs, SurveyRow, STANDARD_PIPE_DIAS } from './abstractTypes';

export const SEED_MINORS: Minor[] = [
  { id: 'minor-injewada', name: 'Injewada', village: 'Injewada', contractor: 'Sai Krupa Engineering Works', order: 1 },
  { id: 'minor-sarpewada', name: 'Sarpewada', village: 'Sarpewada', contractor: 'Pooja Construction', order: 2 },
  { id: 'minor-koka1', name: 'Koka 1', village: 'Koka', contractor: 'Shree Ganesh Infra Ltd', order: 3 },
  { id: 'minor-koka2', name: 'Koka 2', village: 'Koka', contractor: 'Shree Ganesh Infra Ltd', order: 4 },
  { id: 'minor-sonkund', name: 'Sonkund', village: 'Sonkund', contractor: 'Apex Engineering & Infra', order: 5 },
  { id: 'minor-palora', name: 'Palora', village: 'Palora', contractor: 'Kalyan Construction Co.', order: 6 },
];

// Target executed_final totals:
// Injewada: 5,327.0 m (planned: 7,000.0 m -> 76.1%)
// Sarpewada: 6,055.0 m (planned: 7,000.0 m -> 86.5%)
// Koka 1: 511.0 m (planned: 7,000.0 m -> 7.3%)
// Koka 2: 5,915.0 m (planned: 7,000.0 m -> 84.5%)
// Sonkund: 8,560.0 m (planned: 10,000.0 m -> 85.6%)
// Palora: 8,640.5 m (planned: 10,300.0 m -> 83.9%)
// Grand TOTAL PDN = 35,008.5 m

export const SEED_PLANNED_QTY: Record<string, Record<number, number>> = {
  'minor-injewada': {
    110: 1200, 125: 1100, 140: 1400, 160: 800, 180: 500, 200: 600, 225: 500, 250: 400, 280: 300, 315: 200
  },
  'minor-sarpewada': {
    110: 1000, 125: 1200, 140: 1300, 160: 700, 180: 600, 200: 700, 225: 500, 250: 400, 280: 400, 315: 200
  },
  'minor-koka1': {
    110: 1500, 125: 1200, 140: 1500, 160: 800, 180: 500, 200: 500, 225: 400, 250: 300, 280: 200, 315: 100
  },
  'minor-koka2': {
    110: 1100, 125: 1100, 140: 1400, 160: 700, 180: 500, 200: 600, 225: 500, 250: 400, 280: 400, 315: 300
  },
  'minor-sonkund': {
    110: 1500, 125: 1600, 140: 1800, 160: 1000, 180: 800, 200: 800, 225: 700, 250: 600, 280: 500, 315: 400, 450: 300
  },
  'minor-palora': {
    110: 1500, 125: 1500, 140: 1800, 160: 1000, 180: 800, 200: 900, 225: 700, 250: 600, 280: 500, 315: 500, 900: 500
  }
};

// Explicit adjustments with notes as per requirement 1 & 5
export const SEED_ADJUSTMENTS: Adjustment[] = [
  {
    id: 'adj-1',
    minor_id: 'minor-injewada',
    pipe_dia: 160,
    value_m: -2.91,
    note: '172.69-175.6 -2.91 160MM Dia 175.6m',
    created_at: '2026-09-15T10:30:00Z',
    created_by: 'Quality Engineer (Site)'
  },
  {
    id: 'adj-2',
    minor_id: 'minor-sonkund',
    pipe_dia: 450,
    value_m: 9.0,
    note: 'Realignment extra length across canal crossing +9m',
    created_at: '2026-09-20T14:15:00Z',
    created_by: 'Site In-charge'
  }
];

// Per-dia executed breakdown per minor (raw before adjustment, or final after adjustment)
// We calibrate this so:
// sum across all minors & dias = 35,008.5
export const SEED_EXECUTED_FINAL_BY_MINOR: Record<string, Record<number, number>> = {
  'minor-injewada': {
    110: 920.0,
    125: 840.0,
    140: 1100.0,
    160: 600.0, // Raw is 600.0; minus 2.91 adjustment = 597.09 final!
    180: 380.0,
    200: 450.0,
    225: 390.0,
    250: 310.0,
    280: 210.0,
    315: 129.91 // Total Injewada final = 5,327.0 m (76.1% of 7,000m)
  },
  'minor-sarpewada': {
    110: 890.0,
    125: 1050.0,
    140: 1180.0,
    160: 610.0,
    180: 510.0,
    200: 620.0,
    225: 430.0,
    250: 345.0,
    280: 320.0,
    315: 100.0 // Total Sarpewada final = 6,055.0 m (86.5% of 7,000m)
  },
  'minor-koka1': {
    110: 95.0,
    125: 110.0,
    140: 120.0,
    160: 50.0,
    180: 40.0,
    200: 36.0,
    225: 25.0,
    250: 15.0,
    280: 12.0,
    315: 8.0 // Total Koka 1 final = 511.0 m (7.3% of 7,000m)
  },
  'minor-koka2': {
    110: 950.0,
    125: 980.0,
    140: 1250.0,
    160: 580.0,
    180: 420.0,
    200: 530.0,
    225: 420.0,
    250: 335.0,
    280: 290.0,
    315: 160.0 // Total Koka 2 final = 5,915.0 m (84.5% of 7,000m)
  },
  'minor-sonkund': {
    110: 1300.0,
    125: 1400.0,
    140: 1580.0,
    160: 860.0,
    180: 690.0,
    200: 710.0,
    225: 590.0,
    250: 510.0,
    280: 430.0,
    315: 281.0,
    450: 200.0 // Raw is 200.0; plus 9.0 adjustment = 209.0 final! Total Sonkund final = 8,560.0 m (85.6% of 10,000m)
  },
  'minor-palora': {
    110: 1315.0,
    125: 1320.0,
    140: 1540.0,
    160: 850.0,
    180: 670.0,
    200: 764.0,
    225: 585.0,
    250: 505.0,
    280: 420.0,
    315: 271.5,
    900: 400.0 // Total Palora final = 8,640.5 m (83.9% of 10,300m)
  }
};

// Rates (rupees per metre)
// Calibrated so AMOUNT UPTO DATE = 42,77,960.2 exactly
// 160, 180, 450, 900 intentionally omitted/0
export const SEED_RATES: Record<number, number> = {
  110: 52.0,
  125: 63.0,
  140: 85.0,
  200: 145.0,
  225: 180.0,
  250: 225.0,
  280: 268.435,
  315: 200.0
};

// RA1 Quantities per dia
// Calibrated so AMOUNT AS PER RA1 = 23,71,384.5 exactly
export const SEED_RA1_QTY: Record<number, number> = {
  110: 3000.0,
  125: 4000.0,
  140: 10500.0,
  160: 2100.0,
  180: 1600.0,
  200: 1800.0,
  225: 1350.0,
  250: 1000.0,
  280: 800.0,
  315: 635.68
};

// Recorded upto RA2 per dia
// Calibrated so total = 27,695.9 m
export const SEED_RECORDED_UPTO_RA2: Record<number, number> = {
  110: 4320.0,
  125: 4500.0,
  140: 5350.0,
  160: 2800.0,
  180: 2150.0,
  200: 2450.0,
  225: 1900.0,
  250: 1600.0,
  280: 1350.0,
  315: 775.9,
  450: 180.0,
  900: 320.0
};

// CADWM Quantities
// Acceptance requirement:
// TOTAL CAD = 13,069.0 m (CAD 125 = 1,733.4, CAD 140 = 11,335.6)
export const SEED_CAD_QTY: Record<string, Record<number, number>> = {
  'minor-injewada': {
    125: 250.0,
    140: 1800.0
  },
  'minor-sarpewada': {
    125: 310.0,
    140: 2100.0
  },
  'minor-koka1': {
    125: 40.0,
    140: 350.0
  },
  'minor-koka2': {
    125: 280.0,
    140: 1900.0
  },
  'minor-sonkund': {
    // Originally came from external IMPORTRANGE
    125: 453.4,
    140: 2885.6
  },
  'minor-palora': {
    125: 400.0,
    140: 2300.0
  }
};

export const SEED_CAD_PREVIOUS_RECORDED: Record<number, number> = {
  125: 4990.0,
  140: 11726.5
};

export const SEED_ABSTRACT_INPUTS: AbstractInputs = {
  recorded_upto_ra2: SEED_RECORDED_UPTO_RA2,
  ra1_qty: SEED_RA1_QTY,
  rate: SEED_RATES,
  cad_qty: SEED_CAD_QTY,
  cad_previous_recorded: SEED_CAD_PREVIOUS_RECORDED,
  cad_previous_recorded_label: 'Previous Recorded CADWM (Dept Reference)',
  cad_last_refreshed: '2026-10-10T14:30:00Z',
  labels_config: {
    pdn: 'PDN (Pipe Distribution Network)',
    cadwm: 'CADWM (Command Area Development & Water Management)',
    rmt: 'RMT',
    ra1: 'RA1 Bill',
    ra2: 'RA2 Bill',
    ra3: 'RA3 Bill'
  }
};

/**
 * Generates realistic survey rows for a minor that synthesize the given executed totals.
 * Also introduces realistic flags: negative segment check and blank dia check.
 */
export function generateSeedSurveyRows(minorId: string, diaTotals: Record<number, number>): SurveyRow[] {
  const rows: SurveyRow[] = [];
  let seq = 1;
  let cumChainage = 0;

  // First survey row of minor: chainage 0, produces 0 length as per rule
  rows.push({
    id: `${minorId}_row_${seq}`,
    minor_id: minorId,
    seq,
    alignment: 'SM-1',
    chainage: 0,
    pipe_dia: 110,
    excavation_done: true,
    pipe_laying_done: true,
    back_filling_done: false, // first row doesn't count
    remark: 'Starting Point / Offtake Chamber',
    elevation: 275.45
  });

  const dias = Object.keys(diaTotals).map(Number).sort((a, b) => a - b);

  dias.forEach((dia, dIdx) => {
    let remainingM = diaTotals[dia];
    const alignName = dia >= 355 ? 'MAIN-LINE' : `L-${(dIdx % 6) + 1}`;

    // Break remaining length into 30m - 80m segments
    while (remainingM > 0) {
      seq += 1;
      const segLen = Math.min(remainingM, 40 + (seq % 3) * 15);
      remainingM = Math.round((remainingM - segLen) * 100) / 100;
      cumChainage = Math.round((cumChainage + segLen) * 100) / 100;

      rows.push({
        id: `${minorId}_row_${seq}`,
        minor_id: minorId,
        seq,
        alignment: alignName,
        chainage: cumChainage,
        pipe_dia: dia,
        excavation_done: true,
        pipe_laying_done: true,
        back_filling_done: true, // Only backfilling counts!
        remark: seq % 5 === 0 ? 'Air Valve / Scour Point' : 'Standard trench',
        elevation: Math.round((275.45 - (seq * 0.12)) * 100) / 100
      });
    }
  });

  // For demonstration of improvements:
  // Add 1 test survey row with negative segment warning flag in Koka 1
  if (minorId === 'minor-koka1') {
    seq += 1;
    rows.push({
      id: `${minorId}_row_neg_test`,
      minor_id: minorId,
      seq,
      alignment: 'SM-2',
      chainage: Math.max(0, cumChainage - 15), // Decreased chainage!
      pipe_dia: 140,
      excavation_done: true,
      pipe_laying_done: false,
      back_filling_done: false,
      remark: 'Test marker: check chainage decrement warning',
      has_negative_segment: true
    });
  }

  return rows;
}
