import { useState } from 'react';
import { AlertCircle, Check, CheckCircle2, Circle, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { apiErrorMessage } from '@/features/asset/fleet/lib/format';
import { cn } from '@/lib/utils';
import { useReportWorkOrder } from '@/features/maintenancepro/unique_task/server/tanstackQuery/useWorkOrdersQueries';
import { useSetChecklistItem } from '../server/useRecordQueries';
import type { ChecklistBlock, ChecklistItem, ChecklistState } from '../types';

const NEXT: Record<ChecklistState, ChecklistState> = { PENDING: 'DONE', DONE: 'PENDING', ISSUE: 'PENDING' };

function StateIcon({ state }: { state: ChecklistState }) {
  if (state === 'DONE') return <span className="grid size-6 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"><Check className="size-4" aria-hidden /></span>;
  if (state === 'ISSUE') return <span className="grid size-6 place-items-center rounded-full bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"><X className="size-4" aria-hidden /></span>;
  return <span className="grid size-6 place-items-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"><Circle className="size-3.5" aria-hidden /></span>;
}
const STATE_LABEL: Record<ChecklistState, string> = { PENDING: 'Pending', DONE: 'Done', ISSUE: 'Issue' };

function IssueDialog({ item, busy, onClose, onSave }: { item: ChecklistItem | null; busy: boolean; onClose: () => void; onSave: (note: string) => void }) {
  const [note, setNote] = useState('');
  return (
    <Dialog open={!!item} onOpenChange={(o) => { if (!o) { setNote(''); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report an issue</DialogTitle>
          <DialogDescription>{item?.text}</DialogDescription>
        </DialogHeader>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="What is wrong?" aria-label="Issue note" rows={3} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={busy || note.trim().length < 2} onClick={() => { onSave(note.trim()); setNote(''); }}>Save issue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CompleteServiceDialog({
  open,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: (notes: string) => void;
}) {
  const [notes, setNotes] = useState('');
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setNotes(''); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete service</DialogTitle>
          <DialogDescription>
            All checklist tasks are completed. Mark this service work order as done to send it for supervisor approval.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="service-comp-notes">
            Completion note (optional)
          </label>
          <Textarea
            id="service-comp-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes on the service performed..."
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={busy} onClick={() => onConfirm(notes)}>
            {busy ? 'Submitting…' : 'Mark done'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface Props {
  checklist: ChecklistBlock | null;
  canTick: boolean;
  canSchedule: boolean;
  onSchedule: () => void;
}

/** Maintenance Checklist of the open service work order. The progress comes from the API. */
export function ChecklistCard({ checklist, canTick, canSchedule, onSchedule }: Props) {
  const set = useSetChecklistItem();
  const report = useReportWorkOrder();
  const [issueFor, setIssueFor] = useState<ChecklistItem | null>(null);
  const [completeOpen, setCompleteOpen] = useState(false);

  const apply = (item: ChecklistItem, state: ChecklistState, note?: string) => {
    if (!checklist) return;
    set.mutate(
      { workOrderId: checklist.workOrderId, itemId: item.id, state, note },
      { onError: (e) => toast.error(apiErrorMessage(e, 'Could not update the checklist')), onSuccess: () => setIssueFor(null) },
    );
  };

  const pendingCount = checklist ? checklist.items.filter((it) => it.state === 'PENDING').length : 0;
  const allEvaluated = !!checklist && checklist.items.length > 0 && pendingCount === 0;
  const isAwaitingApproval = checklist?.status === 'PENDING_APPROVAL';

  const handleMarkDone = async (note: string) => {
    if (!checklist) return;
    try {
      await report.mutateAsync({
        id: checklist.workOrderId,
        data: { workDone: note.trim() || 'Checklist completed' },
      });
      toast.success('Service marked done, awaiting approval');
      setCompleteOpen(false);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not mark service as done'));
    }
  };

  return (
    <section className="rounded-xl border bg-card p-4" aria-label="Maintenance Checklist">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="flex-1 text-sm font-semibold">Maintenance Checklist</h2>
        {checklist && <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold tabular-nums">{checklist.done}/{checklist.total} Completed</span>}
      </div>
      {!checklist ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="flex-1 text-sm text-muted-foreground">No service in progress</p>
          {canSchedule && <Button size="sm" variant="outline" className="h-11 lg:h-9" onClick={onSchedule}>Schedule Service</Button>}
        </div>
      ) : (
        <>
          <Progress value={checklist.percent} className="mb-3 h-2" progressColor="bg-emerald-500" aria-label={`${checklist.percent}% of the checklist completed`} />
          {checklist.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">This service has no checklist items.</p>
          ) : (
            <ul className="divide-y">
              {checklist.items.map((it) => {
                const body = (
                  <>
                    <StateIcon state={it.state} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm">{it.text}</span>
                      {it.note && <span className="block text-xs text-muted-foreground">{it.note}</span>}
                    </span>
                    <span className={cn('text-xs font-medium', it.state === 'DONE' ? 'text-emerald-600 dark:text-emerald-400' : it.state === 'ISSUE' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400')}>{STATE_LABEL[it.state]}</span>
                  </>
                );
                return (
                  <li key={it.id} className="flex items-center gap-1">
                    {canTick ? (
                      <button type="button" disabled={set.isPending} onClick={() => apply(it, NEXT[it.state])} aria-label={`${it.text}: ${STATE_LABEL[it.state]}. Tap to change`} className="flex min-h-11 flex-1 items-center gap-3 py-2 text-left">
                        {body}
                      </button>
                    ) : (
                      <div className="flex min-h-11 flex-1 items-center gap-3 py-2">{body}</div>
                    )}
                    {canTick && it.state !== 'ISSUE' && (
                      <Button variant="ghost" size="icon" className="size-11 shrink-0 text-red-600 dark:text-red-400" aria-label={`Report an issue on ${it.text}`} onClick={() => setIssueFor(it)}>
                        <X className="size-4" />
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {/* Action / Guidance Banner */}
          {checklist.items.length > 0 && (
            <div className="mt-4 pt-2 border-t">
              {isAwaitingApproval ? (
                <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300">
                  <CheckCircle2 className="size-4 shrink-0 text-blue-600" />
                  <span>Service marked done. Awaiting supervisor approval to close and update schedule.</span>
                </div>
              ) : allEvaluated ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                  <div className="text-xs">
                    <p className="font-semibold text-emerald-800 dark:text-emerald-300">All tasks addressed ({checklist.done}/{checklist.total})</p>
                    <p className="text-muted-foreground">Ready to mark this service work order as done.</p>
                  </div>
                  {canTick && (
                    <Button
                      size="sm"
                      className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                      onClick={() => setCompleteOpen(true)}
                    >
                      <CheckCircle2 className="size-4" /> Mark done
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-2.5 text-xs text-muted-foreground">
                  <AlertCircle className="size-4 shrink-0 text-amber-500" />
                  <span>
                    <strong>{pendingCount} item{pendingCount > 1 ? 's' : ''} pending:</strong> All checklist tasks must be evaluated before marking this service done.
                  </span>
                </div>
              )}
            </div>
          )}
        </>
      )}
      <IssueDialog item={issueFor} busy={set.isPending} onClose={() => setIssueFor(null)} onSave={(note) => issueFor && apply(issueFor, 'ISSUE', note)} />
      <CompleteServiceDialog
        open={completeOpen}
        busy={report.isPending}
        onClose={() => setCompleteOpen(false)}
        onConfirm={handleMarkDone}
      />
    </section>
  );
}

