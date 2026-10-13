import type { MachineCost } from '../types';

/** How many things need attention this month (the badge on the Completeness section). */
export function completenessCount(c: MachineCost['completeness'], uncovered: boolean): number {
  return [c.missingInternalRate, c.missingRentalRate, c.rentalNotInvoiced, c.unpricedDieselLogs > 0, c.estimatedDieselLogs > 0, c.untaggedHours > 0, c.openUsageEntries > 0, uncovered].filter(Boolean).length;
}
