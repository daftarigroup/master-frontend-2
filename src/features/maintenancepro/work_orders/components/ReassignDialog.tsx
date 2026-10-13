import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Textarea } from '@/components/ui/textarea';
import { useAssignableUsers } from '../../assign_task/server/tanstackQuery/useUsersQueries';
import type { WorkOrderRow } from '../server/api/workOrdersApi';
import { useReassignWorkOrder } from '../server/tanstackQuery/useWorkOrderActions';
import { toastError } from './workOrderUtils';

/** Hand a work order to someone else. A reason is required and is written to the order's history. */
export function ReassignDialog({ wo, onClose }: { wo: WorkOrderRow | null; onClose: () => void }) {
  const reassign = useReassignWorkOrder();
  const { data: users = [] } = useAssignableUsers();
  const [toUserId, setToUserId] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (wo) {
      setToUserId('');
      setReason('');
      setError('');
    }
  }, [wo]);

  const submit = async () => {
    if (!wo) return;
    if (!toUserId) return setError('Choose who it goes to');
    if (reason.trim().length < 3) return setError('Give a reason (at least 3 characters)');
    setError('');
    try {
      await reassign.mutateAsync({ id: wo.id, toUserId, reason: reason.trim() });
      toast.success('Work order reassigned');
      onClose();
    } catch (e) {
      toastError(e, 'Could not reassign the work order');
    }
  };

  return (
    <Dialog open={!!wo} onOpenChange={(o) => !o && !reassign.isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reassign work order</DialogTitle>
          <DialogDescription>
            {wo ? `${wo.workOrderCode ?? ''} ${wo.title ?? wo.plan?.title ?? ''}`.trim() : ''}
            {wo?.currentAssignee ? ` - now with ${wo.currentAssignee.name}` : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>New assignee</Label>
            <SearchableSelect
              options={users.filter((u) => String(u.id) !== wo?.currentAssigneeId).map((u) => ({ value: String(u.id), label: u.name, sublabel: u.role }))}
              value={toUserId}
              onValueChange={setToUserId}
              placeholder="Select a person"
              searchPlaceholder="Search users"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reassign-reason">Reason</Label>
            <Textarea id="reassign-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. assignee is on leave" />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={reassign.isPending}>Cancel</Button>
          <Button onClick={submit} disabled={reassign.isPending}>{reassign.isPending ? 'Saving...' : 'Reassign'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
