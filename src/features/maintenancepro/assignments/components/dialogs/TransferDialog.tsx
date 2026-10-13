import { useState } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { apiErrorMessage } from '@/features/asset/fleet/lib/format';
import { useRequestTransfer } from '../../server/useAssignmentQueries';
import type { AssignmentRow } from '../../types';
import { ActionDialog, Field, FirmSiteFields } from './FormBits';

export function TransferDialog({ row, onClose }: { row: AssignmentRow; onClose: () => void }) {
  const request = useRequestTransfer();
  const [firmId, setFirmId] = useState('');
  const [siteId, setSiteId] = useState('');
  const [eta, setEta] = useState('');
  const [note, setNote] = useState('');
  const [firmErr, setFirmErr] = useState('');
  const [error, setError] = useState('');
  const a = row.assignment;

  const submit = async () => {
    if (!firmId) return setFirmErr('Choose the destination project');
    setFirmErr('');
    setError('');
    try {
      await request.mutateAsync({ machineId: row.machine.id, toFirmId: firmId, toSiteLocationId: siteId || undefined, eta: eta || undefined, note: note.trim() || undefined });
      toast.success('Transfer requested');
      onClose();
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not request the transfer'));
    }
  };

  return (
    <ActionDialog
      title="Request transfer"
      submitLabel="Request transfer"
      onClose={onClose}
      onSubmit={submit}
      pending={request.isPending}
      error={error}
      description={`Move ${row.machine.name} from ${a?.firm.name ?? 'its project'}${a?.site ? ` / ${a.site.name}` : ''}.`}
    >
      <FirmSiteFields firmId={firmId} siteId={siteId} onFirm={setFirmId} onSite={setSiteId} firmLabel="Destination project (firm)" siteLabel="Destination site" firmError={firmErr} />
      <Field label="Expected arrival" htmlFor="tr-eta"><Input id="tr-eta" type="date" className="h-11" value={eta} onChange={(e) => setEta(e.target.value)} /></Field>
      <Field label="Note" htmlFor="tr-note"><Textarea id="tr-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
    </ActionDialog>
  );
}
