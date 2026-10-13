import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { apiErrorMessage } from '@/features/asset/fleet/lib/format';
import { useApproveWorkLog, useRejectWorkLog, useReopenWorkLog } from '../server/useWorkLogQueries';
import type { WorkLog } from '../types';
import { ReasonDialog, type LogHandlers } from './LogActions';

/** Approve / reject / reopen with their toasts and the reason dialog. The page renders `dialog` once. */
export function useLogActions(onEdit: (log: WorkLog) => void): { handlers: LogHandlers; dialog: ReactNode } {
  const approve = useApproveWorkLog();
  const reject = useRejectWorkLog();
  const reopen = useReopenWorkLog();
  const [ask, setAsk] = useState<{ kind: 'reject' | 'reopen'; log: WorkLog } | null>(null);

  const run = async (p: Promise<unknown>, ok: string) => {
    try {
      await p;
      toast.success(ok);
      setAsk(null);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not update the work log'));
    }
  };

  const handlers: LogHandlers = {
    edit: onEdit,
    approve: (log) => {
      if (!approve.isPending) void run(approve.mutateAsync(log.id), `${log.logNumber ?? 'Work log'} approved`);
    },
    reject: (log) => setAsk({ kind: 'reject', log }),
    reopen: (log) => setAsk({ kind: 'reopen', log }),
  };

  const dialog = ask && (
    <ReasonDialog
      key={`${ask.kind}-${ask.log.id}`}
      title={ask.kind === 'reject' ? `Reject ${ask.log.logNumber ?? 'work log'}` : `Reopen ${ask.log.logNumber ?? 'work log'}`}
      description={ask.kind === 'reject' ? 'The author will see this reason, fix the entry and resubmit it.' : 'It goes back to Pending so it can be corrected. Who reopened it and why is recorded.'}
      label={ask.kind === 'reject' ? 'Reason for rejecting' : 'Reason for reopening'}
      confirm={ask.kind === 'reject' ? 'Reject' : 'Reopen'}
      pending={reject.isPending || reopen.isPending}
      onClose={() => setAsk(null)}
      onSubmit={(t) =>
        ask.kind === 'reject'
          ? void run(reject.mutateAsync({ id: ask.log.id, reason: t }), 'Work log rejected')
          : void run(reopen.mutateAsync({ id: ask.log.id, note: t }), 'Work log reopened')
      }
    />
  );
  return { handlers, dialog };
}
