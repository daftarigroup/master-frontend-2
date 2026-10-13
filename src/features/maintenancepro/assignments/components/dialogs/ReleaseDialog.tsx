import { useState } from 'react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { apiErrorMessage } from '@/features/asset/fleet/lib/format';
import { useReleaseAssignment } from '../../server/useAssignmentQueries';
import type { AssignmentRow } from '../../types';
import { ActionDialog, Field } from './FormBits';

export function ReleaseDialog({ row, onClose }: { row: AssignmentRow; onClose: () => void }) {
  const release = useReleaseAssignment();
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const hired = row.machine.ownershipType === 'RENTED';
  const a = row.assignment;

  const submit = async () => {
    if (!a) return;
    setError('');
    try {
      await release.mutateAsync({ id: a.id, reason: reason.trim() || undefined });
      toast.success(hired ? 'Machine released and hire ended' : 'Machine released');
      onClose();
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not release the machine'));
    }
  };

  return (
    <ActionDialog
      title="Release machine"
      destructive
      submitLabel={hired ? 'Release and end hire' : 'Release'}
      onClose={onClose}
      onSubmit={submit}
      pending={release.isPending}
      error={error}
      description={`${row.machine.name} stops working for ${a?.firm.name ?? 'its project'}${a?.site ? ` / ${a.site.name}` : ''}.`}
    >
      {hired && (
        <p className="rounded-md bg-amber-50 p-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          This is a hired machine. Releasing it returns it to the vendor and sets the rental end to now.
        </p>
      )}
      <Field label="Reason (optional)" htmlFor="rl-reason"><Textarea id="rl-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
    </ActionDialog>
  );
}
