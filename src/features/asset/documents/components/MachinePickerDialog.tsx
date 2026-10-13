import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useEquipmentList } from '@/features/asset/equipment/server/useEquipmentQueries';
import { OwnershipBadge } from '@/features/asset/fleet/components/OwnershipBadge';

/** "Upload Document" on the register: pick the machine, then the Equipment Documents screen opens with the Upload sheet ready. */
export function MachinePickerDialog({ open, onOpenChange, onPick }: { open: boolean; onOpenChange: (o: boolean) => void; onPick: (machineId: string) => void }) {
  const [text, setText] = useState('');
  const q = useEquipmentList({ limit: 200 });
  const machines = useMemo(() => {
    const t = text.trim().toLowerCase();
    return (q.data?.items ?? []).filter((m) => !t || m.name.toLowerCase().includes(t) || m.assetCode.toLowerCase().includes(t)).slice(0, 50);
  }, [q.data, text]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] gap-3 sm:max-w-md">
        <DialogHeader><DialogTitle>Which machine?</DialogTitle><DialogDescription>Choose the machine this document belongs to.</DialogDescription></DialogHeader>
        <Input autoFocus className="h-11" placeholder="Search by name or asset code" aria-label="Search machines" value={text} onChange={(e) => setText(e.target.value)} />
        <ul className="-mx-1 max-h-[50dvh] space-y-1 overflow-y-auto px-1" aria-label="Machines">
          {machines.map((m) => (
            <li key={m.id}>
              <button type="button" onClick={() => onPick(m.id)} className="flex min-h-12 w-full items-center gap-2 rounded-lg border px-3 py-2 text-left hover:bg-muted">
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{m.name}</span><span className="block font-mono text-xs text-muted-foreground">{m.assetCode}</span></span>
                <OwnershipBadge value={m.ownershipType} />
              </button>
            </li>
          ))}
          {!q.isLoading && machines.length === 0 && <li className="p-4 text-center text-sm text-muted-foreground">No machines found.</li>}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
