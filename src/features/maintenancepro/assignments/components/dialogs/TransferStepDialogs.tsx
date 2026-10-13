import { useState } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { apiErrorMessage } from '@/features/asset/fleet/lib/format';
import { useCancelTransfer, useDispatchTransfer, useReceiveTransfer } from '../../server/useAssignmentQueries';
import { endLabel } from '../../lib/dates';
import type { Transfer } from '../../types';
import { ActionDialog, Field, UserSelect } from './FormBits';

export function DispatchDialog({ transfer, onClose }: { transfer: Transfer; onClose: () => void }) {
  const dispatch = useDispatchTransfer();
  const [transporter, setTransporter] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [lrRef, setLrRef] = useState('');
  const [eta, setEta] = useState(transfer.eta ?? '');
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    try {
      await dispatch.mutateAsync({ id: transfer.id, body: { transporter: transporter.trim() || undefined, vehicleNo: vehicleNo.trim() || undefined, lrRef: lrRef.trim() || undefined, eta: eta || undefined } });
      toast.success('Transfer dispatched');
      onClose();
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not dispatch the transfer'));
    }
  };

  return (
    <ActionDialog title="Dispatch machine" description={`${transfer.machine.name}: ${endLabel(transfer.from)} to ${endLabel(transfer.to)}`} submitLabel="Dispatch" onClose={onClose} onSubmit={submit} pending={dispatch.isPending} error={error}>
      <Field label="Transporter" htmlFor="dp-tr"><Input id="dp-tr" className="h-11" value={transporter} onChange={(e) => setTransporter(e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Vehicle no." htmlFor="dp-veh"><Input id="dp-veh" className="h-11" value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} /></Field>
        <Field label="LR / ref" htmlFor="dp-lr"><Input id="dp-lr" className="h-11" value={lrRef} onChange={(e) => setLrRef(e.target.value)} /></Field>
      </div>
      <Field label="ETA" htmlFor="dp-eta"><Input id="dp-eta" type="date" className="h-11" value={eta} onChange={(e) => setEta(e.target.value)} /></Field>
    </ActionDialog>
  );
}

export function ReceiveDialog({ transfer, onClose }: { transfer: Transfer; onClose: () => void }) {
  const receive = useReceiveTransfer();
  const [responsible, setResponsible] = useState('');
  const [returnBy, setReturnBy] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    try {
      await receive.mutateAsync({ id: transfer.id, body: { responsibleUserId: responsible || undefined, expectedReturnAt: returnBy || undefined, note: note.trim() || undefined } });
      toast.success('Machine received');
      onClose();
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not receive the machine'));
    }
  };

  return (
    <ActionDialog title="Receive machine" description={`${transfer.machine.name} arrives at ${endLabel(transfer.to)}. Only a user of that firm can receive it.`} submitLabel="Receive" onClose={onClose} onSubmit={submit} pending={receive.isPending} error={error}>
      <Field label="Responsible person"><UserSelect value={responsible} onChange={setResponsible} /></Field>
      <Field label="Return by" htmlFor="rc-ret"><Input id="rc-ret" type="date" className="h-11" value={returnBy} onChange={(e) => setReturnBy(e.target.value)} /></Field>
      <Field label="Note" htmlFor="rc-note"><Textarea id="rc-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
    </ActionDialog>
  );
}

export function CancelDialog({ transfer, onClose }: { transfer: Transfer; onClose: () => void }) {
  const cancel = useCancelTransfer();
  const [reason, setReason] = useState('');
  const [reasonErr, setReasonErr] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    if (reason.trim().length < 3) return setReasonErr('Give a reason (at least 3 characters)');
    setReasonErr('');
    setError('');
    try {
      await cancel.mutateAsync({ id: transfer.id, reason: reason.trim() });
      toast.success('Transfer cancelled');
      onClose();
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not cancel the transfer'));
    }
  };

  return (
    <ActionDialog title="Cancel transfer" destructive description={`${transfer.transferNumber} for ${transfer.machine.name}. Possible only before dispatch.`} submitLabel="Cancel transfer" onClose={onClose} onSubmit={submit} pending={cancel.isPending} error={error}>
      <Field label="Reason" htmlFor="cn-reason" required error={reasonErr}><Textarea id="cn-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
    </ActionDialog>
  );
}
