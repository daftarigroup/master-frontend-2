// @ts-nocheck
import {
  Minor,
  Adjustment,
  SurveyRow,
  CADExecutedRecord,
  WorkType
} from './raPlanningTypes';

export const STANDARD_PIPE_DIAS: number[] = [
  110, 125, 140, 160, 180, 200, 225, 250, 280, 315, 355, 400, 450, 500, 560, 630, 710, 800, 900
];

export const SEED_MINORS: Minor[] = [
  { id: 'minor-injewada', name: 'Injewada', order: 1 },
  { id: 'minor-sarpewada', name: 'Sarpewada', order: 2 },
  { id: 'minor-koka1', name: 'Koka 1', order: 3 },
  { id: 'minor-koka2', name: 'Koka 2', order: 4 },
  { id: 'minor-sonkund', name: 'Sonkund', order: 5 },
  { id: 'minor-palora', name: 'Palora', order: 6 }
];

export const SEED_ADJUSTMENTS: Adjustment[] = [
  {
    id: 'adj-injewada-160',
    minor_id: 'minor-injewada',
    pipe_dia: 160,
    length_adjustment: -2.91,
    reason: 'Site measurement joint correction (-2.91 m)'
  },
  {
    id: 'adj-sonkund-450',
    minor_id: 'minor-sonkund',
    pipe_dia: 450,
    length_adjustment: 9.0,
    reason: 'Chainage recalibration crossing culvert (+9.0 m)'
  }
];

// Raw executed PDN before adjustment (so after adjustment, targets match exactly)
export const SEED_PDN_EXECUTED_RAW_BY_MINOR: Record<string, Record<number, number>> = {
  'minor-injewada': {
    110: 620.0,
    125: 750.0,
    140: 362.5,
    160: 388.81, // After -2.91 adj => 385.9 m. Total Injewada = 4,804.252 m
    180: 573.0,
    200: 480.0,
    225: 390.0,
    250: 340.0,
    280: 410.0,
    315: 292.852,
    355: 200.0
  },
  'minor-sarpewada': {
    110: 210.0,
    125: 520.0,
    140: 680.0,
    160: 180.0,
    180: 120.0,
    200: 110.0,
    225: 98.225 // Total Sarpewada = 1,918.225 m
  },
  'minor-koka1': {
    110: 150.0,
    125: 310.0,
    140: 260.0,
    160: 180.0,
    180: 120.0,
    200: 140.0,
    225: 96.457 // Total Koka 1 = 1,256.457 m
  },
  'minor-koka2': {
    110: 320.0,
    125: 820.0,
    140: 750.0,
    160: 280.0,
    180: 250.0,
    200: 270.0,
    225: 289.383 // Total Koka 2 = 2,979.383 m
  },
  'minor-sonkund': {
    110: 820.0,
    125: 1100.0,
    140: 1200.0,
    160: 650.0,
    180: 520.0,
    200: 680.0,
    225: 510.0,
    250: 420.0,
    280: 380.0,
    315: 225.677,
    450: 200.0 // After +9.0 adj => 209.0 m. Total Sonkund = 6,714.677 m
  },
  'minor-palora': {
    110: 1520.0,
    125: 2291.8,
    140: 1788.5,
    160: 1680.0,
    180: 1450.0,
    200: 1720.0,
    225: 1350.0,
    250: 1280.0,
    280: 1150.0,
    315: 980.0,
    355: 680.0,
    400: 520.0,
    500: 540.0,
    900: 385.245 // Total Palora = 17,335.545 m
  }
};

// Planned quantities for bill 'RA2'
export const SEED_PLANNED_BY_BILL: Record<string, Record<WorkType, Record<string, Record<number, number>>>> = {
  RA2: {
    PDN: {
      'minor-injewada': {
        140: 738.0,
        160: 200.0,
        200: 760.0,
        280: 880.0,
        355: 220.0,
        450: 80.0,
        500: 480.0,
        560: 880.0
        // Total Injewada planned = 4,238.0 m
      },
      'minor-sarpewada': {
        110: 200.0,
        125: 500.0,
        140: 650.0,
        160: 200.0,
        180: 150.0,
        200: 150.0,
        225: 150.0
      },
      'minor-koka1': {
        110: 150.0,
        125: 300.0,
        140: 250.0,
        160: 200.0,
        180: 150.0,
        200: 150.0,
        225: 100.0
      },
      'minor-koka2': {
        110: 300.0,
        125: 800.0,
        140: 700.0,
        160: 300.0,
        180: 250.0,
        200: 250.0,
        225: 300.0
      },
      'minor-sonkund': {
        110: 800.0,
        125: 1000.0,
        140: 1100.0,
        160: 600.0,
        180: 500.0,
        200: 650.0,
        225: 500.0,
        250: 400.0,
        280: 350.0,
        315: 200.0,
        450: 200.0
      },
      'minor-palora': {
        110: 1200.0,
        125: 1800.0,
        140: 1500.0,
        160: 1250.0,
        180: 1100.0,
        200: 1200.0,
        225: 950.0,
        250: 900.0,
        280: 850.0,
        315: 700.0,
        355: 500.0,
        400: 350.0,
        500: 389.51
        // Total Palora planned = 12,689.51 m
      }
    },
    CAD: {
      'minor-injewada': {
        140: 4371.1
      },
      'minor-sarpewada': {
        140: 1750.5
      },
      'minor-koka1': {
        125: 1719.0
      },
      'minor-koka2': {
        140: 504.7
      },
      'minor-sonkund': {
        125: 2990.0,
        140: 4961.0
      },
      'minor-palora': {
        125: 0.0 // Notice Palora CAD has 0 planned but 2,404.1 executed!
      }
    }
  }
};

// CAD Executed seed dataset
export const SEED_CAD_EXECUTED: Record<string, Record<number, CADExecutedRecord>> = {
  'minor-injewada': {
    140: { qty: 3739.3, source_note: 'CADWM field measurement book #4', last_refreshed: '2026-10-12T00:00:00Z' }
  },
  'minor-sarpewada': {
    140: { qty: 2469.0, source_note: 'CADWM sub-station sheet 2', last_refreshed: '2026-10-12T00:00:00Z' }
  },
  'minor-koka1': {
    125: { qty: 1842.9, source_note: 'Koka 1 CAD field survey', last_refreshed: '2026-10-12T00:00:00Z' }
  },
  'minor-koka2': {
    140: { qty: 1785.8, source_note: 'Koka 2 CAD MB entry', last_refreshed: '2026-10-12T00:00:00Z' }
  },
  'minor-sonkund': {
    125: { qty: 813.5, source_note: 'Sonkund intake CAD sheet', last_refreshed: '2026-10-12T00:00:00Z' },
    140: { qty: 5709.3, source_note: 'Sonkund main distribution CAD', last_refreshed: '2026-10-12T00:00:00Z' }
  },
  'minor-palora': {
    125: { qty: 2404.1, source_note: 'Palora CAD canal integration', last_refreshed: '2026-10-12T00:00:00Z' }
  }
};

/**
 * Generates synthetic survey rows for each minor so that
 * back_filling_done rules calculate exactly the raw executed quantities.
 */
export function generateSeedSurveyRowsForMinor(
  minorId: string,
  executedPerDia: Record<number, number>
): SurveyRow[] {
  const rows: SurveyRow[] = [];
  let seq = 1;
  let cumChainage = 0;

  // Row 0 is at chainage 0 (segment length rule: first row length is 0)
  rows.push({
    minor_id: minorId,
    seq: seq++,
    alignment: 'M-1',
    chainage: 0,
    pipe_dia: 110,
    back_filling_done: false,
    remarks: 'Alignment Origin (Start Point)'
  });

  Object.entries(executedPerDia).forEach(([diaStr, targetLen]) => {
    const dia = Number(diaStr);
    if (!targetLen || targetLen <= 0) return;

    // Create segments of up to 200m
    const numSegments = Math.max(1, Math.ceil(targetLen / 200));
    const segmentLength = targetLen / numSegments;

    for (let s = 1; s <= numSegments; s++) {
      cumChainage = Math.round((cumChainage + segmentLength) * 1000) / 1000;
      rows.push({
        minor_id: minorId,
        seq: seq++,
        alignment: `SM-${s}`,
        chainage: cumChainage,
        pipe_dia: dia,
        back_filling_done: true,
        remarks: `Segment ${s}/${numSegments} executed & backfilled`
      });
    }
  });

  return rows;
}
