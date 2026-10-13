import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { apiErrorMessage } from '@/features/asset/fleet/lib/format';
import { useVoidDocument } from '../server/useDocumentQueries';
import type { DocRow } from '../types';

/** Documents are never deleted: voiding keeps the row with who voided it and why. A reason is required. */
export function VoidDocumentDialog({ doc, onClose }: { doc: DocRow | null; onClose: () => void }) {
  const mutation = useVoidDocument();
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const close = () => {
    setReason('');
    setError('');
    onClose();
  };
  const submit = async () => {
    if (!doc) return;
    if (reason.trim().length < 3) return setError('Give a reason (at least 3 characters)');
    try {
      await mutation.mutateAsync({ id: doc.id, reason: reason.trim() });
      toast.success('Document voided');
      close();
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not void the document'));
    }
  };
  return (
    <Dialog open={!!doc} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Void document</DialogTitle>
          <DialogDescription>{doc?.title}. It stays on record with your reason. If an older version exists it becomes current again.</DialogDescription>
        </DialogHeader>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" aria-label="Reason for voiding" rows={3} maxLength={300} />
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" className="h-11" onClick={close}>Cancel</Button>
          <Button variant="destructive" className="h-11" disabled={mutation.isPending} onClick={submit}>Void document</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
