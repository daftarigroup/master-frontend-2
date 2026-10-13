import { useState } from 'react';
import { AlertCircle, ExternalLink, FileText, Plus, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { longDay } from '../lib/due';
import { DOC_TYPE_LABEL } from '../lib/labels';
import { useRecordDocuments } from '../server/useRecordQueries';
import type { DocRow } from '../types';
import { AddDocumentDialog, VoidDocumentDialog } from './DocumentDialogs';

export function ExpiryBadge({ doc }: { doc: DocRow }) {
  if (doc.expired) return <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-950/60 dark:text-red-300">Expired</span>;
  if (doc.expiringSoon) return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">Expiring soon</span>;
  return null;
}

function DocItem({ doc, onVoid }: { doc: DocRow; onVoid?: (d: DocRow) => void }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <FileText className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold"><span className="truncate">{doc.title}</span><ExpiryBadge doc={doc} /></p>
        <p className="text-xs text-muted-foreground">
          {DOC_TYPE_LABEL[doc.type]}{doc.issuedAt ? ` · issued ${longDay(doc.issuedAt)}` : ''}{doc.expiresAt ? ` · expires ${longDay(doc.expiresAt)}` : ''}
        </p>
      </div>
      <a href={doc.url} target="_blank" rel="noreferrer" aria-label={`Open ${doc.title}`} className="grid size-11 shrink-0 place-items-center rounded-md text-primary hover:bg-muted"><ExternalLink className="size-4" /></a>
      {onVoid && <Button variant="ghost" size="icon" className="size-11 shrink-0" aria-label={`Void ${doc.title}`} onClick={() => onVoid(doc)}><Ban className="size-4" /></Button>}
    </li>
  );
}

function State({ q, empty }: { q: ReturnType<typeof useRecordDocuments>; empty: string }) {
  if (q.isLoading) return <Skeleton className="h-24 w-full" />;
  if (q.isError) {
    return (
      <div role="alert" className="flex items-center gap-2 text-sm"><AlertCircle className="size-4" aria-hidden /><span className="flex-1">Could not load documents.</span><Button size="sm" onClick={() => q.refetch()}>Retry</Button></div>
    );
  }
  return (q.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : null;
}

export function DocumentsTab({ machineId }: { machineId: string }) {
  const q = useRecordDocuments(machineId);
  const [adding, setAdding] = useState(false);
  const [voiding, setVoiding] = useState<DocRow | null>(null);
  const docs = q.data ?? [];
  return (
    <section className="rounded-xl border bg-card p-4" aria-label="Documents">
      <div className="mb-2 flex items-center gap-2">
        <h2 className="flex-1 text-sm font-semibold">Documents</h2>
        <Button size="sm" className="h-11 lg:h-9" onClick={() => setAdding(true)}><Plus className="size-4" /> Add</Button>
      </div>
      <State q={q} empty="No documents yet." />
      {docs.length > 0 && <ul className="divide-y">{docs.map((d) => <DocItem key={d.id} doc={d} onVoid={setVoiding} />)}</ul>}
      <AddDocumentDialog open={adding} onOpenChange={setAdding} machineId={machineId} />
      <VoidDocumentDialog doc={voiding} onClose={() => setVoiding(null)} />
    </section>
  );
}

/** Desktop side column: the first five documents and a link to the full list. */
export function QuickDocuments({ machineId, onSeeAll }: { machineId: string; onSeeAll: () => void }) {
  const q = useRecordDocuments(machineId);
  const docs = q.data ?? [];
  return (
    <section className="rounded-xl border bg-card p-4" aria-label="Documents quick list">
      <div className="mb-1 flex items-center gap-2">
        <h2 className="flex-1 text-sm font-semibold">Documents</h2>
        {docs.length > 5 && <Button variant="link" size="sm" className="h-8 px-0" onClick={onSeeAll}>See all ({docs.length})</Button>}
      </div>
      <State q={q} empty="No documents yet." />
      {docs.length > 0 && <ul className="divide-y">{docs.slice(0, 5).map((d) => <DocItem key={d.id} doc={d} />)}</ul>}
      {docs.length > 0 && docs.length <= 5 && <Button variant="link" size="sm" className="h-8 px-0" onClick={onSeeAll}>Manage documents</Button>}
    </section>
  );
}
