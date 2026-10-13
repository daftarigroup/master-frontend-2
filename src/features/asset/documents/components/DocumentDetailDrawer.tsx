import { Ban, Download, Eye, Pencil, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusPill } from '@/features/asset/equipment/components/StatusPill';
import { formatINR } from '@/features/asset/equipment/lib/money';
import { longDay } from '@/features/maintenancepro/records/lib/due';
import { VALID_TILL_COLOUR, fmtBytes, hasValidity, pillStatus } from '../lib/docUi';
import { openDocFile } from '../lib/openDocFile';
import { useDocumentDetail } from '../server/useDocumentQueries';
import type { DocRow } from '../types';
import { cn } from '@/lib/utils';

const EVENT_LABEL: Record<string, string> = { CREATED: 'Added', UPDATED: 'Details changed', FILE_ADDED: 'Files added', FILE_REPLACED: 'File replaced', VOIDED: 'Voided', DOWNLOADED: 'Downloaded' };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words text-sm">{children || '—'}</dd>
    </div>
  );
}

interface Props {
  doc: DocRow | null;
  onClose: () => void;
  onRenew: (d: DocRow) => void;
  onEdit: (d: DocRow) => void;
  onVoid: (d: DocRow) => void;
}

/** Detail drawer: every field, the files, the other versions and (for editors) the audit trail. Text only: names and remarks are never rendered as HTML. */
export function DocumentDetailDrawer({ doc, onClose, onRenew, onEdit, onVoid }: Props) {
  const q = useDocumentDetail(doc?.id);
  const d = q.data?.document ?? doc;
  const pill = d ? pillStatus(d) : null;
  return (
    <Sheet open={!!doc} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b p-4 text-left">
          <SheetTitle className="flex items-center gap-2 pr-6"><span className="truncate">{d?.title}</span>{pill && <StatusPill status={pill} />}</SheetTitle>
          <SheetDescription>{d?.type.name}{d?.machine ? ` · ${d.machine.name}` : d?.ownerUser ? ` · ${d.ownerUser.name ?? 'Operator'}` : ''}</SheetDescription>
        </SheetHeader>
        {d && (
          <div className="flex-1 space-y-5 overflow-y-auto p-4">
            <dl className="grid grid-cols-2 gap-3">
              {hasValidity(d) && <Field label="Valid till"><span className={cn('font-semibold', VALID_TILL_COLOUR[d.status])}>{longDay(d.validTill)}</span>{d.validTill && <span className="block text-xs text-muted-foreground">{d.statusLabel}</span>}</Field>}
              <Field label="Issued on">{longDay(d.issuedAt)}</Field>
              {d.validFrom && <Field label="Start date">{longDay(d.validFrom)}</Field>}
              <Field label="Document no.">{d.documentNumber}</Field>
              <Field label="Issuer / vendor">{d.issuer}</Field>
              {d.amount != null && <Field label="Amount">{formatINR(d.amount)}</Field>}
              <Field label="Uploaded by">{d.uploadedBy?.name}<span className="block text-xs text-muted-foreground">{longDay(d.uploadedAt)}</span></Field>
              {d.workOrder && <Field label="Work order">{d.workOrder.code}</Field>}
              {d.remarks && <div className="col-span-2"><Field label="Remarks">{d.remarks}</Field></div>}
            </dl>

            <section aria-label="Files">
              <h3 className="mb-2 text-sm font-semibold">Files ({d.fileCount})</h3>
              <ul className="space-y-2">
                {d.files.map((f) => (
                  <li key={f.id} className="flex items-center gap-2 rounded-lg border p-2">
                    <div className="min-w-0 flex-1"><p className="truncate text-sm">{f.originalName}</p><p className="text-xs text-muted-foreground">{fmtBytes(f.sizeBytes)}</p></div>
                    <Button variant="ghost" size="icon" className="size-11 lg:size-9" aria-label={`View ${f.originalName}`} onClick={() => void openDocFile(f.id, 'view')}><Eye className="size-4" /></Button>
                    <Button variant="ghost" size="icon" className="size-11 lg:size-9" aria-label={`Download ${f.originalName}`} onClick={() => void openDocFile(f.id, 'download')}><Download className="size-4" /></Button>
                  </li>
                ))}
              </ul>
            </section>

            {q.isLoading && <Skeleton className="h-20 w-full" />}
            {q.data && q.data.versions.length > 1 && (
              <section aria-label="Versions">
                <h3 className="mb-2 text-sm font-semibold">Versions</h3>
                <ul className="divide-y rounded-lg border text-sm">
                  {q.data.versions.map((v) => (
                    <li key={v.id} className="flex items-center gap-2 px-3 py-2">
                      <span className="flex-1">{v.validTill ? `Valid till ${longDay(v.validTill)}` : `Uploaded ${longDay(v.uploadedAt)}`}{v.documentNumber ? ` · ${v.documentNumber}` : ''}</span>
                      <span className="text-xs text-muted-foreground">{v.voided ? 'Voided' : v.isCurrent ? 'Current' : 'Previous'}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {q.data && q.data.events.length > 0 && (
              <section aria-label="History">
                <h3 className="mb-2 text-sm font-semibold">History</h3>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  {q.data.events.map((e) => <li key={e.id}><b className="text-foreground">{EVENT_LABEL[e.event] ?? e.event}</b> · {e.actor?.name ?? 'System'} · {longDay(e.at)}</li>)}
                </ul>
              </section>
            )}
            {q.data?.document.voidedAt && <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-2.5 text-sm text-destructive">Voided: {q.data.document.voidReason}</p>}
          </div>
        )}
        {d && (d.canRenew || d.canEdit || d.canVoid) && (
          <div className="flex flex-wrap gap-2 border-t p-3">
            {d.canRenew && <Button variant="outline" className="h-11" onClick={() => onRenew(d)}><RefreshCw className="size-4" /> Renew</Button>}
            {d.canEdit && <Button variant="outline" className="h-11" onClick={() => onEdit(d)}><Pencil className="size-4" /> Edit</Button>}
            {d.canVoid && <Button variant="outline" className="h-11 text-destructive" onClick={() => onVoid(d)}><Ban className="size-4" /> Void</Button>}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
