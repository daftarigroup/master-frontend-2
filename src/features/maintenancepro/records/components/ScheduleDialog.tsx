import { useEffect, useState } from 'react';
import { ListChecks, Pencil, Plus, Power } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useEquipmentSummary } from '@/features/asset/equipment/server/useEquipmentQueries';
import { apiErrorMessage } from '@/features/asset/fleet/lib/format';
import { intervalText, longDay } from '../lib/due';
import { useChecklistTemplates, useSaveSchedule, useSchedules } from '../server/useRecordQueries';
import type { RecordSummary, ScheduleRow } from '../types';
import { ScheduleForm } from './ScheduleForm';
import { TemplatesDialog } from './TemplatesDialog';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  summary: RecordSummary;
  /** open straight into the add form (the "Add schedule" button) */
  startAdding?: boolean;
}

/** Admin: the machine's schedules (add, edit, deactivate) and the checklist templates they use. */
export function ScheduleDialog({ open, onOpenChange, summary, startAdding }: Props) {
  const machineId = summary.machine.id;
  const schedules = useSchedules(machineId, open);
  const firm = useEquipmentSummary(open ? machineId : null);
  const firmId = firm.data?.firmId ?? null;
  const templates = useChecklistTemplates(firmId, open);
  const toggle = useSaveSchedule(machineId);
  const [editing, setEditing] = useState<ScheduleRow | 'new' | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  useEffect(() => {
    if (open) setEditing(startAdding ? 'new' : null);
  }, [open, startAdding]);

  const setActive = (s: ScheduleRow, isActive: boolean) =>
    toggle.mutate({ id: s.id, body: { name: s.name, isActive } }, { onSuccess: () => toast.success(isActive ? 'Schedule activated' : 'Schedule deactivated'), onError: (e) => toast.error(apiErrorMessage(e, 'Could not update')) });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? (editing === 'new' ? 'Add schedule' : 'Edit schedule') : 'Service schedules'}</DialogTitle>
            <DialogDescription>{summary.machine.name} · {summary.machine.assetCode}</DialogDescription>
          </DialogHeader>
          {editing ? (
            <ScheduleForm
              key={editing === 'new' ? 'new' : editing.id}
              machineId={machineId}
              firmId={firmId ? String(firmId) : null}
              unit={summary.machine.readingUnit}
              initial={editing === 'new' ? null : editing}
              templates={templates.data ?? []}
              onDone={() => setEditing(null)}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <div className="space-y-3">
              {schedules.isLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : schedules.isError ? (
                <div role="alert" className="flex items-center gap-2 text-sm"><span className="flex-1">Could not load schedules.</span><Button size="sm" onClick={() => schedules.refetch()}>Retry</Button></div>
              ) : (schedules.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No schedules yet.</p>
              ) : (
                <ul className="divide-y rounded-lg border">
                  {(schedules.data ?? []).map((sc) => (
                    <li key={sc.id} className="flex items-center gap-2 p-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{sc.name}{!sc.isActive && <span className="ml-2 text-xs font-normal text-muted-foreground">(inactive)</span>}</p>
                        <p className="text-xs text-muted-foreground">{intervalText(sc, summary.machine.readingUnit)}{sc.lastServiceAt ? ` · last ${longDay(sc.lastServiceAt)}` : ''}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="size-11" aria-label={`Edit ${sc.name}`} onClick={() => setEditing(sc)}><Pencil className="size-4" /></Button>
                      <Button variant="ghost" size="icon" className="size-11" aria-label={sc.isActive ? `Deactivate ${sc.name}` : `Activate ${sc.name}`} disabled={toggle.isPending} onClick={() => setActive(sc, !sc.isActive)}>
                        <Power className="size-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap justify-between gap-2">
                <Button variant="outline" className="h-11" disabled={!firmId} onClick={() => setTemplatesOpen(true)}><ListChecks className="size-4" /> Checklist templates</Button>
                <Button className="h-11" onClick={() => setEditing('new')}><Plus className="size-4" /> Add schedule</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {firmId && <TemplatesDialog open={templatesOpen} onOpenChange={setTemplatesOpen} firmId={firmId} templates={templates.data ?? []} />}
    </>
  );
}
