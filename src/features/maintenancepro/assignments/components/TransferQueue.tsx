import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useCostEdit } from '@/features/asset/equipment/lib/useCostAccess';
import { apiErrorMessage, fmtDay } from '@/features/asset/fleet/lib/format';
import { cn } from '@/lib/utils';
import { useApproveTransfer, useOpenTransfers } from '../server/useAssignmentQueries';
import type { AssignmentAction, Transfer, TransferStatus } from '../types';
import { endLabel } from '../lib/dates';
import { Panel, PanelState } from './Panel';

const CHIP: Record<TransferStatus, { label: string; cls: string }> = {
  REQUESTED: { label: 'Requested', cls: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300' },
  APPROVED: { label: 'Approved', cls: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300' },
  IN_TRANSIT: { label: 'In Transit', cls: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-300' },
  RECEIVED: { label: 'Received', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' },
  CANCELLED: { label: 'Cancelled', cls: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300' },
};

function TransferActions({ t, onAction }: { t: Transfer; onAction: (a: AssignmentAction) => void }) {
  const approve = useApproveTransfer();
  const before = t.status === 'REQUESTED' || t.status === 'APPROVED';
  const onApprove = async () => {
    try {
      await approve.mutateAsync(t.id);
      toast.success('Transfer approved');
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not approve the transfer'));
    }
  };
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {t.status === 'REQUESTED' && <Button variant="outline" className="h-11 lg:h-9" disabled={approve.isPending} onClick={onApprove}>Approve</Button>}
      {before && <Button className="h-11 lg:h-9" onClick={() => onAction({ kind: 'dispatch', transfer: t })}>Dispatch</Button>}
      {t.status === 'IN_TRANSIT' && <Button className="h-11 lg:h-9" onClick={() => onAction({ kind: 'receive', transfer: t })}>Receive</Button>}
      {before && <Button variant="outline" className="h-11 text-red-600 lg:h-9" onClick={() => onAction({ kind: 'cancel', transfer: t })}>Cancel</Button>}
    </div>
  );
}

/** Open transfers (requested, approved, in transit) with the actions valid for each status. */
export function TransferQueue({ onAction }: { onAction: (a: AssignmentAction) => void }) {
  const q = useOpenTransfers();
  const admin = useCostEdit();
  const [all, setAll] = useState(false);
  const rows = q.data?.rows ?? [];
  const shown = all ? rows : rows.slice(0, 3);
  return (
    <Panel
      title="Site Transfer Queue"
      count={q.data?.total}
      action={rows.length > 3 && <Button variant="ghost" className="h-11 px-2 text-sm" onClick={() => setAll((v) => !v)}>{all ? 'Show less' : 'View all'}</Button>}
    >
      <PanelState loading={q.isLoading} error={q.isError} onRetry={() => q.refetch()} empty={q.data && rows.length === 0 ? 'No open transfers.' : undefined} rows={2} />
      <ul className="space-y-2">
        {shown.map((t) => (
          <li key={t.id} className="rounded-lg border p-2.5 text-xs">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{t.machine.name}</p>
                <p className="text-muted-foreground">{t.machine.assetCode} · {t.transferNumber}</p>
              </div>
              <span className={cn('shrink-0 whitespace-nowrap rounded-full border px-2 py-1 text-[11px] font-semibold leading-none', CHIP[t.status].cls)}>{CHIP[t.status].label}</span>
            </div>
            <p className="mt-1.5 flex flex-wrap items-center gap-1">
              <span>{endLabel(t.from)}</span><ArrowRight className="size-3 shrink-0" aria-label="to" /><span className="font-medium">{endLabel(t.to)}</span>
            </p>
            <p className="mt-0.5 text-muted-foreground">ETA: {t.eta ? fmtDay(t.eta) : 'not set'}</p>
            {admin && <TransferActions t={t} onAction={onAction} />}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
