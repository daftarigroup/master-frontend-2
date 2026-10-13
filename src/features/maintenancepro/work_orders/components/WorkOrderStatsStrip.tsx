import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useWorkOrderCount } from '../server/tanstackQuery/useWorkOrderActions';

/** Four small counts (server totals, limit 1) so they are correct regardless of the page size. */
export function WorkOrderStatsStrip({ firmId }: { firmId?: string }) {
  const open = useWorkOrderCount({ firmId, status: 'PENDING' });
  const overdue = useWorkOrderCount({ firmId, overdue: true });
  const inProgress = useWorkOrderCount({ firmId, status: 'IN_PROGRESS' });
  const outsourced = useWorkOrderCount({ firmId, outsourced: true });

  const items = [
    { label: 'Open', value: open.data, tone: '' },
    { label: 'Overdue', value: overdue.data, tone: 'text-red-600 dark:text-red-400' },
    { label: 'In progress', value: inProgress.data, tone: 'text-blue-600 dark:text-blue-400' },
    { label: 'Outsourced', value: outsourced.data, tone: 'text-amber-700 dark:text-amber-400' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((s) => (
        <Card key={s.label} className="p-3">
          <div className="text-xs text-muted-foreground">{s.label}</div>
          <div className={cn('text-2xl font-bold tabular-nums', s.tone)}>{s.value ?? '-'}</div>
        </Card>
      ))}
    </div>
  );
}
