import { ExternalLink, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { EquipmentPhoto } from '@/features/asset/equipment/components/EquipmentPhoto';
import { StatusPill } from '@/features/asset/equipment/components/StatusPill';
import { CATEGORY_LABEL } from '@/features/asset/equipment/lib/labels';
import { OwnershipBadge } from '@/features/asset/fleet/components/OwnershipBadge';
import type { MachineDocs } from '../types';

/** The machine card of the mockup: photo, name, asset code | category chip, ownership pill, derived status, site, View Equipment. */
export function DocumentMachineCard({ machine }: { machine: MachineDocs['machine'] }) {
  const to = `/asset/equipment?q=${encodeURIComponent(machine.assetCode)}`;
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-2 rounded-xl border bg-card p-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:p-4">
      <EquipmentPhoto src={machine.imageUrl} category={machine.category} name={machine.name} className="size-16 sm:size-20" />
      <div className="min-w-0">
        <h2 className="text-base font-bold leading-tight">{machine.name}</h2>
        <p className="mt-0.5 flex flex-nowrap items-center gap-x-2 text-xs text-muted-foreground">
          <span className="font-mono font-bold text-primary">{machine.assetCode}</span>
          <span aria-hidden>|</span>
          <span className="rounded-md bg-muted px-1.5 py-0.5 font-medium text-foreground">{CATEGORY_LABEL[machine.category]}</span>
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <OwnershipBadge value={machine.ownershipType} />
          <StatusPill status={machine.status} />
        </div>
        {machine.site && <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3.5 shrink-0" aria-hidden /><span className="truncate">{machine.site}</span></p>}
      </div>
      <Button asChild variant="outline" size="sm" className="col-span-2 h-10 whitespace-nowrap sm:col-span-1 sm:h-9">
        <Link to={to}><ExternalLink className="size-3.5" /> View Equipment</Link>
      </Button>
    </div>
  );
}
