import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { apiErrorMessage, istToday } from '@/features/asset/fleet/lib/format';
import { useAssignOperator, useEndOperator, useOperatorRows } from '../../server/useAssignmentQueries';
import type { OperatorInfo } from '../../types';
import { ActionDialog, Field, UserCheckboxSelect } from './FormBits';

export function OperatorDialog({
  machine,
  current,
  currentOperators,
  onClose,
}: {
  machine: { id: string; name: string };
  current?: OperatorInfo | null;
  currentOperators?: OperatorInfo[];
  onClose: () => void;
}) {
  const save = useAssignOperator();
  const operatorRows = useOperatorRows();

  // Find all active operators for this machine from the operators list query
  const machineAssigned = useMemo(() => {
    return (operatorRows.data ?? []).filter((o) => o.machine.id === machine.id);
  }, [operatorRows.data, machine.id]);

  // Collect initial operator IDs
  const initialUserIds = useMemo(() => {
    const ids = new Set<string>();
    if (current?.id) ids.add(current.id);
    (currentOperators ?? []).forEach((o) => {
      if (o?.id) ids.add(o.id);
    });
    machineAssigned.forEach((o) => {
      if (o.operator?.id) ids.add(o.operator.id);
    });
    return Array.from(ids);
  }, [current, currentOperators, machineAssigned]);

  const [userIds, setUserIds] = useState<string[]>(initialUserIds);
  const [from, setFrom] = useState(istToday());
  const [till, setTill] = useState(current?.validTill ? current.validTill.slice(0, 10) : '');
  const [errs, setErrs] = useState<{ user?: string; till?: string }>({});
  const [error, setError] = useState('');

  // When initial data loads (if it wasn't available immediately), sync into userIds
  useEffect(() => {
    if (userIds.length === 0 && initialUserIds.length > 0) {
      setUserIds(initialUserIds);
    }
  }, [initialUserIds]);

  const submit = async () => {
    const e = {
      user: userIds.length > 0 ? undefined : 'Please select at least one operator',
      till: till && from && till < from ? 'Valid till is before valid from' : undefined,
    };
    setErrs(e);
    if (e.user || e.till) return;
    setError('');
    try {
      await save.mutateAsync({
        machineId: machine.id,
        userIds,
        validFrom: from || undefined,
        validTill: till || null,
      });
      toast.success(userIds.length > 1 ? `${userIds.length} operators assigned` : 'Operator assigned');
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not assign the operator'));
    }
  };

  const currentNames = useMemo(() => {
    const names = new Set<string>();
    if (current?.name) names.add(current.name);
    (currentOperators ?? []).forEach((o) => {
      if (o?.name) names.add(o.name);
    });
    machineAssigned.forEach((o) => {
      if (o.operator?.name) names.add(o.operator.name);
    });
    return Array.from(names).join(', ');
  }, [current, currentOperators, machineAssigned]);

  return (
    <ActionDialog
      title={currentNames ? 'Change operator' : 'Assign operator'}
      description={
        currentNames
          ? `${machine.name}: currently assigned to ${currentNames}. Select operators using checkboxes.`
          : `${machine.name}: Select operators using checkboxes.`
      }
      submitLabel="Save operator"
      onClose={onClose}
      onSubmit={submit}
      pending={save.isPending}
      error={error}
    >
      <Field label="Operators" required error={errs.user}>
        <UserCheckboxSelect value={userIds} onChange={setUserIds} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Valid from" htmlFor="op-from">
          <Input id="op-from" type="date" className="h-11" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="Valid till" htmlFor="op-till" error={errs.till}>
          <Input id="op-till" type="date" className="h-11" value={till} onChange={(e) => setTill(e.target.value)} />
        </Field>
      </div>
    </ActionDialog>
  );
}

export function EndOperatorDialog({ id, operatorName, machineName, onClose }: { id: string; operatorName: string | null; machineName: string; onClose: () => void }) {
  const end = useEndOperator();
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    try {
      await end.mutateAsync(id);
      toast.success('Operator assignment ended');
      onClose();
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not end the operator assignment'));
    }
  };

  return <ActionDialog title="End operator assignment" destructive description={`${operatorName ?? 'The operator'} stops operating ${machineName}.`} submitLabel="End assignment" onClose={onClose} onSubmit={submit} pending={end.isPending} error={error} />;
}
