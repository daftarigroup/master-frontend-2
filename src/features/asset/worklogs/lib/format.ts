import { fmtNum } from '@/features/asset/fleet/lib/format';
import type { ReadingUnit } from '@/features/asset/equipment/types';
import type { WorkLogStatus } from '../types';

/** "8:05 am" in IST. */
export const fmtClock = (iso: string | null | undefined): string =>
  iso ? new Date(iso).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true }) : '—';

/** 270 -> "4h 30m", 45 -> "45m". Null -> "—" (unknown is never shown as zero). */
export const fmtDuration = (minutes: number | null | undefined): string => {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) return '—';
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  return h === 0 ? `${m}m` : `${h}h ${String(m % 60).padStart(2, '0')}m`;
};

export const UNIT_SHORT: Record<ReadingUnit, string> = { HOURS: 'hrs', KM: 'km', NONE: '' };

export const fmtReading = (n: number | null | undefined, unit: ReadingUnit): string => (unit === 'NONE' || n === null || n === undefined ? '—' : fmtNum(n));

export const fmtLitres = (n: number | null | undefined): string => (n === null || n === undefined ? '—' : `${fmtNum(n)} L`);

export const STATUS_LABEL: Record<WorkLogStatus, string> = { PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected' };
export const STATUS_STYLE: Record<WorkLogStatus, string> = {
  APPROVED: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
  PENDING: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  REJECTED: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300',
};

export const addDays = (iso: string, n: number): string => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/** What the clock-vs-meter warning says (the meter is what hours and cost use). */
export const CLOCK_VARIANCE_HINT = 'The clock window differs from the meter by more than 10 minutes. The meter is used for hours and cost.';
