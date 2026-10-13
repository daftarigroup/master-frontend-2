import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Delta } from '../types';

const TONE = {
  good: 'text-emerald-700 dark:text-emerald-400',
  bad: 'text-red-700 dark:text-red-400',
  neutral: 'text-muted-foreground',
};

/** Change vs the comparison period. The colour comes from the server (more spend is bad, more hours is good); no data shows nothing. */
export function DeltaBadge({ delta, label, showLabel = false, className }: { delta: Delta | null | undefined; label?: string; showLabel?: boolean; className?: string }) {
  if (!delta || delta.value === null || delta.direction === null) {
    return <span className={cn('text-[11px] text-muted-foreground', className)}>{showLabel ? 'No comparison data' : '—'}</span>;
  }
  const Icon = delta.direction === 'up' ? ArrowUp : delta.direction === 'down' ? ArrowDown : Minus;
  const text = delta.kind === 'points' ? `${Math.abs(delta.value)} pts` : `${Math.abs(delta.value)}%`;
  const word = delta.direction === 'up' ? 'up' : delta.direction === 'down' ? 'down' : 'unchanged';
  return (
    <span className={cn('inline-flex items-center gap-0.5 whitespace-nowrap text-[11px] font-semibold tabular-nums', TONE[delta.tone], className)} aria-label={`${word} ${text}${label ? ` ${label}` : ''}`}>
      <Icon className="size-3" aria-hidden />
      {text}
      {showLabel && label && <span className="ml-1 font-normal text-muted-foreground">{label}</span>}
    </span>
  );
}
