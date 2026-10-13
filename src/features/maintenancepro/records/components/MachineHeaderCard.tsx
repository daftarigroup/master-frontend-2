import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { EquipmentPhoto } from '@/features/asset/equipment/components/EquipmentPhoto';
import { StatusPill } from '@/features/asset/equipment/components/StatusPill';
import { CATEGORY_LABEL } from '@/features/asset/equipment/lib/labels';
import { OwnershipBadge } from '@/features/asset/fleet/components/OwnershipBadge';
import { readingText } from '../lib/due';
import type { RecordSummary } from '../types';

export function MachineHeaderCard({ machine }: { machine: RecordSummary['machine'] }) {
  const to = `/asset/equipment?q=${encodeURIComponent(machine.assetCode)}`;
  const reading = machine.readingUnit === 'NONE' ? null : readingText(machine.currentReading, machine.readingUnit);
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-card p-3 sm:p-4">
      <EquipmentPhoto src={machine.imageUrl} category={machine.category} name={machine.name} className="size-16 sm:size-20" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="truncate text-base font-bold leading-tight">{machine.name}</h2>
          <StatusPill status={machine.status} />
          <OwnershipBadge value={machine.ownershipType} />
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          <span className="font-mono font-bold text-primary">{machine.assetCode}</span> · {CATEGORY_LABEL[machine.category]}{reading ? ` · ${reading}` : ''}
        </p>
        <Button asChild variant="outline" size="sm" className="mt-2 h-11 lg:hidden"><Link to={to}><ExternalLink className="size-3.5" /> View Equipment</Link></Button>
      </div>
      <Button asChild variant="outline" className="hidden shrink-0 lg:inline-flex"><Link to={to}><ExternalLink className="size-4" /> View Equipment</Link></Button>
    </div>
  );
}
