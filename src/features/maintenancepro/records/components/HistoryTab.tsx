import { useState } from 'react';
import { AlertCircle, ChevronRight, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PaginationBar } from '@/components/shared/PaginationBar';
import { formatINR } from '@/features/asset/equipment/lib/money';
import type { ReadingUnit } from '@/features/asset/equipment/types';
import { fmtDateTime } from '@/features/asset/fleet/lib/format';
import { TypePill } from '../../work_orders/components/WorkOrderBadges';
import { readingText } from '../lib/due';
import { useRecordHistory } from '../server/useRecordQueries';
import type { HistoryRow } from '../types';
import { ServiceRecordSheet } from './ServiceRecordSheet';

const PAGE = 20;
const TH = 'px-3 py-2 text-left text-xs font-semibold text-muted-foreground';

export function HistoryTab({ machineId, unit }: { machineId: string; unit: ReadingUnit }) {
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<HistoryRow | null>(null);
  const q = useRecordHistory(machineId, { limit: PAGE, offset: (page - 1) * PAGE });
  const rows = q.data?.rows ?? [];
  const total = q.data?.total ?? 0;
  const withCost = rows.some((r) => r.cost !== undefined);

  if (q.isLoading) return <Skeleton className="h-40 w-full rounded-xl" />;
  if (q.isError) {
    return (
      <div role="alert" className="grid place-items-center gap-2 rounded-xl border p-6 text-center">
        <AlertCircle className="size-6 text-muted-foreground" aria-hidden />
        <p className="text-sm">Could not load the service history.</p>
        <Button size="sm" onClick={() => q.refetch()}>Retry</Button>
      </div>
    );
  }
  if (rows.length === 0) return <p className="rounded-xl border p-6 text-center text-sm text-muted-foreground">No completed services yet.</p>;

  return (
    <div className="space-y-3">
      <ul className="space-y-2 lg:hidden">
        {rows.map((r) => (
          <li key={r.id}>
            <button type="button" onClick={() => setOpen(r)} className="flex min-h-14 w-full items-center gap-3 rounded-xl border bg-card p-3 text-left">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{r.title}</p>
                <p className="text-xs text-muted-foreground">{fmtDateTime(r.completedAt)} · {r.code ?? '—'}</p>
                <p className="text-xs text-muted-foreground">{readingText(r.readingAtService, unit)} · {r.parts} parts{r.cost !== undefined ? ` · ${formatINR(r.cost)}` : ''}</p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto rounded-xl border bg-card lg:block">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th scope="col" className={TH}>Date</th><th scope="col" className={TH}>Work order</th><th scope="col" className={TH}>Type</th>
              <th scope="col" className={TH}>Title</th><th scope="col" className={TH}>Reading</th><th scope="col" className={TH}>Mechanic</th>
              <th scope="col" className={TH}>Vendor</th><th scope="col" className={TH}>Bill</th><th scope="col" className={TH}>Parts</th>
              {withCost && <th scope="col" className={`${TH} text-right`}>Cost</th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setOpen(r)}>
                <td className="whitespace-nowrap px-3 py-2">{fmtDateTime(r.completedAt)}</td>
                <td className="px-3 py-2">
                  <button type="button" className="font-mono text-primary underline-offset-2 hover:underline" onClick={(e) => { e.stopPropagation(); setOpen(r); }}>{r.code ?? '—'}</button>
                </td>
                <td className="px-3 py-2"><TypePill type={r.type} /></td>
                <td className="max-w-56 truncate px-3 py-2">{r.title}</td>
                <td className="whitespace-nowrap px-3 py-2 tabular-nums">{readingText(r.readingAtService, unit)}</td>
                <td className="px-3 py-2">{r.mechanic ?? '—'}</td>
                <td className="px-3 py-2">{r.vendor ? <>{r.vendor.name}{r.vendor.phone && <span className="block text-xs text-muted-foreground">{r.vendor.phone}</span>}</> : '—'}</td>
                <td className="px-3 py-2">
                  {r.billNo ?? '—'}
                  {r.billUrl && <a href={r.billUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} aria-label={`Open bill ${r.billNo ?? ''}`} className="ml-1 inline-block align-middle text-primary"><ExternalLink className="size-3.5" /></a>}
                </td>
                <td className="px-3 py-2 tabular-nums">{r.parts}</td>
                {withCost && <td className="px-3 py-2 text-right tabular-nums">{formatINR(r.cost)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PaginationBar page={page} totalPages={Math.max(1, Math.ceil(total / PAGE))} onPageChange={setPage} />
      <ServiceRecordSheet row={open} machineId={machineId} unit={unit} onClose={() => setOpen(null)} />
    </div>
  );
}
