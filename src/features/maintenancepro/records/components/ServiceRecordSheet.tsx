import { ExternalLink, Phone } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { formatINR } from '@/features/asset/equipment/lib/money';
import type { ReadingUnit } from '@/features/asset/equipment/types';
import { fmtDateTime } from '@/features/asset/fleet/lib/format';
import { readingText } from '../lib/due';
import { openDocFile } from '@/features/asset/documents/lib/openDocFile';
import { useMachineDocuments } from '@/features/asset/documents/server/useDocumentQueries';
import { useRecordParts } from '../server/useRecordQueries';
import type { HistoryRow } from '../types';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right font-medium">{children}</dd>
    </div>
  );
}

/** The service record behind one history row: vendor, bill, parts and documents of that work order. */
export function ServiceRecordSheet({ row, machineId, unit, onClose }: { row: HistoryRow | null; machineId: string; unit: ReadingUnit; onClose: () => void }) {
  const parts = useRecordParts(machineId, !!row);
  const docs = useMachineDocuments(row ? machineId : undefined);
  const myParts = (parts.data ?? []).filter((p) => p.workOrder.id === row?.id);
  const myDocs = [...(docs.data?.documents ?? []), ...(docs.data?.history ?? [])].filter((d) => d.workOrder?.id === row?.id);
  const hasCost = row ? row.cost !== undefined : false;
  return (
    <Sheet open={!!row} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{row?.code ?? 'Service record'}</SheetTitle>
          <SheetDescription>{row?.title}</SheetDescription>
        </SheetHeader>
        {row && (
          <div className="space-y-4 px-4 pb-6">
            <dl className="divide-y">
              <Row label="Completed">{fmtDateTime(row.completedAt)}</Row>
              <Row label="Reading at service">{readingText(row.readingAtService, unit)}</Row>
              <Row label="Mechanic">{row.mechanic ?? '—'}</Row>
              <Row label="Mode">{row.serviceMode === 'VENDOR' ? 'Vendor' : 'In-house'}</Row>
              {row.vendor && (
                <Row label="Vendor">
                  {row.vendor.name}
                  {row.vendor.phone && <a href={`tel:${row.vendor.phone}`} className="mt-0.5 flex items-center justify-end gap-1 text-xs text-primary"><Phone className="size-3" aria-hidden />{row.vendor.phone}</a>}
                </Row>
              )}
              <Row label="Bill no">
                {row.billNo ?? '—'}
                              </Row>
              {hasCost && <Row label="Parts cost">{formatINR(row.actualPartsCost ?? row.estPartsCost)}</Row>}
              {hasCost && <Row label="Labour cost">{formatINR(row.actualLabourCost ?? row.estLabourCost)}</Row>}
              {hasCost && <Row label="Total cost">{formatINR(row.cost)}</Row>}
            </dl>
            <section aria-label="Parts used">
              <h3 className="mb-1 text-sm font-semibold">Parts used</h3>
              {myParts.length === 0 ? <p className="text-sm text-muted-foreground">{parts.isLoading ? 'Loading…' : 'No parts recorded.'}</p> : (
                <ul className="divide-y text-sm">{myParts.map((p) => <li key={p.id} className="flex justify-between gap-2 py-1.5"><span>{p.partName}</span><span className="tabular-nums text-muted-foreground">× {p.quantity}</span></li>)}</ul>
              )}
            </section>
            <section aria-label="Documents">
              <h3 className="mb-1 text-sm font-semibold">Documents</h3>
              {myDocs.length === 0 ? <p className="text-sm text-muted-foreground">{docs.isLoading ? 'Loading…' : 'No documents attached.'}</p> : (
                <ul className="divide-y text-sm">{myDocs.map((d) => <li key={d.id} className="py-1.5"><button type="button" disabled={!d.files[0]} onClick={() => d.files[0] && void openDocFile(d.files[0].id)} className="flex items-center gap-1 text-left text-primary">{d.title} <ExternalLink className="size-3" aria-hidden /></button></li>)}</ul>
              )}
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
