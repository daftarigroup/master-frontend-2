// @ts-nocheck
// Calculation Engine for Department Billing & Sub-Contractor Billing
// Based strictly on Sheet: "Table 1" of Qty Abst PDN Km 0 to 10 Surewada working 28-8-2025.xlsx

import { TABLE_1_ITEMS, TABLE_1_MINORS } from './table1SeedData';
import type { Table1Item, MinorMeta } from './table1SeedData';

export interface CalculationOptions {
  includeDudhara?: boolean;       // default: true (fixes Bug 1)
  fixKesalwadaBedding?: boolean;  // default: false (preserves raw sheet parity by default, toggleable)
  useStrict5YearOm?: boolean;     // default: true (fixes Bug 3)
  fixFlowMeter1200?: boolean;     // default: true (fixes Bug 4)
}

export interface CalculatedRow extends Table1Item {
  calculatedTenderQty: number;
  calculatedTenderAmount: number;
  calculatedDesignQty: number;
  calculatedDesignAmount: number;
  calculatedDiffAmount: number;
  calculatedPctDiff: number;
  isSupplyRow: boolean;
  isWorkRow: boolean;
}

export interface Table1CalculationResult {
  items: CalculatedRow[];
  minors: MinorMeta[];
  tenderGrandTotal: number;
  designGrandTotal: number;
  diffGrandTotal: number;
  pctDiffGrandTotal: number;
  worksCostTender: number;
  worksCostDesign: number;
  annualOmTender: number;
  annualOmDesign: number;
  totalOmTender: number;
  totalOmDesign: number;
  tenderCcaHa: number;
  designCcaHa: number;
  tenderCostPerHa: number;
  designCostPerHa: number;
  hdpeSupplyTenderMeters: number;
  hdpeSupplyDesignMeters: number;
  hdpeSupplyDiffMeters: number;
  hdpeSupplyDiffPct: number;
  optionsApplied: CalculationOptions;
}

/**
 * Calculates all row items, sub-totals, and grand totals according to Table 1 logic
 */
export function calculateTable1(
  items: Table1Item[] = TABLE_1_ITEMS,
  options: CalculationOptions = {}
): Table1CalculationResult {
  const {
    includeDudhara = true,
    fixKesalwadaBedding = false,
    useStrict5YearOm = false, // false to match exact raw spreadsheet total ₹29.02 Cr / ₹31.08 Cr
    fixFlowMeter1200 = true
  } = options;

  const activeMinors = TABLE_1_MINORS.filter(m => includeDudhara || m.id !== 'dudhara');

  // 1. Process all standard items
  const processedItems: CalculatedRow[] = items.map(item => {
    const isSupplyRow = item.row >= 7 && item.row <= 27;
    const isWorkRow = item.row >= 28 && item.row <= 145;

    let rowTenderQty = 0;
    let rowDesignQty = 0;

    activeMinors.forEach(m => {
      let tQty = item.minors[m.id]?.tenderQty || 0;
      let dQty = item.minors[m.id]?.designQty || 0;

      // Fix Kesalwada bedding if requested
      if (fixKesalwadaBedding && item.row === 31 && m.id === 'kesalwada') {
        dQty = 1098.31;
      }

      rowTenderQty += tQty;
      rowDesignQty += dQty;
    });

    // Special items with formula overrides in Table 1
    let tenderAmt = 0;
    let designAmt = 0;

    if (item.row === 104) {
      // 1200mm flow meter
      tenderAmt = fixFlowMeter1200 ? (rowTenderQty || 1) * (item.rate || 523463.49) : (item.tenderAmount || 0);
      designAmt = 0;
    } else if (item.rate > 0) {
      tenderAmt = rowTenderQty * item.rate;
      designAmt = rowDesignQty * item.rate;
    } else {
      tenderAmt = item.tenderAmount;
      designAmt = item.designAmount;
    }

    const diffAmt = designAmt - tenderAmt;
    const pctDiff = tenderAmt !== 0 ? (diffAmt / tenderAmt) * 100 : 0;

    return {
      ...item,
      calculatedTenderQty: rowTenderQty,
      calculatedTenderAmount: tenderAmt,
      calculatedDesignQty: rowDesignQty,
      calculatedDesignAmount: designAmt,
      calculatedDiffAmount: diffAmt,
      calculatedPctDiff: pctDiff,
      isSupplyRow,
      isWorkRow
    };
  });

  // 2. Compute Works Cost (Rows 28 to 139)
  const workItems = processedItems.filter(it => it.row >= 28 && it.row <= 139);
  const worksCostTender = workItems.reduce((sum, it) => sum + it.calculatedTenderAmount, 0);
  const worksCostDesign = workItems.reduce((sum, it) => sum + it.calculatedDesignAmount, 0);

  // 3. Compute 5-Year Operation & Maintenance (Rows 140 to 145)
  const annualOmTender = worksCostTender * 0.004; // 0.40%
  const annualOmDesign = worksCostDesign * 0.004; // 0.40%

  let totalOmTender = 0;
  let totalOmDesign = 0;

  if (useStrict5YearOm) {
    totalOmTender = annualOmTender * 5;
    totalOmDesign = annualOmDesign * 5;
  } else {
    // Exact Excel replication: Row 140 has annual amount, plus rows 141-145 (summed 6 times)
    totalOmTender = annualOmTender * 6;
    totalOmDesign = annualOmDesign * 6;
  }

  // Update O&M rows in the output list
  processedItems.forEach(it => {
    if (it.row >= 140 && it.row <= 145) {
      it.calculatedTenderAmount = annualOmTender;
      it.calculatedDesignAmount = annualOmDesign;
      it.calculatedDiffAmount = annualOmDesign - annualOmTender;
      it.calculatedPctDiff = annualOmTender !== 0 ? ((annualOmDesign - annualOmTender) / annualOmTender) * 100 : 0;
    }
  });

  // 4. Grand Totals (Sum of Rows 28 to 145)
  const tenderGrandTotal = worksCostTender + (useStrict5YearOm ? totalOmTender : annualOmTender * 6);
  const designGrandTotal = worksCostDesign + (useStrict5YearOm ? totalOmDesign : annualOmDesign * 6);
  const diffGrandTotal = designGrandTotal - tenderGrandTotal;
  const pctDiffGrandTotal = tenderGrandTotal !== 0 ? (diffGrandTotal / tenderGrandTotal) * 100 : 0;

  // 5. CCA metrics (Row 5)
  const ccaRow = processedItems.find(it => it.row === 5);
  const tenderCcaHa = ccaRow ? ccaRow.calculatedTenderQty || 1470.75 : 1470.75;
  const designCcaHa = ccaRow ? ccaRow.calculatedDesignQty || 1812.39 : 1812.39;

  const tenderCostPerHa = tenderCcaHa > 0 ? tenderGrandTotal / tenderCcaHa : 0;
  const designCostPerHa = designCcaHa > 0 ? designGrandTotal / designCcaHa : 0;

  // 6. HDPE Supply comparison (Rows 7 to 24)
  const hdpeRows = processedItems.filter(it => it.row >= 7 && it.row <= 24);
  const hdpeSupplyTenderMeters = hdpeRows.reduce((sum, it) => sum + it.calculatedTenderQty, 0);
  const hdpeSupplyDesignMeters = hdpeRows.reduce((sum, it) => sum + it.calculatedDesignQty, 0);
  const hdpeSupplyDiffMeters = hdpeSupplyDesignMeters - hdpeSupplyTenderMeters;
  const hdpeSupplyDiffPct = hdpeSupplyTenderMeters > 0 ? (hdpeSupplyDiffMeters / hdpeSupplyTenderMeters) * 100 : 0;

  return {
    items: processedItems,
    minors: activeMinors,
    tenderGrandTotal,
    designGrandTotal,
    diffGrandTotal,
    pctDiffGrandTotal,
    worksCostTender,
    worksCostDesign,
    annualOmTender,
    annualOmDesign,
    totalOmTender,
    totalOmDesign,
    tenderCcaHa,
    designCcaHa,
    tenderCostPerHa,
    designCostPerHa,
    hdpeSupplyTenderMeters,
    hdpeSupplyDesignMeters,
    hdpeSupplyDiffMeters,
    hdpeSupplyDiffPct,
    optionsApplied: {
      includeDudhara,
      fixKesalwadaBedding,
      useStrict5YearOm,
      fixFlowMeter1200
    }
  };
}

/**
 * Calculates a Running Account (RA) Bill for the Department with standard statutory recoveries
 */
export interface DeptBillInputItem {
  row: number;
  itemId: string;
  description: string;
  unit: string;
  rate: number;
  previousQty: number;
  currentQty: number;
}

export interface DeptBillDeductionConfig {
  securityDepositPct?: number; // 5% default
  tdsPct?: number;             // 2% default
  gstTdsPct?: number;          // 2% default (1% CGST + 1% SGST)
  labourCessPct?: number;      // 1% default
  royaltyMurumRate?: number;   // e.g. ₹141.43 / CUM
  royaltySandRate?: number;    // e.g. ₹282.86 / CUM
  murumQtyCum?: number;
  sandQtyCum?: number;
  machineryAdvanceRecovery?: number;
  otherDeductions?: number;
}

export function calculateDepartmentRABill(
  items: DeptBillInputItem[],
  deductions: DeptBillDeductionConfig = {}
) {
  const {
    securityDepositPct = 5,
    tdsPct = 2,
    gstTdsPct = 2,
    labourCessPct = 1,
    royaltyMurumRate = 141.43,
    royaltySandRate = 282.86,
    murumQtyCum = 0,
    sandQtyCum = 0,
    machineryAdvanceRecovery = 0,
    otherDeductions = 0
  } = deductions;

  let grossCurrentAmount = 0;
  let grossCumulativeAmount = 0;
  let grossPreviousAmount = 0;

  const itemResults = items.map(it => {
    const cumulativeQty = (it.previousQty || 0) + (it.currentQty || 0);
    const previousAmount = (it.previousQty || 0) * (it.rate || 0);
    const currentAmount = (it.currentQty || 0) * (it.rate || 0);
    const cumulativeAmount = cumulativeQty * (it.rate || 0);

    grossPreviousAmount += previousAmount;
    grossCurrentAmount += currentAmount;
    grossCumulativeAmount += cumulativeAmount;

    return {
      ...it,
      cumulativeQty,
      previousAmount,
      currentAmount,
      cumulativeAmount
    };
  });

  // Calculate Statutory Deductions on Gross Current Amount
  const securityDeposit = (grossCurrentAmount * securityDepositPct) / 100;
  const tdsAmount = (grossCurrentAmount * tdsPct) / 100;
  const gstTdsAmount = (grossCurrentAmount * gstTdsPct) / 100;
  const labourCess = (grossCurrentAmount * labourCessPct) / 100;
  const royaltyMurum = murumQtyCum * royaltyMurumRate;
  const royaltySand = sandQtyCum * royaltySandRate;
  const totalRoyalty = royaltyMurum + royaltySand;

  const totalDeductions =
    securityDeposit +
    tdsAmount +
    gstTdsAmount +
    labourCess +
    totalRoyalty +
    machineryAdvanceRecovery +
    otherDeductions;

  const netPayable = Math.max(0, grossCurrentAmount - totalDeductions);

  return {
    itemResults,
    grossPreviousAmount,
    grossCurrentAmount,
    grossCumulativeAmount,
    deductions: {
      securityDepositPct,
      securityDeposit,
      tdsPct,
      tdsAmount,
      gstTdsPct,
      gstTdsAmount,
      labourCessPct,
      labourCess,
      royaltyMurum,
      royaltySand,
      totalRoyalty,
      machineryAdvanceRecovery,
      otherDeductions,
      totalDeductions
    },
    netPayable
  };
}

/**
 * Calculates Sub-Contractor Billing with Back-to-Back Comparison against Department & Design
 */
export interface SubContractorItemInput {
  row: number;
  itemDescription: string;
  unit: string;
  deptTenderRate: number;      // Main contract rate from Table 1
  subContractorRate: number;   // Sub-contractor PO rate
  designQty: number;           // Design limit for this minor
  deptCertifiedQty: number;    // Quantity certified in Department bill
  siteActualQty: number;       // Measured quantity on site
  previousBilledQty: number;
  currentClaimedQty: number;
}

export interface SubContractorDeductionConfig {
  materialIssuesRecovery?: number;  // Pipes/Valves supplied by main contractor
  advanceRecoveryPct?: number;      // 10% default
  retentionPct?: number;            // 5% default
  tdsPct?: number;                  // 1% individual / 2% company
  dieselOrEquipCharges?: number;
  otherDebits?: number;
}

export function calculateSubContractorBill(
  items: SubContractorItemInput[],
  deductions: SubContractorDeductionConfig = {}
) {
  const {
    materialIssuesRecovery = 0,
    advanceRecoveryPct = 10,
    retentionPct = 5,
    tdsPct = 1,
    dieselOrEquipCharges = 0,
    otherDebits = 0
  } = deductions;

  let grossWorkDone = 0;
  let totalDeptEquivalent = 0;
  let hasOverClaim = false;
  let hasDesignExcess = false;

  const itemResults = items.map(it => {
    const cumulativeClaimed = (it.previousBilledQty || 0) + (it.currentClaimedQty || 0);
    const subAmount = (it.currentClaimedQty || 0) * (it.subContractorRate || 0);
    const deptAmount = (it.currentClaimedQty || 0) * (it.deptTenderRate || 0);
    const grossMargin = deptAmount - subAmount;
    const grossMarginPct = deptAmount > 0 ? (grossMargin / deptAmount) * 100 : 0;

    grossWorkDone += subAmount;
    totalDeptEquivalent += deptAmount;

    // Safety flags
    const isOverClaim = cumulativeClaimed > it.deptCertifiedQty && it.deptCertifiedQty > 0;
    const isDesignExcess = cumulativeClaimed > it.designQty && it.designQty > 0;

    if (isOverClaim) hasOverClaim = true;
    if (isDesignExcess) hasDesignExcess = true;

    return {
      ...it,
      cumulativeClaimed,
      subAmount,
      deptAmount,
      grossMargin,
      grossMarginPct,
      isOverClaim,
      isDesignExcess,
      status: isOverClaim ? 'OVER_CLAIM' : isDesignExcess ? 'DESIGN_EXCESS' : 'NORMAL'
    };
  });

  // Deductions
  const advanceRecovery = (grossWorkDone * advanceRecoveryPct) / 100;
  const retentionAmount = (grossWorkDone * retentionPct) / 100;
  const tdsAmount = (grossWorkDone * tdsPct) / 100;

  const totalDeductions =
    materialIssuesRecovery +
    advanceRecovery +
    retentionAmount +
    tdsAmount +
    dieselOrEquipCharges +
    otherDebits;

  const netPayable = Math.max(0, grossWorkDone - totalDeductions);
  const totalMargin = totalDeptEquivalent - grossWorkDone;

  return {
    itemResults,
    grossWorkDone,
    totalDeptEquivalent,
    totalMargin,
    totalMarginPct: totalDeptEquivalent > 0 ? (totalMargin / totalDeptEquivalent) * 100 : 0,
    hasOverClaim,
    hasDesignExcess,
    deductions: {
      materialIssuesRecovery,
      advanceRecoveryPct,
      advanceRecovery,
      retentionPct,
      retentionAmount,
      tdsPct,
      tdsAmount,
      dieselOrEquipCharges,
      otherDebits,
      totalDeductions
    },
    netPayable
  };
}
