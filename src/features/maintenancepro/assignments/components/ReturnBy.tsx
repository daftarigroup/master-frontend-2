import { fmtDay } from '@/features/asset/fleet/lib/format';
import type { AssignmentRow } from '../types';

/** "Return by {date}", red when overdue. For a hired machine, overdue means extra rent, which the tooltip says. */
export function ReturnBy({ row, prefix = true }: { row: AssignmentRow; prefix?: boolean }) {
  const a = row.assignment;
  if (!a?.expectedReturnAt) return <span className="text-muted-foreground">No return date</span>;
  const date = fmtDay(a.expectedReturnAt);
  if (!a.returnOverdue) return <span>{prefix ? `Return by ${date}` : date}</span>;
  const hint = row.machine.ownershipType === 'RENTED' ? 'Return overdue: this hired machine is running past its return date, so extra rent applies.' : 'Return overdue: this machine is past its expected return date.';
  return (
    <span title={hint} className="font-medium text-red-600 dark:text-red-400">
      Return overdue{prefix ? '' : ':'} {date}
      <span className="sr-only">. {hint}</span>
    </span>
  );
}
