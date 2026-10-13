import type { CostCategory, EntryCategory, LogKind, RateBasis, RateType, TileStatus } from '../types';

export const COST_CATEGORIES: CostCategory[] = ['fuel', 'maintenance', 'rental', 'other'];

/** One colour per category, used by tiles, donut and trend so a colour always means the same thing. */
export const CATEGORY_META: Record<CostCategory, { label: string; color: string }> = {
  fuel: { label: 'Fuel', color: '#f59e0b' },
  maintenance: { label: 'Maintenance', color: '#3b82f6' },
  rental: { label: 'Rental', color: '#8b5cf6' },
  other: { label: 'Other', color: '#10b981' },
};

export const ENTRY_LABEL: Record<EntryCategory, string> = {
  OPERATOR: 'Operator',
  TRANSPORT: 'Transport',
  INSURANCE: 'Insurance',
  CONSUMABLES: 'Consumables',
  RENTAL_INVOICE: 'Rental invoice',
  OTHER: 'Other',
};

export const BASIS_LABEL: Record<RateBasis, string> = { HOUR: 'per hour', DAY: 'per day', MONTH: 'per month', KM: 'per km' };
export const RATE_TYPE_LABEL: Record<RateType, string> = { INTERNAL_HOURLY: 'Internal charge-out', RENTAL: 'Rental' };

/** The short badge shown on a tile whose figure is not a plain measured number. Null = nothing to flag. */
export const TILE_BADGE: Partial<Record<TileStatus, { text: string; tone: 'warn' | 'info' | 'muted' }>> = {
  NO_RATE: { text: 'Set rate', tone: 'warn' },
  ESTIMATED: { text: 'Estimated', tone: 'info' },
  PARTIAL: { text: 'Partial', tone: 'warn' },
  INCLUDED: { text: 'Included in hire', tone: 'muted' },
  INVOICED: { text: 'Invoiced', tone: 'info' },
  NOT_APPLICABLE: { text: 'N/A (owned)', tone: 'muted' },
};

/** 'YYYY-MM' to 'May 2025'. */
export const monthLabel = (ym: string): string => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
};
export const monthShort = (ym: string): string => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-IN', { month: 'short', year: '2-digit', timeZone: 'UTC' });
};

export const downloadBlob = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};

export const LOG_TABS: Array<{ kind: LogKind; label: string }> = [
  { kind: 'usage', label: 'Usage logs' },
  { kind: 'diesel', label: 'Diesel logs' },
  { kind: 'maintenance', label: 'Maintenance' },
  { kind: 'entries', label: 'Cost entries' },
  { kind: 'rates', label: 'Rate card' },
];
