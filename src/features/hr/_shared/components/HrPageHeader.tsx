'use client';

import type React from 'react';
import { cn } from '@/lib/utils';

interface HrPageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
}

export function HrPageHeader({ title, description, action, meta, className }: HrPageHeaderProps) {
  return (
    <div className={cn('bg-card border-border rounded-2xl border shadow-xs', className)}>
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="min-w-0">
          <h1 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
          {description && <p className="text-muted-foreground mt-1 text-sm">{description}</p>}
        </div>
        {(meta || action) && (
          <div className="flex shrink-0 items-center gap-3">
            {meta}
            {action}
          </div>
        )}
      </div>
    </div>
  );
}

export default HrPageHeader;
