import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatINR, formatINRCompact, formatQty } from '@/features/asset/equipment/lib/money';
import { UtilizationMeter } from '@/features/asset/equipment/components/UtilizationMeter';
import { cn } from '@/lib/utils';
import { BASIS_LABEL, CATEGORY_META, COST_CATEGORIES, TILE_BADGE } from '../lib/costLabels';
import type { CostCategory, MachineCost } from '../types';
import { DeltaBadge } from './DeltaBadge';

const BADGE_TONE = {
  warn: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  muted: 'bg-muted text-muted-foreground',
};

/** Plain-language account of how a figure was reached, from the numbers the server returned (nothing is recalculated here). */
function calcLines(cat: CostCategory, c: MachineCost): string[] {
  const k = c.completeness;
  switch (cat) {
    case 'fuel':
      return [
        'Diesel issued this month from Store, valued at the Store average price (or the firm default price when no Store price is known).',
        k.unpricedDieselLogs > 0 ? `${k.unpricedDieselLogs} diesel entr${k.unpricedDieselLogs === 1 ? 'y has' : 'ies have'} no price yet and ${k.unpricedDieselLogs === 1 ? 'is' : 'are'} not included.` : 'Every diesel entry has a price.',
        k.estimatedDieselLogs > 0 ? `${k.estimatedDieselLogs} entr${k.estimatedDieselLogs === 1 ? 'y is' : 'ies are'} valued at the default price (estimated).` : '',
        c.machine.hireType === 'WET' ? 'Wet-rate hire: the vendor supplies diesel, so it is not charged to you.' : '',
      ].filter(Boolean);
    case 'maintenance':
      return ['Completed work orders dated by completion (outsourced jobs when received). Each work order counts once.'];
    case 'rental':
      return !c.rental.applicable
        ? ['Owned machine: there is no rental charge.']
        : [
            'Computed from the rental rate card for the days on hire: rate basis, minimum billable quantity and extra rate are applied.',
            c.rental.source === 'INVOICED' ? `A rental invoice replaced the computed figure (${formatINR(c.rental.estimatedAmount)} computed).` : 'No rental invoice has been entered for this month.',
            c.rental.uncovered ? 'Some days fall outside every rate period: check the rate card.' : '',
          ].filter(Boolean);
    case 'other':
      return ['Manual cost entries for the month (operator, transport, insurance, consumables, other). Voided entries are excluded.'];
  }
}

function CalcInfo({ cat, cost }: { cat: CostCategory; cost: MachineCost }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="grid size-6 place-items-center rounded text-muted-foreground hover:text-foreground" aria-label={`Show calculation for ${CATEGORY_META[cat].label}`}>
          <Info className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-1.5 text-xs" align="end">
        <p className="text-sm font-semibold">{CATEGORY_META[cat].label}: how it is worked out</p>
        {calcLines(cat, cost).map((l) => (
          <p key={l}>{l}</p>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export function Tile({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('min-w-0 rounded-xl border bg-card p-2.5 sm:p-3', className)}>
      <div className="truncate text-[11px] font-medium text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

/** Fuel / Maintenance / Rental / Other (one row of four on a phone), plus Total Spend on desktop where this becomes the KPI strip. */
export function CostSummaryTiles({ cost }: { cost: MachineCost }) {
  return (
    <div className="grid grid-cols-4 gap-2 lg:grid-cols-5 lg:gap-3">
      {COST_CATEGORIES.map((cat) => {
        const t = cost.tiles[cat];
        const badge = TILE_BADGE[t.status];
        return (
          <Tile key={cat} label={CATEGORY_META[cat].label} className="relative px-2 sm:px-3">
            <span className="absolute right-1 top-1 hidden lg:block"><CalcInfo cat={cat} cost={cost} /></span>
            <div className="mt-0.5 flex items-center gap-1">
              <span className="size-2 shrink-0 rounded-full" style={{ background: CATEGORY_META[cat].color }} aria-hidden />
              <span className="truncate text-sm font-bold tabular-nums sm:text-base lg:text-lg"><span className="sm:hidden" title={formatINR(t.amount)}>{formatINRCompact(t.amount)}</span><span className="hidden sm:inline">{formatINR(t.amount)}</span></span>
            </div>
            <div className="text-[11px] tabular-nums text-muted-foreground">{t.share !== null ? `${t.share}%` : ' '}</div>
            {badge && <span className={cn('mt-1 inline-block max-w-full truncate rounded px-1.5 py-0.5 text-[10px] font-semibold', BADGE_TONE[badge.tone])}>{badge.text}</span>}
            <div className="mt-1 hidden lg:block"><DeltaBadge delta={cost.comparison.costByCategory[cat]} label={cost.comparison.label} showLabel /></div>
            <div className="mt-1 lg:hidden"><CalcInfo cat={cat} cost={cost} /></div>
          </Tile>
        );
      })}
      <Tile label="Total spend" className="hidden border-primary/40 bg-primary/5 lg:block">
        <div className="mt-0.5 text-lg font-bold tabular-nums">{formatINR(cost.tiles.total)}</div>
        <DeltaBadge delta={cost.comparison.totalSpend} label={cost.comparison.label} showLabel />
      </Tile>
    </div>
  );
}

/** Phone and tablet: Total Spend, Hours and Utilization with their changes. Desktop shows these in the KPI strip instead. */
export function MonthOverview({ cost }: { cost: MachineCost }) {
  const unit = cost.usage.unit;
  return (
    <section className="rounded-xl border bg-card p-3 lg:hidden" aria-label="Month overview">
      <h2 className="mb-2 text-sm font-semibold">Month overview</h2>
      <div className="grid grid-cols-3 gap-2">
        <div className="min-w-0">
          <div className="text-[11px] text-muted-foreground">Total spend</div>
          <div className="truncate text-base font-bold tabular-nums">{formatINR(cost.tiles.total)}</div>
          <DeltaBadge delta={cost.comparison.totalSpend} />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] text-muted-foreground">{unit === 'km' ? 'Total km' : 'Total hours'}</div>
          <div className="truncate text-base font-bold tabular-nums">{unit ? formatQty(cost.usage.quantity) : '—'}</div>
          <DeltaBadge delta={cost.comparison.totalHours} />
        </div>
        <div className="min-w-0">
          <UtilizationMeter variant="bar" percent={cost.utilization.percent} overShift={cost.utilization.overShift} />
          <DeltaBadge delta={cost.comparison.utilization} />
        </div>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">Changes are vs {cost.comparison.label}.</p>
    </section>
  );
}

/** Rate, fuel efficiency, cost per hour; on desktop also Hours and Utilization so the strip is one set of tiles. */
export function MetricTiles({ cost }: { cost: MachineCost }) {
  const m = cost.metrics;
  const unit = cost.usage.unit;
  return (
    <div className="grid grid-cols-3 gap-2 lg:grid-cols-5 lg:gap-3">
      <Tile label={m.referenceRate ? `Rate ${BASIS_LABEL[m.referenceRate.basis]}` : 'Hourly rate'}>
        <div className="mt-0.5 truncate text-sm font-bold tabular-nums sm:text-base">{m.referenceRate ? formatINR(m.referenceRate.amount) : '—'}</div>
        <div className="truncate text-[11px] text-muted-foreground">{m.referenceRate ? (m.chargeOutValue !== null ? `Charge-out ${formatINR(m.chargeOutValue)}` : 'Reference rate') : 'Not set'}</div>
      </Tile>
      <Tile label="Fuel efficiency">
        <div className="mt-0.5 truncate text-sm font-bold tabular-nums sm:text-base">{m.efficiency.value !== null ? `${m.efficiency.value} ${m.efficiency.unit ?? ''}` : '—'}</div>
        <div className="truncate text-[11px] text-muted-foreground">{m.efficiency.entries > 0 ? `${formatQty(m.efficiency.litres)} L over ${formatQty(m.efficiency.usage)} ${unit ?? ''}` : 'No metered diesel'}</div>
      </Tile>
      <Tile label={unit === 'km' ? 'Cost per km' : 'Cost per hour'}>
        <div className="mt-0.5 truncate text-sm font-bold tabular-nums sm:text-base">{formatINR(m.costPerUnit)}</div>
        <div className="truncate text-[11px] text-muted-foreground">{m.costPerUnit === null ? 'No usage this month' : 'Total spend ÷ usage'}</div>
      </Tile>
      <Tile label={unit === 'km' ? 'Km' : 'Hours'} className="hidden lg:block">
        <div className="mt-0.5 text-lg font-bold tabular-nums">{unit ? formatQty(cost.usage.quantity) : '—'}</div>
        <DeltaBadge delta={cost.comparison.totalHours} label={cost.comparison.label} showLabel />
      </Tile>
      <Tile label="Utilization" className="hidden lg:block">
        <UtilizationMeter variant="bar" percent={cost.utilization.percent} overShift={cost.utilization.overShift} label="" />
        <DeltaBadge delta={cost.comparison.utilization} label={cost.comparison.label} showLabel />
      </Tile>
    </div>
  );
}
