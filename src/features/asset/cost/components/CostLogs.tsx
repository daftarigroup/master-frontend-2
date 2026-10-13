import { useMemo, useState } from 'react';
import { Ban, CalendarX2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { formatINR, formatQty } from '@/features/asset/equipment/lib/money';
import { apiErrorMessage, fmtDay, istToday } from '@/features/asset/fleet/lib/format';
import { cn } from '@/lib/utils';
import { BASIS_LABEL, ENTRY_LABEL, RATE_TYPE_LABEL } from '../lib/costLabels';
import { useCostLogs, useEndRate, useVoidCostEntry, useWbs } from '../server/useCostQueries';
import type { LogKind } from '../types';

interface PanelProps {
  kind: LogKind;
  machineId: string;
  firmId: string | null;
  month: string;
  canEdit: boolean;
  rented: boolean;
  onAddRate: () => void;
  onAddEntry: () => void;
}

function Table({ head, children, empty, isEmpty }: { head: Array<[string, boolean?]>; children: React.ReactNode; empty: string; isEmpty: boolean }) {
  if (isEmpty) return <p className="flex items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-sm text-muted-foreground"><CalendarX2 className="size-4" aria-hidden />{empty}</p>;
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[20rem] text-xs sm:text-sm">
        <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
          <tr>{head.map(([h, right]) => <th key={h} scope="col" className={cn('px-2 py-2 font-semibold', right ? 'text-right' : 'text-left')}>{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y">{children}</tbody>
      </table>
    </div>
  );
}
const R = 'px-2 py-2 text-right tabular-nums';
const L = 'px-2 py-2';

/** One log tab. It fetches only while mounted (open section / active tab). */
export function LogPanel({ kind, machineId, firmId, month, canEdit, rented, onAddRate, onAddEntry }: PanelProps) {
  const q = useCostLogs(machineId, kind, month, true);
  const wbs = useWbs(firmId, !!firmId);
  const wbsCode = useMemo(() => new Map((wbs.data ?? []).map((w) => [w.id, w.code])), [wbs.data]);
  const tag = (id: string | null) => (id ? (wbsCode.get(id) ?? 'tagged') : '—');
  const [voidId, setVoidId] = useState<string | null>(null);

  if (q.isLoading) return <Skeleton className="h-28 w-full" />;
  if (q.isError) return <div role="alert" className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">Could not load this list. <Button size="sm" variant="outline" onClick={() => q.refetch()}>Retry</Button></div>;
  const rows = q.data ?? [];

  return (
    <div className="space-y-2">
      {kind === 'usage' && (
        <Table head={[['Date'], ['Start', true], ['Stop', true], ['Used', true], ['WBS']]} empty="No usage logged this month." isEmpty={rows.length === 0}>
          {(rows as Array<{ id: string; date: string; startReading: number | null; stopReading: number | null; usage: number | null; wbsActivityId: string | null; counted: boolean }>).map((r) => (
            <tr key={r.id}>
              <td className={L}>{fmtDay(r.date)}</td>
              <td className={R}>{formatQty(r.startReading, 2)}</td>
              <td className={R}>{r.counted ? formatQty(r.stopReading, 2) : <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">open</span>}</td>
              <td className={R}>{r.counted ? formatQty(r.usage, 2) : '—'}</td>
              <td className={L}>{tag(r.wbsActivityId)}</td>
            </tr>
          ))}
        </Table>
      )}

      {kind === 'diesel' && (
        <Table head={[['Date'], ['Litres', true], ['Rate/L', true], ['Amount', true], ['Priced from'], ['WBS']]} empty="No diesel issued this month." isEmpty={rows.length === 0}>
          {(rows as Array<{ id: string; date: string; litres: number | null; ratePerLitre: number | null; amount: number | null; rateSource: string | null; wbsActivityId: string | null }>).map((r) => (
            <tr key={r.id}>
              <td className={L}>{fmtDay(r.date)}</td>
              <td className={R}>{formatQty(r.litres, 2)}</td>
              <td className={R}>{formatINR(r.ratePerLitre)}</td>
              <td className={R}>{r.amount === null ? <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">unpriced</span> : formatINR(r.amount)}</td>
              <td className={L}>{r.rateSource ? r.rateSource.toLowerCase().replace(/_/g, ' ') : '—'}</td>
              <td className={L}>{tag(r.wbsActivityId)}</td>
            </tr>
          ))}
        </Table>
      )}

      {kind === 'maintenance' && (
        <Table head={[['Work order'], ['Type'], ['Date'], ['Amount', true]]} empty="No completed maintenance this month." isEmpty={rows.length === 0}>
          {(rows as Array<{ workOrderId: string; code: string | null; type: string | null; outsourceStatus: string | null; date: string; amount: number | null }>).map((r) => (
            <tr key={r.workOrderId}>
              <td className={cn(L, 'font-mono')}>{r.code ?? r.workOrderId.slice(0, 8)}</td>
              <td className={L}>{[r.type, r.outsourceStatus && `outsourced, ${r.outsourceStatus.toLowerCase()}`].filter(Boolean).join(' · ') || '—'}</td>
              <td className={L}>{fmtDay(r.date)}</td>
              <td className={R}>{formatINR(r.amount)}</td>
            </tr>
          ))}
        </Table>
      )}

      {kind === 'entries' && (
        <>
          {canEdit && <div className="flex justify-end"><Button size="sm" onClick={onAddEntry}><Plus className="size-4" /> Add cost entry</Button></div>}
          <Table head={[['Date'], ['Category'], ['Amount', true], ['Note'], ['WBS'], ...(canEdit ? [['']] as Array<[string]> : [])]} empty="No cost entries this month." isEmpty={rows.length === 0}>
            {(rows as Array<{ id: string; date: string; category: keyof typeof ENTRY_LABEL; amount: number | null; description: string | null; wbsActivityId: string | null }>).map((r) => (
              <tr key={r.id}>
                <td className={L}>{fmtDay(r.date)}</td>
                <td className={L}>{ENTRY_LABEL[r.category] ?? r.category}</td>
                <td className={R}>{formatINR(r.amount)}</td>
                <td className={cn(L, 'max-w-[10rem] truncate')}>{r.description ?? '—'}</td>
                <td className={L}>{tag(r.wbsActivityId)}</td>
                {canEdit && <td className={L}><Button variant="ghost" size="sm" className="h-8 text-red-700 dark:text-red-400" onClick={() => setVoidId(r.id)}><Ban className="size-3.5" /> Void</Button></td>}
              </tr>
            ))}
          </Table>
          <VoidDialog id={voidId} onClose={() => setVoidId(null)} />
        </>
      )}

      {kind === 'rates' && (
        <>
          {canEdit && <div className="flex justify-end"><Button size="sm" onClick={onAddRate}><Plus className="size-4" /> Add rate</Button></div>}
          <RateTable machineId={machineId} rows={rows as never} canEdit={canEdit} rented={rented} />
        </>
      )}
    </div>
  );
}

function RateTable({ machineId, rows, canEdit, rented }: { machineId: string; rows: Array<{ id: string; rateType: keyof typeof RATE_TYPE_LABEL; basis: keyof typeof BASIS_LABEL; amount: number | null; minBillableQty: number | null; extraRate: number | null; deductBreakdownDays: boolean; effectiveFrom: string; effectiveTo: string | null; note: string | null }>; canEdit: boolean; rented: boolean }) {
  const end = useEndRate(machineId);
  const today = istToday();
  return (
    <Table head={[['Type'], ['Rate', true], ['Terms'], ['From'], ['To'], ...(canEdit ? [['']] as Array<[string]> : [])]} empty={rented ? 'No rates yet. Add a rental rate so the rental cost can be worked out.' : 'No rates yet. Add a charge-out rate to see the cost per hour at that rate.'} isEmpty={rows.length === 0}>
      {rows.map((r) => (
        <tr key={r.id}>
          <td className={L}>{RATE_TYPE_LABEL[r.rateType]}</td>
          <td className={R}>{formatINR(r.amount)} <span className="text-muted-foreground">{BASIS_LABEL[r.basis]}</span></td>
          <td className={cn(L, 'text-muted-foreground')}>{[r.minBillableQty !== null && `min ${formatQty(r.minBillableQty)}`, r.extraRate !== null && `extra ${formatINR(r.extraRate)}`, r.deductBreakdownDays && 'less breakdown days'].filter(Boolean).join(', ') || '—'}</td>
          <td className={L}>{fmtDay(r.effectiveFrom)}</td>
          <td className={L}>{r.effectiveTo ? fmtDay(r.effectiveTo) : <span className="font-semibold text-emerald-700 dark:text-emerald-400">current</span>}</td>
          {canEdit && (
            <td className={L}>
              {r.effectiveTo === null && (
                <Button variant="ghost" size="sm" className="h-8" disabled={end.isPending} onClick={async () => {
                  try { await end.mutateAsync({ rateId: r.id, endDate: today < r.effectiveFrom ? r.effectiveFrom : today }); toast.success('Rate ended'); } catch (e) { toast.error(apiErrorMessage(e, 'Could not end the rate')); }
                }}>End</Button>
              )}
            </td>
          )}
        </tr>
      ))}
    </Table>
  );
}

function VoidDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const voidEntry = useVoidCostEntry();
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const submit = async () => {
    if (reason.trim().length < 3) return setError('Give a reason (at least 3 characters)');
    try {
      await voidEntry.mutateAsync({ id: id!, reason: reason.trim() });
      toast.success('Entry voided');
      setReason(''); setError(''); onClose();
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not void the entry'));
    }
  };
  return (
    <Dialog open={!!id} onOpenChange={(o) => { if (!o) { setReason(''); setError(''); onClose(); } }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Void cost entry</DialogTitle>
          <DialogDescription>The entry stays on record but no longer counts toward any total.</DialogDescription>
        </DialogHeader>
        <Input autoFocus className="h-11" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" aria-label="Reason for voiding" />
        {error && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{error}</p>}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={submit} disabled={voidEntry.isPending}>Void entry</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
