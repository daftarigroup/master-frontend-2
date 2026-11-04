// @ts-nocheck
import {
  Minor,
  Adjustment,
  SurveyRow,
  CADExecutedRecord,
  WorkType,
  RAPlanningInputs,
  MinorBlockPlanning,
  CalculatedRAPlanning
} from './raPlanningTypes';
import { STANDARD_PIPE_DIAS } from './raPlanningSeedData';
import * as XLSX from 'xlsx';

/**
 * Calculates executed PDN lengths per diameter for a minor:
 * - for each survey row i after the first (i > 0):
 *   if back_filling_done[i] is true, add (chainage[i] - chainage[i-1])
 *   to executed[minor][pipe_dia of row i].
 * - applies any stored adjustments for that minor and pipe_dia.
 */
export function calculateExecutedPDNForMinor(
  minorId: string,
  surveyRows: SurveyRow[],
  adjustments: Adjustment[],
  overrideValues?: Record<number, number>
): Record<number, number> {
  const result: Record<number, number> = {};
  STANDARD_PIPE_DIAS.forEach(d => {
    result[d] = 0;
  });

  if (overrideValues && Object.keys(overrideValues).length > 0) {
    // If explicit calibrated/override executed is passed, apply it and adjustments
    Object.entries(overrideValues).forEach(([diaStr, val]) => {
      const dia = Number(diaStr);
      result[dia] = Math.round(Number(val) * 1000) / 1000;
    });
  } else if (surveyRows && surveyRows.length > 1) {
    // Sort rows by seq / chainage
    const sorted = [...surveyRows].sort((a, b) => a.seq - b.seq);
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (curr.back_filling_done) {
        const segLen = Math.max(0, curr.chainage - prev.chainage);
        const dia = curr.pipe_dia;
        result[dia] = (result[dia] || 0) + segLen;
      }
    }
  }

  // Apply manual adjustments
  const minorAdjs = adjustments.filter(a => a.minor_id === minorId);
  minorAdjs.forEach(adj => {
    if (result[adj.pipe_dia] !== undefined) {
      result[adj.pipe_dia] = Math.round((result[adj.pipe_dia] + adj.length_adjustment) * 1000) / 1000;
    }
  });

  // Round to 3 decimal places
  STANDARD_PIPE_DIAS.forEach(d => {
    result[d] = Math.round((result[d] || 0) * 1000) / 1000;
  });

  return result;
}

/**
 * Main calculation engine for Planned vs Executed (RA Planning).
 */
export function calculateRAPlanningEngine(
  minors: Minor[],
  surveyRowsByMinor: Record<string, SurveyRow[]>,
  adjustments: Adjustment[],
  plannedByBill: Record<string, Record<WorkType, Record<string, Record<number, number>>>>,
  cadExecuted: Record<string, Record<number, CADExecutedRecord>>,
  inputs: RAPlanningInputs,
  overridePDNByMinor?: Record<string, Record<number, number>>
): CalculatedRAPlanning {
  const billNo = inputs.bill_no || 'RA2';
  const tolerancePct = inputs.tolerance_percent !== undefined ? inputs.tolerance_percent : 10;
  const billPlanned = plannedByBill[billNo] || { PDN: {}, CAD: {} };
  const pdnPlanned = billPlanned.PDN || {};
  const cadPlanned = billPlanned.CAD || {};

  const pdn_blocks: Record<string, MinorBlockPlanning> = {};
  const cad_blocks: Record<string, MinorBlockPlanning> = {};

  const total_upto_date_executed_per_dia: Record<number, number> = {};
  STANDARD_PIPE_DIAS.forEach(d => {
    total_upto_date_executed_per_dia[d] = 0;
  });

  let total_pdn_executed_grand = 0;
  let total_cad_executed_grand = 0;

  // Active diameter tracker: dias where at least one executed or planned > 0
  const activeDiasSet = new Set<number>();

  // Process each minor
  minors.forEach(m => {
    // -------------------------------------------------------------
    // SECTION A: PDN Block
    // -------------------------------------------------------------
    const pdnExecuted = calculateExecutedPDNForMinor(
      m.id,
      surveyRowsByMinor[m.id] || [],
      adjustments,
      overridePDNByMinor ? overridePDNByMinor[m.id] : undefined
    );
    const mPdnPlanned = pdnPlanned[m.id] || {};

    const pdnPlannedPerDia: Record<number, number> = {};
    const pdnBalancePerDia: Record<number, number> = {};
    const pdnTolWarnPerDia: Record<number, boolean> = {};
    const pdnZeroPlanWarnPerDia: Record<number, boolean> = {};

    let mPdnTotalExec = 0;
    let mPdnTotalPlan = 0;

    STANDARD_PIPE_DIAS.forEach(dia => {
      const execVal = pdnExecuted[dia] || 0;
      const planVal = mPdnPlanned[dia] || 0;
      const balVal = Math.round((planVal - execVal) * 1000) / 1000;

      pdnPlannedPerDia[dia] = planVal;
      pdnBalancePerDia[dia] = balVal;

      if (execVal > 0 || planVal > 0) {
        activeDiasSet.add(dia);
      }

      // Warnings
      const tolThreshold = planVal * (1 + tolerancePct / 100);
      pdnTolWarnPerDia[dia] = planVal > 0 && execVal > tolThreshold;
      pdnZeroPlanWarnPerDia[dia] = execVal > 0 && planVal === 0;

      mPdnTotalExec += execVal;
      mPdnTotalPlan += planVal;

      total_upto_date_executed_per_dia[dia] += execVal;
    });

    mPdnTotalExec = Math.round(mPdnTotalExec * 1000) / 1000;
    mPdnTotalPlan = Math.round(mPdnTotalPlan * 1000) / 1000;
    const mPdnTotalBal = Math.round((mPdnTotalPlan - mPdnTotalExec) * 1000) / 1000;
    const mPdnRatio = mPdnTotalPlan > 0
      ? Math.round((mPdnTotalExec / mPdnTotalPlan) * 1000) / 10
      : null;

    total_pdn_executed_grand += mPdnTotalExec;

    pdn_blocks[m.id] = {
      minor: m,
      work_type: 'PDN',
      executed_per_dia: pdnExecuted,
      planned_per_dia: pdnPlannedPerDia,
      balance_per_dia: pdnBalancePerDia,
      tolerance_warn_per_dia: pdnTolWarnPerDia,
      zero_plan_warn_per_dia: pdnZeroPlanWarnPerDia,
      total_executed: mPdnTotalExec,
      total_planned: mPdnTotalPlan,
      total_balance_qty: mPdnTotalBal,
      completion_ratio: mPdnRatio
    };

    // -------------------------------------------------------------
    // SECTION B: CADWM Block
    // -------------------------------------------------------------
    const mCadRecords = cadExecuted[m.id] || {};
    const mCadPlanned = cadPlanned[m.id] || {};

    const cadExecutedPerDia: Record<number, number> = {};
    const cadPlannedPerDia: Record<number, number> = {};
    const cadBalancePerDia: Record<number, number> = {};
    const cadTolWarnPerDia: Record<number, boolean> = {};
    const cadZeroPlanWarnPerDia: Record<number, boolean> = {};

    let mCadTotalExec = 0;
    let mCadTotalPlan = 0;

    STANDARD_PIPE_DIAS.forEach(dia => {
      const rec = mCadRecords[dia];
      const execVal = rec ? rec.qty : 0;
      const planVal = mCadPlanned[dia] || 0;
      const balVal = Math.round((planVal - execVal) * 1000) / 1000;

      cadExecutedPerDia[dia] = execVal;
      cadPlannedPerDia[dia] = planVal;
      cadBalancePerDia[dia] = balVal;

      if (execVal > 0 || planVal > 0) {
        activeDiasSet.add(dia);
      }

      // Warnings
      const tolThreshold = planVal * (1 + tolerancePct / 100);
      cadTolWarnPerDia[dia] = planVal > 0 && execVal > tolThreshold;
      cadZeroPlanWarnPerDia[dia] = execVal > 0 && planVal === 0;

      mCadTotalExec += execVal;
      mCadTotalPlan += planVal;

      total_upto_date_executed_per_dia[dia] += execVal;
    });

    mCadTotalExec = Math.round(mCadTotalExec * 1000) / 1000;
    mCadTotalPlan = Math.round(mCadTotalPlan * 1000) / 1000;
    const mCadTotalBal = Math.round((mCadTotalPlan - mCadTotalExec) * 1000) / 1000;
    const mCadRatio = mCadTotalPlan > 0
      ? Math.round((mCadTotalExec / mCadTotalPlan) * 1000) / 10
      : null;

    total_cad_executed_grand += mCadTotalExec;

    cad_blocks[m.id] = {
      minor: m,
      work_type: 'CAD',
      executed_per_dia: cadExecutedPerDia,
      planned_per_dia: cadPlannedPerDia,
      balance_per_dia: cadBalancePerDia,
      tolerance_warn_per_dia: cadTolWarnPerDia,
      zero_plan_warn_per_dia: cadZeroPlanWarnPerDia,
      total_executed: mCadTotalExec,
      total_planned: mCadTotalPlan,
      total_balance_qty: mCadTotalBal,
      completion_ratio: mCadRatio
    };
  });

  // Section C Grand Total = sum over dias of total_upto_date
  let total_upto_date_grand = 0;
  STANDARD_PIPE_DIAS.forEach(d => {
    total_upto_date_executed_per_dia[d] = Math.round(total_upto_date_executed_per_dia[d] * 1000) / 1000;
    total_upto_date_grand += total_upto_date_executed_per_dia[d];
  });
  total_upto_date_grand = Math.round(total_upto_date_grand * 1000) / 1000;
  total_pdn_executed_grand = Math.round(total_pdn_executed_grand * 1000) / 1000;
  total_cad_executed_grand = Math.round(total_cad_executed_grand * 1000) / 1000;

  const active_dias = STANDARD_PIPE_DIAS.filter(d => activeDiasSet.has(d));

  return {
    bill_no: billNo,
    pipe_dias: STANDARD_PIPE_DIAS,
    active_dias: active_dias.length > 0 ? active_dias : [110, 125, 140, 160, 180, 200, 225, 250, 280, 315, 355, 400, 450, 500, 560, 900],
    minors,
    pdn_blocks,
    cad_blocks,
    total_upto_date_executed_per_dia,
    total_upto_date_grand,
    total_pdn_executed_grand,
    total_cad_executed_grand
  };
}

/**
 * Export Planned vs Executed Table to Excel (.xlsx)
 */
export function exportRAPlanningToExcel(
  calc: CalculatedRAPlanning,
  projectName = 'Irrigation Minors Project'
): void {
  const wb = XLSX.utils.book_new();
  const rows: any[][] = [];

  const dias = calc.pipe_dias;
  const header = ['Description', ...dias.map(d => `${d} mm`), 'TOTAL (m)', '% Achieved'];
  rows.push([`${projectName} - PLANNED VS EXECUTED COMPARISON (${calc.bill_no})`]);
  rows.push([`Generated on: ${new Date().toLocaleString()}`]);
  rows.push([]);
  rows.push(header);

  // Section A: PDN
  rows.push([`A. PDN (PIPE DISTRIBUTION NETWORK) - ${calc.bill_no}`]);
  calc.minors.forEach(m => {
    const block = calc.pdn_blocks[m.id];
    if (!block) return;
    // Row 1: Executed
    rows.push([
      `${m.name} executed`,
      ...dias.map(d => block.executed_per_dia[d] || 0),
      block.total_executed,
      ''
    ]);
    // Row 2: Planned
    rows.push([
      `${calc.bill_no} PLANNED QTY`,
      ...dias.map(d => block.planned_per_dia[d] || 0),
      block.total_planned,
      ''
    ]);
    // Row 3: Balance
    rows.push([
      'BALANCE (planned - executed)',
      ...dias.map(d => block.balance_per_dia[d] || 0),
      block.total_balance_qty,
      block.completion_ratio !== null ? `${block.completion_ratio}%` : '-'
    ]);
  });

  rows.push([]);

  // Section B: CADWM
  rows.push([`B. CADWM (COMMAND AREA DEVELOPMENT & WATER MANAGEMENT) - ${calc.bill_no}`]);
  calc.minors.forEach(m => {
    const block = calc.cad_blocks[m.id];
    if (!block) return;
    // Row 1: Executed
    rows.push([
      `${m.name} executed CAD`,
      ...dias.map(d => block.executed_per_dia[d] || 0),
      block.total_executed,
      ''
    ]);
    // Row 2: Planned
    rows.push([
      `${calc.bill_no} PLANNED QTY (CAD)`,
      ...dias.map(d => block.planned_per_dia[d] || 0),
      block.total_planned,
      ''
    ]);
    // Row 3: Balance
    rows.push([
      'BALANCE (planned - executed)',
      ...dias.map(d => block.balance_per_dia[d] || 0),
      block.total_balance_qty,
      block.completion_ratio !== null ? `${block.completion_ratio}%` : '-'
    ]);
  });

  rows.push([]);

  // Section C: TOTAL UPTO DATE WORK DONE
  rows.push(['C. TOTAL UPTO DATE WORK DONE (EXECUTED ONLY: PDN + CAD)']);
  rows.push([
    'TOTAL UPTO DATE (m)',
    ...dias.map(d => calc.total_upto_date_executed_per_dia[d] || 0),
    calc.total_upto_date_grand,
    ''
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, `RA_Planning_${calc.bill_no}`);
  XLSX.writeFile(wb, `Planned_vs_Executed_${calc.bill_no}_${projectName.replace(/\s+/g, '_')}.xlsx`);
}

/**
 * Print / Export PDF trigger
 */
export function exportRAPlanningToPDF(): void {
  window.print();
}
