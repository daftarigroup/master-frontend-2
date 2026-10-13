import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, ChevronDown, FileUp, Loader2, RotateCw, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { useUsersList } from '@/features/asset/asset/server/tanstackQuery/useAssetQueries';
import { useCostAccess } from '@/features/asset/equipment/lib/useCostAccess';
import { apiErrorMessage, istToday } from '@/features/asset/fleet/lib/format';
import { useIsDesktop } from '@/features/asset/cost/lib/useIsDesktop';
import { useWorkOrderList } from '@/features/maintenancepro/work_orders/server/tanstackQuery/useWorkOrderActions';
import { cn } from '@/lib/utils';
import { CATEGORY_LABEL, CATEGORY_ORDER, fmtBytes } from '../lib/docUi';
import { ACCEPT, MAX_MB, useDocumentUpload } from '../lib/useDocumentUpload';
import { useChangeDocumentFiles, useCreateDocument, useDocumentTypes, useUpdateDocument } from '../server/useDocumentQueries';
import type { DocRow, DocTypeOption, MachineDocs } from '../types';

export type UploadTarget =
  | { key: number; mode: 'add'; typeCode?: string }
  | { key: number; mode: 'renew'; doc: DocRow }
  | { key: number; mode: 'edit'; doc: DocRow }
  | { key: number; mode: 'replace'; doc: DocRow }
  | { key: number; mode: 'addFiles'; doc: DocRow };

interface Props {
  target: UploadTarget | null;
  machine: MachineDocs['machine'];
  onClose: () => void;
}

const TITLES = { add: 'Upload Document', renew: 'Renew Document', edit: 'Edit details', replace: 'Replace file', addFiles: 'Add photos' } as const;

/** Bottom sheet on a phone, side drawer on desktop. Three taps to upload: type, photo or file, save. The rest is under More details. */
export function UploadDocumentSheet({ target, machine, onClose }: Props) {
  const desktop = useIsDesktop();
  return (
    <Sheet open={!!target} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side={desktop ? 'right' : 'bottom'} className={cn('flex flex-col gap-0 p-0', desktop ? 'w-full sm:max-w-lg' : 'max-h-[94dvh] rounded-t-2xl')}>
        {target && <Form key={target.key} target={target} machine={machine} onClose={onClose} />}
      </SheetContent>
    </Sheet>
  );
}

function Form({ target, machine, onClose }: { target: UploadTarget; machine: MachineDocs['machine']; onClose: () => void }) {
  const mode = target.mode;
  const doc = mode === 'add' ? null : target.doc;
  const typesQ = useDocumentTypes(machine.id);
  const types = useMemo(() => typesQ.data ?? [], [typesQ.data]);
  const create = useCreateDocument();
  const update = useUpdateDocument();
  const changeFiles = useChangeDocumentFiles();
  const uploader = useDocumentUpload();
  const canViewCost = useCostAccess();
  const users = useUsersList();
  const requestId = useRef(crypto.randomUUID());
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [typeId, setTypeId] = useState<string>(doc?.type.id ?? '');
  const [title, setTitle] = useState(mode === 'renew' ? '' : (doc?.title ?? ''));
  const [titleTouched, setTitleTouched] = useState(mode === 'edit');
  const [issuedAt, setIssuedAt] = useState(mode === 'edit' ? (doc?.issuedAt ?? '') : istToday());
  const [validTill, setValidTill] = useState(mode === 'edit' ? (doc?.validTill ?? '') : '');
  const [validFrom, setValidFrom] = useState(mode === 'edit' ? (doc?.validFrom ?? '') : '');
  const [number, setNumber] = useState(mode === 'edit' ? (doc?.documentNumber ?? '') : '');
  const [issuer, setIssuer] = useState(mode === 'edit' ? (doc?.issuer ?? '') : '');
  const [amount, setAmount] = useState(mode === 'edit' && doc?.amount != null ? String(doc.amount) : '');
  const [remarks, setRemarks] = useState(mode === 'edit' ? (doc?.remarks ?? '') : '');
  const [workOrderId, setWorkOrderId] = useState('');
  const [operatorId, setOperatorId] = useState('');
  const [more, setMore] = useState(mode === 'edit');
  const [error, setError] = useState('');

  const type: DocTypeOption | undefined = types.find((t) => t.id === typeId);
  const typeLike = type ?? doc?.type;
  const woQ = useWorkOrderList({ machineId: machine.id, limit: 30 });

  // a preset type (Renew, or the Upload button on a missing type)
  useEffect(() => {
    if (mode !== 'add' || typeId || types.length === 0 || !('typeCode' in target) || !target.typeCode) return;
    const t = types.find((x) => x.code === target.typeCode);
    if (t) setTypeId(t.id);
  }, [mode, typeId, types, target]);

  // Title comes from the type until the person types their own
  useEffect(() => {
    if (!titleTouched && type) setTitle(type.name);
  }, [type, titleTouched]);

  const grouped = useMemo(() => CATEGORY_ORDER.map((c) => ({ category: c, items: types.filter((t) => t.category === c) })).filter((g) => g.items.length > 0), [types]);
  const needsFiles = mode === 'add' || mode === 'renew' || mode === 'replace' || mode === 'addFiles';
  const needsDetails = mode === 'add' || mode === 'renew' || mode === 'edit';
  const multi = mode === 'addFiles' || (typeLike?.allowMultipleFiles ?? false);
  const personal = Boolean(typeLike?.personal);
  const showValidity = needsDetails && typeLike && typeLike.hasValidity !== 'NONE';
  const showAmount = needsDetails && canViewCost && typeLike?.costSensitive;

  const pick = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    void uploader.addFiles([...files], { single: !multi, max: multi ? 20 : 1 });
  };

  const busy = uploader.busy || create.isPending || update.isPending || changeFiles.isPending;

  const submit = async () => {
    setError('');
    try {
      if (mode === 'edit' && doc) {
        if (doc.type.hasValidity === 'REQUIRED' && !validTill) throw new Error(`${doc.type.name} needs a Valid Till date`);
        await update.mutateAsync({
          id: doc.id,
          body: {
            title: title.trim() || undefined, documentNumber: number.trim() || null, issuer: issuer.trim() || null, issuedAt: issuedAt || null,
            validFrom: validFrom || null, validTill: doc.type.hasValidity === 'NONE' ? undefined : (validTill || null), remarks: remarks.trim() || null,
            ...(showAmount ? { amount: amount === '' ? null : Number(amount) } : {}),
          },
        });
        toast.success('Details saved');
        return onClose();
      }
      if (mode === 'replace' || mode === 'addFiles') {
        if (!doc) return;
        const files = await uploader.upload({ machineId: machine.id, documentTypeId: doc.type.id });
        await changeFiles.mutateAsync({ id: doc.id, mode: mode === 'addFiles' ? 'add' : 'replace', files });
        toast.success(mode === 'addFiles' ? 'Photos added' : 'File replaced');
        return onClose();
      }
      if (!type) throw new Error('Choose the document type');
      if (type.hasValidity === 'REQUIRED' && !validTill) throw new Error(`${type.name} needs a Valid Till date`);
      if (validFrom && validTill && validTill < validFrom) throw new Error('Valid Till is before the start date');
      if (type.personal && !operatorId) throw new Error('Choose the operator this licence belongs to');
      if (uploader.items.length === 0) throw new Error('Add a photo or file');
      if (!machine.firmId && type.personal) throw new Error('This machine has no firm yet');
      const files = await uploader.upload({ ...(type.personal ? { ownerUserId: operatorId, firmId: machine.firmId ?? undefined } : { machineId: machine.id }), documentTypeId: type.id });
      await create.mutateAsync({
        clientRequestId: requestId.current,
        ...(type.personal ? { ownerUserId: operatorId, firmId: machine.firmId ?? undefined } : { machineId: machine.id }),
        documentTypeId: type.id,
        title: title.trim() || undefined,
        issuedAt: issuedAt || undefined,
        validFrom: validFrom || undefined,
        validTill: type.hasValidity === 'NONE' ? undefined : validTill || undefined,
        documentNumber: number.trim() || undefined,
        issuer: issuer.trim() || undefined,
        remarks: remarks.trim() || undefined,
        workOrderId: workOrderId || undefined,
        renewsDocumentId: mode === 'renew' ? doc?.id : undefined,
        ...(showAmount && amount !== '' ? { amount: Number(amount) } : {}),
        files,
      });
      toast.success(mode === 'renew' ? 'Document renewed' : 'Document added');
      onClose();
    } catch (e) {
      setError(e instanceof Error && !('response' in e) ? e.message : apiErrorMessage(e, 'Could not save the document'));
    }
  };

  const workOrders = (woQ.data?.data ?? []) as Array<{ id: string; workOrderCode?: string | null; title?: string | null }>;

  return (
    <>
      <SheetHeader className="border-b p-4 text-left">
        <SheetTitle>{TITLES[mode]}</SheetTitle>
        <SheetDescription className="truncate">
          {machine.name} · {machine.assetCode}
          {doc && mode !== 'add' ? ` · ${doc.title}` : ''}
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {mode === 'renew' && doc && (
          <p className="rounded-lg bg-muted p-2.5 text-xs text-muted-foreground">
            Renewing <b>{doc.title}</b>{doc.validTill ? ` (valid till ${doc.validTill})` : ''}. The old one moves to previous versions once the new one is saved.
          </p>
        )}

        {mode === 'add' && (
          <div className="space-y-1.5">
            <Label>Document Type <span className="text-destructive">*</span></Label>
            <Select value={typeId} onValueChange={(v) => { setTypeId(v); setTitleTouched(false); }}>
              <SelectTrigger className="h-11 w-full" aria-label="Document type"><SelectValue placeholder={typesQ.isLoading ? 'Loading…' : 'Choose a type'} /></SelectTrigger>
              <SelectContent>
                {grouped.map((g) => (
                  <SelectGroup key={g.category}>
                    <SelectLabel>{CATEGORY_LABEL[g.category]}</SelectLabel>
                    {g.items.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {personal && mode === 'add' && (
          <div className="space-y-1.5">
            <Label>Operator <span className="text-destructive">*</span></Label>
            <Select value={operatorId} onValueChange={setOperatorId}>
              <SelectTrigger className="h-11 w-full" aria-label="Operator"><SelectValue placeholder="Choose the operator" /></SelectTrigger>
              <SelectContent>{(users.data ?? []).map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}

        {needsFiles && (
          <div className="space-y-2">
            <Label>{multi ? 'Photos / files' : 'File'} <span className="text-destructive">*</span></Label>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" className="h-12" onClick={() => cameraRef.current?.click()}><Camera className="size-4" /> Take photo</Button>
              <Button type="button" variant="outline" className="h-12" onClick={() => fileRef.current?.click()}><FileUp className="size-4" /> Choose file</Button>
            </div>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-label="Take a photo" onChange={(e) => { pick(e.target.files); e.target.value = ''; }} />
            <input ref={fileRef} type="file" accept={ACCEPT} multiple={multi} className="sr-only" tabIndex={-1} aria-label="Choose a file" onChange={(e) => { pick(e.target.files); e.target.value = ''; }} />
            <p className="text-xs text-muted-foreground">PDF, photo, Word or Excel, up to {MAX_MB} MB each{multi ? ', up to 20 files' : ''}. Photos are reduced automatically.</p>
            {uploader.items.length > 0 && (
              <ul className="space-y-2" aria-label="Files to upload">
                {uploader.items.map((i) => (
                  <li key={i.id} className="flex items-center gap-2 rounded-lg border p-2">
                    {i.preview ? <img src={i.preview} alt="" className="size-10 rounded object-cover" /> : <span className="grid size-10 place-items-center rounded bg-muted text-[10px] font-bold uppercase text-muted-foreground">{i.file.name.split('.').pop()?.slice(0, 4)}</span>}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{i.file.name}</p>
                      {i.status === 'error' ? <p className="text-xs text-destructive">{i.error}</p> : i.status === 'uploading' ? <Progress value={i.progress} className="mt-1 h-1.5" /> : <p className="text-xs text-muted-foreground">{i.status === 'done' ? 'Uploaded' : fmtBytes(i.file.size)}</p>}
                    </div>
                    {i.status === 'error' && !i.invalid && (
                      <Button type="button" variant="ghost" size="icon" className="size-11" aria-label={`Retry ${i.file.name}`} onClick={() => void submit()}><RotateCw className="size-4" /></Button>
                    )}
                    <Button type="button" variant="ghost" size="icon" className="size-11" aria-label={`Remove ${i.file.name}`} disabled={i.status === 'uploading'} onClick={() => uploader.remove(i.id)}><X className="size-4" /></Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {showValidity && (
          <div className="space-y-1.5">
            <Label htmlFor="doc-valid-till">Valid Till {typeLike?.hasValidity === 'REQUIRED' && <span className="text-destructive">*</span>}</Label>
            <Input id="doc-valid-till" type="date" className="h-11" value={validTill} onChange={(e) => setValidTill(e.target.value)} />
          </div>
        )}

        {needsDetails && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="doc-title">Title</Label>
              <Input id="doc-title" className="h-11" value={title} maxLength={200} onChange={(e) => { setTitle(e.target.value); setTitleTouched(true); }} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc-issued">Issued on</Label>
              <Input id="doc-issued" type="date" className="h-11" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} />
            </div>
          </div>
        )}

        {needsDetails && (
          <div className="rounded-xl border">
            <button type="button" aria-expanded={more} onClick={() => setMore((m) => !m)} className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm font-medium">
              <span className="flex-1">More details</span>
              <ChevronDown className={cn('size-4 transition-transform', more && 'rotate-180')} aria-hidden />
            </button>
            {more && (
              <div className="grid grid-cols-1 gap-3 border-t p-3 sm:grid-cols-2">
                <div className="space-y-1.5"><Label htmlFor="doc-number">Document number</Label><Input id="doc-number" className="h-11" value={number} maxLength={100} onChange={(e) => setNumber(e.target.value)} placeholder="Policy, RC, agreement no." /></div>
                <div className="space-y-1.5"><Label htmlFor="doc-issuer">Issuer / vendor</Label><Input id="doc-issuer" className="h-11" value={issuer} maxLength={150} onChange={(e) => setIssuer(e.target.value)} /></div>
                <div className="space-y-1.5"><Label htmlFor="doc-from">Start date</Label><Input id="doc-from" type="date" className="h-11" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} /></div>
                {showAmount && (
                  <div className="space-y-1.5"><Label htmlFor="doc-amount">Amount (₹)</Label><Input id="doc-amount" type="number" inputMode="decimal" min="0" className="h-11" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
                )}
                {mode !== 'edit' && workOrders.length > 0 && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Linked work order</Label>
                    <Select value={workOrderId || '__none__'} onValueChange={(v) => setWorkOrderId(v === '__none__' ? '' : v)}>
                      <SelectTrigger className="h-11 w-full" aria-label="Linked work order"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {workOrders.map((w) => <SelectItem key={w.id} value={w.id}>{w.workOrderCode ?? w.id}{w.title ? ` · ${w.title}` : ''}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="doc-remarks">Remarks</Label><Textarea id="doc-remarks" rows={2} maxLength={500} value={remarks} onChange={(e) => setRemarks(e.target.value)} /></div>
              </div>
            )}
          </div>
        )}

        {error && <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-2.5 text-sm text-destructive">{error}</p>}
      </div>

      <div className="flex gap-2 border-t bg-background p-3">
        <Button variant="outline" className="h-12 flex-1" onClick={onClose}>Cancel</Button>
        <Button className="h-12 flex-[2]" disabled={busy} onClick={() => void submit()}>
          {busy && <Loader2 className="size-4 animate-spin" />}
          {uploader.busy ? 'Uploading…' : busy ? 'Saving…' : mode === 'edit' ? 'Save' : mode === 'renew' ? 'Save renewal' : mode === 'add' ? 'Save' : 'Save files'}
        </Button>
      </div>
    </>
  );
}
