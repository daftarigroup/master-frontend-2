import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const TONE = {
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300',
  red: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
  violet: 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300',
  slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
} as const;
export type KpiTone = keyof typeof TONE;

interface Props {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  tone?: KpiTone;
  /** small line under the value (a change, a count, a note) */
  sub?: ReactNode;
  /** tiles that filter a list are buttons; the active one is ringed */
  onClick?: () => void;
  active?: boolean;
  /** phone tiles are narrow: hide the icon below `sm` so the label is not truncated */
  hideIconOnPhone?: boolean;
  className?: string;
}

/** The one stat tile for the work-log, assignment and records screens (the Equipment Master keeps its own older tile). */
export function KpiTile({ label, value, icon: Icon, tone = 'slate', sub, onClick, active, hideIconOnPhone, className }: Props) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-pressed={onClick ? !!active : undefined}
      className={cn(
        'flex min-w-0 flex-col gap-1 rounded-xl border bg-card p-2.5 text-left shadow-xs sm:p-3',
        onClick && 'cursor-pointer transition-colors hover:border-primary/50',
        active && 'border-primary ring-1 ring-primary',
        className,
      )}
    >
      <span className="flex items-center gap-1.5">
        {Icon && (
          <span className={cn('size-6 shrink-0 place-items-center rounded-md', hideIconOnPhone ? 'hidden sm:grid' : 'grid', TONE[tone])}>
            <Icon className="size-3.5" aria-hidden />
          </span>
        )}
        <span className="truncate text-[11px] font-medium text-muted-foreground sm:text-xs">{label}</span>
      </span>
      <span className="truncate text-lg font-bold leading-none tabular-nums sm:text-xl">{value}</span>
      {sub && <span className="truncate text-[11px] leading-tight text-muted-foreground">{sub}</span>}
    </Comp>
  );
}
