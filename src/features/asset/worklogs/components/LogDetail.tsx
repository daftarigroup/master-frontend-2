import { fmtDateTime } from '@/features/asset/fleet/lib/format';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { STATUS_LABEL } from '../lib/format';
import { useWorkLog } from '../server/useWorkLogQueries';
import type { WorkLog } from '../types';

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="min-w-0">
    <dt className="text-xs text-muted-foreground">{label}</dt>
    <dd className="break-words text-sm font-medium">{value || '—'}</dd>
  </div>
);

/** The expanded table row: the full record plus the status history (fetched only when opened). */
export function LogDetail({ log }: { log: WorkLog }) {
  const q = useWorkLog(log.id);
  return (
    <div className="space-y-3 p-4">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
        <Field label="Machine" value={`${log.machine.name}${log.machine.assetCode ? ` (${log.machine.assetCode})` : ''}`} />
        <Field label="Location" value={log.locationText} />
        <Field label="Work type" value={log.workType?.name} />
        <Field label="WBS activity" value={log.wbs ? `${log.wbs.code} · ${log.wbs.name}` : null} />
        <Field label="Entered by" value={log.createdBy.name} />
        <Field label="Approved by" value={log.approvedBy ? `${log.approvedBy.name ?? ''} · ${fmtDateTime(log.approvedAt)}` : null} />
        <Field label="Remarks" value={log.remarks} />
      </dl>
      {log.flagReasons.length > 0 && <p className="text-xs text-amber-700 dark:text-amber-300">Flags: {log.flagReasons.join(', ').toLowerCase().replace(/_/g, ' ')}</p>}
      {log.status === 'REJECTED' && log.rejectReason && <p className="text-sm text-red-700 dark:text-red-300"><b>Rejected:</b> {log.rejectReason}</p>}
      <div>
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">History</h4>
        {q.isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : q.isError ? (
          <p className="text-sm text-destructive">
            Could not load the history.{' '}
            <Button type="button" variant="link" className="h-auto p-0" onClick={() => void q.refetch()}>
              Retry
            </Button>
          </p>
        ) : (
          <ol className="space-y-1 text-sm">
            {(q.data?.history ?? []).map((h) => (
              <li key={h.id} className="flex flex-wrap gap-x-2">
                <span className="text-muted-foreground">{fmtDateTime(h.at)}</span>
                <span className="font-medium">{h.from ? `${STATUS_LABEL[h.from]} → ` : ''}{STATUS_LABEL[h.to]}</span>
                {h.by && <span>by {h.by}</span>}
                {h.note && <span className="text-muted-foreground">({h.note})</span>}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
