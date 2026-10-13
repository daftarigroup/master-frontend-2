import { AlertTriangle, Check, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fmtClock, fmtDuration, fmtReading, CLOCK_VARIANCE_HINT, UNIT_SHORT } from '../lib/format';
import type { WorkLog } from '../types';
import { LogMenu, type LogHandlers } from './LogActions';
import { WorkLogStatusPill } from './WorkLogStatusPill';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-1.5 text-sm">
      <dt className="w-28 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 break-words font-medium">{children}</dd>
    </div>
  );
}

function Point({ title, log, iso, reading }: { title: string; log: WorkLog; iso: string | null; reading: number | null }) {
  const unit = UNIT_SHORT[log.machine.readingUnit];
  return (
    <div className="min-w-0 flex-1">
      <div className="text-[11px] font-medium text-muted-foreground">{title}</div>
      <div className="text-base font-bold tabular-nums">{iso ? fmtClock(iso) : '—'}</div>
      {log.machine.readingUnit !== 'NONE' && (
        <div className="text-xs text-muted-foreground tabular-nums">
          {fmtReading(reading, log.machine.readingUnit)} {reading !== null && unit}
        </div>
      )}
    </div>
  );
}

/** The phone log card: number + status + menu, start -> duration -> end, then the detail rows. */
export function LogCard({ log, index, showMachine, handlers }: { log: WorkLog; index: number; showMachine?: boolean; handlers: LogHandlers }) {
  return (
    <article className="rounded-xl border bg-card p-3 shadow-xs" aria-label={`Work log ${index}${log.logNumber ? `, ${log.logNumber}` : ''}`}>
      <header className="flex items-center gap-2">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{index}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold">{log.logNumber ?? 'Work log'}</div>
          {showMachine && <div className="truncate text-xs text-muted-foreground">{log.machine.name}</div>}
        </div>
        <WorkLogStatusPill status={log.status} open={log.isOpen} />
        <LogMenu log={log} handlers={handlers} />
      </header>

      <div className="mt-2 flex items-center gap-2 rounded-lg bg-muted/50 p-2.5">
        <Point title="Start" log={log} iso={log.startedAt} reading={log.startReading} />
        <div className="flex shrink-0 flex-col items-center gap-0.5 px-1 text-center">
          {log.isOpen ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">Open</span>
          ) : (
            <>
              <Clock className="size-4 text-muted-foreground" aria-hidden />
              <span className="flex items-center gap-1 text-sm font-bold tabular-nums">
                {fmtDuration(log.durationMinutes)}
                {log.clockVariance && (
                  <span title={CLOCK_VARIANCE_HINT} aria-label={CLOCK_VARIANCE_HINT} role="img" className="text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="size-3.5" />
                  </span>
                )}
              </span>
            </>
          )}
        </div>
        {log.isOpen ? <div className="min-w-0 flex-1 text-right text-sm text-muted-foreground">Still running</div> : <div className="min-w-0 flex-1 text-right"><Point title="End" log={log} iso={log.stoppedAt} reading={log.stopReading} /></div>}
      </div>

      <dl className="mt-1 divide-y">
        <Row label="Operator">{log.operator?.name ?? '—'}</Row>
        <Row label="Work Location">{log.locationText || '—'}</Row>
        <Row label="Work Type">{log.workType?.name ?? '—'}</Row>
        <Row label="Remarks / Notes">{log.remarks || '—'}</Row>
      </dl>

      {log.status === 'REJECTED' && log.rejectReason && (
        <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-2.5 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300" role="note">
          <b>Rejected:</b> {log.rejectReason}
        </p>
      )}

      {log.canApprove && (
        <div className="mt-3 flex items-center gap-2 border-t pt-2.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 flex-1 border-emerald-500/40 text-emerald-700 bg-emerald-50/60 hover:bg-emerald-100 hover:text-emerald-800 dark:border-emerald-600/40 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs font-semibold"
            onClick={() => handlers.approve(log)}
          >
            <Check className="mr-1.5 size-3.5 text-emerald-600 dark:text-emerald-400" /> Approve
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 flex-1 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 text-xs font-medium"
            onClick={() => handlers.reject(log)}
          >
            <X className="mr-1.5 size-3.5" /> Reject
          </Button>
        </div>
      )}
    </article>
  );
}
