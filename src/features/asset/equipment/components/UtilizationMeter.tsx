import { cn } from '@/lib/utils';

interface Props {
  /** Whole-number percent, or null when it cannot be measured (shown as "—", never 0). */
  percent: number | null;
  /** The uncapped value was above 100: ran more than the shift. */
  overShift?: boolean;
  /**
   * text: label and number (cards). mini: number beside a thin bar (table rows). bar: number above a full bar (tiles, KPI strip).
   * Same component at every breakpoint; the parent chooses the variant.
   */
  variant?: 'text' | 'mini' | 'bar';
  label?: string;
  className?: string;
}

const tone = (p: number) => (p >= 70 ? 'bg-emerald-500' : p >= 40 ? 'bg-amber-500' : 'bg-red-500');

export function UtilizationMeter({ percent, overShift, variant = 'text', label = 'Utilization', className }: Props) {
  const value = percent === null ? '—' : `${percent}%`;
  const flag = overShift ? (
    <span className="ml-1 rounded bg-amber-100 px-1 py-px text-[9px] font-bold uppercase text-amber-800 dark:bg-amber-950 dark:text-amber-300" title="Ran more than the standard shift">
      over-shift
    </span>
  ) : null;

  if (variant === 'text') {
    return (
      <div className={cn('text-right leading-tight', className)}>
        <div className="text-[11px] text-muted-foreground">{label}</div>
        <div className="text-base font-bold tabular-nums">
          {value}
          {flag}
        </div>
      </div>
    );
  }

  const bar = (
    <div
      className={cn('h-1.5 overflow-hidden rounded-full bg-muted', variant === 'mini' ? 'w-12' : 'mt-1.5 w-full')}
      role="progressbar"
      aria-valuenow={percent ?? undefined}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className={cn('h-full rounded-full', percent === null ? 'bg-transparent' : tone(percent))} style={{ width: `${percent ?? 0}%` }} />
    </div>
  );

  if (variant === 'mini') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <span className="w-9 text-right text-sm font-semibold tabular-nums">{value}</span>
        {bar}
        {flag}
      </div>
    );
  }
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm font-bold tabular-nums">
          {value}
          {flag}
        </span>
      </div>
      {bar}
    </div>
  );
}

export default UtilizationMeter;
