import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { apiErrorMessage } from '@/features/asset/fleet/lib/format';
import { useImageUpload } from '@/hooks/useImageUpload';
import { DOC_TYPES, DOC_TYPE_LABEL } from '../lib/labels';
import { useAddDocument, useVoidDocument } from '../server/useRecordQueries';
import type { DocRow, DocType } from '../types';

const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

function AddForm({ machineId, onDone }: { machineId: string; onDone: () => void }) {
  const add = useAddDocument();
  const { uploadImage, isUploading } = useImageUpload({ bucket: 'mis-docs', pathPrefix: 'maintenance/machines/documents', maxSizeMB: 20, allowedTypes: ALLOWED });
  const [type, setType] = useState<DocType>('OTHER');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [issuedAt, setIssuedAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    if (!title.trim()) return setError('Give the document a title');
    if (!file) return setError('Choose a file to upload');
    if (issuedAt && expiresAt && expiresAt < issuedAt) return setError('The expiry date is before the issue date');
    setError('');
    try {
      const up = await uploadImage(file);
      await add.mutateAsync({ machineId, type, title: title.trim(), url: up.url, issuedAt: issuedAt || null, expiresAt: expiresAt || null });
      toast.success('Document added');
      onDone();
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not add the document'));
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Type</Label>
        <Select value={type} onValueChange={(v) => setType(v as DocType)}>
          <SelectTrigger className="h-11" aria-label="Document type"><SelectValue /></SelectTrigger>
          <SelectContent>{DOC_TYPES.map((t) => <SelectItem key={t} value={t}>{DOC_TYPE_LABEL[t]}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="doc-title">Title</Label>
        <Input id="doc-title" className="h-11" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="doc-file">File</Label>
        <Input id="doc-file" type="file" className="h-11" accept={ALLOWED.join(',')} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label htmlFor="doc-iss">Issued</Label><Input id="doc-iss" type="date" className="h-11" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="doc-exp">Expires</Label><Input id="doc-exp" type="date" className="h-11" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} /></div>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <DialogFooter>
        <Button variant="outline" className="h-11" onClick={onDone}>Cancel</Button>
        <Button className="h-11" disabled={isUploading || add.isPending} onClick={submit}>{isUploading ? 'Uploading…' : add.isPending ? 'Saving…' : 'Add document'}</Button>
      </DialogFooter>
    </div>
  );
}

export function AddDocumentDialog({ open, onOpenChange, machineId }: { open: boolean; onOpenChange: (o: boolean) => void; machineId: string }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader><DialogTitle>Add document</DialogTitle><DialogDescription>Upload a file and record its dates.</DialogDescription></DialogHeader>
        {open && <AddForm machineId={machineId} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

export function VoidDocumentDialog({ doc, onClose }: { doc: DocRow | null; onClose: () => void }) {
  const mutation = useVoidDocument();
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const submit = async () => {
    if (!doc) return;
    if (reason.trim().length < 3) return setError('Give a reason (at least 3 characters)');
    try {
      await mutation.mutateAsync({ id: doc.id, reason: reason.trim() });
      toast.success('Document voided');
      setReason(''); setError('');
      onClose();
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not void the document'));
    }
  };
  return (
    <Dialog open={!!doc} onOpenChange={(o) => { if (!o) { setReason(''); setError(''); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Void document</DialogTitle><DialogDescription>{doc?.title}. It stays on record with your reason.</DialogDescription></DialogHeader>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" aria-label="Reason for voiding" rows={3} maxLength={300} />
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" className="h-11" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" className="h-11" disabled={mutation.isPending} onClick={submit}>Void document</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
