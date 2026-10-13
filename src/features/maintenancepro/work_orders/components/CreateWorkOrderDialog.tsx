import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertOctagon, Calendar, Clock, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CompanySelectField, type CompanyOption } from '@/features/organization/components/CompanySelectField';
import { useAuth } from '@/context/AuthContext';
import { useWorkOrderUpload } from '@/features/asset/documents/lib/useWorkOrderUpload';
import { useActivityTypes } from '../../activityTypes/server/tanstackQuery/useActivityTypeQueries';
import { useAssignableUsers } from '../../assign_task/server/tanstackQuery/useUsersQueries';
import { PRIORITY_OPTIONS } from '../../shared/lib/common';
import type { WorkOrderKind } from '../server/api/workOrdersApi';
import { useCreateWorkOrder, useMachineOptions } from '../server/tanstackQuery/useWorkOrderActions';
import { TYPE_LABEL, toastError } from './workOrderUtils';

const CREATABLE: WorkOrderKind[] = ['SCHEDULED', 'BREAKDOWN', 'REPAIR', 'ONE_TIME'];
const NONE = '__none__';

const DEFAULT_FAILURE_TYPES = [
  'Electrical',
  'Mechanical',
  'Software',
  'Operator Error',
  'Hydraulic',
  'Pneumatic',
  'Other',
];

const CUSTOM_FAILURE_TYPES_KEY = 'mp-breakdown-custom-failure-types';

const loadCustomFailureTypes = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_FAILURE_TYPES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
};

const saveCustomFailureTypes = (types: string[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CUSTOM_FAILURE_TYPES_KEY, JSON.stringify(types));
};

const toLocalIsoDateTime = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

interface Props {
  open: boolean;
  defaultType?: WorkOrderKind;
  defaultMachineId?: string;
  onClose: () => void;
}

const emptyForm = (type: WorkOrderKind) => {
  const now = new Date();
  const defaultDue = new Date(now.getTime() + 4 * 3600000);
  return {
    type,
    machineId: '',
    title: '',
    description: '',
    activityTypeId: NONE,
    dueAt: type === 'BREAKDOWN' ? toLocalIsoDateTime(defaultDue) : '',
    assigneeId: NONE,
    responsibleId: NONE,
    priority: '2',
    documentUrl: '',
    // Breakdown specific fields
    failureType: 'Mechanical',
    failureTime: toLocalIsoDateTime(now),
    estimatedDowntimeHours: '4',
    rootCause: '',
    remarks: '',
  };
};

export function CreateWorkOrderDialog({ open, defaultType, defaultMachineId, onClose }: Props) {
  const create = useCreateWorkOrder();
  const { user } = useAuth();
  const [firm, setFirm] = useState<CompanyOption | null>(null);
  const onFirm = useCallback((c: CompanyOption) => setFirm(c), []);
  const firmId = firm?.id;

  const { machines } = useMachineOptions(firmId);
  const { data: activityTypes = [] } = useActivityTypes();
  const { data: users = [] } = useAssignableUsers();

  const [form, setForm] = useState(emptyForm(defaultType ?? 'REPAIR'));
  const { uploadImage, isUploading } = useWorkOrderUpload(form.machineId || undefined, 'SERVICE_REPORT');
  const [docName, setDocName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [customFailureTypes, setCustomFailureTypes] = useState<string[]>(loadCustomFailureTypes);
  const [showAddFailureType, setShowAddFailureType] = useState(false);
  const [newFailureType, setNewFailureType] = useState('');

  const failureTypes = useMemo(() => {
    const combined = [...DEFAULT_FAILURE_TYPES, ...customFailureTypes];
    return Array.from(new Set(combined));
  }, [customFailureTypes]);

  const handleAddFailureType = () => {
    const trimmed = newFailureType.trim();
    if (!trimmed) return;
    if (!failureTypes.includes(trimmed)) {
      const updated = [...customFailureTypes, trimmed];
      setCustomFailureTypes(updated);
      saveCustomFailureTypes(updated);
    }
    setForm((f) => ({ ...f, failureType: trimmed }));
    setNewFailureType('');
    setShowAddFailureType(false);
  };

  const set = <K extends keyof ReturnType<typeof emptyForm>>(k: K, v: ReturnType<typeof emptyForm>[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (open) {
      const initial = emptyForm(defaultType ?? 'REPAIR');
      if (defaultMachineId) initial.machineId = defaultMachineId;
      setForm(initial);
      setDocName('');
      setErrors({});
      setShowAddFailureType(false);
      setNewFailureType('');
    }
  }, [open, defaultType, defaultMachineId]);

  const machine = machines.find((m) => String(m.id) === form.machineId);
  const rented = machine?.ownershipType === 'RENTED';

  // A rented machine only accepts BREAKDOWN: switch to it as soon as such a machine is picked.
  useEffect(() => {
    if (rented && form.type !== 'BREAKDOWN') setForm((f) => ({ ...f, type: 'BREAKDOWN' }));
  }, [rented, form.type]);

  // Auto-sync firm if defaultMachineId is provided and firm is not yet selected
  useEffect(() => {
    if (defaultMachineId && machines.length > 0 && !firm) {
      const targetMachine = machines.find((m) => String(m.id) === String(defaultMachineId));
      if (targetMachine?.firmId) {
        setFirm({ id: String(targetMachine.firmId), name: targetMachine.firmName || targetMachine.firm?.name || '' });
      }
    }
  }, [defaultMachineId, machines, firm]);

  // Auto-fill title for breakdown if not customized yet
  useEffect(() => {
    if (form.type === 'BREAKDOWN' && machine) {
      if (!form.title || form.title.startsWith('Breakdown -')) {
        setForm((f) => ({ ...f, title: `Breakdown - ${machine.name}: ${f.failureType}` }));
      }
    }
  }, [form.type, machine?.name, form.failureType]);

  const onDowntimeChange = (hoursStr: string) => {
    set('estimatedDowntimeHours', hoursStr);
    const hrs = parseFloat(hoursStr);
    if (!isNaN(hrs) && hrs >= 0 && form.failureTime) {
      const failDate = new Date(form.failureTime);
      if (!isNaN(failDate.getTime())) {
        const calculatedDue = new Date(failDate.getTime() + hrs * 3600000);
        set('dueAt', toLocalIsoDateTime(calculatedDue));
      }
    }
  };

  const machineOptions = useMemo(
    () =>
      machines.map((m) => ({
        value: String(m.id),
        label: m.name,
        sublabel: `${m.assetCode}${m.ownershipType === 'RENTED' ? ' - Rented' : ''}`,
        keywords: [m.assetCode],
      })),
    [machines]
  );

  const onFile = async (file?: File) => {
    if (!file) return;
    try {
      const res = await uploadImage(file);
      set('documentUrl', res.url);
      setDocName(file.name);
    } catch (e) {
      toastError(e, 'Upload failed');
    }
  };

  const submit = async () => {
    const errs: Record<string, string> = {};
    if (!form.machineId) errs.machineId = 'Select a machine';
    if (!form.title.trim()) errs.title = 'Title is required';
    if (!form.dueAt) errs.dueAt = 'Due date and time is required';
    else if (Number.isNaN(new Date(form.dueAt).getTime())) errs.dueAt = 'Invalid date';
    if (rented && form.type !== 'BREAKDOWN') errs.type = 'Rented machines accept breakdowns only';
    if (form.type === 'BREAKDOWN') {
      if (!form.failureType?.trim()) errs.failureType = 'Failure type is required';
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      await create.mutateAsync({
        type: form.type,
        machineId: form.machineId,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        activityTypeId: form.type !== 'BREAKDOWN' && form.activityTypeId !== NONE ? form.activityTypeId : undefined,
        dueAt: new Date(form.dueAt).toISOString(),
        assigneeId: form.assigneeId !== NONE ? form.assigneeId : undefined,
        responsibleId: form.responsibleId !== NONE ? form.responsibleId : undefined,
        priority: Number(form.priority),
        documentUrl: form.documentUrl || undefined,
        firmId,
        ...(form.type === 'BREAKDOWN'
          ? {
              failureType: form.failureType.trim() || undefined,
              failureTime: form.failureTime ? new Date(form.failureTime).toISOString() : undefined,
              estimatedDowntimeHours: form.estimatedDowntimeHours ? parseFloat(form.estimatedDowntimeHours) : undefined,
              rootCause: form.rootCause.trim() || undefined,
              remarks: form.remarks.trim() || undefined,
            }
          : {}),
      });
      toast.success(form.type === 'BREAKDOWN' ? 'Breakdown work order created' : 'Work order created');
      onClose();
    } catch (e) {
      toastError(e, 'Could not create the work order');
    }
  };

  const busy = create.isPending || isUploading;
  const err = (k: string) => (errors[k] ? <p className="text-xs text-destructive">{errors[k]}</p> : null);

  const isBreakdown = form.type === 'BREAKDOWN';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isBreakdown ? (
              <>
                <span className="p-1 rounded bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400">
                  <AlertOctagon className="h-4 w-4" />
                </span>
                New Breakdown Work Order
              </>
            ) : (
              'New work order'
            )}
          </DialogTitle>
          <DialogDescription>
            {isBreakdown
              ? 'Log equipment failure, downtime, and assign technician for immediate resolution.'
              : 'Create a maintenance, breakdown, repair or one-time job for a machine.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Company / project</Label>
            <CompanySelectField onSelect={onFirm} />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label>
              Machine <span className="text-destructive">*</span>
            </Label>
            <SearchableSelect
              options={machineOptions}
              value={form.machineId}
              onValueChange={(v) => set('machineId', v)}
              placeholder="Select machine"
              searchPlaceholder="Search by name or code"
            />
            {err('machineId')}
          </div>

          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => set('type', v as WorkOrderKind)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CREATABLE.map((t) => (
                  <SelectItem key={t} value={t} disabled={rented && t !== 'BREAKDOWN'}>
                    {TYPE_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {rented && <p className="text-xs text-muted-foreground">Rented machine: only breakdowns can be raised.</p>}
            {err('type')}
          </div>

          <div className="space-y-1.5">
            <Label>{isBreakdown ? 'Severity *' : 'Priority'}</Label>
            <Select value={form.priority} onValueChange={(v) => set('priority', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={String(p.value)}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Breakdown specific fields */}
          {isBreakdown && (
            <>
              {/* Failure Type */}
              <div className="space-y-1.5">
                <Label>
                  Failure type <span className="text-destructive">*</span>
                </Label>
                {showAddFailureType ? (
                  <div className="flex items-center gap-1.5">
                    <Input
                      placeholder="New failure type"
                      value={newFailureType}
                      onChange={(e) => setNewFailureType(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddFailureType();
                        }
                        if (e.key === 'Escape') {
                          setShowAddFailureType(false);
                          setNewFailureType('');
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddFailureType}
                      className="shrink-0 bg-red-600 hover:bg-red-700 text-white"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setShowAddFailureType(false);
                        setNewFailureType('');
                      }}
                      className="shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Select value={form.failureType} onValueChange={(v) => set('failureType', v)}>
                      <SelectTrigger><SelectValue placeholder="Select failure type" /></SelectTrigger>
                      <SelectContent>
                        {failureTypes.map((ft) => (
                          <SelectItem key={ft} value={ft}>{ft}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => setShowAddFailureType(true)}
                      title="Add new failure type"
                      className="shrink-0 border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                {err('failureType')}
              </div>

              {/* Failure Time */}
              <div className="space-y-1.5">
                <Label htmlFor="wo-failure-time">Failure time</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="wo-failure-time"
                    type="datetime-local"
                    className="pl-9"
                    value={form.failureTime}
                    max={toLocalIsoDateTime(new Date())}
                    onChange={(e) => set('failureTime', e.target.value)}
                  />
                </div>
              </div>

              {/* Downtime Hours */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="wo-downtime">Estimated downtime hours</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="wo-downtime"
                    type="number"
                    min={0}
                    step={0.5}
                    placeholder="e.g. 4.5"
                    className="pl-9"
                    value={form.estimatedDowntimeHours}
                    onChange={(e) => onDowntimeChange(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Adjusting downtime automatically updates the target due date.</p>
              </div>
            </>
          )}

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="wo-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input id="wo-title" maxLength={200} value={form.title} onChange={(e) => set('title', e.target.value)} />
            {err('title')}
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="wo-desc">{isBreakdown ? 'Description & symptoms' : 'Description'}</Label>
            <Textarea
              id="wo-desc"
              rows={3}
              placeholder={isBreakdown ? 'Describe the breakdown, observed symptoms, and initial actions taken...' : ''}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>

          {/* Root cause for breakdown */}
          {isBreakdown && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="wo-root-cause">Root cause</Label>
              <Input
                id="wo-root-cause"
                placeholder="Identified or suspected root cause (optional)..."
                value={form.rootCause}
                onChange={(e) => set('rootCause', e.target.value)}
              />
            </div>
          )}

          {/* Activity type (shown only for scheduled/repair/one-time) */}
          {!isBreakdown && (
            <div className="space-y-1.5">
              <Label>Activity type</Label>
              <Select value={form.activityTypeId} onValueChange={(v) => set('activityTypeId', v)}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {activityTypes.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="wo-due">
              {isBreakdown ? 'Target resolution due time' : 'Due date and time'} <span className="text-destructive">*</span>
            </Label>
            <Input id="wo-due" type="datetime-local" value={form.dueAt} onChange={(e) => set('dueAt', e.target.value)} />
            {err('dueAt')}
          </div>

          <div className="space-y-1.5">
            <Label>Requested by</Label>
            <Input value={user?.name ?? user?.username ?? 'You'} readOnly disabled aria-label="Requested by (you)" />
          </div>

          <div className="space-y-1.5">
            <Label>{isBreakdown ? 'Assign technician' : 'Assigned to'}</Label>
            <SearchableSelect
              options={[
                { value: NONE, label: "Machine's default mechanic" },
                ...users.map((u) => ({ value: String(u.id), label: u.name, sublabel: u.role })),
              ]}
              value={form.assigneeId}
              onValueChange={(v) => set('assigneeId', v)}
              placeholder="Machine's default mechanic"
              searchPlaceholder="Search users"
            />
            <p className="text-xs text-muted-foreground">Does the work: updates progress and marks it done.</p>
          </div>

          <div className="space-y-1.5">
            <Label>Responsible person</Label>
            <SearchableSelect
              options={[
                { value: NONE, label: "Machine's responsible person" },
                ...users.map((u) => ({ value: String(u.id), label: u.name, sublabel: u.role })),
              ]}
              value={form.responsibleId}
              onValueChange={(v) => set('responsibleId', v)}
              placeholder="Machine's responsible person"
              searchPlaceholder="Search users"
            />
            <p className="text-xs text-muted-foreground">Accountable: approves the work and can reassign it. Never approves their own work; with nobody here an admin approves.</p>
          </div>

          {/* Remarks for breakdown */}
          {isBreakdown && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="wo-remarks">Remarks</Label>
              <Textarea
                id="wo-remarks"
                rows={2}
                placeholder="Any additional notes or observations..."
                value={form.remarks}
                onChange={(e) => set('remarks', e.target.value)}
              />
            </div>
          )}

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="wo-doc">{isBreakdown ? 'Breakdown photo / document' : 'Document / photo'}</Label>
            <Input id="wo-doc" type="file" onChange={(e) => onFile(e.target.files?.[0])} />
            {isUploading && <p className="text-xs text-muted-foreground">Uploading...</p>}
            {docName && !isUploading && <p className="text-xs text-muted-foreground">Attached: {docName}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button
            onClick={submit}
            disabled={busy}
            className={isBreakdown ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
          >
            {create.isPending ? 'Creating...' : isBreakdown ? 'Create Breakdown Work Order' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
