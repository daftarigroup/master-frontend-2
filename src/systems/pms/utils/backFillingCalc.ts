// @ts-nocheck
import { buildChainageDiffMap } from './helpers';

const num = (v) => {
  const n = parseFloat(v);
  return Number.isNaN(n) ? 0 : n;
};
const round2 = (v) => Math.round((v + Number.EPSILON) * 100) / 100;

const MURUM_THICKNESS = 0.3;

// Back Filling Value = (Soft Strata Qty + Hard Strata Qty) - Murum Bedding Qty - Pipe Area x Length.
// Uses the same per-row rules as the Excavation & Murum page: every quantity depends on the row
// above (by Serial No), so the new entry is slotted among the project's saved entries first.
// `entries` are the project's saved executions; `current` is the entry being filled in.
export const computeBackFillingValue = (entries, current) => {
  const others = entries.filter(e => e.serialNo !== current.serialNo && e.id !== current.id);
  const list = [...others, current].sort((a, b) => (a.serialNo ?? 0) - (b.serialNo ?? 0));
  const diffMap = buildChainageDiffMap(list, e => e.execution?.chainage, e => e.id ?? 'current');

  let prev = null;
  let result = null;
  list.forEach(entry => {
    const key = entry.id ?? 'current';
    const length = diffMap.get(key) ?? 0;
    const pipeDia = num(entry.execution?.pipeDia);
    const depthOfEx = num(entry.execution?.elevation) - num(entry.design?.cuttingLevel);
    const hardRock = entry.isHardRock ? num(entry.hardRockValue) : 0;
    const softRock = depthOfEx - hardRock;
    const width = round2(1.5 * (pipeDia / 1000) + 0.3);
    const area = round2(softRock * width);
    const area2 = round2(hardRock * width);
    const murumArea = width * MURUM_THICKNESS * 1.1;

    const meanArea = (area + (prev ? prev.area : 0)) / 2;
    const meanArea2 = (area2 + (prev ? prev.area2 : 0)) / 2;
    const softQty = round2(meanArea * length);
    const hardQty = round2(meanArea2 * length);
    const murumQty = length * ((murumArea + (prev ? prev.murumArea : 0)) / 2);
    const pipeAreaQty = (Math.PI / 4) * Math.pow(pipeDia / 1000, 2) * length;

    if (entry === current) {
      result = softQty + hardQty - murumQty - pipeAreaQty;
    }
    prev = { area, area2, murumArea };
  });
  return result;
};
