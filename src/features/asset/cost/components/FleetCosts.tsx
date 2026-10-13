import { useState } from 'react';
import { AlertCircle, AlertTriangle, ArrowDownUp, ChevronRight } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PaginationBar } from '@/components/shared/PaginationBar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { UtilizationMeter } from '@/features/asset/equipment/components/UtilizationMeter';
import { CATEGORY_LABEL } from '@/features/asset/equipment/lib/labels';
import { formatINR, formatQty } from '@/features/asset/equipment/lib/money';
import { EQUIPMENT_CATEGORIES } from '@/features/asset/equipment/types';
import { OwnershipBadge } from '@/features/asset/fleet/components/OwnershipBadge';
import { istMonth } from '@/features/asset/fleet/lib/format';
import { useProject } from '@/context/ProjectContext';
import { usePagination } from '@/hooks/usePagination';
import { toFirmParam } from '@/features/maintenancepro/shared/lib/common';
import { cn } from '@/lib/utils';
import { CATEGORY_META, COST_CATEGORIES, monthLabel } from '../lib/costLabels';
import { useFleetCosts } from '../server/useCostQueries';
import type { FleetRow } from '../types';
import { CategoryDonut } from './CostCharts';
import { Tile } from './CostSummaryTiles';
import { DeltaBadge } from './DeltaBadge';
import { ExportMenu } from './ExportMenu';
import { MonthPicker } from './MonthPicker';

const ALL = '__all__';
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const SORTS = [['spend', 'Spend'], ['hours', 'Hours / km'], ['costPerUnit', 'Cost per hour'], ['utilization', 'Utilization'], ['name', 'Name']] as const;

const costPath = (r: FleetRow, month: string) => `/asset/equipment/${r.machineId}/cost?month=${month}`;
const unitLabel = (u: FleetRow['unit']) => (u === 'km' ? 'km' : 'Hrs');

function Incomplete({ row }: { row: FleetRow }) {
  return row.dataComplete ? null : <AlertTriangle className="size-3.5 shrink-0 text-amber-600" aria-label="Some figures are estimated or missing" />;
}

export function FleetCosts() {
  const { selectedProject } = useProject();
  const firmId = toFirmParam(selectedProject);
  const [params, setParams] = useSearchParams();
  const rawMonth = params.get('month') ?? '';
  const month = MONTH_RE.test(rawMonth) ? rawMonth : istMonth();
  const setMonth = (m: string) => setParams((p) => { const n = new URLSearchParams(p); n.set('month', m); return n; }, { replace: true });

  const [ownership, setOwnership] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState<(typeof SORTS)[number][0]>('spend');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const { page, limit, setPage, setLimit } = usePagination(20);

  const q = useFleetCosts({ firmId, month, ownership, category, sort, dir, limit, offset: (page - 1) * limit });
  const d = q.data;
  const totalPages = Math.max(1, Math.ceil((d?.total ?? 0) / limit));
  const reset = (fn: () => void) => { fn(); setPage(1); };
  const k = d?.kpis;

  return (
    <div className="space-y-3 lg:space-y-4">
      <div>
        <nav aria-label="Breadcrumb" className="mb-1 hidden items-center gap-1 text-xs text-muted-foreground lg:flex">
          <span>Asset</span><ChevronRight className="size-3" /><span className="font-medium text-foreground">Equipment Costs</span>
        </nav>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold leading-tight lg:text-xl">Equipment Costs</h1>
            <p className="text-xs text-muted-foreground lg:text-sm">Fleet spend for {monthLabel(month)}</p>
          </div>
          <ExportMenu scope="fleet" month={month} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <MonthPicker value={month} onChange={setMonth} />
        <Select value={ownership || ALL} onValueChange={(v) => reset(() => setOwnership(v === ALL ? '' : v))}>
          <SelectTrigger className="h-10 w-36" aria-label="Ownership"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value={ALL}>All ownership</SelectItem><SelectItem value="OWNED">Owned</SelectItem><SelectItem value="RENTED">Rented</SelectItem></SelectContent>
        </Select>
        <Select value={category || ALL} onValueChange={(v) => reset(() => setCategory(v === ALL ? '' : v))}>
          <SelectTrigger className="h-10 w-44" aria-label="Category"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value={ALL}>All categories</SelectItem>{EQUIPMENT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CATEGORY_LABEL[c]}</SelectItem>)}</SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          <Select value={sort} onValueChange={(v) => reset(() => setSort(v as typeof sort))}>
            <SelectTrigger className="h-10 w-40" aria-label="Sort by"><SelectValue /></SelectTrigger>
            <SelectContent>{SORTS.map(([v, l]) => <SelectItem key={v} value={v}>Sort: {l}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" size="icon" className="size-10" aria-label={dir === 'desc' ? 'Sorted high to low, switch to low to high' : 'Sorted low to high, switch to high to low'} onClick={() => setDir((x) => (x === 'desc' ? 'asc' : 'desc'))}>
            <ArrowDownUp className="size-4" />
          </Button>
        </div>
      </div>

      {q.isError && (
        <div role="alert" className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle className="size-5 shrink-0" /><span className="flex-1">Could not load fleet costs.</span>
          <Button variant="outline" size="sm" onClick={() => q.refetch()}>Retry</Button>
        </div>
      )}

      {/* KPI strip: two columns on a phone, one row on a wide screen */}
      {!k ? (
        <Skeleton className="h-28 rounded-xl" />
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-9 lg:gap-3">
          <Tile label="Total spend" className="col-span-2 border-primary/40 bg-primary/5 sm:col-span-4 lg:col-span-1">
            <div className="mt-0.5 text-lg font-bold tabular-nums">{formatINR(k.totalSpend)}</div>
            <DeltaBadge delta={k.deltas.spend} label={d?.comparison.label} showLabel />
          </Tile>
          {COST_CATEGORIES.map((c) => (
            <Tile key={c} label={CATEGORY_META[c].label}>
              <div className="mt-0.5 flex items-center gap-1"><span className="size-2 shrink-0 rounded-full" style={{ background: CATEGORY_META[c].color }} aria-hidden /><span className="truncate text-base font-bold tabular-nums">{formatINR(k.categories[c])}</span></div>
              <div className="text-[11px] text-muted-foreground">{k.shares ? `${k.shares[c]}%` : ' '}</div>
            </Tile>
          ))}
          <Tile label="Hours (metered)"><div className="mt-0.5 text-base font-bold tabular-nums">{formatQty(k.hours)}</div><DeltaBadge delta={k.deltas.hours} /></Tile>
          <Tile label="Cost per hour"><div className="mt-0.5 text-base font-bold tabular-nums">{formatINR(k.costPerHour)}</div></Tile>
          <Tile label="Utilization"><UtilizationMeter variant="bar" percent={k.utilization} label="" /><DeltaBadge delta={k.deltas.utilization} /></Tile>
          <Tile label="Machines"><div className="mt-0.5 text-base font-bold tabular-nums">{k.machines}</div></Tile>
        </div>
      )}

      <div className="grid gap-3 lg:gap-4">
        <section className="min-w-0" aria-label="Machine comparison">
          <h2 className="mb-2 text-sm font-semibold">Machines{d ? ` (${d.total})` : ''}</h2>
          {!d ? <Skeleton className="h-48 rounded-xl" /> : d.rows.length === 0 ? (
            <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No equipment matches these filters.</p>
          ) : (
            <>
              {/* phone and tablet: one card per machine */}
              <ul className="grid gap-2 sm:grid-cols-2 lg:hidden">
                {d.rows.map((r) => (
                  <li key={r.machineId}>
                    <Link to={costPath(r, month)} className="block rounded-xl border bg-card p-3 hover:bg-muted/40">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5"><span className="truncate font-semibold">{r.name}</span><Incomplete row={r} /></div>
                          <div className="text-xs text-muted-foreground"><span className="font-mono">{r.assetCode}</span> · {CATEGORY_LABEL[r.category]}</div>
                        </div>
                        <OwnershipBadge value={r.ownershipType} />
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                        <div><div className="text-muted-foreground">Spend</div><div className="font-bold tabular-nums">{formatINR(r.spend)}</div><DeltaBadge delta={r.spendDelta} /></div>
                        <div><div className="text-muted-foreground">{unitLabel(r.unit)}</div><div className="font-bold tabular-nums">{r.unit ? formatQty(r.hours) : '—'}</div></div>
                        <div><div className="text-muted-foreground">Cost/{r.unit === 'km' ? 'km' : 'hr'}</div><div className="font-bold tabular-nums">{formatINR(r.costPerUnit)}</div></div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>

              {/* desktop: comparison table */}
              <div className="hidden overflow-x-auto rounded-xl border lg:block">
                <table className="w-full min-w-[40rem] text-sm">
                  <caption className="sr-only">Fleet cost comparison, {monthLabel(month)}</caption>
                  <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-3 py-2 font-semibold">Machine</th>
                      <th scope="col" className="px-3 py-2 text-right font-semibold">Spend</th>
                      <th scope="col" className="px-3 py-2 text-right font-semibold">Hours / km</th>
                      <th scope="col" className="px-3 py-2 text-right font-semibold">Cost / hr</th>
                      <th scope="col" className="px-3 py-2 text-right font-semibold">Efficiency</th>
                      <th scope="col" className="px-3 py-2 font-semibold">Utilization</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {d.rows.map((r) => (
                      <tr key={r.machineId} className="hover:bg-muted/40">
                        <td className="max-w-[14rem] px-3 py-2">
                          <Link to={costPath(r, month)} className="flex items-center gap-1.5 font-medium text-primary hover:underline"><span className="truncate">{r.name}</span><Incomplete row={r} /></Link>
                          <div className="text-xs text-muted-foreground"><span className="font-mono">{r.assetCode}</span> · {CATEGORY_LABEL[r.category]} · {r.ownershipType === 'RENTED' ? 'Rented' : 'Owned'}</div>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums"><div className="font-semibold">{formatINR(r.spend)}</div><DeltaBadge delta={r.spendDelta} /></td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.unit ? `${formatQty(r.hours)} ${r.unit}` : '—'}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatINR(r.costPerUnit)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.efficiency ? `${r.efficiency.value} ${r.efficiency.unit ?? ''}` : '—'}</td>
                        <td className="px-3 py-2"><UtilizationMeter variant="mini" percent={r.utilization} /><DeltaBadge delta={r.utilizationDelta} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3"><PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} pageSize={limit} onPageSizeChange={setLimit} pageSizeOptions={[10, 20, 50, 100]} /></div>
            </>
          )}
        </section>

        <div className="grid gap-3 lg:grid-cols-2 lg:gap-4">
          <section className="rounded-xl border bg-card p-3 sm:p-4">
            <h2 className="mb-2 text-sm font-semibold">Spend by category</h2>
            {k ? <CategoryDonut amounts={k.categories} /> : <Skeleton className="h-40" />}
          </section>
          <section className={cn('rounded-xl border bg-card p-3 sm:p-4', d && d.wbsRollup.length === 0 && 'hidden')}>
            <h2 className="mb-2 text-sm font-semibold">Spend by WBS activity</h2>
            <ul className="divide-y text-sm">
              {(d?.wbsRollup ?? []).slice().sort((a, b) => (b.total ?? 0) - (a.total ?? 0)).slice(0, 8).map((w) => (
                <li key={w.wbsActivityId ?? 'none'} className={cn('flex items-center justify-between gap-2 py-1.5', w.wbsActivityId === null && 'italic text-muted-foreground')}>
                  <span className="min-w-0 truncate">{w.code ? `${w.code} · ` : ''}{w.name}</span>
                  <span className="shrink-0 font-semibold tabular-nums">{formatINR(w.total)}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

export default FleetCosts;
