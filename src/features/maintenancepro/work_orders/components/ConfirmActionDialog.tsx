import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Props {
  open: boolean;
  title: string;
  description: string;
  /** Label of the text box; when omitted no text is collected. */
  reasonLabel?: string;
  reasonRequired?: boolean;
  confirmLabel: string;
  destructive?: boolean;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

/** One confirm dialog for Mark done / Skip / Cancel (optional or required note). */
export function ConfirmActionDialog({
  open,
  title,
  description,
  reasonLabel,
  reasonRequired,
  confirmLabel,
  destructive,
  busy,
  onClose,
  onConfirm,
}: Props) {
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (open) {
      setReason('');
      setTouched(false);
    }
  }, [open]);

  const missing = !!reasonRequired && !reason.trim();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {reasonLabel && (
          <div className="space-y-1.5">
            <Label htmlFor="wo-confirm-reason">
              {reasonLabel}
              {reasonRequired && <span className="text-destructive"> *</span>}
            </Label>
            <Textarea id="wo-confirm-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
            {touched && missing && <p className="text-xs text-destructive">This is required.</p>}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Back
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            disabled={busy}
            onClick={() => {
              setTouched(true);
              if (!missing) onConfirm(reason.trim());
            }}
          >
            {busy ? 'Working...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
