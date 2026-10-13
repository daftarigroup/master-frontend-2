import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useResolveBreakdown } from '../server/tanstackQuery/useBreakdownQueries';

/**
 * Closes a breakdown report: root cause, corrective and preventive action. The API also puts the machine back
 * in service, so this is only offered while the report is unresolved.
 */
export function ResolveBreakdownForm({ breakdownId, onResolved }: { breakdownId: string; onResolved: () => void }) {
  const resolve = useResolveBreakdown();
  const [rootCause, setRootCause] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [preventiveAction, setPreventiveAction] = useState('');

  const submit = async () => {
    try {
      await resolve.mutateAsync({
        id: breakdownId,
        dto: {
          rootCause: rootCause.trim() || undefined,
          correctiveAction: correctiveAction.trim() || undefined,
          preventiveAction: preventiveAction.trim() || undefined,
        },
      });
      toast.success('Breakdown resolved. The machine is back in service.');
      onResolved();
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      toast.error(err?.response?.data?.message || err?.message || 'Could not resolve the breakdown');
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-green-500/30 bg-green-500/5 p-4">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-green-700 dark:text-green-400">
        <CheckCircle2 size={16} /> Resolve this breakdown
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="bd-root">Root cause</Label>
        <Textarea id="bd-root" rows={2} value={rootCause} onChange={(e) => setRootCause(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="bd-fix">Corrective action</Label>
        <Textarea id="bd-fix" rows={2} value={correctiveAction} onChange={(e) => setCorrectiveAction(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="bd-prev">Preventive action</Label>
        <Textarea id="bd-prev" rows={2} value={preventiveAction} onChange={(e) => setPreventiveAction(e.target.value)} />
      </div>
      <Button className="h-11 w-full" disabled={resolve.isPending} onClick={submit}>
        {resolve.isPending ? 'Resolving…' : 'Mark resolved'}
      </Button>
    </div>
  );
}

export default ResolveBreakdownForm;
