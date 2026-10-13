import { useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, ChevronRight, ExternalLink, Gauge, MapPin, Plus, SlidersHorizontal, WalletCards } from 'lucide-react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EquipmentPhoto } from '@/features/asset/equipment/components/EquipmentPhoto';
import { StatusPill } from '@/features/asset/equipment/components/StatusPill';
import { CATEGORY_LABEL } from '@/features/asset/equipment/lib/labels';
import { formatQty } from '@/features/asset/equipment/lib/money';
import { detailPath } from '@/features/asset/equipment/lib/paths';
import { useCostEdit } from '@/features/asset/equipment/lib/useCostAccess';
import { useEquipmentSummary } from '@/features/asset/equipment/server/useEquipmentQueries';
import { OwnershipBadge } from '@/features/asset/fleet/components/OwnershipBadge';
import { istMonth } from '@/features/asset/fleet/lib/format';
import { cn } from '@/lib/utils';
import { completenessCount } from '../lib/completeness';
import { CATEGORY_META, COST_CATEGORIES, LOG_TABS, monthLabel } from '../lib/costLabels';
import { useIsDesktop } from '../lib/useIsDesktop';
import { useMachineCost, useMachineTrend, useWbs } from '../server/useCostQueries';
import type { MachineCost } from '../types';
import { CompletenessPanel } from './CompletenessPanel';
import { CostByWbsTable } from './CostByWbsTable';
import { CategoryDonut, TrendChart } from './CostCharts';
import { CostEntryDialog } from './CostEntryDialog';
import { LogPanel } from './CostLogs';
import { CostSummaryTiles, MetricTiles, MonthOverview } from './CostSummaryTiles';
import { ExportMenu } from './ExportMenu';
import { MonthPicker } from './MonthPicker';
import { RateCardDialog } from './RateCardDialog';
import { Section } from './Section';

const ALL = '__all__';
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function Card({ title, children, className, right }: { title: string; children: React.ReactNode; className?: string; right?: React.ReactNode }) {
  return (
    <section className={cn('rounded-xl border bg-card p-3 sm:p-4', className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function MachineHeader({ cost, month }: { cost: MachineCost; month: string }) {
  const m = cost.machine;
  const summary = useEquipmentSummary(m.id, month);
  const openPath = detailPath({ id: m.id, assetId: summary.data?.assetId ?? null });
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-card p-3">
      <EquipmentPhoto src={m.imageUrl} category={m.category} name={m.name} className="size-16 shrink-0 sm:size-20" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h1 className="min-w-0 truncate text-base font-bold leading-tight sm:text-lg">{m.name}</h1>
          <StatusPill status={m.status} />
          <OwnershipBadge value={m.ownershipType} />
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          <span className="font-mono font-bold text-primary">{m.assetCode}</span> · {CATEGORY_LABEL[m.category]}
          {m.readingUnit !== 'NONE' && <> · <Gauge className="inline size-3 align-[-1px]" aria-hidden /> {formatQty(m.lifetimeReading, 0)} {m.readingUnit === 'KM' ? 'km' : 'Hrs'}</>}
        </p>
        {m.site && <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3" aria-hidden />{m.site}{m.vendor ? ` · ${m.vendor}` : ''}</p>}
        <Button asChild variant="outline" size="sm" className="mt-2 h-9 lg:hidden"><Link to={openPath}><ExternalLink className="size-3.5" /> View equipment</Link></Button>
      </div>
      <Button asChild variant="outline" className="hidden shrink-0 lg:inline-flex"><Link to={openPath}><ExternalLink className="size-4" /> View equipment</Link></Button>
    </div>
  );
}

export function CostTracking() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const desktop = useIsDesktop();
  const canEdit = useCostEdit();
  const [params, setParams] = useSearchParams();
  const rawMonth = params.get('month') ?? '';
  const month = MONTH_RE.test(rawMonth) ? rawMonth : istMonth();
  const setMonth = (m: string) => setParams((p) => { const n = new URLSearchParams(p); n.set('month', m); return n; }, { replace: true });

  const [category, setCategory] = useState('');
  const [wbsId, setWbsId] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);
  const [tab, setTab] = useState('usage');

  const q = useMachineCost(id, { month, category, wbsId });
  const cost = q.data;
  const firmId = cost?.machine.firmId ?? null;
  const wbs = useWbs(firmId, !!firmId);
  const trend = useMachineTrend(id, month);

  const rented = cost?.machine.ownershipType === 'RENTED';
  const activeFilters = (category ? 1 : 0) + (wbsId ? 1 : 0);
  const issues = useMemo(() => (cost ? completenessCount(cost.completeness, cost.rental.uncovered) : 0), [cost]);

  const status = (q.error as { response?: { status?: number } } | null)?.response?.status;
  if (q.isError && !cost) {
    return (
      <div role="alert" className="mx-auto grid max-w-md place-items-center gap-3 rounded-xl border p-8 text-center">
        <AlertCircle className="size-8 text-muted-foreground" aria-hidden />
        <p className="font-semibold">{status === 404 ? 'Equipment not found' : status === 403 ? 'You do not have access to cost data' : 'Could not load cost tracking'}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/asset/equipment')}>Back to equipment</Button>
          {status !== 404 && status !== 403 && <Button onClick={() => q.refetch()}>Retry</Button>}
        </div>
      </div>
    );
  }

  const logProps = id ? { machineId: id, firmId, month, canEdit, rented: !!rented, onAddRate: () => setRateOpen(true), onAddEntry: () => setEntryOpen(true) } : null;
  const unit = cost?.usage.unit ?? null;

  return (
    <div className="space-y-3 lg:space-y-4 print:space-y-2">
      <div className="print:hidden">
        <nav aria-label="Breadcrumb" className="mb-1 hidden items-center gap-1 text-xs text-muted-foreground lg:flex">
          <Link to="/asset/equipment" className="hover:text-foreground">Asset</Link><ChevronRight className="size-3" />
          <Link to="/asset/equipment" className="hover:text-foreground">Equipment</Link><ChevronRight className="size-3" />
          <span className="font-medium text-foreground">{cost?.machine.name ?? 'Cost tracking'}</span>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="size-11 lg:hidden" aria-label="Back to equipment" onClick={() => navigate('/asset/equipment')}><ArrowLeft className="size-5" /></Button>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold leading-tight lg:text-xl">Cost Tracking</p>
            <p className="text-xs text-muted-foreground lg:text-sm">{monthLabel(month)}</p>
          </div>
          <div className="hidden items-center gap-2 lg:flex">
            {canEdit && <Button variant="outline" onClick={() => setEntryOpen(true)} disabled={!cost}><Plus className="size-4" /> Add cost entry</Button>}
            {canEdit && <Button variant="outline" onClick={() => setRateOpen(true)} disabled={!cost}><WalletCards className="size-4" /> Edit rates</Button>}
            {id && <ExportMenu scope="machine" machineId={id} month={month} />}
          </div>
        </div>
      </div>

      {!cost ? <Skeleton className="h-24 w-full rounded-xl" /> : <MachineHeader cost={cost} month={month} />}

      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <MonthPicker value={month} onChange={setMonth} />
        <Button variant={activeFilters ? 'secondary' : 'outline'} className="h-10" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((o) => !o)}>
          <SlidersHorizontal className="size-4" /> Filters{activeFilters ? ` (${activeFilters})` : ''}
        </Button>
        <div className="ml-auto flex items-center gap-2 lg:hidden">
          {canEdit && <Button variant="outline" size="icon" className="size-10" aria-label="Add cost entry" onClick={() => setEntryOpen(true)} disabled={!cost}><Plus className="size-4" /></Button>}
          {canEdit && <Button variant="outline" size="icon" className="size-10" aria-label="Edit rates" onClick={() => setRateOpen(true)} disabled={!cost}><WalletCards className="size-4" /></Button>}
          {id && <ExportMenu scope="machine" machineId={id} month={month} className="h-10" />}
        </div>
      </div>

      {filtersOpen && (
        <div className="grid gap-2 rounded-xl border bg-card p-3 sm:grid-cols-3 print:hidden">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Cost category (narrows the WBS table)</label>
            <Select value={category || ALL} onValueChange={(v) => setCategory(v === ALL ? '' : v)}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All categories</SelectItem>
                {COST_CATEGORIES.map((c) => <SelectItem key={c} value={c.toUpperCase()}>{CATEGORY_META[c].label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">WBS activity</label>
            <Select value={wbsId || ALL} onValueChange={(v) => setWbsId(v === ALL ? '' : v)}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All activities</SelectItem>
                {(wbs.data ?? []).map((w) => <SelectItem key={w.id} value={w.id}>{w.code} · {w.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end"><Button variant="ghost" disabled={!activeFilters} onClick={() => { setCategory(''); setWbsId(''); }}>Clear filters</Button></div>
        </div>
      )}

      {!cost ? (
        <div className="space-y-3"><Skeleton className="h-24 rounded-xl" /><Skeleton className="h-24 rounded-xl" /><Skeleton className="h-48 rounded-xl" /></div>
      ) : (
        <div className={cn('space-y-3 lg:space-y-4', q.isFetching && 'opacity-70 transition-opacity')} aria-busy={q.isFetching}>
          <div className="2xl:grid 2xl:grid-cols-[minmax(0,1fr)_20rem] 2xl:items-start 2xl:gap-4">
            <div className="min-w-0 space-y-3 lg:space-y-4">
              <CostSummaryTiles cost={cost} />
              <MonthOverview cost={cost} />
              <MetricTiles cost={cost} />

              <div className="grid gap-3 lg:gap-4">
                <Card title="Cost by WBS activity">
                  <CostByWbsTable rows={cost.wbs.rows} totals={cost.wbs.totals} unit={unit} />
                  {(category || wbsId) && <p className="mt-2 text-[11px] text-muted-foreground">Filtered view: the tiles above still show the whole month, so the table total can be smaller.</p>}
                </Card>

                {desktop && (
                  <div className="grid gap-3 lg:grid-cols-2 lg:gap-4">
                    <Card title="Spend by category"><CategoryDonut amounts={{ fuel: cost.tiles.fuel.amount, maintenance: cost.tiles.maintenance.amount, rental: cost.tiles.rental.amount, other: cost.tiles.other.amount }} /></Card>
                    <Card title="Last 6 months"><TrendChart data={trend.data} loading={trend.isLoading} /></Card>
                  </div>
                )}
              </div>

              {desktop && logProps && (
                <Tabs value={tab} onValueChange={setTab} className="rounded-xl border bg-card p-3 print:hidden">
                  <TabsList className="h-auto flex-wrap justify-start">
                    {LOG_TABS.map((t) => <TabsTrigger key={t.kind} value={t.kind}>{t.label}</TabsTrigger>)}
                  </TabsList>
                  {LOG_TABS.map((t) => (
                    <TabsContent key={t.kind} value={t.kind} className="mt-3">
                      {tab === t.kind && <LogPanel kind={t.kind} {...logProps} />}
                    </TabsContent>
                  ))}
                </Tabs>
              )}

              {!desktop && (
                <div className="space-y-2 print:hidden">
                  <Section title="Charts">
                    {() => (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div><h3 className="mb-1 text-xs font-semibold text-muted-foreground">Spend by category</h3><CategoryDonut amounts={{ fuel: cost.tiles.fuel.amount, maintenance: cost.tiles.maintenance.amount, rental: cost.tiles.rental.amount, other: cost.tiles.other.amount }} /></div>
                        <div><h3 className="mb-1 text-xs font-semibold text-muted-foreground">Last 6 months</h3><TrendChart data={trend.data} loading={trend.isLoading} /></div>
                      </div>
                    )}
                  </Section>
                  {logProps && LOG_TABS.map((t) => <Section key={t.kind} title={t.label}>{() => <LogPanel kind={t.kind} {...logProps} />}</Section>)}
                  <Section title="Completeness" badge={issues > 0 ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">{issues}</span> : undefined} defaultOpen={issues > 0}>
                    {() => <CompletenessPanel cost={cost} canEdit={canEdit} onAddRate={() => setRateOpen(true)} onAddEntry={() => setEntryOpen(true)} />}
                  </Section>
                </div>
              )}

              {desktop && (
                <Card title="Completeness" className="2xl:hidden print:hidden">
                  <CompletenessPanel cost={cost} canEdit={canEdit} onAddRate={() => setRateOpen(true)} onAddEntry={() => setEntryOpen(true)} />
                </Card>
              )}
            </div>

            {desktop && (
              <aside className="hidden space-y-3 2xl:block print:hidden" aria-label="Completeness checklist">
                <Card title="Completeness" right={issues > 0 ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">{issues}</span> : undefined}>
                  <CompletenessPanel cost={cost} canEdit={canEdit} onAddRate={() => setRateOpen(true)} onAddEntry={() => setEntryOpen(true)} />
                </Card>
              </aside>
            )}
          </div>
        </div>
      )}

      {cost && (
        <>
          <RateCardDialog open={rateOpen} onOpenChange={setRateOpen} machineId={cost.machine.id} rented={!!rented} unit={unit} />
          <CostEntryDialog open={entryOpen} onOpenChange={setEntryOpen} machineId={cost.machine.id} firmId={firmId} rented={!!rented} month={month} />
        </>
      )}
    </div>
  );
}

export default CostTracking;
