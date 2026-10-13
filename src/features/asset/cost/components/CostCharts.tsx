import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { formatINR } from '@/features/asset/equipment/lib/money';
import { CATEGORY_META, COST_CATEGORIES, monthShort } from '../lib/costLabels';
import type { CostCategory, TrendPoint } from '../types';

const config: ChartConfig = Object.fromEntries(COST_CATEGORIES.map((c) => [c, { label: CATEGORY_META[c].label, color: CATEGORY_META[c].color }]));

/** Share of spend by category. Each slice is also written out in the legend below, so colour is never the only cue. */
export function CategoryDonut({ amounts }: { amounts: Record<CostCategory, number | null> }) {
  const data = COST_CATEGORIES.map((c) => ({ key: c, name: CATEGORY_META[c].label, value: amounts[c] ?? 0 })).filter((d) => d.value > 0);
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <p className="grid h-40 place-items-center text-sm text-muted-foreground">No spend to chart this month.</p>;
  return (
    <div className="space-y-2">
      <ChartContainer config={config} className="mx-auto aspect-square max-h-48 w-full" role="img" aria-label={`Spend by category: ${data.map((d) => `${d.name} ${formatINR(d.value)}`).join(', ')}`}>
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent hideLabel formatter={(v, n) => `${n}: ${formatINR(Number(v))}`} />} />
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" strokeWidth={2} isAnimationActive={false}>
            {data.map((d) => <Cell key={d.key} fill={CATEGORY_META[d.key].color} />)}
          </Pie>
        </PieChart>
      </ChartContainer>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        {data.map((d) => (
          <li key={d.key} className="flex items-center gap-1.5">
            <span className="size-2.5 shrink-0 rounded-sm" style={{ background: CATEGORY_META[d.key].color }} aria-hidden />
            <span className="flex-1 truncate">{d.name}</span>
            <span className="tabular-nums text-muted-foreground">{Math.round((d.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Stacked monthly spend for the last six months, ending at the selected month. A null category (not priceable) plots as nothing, not zero spend. */
export function TrendChart({ data, loading }: { data: TrendPoint[] | undefined; loading?: boolean }) {
  if (loading || !data) return <Skeleton className="h-52 w-full" />;
  const rows = data.map((p) => ({ ...p, label: monthShort(p.month) }));
  if (rows.every((r) => !r.total)) return <p className="grid h-40 place-items-center text-sm text-muted-foreground">No spend in the last six months.</p>;
  return (
    <ChartContainer config={config} className="aspect-auto h-56 w-full" role="img" aria-label={`Monthly spend, last ${rows.length} months: ${rows.map((r) => `${r.label} ${formatINR(r.total)}`).join(', ')}`}>
      <BarChart data={rows} margin={{ left: 0, right: 4, top: 4 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} />
        <YAxis width={44} tickLine={false} axisLine={false} tickFormatter={(v) => (v >= 100000 ? `${Math.round(v / 1000) / 100}L` : v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(v))} />
        <ChartTooltip content={<ChartTooltipContent formatter={(v, n) => `${CATEGORY_META[n as CostCategory]?.label ?? n}: ${formatINR(Number(v))}`} />} />
        <ChartLegend content={<ChartLegendContent />} />
        {COST_CATEGORIES.map((c) => <Bar key={c} dataKey={c} stackId="spend" fill={CATEGORY_META[c].color} radius={0} isAnimationActive={false} />)}
      </BarChart>
    </ChartContainer>
  );
}
