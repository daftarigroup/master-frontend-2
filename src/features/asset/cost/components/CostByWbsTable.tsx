import { useMemo, useState } from 'react';
import { ArrowDownUp } from 'lucide-react';
import { formatINR, formatQty } from '@/features/asset/equipment/lib/money';
import { cn } from '@/lib/utils';
import type { WbsRow } from '../types';

type SortKey = 'code' | 'hours' | 'total' | 'costPerUnit' | 'percentOfSpend';

const num = 'text-right tabular-nums';

/**
 * Cost by WBS activity. Phone: activity, hours, cost, cost/hr. md+: adds the four categories. The server guarantees the rows add up to
 * Total Spend (the last row absorbs rounding), and untagged cost sits in "Unassigned" rather than being dropped.
 */
export function CostByWbsTable({ rows, totals, unit }: { rows: WbsRow[]; totals: WbsRow; unit: 'Hrs' | 'km' | null }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 } | null>(null);
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const unassigned = rows.filter((r) => r.wbsActivityId === null);
    const real = rows.filter((r) => r.wbsActivityId !== null).sort((a, b) => {
      const av = sort.key === 'code' ? (a.code ?? '') : (a[sort.key] ?? -1);
      const bv = sort.key === 'code' ? (b.code ?? '') : (b[sort.key] ?? -1);
      return sort.dir * (typeof av === 'string' ? av.localeCompare(String(bv)) : (av as number) - (bv as number));
    });
    return [...real, ...unassigned]; // Unassigned always stays last
  }, [rows, sort]);

  const th = (key: SortKey, label: string, cls = '') => (
    <th scope="col" className={cn('px-2 py-2 font-semibold', cls)} aria-sort={sort?.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="inline-flex items-center gap-1" onClick={() => setSort((s) => (s?.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === 'code' ? 1 : -1 }))}>
        {label} <ArrowDownUp className="hidden size-3 opacity-50 lg:inline" aria-hidden />
      </button>
    </th>
  );

  if (rows.length === 0) return <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No cost recorded for this month yet.</p>;

  const per = unit === 'km' ? '/km' : '/hr';
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[20rem] text-xs sm:text-sm">
        <caption className="sr-only">Cost by WBS activity</caption>
        <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
          <tr>
            {th('code', 'WBS activity')}
            {th('hours', unit === 'km' ? 'Km' : 'Hours', 'text-right')}
            <th scope="col" className={cn('hidden px-2 py-2 font-semibold md:table-cell', num)}>Fuel</th>
            <th scope="col" className={cn('hidden px-2 py-2 font-semibold md:table-cell', num)}>Maint.</th>
            <th scope="col" className={cn('hidden px-2 py-2 font-semibold md:table-cell', num)}>Rental</th>
            <th scope="col" className={cn('hidden px-2 py-2 font-semibold md:table-cell', num)}>Other</th>
            {th('total', 'Cost', 'text-right')}
            {th('costPerUnit', `Cost${per}`, 'text-right')}
            {th('percentOfSpend', '%', 'hidden text-right md:table-cell')}
          </tr>
        </thead>
        <tbody className="divide-y">
          {sorted.map((r) => (
            <tr key={r.wbsActivityId ?? 'none'} className={cn(r.wbsActivityId === null && 'bg-muted/30 italic')}>
              <td className="max-w-[10rem] px-2 py-2 sm:max-w-[16rem]">
                <div className="truncate font-medium">{r.name}</div>
                {r.code && <div className="font-mono text-[11px] text-muted-foreground">{r.code}</div>}
              </td>
              <td className={cn('px-2 py-2', num)}>{formatQty(r.hours)}</td>
              <td className={cn('hidden px-2 py-2 md:table-cell', num)}>{formatINR(r.fuel)}</td>
              <td className={cn('hidden px-2 py-2 md:table-cell', num)}>{formatINR(r.maintenance)}</td>
              <td className={cn('hidden px-2 py-2 md:table-cell', num)}>{formatINR(r.rental)}</td>
              <td className={cn('hidden px-2 py-2 md:table-cell', num)}>{formatINR(r.other)}</td>
              <td className={cn('px-2 py-2 font-semibold', num)}>{formatINR(r.total)}</td>
              <td className={cn('px-2 py-2', num)}>{formatINR(r.costPerUnit)}</td>
              <td className={cn('hidden px-2 py-2 md:table-cell', num)}>{r.percentOfSpend !== null ? `${r.percentOfSpend}%` : '—'}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t-2 bg-muted/50 font-bold">
          <tr>
            <th scope="row" className="px-2 py-2 text-left">Total</th>
            <td className={cn('px-2 py-2', num)}>{formatQty(totals.hours)}</td>
            <td className={cn('hidden px-2 py-2 md:table-cell', num)}>{formatINR(totals.fuel)}</td>
            <td className={cn('hidden px-2 py-2 md:table-cell', num)}>{formatINR(totals.maintenance)}</td>
            <td className={cn('hidden px-2 py-2 md:table-cell', num)}>{formatINR(totals.rental)}</td>
            <td className={cn('hidden px-2 py-2 md:table-cell', num)}>{formatINR(totals.other)}</td>
            <td className={cn('px-2 py-2', num)}>{formatINR(totals.total)}</td>
            <td className={cn('px-2 py-2', num)}>{formatINR(totals.costPerUnit)}</td>
            <td className={cn('hidden px-2 py-2 md:table-cell', num)}>{totals.percentOfSpend !== null ? `${totals.percentOfSpend}%` : '—'}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
