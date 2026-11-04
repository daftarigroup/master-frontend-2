// @ts-nocheck
// Rate Master & Item Mapping based on Table 1 Logic
// Dynamically looks up rates:
// - From Schedule - B Report for Department Billing
// - From PO (Purchase Order) for Sub-Contractor Billing
// - With Table 1 standard rates as fallback

import {
  getScheduleForMinor,
  getProductsByPONumber,
  getProjectOrMinor,
  getExternalPurchaseOrders
} from './storageManager';

export const STANDARD_TABLE1_PIPE_RATES: Record<number, { layingRate: number; supplyRate: number; unit: string }> = {
  110: { layingRate: 329.20, supplyRate: 329.20, unit: 'Rmt' },
  125: { layingRate: 394.90, supplyRate: 394.90, unit: 'Rmt' },
  140: { layingRate: 487.35, supplyRate: 487.35, unit: 'Rmt' },
  160: { layingRate: 616.95, supplyRate: 616.95, unit: 'Rmt' },
  180: { layingRate: 757.95, supplyRate: 757.95, unit: 'Rmt' },
  200: { layingRate: 922.40, supplyRate: 922.40, unit: 'Rmt' },
  225: { layingRate: 1171.00, supplyRate: 1171.00, unit: 'Rmt' },
  250: { layingRate: 1411.80, supplyRate: 1411.80, unit: 'Rmt' },
  280: { layingRate: 1762.25, supplyRate: 1762.25, unit: 'Rmt' },
  315: { layingRate: 2218.75, supplyRate: 2218.75, unit: 'Rmt' },
  355: { layingRate: 2779.40, supplyRate: 2779.40, unit: 'Rmt' },
  400: { layingRate: 3463.05, supplyRate: 3463.05, unit: 'Rmt' },
  450: { layingRate: 4297.20, supplyRate: 4297.20, unit: 'Rmt' },
  500: { layingRate: 5178.60, supplyRate: 5178.60, unit: 'Rmt' },
  560: { layingRate: 6183.15, supplyRate: 6183.15, unit: 'Rmt' },
  630: { layingRate: 7787.95, supplyRate: 7787.95, unit: 'Rmt' },
  710: { layingRate: 9747.20, supplyRate: 9747.20, unit: 'Rmt' },
  800: { layingRate: 12273.50, supplyRate: 12273.50, unit: 'Rmt' },
  900: { layingRate: 14199.65, supplyRate: 14199.65, unit: 'Rmt' } // PCCP
};

export const STANDARD_TABLE1_EARTHWORK_RATES = {
  deepTrenchExcavation: { code: '1A', rate: 158.50, unit: 'CUM', label: 'Excavation for deep trenches' },
  softStrataExcavation: { code: '2', rate: 106.00, unit: 'CUM', label: 'Excavation in soft strata' },
  murumBedding: { code: '3', rate: 242.90, unit: 'CUM', label: 'Murum bedding below pipe' },
  backfilling: { code: '4', rate: 47.30, unit: 'CUM', label: 'Backfilling of trench' },
  sandBedding: { code: '6', rate: 1276.25, unit: 'CUM', label: 'Sand bedding' },
  rubbleSoling: { code: '5', rate: 1973.00, unit: 'CUM', label: 'Rubble soling below' }
};

export const STANDARD_TABLE1_VALVE_RATES: Record<string, { rate: number; unit: string; label: string }> = {
  '50': { rate: 11173.65, unit: 'No', label: 'Air Valve 50 mm' },
  '80': { rate: 13033.05, unit: 'No', label: 'Air Valve 80 mm' },
  '100': { rate: 14297.55, unit: 'No', label: 'Air Valve 100 mm' },
  '150': { rate: 19768.75, unit: 'No', label: 'Air Valve 150 mm' },
  '200': { rate: 30815.10, unit: 'No', label: 'Air Valve 200 mm' },
  'default_valve': { rate: 14297.55, unit: 'No', label: 'Line Valve' }
};

export interface ResolvedRate {
  rate: number;
  source: string;
  unit: string;
  code?: string;
  poNumber?: string;
}

/**
 * Looks up rate for an item from Schedule - B Report (for Department Billing)
 */
export function getScheduleBRate(
  itemType: 'pipe' | 'excavation' | 'murum' | 'backfill' | 'valve' | 'sand',
  diaOrKey?: number | string,
  projectNo?: string
): ResolvedRate {
  const diaNum = Number(diaOrKey) || 0;

  // 1. Try uploaded Schedule - B Report for this project / minor
  if (projectNo) {
    const sched = getScheduleForMinor(projectNo);
    if (sched && sched.rows && Array.isArray(sched.rows) && sched.rows.length > 0) {
      const unitOf = (r: any) => String(r.Unit || r['Unit'] || r.unit || '').toLowerCase().trim();
      const descOf = (r: any) => String(r.Description || r['Description'] || r['Content / Description'] || r['Name of Item'] || '').toLowerCase();
      const diaRegex = diaNum > 0 ? new RegExp(`(^|[^\\d.])${diaNum}\\s*(mm|dia|nominal|$|[^\\d])`, 'i') : null;

      // Rows are matched on description + unit, first match in document order
      const match = sched.rows.find((r: any) => {
        const desc = descOf(r);
        const unit = unitOf(r);
        if (itemType === 'pipe' && diaNum > 0 && diaRegex) {
          const isLength = /^(rmt|rm|mtr|m|rmtr)$/.test(unit);
          return isLength && diaRegex.test(desc) && !/\bnp\d\b|rcc|r\.c\.c/.test(desc);
        }
        if (itemType === 'excavation') {
          return unit === 'cum' && /excavation for (deep )?trench|excavation/.test(desc) && !/murum bedding|back\s*filling/.test(desc);
        }
        if (itemType === 'murum') {
          return unit === 'cum' && /murum\s+bedding/.test(desc);
        }
        if (itemType === 'backfill') {
          return unit === 'cum' && /back\s*-?\s*filling the trench|backfilling the trench|refilling/.test(desc);
        }
        if (itemType === 'valve') {
          const isValveItem = (x: any) => unitOf(x) === 'no' && /valve/.test(descOf(x)) && !/valve shaft|valve tee/.test(descOf(x));
          const head = sched.rows.findIndex(isValveItem);
          if (head < 0) return false;
          if (!(diaNum > 0)) return r === sched.rows[head];
          // Valve sizes are listed as "NNN mm" sub-rows right under the valve item
          const idx = sched.rows.indexOf(r);
          return idx >= head && idx <= head + 12 && unit === 'no' && diaRegex!.test(desc);
        }
        return false;
      });

      if (match) {
        const rawRate = String(match['Rate (Figures)'] || match['Rate'] || match.rate || match['Rate (Words)'] || '')
          .replace(/\bAE\d*\b/g, ' ');
        const numMatch = rawRate.match(/\d[\d,]*(?:\.\d+)?/);
        let parsed = numMatch ? parseFloat(numMatch[0].replace(/,/g, '')) : 0;

        // Sanity check against the PDF's own Quantity x Rate = Amount; a stray token in the
        // rate cell (e.g. "AE1" -> 1) breaks it, so recover the rate from Amount / Quantity.
        const qty = parseFloat(String(match['Quantity'] ?? '').replace(/,/g, ''));
        const amt = parseFloat(String(match['Amount'] ?? '').replace(/,/g, ''));
        if (qty > 0 && amt > 0 && (!(parsed > 0) || Math.abs(qty * parsed - amt) / amt > 0.02)) {
          parsed = parseFloat((amt / qty).toFixed(2));
        }
        if (parsed > 0) {
          const itemNo = match['Item No'] || match.itemNo || '';
          const unit = match['Unit'] || match.unit || (itemType === 'pipe' ? 'Rmt' : 'CUM');
          return {
            rate: parsed,
            source: `Schedule - B Report${itemNo ? ` (${itemNo})` : ''}`,
            unit,
            code: itemNo || (itemType === 'pipe' ? `ITEM-7-${diaNum}` : undefined)
          };
        }
      }
    }

    // Check parent project if this is a minor
    const proj = getProjectOrMinor(projectNo);
    if (proj?.parentProjectNo && proj.parentProjectNo !== projectNo) {
      const parentRes = getScheduleBRate(itemType, diaOrKey, proj.parentProjectNo);
      if (parentRes.source.startsWith('Schedule - B Report')) {
        return parentRes;
      }
    }
  }

  // 2. Fallback to Table 1 Standard Schedule B rates
  if (itemType === 'pipe' && diaNum > 0 && STANDARD_TABLE1_PIPE_RATES[diaNum]) {
    return {
      rate: STANDARD_TABLE1_PIPE_RATES[diaNum].layingRate,
      source: 'Schedule - B (Table 1 Rate)',
      unit: STANDARD_TABLE1_PIPE_RATES[diaNum].unit,
      code: `ITEM-7-${diaNum}`
    };
  }

  if (itemType === 'excavation') {
    return {
      rate: STANDARD_TABLE1_EARTHWORK_RATES.deepTrenchExcavation.rate,
      source: 'Schedule - B (Table 1 Rate)',
      unit: STANDARD_TABLE1_EARTHWORK_RATES.deepTrenchExcavation.unit,
      code: 'ITEM-1A'
    };
  }

  if (itemType === 'murum') {
    return {
      rate: STANDARD_TABLE1_EARTHWORK_RATES.murumBedding.rate,
      source: 'Schedule - B (Table 1 Rate)',
      unit: STANDARD_TABLE1_EARTHWORK_RATES.murumBedding.unit,
      code: 'ITEM-3'
    };
  }

  if (itemType === 'backfill') {
    return {
      rate: STANDARD_TABLE1_EARTHWORK_RATES.backfilling.rate,
      source: 'Schedule - B (Table 1 Rate)',
      unit: STANDARD_TABLE1_EARTHWORK_RATES.backfilling.unit,
      code: 'ITEM-4'
    };
  }

  if (itemType === 'sand') {
    return {
      rate: STANDARD_TABLE1_EARTHWORK_RATES.sandBedding.rate,
      source: 'Schedule - B (Table 1 Rate)',
      unit: STANDARD_TABLE1_EARTHWORK_RATES.sandBedding.unit,
      code: 'ITEM-6'
    };
  }

  if (itemType === 'valve') {
    const valveConf = STANDARD_TABLE1_VALVE_RATES[String(diaOrKey)] || STANDARD_TABLE1_VALVE_RATES['default_valve'];
    return {
      rate: valveConf.rate,
      source: 'Schedule - B (Table 1 Rate)',
      unit: valveConf.unit,
      code: 'ITEM-9'
    };
  }

  return {
    rate: diaNum > 0 ? diaNum * 3.5 : 150,
    source: 'Schedule - B (Standard Rate)',
    unit: 'Rmt'
  };
}

/**
 * Backward compatibility alias for pipe laying rate from Schedule B
 */
export function getPipeRate(dia: number, projectNo?: string): number {
  return getScheduleBRate('pipe', dia, projectNo).rate;
}

/**
 * Discovers available POs for a project or subcontractor
 */
export function getAvailablePOsForProject(
  projectNo?: string,
  subContractorName?: string
): Array<{ poNumber: string; vendorName: string; date?: string; type: string }> {
  const list: Array<{ poNumber: string; vendorName: string; date?: string; type: string }> = [];
  const seen = new Set<string>();

  const addPo = (poNumber?: string, vendorName = '', date = '', type = 'Standard') => {
    if (!poNumber) return;
    const clean = String(poNumber).trim();
    if (!clean || seen.has(clean)) return;
    seen.add(clean);
    list.push({ poNumber: clean, vendorName: vendorName || 'Sub-Contractor', date, type });
  };

  if (projectNo) {
    const proj = getProjectOrMinor(projectNo);
    if (proj?.poNumber) addPo(proj.poNumber, proj.contractorName, '', 'Project PO');

  }

  // External PO master
  const extPos = getExternalPurchaseOrders();
  extPos.forEach((p: any) => {
    if (p.poNumber) {
      const vName = p.name || p.subContractorName || p.partyName || '';
      addPo(p.poNumber, vName, p.date, 'External PO');
    }
  });

  return list;
}

/**
 * Finds the PO Number associated with a project or sub-contractor
 */
export function resolvePoNumberForProject(projectNo?: string, subContractorName?: string): string {
  if (!projectNo && !subContractorName) return '';

  if (projectNo) {
    const proj = getProjectOrMinor(projectNo);
    if (proj?.poNumber) return proj.poNumber.trim();

  }

  // Check External PO master
  const extPos = getExternalPurchaseOrders();
  if (subContractorName) {
    const match = extPos.find((p: any) =>
      p.name?.toLowerCase().includes(subContractorName.toLowerCase()) ||
      p.subContractorName?.toLowerCase().includes(subContractorName.toLowerCase()) ||
      p.partyName?.toLowerCase().includes(subContractorName.toLowerCase())
    );
    if (match?.poNumber) return match.poNumber.trim();
  }

  if (extPos.length > 0 && extPos[0].poNumber) {
    return extPos[0].poNumber.trim();
  }

  return '';
}

/**
 * Looks up rate for an item from PO (Purchase Order) (for Sub-Contractor Billing)
 */
export function getPORate(
  itemType: 'pipe' | 'excavation' | 'murum' | 'backfill' | 'valve' | 'sand',
  diaOrKey?: number | string,
  projectNo?: string,
  explicitPoNumber?: string,
  subContractorName?: string
): ResolvedRate {
  const diaNum = Number(diaOrKey) || 0;
  const poNum = (explicitPoNumber || resolvePoNumberForProject(projectNo, subContractorName) || '').trim();

  // 1. Try finding in PO products
  if (poNum) {
    const diaRegex = diaNum > 0 ? new RegExp(`\\b${diaNum}\\b|${diaNum}\\s*mm`, 'i') : null;
    const products = getProductsByPONumber(poNum);

    if (products && products.length > 0) {
      const match = products.find((p: any) => {
        const prod = String(p.product || p.productName || p.description || p.internalCode || '').toLowerCase();
        if (itemType === 'pipe' && diaNum > 0 && diaRegex) {
          return diaRegex.test(prod) || prod.includes(String(diaNum));
        }
        if (itemType === 'excavation') {
          return prod.includes('excav') || prod.includes('trench') || prod.includes('earth');
        }
        if (itemType === 'murum' || itemType === 'sand') {
          return prod.includes('sand') || prod.includes('gravel') || prod.includes('bedding') || prod.includes('murum');
        }
        if (itemType === 'backfill') {
          return prod.includes('backfill') || prod.includes('filling');
        }
        if (itemType === 'valve') {
          return prod.includes('valve') || prod.includes('vlv');
        }
        return false;
      });

      if (match && Number(match.rate) > 0) {
        return {
          rate: Number(match.rate),
          source: `PO #${poNum}`,
          unit: match.unit || (itemType === 'pipe' ? 'Rmt' : 'CUM'),
          code: match.internalCode || `PO-${match.sn || 1}`,
          poNumber: poNum
        };
      }
    }
  }

  // 2. Not on the PO: leave the rate blank (0) so the user enters it manually
  const scheduleB = getScheduleBRate(itemType, diaOrKey, projectNo);
  return {
    rate: 0,
    source: poNum ? `PO #${poNum} (not on PO)` : 'No PO linked',
    unit: scheduleB.unit,
    code: scheduleB.code ? `PO-${scheduleB.code}` : undefined,
    poNumber: poNum || undefined
  };
}
