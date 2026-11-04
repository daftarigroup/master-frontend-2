// @ts-nocheck
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  SurveyRow,
  Minor,
  Adjustment,
  AbstractInputs,
  CalculatedAbstract,
  MinorAbstractSummary,
  RateWarning,
  STANDARD_PIPE_DIAS
} from './abstractTypes';

/**
 * 2. CORE CALCULATION (per minor)
 *
 * For every survey row i with i > first row:
 *   segment_length = chainage[i] - chainage[i-1]
 *   If back_filling_done[i] is TRUE:
 *       executed[minor][pipe_dia[i]] += segment_length
 * Only Back Filling counts as executed. Excavation and Pipe Laying are tracked
 * and displayed but never feed quantities.
 * The pipe_dia used is the dia of row i (the current row), not the previous row.
 * The first row of a minor never produces a length.
 *
 * Flag detection:
 * - negative segment: chainage[i] < chainage[i-1]
 * - blank dia: pipe_dia is 0 / empty while back_filling_done is true
 */
export function calculateMinorSurveyExecuted(rows: SurveyRow[]): {
  executedByDia: Record<number, number>;
  diagnostics: {
    negativeSegments: { rowId: string; seq: number; diff: number }[];
    blankDiaRows: { rowId: string; seq: number }[];
  };
} {
  const executedByDia: Record<number, number> = {};
  const negativeSegments: { rowId: string; seq: number; diff: number }[] = [];
  const blankDiaRows: { rowId: string; seq: number }[] = [];

  STANDARD_PIPE_DIAS.forEach(d => {
    executedByDia[d] = 0;
  });

  // Sort rows strictly by sequence or order
  const sorted = [...rows].sort((a, b) => a.seq - b.seq);

  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i];
    const prev = sorted[i - 1];

    const curCh = Number(cur.chainage) || 0;
    const prevCh = Number(prev.chainage) || 0;
    const segmentLength = curCh - prevCh;

    if (segmentLength < 0) {
      negativeSegments.push({ rowId: cur.id, seq: cur.seq, diff: segmentLength });
      cur.has_negative_segment = true;
    } else {
      cur.has_negative_segment = false;
    }

    const dia = Number(cur.pipe_dia) || 0;
    if (cur.back_filling_done && dia <= 0) {
      blankDiaRows.push({ rowId: cur.id, seq: cur.seq });
      cur.has_blank_dia = true;
    } else {
      cur.has_blank_dia = false;
    }

    // Only Back Filling counts as executed
    // Dia used is current row i's dia
    if (cur.back_filling_done && dia > 0 && segmentLength > 0) {
      if (executedByDia[dia] === undefined) {
        executedByDia[dia] = 0;
      }
      executedByDia[dia] += segmentLength;
    }
  }

  // Round values to 2 decimal places
  Object.keys(executedByDia).forEach(k => {
    const d = Number(k);
    executedByDia[d] = Math.round(executedByDia[d] * 100) / 100;
  });

  return { executedByDia, diagnostics: { negativeSegments, blankDiaRows } };
}

/**
 * Computes the complete Abstract Page calculations according to Section 2, 3, & 5.
 */
export function calculateFullAbstract(
  minors: Minor[],
  surveyRowsByMinor: Record<string, SurveyRow[]>,
  plannedQtyByMinor: Record<string, Record<number, number>>,
  adjustments: Adjustment[],
  inputs: AbstractInputs,
  overrideExecutedByMinor?: Record<string, Record<number, number>>
): CalculatedAbstract {
  // 1. Identify all active pipe diameters (standard 110-800, plus 900 if any minor has 900mm data)
  const activeDiasSet = new Set<number>(STANDARD_PIPE_DIAS);

  // Check if any minor has custom dia or 900mm
  minors.forEach(m => {
    const rows = surveyRowsByMinor[m.id] || [];
    rows.forEach(r => {
      if (r.pipe_dia) activeDiasSet.add(Number(r.pipe_dia));
    });
    const planned = plannedQtyByMinor[m.id] || {};
    Object.keys(planned).forEach(d => activeDiasSet.add(Number(d)));
    const override = overrideExecutedByMinor?.[m.id] || {};
    Object.keys(override).forEach(d => activeDiasSet.add(Number(d)));
  });

  const sortedDias = Array.from(activeDiasSet).sort((a, b) => a - b);

  // 2. Adjustments map: minor_id -> pipe_dia -> total adjustment metres
  const adjustmentsMap: Record<string, Record<number, number>> = {};
  adjustments.forEach(adj => {
    if (!adjustmentsMap[adj.minor_id]) adjustmentsMap[adj.minor_id] = {};
    if (!adjustmentsMap[adj.minor_id][adj.pipe_dia]) adjustmentsMap[adj.minor_id][adj.pipe_dia] = 0;
    adjustmentsMap[adj.minor_id][adj.pipe_dia] += Number(adj.value_m) || 0;
  });

  // 3. Compute executed and summaries per minor
  const minorSummaries: Record<string, MinorAbstractSummary> = {};
  const totalPdnPerDia: Record<number, number> = {};
  sortedDias.forEach(d => { totalPdnPerDia[d] = 0; });
  let totalPdnGrand = 0;

  minors.forEach(minor => {
    let rawExecuted: Record<number, number> = {};

    if (overrideExecutedByMinor && overrideExecutedByMinor[minor.id]) {
      rawExecuted = { ...overrideExecutedByMinor[minor.id] };
    } else {
      const rows = surveyRowsByMinor[minor.id] || [];
      const res = calculateMinorSurveyExecuted(rows);
      rawExecuted = res.executedByDia;
    }

    const minorAdj = adjustmentsMap[minor.id] || {};
    const plannedMap = plannedQtyByMinor[minor.id] || {};

    const diaResults: Record<number, any> = {};
    let mTotalRaw = 0;
    let mTotalAdj = 0;
    let mTotalFinal = 0;
    let mTotalPlanned = 0;

    sortedDias.forEach(dia => {
      const raw = rawExecuted[dia] || 0;
      const adj = minorAdj[dia] || 0;
      const finalVal = Math.round((raw + adj) * 100) / 100;
      const planned = plannedMap[dia] || 0;

      // Dia-wise completion % = executed_final / planned_qty
      // (show "-" if planned is 0 or blank, not #DIV/0!)
      const compPct = planned > 0 ? Math.round((finalVal / planned) * 1000) / 10 : null;

      diaResults[dia] = {
        executed_raw: raw,
        adjustment: adj,
        executed_final: finalVal,
        planned,
        completion_pct: compPct
      };

      mTotalRaw += raw;
      mTotalAdj += adj;
      mTotalFinal += finalVal;
      mTotalPlanned += planned;

      // Add to TOTAL PDN per dia
      totalPdnPerDia[dia] += finalVal;
    });

    mTotalFinal = Math.round(mTotalFinal * 100) / 100;
    totalPdnGrand += mTotalFinal;

    // Overall minor % = sum(executed_final over dias) / sum(planned over dias)
    const overallPct = mTotalPlanned > 0
      ? Math.round((mTotalFinal / mTotalPlanned) * 1000) / 10
      : null;

    minorSummaries[minor.id] = {
      minor_id: minor.id,
      minor_name: minor.name,
      dias: diaResults,
      total_executed_raw: Math.round(mTotalRaw * 100) / 100,
      total_adjustment: Math.round(mTotalAdj * 100) / 100,
      total_executed_final: mTotalFinal,
      total_planned: Math.round(mTotalPlanned * 100) / 100,
      overall_pct: overallPct
    };
  });

  // Round PDN totals per dia
  sortedDias.forEach(d => {
    totalPdnPerDia[d] = Math.round(totalPdnPerDia[d] * 100) / 100;
  });
  totalPdnGrand = Math.round(totalPdnGrand * 100) / 100;

  // 4. Section B: RECORDED UPTO RA2 & TO RECORD IN RA3
  const recordedUptoRa2PerDia: Record<number, number> = {};
  const toRecordInRa3PerDia: Record<number, number> = {};
  let recordedUptoRa2Grand = 0;
  let toRecordInRa3Grand = 0;

  sortedDias.forEach(dia => {
    const ra2Val = Number(inputs.recorded_upto_ra2?.[dia]) || 0;
    recordedUptoRa2PerDia[dia] = ra2Val;
    recordedUptoRa2Grand += ra2Val;

    // TO RECORD IN RA3 = TOTAL PDN - RECORDED UPTO RA2
    const ra3Val = Math.round((totalPdnPerDia[dia] - ra2Val) * 100) / 100;
    toRecordInRa3PerDia[dia] = ra3Val;
    toRecordInRa3Grand += ra3Val;
  });
  recordedUptoRa2Grand = Math.round(recordedUptoRa2Grand * 100) / 100;
  toRecordInRa3Grand = Math.round(toRecordInRa3Grand * 100) / 100;

  // 5. Section C: CADWM
  const cadPerMinorPerDia: Record<string, Record<number, number>> = {};
  const cadMinorTotals: Record<string, number> = {};
  const totalCadPerDia: Record<number, number> = {};
  let totalCadGrand = 0;

  sortedDias.forEach(d => { totalCadPerDia[d] = 0; });

  minors.forEach(minor => {
    cadPerMinorPerDia[minor.id] = {};
    let mCadTotal = 0;
    const mCadInput = inputs.cad_qty?.[minor.id] || {};

    sortedDias.forEach(dia => {
      const v = Number(mCadInput[dia]) || 0;
      cadPerMinorPerDia[minor.id][dia] = v;
      mCadTotal += v;
      totalCadPerDia[dia] += v;
    });

    cadMinorTotals[minor.id] = Math.round(mCadTotal * 100) / 100;
  });

  sortedDias.forEach(d => {
    totalCadPerDia[d] = Math.round(totalCadPerDia[d] * 100) / 100;
    totalCadGrand += totalCadPerDia[d];
  });
  totalCadGrand = Math.round(totalCadGrand * 100) / 100;

  // CAD Previous Recorded Row (Optional Ref Row)
  const cadPrevRecordedPerDia: Record<number, number> = {};
  let cadPrevRecordedGrand = 0;
  sortedDias.forEach(dia => {
    const v = Number(inputs.cad_previous_recorded?.[dia]) || 0;
    cadPrevRecordedPerDia[dia] = v;
    cadPrevRecordedGrand += v;
  });
  cadPrevRecordedGrand = Math.round(cadPrevRecordedGrand * 100) / 100;

  // 6. Section D: TOTAL UPTO DATE WORK DONE = TOTAL CAD + TOTAL PDN
  // Improvement required: Fix the grand-total bug. Total up-to-date = sum of per-dia totals.
  const totalUptoDatePerDia: Record<number, number> = {};
  let totalUptoDateGrand = 0;

  sortedDias.forEach(dia => {
    const val = Math.round((totalCadPerDia[dia] + totalPdnPerDia[dia]) * 100) / 100;
    totalUptoDatePerDia[dia] = val;
    totalUptoDateGrand += val;
  });
  totalUptoDateGrand = Math.round(totalUptoDateGrand * 100) / 100;

  // 7. Section E: Billing Comparison & Rate Warnings
  const ra1QtyPerDia: Record<number, number> = {};
  let ra1QtyGrand = 0;
  const diffPerDia: Record<number, number> = {};
  let diffGrand = 0;
  const ratePerDia: Record<number, number> = {};
  const amountAsPerRa1PerDia: Record<number, number> = {};
  let amountAsPerRa1Grand = 0;
  const amountUptoDatePerDia: Record<number, number> = {};
  let amountUptoDateGrand = 0;

  const rateWarnings: RateWarning[] = [];

  sortedDias.forEach(dia => {
    const ra1 = Number(inputs.ra1_qty?.[dia]) || 0;
    ra1QtyPerDia[dia] = ra1;
    ra1QtyGrand += ra1;

    // DIFFERENCE = TOTAL UPTO DATE - RA1 QTY
    const diff = Math.round((totalUptoDatePerDia[dia] - ra1) * 100) / 100;
    diffPerDia[dia] = diff;
    diffGrand += diff;

    const rate = Number(inputs.rate?.[dia]) || 0;
    ratePerDia[dia] = rate;

    // Validate that rate is set for any dia with quantity.
    // Warn when quantity > 0 and rate is missing (the source silently gave 0 amount).
    if (totalUptoDatePerDia[dia] > 0 && rate <= 0) {
      rateWarnings.push({
        pipe_dia: dia,
        quantity: totalUptoDatePerDia[dia],
        message: `Missing rate for ${dia} mm dia (Total Work Done = ${totalUptoDatePerDia[dia].toLocaleString()} m). Billing amount computed as 0.`
      });
    }

    // AMOUNT AS PER RA1 = RATE x RA1 QTY
    const amtRa1 = rate > 0 ? Math.round(rate * ra1 * 100) / 100 : 0;
    amountAsPerRa1PerDia[dia] = amtRa1;
    amountAsPerRa1Grand += amtRa1;

    // AMOUNT UPTO DATE = RATE x TOTAL UPTO DATE (only dias that have a rate contribute)
    const amtUptoDate = rate > 0 ? Math.round(rate * totalUptoDatePerDia[dia] * 100) / 100 : 0;
    amountUptoDatePerDia[dia] = amtUptoDate;
    amountUptoDateGrand += amtUptoDate;
  });

  ra1QtyGrand = Math.round(ra1QtyGrand * 100) / 100;
  diffGrand = Math.round(diffGrand * 100) / 100;
  amountAsPerRa1Grand = Math.round(amountAsPerRa1Grand * 10) / 10;
  amountUptoDateGrand = Math.round(amountUptoDateGrand * 10) / 10;

  return {
    pipe_dias: sortedDias,
    minors,
    minor_summaries: minorSummaries,
    total_pdn_per_dia: totalPdnPerDia,
    total_pdn_grand: totalPdnGrand,
    recorded_upto_ra2_per_dia: recordedUptoRa2PerDia,
    recorded_upto_ra2_grand: recordedUptoRa2Grand,
    to_record_in_ra3_per_dia: toRecordInRa3PerDia,
    to_record_in_ra3_grand: toRecordInRa3Grand,
    cad_per_minor_per_dia: cadPerMinorPerDia,
    cad_minor_totals: cadMinorTotals,
    total_cad_per_dia: totalCadPerDia,
    total_cad_grand: totalCadGrand,
    cad_previous_recorded_per_dia: cadPrevRecordedPerDia,
    cad_previous_recorded_grand: cadPrevRecordedGrand,
    total_upto_date_per_dia: totalUptoDatePerDia,
    total_upto_date_grand: totalUptoDateGrand,
    ra1_qty_per_dia: ra1QtyPerDia,
    ra1_qty_grand: ra1QtyGrand,
    difference_per_dia: diffPerDia,
    difference_grand: diffGrand,
    rate_per_dia: ratePerDia,
    amount_as_per_ra1_per_dia: amountAsPerRa1PerDia,
    amount_as_per_ra1_grand: amountAsPerRa1Grand,
    amount_upto_date_per_dia: amountUptoDatePerDia,
    amount_upto_date_grand: amountUptoDateGrand,
    rate_warnings: rateWarnings
  };
}

/**
 * Exports Abstract spreadsheet to Excel (.xlsx) file
 */
export function exportAbstractToExcel(
  abstract: CalculatedAbstract,
  projectName = 'Project Abstract'
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Main Abstract Sheet
  const headers = ['Description', ...abstract.pipe_dias.map(d => `${d} mm`), 'Total'];
  const rows: any[][] = [];

  // Title
  rows.push([`${projectName} - EXECUTION & BILLING ABSTRACT`]);
  rows.push([]);
  rows.push(headers);

  // Section A: PDN
  rows.push(['A. PDN (Pipe Distribution Network)']);
  abstract.minors.forEach(m => {
    const summary = abstract.minor_summaries[m.id];
    const r = [
      `  Minor - ${m.name}`,
      ...abstract.pipe_dias.map(d => summary?.dias[d]?.executed_final || 0),
      summary?.total_executed_final || 0
    ];
    rows.push(r);
  });
  rows.push([
    'TOTAL PDN',
    ...abstract.pipe_dias.map(d => abstract.total_pdn_per_dia[d] || 0),
    abstract.total_pdn_grand
  ]);

  rows.push([]);

  // Section B: RA2 & RA3
  rows.push([
    'B. RECORDED UPTO RA2',
    ...abstract.pipe_dias.map(d => abstract.recorded_upto_ra2_per_dia[d] || 0),
    abstract.recorded_upto_ra2_grand
  ]);
  rows.push([
    'TO RECORD IN RA3 (PDN - RA2)',
    ...abstract.pipe_dias.map(d => abstract.to_record_in_ra3_per_dia[d] || 0),
    abstract.to_record_in_ra3_grand
  ]);

  rows.push([]);

  // Section C: CADWM
  rows.push(['C. CADWM (Command Area Development & Water Management)']);
  abstract.minors.forEach(m => {
    const r = [
      `  CAD Minor - ${m.name}`,
      ...abstract.pipe_dias.map(d => abstract.cad_per_minor_per_dia[m.id]?.[d] || 0),
      abstract.cad_minor_totals[m.id] || 0
    ];
    rows.push(r);
  });
  rows.push([
    'TOTAL CAD',
    ...abstract.pipe_dias.map(d => abstract.total_cad_per_dia[d] || 0),
    abstract.total_cad_grand
  ]);
  if (abstract.cad_previous_recorded_grand > 0) {
    rows.push([
      'CAD PREVIOUS RECORDED (Ref)',
      ...abstract.pipe_dias.map(d => abstract.cad_previous_recorded_per_dia[d] || 0),
      abstract.cad_previous_recorded_grand
    ]);
  }

  rows.push([]);

  // Section D: TOTAL UPTO DATE WORK DONE
  rows.push([
    'D. TOTAL UPTO DATE WORK DONE (TOTAL CAD + TOTAL PDN)',
    ...abstract.pipe_dias.map(d => abstract.total_upto_date_per_dia[d] || 0),
    abstract.total_upto_date_grand
  ]);

  rows.push([]);

  // Section E: Billing Comparison
  rows.push(['E. BILLING COMPARISON & RATES']);
  rows.push([
    'RA1 QTY',
    ...abstract.pipe_dias.map(d => abstract.ra1_qty_per_dia[d] || 0),
    abstract.ra1_qty_grand
  ]);
  rows.push([
    'DIFFERENCE (TOTAL UPTO DATE - RA1)',
    ...abstract.pipe_dias.map(d => abstract.difference_per_dia[d] || 0),
    abstract.difference_grand
  ]);
  rows.push([
    'RATE (₹ / m)',
    ...abstract.pipe_dias.map(d => abstract.rate_per_dia[d] ? `₹ ${abstract.rate_per_dia[d]}` : '-'),
    '-'
  ]);
  rows.push([
    'AMOUNT AS PER RA1 (₹)',
    ...abstract.pipe_dias.map(d => abstract.amount_as_per_ra1_per_dia[d] || 0),
    abstract.amount_as_per_ra1_grand
  ]);
  rows.push([
    'AMOUNT UPTO DATE (₹)',
    ...abstract.pipe_dias.map(d => abstract.amount_upto_date_per_dia[d] || 0),
    abstract.amount_upto_date_grand
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'ABSTRACT');

  // Sheet 2: Minor Progress & KPIs
  const kpiHeaders = ['#', 'Minor Name', 'Planned Length (m)', 'Executed Final (m)', 'Progress %', 'Status'];
  const kpiRows: any[][] = [kpiHeaders];
  abstract.minors.forEach((m, idx) => {
    const s = abstract.minor_summaries[m.id];
    kpiRows.push([
      idx + 1,
      m.name,
      s?.total_planned || 0,
      s?.total_executed_final || 0,
      s?.overall_pct !== null ? `${s.overall_pct}%` : '-',
      (s?.overall_pct || 0) >= 85 ? 'On Track' : (s?.overall_pct || 0) >= 70 ? 'In Progress' : 'Initial Stage'
    ]);
  });
  const wsKpi = XLSX.utils.aoa_to_sheet(kpiRows);
  XLSX.utils.book_append_sheet(wb, wsKpi, 'MINORS PROGRESS');

  XLSX.writeFile(wb, `${projectName.replace(/\s+/g, '_')}_Abstract.xlsx`);
}

/**
 * Exports Abstract report to PDF
 */
export function exportAbstractToPDF(
  abstract: CalculatedAbstract,
  projectName = 'Project Abstract'
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text(`${projectName} - Execution & Billing Abstract`, 40, 36);

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated on: ${new Date().toLocaleString()} | Grand Total Work Done: ${abstract.total_upto_date_grand.toLocaleString()} m`, 40, 52);

  // Prepare table headers: Description | top 10 dias | Total
  const sampleDias = abstract.pipe_dias.slice(0, 12);
  const head = [['Description', ...sampleDias.map(d => `${d}mm`), 'Total']];

  const body: any[][] = [];

  // PDN Minors
  abstract.minors.forEach(m => {
    const s = abstract.minor_summaries[m.id];
    body.push([
      m.name,
      ...sampleDias.map(d => s?.dias[d]?.executed_final || '-'),
      s?.total_executed_final || 0
    ]);
  });

  body.push([
    'TOTAL PDN',
    ...sampleDias.map(d => abstract.total_pdn_per_dia[d] || 0),
    abstract.total_pdn_grand
  ]);

  body.push([
    'RECORDED UPTO RA2',
    ...sampleDias.map(d => abstract.recorded_upto_ra2_per_dia[d] || 0),
    abstract.recorded_upto_ra2_grand
  ]);

  body.push([
    'TO RECORD IN RA3',
    ...sampleDias.map(d => abstract.to_record_in_ra3_per_dia[d] || 0),
    abstract.to_record_in_ra3_grand
  ]);

  body.push([
    'TOTAL CAD',
    ...sampleDias.map(d => abstract.total_cad_per_dia[d] || 0),
    abstract.total_cad_grand
  ]);

  body.push([
    'TOTAL UPTO DATE',
    ...sampleDias.map(d => abstract.total_upto_date_per_dia[d] || 0),
    abstract.total_upto_date_grand
  ]);

  body.push([
    'RA1 QTY',
    ...sampleDias.map(d => abstract.ra1_qty_per_dia[d] || 0),
    abstract.ra1_qty_grand
  ]);

  body.push([
    'AMOUNT AS PER RA1 (₹)',
    ...sampleDias.map(d => abstract.amount_as_per_ra1_per_dia[d] || 0),
    abstract.amount_as_per_ra1_grand.toLocaleString('en-IN')
  ]);

  body.push([
    'AMOUNT UPTO DATE (₹)',
    ...sampleDias.map(d => abstract.amount_upto_date_per_dia[d] || 0),
    abstract.amount_upto_date_grand.toLocaleString('en-IN')
  ]);

  autoTable(doc, {
    startY: 65,
    head,
    body,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 3 },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' }
  });

  doc.save(`${projectName.replace(/\s+/g, '_')}_Abstract.pdf`);
}
