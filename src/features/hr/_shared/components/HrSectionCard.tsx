'use client';

import type React from 'react';
import { cn } from '@/lib/utils';

interface HrSectionCardProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  noBodyPadding?: boolean;
}

export function HrSectionCard({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
  noBodyPadding,
}: HrSectionCardProps) {
  return (
    <div
      className={cn(
        'bg-card border-border overflow-hidden rounded-2xl border shadow-xs',
        className
      )}
    >
      {(title || action) && (
        <div className="border-border flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="min-w-0">
            {title && (
              <h2 className="text-foreground text-base font-bold tracking-tight">{title}</h2>
            )}
            {description && <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>}
          </div>
          {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </div>
      )}
      <div className={cn(noBodyPadding ? '' : 'p-4 sm:p-5', contentClassName)}>{children}</div>
    </div>
  );
}

export default HrSectionCard;
