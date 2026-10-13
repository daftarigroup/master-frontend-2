import { Columns3, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchBox } from '@/features/asset/equipment/components/EquipmentFilterBar';
import { CATEGORY_LABEL as MACHINE_CATEGORY_LABEL } from '@/features/asset/equipment/lib/labels';
import { EQUIPMENT_CATEGORIES } from '@/features/asset/equipment/types';
import { CATEGORY_LABEL, CATEGORY_ORDER } from '../lib/docUi';
import { useDocumentTypes } from '../server/useDocumentQueries';
import type { DocStatus, RegisterQuery } from '../types';
import type { OptionalColumn } from './DocumentRow';

const ALL = '__all__';
const STATUS_OPTIONS: Array<{ value: DocStatus; label: string }> = [
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'EXPIRING_SOON', label: 'Expiring Soon' },
  { value: 'VALID', label: 'Valid' },
  { value: 'NO_EXPIRY', label: 'No expiry' },
];
const WITHIN = [7, 15, 30, 60, 90];

function Pick({ value, onChange, label, children, className }: { value: string; onChange: (v: string) => void; label: string; children: React.ReactNode; className?: string }) {
  return (
    <Select value={value || ALL} onValueChange={(v) => onChange(v === ALL ? '' : v)}>
      <SelectTrigger className={className ?? 'h-11 w-full lg:h-9 lg:w-[150px]'} aria-label={label}><SelectValue placeholder={label} /></SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  );
}

const COLUMN_LABEL: Record<OptionalColumn, string> = { number: 'Doc no.', issuer: 'Issuer', uploaded: 'Uploaded by / on', workOrder: 'Work order' };
export function ColumnPicker({ hidden, onToggle }: { hidden: ReadonlySet<OptionalColumn>; onToggle: (c: OptionalColumn) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild><Button variant="outline" size="sm" className="h-9 gap-1.5"><Columns3 className="size-4" /> Columns</Button></PopoverTrigger>
      <PopoverContent align="end" className="w-48 space-y-1 p-2">
        {(Object.keys(COLUMN_LABEL) as OptionalColumn[]).map((c) => (
          <label key={c} className="flex min-h-9 cursor-pointer items-center gap-2 rounded px-2 text-sm hover:bg-muted">
            <Checkbox checked={!hidden.has(c)} onCheckedChange={() => onToggle(c)} /> {COLUMN_LABEL[c]}
          </label>
        ))}
      </PopoverContent>
    </Popover>
  );
}

interface Props {
  query: RegisterQuery;
  onChange: (patch: Partial<RegisterQuery>) => void;
  onClear: () => void;
  activeCount: number;
}

/** Search, Ownership, Machine category, Document category, Document type, Status, Expiring within N days. The firm / site comes from the project switcher. */
export function RegisterFilters({ query, onChange, onClear, activeCount }: Props) {
  const types = useDocumentTypes(undefined).data ?? [];
  const forCategory = types.filter((t) => !query.category || t.category === query.category);
  return (
    <div className="space-y-2" role="search" aria-label="Filter documents">
      <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-wrap lg:items-center">
        <div className="col-span-2 lg:w-72"><SearchBox value={query.q ?? ''} onCommit={(q) => onChange({ q })} className="h-11 w-full lg:h-9" /></div>
        <Pick label="Ownership" value={query.ownership ?? ''} onChange={(v) => onChange({ ownership: v as RegisterQuery['ownership'] })}>
          <SelectItem value={ALL}>All ownership</SelectItem><SelectItem value="OWNED">Owned</SelectItem><SelectItem value="RENTED">Rented</SelectItem>
        </Pick>
        <Pick label="Machine category" value={query.machineCategory ?? ''} onChange={(v) => onChange({ machineCategory: v })}>
          <SelectItem value={ALL}>All machines</SelectItem>
          {EQUIPMENT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{MACHINE_CATEGORY_LABEL[c]}</SelectItem>)}
        </Pick>
        <Pick label="Document category" value={query.category ?? ''} onChange={(v) => onChange({ category: v as RegisterQuery['category'], typeId: '' })}>
          <SelectItem value={ALL}>All categories</SelectItem>
          {CATEGORY_ORDER.map((c) => <SelectItem key={c} value={c}>{CATEGORY_LABEL[c]}</SelectItem>)}
        </Pick>
        <Pick label="Document type" value={query.typeId ?? ''} onChange={(v) => onChange({ typeId: v })}>
          <SelectItem value={ALL}>All types</SelectItem>
          <SelectGroup><SelectLabel>Types</SelectLabel>{forCategory.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectGroup>
        </Pick>
        <Pick label="Status" value={query.status ?? ''} onChange={(v) => onChange({ status: v as RegisterQuery['status'] })}>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
        </Pick>
        <Pick label="Expiring within" value={query.withinDays ? String(query.withinDays) : ''} onChange={(v) => onChange({ withinDays: v ? Number(v) : '' })}>
          <SelectItem value={ALL}>Any expiry</SelectItem>
          {WITHIN.map((d) => <SelectItem key={d} value={String(d)}>Within {d} days</SelectItem>)}
        </Pick>
        {activeCount > 0 && <Button variant="ghost" size="sm" className="h-11 gap-1 lg:h-9" onClick={onClear}><X className="size-4" /> Clear ({activeCount})</Button>}
      </div>
    </div>
  );
}
