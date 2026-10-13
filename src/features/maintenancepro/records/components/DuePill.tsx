import { cn } from '@/lib/utils';
import { DUE_STYLE, dueText } from '../lib/due';
import type { NextService } from '../types';

/** "250 Hrs Left" (amber / green), "Overdue by 250 Hrs" (red), "Set last service" or "Not set" (grey). */
export function DuePill({ due, className }: { due: NextService; className?: string }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold leading-none', DUE_STYLE[due.status], className)}>
      {dueText(due)}
    </span>
  );
}

export default DuePill;
