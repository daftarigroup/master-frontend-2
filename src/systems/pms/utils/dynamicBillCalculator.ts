// @ts-nocheck
// Dynamic Bill Calculator
// Computes bill quantities and amounts directly from entries sent from Execution Details / Actual Details
// Strictly follows Table 1 Logic: Qty x Rate = Amount
// - Department Billing: Rates from Schedule - B Report
// - Sub-Contractor Billing: Rates from Purchase Order (PO)
// No artificial statutory or commercial deductions (pure Table 1 calculation)

import { buildChainageDiffMap } from './helpers';
import { getExecutions, getActuals } from './storageManager';
import {
  getScheduleBRate,
  getPORate,
  resolvePoNumberForProject
} from './table1RateMaster';

export interface CalculatedBillLineItem {
  id: string;
  category: 'PIPE' | 'EARTHWORK' | 'BEDDING' | 'VALVE' | 'OTHER';
  code: string;
  description: string;
  pipeDia?: number;
  unit: string;
  rate: number;
  rateSource: string; // e.g. "Schedule - B Report (Item No 1)" or "PO #..."
  quantity: number;
  amount: number;
  deptRate?: number;
  deptAmount?: number;
  margin?: number;
}

export interface DynamicBillOptions {
  rateMode?: 'SCHEDULE_B' | 'PO';
  poNumber?: string;
  subContractorName?: string;
  overrideRates?: Record<string, number>;
}

export interface DynamicBillBreakdown {
  rateMode: 'SCHEDULE_B' | 'PO';
  poNumber?: string;
  subContractorName?: string;
  lineItems: CalculatedBillLineItem[];
  totalAmount: number;
  grossAmount: number;
  netPayable: number;
  totalLengthMeters: number;
  pipeDiaBreakdown: Record<string, { length: number; rate: number; amount: number; rateSource: string }>;
  deductions: {
    totalDeductions: number;
  };
  deptEquivalentGross?: number;
  contractorMargin?: number;
  contractorMarginPct?: number;
}

export function computeBillFromExecutionEntries(
  bill: any,
  overrideRatesOrOptions: Record<string, number> | DynamicBillOptions = {}
): DynamicBillBreakdown {
  let rateMode: 'SCHEDULE_B' | 'PO';
  let poNumber: string | undefined;
  let subContractorName: string | undefined;
  let overrideRates: Record<string, number> = {};

  const isOptionsObject =
    typeof overrideRatesOrOptions === 'object' &&
    overrideRatesOrOptions !== null &&
    ('rateMode' in overrideRatesOrOptions ||
      'poNumber' in overrideRatesOrOptions ||
      'overrideRates' in overrideRatesOrOptions);

  if (isOptionsObject) {
    const opts = overrideRatesOrOptions as DynamicBillOptions;
    rateMode = opts.rateMode || (bill?.billType === 'Actual' ? 'PO' : 'SCHEDULE_B');
    poNumber = opts.poNumber;
    subContractorName = opts.subContractorName;
    overrideRates = opts.overrideRates || {};
  } else {
    overrideRates = (overrideRatesOrOptions as Record<string, number>) || {};
    rateMode = bill?.billType === 'Actual' ? 'PO' : 'SCHEDULE_B';
  }

  const isPO = rateMode === 'PO';
  const effectivePoNumber = (
    poNumber ||
    bill?.poNumber ||
    resolvePoNumberForProject(
      bill?.projectNo,
      subContractorName || bill?.subContractorName || bill?.contractorName
    ) ||
    ''
  ).trim();
  const effectiveSubContractor = (
    subContractorName ||
    bill?.subContractorName ||
    bill?.contractorName ||
    ''
  ).trim();

  const entries = bill?.entries || [];
  if (entries.length === 0) {
    return {
      rateMode,
      poNumber: effectivePoNumber || undefined,
      subContractorName: effectiveSubContractor || undefined,
      lineItems: [],
      totalAmount: 0,
      grossAmount: 0,
      netPayable: 0,
      totalLengthMeters: 0,
      pipeDiaBreakdown: {},
      deductions: { totalDeductions: 0 },
      deptEquivalentGross: 0,
      contractorMargin: 0,
      contractorMarginPct: 0
    };
  }

  // 1. Compute chainage differences from the full project source
  const isExecution = bill.billType === 'Execution';
  const fullSource = isExecution ? getExecutions() : getActuals();
  const sameProject = fullSource
    .filter(s => s.projectNo === bill.projectNo)
    .sort((a, b) => (a.serialNo ?? 0) - (b.serialNo ?? 0));

  const diffMap = isExecution
    ? buildChainageDiffMap(sameProject, s => s.execution?.chainage, s => s.id)
    : buildChainageDiffMap(sameProject, s => s.actual?.chainage, s => s.id);

  // 2. Group pipe lengths by Pipe Diameter
  const pipeDiaMap: Record<number, { length: number; dia: number; count: number }> = {};
  let totalLengthMeters = 0;
  let totalMurumCum = 0;
  let totalExcavationCum = 0;
  let totalBackfillCum = 0;
  let totalValvesCount = 0;

  entries.forEach((e: any) => {
    const data = e.billed || e.original || e.execution || e.actual || {};
    const dia = Number(data.pipeDia);
    const diff = diffMap.get(e.sourceId) || 0;

    if (diff > 0 && dia > 0) {
      if (!pipeDiaMap[dia]) {
        pipeDiaMap[dia] = { length: 0, dia, count: 0 };
      }
      pipeDiaMap[dia].length += diff;
      pipeDiaMap[dia].count += 1;
      totalLengthMeters += diff;

      // Estimate trench excavation and bedding if depth/cuttingLevel is recorded
      // Trench depth = ground elevation - cutting level (both are absolute levels / RL).
      const groundLevel = Number(data.elevation);
      const cutLevel = Number(data.cuttingLevel);
      const computedDepth = groundLevel - cutLevel;
      const depth = Number.isFinite(computedDepth) && computedDepth > 0 ? computedDepth : 1.5;
      const width = Math.max(0.8, (dia / 1000) + 0.6); // trench width
      const trenchVol = diff * width * depth;

      totalExcavationCum += trenchVol;
      totalMurumCum += diff * width * 0.15; // 150mm bedding
      totalBackfillCum += Math.max(0, trenchVol - (diff * Math.PI * Math.pow(dia / 2000, 2)));
    }

    if (data.valve && String(data.valve).toLowerCase() !== 'false') {
      totalValvesCount += 1;
    }
  });

  const lineItems: CalculatedBillLineItem[] = [];
  const pipeDiaBreakdown: Record<string, { length: number; rate: number; amount: number; rateSource: string }> = {};
  let totalAmount = 0;
  let deptEquivalentGross = 0;

  // 3. Add Pipe Laying Line Items
  const sortedDias = Object.keys(pipeDiaMap).map(Number).sort((a, b) => a - b);
  sortedDias.forEach(dia => {
    const length = parseFloat(pipeDiaMap[dia].length.toFixed(3));

    // Resolve rate: Schedule B for Department, PO for Sub-Contractor
    const resolved = isPO
      ? getPORate('pipe', dia, bill.projectNo, effectivePoNumber, effectiveSubContractor)
      : getScheduleBRate('pipe', dia, bill.projectNo);

    // Calculate department equivalent rate for reference
    const deptResolved = getScheduleBRate('pipe', dia, bill.projectNo);
    const deptRate = deptResolved.rate;
    const deptAmt = parseFloat((length * deptRate).toFixed(2));
    deptEquivalentGross += deptAmt;

    const rate = overrideRates[`pipe_${dia}`] !== undefined ? overrideRates[`pipe_${dia}`] : resolved.rate;
    const amount = parseFloat((length * rate).toFixed(2));

    totalAmount += amount;
    pipeDiaBreakdown[String(dia)] = { length, rate, amount, rateSource: resolved.source };

    lineItems.push({
      id: `pipe_${dia}`,
      category: 'PIPE',
      code: resolved.code || (isPO ? `PO-HDPE-${dia}` : `ITEM-7-${dia}`),
      description: isPO
        ? `Providing, Jointing & Laying HDPE Pipe ${dia} mm`
        : `Providing, Laying, Jointing HDPE 4 kg/cm² Pipe ${dia} mm`,
      pipeDia: dia,
      unit: resolved.unit || 'Rmt',
      rate,
      rateSource: resolved.source,
      quantity: length,
      amount,
      deptRate,
      deptAmount: deptAmt,
      margin: parseFloat((deptAmt - amount).toFixed(2))
    });
  });

  // 4. Add Earthwork & Bedding Line Items (if lengths exist)
  if (totalLengthMeters > 0) {
    // 1A Deep Trench Excavation
    const excQty = parseFloat(totalExcavationCum.toFixed(2));
    const excResolved = isPO
      ? getPORate('excavation', undefined, bill.projectNo, effectivePoNumber, effectiveSubContractor)
      : getScheduleBRate('excavation', undefined, bill.projectNo);
    const excDeptResolved = getScheduleBRate('excavation', undefined, bill.projectNo);
    const excRate = overrideRates['excavation'] !== undefined ? overrideRates['excavation'] : excResolved.rate;
    const excAmt = parseFloat((excQty * excRate).toFixed(2));
    const excDeptAmt = parseFloat((excQty * excDeptResolved.rate).toFixed(2));

    totalAmount += excAmt;
    deptEquivalentGross += excDeptAmt;

    lineItems.push({
      id: 'excavation',
      category: 'EARTHWORK',
      code: excResolved.code || (isPO ? 'PO-EXCAV' : 'ITEM-1A'),
      description: isPO ? 'Trench Excavation for Pipe Alignment' : 'Excavation for deep trenches for pipe laying',
      unit: excResolved.unit || 'CUM',
      rate: excRate,
      rateSource: excResolved.source,
      quantity: excQty,
      amount: excAmt,
      deptRate: excDeptResolved.rate,
      deptAmount: excDeptAmt,
      margin: parseFloat((excDeptAmt - excAmt).toFixed(2))
    });

    // Murum Bedding
    const murumQty = parseFloat(totalMurumCum.toFixed(2));
    const murumResolved = isPO
      ? getPORate('murum', undefined, bill.projectNo, effectivePoNumber, effectiveSubContractor)
      : getScheduleBRate('murum', undefined, bill.projectNo);
    const murumDeptResolved = getScheduleBRate('murum', undefined, bill.projectNo);
    const murumRate = overrideRates['murum'] !== undefined ? overrideRates['murum'] : murumResolved.rate;
    const murumAmt = parseFloat((murumQty * murumRate).toFixed(2));
    const murumDeptAmt = parseFloat((murumQty * murumDeptResolved.rate).toFixed(2));

    totalAmount += murumAmt;
    deptEquivalentGross += murumDeptAmt;

    lineItems.push({
      id: 'murum',
      category: 'BEDDING',
      code: murumResolved.code || (isPO ? 'PO-BEDDING' : 'ITEM-3'),
      description: isPO ? 'Murum / Sand Bedding Cushion' : 'Murum bedding below pipe line',
      unit: murumResolved.unit || 'CUM',
      rate: murumRate,
      rateSource: murumResolved.source,
      quantity: murumQty,
      amount: murumAmt,
      deptRate: murumDeptResolved.rate,
      deptAmount: murumDeptAmt,
      margin: parseFloat((murumDeptAmt - murumAmt).toFixed(2))
    });

    // Backfilling
    const backfillQty = parseFloat(totalBackfillCum.toFixed(2));
    const backfillResolved = isPO
      ? getPORate('backfill', undefined, bill.projectNo, effectivePoNumber, effectiveSubContractor)
      : getScheduleBRate('backfill', undefined, bill.projectNo);
    const backfillDeptResolved = getScheduleBRate('backfill', undefined, bill.projectNo);
    const backfillRate = overrideRates['backfill'] !== undefined ? overrideRates['backfill'] : backfillResolved.rate;
    const backfillAmt = parseFloat((backfillQty * backfillRate).toFixed(2));
    const backfillDeptAmt = parseFloat((backfillQty * backfillDeptResolved.rate).toFixed(2));

    totalAmount += backfillAmt;
    deptEquivalentGross += backfillDeptAmt;

    lineItems.push({
      id: 'backfill',
      category: 'EARTHWORK',
      code: backfillResolved.code || (isPO ? 'PO-BACKFILL' : 'ITEM-4'),
      description: isPO ? 'Trench Backfilling & Compaction' : 'Backfilling of pipe trench with selected earth',
      unit: backfillResolved.unit || 'CUM',
      rate: backfillRate,
      rateSource: backfillResolved.source,
      quantity: backfillQty,
      amount: backfillAmt,
      deptRate: backfillDeptResolved.rate,
      deptAmount: backfillDeptAmt,
      margin: parseFloat((backfillDeptAmt - backfillAmt).toFixed(2))
    });
  }

  // 5. Add Valves (if recorded)
  if (totalValvesCount > 0) {
    const valveResolved = isPO
      ? getPORate('valve', undefined, bill.projectNo, effectivePoNumber, effectiveSubContractor)
      : getScheduleBRate('valve', undefined, bill.projectNo);
    const valveDeptResolved = getScheduleBRate('valve', undefined, bill.projectNo);
    const valveRate = overrideRates['valves'] !== undefined ? overrideRates['valves'] : valveResolved.rate;
    const valveAmt = totalValvesCount * valveRate;
    const valveDeptAmt = totalValvesCount * valveDeptResolved.rate;

    totalAmount += valveAmt;
    deptEquivalentGross += valveDeptAmt;

    lineItems.push({
      id: 'valves',
      category: 'VALVE',
      code: valveResolved.code || (isPO ? 'PO-VALVE' : 'ITEM-9'),
      description: isPO ? 'Valve Installation & Chambers' : 'Air Valves and fittings along pipeline',
      unit: valveResolved.unit || 'No',
      rate: valveRate,
      rateSource: valveResolved.source,
      quantity: totalValvesCount,
      amount: valveAmt,
      deptRate: valveDeptResolved.rate,
      deptAmount: valveDeptAmt,
      margin: parseFloat((valveDeptAmt - valveAmt).toFixed(2))
    });
  }

  const finalTotal = parseFloat(totalAmount.toFixed(2));
  const contractorMargin = parseFloat((deptEquivalentGross - finalTotal).toFixed(2));
  const contractorMarginPct =
    deptEquivalentGross > 0 ? parseFloat(((contractorMargin / deptEquivalentGross) * 100).toFixed(1)) : 0;

  return {
    rateMode,
    poNumber: effectivePoNumber || undefined,
    subContractorName: effectiveSubContractor || undefined,
    lineItems,
    totalAmount: finalTotal,
    grossAmount: finalTotal,
    netPayable: finalTotal,
    totalLengthMeters: parseFloat(totalLengthMeters.toFixed(3)),
    pipeDiaBreakdown,
    deductions: { totalDeductions: 0 },
    deptEquivalentGross: parseFloat(deptEquivalentGross.toFixed(2)),
    contractorMargin,
    contractorMarginPct
  };
}
