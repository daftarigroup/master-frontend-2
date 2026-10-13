import { Fragment, useState } from 'react';
import { AlertTriangle, Check, ChevronDown, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { COLUMNS, type ColumnId } from '../lib/columns';
import { CLOCK_VARIANCE_HINT, UNIT_SHORT, fmtClock, fmtDuration, fmtReading } from '../lib/format';
import type { WorkLog } from '../types';
import { LogDetail } from './LogDetail';
import { LogMenu, type LogHandlers } from './LogActions';
import { WorkLogStatusPill } from './WorkLogStatusPill';

interface Props {
  rows: WorkLog[];
  cols: ColumnId[];
  handlers: LogHandlers;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (checked: boolean) => void;
}

function cell(id: ColumnId, log: WorkLog): React.ReactNode {
  switch (id) {
    case 'machine':
      return <span className="font-medium">{log.machine.name}</span>;
    case 'time':
      return (
        <span className="whitespace-nowrap tabular-nums">
          {fmtClock(log.startedAt)} – {log.isOpen ? 'Open' : fmtClock(log.stoppedAt)}
        </span>
      );
    case 'meter':
      return log.machine.readingUnit === 'NONE' ? '—' : (
        <span className="whitespace-nowrap tabular-nums">
          {fmtReading(log.startReading, log.machine.readingUnit)} – {log.isOpen ? '…' : fmtReading(log.stopReading, log.machine.readingUnit)}
        </span>
      );
    case 'usage':
      return (
        <span className="inline-flex items-center gap-1 whitespace-nowrap tabular-nums">
          {log.isOpen ? '—' : fmtDuration(log.durationMinutes)}
          {log.machine.readingUnit === 'KM' && log.usage !== null && <span className="text-muted-foreground">({log.usage} {UNIT_SHORT.KM})</span>}
          {log.clockVariance && (
            <span title={CLOCK_VARIANCE_HINT} aria-label={CLOCK_VARIANCE_HINT} role="img" className="text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-3.5" />
            </span>
          )}
        </span>
      );
    case 'operator':
      return log.operator?.name ?? '—';
    case 'workType':
      return log.workType?.name ?? '—';
    case 'location':
      return log.locationText || '—';
    case 'remarks':
      return <span className="line-clamp-2 max-w-56">{log.remarks || '—'}</span>;
  }
}

export function LogTable({ rows, cols, handlers, selected, onToggle, onToggleAll }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  // keep the picker's order so columns do not jump around
  const shown = COLUMNS.filter((c) => cols.includes(c.id));
  const selectable = rows.filter((r) => r.canApprove);
  const allChecked = selectable.length > 0 && selectable.every((r) => selected.has(r.id));
  const span = shown.length + 4;

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full text-sm">
        <caption className="sr-only">Work logs</caption>
        <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="w-10 px-3 py-2">
              <Checkbox checked={allChecked} disabled={selectable.length === 0} onCheckedChange={(c) => onToggleAll(c === true)} aria-label="Select all approvable logs" />
            </th>
            <th scope="col" className="px-2 py-2 font-medium">Log ID</th>
            {shown.map((c) => (
              <th key={c.id} scope="col" className="px-2 py-2 font-medium">{c.label}</th>
            ))}
            <th scope="col" className="px-2 py-2 font-medium">Status</th>
            <th scope="col" className="px-3 py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((log) => {
            const isOpen = open === log.id;
            return (
              <Fragment key={log.id}>
                <tr className={cn('align-middle hover:bg-muted/30', isOpen && 'bg-muted/30')}>
                  <td className="px-3 py-2">
                    {log.canApprove ? <Checkbox checked={selected.has(log.id)} onCheckedChange={() => onToggle(log.id)} aria-label={`Select ${log.logNumber ?? 'work log'}`} /> : null}
                  </td>
                  <td className="px-2 py-2">
                    <button type="button" className="flex items-center gap-1 font-semibold text-primary" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : log.id)}>
                      {isOpen ? <ChevronDown className="size-4" aria-hidden /> : <ChevronRight className="size-4" aria-hidden />}
                      {log.logNumber ?? 'Details'}
                    </button>
                  </td>
                  {shown.map((c) => (
                    <td key={c.id} className="px-2 py-2">{cell(c.id, log)}</td>
                  ))}
                  <td className="px-2 py-2"><WorkLogStatusPill status={log.status} open={log.isOpen} /></td>
                  <td className="px-3 py-1.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      {log.canApprove && (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 px-2.5 text-xs font-semibold border-emerald-500/40 text-emerald-700 bg-emerald-50/60 hover:bg-emerald-100 hover:text-emerald-800 dark:border-emerald-600/40 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
                            onClick={() => handlers.approve(log)}
                            title="Approve work log"
                          >
                            <Check className="mr-1 size-3.5 text-emerald-600 dark:text-emerald-400" /> Approve
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/50"
                            onClick={() => handlers.reject(log)}
                            title="Reject work log"
                          >
                            <X className="mr-1 size-3.5" /> Reject
                          </Button>
                        </>
                      )}
                      <LogMenu log={log} handlers={handlers} />
                    </div>
                  </td>
                </tr>
                {isOpen && (
                  <tr className="bg-muted/20">
                    <td colSpan={span} className="p-0"><LogDetail log={log} /></td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
