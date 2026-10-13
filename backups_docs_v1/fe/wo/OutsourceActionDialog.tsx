import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useImageUpload } from '@/hooks/useImageUpload';
import type { WorkOrderRow } from '../server/api/workOrdersApi';
import {
  useOutsourcePay,
  useOutsourceReceive,
  useOutsourceSend,
  useVendors,
} from '../server/tanstackQuery/useWorkOrderActions';
import { toastError, todayStr } from './workOrderUtils';

export type OutsourceAction = 'send' | 'receive' | 'pay';

const OTHER = '__other__';

const TITLES: Record<OutsourceAction, string> = {
  send: 'Send to vendor',
  receive: 'Receive from vendor',
  pay: 'Mark paid',
};

interface Props {
  wo: WorkOrderRow | null;
  action: OutsourceAction | null;
  onClose: () => void;
}

export function OutsourceActionDialog({ wo, action, onClose }: Props) {
  const open = !!wo && !!action;
  const { data: vendors = [] } = useVendors();
  const send = useOutsourceSend();
  const receive = useOutsourceReceive();
  const pay = useOutsourcePay();
  const { uploadImage, isUploading } = useImageUpload({
    pathPrefix: 'work-orders/bills',
    allowedTypes: ['image/*', 'application/pdf'],
    maxSizeMB: 10,
  });

  const [date, setDate] = useState(todayStr());
  const [vendorId, setVendorId] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [billNo, setBillNo] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billUrl, setBillUrl] = useState('');
  const [billFileName, setBillFileName] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!wo || !action) return;
    setDate(todayStr());
    setVendorId(wo.outsource?.vendorId ?? '');
    setVendorName('');
    setBillNo('');
    setBillAmount('');
    setBillUrl('');
    setBillFileName('');
    setPayAmount(wo.outsource?.billAmount != null ? String(wo.outsource.billAmount) : '');
    setError('');
  }, [wo, action]);

  const busy = send.isPending || receive.isPending || pay.isPending || isUploading;

  const onFile = async (file?: File) => {
    if (!file) return;
    try {
      const res = await uploadImage(file);
      setBillUrl(res.url);
      setBillFileName(file.name);
    } catch (e) {
      toastError(e, 'Bill upload failed');
    }
  };

  const done = (msg: string) => {
    toast.success(msg);
    onClose();
  };

  const submit = async () => {
    if (!wo || !action) return;
    setError('');
    try {
      if (action === 'send') {
        const usingOther = vendorId === OTHER || !vendorId;
        if (usingOther && !vendorName.trim()) return setError('Choose a vendor or type a vendor name.');
        await send.mutateAsync({
          id: wo.id,
          body: { ...(usingOther ? { vendorName: vendorName.trim() } : { vendorId }), sentAt: date || undefined },
        });
        return done('Sent to vendor');
      }
      if (action === 'receive') {
        const amt = Number(billAmount);
        if (billAmount.trim() === '' || Number.isNaN(amt) || amt < 0) return setError('Enter the bill amount (0 or more).');
        await receive.mutateAsync({
          id: wo.id,
          body: {
            receivedAt: date || undefined,
            billNo: billNo.trim() || undefined,
            billAmount: amt,
            billUrl: billUrl || undefined,
          },
        });
        return done('Marked received');
      }
      const amt = payAmount.trim() === '' ? undefined : Number(payAmount);
      if (amt !== undefined && (Number.isNaN(amt) || amt < 0)) return setError('Amount must be 0 or more.');
      await pay.mutateAsync({ id: wo.id, body: { paidAt: date || undefined, amount: amt } });
      done('Marked paid');
    } catch (e) {
      toastError(e, 'Could not save');
    }
  };

  const vendorOptions = [
    ...vendors.map((v) => ({ value: String(v.id), label: v.name, sublabel: v.type })),
    { value: OTHER, label: 'Other (type a name)' },
  ];
  const dateLabel = action === 'send' ? 'Sent on' : action === 'receive' ? 'Received on' : 'Paid on';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{action ? TITLES[action] : ''}</DialogTitle>
          <DialogDescription>
            {wo?.workOrderCode ?? ''} {wo?.title ?? wo?.plan?.title ?? ''} - {wo?.machine?.name ?? ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {action === 'send' && (
            <div className="space-y-1.5">
              <Label>Vendor</Label>
              <SearchableSelect
                options={vendorOptions}
                value={vendorId}
                onValueChange={setVendorId}
                placeholder="Select vendor"
                searchPlaceholder="Search vendors"
              />
              {(vendorId === OTHER || (!vendorId && vendors.length === 0)) && (
                <Input placeholder="Vendor name" value={vendorName} onChange={(e) => setVendorName(e.target.value)} />
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="wo-stage-date">{dateLabel}</Label>
            <Input id="wo-stage-date" type="date" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)} />
          </div>

          {action === 'receive' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="wo-bill-no">Bill no.</Label>
                  <Input id="wo-bill-no" value={billNo} onChange={(e) => setBillNo(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wo-bill-amt">
                    Bill amount <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="wo-bill-amt"
                    type="number"
                    min={0}
                    inputMode="decimal"
                    value={billAmount}
                    onChange={(e) => setBillAmount(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wo-bill-file">Bill photo</Label>
                <Input id="wo-bill-file" type="file" accept="image/*,application/pdf" onChange={(e) => onFile(e.target.files?.[0])} />
                {isUploading && <p className="text-xs text-muted-foreground">Uploading...</p>}
                {billFileName && !isUploading && <p className="text-xs text-muted-foreground">Attached: {billFileName}</p>}
              </div>
            </>
          )}

          {action === 'pay' && (
            <div className="space-y-1.5">
              <Label htmlFor="wo-pay-amt">Amount paid</Label>
              <Input
                id="wo-pay-amt"
                type="number"
                min={0}
                inputMode="decimal"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? 'Saving...' : action ? TITLES[action] : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
