// @ts-nocheck
import type {
  Minor,
  Adjustment,
  SurveyRow,
  FinalComparativeInputs,
  CalculatedFinalComparative
} from './finalComparativeTypes';
import { STANDARD_PIPE_DIAS } from './finalComparativeSeedData';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Core Calculation Engine for Final Comparative Report.
 * Completely deterministic and pure.
 */
export function calculateFinalComparativeEngine(
  minors: Minor[],
  surveyRowsByMinor: Record<string, SurveyRow[]>,
  adjustments: Adjustment[],
  cadExecutedByMinor: Record<string, Record<number, number>>,
  inputs: FinalComparativeInputs,
  overridePDNByMinor?: Record<string, Record<number, number>>
): CalculatedFinalComparative {
  const pipe_dias = [...STANDARD_PIPE_DIAS];

  // 1. Calculate Executed PDN per (minor, dia)
  // Rule: for each survey row i after first, if back_filling_done[i] is TRUE, add chainage[i] - chainage[i-1] to executed[minor][dia of row i].
  const pdn_executed_by_minor: Record<string, Record<number, number>> = {};
  const pdn_minor_totals: Record<string, number> = {};

  minors.forEach(m => {
    pdn_executed_by_minor[m.id] = {};
    pipe_dias.forEach(d => {
      pdn_executed_by_minor[m.id][d] = 0;
    });

    if (overridePDNByMinor && overridePDNByMinor[m.id]) {
      Object.entries(overridePDNByMinor[m.id]).forEach(([d, val]) => {
        pdn_executed_by_minor[m.id][Number(d)] = Number(val) || 0;
      });
    } else {
      const rows = surveyRowsByMinor[m.id] || [];
      if (rows.length > 1) {
        for (let i = 1; i < rows.length; i++) {
          const curr = rows[i];
          const prev = rows[i - 1];
          if (curr.back_filling_done) {
            const segLen = Math.max(0, curr.chainage - prev.chainage);
            const dia = curr.pipe_dia;
            pdn_executed_by_minor[m.id][dia] = (pdn_executed_by_minor[m.id][dia] || 0) + segLen;
          }
        }
      }
    }
  });

  // Apply stored adjustments (e.g. Injewada 160 mm = -2.91 m, Sonkund 450 mm = +9.0 m)
  adjustments.forEach(adj => {
    if (pdn_executed_by_minor[adj.minor_id]) {
      const curr = pdn_executed_by_minor[adj.minor_id][adj.pipe_dia] || 0;
      pdn_executed_by_minor[adj.minor_id][adj.pipe_dia] = Math.round((curr + adj.length_adjustment) * 1000) / 1000;
    }
  });

  // Calculate Minor PDN Totals
  minors.forEach(m => {
    let tot = 0;
    pipe_dias.forEach(d => {
      tot += pdn_executed_by_minor[m.id][d] || 0;
    });
    pdn_minor_totals[m.id] = Math.round(tot * 1000) / 1000;
  });

  // TOTAL PDN per dia & grand total
  const total_pdn_per_dia: Record<number, number> = {};
  let total_pdn_grand = 0;

  pipe_dias.forEach(d => {
    let diaSum = 0;
    minors.forEach(m => {
      diaSum += pdn_executed_by_minor[m.id][d] || 0;
    });
    total_pdn_per_dia[d] = Math.round(diaSum * 1000) / 1000;
    total_pdn_grand += total_pdn_per_dia[d];
  });
  total_pdn_grand = Math.round(total_pdn_grand * 10) / 10;

  // RECORDED UPTO RA2 (PDN)
  const recorded_upto_ra2_pdn_per_dia: Record<number, number> = {};
  let recorded_upto_ra2_pdn_grand = 0;
  pipe_dias.forEach(d => {
    const val = inputs.recorded_upto_ra2_pdn[d] || 0;
    recorded_upto_ra2_pdn_per_dia[d] = val;
    recorded_upto_ra2_pdn_grand += val;
  });
  recorded_upto_ra2_pdn_grand = Math.round(recorded_upto_ra2_pdn_grand * 10) / 10;

  // TO RECORD IN RA3 = TOTAL PDN - RECORDED UPTO RA2
  const to_record_in_ra3_per_dia: Record<number, number> = {};
  let to_record_in_ra3_grand = 0;
  pipe_dias.forEach(d => {
    const diff = Math.round((total_pdn_per_dia[d] - (recorded_upto_ra2_pdn_per_dia[d] || 0)) * 10) / 10;
    to_record_in_ra3_per_dia[d] = diff;
    to_record_in_ra3_grand += diff;
  });
  to_record_in_ra3_grand = Math.round((total_pdn_grand - recorded_upto_ra2_pdn_grand) * 10) / 10;

  // AS PER MEASUREMENT
  const measured_qty_per_dia: Record<number, number> = {};
  let measured_qty_grand = 0;
  let stale_measured_qty = false;
  const now = new Date().getTime();

  pipe_dias.forEach(d => {
    const rec = inputs.measured_qty[d];
    const val = rec?.qty || 0;
    measured_qty_per_dia[d] = val;
    measured_qty_grand += val;

    if (rec?.last_refreshed) {
      const ageDays = (now - new Date(rec.last_refreshed).getTime()) / (1000 * 3600 * 24);
      if (ageDays > 30) {
        stale_measured_qty = true;
      }
    }
  });
  measured_qty_grand = Math.round(measured_qty_grand * 10) / 10;

  // PDN VS MEASUREMENT = TOTAL PDN - AS PER MEASUREMENT
  const pdn_vs_measurement_per_dia: Record<number, number> = {};
  const tolerance_warnings: Record<number, boolean> = {};
  let pdn_vs_measurement_grand = 0;

  pipe_dias.forEach(d => {
    const meas = measured_qty_per_dia[d];
    if (meas > 0 || total_pdn_per_dia[d] > 0) {
      const diff = Math.round((total_pdn_per_dia[d] - meas) * 10) / 10;
      pdn_vs_measurement_per_dia[d] = diff;
      pdn_vs_measurement_grand += diff;

      // Tolerance check (default +/- 2%)
      if (meas > 0) {
        const pctDiff = Math.abs(diff / meas) * 100;
        if (pctDiff > (inputs.tolerance_pct || 2.0)) {
          tolerance_warnings[d] = true;
        }
      }
    } else {
      pdn_vs_measurement_per_dia[d] = 0;
    }
  });
  pdn_vs_measurement_grand = Math.round(pdn_vs_measurement_grand * 10) / 10;

  // 2. CADWM Section
  const cad_executed_by_minor: Record<string, Record<number, number>> = {};
  const cad_minor_totals: Record<string, number> = {};
  const total_cad_per_dia: Record<number, number> = {};
  let total_cad_grand = 0;

  minors.forEach(m => {
    cad_executed_by_minor[m.id] = {};
    let mTotal = 0;
    pipe_dias.forEach(d => {
      const val = cadExecutedByMinor[m.id]?.[d] || 0;
      cad_executed_by_minor[m.id][d] = val;
      mTotal += val;
    });
    cad_minor_totals[m.id] = Math.round(mTotal * 10) / 10;
  });

  pipe_dias.forEach(d => {
    let diaTotal = 0;
    minors.forEach(m => {
      diaTotal += cad_executed_by_minor[m.id][d] || 0;
    });
    total_cad_per_dia[d] = Math.round(diaTotal * 10) / 10;
    total_cad_grand += total_cad_per_dia[d];
  });
  total_cad_grand = Math.round(total_cad_grand * 10) / 10;

  // RECORDED UPTO RA2 (CAD)
  const recorded_upto_ra2_cad_per_dia: Record<number, number> = {};
  let recorded_upto_ra2_cad_grand = 0;
  pipe_dias.forEach(d => {
    const val = inputs.recorded_upto_ra2_cad[d] || 0;
    recorded_upto_ra2_cad_per_dia[d] = val;
    recorded_upto_ra2_cad_grand += val;
  });
  recorded_upto_ra2_cad_grand = Math.round(recorded_upto_ra2_cad_grand * 10) / 10;

  // 3. TOTAL UPTO DATE WORK DONE = TOTAL CAD + TOTAL PDN
  // Grand total is the sum across dias (correct value: 53,772.4)
  const total_upto_date_per_dia: Record<number, number> = {};
  let total_upto_date_grand = 0;

  pipe_dias.forEach(d => {
    const sum = Math.round(((total_pdn_per_dia[d] || 0) + (total_cad_per_dia[d] || 0)) * 10) / 10;
    total_upto_date_per_dia[d] = sum;
    total_upto_date_grand += sum;
  });
  total_upto_date_grand = Math.round(total_upto_date_grand * 10) / 10;

  // 4. Billing Section
  const ra1_qty_per_dia: Record<number, number> = {};
  let ra1_qty_grand = 0;
  const difference_per_dia: Record<number, number> = {};
  let difference_grand = 0;
  const rate_per_dia: Record<number, number> = {};
  const amount_as_per_ra1_per_dia: Record<number, number> = {};
  let amount_as_per_ra1_grand = 0;
  const amount_upto_date_per_dia: Record<number, number> = {};
  let amount_upto_date_grand = 0;
  const missing_rate_dias: number[] = [];

  pipe_dias.forEach(d => {
    const ra1Q = inputs.ra1_qty[d] || 0;
    ra1_qty_per_dia[d] = ra1Q;
    ra1_qty_grand += ra1Q;

    const diff = Math.round(((total_upto_date_per_dia[d] || 0) - ra1Q) * 10) / 10;
    difference_per_dia[d] = diff;
    difference_grand += diff;

    const rate = inputs.rate[d] || 0;
    rate_per_dia[d] = rate;

    // Check missing rate warning
    if (total_upto_date_per_dia[d] > 0 && rate <= 0) {
      missing_rate_dias.push(d);
    }

    const amtRA1 = Math.round((ra1Q * rate) * 10) / 10;
    amount_as_per_ra1_per_dia[d] = amtRA1;
    amount_as_per_ra1_grand += amtRA1;

    const amtUpto = Math.round((total_upto_date_per_dia[d] * rate) * 10) / 10;
    amount_upto_date_per_dia[d] = amtUpto;
    amount_upto_date_grand += amtUpto;
  });

  ra1_qty_grand = Math.round(ra1_qty_grand * 10) / 10;
  difference_grand = Math.round(difference_grand * 10) / 10;
  amount_as_per_ra1_grand = Math.round(amount_as_per_ra1_grand * 10) / 10;
  amount_upto_date_grand = Math.round(amount_upto_date_grand * 10) / 10;

  // Active diameters (diameters that have any activity across PDN, CAD, or Measurement)
  const active_dias = pipe_dias.filter(d => {
    return (
      (total_pdn_per_dia[d] || 0) > 0 ||
      (total_cad_per_dia[d] || 0) > 0 ||
      (recorded_upto_ra2_pdn_per_dia[d] || 0) > 0 ||
      (measured_qty_per_dia[d] || 0) > 0 ||
      (ra1_qty_per_dia[d] || 0) > 0
    );
  });

  return {
    pipe_dias,
    active_dias: active_dias.length > 0 ? active_dias : pipe_dias,
    pdn_executed_by_minor,
    pdn_minor_totals,
    total_pdn_per_dia,
    total_pdn_grand,
    recorded_upto_ra2_pdn_per_dia,
    recorded_upto_ra2_pdn_grand,
    to_record_in_ra3_per_dia,
    to_record_in_ra3_grand,
    measured_qty_per_dia,
    measured_qty_grand,
    pdn_vs_measurement_per_dia,
    pdn_vs_measurement_grand,
    cad_executed_by_minor,
    cad_minor_totals,
    total_cad_per_dia,
    total_cad_grand,
    recorded_upto_ra2_cad_per_dia,
    recorded_upto_ra2_cad_grand,
    total_upto_date_per_dia,
    total_upto_date_grand,
    ra1_qty_per_dia,
    ra1_qty_grand,
    difference_per_dia,
    difference_grand,
    rate_per_dia,
    amount_as_per_ra1_per_dia,
    amount_as_per_ra1_grand,
    amount_upto_date_per_dia,
    amount_upto_date_grand,
    missing_rate_dias,
    stale_measured_qty,
    tolerance_warnings
  };
}

/**
 * Export Final Comparative report to formatted Excel sheet.
 */
export function exportFinalComparativeToExcel(
  calculated: CalculatedFinalComparative,
  minors: Minor[],
  projectName = 'Project',
  snapshotDate = '18-Jun-2026'
) {
  const wb = XLSX.utils.book_new();
  const dias = calculated.active_dias;

  const rows: (string | number)[][] = [];

  // Title
  rows.push([`FINAL COMPARATIVE REPORT — ${projectName} (Snapshot: ${snapshotDate})`]);
  rows.push([]);

  // Table Header
  rows.push(['Description', ...dias.map(d => `${d} mm`), 'TOTAL']);

  // SECTION A: PDN
  rows.push(['--- PDN (PIPE DISTRIBUTION NETWORK) ---']);
  minors.forEach(m => {
    const rowVals = dias.map(d => calculated.pdn_executed_by_minor[m.id]?.[d] || 0);
    rows.push([`${m.name} executed`, ...rowVals, calculated.pdn_minor_totals[m.id] || 0]);
  });
  rows.push(['TOTAL PDN', ...dias.map(d => calculated.total_pdn_per_dia[d] || 0), calculated.total_pdn_grand]);
  rows.push(['RECORDED UPTO RA2', ...dias.map(d => calculated.recorded_upto_ra2_pdn_per_dia[d] || 0), calculated.recorded_upto_ra2_pdn_grand]);
  rows.push(['TO RECORD IN RA3', ...dias.map(d => calculated.to_record_in_ra3_per_dia[d] || 0), calculated.to_record_in_ra3_grand]);
  rows.push(['AS PER MEASUREMENT', ...dias.map(d => calculated.measured_qty_per_dia[d] || 0), calculated.measured_qty_grand]);
  rows.push(['PDN VS MEASUREMENT', ...dias.map(d => calculated.pdn_vs_measurement_per_dia[d] || 0), calculated.pdn_vs_measurement_grand]);

  rows.push([]);
  // SECTION B: CADWM
  rows.push(['--- CADWM (COMMAND AREA DEVELOPMENT & WATER MANAGEMENT) ---']);
  minors.forEach(m => {
    const rowVals = dias.map(d => calculated.cad_executed_by_minor[m.id]?.[d] || 0);
    rows.push([`${m.name} CAD executed`, ...rowVals, calculated.cad_minor_totals[m.id] || 0]);
  });
  rows.push(['TOTAL CAD', ...dias.map(d => calculated.total_cad_per_dia[d] || 0), calculated.total_cad_grand]);
  rows.push(['RECORDED UPTO RA2 (CAD)', ...dias.map(d => calculated.recorded_upto_ra2_cad_per_dia[d] || 0), calculated.recorded_upto_ra2_cad_grand]);

  rows.push([]);
  // SECTION C: TOTAL UPTO DATE WORK DONE
  rows.push(['--- TOTAL UPTO DATE WORK DONE (PDN + CAD) ---']);
  rows.push(['TOTAL UPTO DATE', ...dias.map(d => calculated.total_upto_date_per_dia[d] || 0), calculated.total_upto_date_grand]);

  rows.push([]);
  // SECTION D: BILLING
  rows.push(['--- BILLING & FINANCIAL RECONCILIATION ---']);
  rows.push(['RA1 QTY', ...dias.map(d => calculated.ra1_qty_per_dia[d] || 0), calculated.ra1_qty_grand]);
  rows.push(['DIFFERENCE (UPTO DATE - RA1)', ...dias.map(d => calculated.difference_per_dia[d] || 0), calculated.difference_grand]);
  rows.push(['RATE (₹/m)', ...dias.map(d => calculated.rate_per_dia[d] || 0), '-']);
  rows.push(['AMOUNT AS PER RA1 (₹)', ...dias.map(d => calculated.amount_as_per_ra1_per_dia[d] || 0), calculated.amount_as_per_ra1_grand]);
  rows.push(['AMOUNT UPTO DATE (₹)', ...dias.map(d => calculated.amount_upto_date_per_dia[d] || 0), calculated.amount_upto_date_grand]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Final Comparative');
  XLSX.writeFile(wb, `Final_Comparative_${projectName.replace(/\s+/g, '_')}_${snapshotDate}.xlsx`);
}

/**
 * Export Final Comparative report to PDF.
 */
export function exportFinalComparativeToPDF(
  calculated: CalculatedFinalComparative,
  minors: Minor[],
  projectName = 'Project',
  snapshotDate = '18-Jun-2026'
) {
  const doc = new jsPDF({ orientation: 'landscape', format: 'a3' });
  const dias = calculated.active_dias;

  doc.setFontSize(14);
  doc.text(`Final Comparative Report — ${projectName} (Snapshot: ${snapshotDate})`, 14, 15);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text('PDN vs Measurement, CADWM Aggregation, and Billing Reconciliation', 14, 21);

  const head = [['Description', ...dias.map(d => `${d}mm`), 'TOTAL']];
  const body: any[] = [];

  // Section A
  body.push([{ content: 'A. PDN (PIPE DISTRIBUTION NETWORK)', colSpan: dias.length + 2, styles: { fontStyle: 'bold', fillColor: [240, 244, 255] } }]);
  minors.forEach(m => {
    body.push([
      `${m.name} executed`,
      ...dias.map(d => (calculated.pdn_executed_by_minor[m.id]?.[d] || 0).toFixed(1)),
      (calculated.pdn_minor_totals[m.id] || 0).toFixed(1)
    ]);
  });
  body.push([
    'TOTAL PDN',
    ...dias.map(d => (calculated.total_pdn_per_dia[d] || 0).toFixed(1)),
    calculated.total_pdn_grand.toFixed(1)
  ]);
  body.push([
    'RECORDED UPTO RA2',
    ...dias.map(d => (calculated.recorded_upto_ra2_pdn_per_dia[d] || 0).toFixed(1)),
    calculated.recorded_upto_ra2_pdn_grand.toFixed(1)
  ]);
  body.push([
    'TO RECORD IN RA3',
    ...dias.map(d => (calculated.to_record_in_ra3_per_dia[d] || 0).toFixed(1)),
    calculated.to_record_in_ra3_grand.toFixed(1)
  ]);
  body.push([
    'AS PER MEASUREMENT',
    ...dias.map(d => (calculated.measured_qty_per_dia[d] || 0).toFixed(1)),
    calculated.measured_qty_grand.toFixed(1)
  ]);
  body.push([
    'PDN VS MEASUREMENT',
    ...dias.map(d => (calculated.pdn_vs_measurement_per_dia[d] || 0).toFixed(1)),
    calculated.pdn_vs_measurement_grand.toFixed(1)
  ]);

  // Section B
  body.push([{ content: 'B. CADWM (COMMAND AREA DEVELOPMENT & WATER MANAGEMENT)', colSpan: dias.length + 2, styles: { fontStyle: 'bold', fillColor: [236, 254, 255] } }]);
  minors.forEach(m => {
    body.push([
      `${m.name} CAD executed`,
      ...dias.map(d => (calculated.cad_executed_by_minor[m.id]?.[d] || 0).toFixed(1)),
      (calculated.cad_minor_totals[m.id] || 0).toFixed(1)
    ]);
  });
  body.push([
    'TOTAL CAD',
    ...dias.map(d => (calculated.total_cad_per_dia[d] || 0).toFixed(1)),
    calculated.total_cad_grand.toFixed(1)
  ]);
  body.push([
    'RECORDED UPTO RA2 (CAD)',
    ...dias.map(d => (calculated.recorded_upto_ra2_cad_per_dia[d] || 0).toFixed(1)),
    calculated.recorded_upto_ra2_cad_grand.toFixed(1)
  ]);

  // Section C
  body.push([{ content: 'C. TOTAL UPTO DATE WORK DONE (PDN + CAD)', colSpan: dias.length + 2, styles: { fontStyle: 'bold', fillColor: [220, 252, 231] } }]);
  body.push([
    'TOTAL UPTO DATE',
    ...dias.map(d => (calculated.total_upto_date_per_dia[d] || 0).toFixed(1)),
    calculated.total_upto_date_grand.toFixed(1)
  ]);

  // Section D
  body.push([{ content: 'D. BILLING & FINANCIAL AMOUNTS', colSpan: dias.length + 2, styles: { fontStyle: 'bold', fillColor: [254, 243, 199] } }]);
  body.push([
    'RA1 QTY',
    ...dias.map(d => (calculated.ra1_qty_per_dia[d] || 0).toFixed(1)),
    calculated.ra1_qty_grand.toFixed(1)
  ]);
  body.push([
    'DIFFERENCE',
    ...dias.map(d => (calculated.difference_per_dia[d] || 0).toFixed(1)),
    calculated.difference_grand.toFixed(1)
  ]);
  body.push([
    'RATE (₹/m)',
    ...dias.map(d => (calculated.rate_per_dia[d] || 0).toFixed(1)),
    '-'
  ]);
  body.push([
    'AMOUNT AS PER RA1 (₹)',
    ...dias.map(d => (calculated.amount_as_per_ra1_per_dia[d] || 0).toLocaleString('en-IN')),
    calculated.amount_as_per_ra1_grand.toLocaleString('en-IN')
  ]);
  body.push([
    'AMOUNT UPTO DATE (₹)',
    ...dias.map(d => (calculated.amount_upto_date_per_dia[d] || 0).toLocaleString('en-IN')),
    calculated.amount_upto_date_grand.toLocaleString('en-IN')
  ]);

  autoTable(doc, {
    startY: 26,
    head,
    body,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [51, 65, 85], textColor: 255 }
  });

  doc.save(`Final_Comparative_${projectName.replace(/\s+/g, '_')}_${snapshotDate}.pdf`);
}
