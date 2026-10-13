import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CompanySelectField, type CompanyOption } from '@/features/organization/components/CompanySelectField';
import { useAuth } from '@/context/AuthContext';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useActivityTypes } from '../../activityTypes/server/tanstackQuery/useActivityTypeQueries';
import { useAssignableUsers } from '../../assign_task/server/tanstackQuery/useUsersQueries';
import { PRIORITY_OPTIONS } from '../../shared/lib/common';
import type { WorkOrderKind } from '../server/api/workOrdersApi';
import { useCreateWorkOrder, useMachineOptions } from '../server/tanstackQuery/useWorkOrderActions';
import { TYPE_LABEL, toastError } from './workOrderUtils';

const CREATABLE: WorkOrderKind[] = ['SCHEDULED', 'BREAKDOWN', 'REPAIR', 'ONE_TIME'];
const NONE = '__none__';

interface Props {
  open: boolean;
  defaultType?: WorkOrderKind;
  onClose: () => void;
}

const emptyForm = (type: WorkOrderKind) => ({
  type,
  machineId: '',
  title: '',
  description: '',
  activityTypeId: NONE,
  dueAt: '',
  assigneeId: NONE,
  responsibleId: NONE,
  priority: '2',
  documentUrl: '',
});

export function CreateWorkOrderDialog({ open, defaultType, onClose }: Props) {
  const create = useCreateWorkOrder();
  const { user } = useAuth();
  const [firm, setFirm] = useState<CompanyOption | null>(null);
  const onFirm = useCallback((c: CompanyOption) => setFirm(c), []);
  const firmId = firm?.id;

  const { machines } = useMachineOptions(firmId);
  const { data: activityTypes = [] } = useActivityTypes();
  const { data: users = [] } = useAssignableUsers();
  const { uploadImage, isUploading } = useImageUpload({ pathPrefix: 'work-orders/docs', maxSizeMB: 15 });

  const [form, setForm] = useState(emptyForm(defaultType ?? 'REPAIR'));
  const [docName, setDocName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof ReturnType<typeof emptyForm>>(k: K, v: ReturnType<typeof emptyForm>[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (open) {
      setForm(emptyForm(defaultType ?? 'REPAIR'));
      setDocName('');
      setErrors({});
    }
  }, [open, defaultType]);

  const machine = machines.find((m) => String(m.id) === form.machineId);
  const rented = machine?.ownershipType === 'RENTED';

  // A rented machine only accepts BREAKDOWN: switch to it as soon as such a machine is picked.
  useEffect(() => {
    if (rented && form.type !== 'BREAKDOWN') setForm((f) => ({ ...f, type: 'BREAKDOWN' }));
  }, [rented, form.type]);

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
    setErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      await create.mutateAsync({
        type: form.type,
        machineId: form.machineId,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        activityTypeId: form.activityTypeId !== NONE ? form.activityTypeId : undefined,
        dueAt: new Date(form.dueAt).toISOString(),
        assigneeId: form.assigneeId !== NONE ? form.assigneeId : undefined,
        responsibleId: form.responsibleId !== NONE ? form.responsibleId : undefined,
        priority: Number(form.priority),
        documentUrl: form.documentUrl || undefined,
        firmId,
      });
      toast.success('Work order created');
      onClose();
    } catch (e) {
      toastError(e, 'Could not create the work order');
    }
  };

  const busy = create.isPending || isUploading;
  const err = (k: string) => (errors[k] ? <p className="text-xs text-destructive">{errors[k]}</p> : null);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>New work order</DialogTitle>
          <DialogDescription>Create a scheduled, breakdown, repair or one-time job for a machine.</DialogDescription>
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
            <Label>Priority</Label>
            <Select value={form.priority} onValueChange={(v) => set('priority', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={String(p.value)}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="wo-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input id="wo-title" maxLength={200} value={form.title} onChange={(e) => set('title', e.target.value)} />
            {err('title')}
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="wo-desc">Description</Label>
            <Textarea id="wo-desc" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>

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

          <div className="space-y-1.5">
            <Label htmlFor="wo-due">
              Due date and time <span className="text-destructive">*</span>
            </Label>
            <Input id="wo-due" type="datetime-local" value={form.dueAt} onChange={(e) => set('dueAt', e.target.value)} />
            {err('dueAt')}
          </div>

          <div className="space-y-1.5">
            <Label>Requested by</Label>
            <Input value={user?.name ?? user?.username ?? 'You'} readOnly disabled aria-label="Requested by (you)" />
          </div>

          <div className="space-y-1.5">
            <Label>Assigned to</Label>
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

          <div className="space-y-1.5">
            <Label htmlFor="wo-doc">Document / photo</Label>
            <Input id="wo-doc" type="file" onChange={(e) => onFile(e.target.files?.[0])} />
            {isUploading && <p className="text-xs text-muted-foreground">Uploading...</p>}
            {docName && !isUploading && <p className="text-xs text-muted-foreground">Attached: {docName}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{create.isPending ? 'Creating...' : 'Create'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
