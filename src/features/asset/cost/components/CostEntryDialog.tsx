import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiErrorMessage, istToday } from '@/features/asset/fleet/lib/format';
import { ENTRY_LABEL } from '../lib/costLabels';
import { useCreateCostEntry, useWbs } from '../server/useCostQueries';
import type { EntryCategory } from '../types';

const NONE = '__none__';

/** A manual cost for one machine and date (operator, transport, insurance, consumables, rental invoice, other). */
export function CostEntryDialog({ open, onOpenChange, machineId, firmId, rented, month }: { open: boolean; onOpenChange: (o: boolean) => void; machineId: string; firmId: string | null; rented: boolean; month: string }) {
  const create = useCreateCostEntry();
  const wbs = useWbs(firmId, open && !!firmId);
  const [date, setDate] = useState(istToday());
  const [category, setCategory] = useState<EntryCategory>('OTHER');
  const [amount, setAmount] = useState('');
  const [wbsId, setWbsId] = useState(NONE);
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const today = istToday();
    setDate(today.startsWith(month) ? today : `${month}-01`); // default into the month being looked at
    setCategory('OTHER'); setAmount(''); setWbsId(NONE); setDescription(''); setError('');
  }, [open, month]);

  const categories = (Object.keys(ENTRY_LABEL) as EntryCategory[]).filter((c) => c !== 'RENTAL_INVOICE' || rented);
  const amountN = Number(amount);

  const save = async () => {
    if (!amount.trim() || !Number.isFinite(amountN) || amountN <= 0) return setError('Enter an amount greater than zero');
    if (!date) return setError('Choose the cost date');
    setError('');
    try {
      await create.mutateAsync({ machineId, costDate: date, category, amount: amountN, wbsActivityId: wbsId === NONE ? null : wbsId, description: description.trim() || null });
      toast.success('Cost entry added');
      onOpenChange(false);
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not add the cost entry'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add cost entry</DialogTitle>
          <DialogDescription>
            {category === 'RENTAL_INVOICE' ? 'A rental invoice replaces the computed rental figure for its month.' : 'A one-off cost that is not diesel or maintenance.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ce-date">Date</Label>
              <Input id="ce-date" type="date" className="h-11" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ce-amount">Amount (₹)</Label>
              <Input id="ce-amount" inputMode="decimal" className="h-11" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as EntryCategory)}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{ENTRY_LABEL[c]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>WBS activity</Label>
            <Select value={wbsId} onValueChange={setWbsId}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None (spread by hours)</SelectItem>
                {(wbs.data ?? []).map((w) => <SelectItem key={w.id} value={w.id}>{w.code} · {w.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ce-desc">Description</Label>
            <Input id="ce-desc" className="h-11" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="optional, e.g. invoice number" />
          </div>
          {error && <p role="alert" className="rounded-md bg-red-50 p-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={create.isPending}>{create.isPending ? 'Saving…' : 'Add entry'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
