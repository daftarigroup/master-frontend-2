import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { apiErrorMessage, istToday } from '@/features/asset/fleet/lib/format';
import { BASIS_LABEL, RATE_TYPE_LABEL } from '../lib/costLabels';
import { useCreateRate } from '../server/useCostQueries';
import type { RateBasis, RateType } from '../types';

const optNum = (s: string): number | null => (s.trim() === '' || !Number.isFinite(Number(s)) ? null : Number(s));

/**
 * Adds a rate. The rate card is append-only: a new rate starts on a later date and closes the previous one the day before, so a past
 * month always reproduces with the rate that was in force then. The server enforces every rule below too.
 */
export function RateCardDialog({ open, onOpenChange, machineId, rented, unit }: { open: boolean; onOpenChange: (o: boolean) => void; machineId: string; rented: boolean; unit: 'Hrs' | 'km' | null }) {
  const create = useCreateRate(machineId);
  const [rateType, setRateType] = useState<RateType>(rented ? 'RENTAL' : 'INTERNAL_HOURLY');
  const [basis, setBasis] = useState<RateBasis>(unit === 'km' ? 'KM' : 'HOUR');
  const [amount, setAmount] = useState('');
  const [minQty, setMinQty] = useState('');
  const [extra, setExtra] = useState('');
  const [deduct, setDeduct] = useState(false);
  const [from, setFrom] = useState(istToday());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setRateType(rented ? 'RENTAL' : 'INTERNAL_HOURLY');
    setBasis(unit === 'km' ? 'KM' : 'HOUR');
    setAmount(''); setMinQty(''); setExtra(''); setDeduct(false); setFrom(istToday()); setNote(''); setError('');
  }, [open, rented, unit]);

  const internal = rateType === 'INTERNAL_HOURLY';
  const bases: RateBasis[] = internal ? ['HOUR', 'KM'] : ['HOUR', 'DAY', 'MONTH', 'KM'];
  const tiered = !internal && basis !== 'MONTH';
  const amountN = optNum(amount);
  const invalid = amountN === null || amountN < 0 ? 'Enter the rate amount' : !from ? 'Choose the date the rate starts' : '';

  const save = async () => {
    if (invalid) return setError(invalid);
    setError('');
    try {
      await create.mutateAsync({
        rateType, basis, amount: amountN!, effectiveFrom: from, note: note.trim() || null,
        ...(tiered ? { minBillableQty: optNum(minQty), extraRate: optNum(extra) } : {}),
        ...(!internal && (basis === 'MONTH' || basis === 'DAY') ? { deductBreakdownDays: deduct } : {}),
      });
      toast.success('Rate added');
      onOpenChange(false);
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not add the rate'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add rate</DialogTitle>
          <DialogDescription>Rates are never edited, only replaced from a later date. Earlier months keep the rate that applied then.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {rented && (
            <div className="space-y-1.5">
              <Label>Rate type</Label>
              <Select value={rateType} onValueChange={(v) => { setRateType(v as RateType); setBasis(v === 'INTERNAL_HOURLY' ? (unit === 'km' ? 'KM' : 'HOUR') : 'HOUR'); }}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>{(Object.keys(RATE_TYPE_LABEL) as RateType[]).map((t) => <SelectItem key={t} value={t}>{RATE_TYPE_LABEL[t]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <p className="text-xs text-muted-foreground">{internal ? 'An internal charge-out rate: shown beside Total Spend, never added to it.' : 'What the vendor charges you for this hire.'}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rate-amount">Amount (₹)</Label>
              <Input id="rate-amount" inputMode="decimal" className="h-11" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Basis</Label>
              <Select value={basis} onValueChange={(v) => setBasis(v as RateBasis)}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>{bases.map((b) => <SelectItem key={b} value={b}>{BASIS_LABEL[b]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          {tiered && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rate-min">Minimum billable qty</Label>
                <Input id="rate-min" inputMode="decimal" className="h-11" value={minQty} onChange={(e) => setMinQty(e.target.value)} placeholder="optional" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rate-extra">Extra rate beyond it (₹)</Label>
                <Input id="rate-extra" inputMode="decimal" className="h-11" value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="optional" />
              </div>
            </div>
          )}
          {!internal && (basis === 'MONTH' || basis === 'DAY') && (
            <label className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
              <span>Deduct breakdown days from the bill</span>
              <Switch checked={deduct} onCheckedChange={setDeduct} />
            </label>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="rate-from">Effective from</Label>
            <Input id="rate-from" type="date" className="h-11" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rate-note">Note</Label>
            <Input id="rate-note" className="h-11" value={note} onChange={(e) => setNote(e.target.value)} placeholder="optional, e.g. revised vendor quote" />
          </div>
          {error && <p role="alert" className="rounded-md bg-red-50 p-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={create.isPending}>{create.isPending ? 'Saving…' : 'Add rate'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
