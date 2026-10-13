import { cn } from '@/lib/utils';
import type { OwnershipType } from '../types/types';

/** Owned / Rented chip used on every asset and machine row, card and detail header. */
export function OwnershipBadge({ value, className }: { value?: OwnershipType | string | null; className?: string }) {
  const rented = value === 'RENTED';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
        rented
          ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
          : 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
        className
      )}
    >
      {rented ? 'Rented' : 'Owned'}
    </span>
  );
}

export default OwnershipBadge;
