import { useState } from 'react';
import { AlertCircle, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { formatINR } from '@/features/asset/equipment/lib/money';
import { apiErrorMessage, fmtDay } from '@/features/asset/fleet/lib/format';
import { optNumber } from '../lib/due';
import { useAddPart, useRecordParts } from '../server/useRecordQueries';
import type { OpenServiceWorkOrder } from '../types';

const TH = 'px-3 py-2 text-left text-xs font-semibold text-muted-foreground';

function AddPartForm({ workOrder, onDone, showCost }: { workOrder: OpenServiceWorkOrder; onDone: () => void; showCost: boolean }) {
  const add = useAddPart();
  const [name, setName] = useState('');
  const [qty, setQty] = useState('1');
  const [unitCost, setUnitCost] = useState('');
  const [vendor, setVendor] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [error, setError] = useState('');
  const submit = async () => {
    const q = optNumber(qty);
    if (!name.trim()) return setError('Enter the part name');
    if (!q || q < 1 || !Number.isInteger(q)) return setError('Quantity must be a whole number, at least 1');
    if (from && to && to < from) return setError('The warranty end is before its start');
    setError('');
    try {
      await add.mutateAsync({
        workOrderId: workOrder.id,
        body: { partName: name.trim(), quantity: q, unitCost: showCost ? optNumber(unitCost) : undefined, vendorName: vendor.trim() || undefined, warrantyFromDate: from || undefined, warrantyToDate: to || undefined },
      });
      toast.success('Part added');
      onDone();
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not add the part'));
    }
  };
  return (
    <div className="space-y-3">
      <div className="space-y-1.5"><Label htmlFor="pt-name">Part name</Label><Input id="pt-name" className="h-11" value={name} maxLength={200} onChange={(e) => setName(e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label htmlFor="pt-qty">Quantity</Label><Input id="pt-qty" inputMode="numeric" className="h-11" value={qty} onChange={(e) => setQty(e.target.value)} /></div>
        {showCost && <div className="space-y-1.5"><Label htmlFor="pt-cost">Unit cost</Label><Input id="pt-cost" inputMode="decimal" className="h-11" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} placeholder="₹" /></div>}
      </div>
      <div className="space-y-1.5"><Label htmlFor="pt-vendor">Vendor</Label><Input id="pt-vendor" className="h-11" value={vendor} onChange={(e) => setVendor(e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label htmlFor="pt-wf">Warranty from</Label><Input id="pt-wf" type="date" className="h-11" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="pt-wt">Warranty to</Label><Input id="pt-wt" type="date" className="h-11" value={to} onChange={(e) => setTo(e.target.value)} /></div>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <DialogFooter>
        <Button variant="outline" className="h-11" onClick={onDone}>Cancel</Button>
        <Button className="h-11" disabled={add.isPending} onClick={submit}>{add.isPending ? 'Saving…' : 'Add part'}</Button>
      </DialogFooter>
    </div>
  );
}

export function PartsTab({ machineId, workOrder, canCost }: { machineId: string; workOrder: OpenServiceWorkOrder | null; canCost: boolean }) {
  const q = useRecordParts(machineId);
  const [adding, setAdding] = useState(false);
  const rows = q.data ?? [];
  const withCost = rows.some((r) => r.unitCost !== undefined);
  const warranty = (a: string | null, b: string | null) => (a || b ? `${a ? fmtDay(a) : '…'} to ${b ? fmtDay(b) : '…'}` : '—');
  return (
    <section className="space-y-3" aria-label="Parts used">
      <div className="flex items-center gap-2">
        <h2 className="flex-1 text-sm font-semibold">Parts Used</h2>
        {workOrder && <Button size="sm" className="h-11 lg:h-9" onClick={() => setAdding(true)}><Plus className="size-4" /> Add part</Button>}
      </div>
      {q.isLoading ? <Skeleton className="h-32 w-full rounded-xl" /> : q.isError ? (
        <div role="alert" className="flex items-center gap-2 rounded-xl border p-4 text-sm"><AlertCircle className="size-4" aria-hidden /><span className="flex-1">Could not load parts.</span><Button size="sm" onClick={() => q.refetch()}>Retry</Button></div>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border p-6 text-center text-sm text-muted-foreground">No parts recorded yet.</p>
      ) : (
        <>
          <ul className="space-y-2 lg:hidden">
            {rows.map((p) => (
              <li key={p.id} className="rounded-xl border bg-card p-3">
                <p className="text-sm font-semibold">{p.partName} <span className="font-normal text-muted-foreground">× {p.quantity}</span></p>
                <p className="text-xs text-muted-foreground">{fmtDay(p.date)} · {p.workOrder.code ?? p.workOrder.title}{p.unitCost !== undefined ? ` · ${formatINR(p.unitCost)} each` : ''}</p>
                {(p.warrantyFromDate || p.warrantyToDate) && <p className="text-xs text-muted-foreground">Warranty {warranty(p.warrantyFromDate, p.warrantyToDate)}</p>}
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto rounded-xl border bg-card lg:block">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr><th scope="col" className={TH}>Part</th><th scope="col" className={TH}>Qty</th><th scope="col" className={TH}>Date</th><th scope="col" className={TH}>Work order</th><th scope="col" className={TH}>Vendor</th><th scope="col" className={TH}>Warranty</th>{withCost && <th scope="col" className={`${TH} text-right`}>Unit cost</th>}</tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td className="px-3 py-2 font-medium">{p.partName}</td><td className="px-3 py-2 tabular-nums">{p.quantity}</td><td className="whitespace-nowrap px-3 py-2">{fmtDay(p.date)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{p.workOrder.code ?? '—'}</td><td className="px-3 py-2">{p.vendorName ?? '—'}</td><td className="whitespace-nowrap px-3 py-2">{warranty(p.warrantyFromDate, p.warrantyToDate)}</td>
                    {withCost && <td className="px-3 py-2 text-right tabular-nums">{formatINR(p.unitCost)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {workOrder && (
        <Dialog open={adding} onOpenChange={setAdding}>
          <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
            <DialogHeader><DialogTitle>Add part</DialogTitle><DialogDescription>Added to {workOrder.code ?? 'the open service work order'}.</DialogDescription></DialogHeader>
            {adding && <AddPartForm workOrder={workOrder} showCost={canCost} onDone={() => setAdding(false)} />}
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}
