import type { ReactNode } from 'react';
import { AlertTriangle, CalendarClock, CalendarCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TimeBucket } from '@/lib/checklistBuckets';

const BUCKET_STYLES: Record<TimeBucket, { border: string; text: string; bg: string; icon: typeof AlertTriangle }> = {
    Overdue: { border: 'border-l-red-500', text: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/20', icon: AlertTriangle },
    Today: { border: 'border-l-amber-500', text: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/20', icon: CalendarClock },
    Upcoming: { border: 'border-l-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/20', icon: CalendarCheck },
};

interface TimeBucketSectionProps {
    bucket: TimeBucket;
    count: number;
    children: ReactNode;
    emptyLabel?: string;
}

/**
 * Section header + accent-bordered wrapper for the Overdue/Today/Upcoming
 * grouping pattern shared by ChecklistSubmission and DelegationSubmission.
 */
export default function TimeBucketSection({ bucket, count, children, emptyLabel = 'No tasks' }: TimeBucketSectionProps) {
    const style = BUCKET_STYLES[bucket];
    const Icon = style.icon;

    return (
        <div className={cn('rounded-lg border border-l-4 overflow-hidden', style.border)}>
            <div className={cn('flex items-center gap-2 px-4 py-2.5', style.bg)}>
                <Icon className={cn('size-4', style.text)} />
                <h3 className={cn('text-sm font-bold', style.text)}>{bucket}</h3>
                <span className={cn('text-xs font-semibold rounded-full px-2 py-0.5 bg-background/70', style.text)}>{count}</span>
            </div>
            <div className="p-3 space-y-2 bg-background">
                {count === 0 ? (
                    <p className="text-xs text-muted-foreground italic px-1 py-1">{emptyLabel}</p>
                ) : (
                    children
                )}
            </div>
        </div>
    );
}
