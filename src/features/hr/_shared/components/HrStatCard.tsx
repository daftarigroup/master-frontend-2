'use client';

import type React from 'react';
import { cn } from '@/lib/utils';

type Tone =
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'muted'
  | 'chart-1'
  | 'chart-2'
  | 'chart-3'
  | 'chart-4'
  | 'chart-5';

const toneClasses: Record<Tone, { iconBg: string; iconText: string }> = {
  primary: { iconBg: 'bg-primary/10', iconText: 'text-primary' },
  success: { iconBg: 'bg-success/10', iconText: 'text-success' },
  warning: { iconBg: 'bg-warning/10', iconText: 'text-warning' },
  danger: { iconBg: 'bg-danger/10', iconText: 'text-danger' },
  info: { iconBg: 'bg-info/10', iconText: 'text-info' },
  muted: { iconBg: 'bg-muted', iconText: 'text-muted-foreground' },
  'chart-1': { iconBg: 'bg-chart-1/10', iconText: 'text-chart-1' },
  'chart-2': { iconBg: 'bg-chart-2/10', iconText: 'text-chart-2' },
  'chart-3': { iconBg: 'bg-chart-3/10', iconText: 'text-chart-3' },
  'chart-4': { iconBg: 'bg-chart-4/10', iconText: 'text-chart-4' },
  'chart-5': { iconBg: 'bg-chart-5/10', iconText: 'text-chart-5' },
};

interface HrStatCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: Tone;
  hint?: string;
  className?: string;
}

export function HrStatCard({
  label,
  value,
  icon: Icon,
  tone = 'primary',
  hint,
  className,
}: HrStatCardProps) {
  const t = toneClasses[tone];
  return (
    <div
      className={cn(
        'bg-card border-border rounded-2xl border p-4 shadow-xs transition-all duration-200 hover:shadow-md hover:border-primary/30',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            {label}
          </p>
          <p className="text-foreground mt-1.5 text-2xl font-bold tabular-nums sm:text-3xl">
            {value}
          </p>
          {hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
        </div>
        {Icon && (
          <div className={cn('rounded-xl p-2.5 shrink-0', t.iconBg)}>
            <Icon className={cn('h-5 w-5', t.iconText)} />
          </div>
        )}
      </div>
    </div>
  );
}

export default HrStatCard;
