import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
    value?: number;
    /** Tailwind background class for the filled indicator, e.g. "bg-emerald-500". Defaults to bg-primary. */
    progressColor?: string;
}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
    ({ className, value = 0, progressColor, ...props }, ref) => (
        <div
            ref={ref}
            className={cn('relative h-4 w-full overflow-hidden rounded-full bg-secondary', className)}
            {...props}
        >
            <div
                className={cn('h-full w-full flex-1 transition-all', progressColor ?? 'bg-primary')}
                style={{ transform: `translateX(-${100 - Math.min(100, Math.max(0, value || 0))}%)` }}
            />
        </div>
    )
);
Progress.displayName = 'Progress';
