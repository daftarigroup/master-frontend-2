import { BarChart3, Fuel } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatINR, formatQty } from '../lib/money';
import { useCostAccess } from '../lib/useCostAccess';
import { useEquipmentSummary } from '../server/useEquipmentQueries';
import { UtilizationMeter } from './UtilizationMeter';

/** "Usage & cost this month" on an asset's detail page. Cost figures appear only for users who may see cost (the server omits them otherwise). */
export function MachineMonthCard({ machineId }: { machineId: string }) {
  const canCost = useCostAccess();
  const { data: m, isLoading, isError } = useEquipmentSummary(machineId);
  if (isError) return null;
  return (
    <Card className="mb-5 space-y-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold">Usage &amp; cost this month</h3>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm"><Link to={`/asset/work-logs?machineId=${machineId}&new=1`}><Fuel className="size-4" /> Work log</Link></Button>
          {canCost && <Button asChild variant="outline" size="sm"><Link to={`/asset/equipment/${machineId}/cost`}><BarChart3 className="size-4" /> Cost tracking</Link></Button>}
        </div>
      </div>
      {isLoading || !m ? (
        <Skeleton className="h-16 w-full" />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div><div className="text-xs text-muted-foreground">Hours / km</div><div className="text-lg font-bold tabular-nums">{m.unit ? `${formatQty(m.hoursThisMonth ?? 0)} ${m.unit}` : '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Fuel efficiency</div><div className="text-lg font-bold tabular-nums">{m.efficiency ? `${m.efficiency.value} ${m.efficiency.unit}` : '—'}</div></div>
          <UtilizationMeter variant="bar" percent={m.utilization.percent} overShift={m.utilization.overShift} />
          {canCost && m.monthSpend !== undefined && (
            <div>
              <div className="text-xs text-muted-foreground">Spend</div>
              <div className="text-lg font-bold tabular-nums">{formatINR(m.monthSpend)}</div>
              {m.dataComplete === false && <div className="text-[11px] text-amber-700 dark:text-amber-300">Partly estimated</div>}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
