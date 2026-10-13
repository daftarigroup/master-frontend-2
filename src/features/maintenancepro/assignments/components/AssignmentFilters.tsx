import { useEffect, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useSiteLocationsList } from '@/features/asset/asset/server/tanstackQuery/useAssetQueries';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { STATUS_ORDER, LEGEND_LABEL } from '../lib/statusStyle';
import type { AssignmentFilters } from '../lib/useAssignmentFilters';
import type { DerivedStatus } from '../types';

const ALL = '__all__';
type Patch = (p: Partial<AssignmentFilters>) => void;

/** Status, site / project and overdue-return filters (shared by the phone sheet and the desktop bar). */
function FilterFields({ filters, patch, idPrefix, compact }: { filters: AssignmentFilters; patch: Patch; idPrefix: string; compact?: boolean }) {
  const sites = useSiteLocationsList();
  const h = compact ? 'h-10 w-44' : 'h-11 w-full';
  return (
    <>
      <Select value={filters.status || ALL} onValueChange={(v) => patch({ status: v === ALL ? '' : (v as DerivedStatus) })}>
        <SelectTrigger aria-label="Status" className={h}><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {STATUS_ORDER.map((s) => <SelectItem key={s} value={s}>{LEGEND_LABEL[s]}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={filters.siteId || ALL} onValueChange={(v) => patch({ siteId: v === ALL ? '' : v })}>
        <SelectTrigger aria-label="Site or project" className={h}><SelectValue placeholder="Site / project" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All sites</SelectItem>
          {(sites.data ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.location}</SelectItem>)}
        </SelectContent>
      </Select>
      <label htmlFor={`${idPrefix}-overdue`} className="flex min-h-11 cursor-pointer items-center gap-2 text-sm lg:min-h-10">
        <input id={`${idPrefix}-overdue`} type="checkbox" className="size-4 accent-primary" checked={filters.overdue} onChange={(e) => patch({ overdue: e.target.checked })} />
        Overdue returns only
      </label>
    </>
  );
}

export function SearchBox({ value, onCommit, className }: { value: string; onCommit: (q: string) => void; className?: string }) {
  const [text, setText] = useState(value);
  const debounced = useDebouncedValue(text, 350);
  useEffect(() => setText(value), [value]);
  useEffect(() => {
    if (debounced.trim() !== value) onCommit(debounced.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);
  return (
    <div className={`relative ${className ?? ''}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input aria-label="Search by equipment, ID, site or project" type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Search by equipment / ID / site / project" className="h-11 pl-9" />
    </div>
  );
}

/** Phone: a filter button with an active-count badge that opens a bottom sheet. */
export function FilterSheetButton({ filters, patch, activeCount }: { filters: AssignmentFilters; patch: Patch; activeCount: number }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative size-11 shrink-0 p-0" aria-label={`Filters${activeCount ? `, ${activeCount} active` : ''}`}>
          <SlidersHorizontal className="size-4" aria-hidden />
          {activeCount > 0 && <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">{activeCount}</span>}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>Narrow the lists below.</SheetDescription>
        </SheetHeader>
        <div className="space-y-3 px-4 pb-6">
          <FilterFields filters={filters} patch={patch} idPrefix="m" />
          {activeCount > 0 && <Button variant="ghost" className="h-11 w-full" onClick={() => patch({ status: '', siteId: '', overdue: false })}>Clear filters</Button>}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Desktop: one inline bar. */
export function FilterBar({ filters, patch }: { filters: AssignmentFilters; patch: Patch }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3">
      <SearchBox value={filters.q} onCommit={(q) => patch({ q })} className="min-w-72 flex-1" />
      <FilterFields filters={filters} patch={patch} idPrefix="d" compact />
    </div>
  );
}
