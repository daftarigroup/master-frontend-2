// @ts-nocheck
/**
 * Acceptance Tests for Planned vs Executed (RA Planning) Core Calculations
 */

import {
  calculateRAPlanningEngine
} from '@/systems/pms/utils/raPlanningEngine';
import {
  getInitialRAPlanningSeedState
} from '@/systems/pms/utils/raPlanningStorage';

export interface TestResult {
  name: string;
  passed: boolean;
  actual?: any;
  expected?: any;
  error?: string;
}

export function runRAPlanningAcceptanceTests(): TestResult[] {
  const results: TestResult[] = [];
  const seedState = getInitialRAPlanningSeedState();
  const result = calculateRAPlanningEngine(
    seedState.minors,
    seedState.surveyRowsByMinor,
    seedState.adjustments,
    seedState.plannedByBill,
    seedState.cadExecuted,
    seedState.inputs,
    seedState.overridePDNByMinor
  );

  // Helper check
  const checkClose = (val: number, expected: number, tol = 0.2): boolean => {
    return Math.abs(val - expected) <= tol;
  };

  // 1. PDN executed totals per minor
  try {
    const inj = result.pdn_blocks['minor-injewada'].total_executed;
    const sarp = result.pdn_blocks['minor-sarpewada'].total_executed;
    const k1 = result.pdn_blocks['minor-koka1'].total_executed;
    const k2 = result.pdn_blocks['minor-koka2'].total_executed;
    const son = result.pdn_blocks['minor-sonkund'].total_executed;
    const pal = result.pdn_blocks['minor-palora'].total_executed;
    const grand = result.total_pdn_executed_grand;

    const p1 = checkClose(inj, 4804.252);
    const p2 = checkClose(sarp, 1918.225);
    const p3 = checkClose(k1, 1256.457);
    const p4 = checkClose(k2, 2979.383);
    const p5 = checkClose(son, 6714.677);
    const p6 = checkClose(pal, 17335.545);
    const p7 = checkClose(grand, 35008.5);

    results.push({
      name: '1. PDN Executed Totals per Minor (Injewada 4804.252, Palora 17335.545, Total 35008.5 m)',
      passed: p1 && p2 && p3 && p4 && p5 && p6 && p7,
      actual: { inj, sarp, k1, k2, son, pal, grand },
      expected: { inj: 4804.252, sarp: 1918.225, k1: 1256.457, k2: 2979.383, son: 6714.677, pal: 17335.545, grand: 35008.5 }
    });
  } catch (e: any) {
    results.push({ name: '1. PDN Executed Totals per Minor', passed: false, error: e.message });
  }

  // 2. PDN Planned Totals and Completion Ratios
  try {
    const inj = result.pdn_blocks['minor-injewada'];
    const pal = result.pdn_blocks['minor-palora'];

    const pInjPlan = checkClose(inj.total_planned, 4238.0);
    const pInjRatio = inj.completion_ratio === 113.4;
    const pPalPlan = checkClose(pal.total_planned, 12689.51);
    const pPalRatio = pal.completion_ratio === 136.6;

    results.push({
      name: '2. PDN Planned Totals & Ratios (Injewada 4238 m -> 113.4%, Palora 12689.51 m -> 136.6%)',
      passed: pInjPlan && pInjRatio && pPalPlan && pPalRatio,
      actual: { injPlan: inj.total_planned, injRatio: inj.completion_ratio, palPlan: pal.total_planned, palRatio: pal.completion_ratio },
      expected: { injPlan: 4238.0, injRatio: 113.4, palPlan: 12689.51, palRatio: 136.6 }
    });
  } catch (e: any) {
    results.push({ name: '2. PDN Planned Totals & Ratios', passed: false, error: e.message });
  }

  // 3. Injewada PDN Balances
  try {
    const inj = result.pdn_blocks['minor-injewada'];
    const b140 = checkClose(inj.balance_per_dia[140], 375.5);
    const b160 = checkClose(inj.balance_per_dia[160], -185.9);
    const b180 = checkClose(inj.balance_per_dia[180], -573.0);

    results.push({
      name: '3. Injewada PDN Balances (140 mm: +375.5, 160 mm: -185.9, 180 mm: -573.0)',
      passed: b140 && b160 && b180,
      actual: { b140: inj.balance_per_dia[140], b160: inj.balance_per_dia[160], b180: inj.balance_per_dia[180] },
      expected: { b140: 375.5, b160: -185.9, b180: -573.0 }
    });
  } catch (e: any) {
    results.push({ name: '3. Injewada PDN Balances', passed: false, error: e.message });
  }

  // 4. CAD Executed vs Planned and Balances
  try {
    const injCad = result.cad_blocks['minor-injewada'];
    const sarpCad = result.cad_blocks['minor-sarpewada'];
    const k1Cad = result.cad_blocks['minor-koka1'];
    const k2Cad = result.cad_blocks['minor-koka2'];
    const sonCad = result.cad_blocks['minor-sonkund'];
    const palCad = result.cad_blocks['minor-palora'];

    const c1 = checkClose(injCad.balance_per_dia[140], 631.8);
    const c2 = checkClose(sarpCad.balance_per_dia[140], -718.5);
    const c3 = checkClose(k1Cad.balance_per_dia[125], -123.9);
    const c4 = checkClose(k2Cad.balance_per_dia[140], -1281.1);
    const c5 = checkClose(sonCad.balance_per_dia[125], 2176.5);
    const c6 = checkClose(sonCad.balance_per_dia[140], -748.3);
    const c7 = checkClose(palCad.balance_per_dia[125], -2404.1) && palCad.zero_plan_warn_per_dia[125] === true;

    results.push({
      name: '4. CAD Executed vs Planned (Inj 140: +631.8, Sarp 140: -718.5, Pal 125: -2404.1 with zero-plan warning)',
      passed: c1 && c2 && c3 && c4 && c5 && c6 && c7,
      actual: {
        inj140: injCad.balance_per_dia[140],
        sarp140: sarpCad.balance_per_dia[140],
        k1_125: k1Cad.balance_per_dia[125],
        k2_140: k2Cad.balance_per_dia[140],
        son125: sonCad.balance_per_dia[125],
        son140: sonCad.balance_per_dia[140],
        pal125: palCad.balance_per_dia[125],
        palWarn: palCad.zero_plan_warn_per_dia[125]
      },
      expected: { inj140: 631.8, sarp140: -718.5, k1_125: -123.9, k2_140: -1281.1, son125: 2176.5, son140: -748.3, pal125: -2404.1, palWarn: true }
    });
  } catch (e: any) {
    results.push({ name: '4. CAD Executed vs Planned', passed: false, error: e.message });
  }

  // 5. TOTAL UPTO DATE WORK DONE
  try {
    const tot125 = checkClose(result.total_upto_date_executed_per_dia[125], 10852.3);
    const tot140 = checkClose(result.total_upto_date_executed_per_dia[140], 18744.4);
    const grand = checkClose(result.total_upto_date_grand, 53772.4);

    results.push({
      name: '5. TOTAL UPTO DATE (executed PDN + CAD: 125 mm = 10852.3 m, 140 mm = 18744.4 m, Grand Total = 53772.4 m)',
      passed: tot125 && tot140 && grand,
      actual: { tot125: result.total_upto_date_executed_per_dia[125], tot140: result.total_upto_date_executed_per_dia[140], grand: result.total_upto_date_grand },
      expected: { tot125: 10852.3, tot140: 18744.4, grand: 53772.4 }
    });
  } catch (e: any) {
    results.push({ name: '5. TOTAL UPTO DATE WORK DONE', passed: false, error: e.message });
  }

  return results;
}
