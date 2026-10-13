import { CheckCircle2, Gauge, IndianRupee, PauseCircle, Route, Truck, Wrench, type LucideIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatINR } from '../lib/money';
import type { DerivedStatus, EquipmentStats, OwnershipFilter } from '../types';

interface Props {
  stats: EquipmentStats | undefined;
  activeStatus: DerivedStatus | '';
  activeOwnership: OwnershipFilter | '';
  /** Tapping a tile sets the Status filter (Total clears it); the list then has exactly the tile's count. */
  onStatus: (status: DerivedStatus | '') => void;
  onOwnership: (o: OwnershipFilter | '') => void;
  /** Fleet spend is only offered (and only sent by the server) to cost-permitted roles. */
  showSpend: boolean;
}

const TONE = {
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300',
  red: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
  violet: 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300',
} as const;

function Tile({ icon: Icon, tone, value, label, active, onClick, className }: { icon: LucideIcon; tone: keyof typeof TONE; value: string | number; label: string; active?: boolean; onClick?: () => void; className?: string }) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-pressed={onClick ? !!active : undefined}
      className={cn(
        'flex min-h-[4.25rem] flex-col items-start justify-between gap-1 rounded-xl border bg-card p-2.5 text-left shadow-xs sm:p-3',
        onClick && 'cursor-pointer transition-colors hover:border-primary/50',
        active && 'border-primary ring-1 ring-primary',
        className,
      )}
    >
      <span className={cn('grid size-8 place-items-center rounded-lg', TONE[tone])}>
        <Icon className="size-4" aria-hidden />
      </span>
      <span>
        <span className="block truncate text-xl font-bold leading-none tabular-nums sm:text-2xl">{value}</span>
        <span className="mt-1 block text-[11px] leading-tight text-muted-foreground sm:text-xs">{label}</span>
      </span>
    </Comp>
  );
}

/**
 * Phone: the four status tiles in one row (Total, In Use, Under Maint., Idle). Desktop adds the Owned/Rented split, fleet
 * utilization this month and, for permitted roles, fleet spend. Same component; the extras are hidden below `xl` / `lg`.
 */
export function EquipmentStatTiles({ stats, activeStatus, activeOwnership, onStatus, onOwnership, showSpend }: Props) {
  if (!stats) {
    return (
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[4.25rem] rounded-xl" />
        ))}
      </div>
    );
  }
  const spend = showSpend && stats.fleetSpend !== undefined;
  return (
    <div className={cn('grid grid-cols-4 gap-2 sm:gap-3', spend ? '2xl:grid-cols-8' : '2xl:grid-cols-7')}>
      <Tile icon={Truck} tone="amber" value={stats.total} label="Total" active={activeStatus === ''} onClick={() => onStatus('')} />
      <Tile icon={CheckCircle2} tone="emerald" value={stats.inUse} label="In Use" active={activeStatus === 'IN_USE'} onClick={() => onStatus('IN_USE')} />
      <Tile icon={Wrench} tone="orange" value={stats.underMaint} label="Under Maint." active={activeStatus === 'UNDER_MAINT'} onClick={() => onStatus('UNDER_MAINT')} />
      <Tile icon={PauseCircle} tone="red" value={stats.idle} label="Idle" active={activeStatus === 'IDLE'} onClick={() => onStatus('IDLE')} />
      {/* a fifth status tile only while a machine is on the road, so the tiles still add up to the total */}
      {(stats.inTransit ?? 0) > 0 && <Tile icon={Route} tone="violet" value={stats.inTransit!} label="In Transit" active={activeStatus === 'IN_TRANSIT'} onClick={() => onStatus('IN_TRANSIT')} />}

      {/* extras from tablet up: wrap to a second row, then sit in the same row on wide screens */}
      <Tile icon={Truck} tone="blue" value={stats.owned} label="Owned" active={activeOwnership === 'OWNED'} onClick={() => onOwnership(activeOwnership === 'OWNED' ? '' : 'OWNED')} className="hidden md:flex" />
      <Tile icon={Truck} tone="orange" value={stats.rented} label="Rented" active={activeOwnership === 'RENTED'} onClick={() => onOwnership(activeOwnership === 'RENTED' ? '' : 'RENTED')} className="hidden md:flex" />
      <Tile icon={Gauge} tone="emerald" value={stats.fleetUtilization === null ? '—' : `${stats.fleetUtilization}%`} label="Fleet utilization this month" className="hidden md:flex" />
      {spend && (
        <Tile icon={IndianRupee} tone="blue" value={formatINR(stats.fleetSpend, { decimals: 0 })} label="Fleet spend this month" className="hidden md:flex" />
      )}
    </div>
  );
}

export default EquipmentStatTiles;
