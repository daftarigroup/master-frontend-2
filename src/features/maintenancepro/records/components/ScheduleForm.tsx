import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ReadingUnit } from '@/features/asset/equipment/types';
import { apiErrorMessage } from '@/features/asset/fleet/lib/format';
import { optNumber } from '../lib/due';
import { useSaveSchedule } from '../server/useRecordQueries';
import type { ChecklistTemplate, ScheduleRow } from '../types';
import { TemplateEditor } from './TemplatesDialog';

const NONE = '__none__';
const s = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n));

interface Props {
  machineId: string;
  firmId?: string | null;
  unit: ReadingUnit;
  initial: ScheduleRow | null;
  templates: ChecklistTemplate[];
  onDone: () => void;
  onCancel: () => void;
}

/** Add or edit one service schedule (admin). The server validates the interval and the template. */
export function ScheduleForm({ machineId, firmId, unit, initial, templates, onDone, onCancel }: Props) {
  const save = useSaveSchedule(machineId);
  const metered = unit !== 'NONE';
  const unitLabel = unit === 'KM' ? 'km' : 'hours';
  const [name, setName] = useState(initial?.name ?? '');
  const [intervalValue, setIntervalValue] = useState(s(initial?.intervalValue));
  const [intervalDays, setIntervalDays] = useState(s(initial?.intervalDays));
  const [leadValue, setLeadValue] = useState(s(initial?.leadValue));
  const [leadDays, setLeadDays] = useState(s(initial?.leadDays));
  const [lastAt, setLastAt] = useState(initial?.lastServiceAt ?? '');
  const [lastReading, setLastReading] = useState(s(initial?.lastServiceReading));
  const [templateId, setTemplateId] = useState(initial?.checklistTemplate?.id ?? NONE);
  const [localTemplates, setLocalTemplates] = useState<ChecklistTemplate[]>(templates);
  const [createTemplateOpen, setCreateTemplateOpen] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLocalTemplates(templates);
  }, [templates]);

  const submit = async () => {
    if (!name.trim()) return setError('Give the schedule a name');
    if (optNumber(intervalValue) === undefined && optNumber(intervalDays) === undefined) return setError('Give an interval in hours / km, in days, or both');
    setError('');
    // when editing, a cleared field is sent as null so it is removed
    const num = (v: string) => (initial ? (optNumber(v) ?? null) : optNumber(v));
    try {
      await save.mutateAsync({
        id: initial?.id,
        body: {
          name: name.trim(),
          intervalValue: metered ? num(intervalValue) : undefined,
          intervalDays: num(intervalDays),
          leadValue: metered ? num(leadValue) : undefined,
          leadDays: num(leadDays),
          lastServiceAt: lastAt || (initial ? null : undefined),
          lastServiceReading: metered ? num(lastReading) : undefined,
          checklistTemplateId: templateId === NONE ? (initial ? null : undefined) : templateId,
        },
      });
      toast.success(initial ? 'Schedule updated' : 'Schedule added');
      onDone();
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not save the schedule'));
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="sc-name">Name</Label>
        <Input id="sc-name" className="h-11" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 250 hour service" maxLength={120} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {metered && (
          <div className="space-y-1.5">
            <Label htmlFor="sc-iv">Every ({unitLabel})</Label>
            <Input id="sc-iv" inputMode="decimal" className="h-11" value={intervalValue} onChange={(e) => setIntervalValue(e.target.value)} />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="sc-id">Every (days)</Label>
          <Input id="sc-id" inputMode="numeric" className="h-11" value={intervalDays} onChange={(e) => setIntervalDays(e.target.value)} />
        </div>
        {metered && (
          <div className="space-y-1.5">
            <Label htmlFor="sc-lv">Warn before ({unitLabel})</Label>
            <Input id="sc-lv" inputMode="decimal" className="h-11" value={leadValue} onChange={(e) => setLeadValue(e.target.value)} />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="sc-ld">Warn before (days)</Label>
          <Input id="sc-ld" inputMode="numeric" className="h-11" value={leadDays} onChange={(e) => setLeadDays(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sc-la">Last service date</Label>
          <Input id="sc-la" type="date" className="h-11" value={lastAt} onChange={(e) => setLastAt(e.target.value)} />
        </div>
        {metered && (
          <div className="space-y-1.5">
            <Label htmlFor="sc-lr">Reading at last service</Label>
            <Input id="sc-lr" inputMode="decimal" className="h-11" value={lastReading} onChange={(e) => setLastReading(e.target.value)} />
          </div>
        )}
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label>Checklist template</Label>
          {firmId && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs font-semibold text-primary hover:bg-primary/10 gap-1"
              onClick={() => setCreateTemplateOpen(true)}
            >
              <Plus className="size-3" /> New checklist
            </Button>
          )}
        </div>
        <Select value={templateId} onValueChange={setTemplateId}>
          <SelectTrigger className="h-11" aria-label="Checklist template"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>No checklist</SelectItem>
            {localTemplates.filter((t) => t.isActive || t.id === templateId).map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            {firmId && (
              <div
                role="button"
                tabIndex={0}
                className="flex items-center gap-1.5 px-2 py-2 text-xs font-semibold text-primary cursor-pointer hover:bg-muted border-t border-border mt-1"
                onPointerDown={(e) => {
                  e.preventDefault();
                  setCreateTemplateOpen(true);
                }}
              >
                <Plus className="size-3.5" /> + Create new checklist...
              </div>
            )}
          </SelectContent>
        </Select>
      </div>
      {firmId && (
        <Dialog open={createTemplateOpen} onOpenChange={setCreateTemplateOpen}>
          <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
            <DialogHeader>
              <DialogTitle>New checklist template</DialogTitle>
              <DialogDescription>
                Add checklist tasks that will automatically copy to service work orders for this schedule.
              </DialogDescription>
            </DialogHeader>
            <TemplateEditor
              firmId={firmId}
              initial={null}
              onDone={(saved) => {
                setCreateTemplateOpen(false);
                if (saved?.id) {
                  setLocalTemplates((prev) => {
                    if (prev.some((t) => t.id === saved.id)) return prev;
                    return [...prev, saved];
                  });
                  setTemplateId(saved.id);
                }
              }}
            />
          </DialogContent>
        </Dialog>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="outline" className="h-11" onClick={onCancel}>Cancel</Button>
        <Button className="h-11" disabled={save.isPending} onClick={submit}>{save.isPending ? 'Saving…' : 'Save schedule'}</Button>
      </div>
    </div>
  );
}
