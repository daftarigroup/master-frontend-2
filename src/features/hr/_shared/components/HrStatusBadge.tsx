'use client';

import type React from 'react';
import { cn } from '@/lib/utils';

export type HrStatusTone =
  | 'neutral'
  | 'info'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'muted';

const toneClasses: Record<HrStatusTone, string> = {
  neutral: 'bg-muted text-muted-foreground border-border',
  muted: 'bg-muted text-muted-foreground border-border',
  info: 'bg-info/10 text-info border-info/20',
  primary: 'bg-primary/10 text-primary border-primary/20',
  success: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/15 text-warning border-warning/25',
  danger: 'bg-danger/10 text-danger border-danger/20',
};

interface HrStatusBadgeProps {
  tone?: HrStatusTone;
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}

export function HrStatusBadge({
  tone = 'neutral',
  children,
  icon: Icon,
  className,
}: HrStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap',
        toneClasses[tone],
        className
      )}
    >
      {Icon && <Icon className="h-3 w-3 shrink-0" />}
      {children}
    </span>
  );
}

export default HrStatusBadge;
