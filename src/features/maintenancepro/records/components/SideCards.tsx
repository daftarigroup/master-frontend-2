import { ChevronRight, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { formatINR } from '@/features/asset/equipment/lib/money';
import { fmtDateTime } from '@/features/asset/fleet/lib/format';
import { cn } from '@/lib/utils';
import type { CostBlock, Mechanic, RecordSummary } from '../types';

export function BreakdownCard({ breakdown }: { breakdown: RecordSummary['breakdown'] }) {
  const to = '/maintenance/work-orders?tab=breakdown';
  return (
    <Link to={to} className="flex min-h-14 items-center gap-3 rounded-xl border bg-card p-4 hover:border-primary/50" aria-label="Breakdown reported, open">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Breakdown Reported</p>
        <p className="text-xs text-muted-foreground">{breakdown.reportedAt ? fmtDateTime(breakdown.reportedAt) : 'None on record'}</p>
      </div>
      <span
        className={cn(
          'rounded-full border px-2.5 py-1 text-xs font-semibold',
          breakdown.reported
            ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300'
            : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
        )}
      >
        {breakdown.reported ? 'Yes' : 'No'}
      </span>
      <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
    </Link>
  );
}

export function MechanicCard({ mechanic }: { mechanic: Mechanic | null }) {
  return (
    <div className="min-w-0 rounded-xl border bg-card p-3 sm:p-4">
      <p className="mb-2 text-xs font-medium text-muted-foreground">Assigned Mechanic</p>
      {!mechanic ? (
        <p className="text-sm text-muted-foreground">Not assigned</p>
      ) : (
        <div className="flex items-center gap-2">
          <UserAvatar name={mechanic.name ?? ''} size={36} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{mechanic.name ?? 'Unnamed'}</p>
            <p className="truncate text-xs text-muted-foreground">{mechanic.designation ?? 'Mechanic'}</p>
          </div>
          {mechanic.phone && (
            <a href={`tel:${mechanic.phone}`} aria-label={`Call ${mechanic.name ?? 'mechanic'}`} className="grid size-11 shrink-0 place-items-center rounded-full border text-primary hover:bg-muted">
              <Phone className="size-4" aria-hidden />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

/** Only rendered when the API returned `cost` (users without cost access never get it). */
export function CostCard({ cost }: { cost: CostBlock | null }) {
  return (
    <div className="min-w-0 rounded-xl border bg-card p-3 sm:p-4">
      <p className="mb-2 text-xs font-medium text-muted-foreground">{cost ? `${cost.label} Cost` : 'Est. Cost'}</p>
      <p className="text-lg font-bold tabular-nums">{cost ? formatINR(cost.total) : '—'}</p>
      <p className="text-xs text-muted-foreground">Parts + Labour</p>
    </div>
  );
}
