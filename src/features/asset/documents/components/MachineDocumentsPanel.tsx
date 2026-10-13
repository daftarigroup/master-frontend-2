import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ChevronDown, FileX, History, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { CATEGORY_LABEL, CATEGORY_ORDER } from '../lib/docUi';
import { useMachineDocuments } from '../server/useDocumentQueries';
import type { DocCategory, DocRow } from '../types';
import { DocumentCard, DocumentTableRow } from './DocumentRow';
import { DocumentDetailDrawer } from './DocumentDetailDrawer';
import { ExpiryBanners } from './ExpiryBanners';
import { GalleryDialog } from './GalleryDialog';
import { UploadDocumentSheet, type UploadTarget } from './UploadDocumentSheet';
import { VoidDocumentDialog } from './VoidDocumentDialog';

type Tab = 'all' | 'expiring' | 'expired';

/** Category first (compliance, operator, ...), most urgent first inside it. */
function byCategoryThenUrgency(a: DocRow, b: DocRow): number {
  return CATEGORY_ORDER.indexOf(a.type.category) - CATEGORY_ORDER.indexOf(b.type.category);
}

interface Props {
  machineId: string;
  /** `page`: the Equipment Documents screen (sticky Upload on a phone). `embedded`: a tab inside another screen. */
  variant?: 'page' | 'embedded';
  /** open the Upload sheet as soon as the machine has loaded (the register's Upload Document button), optionally on a type */
  autoUpload?: boolean;
  presetType?: string;
}

/**
 * THE documents component: Equipment Documents, the Maintenance Records Documents tab and the Asset Detail card all render this.
 * One query, one list; phone shows cards (the mockup), desktop shows the same rows as a table. Layout switches by CSS breakpoint.
 */
export function MachineDocumentsPanel({ machineId, variant = 'page', autoUpload, presetType }: Props) {
  const q = useMachineDocuments(machineId);
  const [tab, setTab] = useState<Tab>('all');
  const [history, setHistory] = useState(false);
  const [upload, setUpload] = useState<UploadTarget | null>(null);
  const [detail, setDetail] = useState<DocRow | null>(null);
  const [gallery, setGallery] = useState<DocRow | null>(null);
  const [voiding, setVoiding] = useState<DocRow | null>(null);
  const [closed, setClosed] = useState<Set<DocCategory>>(new Set());
  const open = (target: { mode: 'add'; typeCode?: string } | { mode: 'renew' | 'edit' | 'replace' | 'addFiles'; doc: DocRow }) => setUpload({ ...target, key: Date.now() });

  const data = q.data;
  const autoOpened = useRef(false);
  useEffect(() => {
    if (autoUpload && data?.canUpload && !data.readOnly && !autoOpened.current) {
      autoOpened.current = true;
      setUpload({ mode: 'add', typeCode: presetType, key: Date.now() });
    }
  }, [autoUpload, presetType, data]);
  const rows = useMemo(() => {
    const docs = data?.documents ?? [];
    const filtered = tab === 'expiring' ? docs.filter((d) => d.status === 'EXPIRING_SOON') : tab === 'expired' ? docs.filter((d) => d.status === 'EXPIRED') : docs;
    return [...filtered].sort(byCategoryThenUrgency);
  }, [data, tab]);

  if (q.isLoading) return <div className="space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>;
  if (q.isError || !data) {
    return (
      <div role="alert" className="flex items-center gap-2 rounded-xl border p-4 text-sm"><AlertCircle className="size-4 text-destructive" aria-hidden /><span className="flex-1">Could not load documents.</span><Button size="sm" onClick={() => q.refetch()}>Retry</Button></div>
    );
  }

  const actions = {
    onOpen: setDetail,
    onGallery: setGallery,
    onRenew: (d: DocRow) => open({ mode: 'renew', doc: d }),
    onEdit: (d: DocRow) => open({ mode: 'edit', doc: d }),
    onReplace: (d: DocRow) => open({ mode: 'replace', doc: d }),
    onAddFiles: (d: DocRow) => open({ mode: 'addFiles', doc: d }),
    onVoid: setVoiding,
  };
  const tabs: Array<{ id: Tab; label: string; count?: number; tone: string }> = [
    { id: 'all', label: 'All Documents', tone: '' },
    { id: 'expiring', label: 'Expiring Soon', count: data.tabs.expiringSoon, tone: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' },
    { id: 'expired', label: 'Expired', count: data.tabs.expired, tone: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300' },
  ];
  const empty = tab === 'all' ? 'No documents yet.' : tab === 'expiring' ? 'Nothing is expiring soon.' : 'Nothing has expired.';
  const grouped = CATEGORY_ORDER.map((c) => ({ category: c, items: rows.filter((r) => r.type.category === c) })).filter((g) => g.items.length > 0);
  const upButton = (cls: string) => data.canUpload && !data.readOnly && (
    <Button className={cls} onClick={() => open({ mode: 'add' })}><Plus className="size-4" /> Upload Document</Button>
  );

  return (
    <div className="space-y-3">
      {data.readOnly && <p className="rounded-lg border bg-muted p-2.5 text-xs text-muted-foreground">This machine is disposed, inactive or released, so its documents are read-only and raise no alerts.</p>}
      <ExpiryBanners banners={data.banners} onViewExpiring={() => setTab('expiring')} onViewExpired={() => setTab('expired')} />
      {data.agreementEndsBeforeHire && <p role="status" className="rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">Agreement ends before hire end</p>}

      <div className="flex items-end gap-2 border-b">
        <div role="tablist" aria-label="Document filters" className="flex min-w-0 flex-1 gap-4 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={cn('-mb-px flex min-h-11 shrink-0 items-center gap-1.5 border-b-2 px-0.5 text-sm font-medium', tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
              {t.label}
              {t.count !== undefined && t.count > 0 && <span className={cn('rounded-full px-1.5 text-[11px] font-bold leading-5', t.tone)}>{t.count}</span>}
            </button>
          ))}
        </div>
        <div className="hidden pb-1.5 lg:block">{upButton('h-9')}</div>
      </div>

      {rows.length === 0 ? (
        <div className="grid place-items-center gap-2 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground"><FileX className="size-8" aria-hidden />{empty}</div>
      ) : (
        <>
          {/* phone: cards, as in the mockup */}
          <ul className="space-y-2.5 lg:hidden" aria-label="Documents">
            {rows.map((d) => <DocumentCard key={d.id} doc={d} {...actions} />)}
          </ul>
          {/* desktop: the same rows as a table, grouped by category */}
          <div className="hidden overflow-x-auto rounded-xl border lg:block">
            <table className="w-full min-w-[40rem] text-left">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Type</th><th className="px-3 py-2 font-medium">Title / file</th>
                  <th className="hidden px-3 py-2 font-medium xl:table-cell">Doc no.</th><th className="hidden px-3 py-2 font-medium xl:table-cell">Issuer</th>
                  <th className="px-3 py-2 font-medium">Valid till</th><th className="px-3 py-2 font-medium">Status</th>
                  <th className="hidden px-3 py-2 font-medium lg:table-cell">Uploaded</th><th className="hidden px-3 py-2 font-medium 2xl:table-cell">Work order</th>
                  <th className="w-12 px-1 py-2"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              {grouped.map((g) => (
                <tbody key={g.category}>
                  <tr className="border-t bg-muted/30">
                    <td colSpan={9} className="p-0">
                      <button type="button" aria-expanded={!closed.has(g.category)} onClick={() => setClosed((s) => { const n = new Set(s); if (n.has(g.category)) n.delete(g.category); else n.add(g.category); return n; })} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <ChevronDown className={cn('size-3.5 transition-transform', closed.has(g.category) && '-rotate-90')} aria-hidden />{CATEGORY_LABEL[g.category]} <span className="font-normal">({g.items.length})</span>
                      </button>
                    </td>
                  </tr>
                  {!closed.has(g.category) && g.items.map((d) => <DocumentTableRow key={d.id} doc={d} {...actions} />)}
                </tbody>
              ))}
            </table>
          </div>
        </>
      )}

      {data.history.length > 0 && (
        <div>
          <Button variant="ghost" size="sm" className="h-11 gap-1.5 lg:h-9" aria-expanded={history} onClick={() => setHistory((h) => !h)}><History className="size-4" /> {history ? 'Hide' : 'Show'} previous versions ({data.history.length})</Button>
          {history && (
            <ul className="mt-2 space-y-2.5 opacity-80">
              {data.history.map((d) => <DocumentCard key={d.id} doc={d} {...actions} onRenew={() => undefined} />)}
            </ul>
          )}
        </div>
      )}

      {variant === 'page' && data.canUpload && !data.readOnly && (
        <div className="sticky bottom-0 z-10 -mx-3 border-t bg-background/95 p-3 backdrop-blur sm:-mx-4 lg:hidden">{upButton('h-12 w-full text-base')}</div>
      )}
      {variant === 'embedded' && <div className="lg:hidden">{upButton('h-12 w-full')}</div>}

      <UploadDocumentSheet target={upload} machine={data.machine} onClose={() => setUpload(null)} />
      <DocumentDetailDrawer doc={detail} onClose={() => setDetail(null)} onRenew={(d) => { setDetail(null); actions.onRenew(d); }} onEdit={(d) => { setDetail(null); actions.onEdit(d); }} onVoid={(d) => { setDetail(null); setVoiding(d); }} />
      <GalleryDialog doc={gallery} onClose={() => setGallery(null)} />
      <VoidDocumentDialog doc={voiding} onClose={() => setVoiding(null)} />
    </div>
  );
}

export default MachineDocumentsPanel;
