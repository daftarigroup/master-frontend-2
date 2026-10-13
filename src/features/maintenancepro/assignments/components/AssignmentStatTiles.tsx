import { KpiTile } from '@/components/shared/KpiTile';
import { cn } from '@/lib/utils';
import { TILE } from '../lib/statusStyle';
import type { AssignmentStats, DerivedStatus } from '../types';

const TILES: Array<{ status: DerivedStatus; label: string; key: keyof AssignmentStats }> = [
  { status: 'IN_USE', label: 'In Use', key: 'inUse' },
  { status: 'AVAILABLE', label: 'Available', key: 'available' },
  { status: 'UNDER_MAINT', label: 'Maintenance', key: 'maintenance' },
  { status: 'IDLE', label: 'Idle', key: 'idle' },
  { status: 'IN_TRANSIT', label: 'In Transit', key: 'inTransit' },
];

/** The tiles ignore the status filter, so a tile count always equals the list you get by tapping it. In Transit shows only when there is one. */
export function AssignmentStatTiles({ stats, active, onPick, loading }: { stats?: AssignmentStats; active: DerivedStatus | ''; onPick: (s: DerivedStatus | '') => void; loading: boolean }) {
  const showTransit = (stats?.inTransit ?? 0) > 0 || active === 'IN_TRANSIT';
  return (
    <div role="group" aria-label="Filter by status" className={cn('grid grid-cols-4 gap-2', showTransit && 'lg:grid-cols-5')}>
      {TILES.filter((t) => t.status !== 'IN_TRANSIT' || showTransit).map((t) => (
        <KpiTile
          key={t.status}
          label={t.label}
          value={loading || !stats ? '–' : stats[t.key]}
          icon={TILE[t.status].icon}
          hideIconOnPhone
          tone={TILE[t.status].tone}
          active={active === t.status}
          onClick={() => onPick(active === t.status ? '' : t.status)}
          className={cn('min-h-16', t.status === 'IN_TRANSIT' && 'col-span-4 lg:col-span-1')}
        />
      ))}
    </div>
  );
}
