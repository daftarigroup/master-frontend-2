import { cn } from '@/lib/utils';
import { DOC_PILL_LABEL, STATUS_LABEL, type DocPillStatus } from '../lib/labels';
import type { DerivedStatus } from '../types';

// Document states share this palette: Valid green, Expiring Soon amber, Expired red, Latest blue, No expiry neutral.

// One palette across the app: In Use green, Available blue, Idle amber, Under Maint. red, In Transit purple. Dark variants on all.
const STYLES: Record<DerivedStatus | DocPillStatus, string> = {
  IN_USE: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
  IDLE: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  UNDER_MAINT: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300',
  AVAILABLE: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300',
  IN_TRANSIT: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-300',
  VALID: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
  EXPIRING_SOON: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  EXPIRED: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300',
  LATEST: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300',
  NO_EXPIRY: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
};

export function StatusPill({ status, size = 'sm', className }: { status: DerivedStatus | DocPillStatus; size?: 'sm' | 'md'; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center whitespace-nowrap rounded-full border font-semibold leading-none',
        size === 'md' ? 'px-2.5 py-1 text-xs' : 'px-2 py-1 text-[11px]',
        STYLES[status],
        className,
      )}
    >
      {status in DOC_PILL_LABEL ? DOC_PILL_LABEL[status as DocPillStatus] : STATUS_LABEL[status as DerivedStatus]}
    </span>
  );
}

export default StatusPill;
