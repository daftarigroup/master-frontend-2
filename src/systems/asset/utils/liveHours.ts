import type { AssetLifecycleStatus, AssetOperationalStatus } from '../types';

/**
 * Projects "live" running hours forward from the asset's initial entry date, so the
 * displayed figure keeps ticking up between edits instead of only reflecting the last
 * value a technician logged. Frozen once the asset is inactive or not currently running.
 */
export function calculateLiveRunningHours(
  initialDate?: string | null,
  baseHours: number | string = 0,
  status: AssetLifecycleStatus | string = 'Active',
  operationalStatus: AssetOperationalStatus | string = 'Running'
): string {
  const base = Number(baseHours) || 0;
  if (!initialDate) return base.toFixed(1);

  if (status === 'Inactive' || operationalStatus === 'Breakdown' || operationalStatus === 'Idle') {
    return base.toFixed(1);
  }

  const start = new Date(initialDate).getTime();
  const now = Date.now();
  if (Number.isNaN(start) || start > now) return base.toFixed(1);

  const elapsedHours = (now - start) / (1000 * 60 * 60);
  const total = base + elapsedHours;
  return total.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
