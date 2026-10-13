import { useState } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Textarea } from '@/components/ui/textarea';
import { apiErrorMessage } from '@/features/asset/fleet/lib/format';
import { useAssignMachine, useMachineOptions } from '../../server/useAssignmentQueries';
import type { AssignmentRow } from '../../types';
import { ActionDialog, Field, FirmSiteFields, UserSelect } from './FormBits';

/** Put a machine to work for a project. Opened from a row (machine fixed) or from the page header (machine picked here). */
export function AssignDialog({ row, onClose }: { row?: AssignmentRow; onClose: () => void }) {
  const save = useAssignMachine();
  const machines = useMachineOptions(!row);
  const a = row?.assignment;
  const [machineId, setMachineId] = useState(row?.machine.id ?? '');
  const [firmId, setFirmId] = useState(a?.firm.id ?? '');
  const [siteId, setSiteId] = useState(a?.site?.id ?? '');
  const [responsible, setResponsible] = useState(a?.responsible?.id ?? '');
  const [returnBy, setReturnBy] = useState('');
  const [note, setNote] = useState('');
  const [errs, setErrs] = useState<{ machine?: string; firm?: string }>({});
  const [error, setError] = useState('');

  const options = (machines.data?.rows ?? []).map((r) => ({ value: r.machine.id, label: r.machine.name, sublabel: r.machine.assetCode, keywords: [r.machine.assetCode] }));
  const hired = (row ?? machines.data?.rows.find((r) => r.machine.id === machineId))?.machine.ownershipType === 'RENTED';

  const submit = async () => {
    const e = { machine: machineId ? undefined : 'Choose a machine', firm: firmId ? undefined : 'Choose the project' };
    setErrs(e);
    if (e.machine || e.firm) return;
    setError('');
    try {
      await save.mutateAsync({ machineId, firmId, siteLocationId: siteId || undefined, responsibleUserId: responsible || undefined, expectedReturnAt: returnBy || undefined, note: note.trim() || undefined });
      toast.success('Machine assigned');
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not assign the machine'));
    }
  };

  return (
    <ActionDialog
      title={a ? 'Reassign machine' : 'Assign machine'}
      description={a ? 'This ends the current assignment and starts a new one.' : 'Put a machine to work for a project.'}
      onClose={onClose}
      onSubmit={submit}
      submitLabel="Assign"
      pending={save.isPending}
      error={error}
    >
      {row ? (
        <p className="rounded-md bg-muted p-2 text-sm font-medium">{row.machine.name} <span className="text-muted-foreground">({row.machine.assetCode})</span></p>
      ) : (
        <Field label="Machine" required error={errs.machine}>
          <SearchableSelect options={options} value={machineId} onValueChange={setMachineId} placeholder={machines.isLoading ? 'Loading…' : 'Select machine'} searchPlaceholder="Search machine or code" className="h-11 w-full" />
        </Field>
      )}
      <FirmSiteFields firmId={firmId} siteId={siteId} onFirm={setFirmId} onSite={setSiteId} firmError={errs.firm} />
      <Field label="Responsible person"><UserSelect value={responsible} onChange={setResponsible} /></Field>
      <Field label="Expected return date" htmlFor="as-return">
        <Input id="as-return" type="date" className="h-11" value={returnBy} onChange={(e) => setReturnBy(e.target.value)} />
        {hired && <p className="text-xs text-muted-foreground">Hired machine: leave blank to use the end of the hire.</p>}
      </Field>
      <Field label="Note" htmlFor="as-note"><Textarea id="as-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
    </ActionDialog>
  );
}
