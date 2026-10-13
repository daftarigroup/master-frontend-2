import { Clock, Route, ShieldCheck } from 'lucide-react';
import { KpiTile } from '@/components/shared/KpiTile';
import { Skeleton } from '@/components/ui/skeleton';
import { fmtNum } from '@/features/asset/fleet/lib/format';
import type { WorkLogKpis } from '../types';

/** The day's totals: hours, km, pending approvals. (Fuel is no longer on a work log: diesel is issued from Store Issue.) */
export function KpiStrip({ kpis, loading }: { kpis: WorkLogKpis | undefined; loading: boolean; desktop?: boolean }) {
  if (!kpis) {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-busy={loading}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[74px] rounded-xl" />
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <KpiTile label="Total Hours" icon={Clock} tone="blue" value={kpis.hoursLabel || '—'} />
        <KpiTile label="Distance (km)" icon={Route} tone="violet" value={`${fmtNum(kpis.km)} km`} />
        <KpiTile label="Pending approvals" icon={ShieldCheck} tone="amber" value={kpis.pendingCount} />
      </div>
      {kpis.provisional && <p className="text-[11px] text-muted-foreground">Totals include pending logs (provisional until approved).</p>}
    </div>
  );
}
