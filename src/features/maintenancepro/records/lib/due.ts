import { formatQty } from '@/features/asset/equipment/lib/money';
import type { ReadingUnit } from '@/features/asset/equipment/types';
import type { DueStatus, DueUnit, NextService, Qty } from '../types';

export const DUE_LABEL: Record<DueStatus, string> = { OVERDUE: 'Overdue', DUE_SOON: 'Due soon', OK: 'OK', NOT_SET: 'Not set' };

/** Pill palette per due status; coloured pills always carry a dark variant. */
export const DUE_STYLE: Record<DueStatus, string> = {
  OVERDUE: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300',
  DUE_SOON: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  OK: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
  NOT_SET: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
};

const UNIT_LONG: Record<DueUnit, string> = { HOURS: 'Hours', KM: 'km', DAYS: 'Days' };
const UNIT_SHORT: Record<DueUnit, string> = { HOURS: 'Hrs', KM: 'km', DAYS: 'Days' };

export const qtyText = (q: Qty, short = false): string => `${formatQty(q.value, 0)} ${(short ? UNIT_SHORT : UNIT_LONG)[q.unit]}`;

/** A meter reading with its unit: "20,500 Hours". A machine without a meter shows a dash. */
export function readingText(value: number | null | undefined, unit: ReadingUnit): string {
  if (value === null || value === undefined || unit === 'NONE') return '—';
  return `${formatQty(value, 0)} ${unit === 'KM' ? 'km' : 'Hours'}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "2025-05-25" -> "25 May 2025" (the date is a calendar day, so no timezone shifts it). */
export function longDay(ymd: string | null | undefined): string {
  if (!ymd) return '—';
  const [y, m, d] = ymd.slice(0, 10).split('-').map(Number);
  return m >= 1 && m <= 12 ? `${d} ${MONTHS[m - 1]} ${y}` : ymd;
}

/** The pill text: "250 Hrs Left", "Overdue by 250 Hrs", "Set last service" or "Not set". */
export function dueText(d: NextService): string {
  if (d.status === 'NOT_SET') return 'Not set';
  if (d.missingBaseline) return 'Set last service';
  if (d.status === 'OVERDUE') return d.overdueBy ? `Overdue by ${qtyText(d.overdueBy, true)}` : 'Overdue';
  return d.left ? `${qtyText(d.left, true)} Left` : DUE_LABEL[d.status];
}

/** "in 250 Hours or by 25 May 2025" (or "overdue by 250 Hours"). Null when there is nothing to say. */
export function bannerText(d: NextService): string | null {
  if (d.status === 'NOT_SET') return null;
  const by = d.nextDueDate ? `by ${longDay(d.nextDueDate)}` : null;
  if (d.status === 'OVERDUE') return d.overdueBy ? `${qtyText(d.overdueBy)} overdue${by ? `, was due ${by.slice(3)}` : ''}` : by ? `was due ${by.slice(3)}` : null;
  const left = d.left ? `in ${qtyText(d.left)}` : null;
  return [left, by].filter(Boolean).join(' or ') || null;
}

/** "Every 250 Hours" / "Every 90 days" / both. */
export function intervalText(s: { intervalValue: number | null; intervalDays: number | null }, unit: ReadingUnit): string {
  const parts: string[] = [];
  if (s.intervalValue) parts.push(`${formatQty(s.intervalValue, 0)} ${unit === 'KM' ? 'km' : 'Hours'}`);
  if (s.intervalDays) parts.push(`${formatQty(s.intervalDays, 0)} Days`);
  return parts.length ? `Every ${parts.join(' or ')}` : '—';
}

/** Whole-number or empty-string input to number | undefined for request bodies. */
export const optNumber = (s: string): number | undefined => (s.trim() === '' || !Number.isFinite(Number(s)) ? undefined : Number(s));
