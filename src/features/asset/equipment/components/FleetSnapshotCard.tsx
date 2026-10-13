import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatINR } from '../lib/money';
import { useCostAccess } from '../lib/useCostAccess';
import { useEquipmentList } from '../server/useEquipmentQueries';

/** Fleet status counts for the Asset dashboard, from the Equipment Master stats (one request, no list rows). Each tile opens the filtered list. */
export function FleetSnapshotCard({ firmId }: { firmId?: string }) {
  const canCost = useCostAccess();
  const { data, isLoading, isError } = useEquipmentList({ firmId, limit: 1 });
  if (isError) return null;
  const s = data?.stats;
  const tiles: Array<{ label: string; value: string; to: string }> = s
    ? [
        { label: 'Equipment', value: String(s.total), to: '/asset/equipment' },
        { label: 'In use', value: String(s.inUse), to: '/asset/equipment?status=IN_USE' },
        { label: 'Under maintenance', value: String(s.underMaint), to: '/asset/equipment?status=UNDER_MAINT' },
        { label: 'Idle', value: String(s.idle), to: '/asset/equipment?status=IDLE' },
        { label: 'Fleet utilization', value: s.fleetUtilization === null ? '—' : `${s.fleetUtilization}%`, to: '/asset/equipment' },
        ...(canCost && s.fleetSpend !== undefined ? [{ label: 'Spend this month', value: formatINR(s.fleetSpend), to: '/asset/costs' }] : []),
      ]
    : [];
  return (
    <Card className="space-y-3 p-4">
      <h3 className="text-sm font-bold">Equipment fleet</h3>
      {isLoading ? (
        <Skeleton className="h-14 w-full" />
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {tiles.map((t) => (
            <Link key={t.label} to={t.to} className="rounded-xl border p-2.5 hover:bg-muted/40">
              <div className="truncate text-[11px] text-muted-foreground">{t.label}</div>
              <div className="truncate text-lg font-bold tabular-nums">{t.value}</div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
