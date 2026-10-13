import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import type { EquipmentItem } from '@/features/asset/equipment/types';
import { useUsersList } from '@/features/asset/asset/server/tanstackQuery/useAssetQueries';
import { useProject } from '@/context/ProjectContext';
import { Section } from '@/features/asset/cost/components/Section';
import { useWbs } from '@/features/asset/cost/server/useCostQueries';
import { apiErrorMessage, fmtDateTime, fmtNum, istNowTime, istToday } from '@/features/asset/fleet/lib/format';
import { cn } from '@/lib/utils';
import { blankForm, createBody, formFields, formFromLog, formProblems, gapText, readingFacts, type FormContext, type FormState } from '../lib/formModel';
import { writeWbsMemory, readWbsMemory } from '../lib/wbsMemory';
import { useCreateWorkLog, useUpdateWorkLog, useWorkLogPrefill, useWorkTypes } from '../server/useWorkLogQueries';
import type { WorkLog } from '../types';
import { MoreDetails } from './MoreDetails';

export type FormTarget = { key: number; mode: 'add'; machineId: string } | { key: number; mode: 'edit'; log: WorkLog };

interface Props {
  target: FormTarget | null;
  /** the day the page is showing: the new entry starts on it */
  date: string;
  machines: EquipmentItem[];
  onClose: () => void;
  /** open another log for editing (to close the machine's open entry) */
  onEditById: (id: string) => void;
}

export function WorkLogFormSheet({ target, onClose, ...rest }: Props) {
  return (
    <Sheet open={!!target} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        {target && <FormInner key={target.key} target={target} onClose={onClose} {...rest} />}
      </SheetContent>
    </Sheet>
  );
}

interface SaveError {
  message: string;
  openEntryId?: string;
}

function FormInner({ target, date, machines, onClose, onEditById }: Omit<Props, 'target'> & { target: FormTarget }) {
  const editLog = target.mode === 'edit' ? target.log : null;
  const editing = !!editLog;
  const [f, setF] = useState<FormState>(() => (editLog ? formFromLog(editLog) : blankForm(target.mode === 'add' ? target.machineId : '', date)));
  const [asks, setAsks] = useState({ continuity: false, reset: false });
  const [showProblems, setShowProblems] = useState(false);
  const [saveError, setSaveError] = useState<SaveError | null>(null);
  // generated once per form so a double tap or a retry can never create two logs
  const reqId = useRef(crypto.randomUUID());
  const touched = useRef(new Set<string>());
  const inFlight = useRef(false);

  const create = useCreateWorkLog();
  const update = useUpdateWorkLog();
  const busy = create.isPending || update.isPending;

  const machine = machines.find((m) => m.id === f.machineId);
  const readingUnit = editLog?.machine.readingUnit ?? machine?.readingUnit ?? 'NONE';
  const prefillQ = useWorkLogPrefill(f.machineId || undefined);
  const prefill = prefillQ.data?.machine.id === f.machineId ? prefillQ.data : undefined;
  const { selectedProject } = useProject();
  const firmId =
    prefill?.firmId ??
    editLog?.firmId ??
    machine?.firmId ??
    (selectedProject && selectedProject.id !== 'all' ? String(selectedProject.id) : undefined) ??
    machines.find((m) => m.firmId)?.firmId ??
    undefined;
  const workTypes = useWorkTypes(firmId);
  const wbsQ = useWbs(firmId ?? null, !!firmId);
  const usersQ = useUsersList();

  const ctx: FormContext = { readingUnit, lastStop: prefill?.lastStop ?? null, editing, asks };
  const facts = readingFacts(f, ctx);
  const showReadings = !!f.machineId && facts.metered;
  const problems = formProblems(f, ctx);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    touched.current.add(key);
    setF((s) => ({ ...s, [key]: value }));
  }

  function changeMachine(id: string) {
    touched.current.clear();
    setF((s) => ({ ...s, machineId: id, startReading: '', stopReading: '', operatorId: '', wbsId: '', meterReset: false, resetReason: '', continuityReason: '' }));
    setAsks({ continuity: false, reset: false });
    setSaveError(null);
  }

  // new entry: start from the machine's last stop and the assigned operator (never over what the user typed)
  useEffect(() => {
    if (editing || !prefill) return;
    setF((s) => ({
      ...s,
      startReading: touched.current.has('startReading') ? s.startReading : prefill.lastStop !== null ? String(prefill.lastStop) : '',
      operatorId: touched.current.has('operatorId') ? s.operatorId : (prefill.operator?.id ?? ''),
    }));
  }, [prefill, editing]);

  // the machine's last WBS choice, if that activity is still open
  const wbsList = wbsQ.data;
  useEffect(() => {
    if (editing || !f.machineId || !wbsList || touched.current.has('wbsId')) return;
    const last = readWbsMemory(f.machineId);
    if (last && wbsList.some((w) => w.id === last)) setF((s) => ({ ...s, wbsId: last }));
  }, [editing, f.machineId, wbsList]);

  const wbsOptions = useMemo(() => (wbsList ?? []).map((w) => ({ value: w.id, label: `${w.code} · ${w.name}`, keywords: [w.code, w.name] })), [wbsList]);
  const operatorOptions = useMemo(() => {
    const opts = (usersQ.data ?? []).map((u) => ({ value: u.id, label: u.name, sublabel: u.role }));
    const known = (id?: string, name?: string | null) => id && !opts.some((o) => o.value === id) && opts.push({ value: id, label: name || 'Operator', sublabel: undefined });
    known(prefill?.operator?.id, prefill?.operator?.name);
    known(editLog?.operator?.id, editLog?.operator?.name);
    return opts;
  }, [usersQ.data, prefill, editLog]);
  const machineOptions = useMemo(
    () => [
      ...machines.map((m) => ({ value: m.id, label: m.name, sublabel: `${m.assetCode}${m.readingUnit === 'NONE' ? ' · no meter' : ''}`, keywords: [m.assetCode, m.registrationNo ?? ''] })),
    ],
    [machines],
  );

  function onStopReading(v: string) {
    set('stopReading', v);
    if (v.trim() && !f.stopTime && f.date === istToday()) set('stopTime', istNowTime());
  }

  function afterSave(another: boolean) {
    if (!another || editing) return onClose();
    reqId.current = crypto.randomUUID();
    touched.current.clear();
    ['operatorId', 'wbsId'].forEach((k) => touched.current.add(k));
    setShowProblems(false);
    setAsks({ continuity: false, reset: false });
    setF((s) => ({ ...blankForm(s.machineId, s.date), date: s.date, startReading: s.stopReading, operatorId: s.operatorId, wbsId: s.wbsId, workTypeId: s.workTypeId, location: s.location }));
  }

  async function submit(another: boolean) {
    if (inFlight.current) return;
    if (problems.length > 0) {
      setShowProblems(true);
      return;
    }
    inFlight.current = true;
    setSaveError(null);
    try {
      const res = editLog ? await update.mutateAsync({ id: editLog.id, body: formFields(f, ctx) }) : await create.mutateAsync(createBody(f, ctx, reqId.current));
      res.warnings.forEach((w) => toast.warning(w.message));
      writeWbsMemory(f.machineId, f.wbsId);
      toast.success(`${res.log.logNumber ?? 'Work log'} ${editing ? 'updated' : res.idempotent ? 'was already saved' : 'saved'}`);
      afterSave(another);
    } catch (e) {
      const codes = (e as { response?: { data?: { errors?: unknown[] } } }).response?.data?.errors ?? [];
      if (codes.includes('CONTINUITY_REASON_REQUIRED')) setAsks((a) => ({ ...a, continuity: true }));
      if (codes.includes('METER_RESET_REASON_REQUIRED') || codes.includes('STOP_BEFORE_START')) setAsks((a) => ({ ...a, reset: true }));
      const openId = codes[0] === 'OPEN_ENTRY_EXISTS' && typeof codes[1] === 'string' ? codes[1] : undefined;
      setSaveError({ message: apiErrorMessage(e, 'Could not save the work log'), openEntryId: openId });
    } finally {
      inFlight.current = false;
    }
  }

  const gapShown = showReadings && !f.meterReset && (facts.gap !== 0 || asks.continuity);
  const resetShown = showReadings && (facts.stopBelowStart || asks.reset || f.meterReset);
  const open = prefill?.openEntry && prefill.openEntry.id !== editLog?.id ? prefill.openEntry : null;
  const unit = facts.unit;

  return (
    <>
      <SheetHeader className="border-b p-4 text-left">
        <SheetTitle>{editLog ? `Edit ${editLog.logNumber ?? 'work log'}` : 'Add Work Log'}</SheetTitle>
        <SheetDescription>{editLog ? 'Changes are saved as pending until approved.' : 'Only the basics are needed. More details are optional.'}</SheetDescription>
      </SheetHeader>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {prefill?.inTransit && <Banner tone="red">This machine is in transit ({prefill.inTransit}). Receive the transfer before logging work.</Banner>}
        {prefill?.serviceStatus === 'OVERDUE' && <Banner tone="amber">This machine is overdue for service.</Banner>}
        {open && (
          <Banner tone="amber">
            <span>
              It already has an open entry ({open.logNumber ?? 'no number'}, started {fmtDateTime(open.startedAt)}). Close it before adding a new one.
            </span>
            <Button type="button" size="sm" variant="outline" className="mt-2 h-10 bg-background" onClick={() => onEditById(open.id)}>
              Close that entry
            </Button>
          </Banner>
        )}

        <div className="space-y-1.5">
          <Label>Machine</Label>
          <SearchableSelect
            options={machineOptions}
            value={f.machineId}
            onValueChange={changeMachine}
            disabled={editing}
            placeholder="Select machine"
            searchPlaceholder="Search name or code"
            emptyText="No machine found"
            className="h-11 w-full"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="wl-date">Date</Label>
            <Input id="wl-date" type="date" value={f.date} max={istToday()} onChange={(e) => set('date', e.target.value)} className="h-11" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wl-start-time">Start time</Label>
            <Input id="wl-start-time" type="time" value={f.startTime} onChange={(e) => set('startTime', e.target.value)} className="h-11" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wl-stop-time">Stop time</Label>
            <Input id="wl-stop-time" type="time" value={f.stopTime} onChange={(e) => set('stopTime', e.target.value)} className="h-11" />
          </div>
        </div>

        <>
            {showReadings && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="wl-start-reading">Start reading ({unit})</Label>
                    <Input id="wl-start-reading" inputMode="decimal" value={f.startReading} onChange={(e) => set('startReading', e.target.value)} className={cn('h-11 text-base', gapShown && 'border-amber-500')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="wl-stop-reading">Stop reading ({unit})</Label>
                    <Input
                      id="wl-stop-reading"
                      inputMode="decimal"
                      value={f.stopReading}
                      onChange={(e) => onStopReading(e.target.value)}
                      placeholder="blank = still running"
                      className={cn('h-11 text-base', facts.stopBelowStart && !f.meterReset && 'border-destructive')}
                    />
                  </div>
                </div>
                {facts.usage !== null && (
                  <p className="text-sm">
                    Usage: <b>{fmtNum(facts.usage)}</b> {unit}
                  </p>
                )}
                {facts.stopN === null && <p className="text-xs text-muted-foreground">No stop reading: this saves as an open entry until it is closed.</p>}
                {gapShown && (
                  <div className="space-y-1.5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/30">
                    <p className="flex items-start gap-1.5">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                      {facts.gap !== 0 ? gapText(facts.gap, prefill?.lastStop ?? null, unit) : 'The start does not follow the previous stop.'} It will be saved, but say why.
                    </p>
                    <Label htmlFor="wl-continuity" className="sr-only">Reason the start differs from the last stop</Label>
                    <Input id="wl-continuity" value={f.continuityReason} onChange={(e) => set('continuityReason', e.target.value)} placeholder="Reason (e.g. used off-site, meter corrected)" className="h-11 bg-background" />
                  </div>
                )}
                {resetShown && (
                  <div className="space-y-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
                    {facts.stopBelowStart && <p className="text-destructive">Stop is lower than start. Usage cannot be negative.</p>}
                    <label className="flex min-h-11 items-center gap-2">
                      <Switch checked={f.meterReset} onCheckedChange={(v) => set('meterReset', v)} />
                      <span>Meter was reset or replaced (start a new baseline)</span>
                    </label>
                    {f.meterReset && (
                      <>
                        <Label htmlFor="wl-reset-reason" className="sr-only">Reason for the meter reset</Label>
                        <Input id="wl-reset-reason" value={f.resetReason} onChange={(e) => set('resetReason', e.target.value)} placeholder="Reason for the reset" className="h-11 bg-background" />
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Operator</Label>
              <SearchableSelect
                options={operatorOptions}
                value={f.operatorId}
                onValueChange={(v) => set('operatorId', v)}
                placeholder="Select operator"
                searchPlaceholder="Search user"
                emptyText="No user found"
                className="h-11 w-full"
              />
            </div>

            <Section title="More details" defaultOpen={editing}>
              {() => <MoreDetails f={f} set={set} workTypes={workTypes.data ?? []} wbsOptions={wbsOptions} firmId={firmId ? String(firmId) : undefined} />}
            </Section>
        </>
      </div>

      <div className="space-y-2 border-t bg-background p-3">
          {showProblems && problems.length > 0 && (
            <ul role="alert" className="space-y-0.5 rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-sm text-destructive">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
          {saveError && (
            <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-sm text-destructive">
              {saveError.message}
              {saveError.openEntryId && (
                <Button type="button" size="sm" variant="outline" className="mt-2 h-10 bg-background" onClick={() => onEditById(saveError.openEntryId!)}>
                  Close the open entry
                </Button>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <Button type="button" className="h-12 flex-1 text-base" disabled={busy} onClick={() => void submit(false)}>
              {busy ? 'Saving…' : editing ? 'Save changes' : 'Save'}
            </Button>
            {!editing && (
              <Button type="button" variant="outline" className="h-12 flex-1 text-base" disabled={busy} onClick={() => void submit(true)}>
                <PlusCircle className="mr-1.5 size-4" aria-hidden /> Save &amp; add another
              </Button>
            )}
          </div>
      </div>
    </>
  );
}

function Banner({ tone, children }: { tone: 'amber' | 'red'; children: React.ReactNode }) {
  return (
    <div
      role="note"
      className={cn(
        'rounded-lg border p-3 text-sm',
        tone === 'amber' ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200' : 'border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200',
      )}
    >
      {children}
    </div>
  );
}
