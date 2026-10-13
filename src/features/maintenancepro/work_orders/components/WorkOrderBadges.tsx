import { cn } from '@/lib/utils';
import { priorityBadge, priorityLabel } from '../../shared/lib/common';
import type { WorkOrderRow } from '../server/api/workOrdersApi';
import { STAGES, TYPE_LABEL, isOpen, isWaitingForParts } from './workOrderUtils';

const pill = 'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap';

const STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-muted text-muted-foreground',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  PENDING_APPROVAL: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
  COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  COMPLETED_LATE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  OVERDUE: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  ON_HOLD: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  COMPLETION_REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
};

const STAGE_STYLE: Record<string, string> = {
  TO_SEND: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  SENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  RECEIVED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
  PAID: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span className={cn(pill, STATUS_STYLE[status] ?? 'bg-muted text-muted-foreground')}>
      {status.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
    </span>
  );
}

/** Repairs that need Store parts: how many are issued. Hidden for work orders that do not use Store parts. */
export function PartsPill({ wo }: { wo: WorkOrderRow }) {
  if (wo.materialRequired !== true || wo.outsource || !wo.parts || !(isOpen(wo) || wo.status === 'ON_HOLD')) return null;
  const hasAny = wo.parts.lines?.some((l) => l.issued > 0);
  const isComplete = wo.parts.total > 0 && wo.parts.complete === wo.parts.total;

  if (isComplete) {
    return (
      <span
        className={cn(pill, 'w-fit bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400')}
        title="All listed parts are issued"
      >
        Parts ready {wo.parts.complete}/{wo.parts.total}
      </span>
    );
  }

  if (hasAny) {
    return (
      <span
        className={cn(pill, 'w-fit bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300')}
        title="Partial parts issued - can proceed with repair or return unused parts"
      >
        Partial parts {wo.parts.complete}/{wo.parts.total}
      </span>
    );
  }

  return (
    <span
      className={cn(pill, 'w-fit bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300')}
      title="No parts issued yet from the Store"
    >
      Waiting for parts {wo.parts.complete}/{wo.parts.total}
    </span>
  );
}

export function PriorityPill({ priority }: { priority?: number | null }) {
  return <span className={cn(pill, priorityBadge(priority))}>{priorityLabel(priority)}</span>;
}

export function TypePill({ type }: { type: string }) {
  return <span className={cn(pill, 'bg-secondary text-secondary-foreground')}>{TYPE_LABEL[type] ?? type}</span>;
}

export function StagePill({ wo }: { wo: WorkOrderRow }) {
  if (!wo.outsource) return <span className="text-muted-foreground">-</span>;
  const s = wo.outsource.status;
  return (
    <div className="flex flex-col gap-0.5">
      <span className={cn(pill, 'w-fit', STAGE_STYLE[s])}>{STAGES.find((x) => x.value === s)?.label ?? s}</span>
      {wo.outsource.vendorName && <span className="text-xs text-muted-foreground">{wo.outsource.vendorName}</span>}
    </div>
  );
}
