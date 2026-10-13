import { useMemo, useState } from 'react';
import { AlertCircle, Download, FileSearch, Files, Plus, ShieldAlert, TimerReset, Truck } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { PaginationBar } from '@/components/shared/PaginationBar';
import { KpiTile } from '@/components/shared/KpiTile';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusPill } from '@/features/asset/equipment/components/StatusPill';
import { OwnershipBadge } from '@/features/asset/fleet/components/OwnershipBadge';
import { apiErrorMessage } from '@/features/asset/fleet/lib/format';
import { useProject } from '@/context/ProjectContext';
import { toFirmParam } from '@/features/maintenancepro/shared/lib/common';
import { usePagination } from '@/hooks/usePagination';
import { cn } from '@/lib/utils';
import { DocumentCard, DocumentTableRow } from '../components/DocumentRow';
import { MachinePickerDialog } from '../components/MachinePickerDialog';
import { ColumnPicker, RegisterFilters } from '../components/RegisterFilters';
import { useHiddenColumns } from '../lib/useHiddenColumns';
import { documentsApi } from '../server/documentsApi';
import { useDocumentRegister } from '../server/useDocumentQueries';
import type { DocRow, DocStatus, MachineSummaryRow, RegisterQuery } from '../types';

const KEYS = ['q', 'ownership', 'machineCategory', 'category', 'typeId', 'status', 'withinDays'] as const;
const PILL = { VALID: 'VALID', EXPIRING_SOON: 'EXPIRING_SOON', EXPIRED: 'EXPIRED', NO_EXPIRY: 'NO_EXPIRY' } as const;

/** Rows in the register are read-and-open only: changes (renew, edit, void) happen on the machine's own screen. */
const readOnlyRow = (d: DocRow): DocRow => ({ ...d, canEdit: false, canRenew: false, canVoid: false });

function MachineRows({ items, onOpen }: { items: MachineSummaryRow[]; onOpen: (id: string) => void }) {
  return (
    <>
      <ul className="space-y-2.5 lg:hidden" aria-label="Machines">
        {items.map((m) => (
          <li key={m.machineId}>
            <button type="button" onClick={() => onOpen(m.machineId)} className="flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left shadow-xs hover:border-primary/40">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{m.name}</p>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="font-mono">{m.assetCode}</span><OwnershipBadge value={m.ownershipType} /></p>
                <p className="mt-1 text-xs"><b className="text-emerald-600">{m.valid}</b> valid · <b className="text-amber-600">{m.expiringSoon}</b> expiring · <b className="text-red-600">{m.expired}</b> expired</p>
              </div>
              <StatusPill status={PILL[m.worst]} />
            </button>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto rounded-xl border lg:block">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr><th className="px-3 py-2 font-medium">Machine</th><th className="px-3 py-2 font-medium">Ownership</th><th className="px-3 py-2 text-right font-medium">Valid</th><th className="px-3 py-2 text-right font-medium">Expiring</th><th className="px-3 py-2 text-right font-medium">Expired</th><th className="px-3 py-2 font-medium">Worst status</th><th className="w-20 px-3 py-2" /></tr>
          </thead>
          <tbody>
            {items.map((m) => (
              <tr key={m.machineId} className="cursor-pointer border-t hover:bg-muted/40" onClick={() => onOpen(m.machineId)}>
                <td className="px-3 py-2"><span className="font-medium">{m.name}</span> <span className="font-mono text-xs text-muted-foreground">{m.assetCode}</span></td>
                <td className="px-3 py-2"><OwnershipBadge value={m.ownershipType} /></td>
                <td className="px-3 py-2 text-right tabular-nums">{m.valid}</td>
                <td className="px-3 py-2 text-right tabular-nums">{m.expiringSoon}</td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums text-red-600">{m.expired || ''}</td>
                <td className="px-3 py-2"><StatusPill status={PILL[m.worst]} /></td>
                <td className="px-3 py-2 text-right"><Button asChild variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}><Link to={`/asset/documents/${m.machineId}`}>Open</Link></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/**
 * Documents register for the whole fleet (/asset/documents): tiles that filter, a filter bar, urgency-first list (cards on a phone,
 * a table on desktop) and a By machine view. The tiles are the server's counts of the filtered set without the status filter.
 */
export default function DocumentsRegister() {
  const navigate = useNavigate();
  const { selectedProject } = useProject();
  const firmId = toFirmParam(selectedProject);
  const [params, setParams] = useSearchParams();
  const { page, limit, setPage, setLimit } = usePagination(50);
  const [hidden, toggle] = useHiddenColumns();
  const [picking, setPicking] = useState(false);
  const [exporting, setExporting] = useState(false);

  const view = params.get('view') === 'machines' ? 'machines' : 'documents';
  const query: RegisterQuery = useMemo(() => ({
    firmId,
    q: params.get('q') ?? '', ownership: (params.get('ownership') ?? '') as RegisterQuery['ownership'], machineCategory: params.get('machineCategory') ?? '',
    category: (params.get('category') ?? '') as RegisterQuery['category'], typeId: params.get('typeId') ?? '', status: (params.get('status') ?? '') as RegisterQuery['status'],
    withinDays: params.get('withinDays') ? Number(params.get('withinDays')) : '',
  }), [params, firmId]);
  const activeCount = KEYS.filter((k) => !!params.get(k)).length;

  const patch = (p: Partial<RegisterQuery> & { view?: string }) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(p)) {
        if (v === '' || v === undefined || v === null) next.delete(k);
        else next.set(k, String(v));
      }
      next.delete('page');
      return next;
    });
  const clear = () => setParams((prev) => { const n = new URLSearchParams(); if (prev.get('view')) n.set('view', prev.get('view')!); return n; });

  const q = useDocumentRegister({ ...query, firmId, view, page, limit });
  const data = q.data;
  const stats = data?.stats;
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / limit));
  const setStatus = (s: DocStatus | '', v?: 'documents' | 'machines') => patch({ status: s, view: v ?? view });
  const open = (id: string) => navigate(`/asset/documents/${id}`);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const blob = await documentsApi.exportCsv({ ...query, firmId });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'documents-register.csv';
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not export the register'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-3 px-3 pb-8 pt-3 sm:px-4 lg:space-y-4 lg:pt-5">
      <header className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1"><h1 className="text-lg font-bold leading-tight sm:text-xl">Documents</h1><p className="text-xs text-muted-foreground sm:text-sm">Expiry control for every machine</p></div>
        <Button variant="outline" className="h-11 lg:h-9" disabled={exporting} onClick={() => void exportCsv()}><Download className="size-4" /> <span className="hidden sm:inline">Export</span></Button>
        <Button className="h-11 lg:h-9" onClick={() => setPicking(true)}><Plus className="size-4" /> Upload Document</Button>
      </header>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <KpiTile label="Total documents" value={stats?.total ?? '—'} icon={Files} tone="blue" active={!query.status && view === 'documents'} onClick={() => setStatus('', 'documents')} hideIconOnPhone />
        <KpiTile label="Expiring soon" value={stats?.expiringSoon ?? '—'} icon={TimerReset} tone="amber" active={query.status === 'EXPIRING_SOON'} onClick={() => setStatus('EXPIRING_SOON', 'documents')} hideIconOnPhone />
        <KpiTile label="Expired" value={stats?.expired ?? '—'} icon={ShieldAlert} tone="red" active={query.status === 'EXPIRED' && view === 'documents'} onClick={() => setStatus('EXPIRED', 'documents')} hideIconOnPhone />
        <KpiTile label="Machines with expired" value={stats?.machinesWithExpired ?? '—'} icon={Truck} tone="orange" active={query.status === 'EXPIRED' && view === 'machines'} onClick={() => setStatus('EXPIRED', 'machines')} hideIconOnPhone />
      </div>

      <RegisterFilters query={query} onChange={patch} onClear={clear} activeCount={activeCount} />

      <div className="flex items-center gap-2">
        <div role="tablist" aria-label="View" className="inline-flex rounded-lg border p-0.5">
          {(['documents', 'machines'] as const).map((v) => (
            <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => patch({ view: v })} className={cn('min-h-10 rounded-md px-3 text-sm font-medium lg:min-h-8', view === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>{v === 'documents' ? 'Documents' : 'By machine'}</button>
          ))}
        </div>
        <div className="flex-1" />
        {view === 'documents' && <div className="hidden lg:block"><ColumnPicker hidden={hidden} onToggle={toggle} /></div>}
      </div>

      {q.isLoading ? (
        <div className="space-y-2"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>
      ) : q.isError || !data ? (
        <div role="alert" className="flex items-center gap-2 rounded-xl border p-4 text-sm"><AlertCircle className="size-4 text-destructive" aria-hidden /><span className="flex-1">Could not load the register.</span><Button size="sm" onClick={() => q.refetch()}>Retry</Button></div>
      ) : data.total === 0 ? (
        <div className="grid place-items-center gap-2 rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground"><FileSearch className="size-8" aria-hidden />{activeCount || query.status ? 'No documents match these filters.' : 'No documents yet. Upload the first one.'}</div>
      ) : data.view === 'machines' ? (
        <MachineRows items={data.items} onOpen={open} />
      ) : (
        <>
          <ul className="space-y-2.5 lg:hidden" aria-label="Documents">
            {data.items.map((d) => <DocumentCard key={d.id} doc={readOnlyRow(d)} withMachine onOpen={(x) => x.machine && open(x.machine.id)} onGallery={(x) => x.machine && open(x.machine.id)} onRenew={() => undefined} onEdit={() => undefined} onReplace={() => undefined} onAddFiles={() => undefined} onVoid={() => undefined} />)}
          </ul>
          <div className="hidden overflow-x-auto rounded-xl border lg:block">
            <table className="w-full min-w-[40rem] text-left">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Type</th><th className="px-3 py-2 font-medium">Machine / title / file</th>
                  <th className={cn('px-3 py-2 font-medium', hidden.has('number') ? 'hidden' : 'table-cell')}>Doc no.</th><th className={cn('px-3 py-2 font-medium', hidden.has('issuer') ? 'hidden' : 'table-cell')}>Issuer</th>
                  <th className="px-3 py-2 font-medium">Valid till</th><th className="px-3 py-2 font-medium">Status</th>
                  <th className={cn('px-3 py-2 font-medium', hidden.has('uploaded') ? 'hidden' : 'table-cell')}>Uploaded</th><th className={cn('px-3 py-2 font-medium', hidden.has('workOrder') ? 'hidden' : 'table-cell')}>Work order</th>
                  <th className="w-12 px-1 py-2"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((d) => <DocumentTableRow key={d.id} doc={readOnlyRow(d)} withMachine hide={hidden} onOpen={(x) => x.machine && open(x.machine.id)} onGallery={(x) => x.machine && open(x.machine.id)} onRenew={() => undefined} onEdit={() => undefined} onReplace={() => undefined} onAddFiles={() => undefined} onVoid={() => undefined} />)}
              </tbody>
            </table>
          </div>
        </>
      )}

      {data && data.total > limit && <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} pageSize={limit} onPageSizeChange={setLimit} />}
      <MachinePickerDialog open={picking} onOpenChange={setPicking} onPick={(id) => { setPicking(false); navigate(`/asset/documents/${id}?upload=1`); }} />
    </div>
  );
}
