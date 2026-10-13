import { AlertTriangle, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EquipmentPhoto } from '@/features/asset/equipment/components/EquipmentPhoto';
import { StatusPill } from '@/features/asset/equipment/components/StatusPill';
import { CATEGORY_LABEL } from '@/features/asset/equipment/lib/labels';
import { longDay, readingText } from '../lib/due';
import type { RecordRow } from '../types';
import { DuePill } from './DuePill';

const href = (r: RecordRow) => `/maintenance/records/${r.machine.id}`;
const BreakdownFlag = () => (
  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-950/60 dark:text-red-300">
    <AlertTriangle className="size-3" aria-hidden /> Breakdown
  </span>
);

export function RecordCard({ row }: { row: RecordRow }) {
  const m = row.machine;
  return (
    <Link to={href(row)} className="flex min-h-14 items-center gap-3 rounded-xl border bg-card p-3 hover:border-primary/50">
      <EquipmentPhoto src={m.imageUrl} category={m.category} name={m.name} className="size-14" />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-sm font-semibold">{m.name}</p>
          <DuePill due={row.due} />
        </div>
        <p className="truncate text-xs text-muted-foreground"><span className="font-mono font-bold text-primary">{m.assetCode}</span> · {CATEGORY_LABEL[m.category]} · {readingText(row.currentReading, m.readingUnit)}</p>
        <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{row.mechanic?.name ?? 'No mechanic'}</span>
          {row.openBreakdown && <BreakdownFlag />}
        </p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}

const TH = 'px-3 py-2 text-left text-xs font-semibold text-muted-foreground';

export function RecordsTable({ rows }: { rows: RecordRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40">
          <tr>
            <th scope="col" className={TH}>Machine</th><th scope="col" className={TH}>Reading</th><th scope="col" className={TH}>Next due</th>
            <th scope="col" className={TH}>Left</th><th scope="col" className={TH}>Status</th><th scope="col" className={TH}>Mechanic</th><th scope="col" className={TH}>Breakdown</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r) => (
            <tr key={r.machine.id} className="hover:bg-muted/40">
              <td className="px-3 py-2">
                <Link to={href(r)} className="flex items-center gap-2">
                  <EquipmentPhoto src={r.machine.imageUrl} category={r.machine.category} name={r.machine.name} className="size-9" />
                  <span className="min-w-0"><span className="block truncate font-semibold hover:underline">{r.machine.name}</span><span className="block font-mono text-xs text-muted-foreground">{r.machine.assetCode}</span></span>
                </Link>
              </td>
              <td className="whitespace-nowrap px-3 py-2 tabular-nums">{readingText(r.currentReading, r.machine.readingUnit)}</td>
              <td className="whitespace-nowrap px-3 py-2">
                {r.due.status === 'NOT_SET' ? '—' : r.due.nextDueReading !== null ? readingText(r.due.nextDueReading, r.machine.readingUnit) : longDay(r.due.nextDueDate)}
                {r.due.nextDueReading !== null && r.due.nextDueDate && <span className="block text-xs text-muted-foreground">or {longDay(r.due.nextDueDate)}</span>}
              </td>
              <td className="px-3 py-2"><DuePill due={r.due} /></td>
              <td className="px-3 py-2"><StatusPill status={r.status} /></td>
              <td className="px-3 py-2">{r.mechanic?.name ?? '—'}</td>
              <td className="px-3 py-2">{r.openBreakdown ? <BreakdownFlag /> : <span className="text-muted-foreground">No</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
