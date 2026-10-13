import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/features/asset/equipment/components/StatusPill';
import { EquipmentPhoto } from '@/features/asset/equipment/components/EquipmentPhoto';
import { OwnershipBadge } from '@/features/asset/fleet/components/OwnershipBadge';
import type { AssignmentAction, AssignmentList } from '../types';
import { Panel, PanelState } from './Panel';
import { RowActions } from './RowActions';
import { ReturnBy } from './ReturnBy';

const PREVIEW = 5;

interface Props {
  data?: AssignmentList;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onAction: (a: AssignmentAction) => void;
}

/** Phone: cards for machines that have an active assignment (whatever their status). */
export function AssignedList({ data, loading, error, onRetry, onAction }: Props) {
  const [all, setAll] = useState(false);
  const rows = data?.rows ?? [];
  const shown = all ? rows : rows.slice(0, PREVIEW);
  return (
    <Panel
      title="Assigned to Projects"
      count={data?.total}
      action={rows.length > PREVIEW && <Button variant="ghost" className="h-11 px-2 text-sm" onClick={() => setAll((v) => !v)}>{all ? 'Show less' : 'View all'}</Button>}
    >
      <PanelState loading={loading && !data} error={error && !data} onRetry={onRetry} empty={data && rows.length === 0 ? 'No machines match these filters.' : undefined} />
      <ul className="space-y-2">
        {shown.map((r) => (
          <li key={r.machine.id} className="flex items-start gap-3 rounded-lg border p-2.5">
            <EquipmentPhoto src={r.machine.imageUrl} category={r.machine.category} name={r.machine.name} className="size-14" />
            <div className="min-w-0 flex-1 space-y-0.5 text-xs">
              <p className="truncate text-sm font-semibold">{r.machine.name}</p>
              <p className="flex flex-wrap items-center gap-1.5 text-muted-foreground">{r.machine.assetCode}<OwnershipBadge value={r.machine.ownershipType} /></p>
              <p className="truncate">{r.assignment?.site ? `${r.assignment.site.name} · ` : ''}{r.assignment?.firm.name}</p>
              <p><ReturnBy row={r} /></p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <StatusPill status={r.status} />
              <RowActions row={r} onAction={onAction} />
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
