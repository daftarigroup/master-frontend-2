// @ts-nocheck
import {
  calculateFinalComparativeEngine
} from '@/systems/pms/utils/finalComparativeEngine';
import {
  getInitialFinalComparativeSeedState
} from '@/systems/pms/utils/finalComparativeStorage';

export interface TestResult {
  name: string;
  passed: boolean;
  actual?: any;
  expected?: any;
  error?: string;
}

export function runFinalComparativeAcceptanceTests(): TestResult[] {
  const results: TestResult[] = [];
  const state = getInitialFinalComparativeSeedState();
  const calculated = calculateFinalComparativeEngine(
    state.minors,
    state.surveyRowsByMinor,
    state.adjustments,
    state.cadExecutedByMinor,
    state.inputs,
    state.overridePDNByMinor
  );

  const isClose = (val: number, expected: number, tol = 0.2): boolean => {
    return Math.abs(val - expected) <= tol;
  };

  // 1. TOTAL PDN Acceptance Numbers
  try {
    const p110 = isClose(calculated.total_pdn_per_dia[110] || 0, 0);
    const p125 = isClose(calculated.total_pdn_per_dia[125], 5791.8);
    const p140 = isClose(calculated.total_pdn_per_dia[140], 5041.0);
    const p160 = isClose(calculated.total_pdn_per_dia[160], 1262.1);
    const p180 = isClose(calculated.total_pdn_per_dia[180], 2162.7);
    const p200 = isClose(calculated.total_pdn_per_dia[200], 2309.6);
    const pGrand = isClose(calculated.total_pdn_grand, 35008.5);

    results.push({
      name: '1. TOTAL PDN (110mm:0, 125mm:5791.8, 140mm:5041.0, 160mm:1262.1, 180mm:2162.7, 200mm:2309.6, Total: 35008.5m)',
      passed: p110 && p125 && p140 && p160 && p180 && p200 && pGrand,
      actual: {
        d110: calculated.total_pdn_per_dia[110] || 0,
        d125: calculated.total_pdn_per_dia[125],
        d140: calculated.total_pdn_per_dia[140],
        d160: calculated.total_pdn_per_dia[160],
        d180: calculated.total_pdn_per_dia[180],
        d200: calculated.total_pdn_per_dia[200],
        grand: calculated.total_pdn_grand
      },
      expected: { d110: 0, d125: 5791.8, d140: 5041.0, d160: 1262.1, d180: 2162.7, d200: 2309.6, grand: 35008.5 }
    });
  } catch (err: any) {
    results.push({ name: '1. TOTAL PDN', passed: false, error: err.message });
  }

  // 2. RECORDED UPTO RA2 & TO RECORD IN RA3
  try {
    const ra2Grand = isClose(calculated.recorded_upto_ra2_pdn_grand, 27695.9);
    const r125 = isClose(calculated.to_record_in_ra3_per_dia[125], 2863.3);
    const r140 = isClose(calculated.to_record_in_ra3_per_dia[140], -193.7);
    const r160 = isClose(calculated.to_record_in_ra3_per_dia[160], 242.1);
    const r180 = isClose(calculated.to_record_in_ra3_per_dia[180], 1273.0);
    const r200 = isClose(calculated.to_record_in_ra3_per_dia[200], -85.0);
    const ra3Grand = isClose(calculated.to_record_in_ra3_grand, 7312.6);

    results.push({
      name: '2. RECORDED RA2 (27695.9m) & TO RECORD RA3 (125mm:2863.3, 140mm:-193.7, 160mm:242.1, 180mm:1273.0, 200mm:-85.0, Total: 7312.6m)',
      passed: ra2Grand && r125 && r140 && r160 && r180 && r200 && ra3Grand,
      actual: {
        ra2Grand: calculated.recorded_upto_ra2_pdn_grand,
        r125: calculated.to_record_in_ra3_per_dia[125],
        r140: calculated.to_record_in_ra3_per_dia[140],
        r160: calculated.to_record_in_ra3_per_dia[160],
        r180: calculated.to_record_in_ra3_per_dia[180],
        r200: calculated.to_record_in_ra3_per_dia[200],
        ra3Grand: calculated.to_record_in_ra3_grand
      },
      expected: { ra2Grand: 27695.9, r125: 2863.3, r140: -193.7, r160: 242.1, r180: 1273.0, r200: -85.0, ra3Grand: 7312.6 }
    });
  } catch (err: any) {
    results.push({ name: '2. RECORDED RA2 & TO RECORD RA3', passed: false, error: err.message });
  }

  // 3. AS PER MEASUREMENT & PDN VS MEASUREMENT
  try {
    const m125 = isClose(calculated.measured_qty_per_dia[125], 5379.4);
    const m140 = isClose(calculated.measured_qty_per_dia[140], 4777.9);
    const m160 = isClose(calculated.measured_qty_per_dia[160], 1247.6);
    const m180 = isClose(calculated.measured_qty_per_dia[180], 1749.3);
    const m200 = isClose(calculated.measured_qty_per_dia[200], 2629.2);
    const m800 = isClose(calculated.measured_qty_per_dia[800], 1488.0);

    const diff125 = isClose(calculated.pdn_vs_measurement_per_dia[125], 412.4);
    const diff140 = isClose(calculated.pdn_vs_measurement_per_dia[140], 263.1);
    const diff160 = isClose(calculated.pdn_vs_measurement_per_dia[160], 14.5);
    const diff180 = isClose(calculated.pdn_vs_measurement_per_dia[180], 413.4);
    const diff200 = isClose(calculated.pdn_vs_measurement_per_dia[200], -319.6);

    results.push({
      name: '3. AS PER MEASUREMENT & PDN VS MEASUREMENT (+412.4, +263.1, +14.5, +413.4, -319.6)',
      passed: m125 && m140 && m160 && m180 && m200 && m800 && diff125 && diff140 && diff160 && diff180 && diff200,
      actual: {
        meas: { m125: calculated.measured_qty_per_dia[125], m140: calculated.measured_qty_per_dia[140], m800: calculated.measured_qty_per_dia[800] },
        diff: { d125: calculated.pdn_vs_measurement_per_dia[125], d140: calculated.pdn_vs_measurement_per_dia[140], d200: calculated.pdn_vs_measurement_per_dia[200] }
      },
      expected: {
        meas: { m125: 5379.4, m140: 4777.9, m800: 1488.0 },
        diff: { d125: 412.4, d140: 263.1, d200: -319.6 }
      }
    });
  } catch (err: any) {
    results.push({ name: '3. MEASUREMENT & DIFFERENCE', passed: false, error: err.message });
  }

  // 4. CADWM SECTION & GRAND TOTAL UPTO DATE
  try {
    const cad125 = isClose(calculated.total_cad_per_dia[125], 5060.5);
    const cad140 = isClose(calculated.total_cad_per_dia[140], 13703.4);
    const cadGrand = isClose(calculated.total_cad_grand, 18763.9);

    const recCad125 = isClose(calculated.recorded_upto_ra2_cad_per_dia[125], 4990.0);
    const recCad140 = isClose(calculated.recorded_upto_ra2_cad_per_dia[140], 11726.5);
    const recCadGrand = isClose(calculated.recorded_upto_ra2_cad_grand, 16716.5);

    const upto125 = isClose(calculated.total_upto_date_per_dia[125], 10852.3);
    const upto140 = isClose(calculated.total_upto_date_per_dia[140], 18744.4);
    const uptoGrand = isClose(calculated.total_upto_date_grand, 53772.4);

    results.push({
      name: '4. CADWM (125mm:5060.5, 140mm:13703.4, Tot:18763.9) & TOTAL UPTO DATE (53772.4m corrected grand total)',
      passed: cad125 && cad140 && cadGrand && recCad125 && recCad140 && recCadGrand && upto125 && upto140 && uptoGrand,
      actual: {
        cad125: calculated.total_cad_per_dia[125],
        cad140: calculated.total_cad_per_dia[140],
        cadGrand: calculated.total_cad_grand,
        uptoGrand: calculated.total_upto_date_grand
      },
      expected: { cad125: 5060.5, cad140: 13703.4, cadGrand: 18763.9, uptoGrand: 53772.4 }
    });
  } catch (err: any) {
    results.push({ name: '4. CADWM & TOTAL UPTO DATE', passed: false, error: err.message });
  }

  // 5. BILLING & AMOUNTS
  try {
    const ra1Amt = isClose(calculated.amount_as_per_ra1_grand, 2371384.5, 1.0);
    const upto125Amt = isClose(calculated.amount_upto_date_per_dia[125], 1085232.2, 1.0);
    const upto140Amt = isClose(calculated.amount_upto_date_per_dia[140], 2249323.7, 1.0);
    const uptoAmtGrand = isClose(calculated.amount_upto_date_grand, 4894806.2, 2.0);

    results.push({
      name: '5. BILLING AMOUNTS (RA1 Amount: ₹ 23,71,384.5, Upto Date Amount: ₹ 48,94,806.2 with 125mm:10,85,232.2 & 140mm:22,49,323.7)',
      passed: ra1Amt && upto125Amt && upto140Amt && uptoAmtGrand,
      actual: {
        ra1Amt: calculated.amount_as_per_ra1_grand,
        upto125Amt: calculated.amount_upto_date_per_dia[125],
        upto140Amt: calculated.amount_upto_date_per_dia[140],
        uptoAmtGrand: calculated.amount_upto_date_grand
      },
      expected: {
        ra1Amt: 2371384.5,
        upto125Amt: 1085232.2,
        upto140Amt: 2249323.7,
        uptoAmtGrand: 4894806.2
      }
    });
  } catch (err: any) {
    results.push({ name: '5. BILLING AMOUNTS', passed: false, error: err.message });
  }

  return results;
}
