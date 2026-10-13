import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProject } from '@/context/ProjectContext';
import { toFirmParam } from '@/features/maintenancepro/shared/lib/common';
import { useSiteLocationsList } from '@/features/asset/asset/server/tanstackQuery/useAssetQueries';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { CATEGORY_LABEL, OWNERSHIP_LABEL, SORT_LABEL, STATUS_LABEL } from '../lib/labels';
import { EQUIPMENT_CATEGORIES, type EquipmentFilters, type SortKey } from '../types';

interface Props {
  filters: EquipmentFilters;
  onChange: (patch: Partial<EquipmentFilters>) => void;
  onClear: () => void;
  activeCount: number;
}

const ALL = '__all__';
const SORTS = Object.keys(SORT_LABEL) as SortKey[];

function Pick({ value, onChange, placeholder, children, className }: { value: string; onChange: (v: string) => void; placeholder: string; children: React.ReactNode; className?: string }) {
  return (
    <Select value={value || ALL} onValueChange={(v) => onChange(v === ALL ? '' : v)}>
      <SelectTrigger className={className ?? 'h-9 w-[150px]'} aria-label={placeholder}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  );
}

/** A search box that writes to the URL a moment after typing stops (server-side search, debounced). */
export function SearchBox({ value, onCommit, className }: { value: string; onCommit: (q: string) => void; className?: string }) {
  const [text, setText] = useState(value);
  const debounced = useDebouncedValue(text, 350);
  // the URL can change elsewhere (Clear all, back button): follow it
  useEffect(() => setText(value), [value]);
  useEffect(() => {
    if (debounced.trim() !== value) onCommit(debounced.trim());
    // only when the typed text settles
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);
  return (
    <div className={`relative ${className ?? ''}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Search equipment by name or asset code"
        aria-label="Search equipment"
        className="h-11 pl-9 placeholder:text-[13px] lg:h-9"
      />
    </div>
  );
}

/**
 * Desktop filter bar (Search, Category, Ownership, Status, Site, Vendor, Sort) with removable tags for what is active and a
 * Clear all. It edits the same URL state as the phone chips.
 */
export function EquipmentFilterBar({ filters, onChange, onClear, activeCount }: Props) {
  const { selectedProject } = useProject();
  const firmId = toFirmParam(selectedProject);
  const sites = useSiteLocationsList();
  const siteOptions = (sites.data ?? []).filter((s) => !firmId || !s.firmId || String(s.firmId) === String(firmId));
  const [vendor, setVendor] = useState(filters.vendor);
  const debouncedVendor = useDebouncedValue(vendor, 350);
  useEffect(() => setVendor(filters.vendor), [filters.vendor]);
  useEffect(() => {
    if (debouncedVendor.trim() !== filters.vendor) onChange({ vendor: debouncedVendor.trim() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedVendor]);

  const siteName = sites.data?.find((s) => s.id === filters.siteId)?.location ?? 'Site';
  const tags: Array<{ key: string; label: string; clear: () => void }> = [
    ...(filters.category ? [{ key: 'category', label: `Category: ${CATEGORY_LABEL[filters.category]}`, clear: () => onChange({ category: '' }) }] : []),
    ...(filters.ownership ? [{ key: 'ownership', label: `Ownership: ${OWNERSHIP_LABEL[filters.ownership]}`, clear: () => onChange({ ownership: '' }) }] : []),
    ...(filters.status ? [{ key: 'status', label: `Status: ${STATUS_LABEL[filters.status]}`, clear: () => onChange({ status: '' }) }] : []),
    ...(filters.siteId ? [{ key: 'site', label: `Site: ${siteName}`, clear: () => onChange({ siteId: '' }) }] : []),
    ...(filters.vendor ? [{ key: 'vendor', label: `Vendor: ${filters.vendor}`, clear: () => onChange({ vendor: '' }) }] : []),
  ];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Pick value={filters.category} onChange={(v) => onChange({ category: v as EquipmentFilters['category'] })} placeholder="Category">
          <SelectItem value={ALL}>All categories</SelectItem>
          {EQUIPMENT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CATEGORY_LABEL[c]}</SelectItem>)}
        </Pick>
        <Pick value={filters.ownership} onChange={(v) => onChange({ ownership: v as EquipmentFilters['ownership'] })} placeholder="Ownership" className="h-9 w-[170px]">
          <SelectItem value={ALL}>Owned and rented</SelectItem>
          <SelectItem value="OWNED">Owned</SelectItem>
          <SelectItem value="RENTED">Rented</SelectItem>
        </Pick>
        <Pick value={filters.status} onChange={(v) => onChange({ status: v as EquipmentFilters['status'] })} placeholder="Status" className="h-9 w-[140px]">
          <SelectItem value={ALL}>Any status</SelectItem>
          {(['IN_USE', 'UNDER_MAINT', 'IDLE', 'IN_TRANSIT'] as const).map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
        </Pick>
        <Pick value={filters.siteId} onChange={(v) => onChange({ siteId: v })} placeholder="Site" className="h-9 w-[170px]">
          <SelectItem value={ALL}>All sites</SelectItem>
          {siteOptions.map((s) => <SelectItem key={s.id} value={s.id}>{s.location}</SelectItem>)}
        </Pick>
        <Input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Vendor" aria-label="Vendor" className="h-9 w-[140px]" />
        <div className="ml-auto flex items-center gap-1">
          <Pick value={filters.sort} onChange={(v) => onChange({ sort: (v || 'code') as SortKey })} placeholder="Sort" className="h-9 w-[170px]">
            {SORTS.map((s) => <SelectItem key={s} value={s}>Sort: {SORT_LABEL[s]}</SelectItem>)}
          </Pick>
          <Button variant="outline" size="icon" aria-label={filters.dir === 'asc' ? 'Ascending' : 'Descending'} onClick={() => onChange({ dir: filters.dir === 'asc' ? 'desc' : 'asc' })}>
            {filters.dir === 'asc' ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />}
          </Button>
        </div>
      </div>

      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {tags.map((t) => (
            <span key={t.key} className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 py-0.5 pl-2.5 pr-1 text-xs font-medium text-primary">
              {t.label}
              <button type="button" onClick={t.clear} aria-label={`Remove ${t.label}`} className="grid size-5 place-items-center rounded-full hover:bg-primary/20">
                <X className="size-3" />
              </button>
            </span>
          ))}
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onClear}>Clear all</Button>
        </div>
      )}
    </div>
  );
}

export default EquipmentFilterBar;
