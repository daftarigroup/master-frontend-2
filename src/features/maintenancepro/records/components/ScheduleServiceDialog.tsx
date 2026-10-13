import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCostEdit } from '@/features/asset/equipment/lib/useCostAccess';
import { apiErrorMessage, istToday } from '@/features/asset/fleet/lib/format';
import { useUsersList } from '@/features/asset/asset/server/tanstackQuery/useAssetQueries';
import { useVendors } from '../../work_orders/server/tanstackQuery/useWorkOrderActions';
import { optNumber } from '../lib/due';
import { useScheduleService } from '../server/useRecordQueries';
import type { RecordSummary, ScheduledWorkOrder, ServiceMode } from '../types';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  summary: RecordSummary;
}

/** Schedule Service: creates (or returns the already open) service work order for a schedule. */
export function ScheduleServiceDialog({ open, onOpenChange, summary }: Props) {
  const canCost = useCostEdit();
  const users = useUsersList();
  const vendors = useVendors();
  const mutation = useScheduleService();
  const [scheduleId, setScheduleId] = useState('');
  const [dueAt, setDueAt] = useState(istToday());
  const [assigneeId, setAssigneeId] = useState('');
  const [responsibleId, setResponsibleId] = useState('');
  const [parts, setParts] = useState('');
  const [labour, setLabour] = useState('');
  const [mode, setMode] = useState<ServiceMode>('IN_HOUSE');
  const [vendorId, setVendorId] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ wo: ScheduledWorkOrder; created: boolean } | null>(null);

  useEffect(() => {
    if (!open) return;
    setScheduleId(summary.nextService.scheduleId ?? summary.schedules[0]?.id ?? '');
    setDueAt(istToday()); setAssigneeId(''); setResponsibleId(''); setParts(''); setLabour(''); setMode('IN_HOUSE'); setVendorId(''); setError(''); setResult(null);
    // reset only when the dialog opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const userOptions = useMemo(() => (users.data ?? []).map((u) => ({ value: u.id, label: u.name })), [users.data]);
  const vendorOptions = useMemo(() => (vendors.data ?? []).map((v) => ({ value: v.id, label: v.name })), [vendors.data]);

  const submit = async () => {
    if (!scheduleId) return setError('Choose a schedule');
    if (mode === 'VENDOR' && !vendorId) return setError('Choose the vendor');
    setError('');
    try {
      const r = await mutation.mutateAsync({
        scheduleId,
        body: {
          dueAt: dueAt || undefined,
          assigneeId: assigneeId || undefined,
          responsibleId: responsibleId || undefined,
          serviceMode: mode,
          vendorId: mode === 'VENDOR' ? vendorId : undefined,
          ...(canCost ? { estPartsCost: optNumber(parts), estLabourCost: optNumber(labour) } : {}),
        },
      });
      setResult({ wo: r.workOrder, created: r.created });
      toast.success(r.created ? 'Service scheduled' : 'A service is already open for this schedule');
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not schedule the service'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Service</DialogTitle>
          <DialogDescription>{summary.machine.name} · {summary.machine.assetCode}</DialogDescription>
        </DialogHeader>
        {result ? (
          <div className="space-y-3" role="status">
            <p className="text-sm">{result.created ? 'Work order created' : 'Already open'}: <span className="font-mono font-bold">{result.wo.workOrderCode ?? result.wo.id}</span></p>
            <Button asChild variant="outline" className="h-11 w-full"><Link to="/maintenance/work-orders">Open work orders</Link></Button>
            <DialogFooter><Button className="h-11" onClick={() => onOpenChange(false)}>Done</Button></DialogFooter>
          </div>
        ) : (
          <div className="space-y-3">
            {summary.schedules.length > 1 && (
              <div className="space-y-1.5">
                <Label>Schedule</Label>
                <Select value={scheduleId} onValueChange={setScheduleId}>
                  <SelectTrigger className="h-11" aria-label="Schedule"><SelectValue /></SelectTrigger>
                  <SelectContent>{summary.schedules.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="ss-due">Due date</Label>
              <Input id="ss-due" type="date" className="h-11" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Assigned to</Label>
                <SearchableSelect options={userOptions} value={assigneeId} onValueChange={setAssigneeId} placeholder="Default mechanic" searchPlaceholder="Search people" />
              </div>
              <div className="space-y-1.5">
                <Label>Responsible</Label>
                <SearchableSelect options={userOptions} value={responsibleId} onValueChange={setResponsibleId} placeholder="Default responsible" searchPlaceholder="Search people" />
              </div>
            </div>
            {canCost && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ss-parts">Est. parts cost</Label>
                  <Input id="ss-parts" inputMode="decimal" className="h-11" value={parts} onChange={(e) => setParts(e.target.value)} placeholder="₹" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ss-labour">Est. labour cost</Label>
                  <Input id="ss-labour" inputMode="decimal" className="h-11" value={labour} onChange={(e) => setLabour(e.target.value)} placeholder="₹" />
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Service mode</Label>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Service mode">
                {(['IN_HOUSE', 'VENDOR'] as const).map((m) => (
                  <Button key={m} type="button" role="radio" aria-checked={mode === m} variant={mode === m ? 'default' : 'outline'} className="h-11" onClick={() => setMode(m)}>
                    {m === 'IN_HOUSE' ? 'In-house' : 'Vendor'}
                  </Button>
                ))}
              </div>
            </div>
            {mode === 'VENDOR' && (
              <div className="space-y-1.5">
                <Label>Vendor</Label>
                <SearchableSelect options={vendorOptions} value={vendorId} onValueChange={setVendorId} placeholder="Choose vendor" searchPlaceholder="Search vendors" />
              </div>
            )}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button variant="outline" className="h-11" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button className="h-11" disabled={mutation.isPending} onClick={submit}>{mutation.isPending ? 'Scheduling…' : 'Schedule Service'}</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
