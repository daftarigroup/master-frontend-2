import { useMemo, useState } from 'react';
import { Check, ChevronDown, Layers, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { EquipmentPhoto } from '@/features/asset/equipment/components/EquipmentPhoto';
import { StatusPill } from '@/features/asset/equipment/components/StatusPill';
import { CATEGORY_LABEL } from '@/features/asset/equipment/lib/labels';
import type { EquipmentItem } from '@/features/asset/equipment/types';
import { OwnershipBadge } from '@/features/asset/fleet/components/OwnershipBadge';

export interface MachineDropdownProps {
  machine: EquipmentItem | undefined;
  capacity?: string | null | undefined;
  loading: boolean;
  allMachines: boolean;
  machines: EquipmentItem[];
  onSelectMachine: (id: string) => void;
  onSelectAllMachines: () => void;
}

/**
 * Dropdown selector for switching machines in Daily Work Logs.
 * Displays the currently selected machine as a clean card trigger with ChevronDown,
 * and opens a searchable dropdown menu anchored below it to switch between machines or All Machines.
 */
export function MachineDropdown({
  machine,
  capacity,
  loading,
  allMachines,
  machines,
  onSelectMachine,
  onSelectAllMachines,
}: MachineDropdownProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const filteredMachines = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return machines;
    return machines.filter((m) =>
      `${m.name} ${m.assetCode} ${m.registrationNo ?? ''}`.toLowerCase().includes(t),
    );
  }, [machines, q]);

  const triggerContent = allMachines ? (
    <>
      <span className="grid size-12 sm:size-14 shrink-0 place-items-center rounded-lg border bg-muted text-muted-foreground">
        <Layers className="size-6 text-primary" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm sm:text-base font-bold">All machines</span>
        <span className="block text-xs text-muted-foreground">Day sheet across the fleet</span>
      </span>
    </>
  ) : loading || !machine ? (
    <>
      <Skeleton className="size-12 sm:size-14 shrink-0 rounded-lg" />
      <span className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </span>
    </>
  ) : (
    <>
      <EquipmentPhoto
        src={machine.imageUrl}
        category={machine.category}
        name={machine.name}
        className="size-12 sm:size-14 shrink-0 rounded-lg"
      />
      <span className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="block truncate text-sm sm:text-base font-bold leading-tight text-foreground">
            {machine.name}
          </span>
          {machine.ownershipType && <OwnershipBadge value={machine.ownershipType} />}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-xs font-bold text-primary">{machine.assetCode}</span>
          <StatusPill status={machine.status} />
        </div>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {CATEGORY_LABEL[machine.category]}
          {capacity ? ` • ${capacity}` : ''}
        </span>
      </span>
    </>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-label="Switch machine"
          className="group flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left shadow-2xs transition-all hover:border-primary/50 focus:outline-hidden focus:ring-2 focus:ring-primary/20"
        >
          {triggerContent}
          <ChevronDown
            className={cn(
              'size-5 shrink-0 text-muted-foreground transition-transform duration-200',
              open && 'rotate-180 text-foreground',
            )}
            aria-hidden
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[var(--radix-popover-trigger-width)] min-w-[20rem] max-w-[28rem] p-0 shadow-lg rounded-xl border border-slate-200 dark:border-slate-800 bg-popover overflow-hidden"
      >
        {/* Search header */}
        <div className="p-2 border-b border-border/60 bg-muted/30">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, code or registration…"
              aria-label="Search machines"
              className="h-9 pl-9 pr-8 text-xs bg-background"
              autoFocus
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Dropdown list */}
        <div className="max-h-[60vh] sm:max-h-[22rem] overflow-y-auto p-1.5 space-y-1">
          {/* Option: All machines */}
          <button
            type="button"
            onClick={() => {
              onSelectAllMachines();
              setOpen(false);
            }}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-muted/80',
              allMachines
                ? 'bg-primary/10 font-semibold text-primary border border-primary/20'
                : 'text-foreground',
            )}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-md border bg-muted text-muted-foreground">
              <Layers className="size-4 text-primary" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-bold">All machines</span>
              <span className="block truncate text-[11px] text-muted-foreground">
                Day sheet across the fleet
              </span>
            </span>
            {allMachines && <Check className="size-4 shrink-0 text-primary" />}
          </button>

          <div className="my-1 border-t border-border/50" />

          {/* Machine items */}
          {filteredMachines.map((m) => {
            const isSelected = !allMachines && m.id === machine?.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  onSelectMachine(m.id);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-muted/80',
                  isSelected
                    ? 'bg-primary/10 border border-primary/20'
                    : 'text-foreground',
                )}
              >
                <EquipmentPhoto
                  src={m.imageUrl}
                  category={m.category}
                  name={m.name}
                  className="size-10 shrink-0 rounded-md"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold leading-tight">{m.name}</span>
                  <div className="mt-0.5 flex items-center gap-1.5 flex-wrap text-[11px] text-muted-foreground">
                    <span className="font-mono font-semibold">{m.assetCode}</span>
                    {m.registrationNo && <span>• {m.registrationNo}</span>}
                    {m.ownershipType && <OwnershipBadge value={m.ownershipType} />}
                  </div>
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusPill status={m.status} />
                  {isSelected && <Check className="size-4 text-primary" />}
                </div>
              </button>
            );
          })}

          {filteredMachines.length === 0 && (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No machine found matching "{q}".
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Backward compatibility alias
export const MachineCard = MachineDropdown;
export function MachinePickerDialog() {
  return null;
}
