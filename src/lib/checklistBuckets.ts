/**
 * Shared time-bucketing helpers for the Checklist & Delegation module.
 *
 * Pure client-side grouping over data already fetched via `useChecklistData()`
 * — mirrors the Overdue/Today/Upcoming convention used across the reference
 * checklist app's delegation/checklist submission screens.
 */

export type TimeBucket = 'Overdue' | 'Today' | 'Upcoming';

export const TIME_BUCKET_ORDER: TimeBucket[] = ['Overdue', 'Today', 'Upcoming'];

export function toDateOnly(value: string | null | undefined): Date | null {
    if (!value) return null;
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d;
}

export function getTimeBucket(planned: Date | null, today: Date = new Date()): TimeBucket {
    const t = new Date(today);
    t.setHours(0, 0, 0, 0);
    if (!planned) return 'Upcoming';
    if (planned.getTime() < t.getTime()) return 'Overdue';
    if (planned.getTime() === t.getTime()) return 'Today';
    return 'Upcoming';
}

/**
 * Groups a list of rows into Overdue / Today / Upcoming buckets based on a
 * caller-supplied date accessor (e.g. `row.planned_date || row.task_start_date`).
 */
export function groupByTimeBucket<T>(
    rows: T[],
    getDate: (row: T) => string | null | undefined
): Record<TimeBucket, T[]> {
    const groups: Record<TimeBucket, T[]> = { Overdue: [], Today: [], Upcoming: [] };
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    rows.forEach((row) => {
        const planned = toDateOnly(getDate(row));
        groups[getTimeBucket(planned, today)].push(row);
    });

    return groups;
}
