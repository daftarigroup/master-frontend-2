import { ArrowDown, ArrowUp, ArrowUpDown, Columns3, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { OwnershipBadge } from '@/features/asset/fleet/components/OwnershipBadge';
import { cn } from '@/lib/utils';
import { COLUMNS, type ColumnKey } from '../lib/columns';
import { CATEGORY_LABEL } from '../lib/labels';
import { formatINR, formatQty } from '../lib/money';
import type { EquipmentFilters, EquipmentItem, SortKey } from '../types';
import { EquipmentMenu } from './EquipmentMenu';
import { EquipmentPhoto } from './EquipmentPhoto';
import { StatusPill } from './StatusPill';
import { UtilizationMeter } from './UtilizationMeter';

/** The working "Columns" button: a checkbox list, remembered per browser. */
export function ColumnPicker({ visible, onToggle, onReset, showCost }: { visible: ColumnKey[]; onToggle: (k: ColumnKey) => void; onReset: () => void; showCost: boolean }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Columns3 className="size-4" /> Columns
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-2">
        <div className="max-h-72 space-y-0.5 overflow-y-auto">
          {COLUMNS.filter((c) => !c.costOnly || showCost).map((c) => (
            <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
              <Checkbox checked={visible.includes(c.key)} onCheckedChange={() => onToggle(c.key)} />
              {c.label}
            </label>
          ))}
        </div>
        <Button variant="ghost" size="sm" className="mt-1 w-full text-xs" onClick={onReset}>Reset to default</Button>
      </PopoverContent>
    </Popover>
  );
}

interface Props {
  items: EquipmentItem[] | undefined;
  loading: boolean;
  visible: ColumnKey[];
  showCost: boolean;
  filters: EquipmentFilters;
  onSort: (sort: SortKey) => void;
  selected: Set<string>;
  onSelect: (id: string, on: boolean) => void;
  onSelectAll: (on: boolean) => void;
  activeId: string | null;
  onOpen: (item: EquipmentItem) => void;
  onOpenFull: (item: EquipmentItem) => void;
  onQr: (item: EquipmentItem) => void;
}

const fmtDay = (d: string | null) => (d ? d.split('-').reverse().join('-') : '—');

function cell(key: ColumnKey, m: EquipmentItem) {
  switch (key) {
    case 'photo': return <EquipmentPhoto src={m.imageUrl} category={m.category} name={m.name} className="size-9" />;
    case 'code': return <span className="font-mono text-xs font-bold text-primary">{m.assetCode}</span>;
    case 'category': return <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">{CATEGORY_LABEL[m.category]}</span>;
    case 'ownership': return <OwnershipBadge value={m.ownershipType} />;
    case 'vendor': return m.ownershipType === 'RENTED' ? (m.vendor ?? '—') : <span className="text-muted-foreground">—</span>;
    case 'site': return m.site ?? '—';
    case 'status': return <StatusPill status={m.status} />;
    case 'utilization': return <UtilizationMeter variant="mini" percent={m.utilization.percent} overShift={m.utilization.overShift} />;
    case 'hours': return <span className="tabular-nums">{m.unit ? `${formatQty(m.hoursThisMonth ?? 0)} ${m.unit}` : '—'}</span>;
    case 'lastReading': return <span className="tabular-nums">{formatQty(m.lastReading, 2)}</span>;
    case 'lastDiesel': return fmtDay(m.lastDieselDate);
    case 'efficiency': return m.efficiency ? <span className="tabular-nums">{m.efficiency.value} {m.efficiency.unit}</span> : '—';
    case 'spend': return <span className="tabular-nums font-medium">{m.monthSpend === undefined ? '—' : formatINR(m.monthSpend)}</span>;
  }
}

/**
 * Desktop table: sticky header and sticky first columns, sortable headers, row checkboxes, a working column picker (beside it),
 * click for the side drawer and double-click for the full page. It scrolls inside its own box, never the page.
 */
export function EquipmentTable({ items, loading, visible, showCost, filters, onSort, selected, onSelect, onSelectAll, activeId, onOpen, onOpenFull, onQr }: Props) {
  const cols = COLUMNS.filter((c) => visible.includes(c.key) && (!c.costOnly || showCost));
  const allSelected = !!items?.length && items.every((i) => selected.has(i.id));

  const sortIcon = (sort?: SortKey) =>
    !sort ? null : filters.sort === sort ? (filters.dir === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />) : <ArrowUpDown className="size-3 opacity-40" />;

  return (
    <div className="max-h-[68vh] overflow-auto rounded-xl border bg-card">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 top-0 z-30 w-10 border-b bg-card px-3 py-2.5">
              <Checkbox checked={allSelected} onCheckedChange={(v) => onSelectAll(v === true)} aria-label="Select all on this page" />
            </th>
            <th className="sticky left-10 top-0 z-30 min-w-[170px] border-b bg-card px-2.5 py-2.5 text-left">
              <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground" onClick={() => onSort('name')}>
                Name {sortIcon('name')}
              </button>
            </th>
            {cols.map((c) => (
              <th key={c.key} className="sticky top-0 z-20 whitespace-nowrap border-b bg-card px-2 py-2.5 text-left">
                {c.sort ? (
                  <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground" onClick={() => onSort(c.sort!)}>
                    {c.label} {sortIcon(c.sort)}
                  </button>
                ) : (
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{c.label}</span>
                )}
              </th>
            ))}
            <th className="sticky right-0 top-0 z-30 w-12 border-b bg-card px-2 py-2.5"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {loading && !items
            ? Array.from({ length: 8 }, (_, r) => (
                <tr key={r}>
                  <td colSpan={cols.length + 3} className="border-b p-3"><Skeleton className="h-8 w-full" /></td>
                </tr>
              ))
            : items?.map((m) => {
                const on = selected.has(m.id);
                const bg = activeId === m.id ? 'bg-primary/5' : 'bg-card';
                return (
                  <tr key={m.id} className="group cursor-pointer" onClick={() => onOpen(m)} onDoubleClick={() => onOpenFull(m)}>
                    <td className={cn('sticky left-0 z-10 border-b px-3 py-2 group-hover:bg-muted', bg)} onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={on} onCheckedChange={(v) => onSelect(m.id, v === true)} aria-label={`Select ${m.name}`} />
                    </td>
                    <td className={cn('sticky left-10 z-10 border-b px-2.5 py-2 font-semibold group-hover:bg-muted', bg)}>{m.name}</td>
                    {cols.map((c) => (
                      <td key={c.key} className={cn('whitespace-nowrap border-b px-2 py-2 group-hover:bg-muted', bg)}>{cell(c.key, m)}</td>
                    ))}
                    <td className={cn('sticky right-0 z-10 border-b px-1 py-1 group-hover:bg-muted', bg)} onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center">
                        <Button variant="ghost" size="icon" className="hidden size-8 2xl:inline-flex" aria-label={`QR tag for ${m.name}`} onClick={() => onQr(m)}><QrCode className="size-4" /></Button>
                        <EquipmentMenu item={m} canCost={showCost} onQr={onQr} />
                      </div>
                    </td>
                  </tr>
                );
              })}
        </tbody>
      </table>
    </div>
  );
}

export default EquipmentTable;
