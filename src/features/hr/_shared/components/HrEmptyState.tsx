'use client';

import type React from 'react';
import { cn } from '@/lib/utils';

interface HrEmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function HrEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: HrEmptyStateProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}
    >
      {Icon && (
        <div className="bg-muted/60 mb-4 rounded-full p-3.5">
          <Icon className="text-muted-foreground h-7 w-7" />
        </div>
      )}
      <p className="text-foreground text-sm font-bold">{title}</p>
      {description && <p className="text-muted-foreground mt-1 max-w-md text-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export default HrEmptyState;
