import { useState } from 'react';
import { ArrowUpDown, Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useSiteLocationsList } from '@/features/asset/asset/server/tanstackQuery/useAssetQueries';
import { cn } from '@/lib/utils';
import { CATEGORY_LABEL, OWNERSHIP_LABEL, SORT_LABEL, STATUS_LABEL } from '../lib/labels';
import { EQUIPMENT_CATEGORIES, type EquipmentFilters, type SortKey } from '../types';

export type FilterGroup = 'category' | 'ownership' | 'status' | 'site' | 'sort';

interface Props {
  filters: EquipmentFilters;
  onChange: (patch: Partial<EquipmentFilters>) => void;
  onClear: () => void;
  /** Which sheet is open: one group (tapped chip) or all of them (header filter button). Null = closed. */
  open: FilterGroup | 'all' | null;
  onOpenChange: (open: FilterGroup | 'all' | null) => void;
}

const SORTS = Object.keys(SORT_LABEL) as SortKey[];

function Option({ label, selected, onSelect }: { label: string; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn('flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-left text-sm', selected ? 'bg-primary/10 font-semibold text-primary' : 'hover:bg-muted')}
    >
      {label}
      {selected && <Check className="size-4" />}
    </button>
  );
}

function Chip({ label, value, active, onClick }: { label: string; value?: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border bg-card px-3 text-sm font-medium shadow-xs',
        active && 'border-primary bg-primary/10 text-primary',
      )}
    >
      {active && value ? value : label}
      <ChevronDown className="size-4 opacity-60" aria-hidden />
    </button>
  );
}

/**
 * Phone and tablet filters: the chip row from the mockup (Category, Ownership, Status, Sort). Each chip opens a bottom sheet of
 * options; the header filter button opens the sheet with every group, plus Site and Vendor. The desktop filter bar edits the same
 * state, so nothing here is phone-only logic.
 */
export function EquipmentFilterChips({ filters, onChange, onClear, open, onOpenChange }: Props) {
  const sites = useSiteLocationsList();
  const [vendorDraft, setVendorDraft] = useState(filters.vendor);
  const show = (g: FilterGroup) => open === 'all' || open === g;

  return (
    <>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="toolbar" aria-label="Filters">
        <Chip label="Category" value={filters.category ? CATEGORY_LABEL[filters.category] : ''} active={!!filters.category} onClick={() => onOpenChange('category')} />
        <Chip label="Ownership" value={filters.ownership ? OWNERSHIP_LABEL[filters.ownership] : ''} active={!!filters.ownership} onClick={() => onOpenChange('ownership')} />
        <Chip label="Status" value={filters.status ? STATUS_LABEL[filters.status] : ''} active={!!filters.status} onClick={() => onOpenChange('status')} />
        <button
          type="button"
          onClick={() => onOpenChange('sort')}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border bg-card px-3 text-sm font-medium shadow-xs"
        >
          <ArrowUpDown className="size-4 opacity-60" aria-hidden />
          Sort: {SORT_LABEL[filters.sort]}
          <ChevronDown className="size-4 opacity-60" aria-hidden />
        </button>
      </div>

      <Sheet open={open !== null} onOpenChange={(o) => !o && onOpenChange(null)}>
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-2xl px-4 pb-6">
          <SheetHeader className="p-0 pt-4">
            <SheetTitle>{open === 'all' ? 'Filters' : open ? { category: 'Category', ownership: 'Ownership', status: 'Status', site: 'Site', sort: 'Sort by' }[open] : ''}</SheetTitle>
            <SheetDescription className="sr-only">Filter the equipment list</SheetDescription>
          </SheetHeader>

          {show('category') && (
            <section className="space-y-0.5">
              {open === 'all' && <h4 className="px-3 pt-2 text-xs font-semibold uppercase text-muted-foreground">Category</h4>}
              <Option label="All categories" selected={!filters.category} onSelect={() => { onChange({ category: '' }); if (open !== 'all') onOpenChange(null); }} />
              {EQUIPMENT_CATEGORIES.map((c) => (
                <Option key={c} label={CATEGORY_LABEL[c]} selected={filters.category === c} onSelect={() => { onChange({ category: c }); if (open !== 'all') onOpenChange(null); }} />
              ))}
            </section>
          )}
          {show('ownership') && (
            <section className="space-y-0.5">
              {open === 'all' && <h4 className="px-3 pt-2 text-xs font-semibold uppercase text-muted-foreground">Ownership</h4>}
              <Option label="Owned and rented" selected={!filters.ownership} onSelect={() => { onChange({ ownership: '' }); if (open !== 'all') onOpenChange(null); }} />
              <Option label="Owned" selected={filters.ownership === 'OWNED'} onSelect={() => { onChange({ ownership: 'OWNED' }); if (open !== 'all') onOpenChange(null); }} />
              <Option label="Rented" selected={filters.ownership === 'RENTED'} onSelect={() => { onChange({ ownership: 'RENTED' }); if (open !== 'all') onOpenChange(null); }} />
            </section>
          )}
          {show('status') && (
            <section className="space-y-0.5">
              {open === 'all' && <h4 className="px-3 pt-2 text-xs font-semibold uppercase text-muted-foreground">Status</h4>}
              <Option label="Any status" selected={!filters.status} onSelect={() => { onChange({ status: '' }); if (open !== 'all') onOpenChange(null); }} />
              {(['IN_USE', 'UNDER_MAINT', 'IDLE', 'IN_TRANSIT'] as const).map((s) => (
                <Option key={s} label={STATUS_LABEL[s]} selected={filters.status === s} onSelect={() => { onChange({ status: s }); if (open !== 'all') onOpenChange(null); }} />
              ))}
            </section>
          )}
          {open === 'all' && (
            <section className="space-y-0.5">
              <h4 className="px-3 pt-2 text-xs font-semibold uppercase text-muted-foreground">Site</h4>
              <Option label="All sites" selected={!filters.siteId} onSelect={() => onChange({ siteId: '' })} />
              {(sites.data ?? []).map((s) => (
                <Option key={s.id} label={s.location} selected={filters.siteId === s.id} onSelect={() => onChange({ siteId: s.id })} />
              ))}
              <h4 className="px-3 pt-3 text-xs font-semibold uppercase text-muted-foreground">Vendor</h4>
              <div className="px-1">
                <Input
                  value={vendorDraft}
                  placeholder="Vendor name"
                  className="h-11"
                  onChange={(e) => setVendorDraft(e.target.value)}
                  onBlur={() => onChange({ vendor: vendorDraft.trim() })}
                />
              </div>
            </section>
          )}
          {show('sort') && (
            <section className="space-y-0.5">
              {open === 'all' && <h4 className="px-3 pt-2 text-xs font-semibold uppercase text-muted-foreground">Sort by</h4>}
              {SORTS.map((s) => (
                <Option key={s} label={SORT_LABEL[s]} selected={filters.sort === s} onSelect={() => { onChange({ sort: s }); if (open !== 'all') onOpenChange(null); }} />
              ))}
              <Option
                label={filters.dir === 'asc' ? 'Ascending (tap for descending)' : 'Descending (tap for ascending)'}
                selected={false}
                onSelect={() => onChange({ dir: filters.dir === 'asc' ? 'desc' : 'asc' })}
              />
            </section>
          )}

          {open === 'all' && (
            <div className="mt-4 flex gap-2">
              <Button variant="outline" className="min-h-11 flex-1" onClick={() => { onClear(); setVendorDraft(''); }}>Clear all</Button>
              <Button className="min-h-11 flex-1" onClick={() => onOpenChange(null)}>Done</Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

export default EquipmentFilterChips;
