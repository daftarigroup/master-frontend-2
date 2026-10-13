import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DocumentMachineCard } from '../components/DocumentMachineCard';
import { MachineDocumentsPanel } from '../components/MachineDocumentsPanel';
import { useMachineDocuments } from '../server/useDocumentQueries';

function SummaryRow({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return <div className="flex items-center justify-between py-1.5 text-sm"><span className="text-muted-foreground">{label}</span><span className={tone ?? 'font-semibold'}>{value}</span></div>;
}

/**
 * Equipment Documents for one machine (/asset/documents/:machineId). Phone: the mockup order (machine card, tabs, rows, banners, sticky Upload).
 * Desktop: the same data in two columns, the machine card and a short summary on the left, the documents table on the right.
 */
export default function EquipmentDocuments() {
  const { machineId } = useParams<{ machineId: string }>();
  const [search] = useSearchParams();
  const q = useMachineDocuments(machineId);
  const data = q.data;

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-3 px-3 pb-6 pt-3 sm:px-4 lg:space-y-4 lg:pt-5">
      <header className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" className="size-11 shrink-0 lg:size-9"><Link to="/asset/documents" aria-label="Back to the documents register"><ArrowLeft className="size-5" /></Link></Button>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold leading-tight sm:text-xl">Equipment Documents</h1>
          <p className="truncate text-xs text-muted-foreground sm:text-sm">View and manage all documents</p>
        </div>
      </header>

      {q.isLoading ? (
        <Skeleton className="h-28 w-full" />
      ) : q.isError || !data ? (
        <div role="alert" className="flex items-center gap-2 rounded-xl border p-4 text-sm"><AlertCircle className="size-4 text-destructive" aria-hidden /><span className="flex-1">This machine was not found, or you cannot see its documents.</span><Button size="sm" onClick={() => q.refetch()}>Retry</Button></div>
      ) : (
        <div className="grid grid-cols-1 gap-3 2xl:grid-cols-[22rem_minmax(0,1fr)] 2xl:items-start 2xl:gap-5">
          <aside className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_16rem] 2xl:grid-cols-1">
            <DocumentMachineCard machine={data.machine} />
            <section aria-label="Summary" className="hidden rounded-xl border bg-card p-4 lg:block">
              <h2 className="mb-1 text-sm font-semibold">Summary</h2>
              <div className="divide-y">
                <SummaryRow label="Current documents" value={data.tabs.all} />
                <SummaryRow label="Expiring soon" value={data.tabs.expiringSoon} tone={data.tabs.expiringSoon ? 'font-semibold text-amber-600 dark:text-amber-400' : undefined} />
                <SummaryRow label="Expired" value={data.tabs.expired} tone={data.tabs.expired ? 'font-semibold text-red-600 dark:text-red-400' : undefined} />
              </div>
            </section>
          </aside>
          <main className="min-w-0"><MachineDocumentsPanel machineId={data.machineId} autoUpload={search.get('upload') === '1'} presetType={search.get('type') ?? undefined} /></main>
        </div>
      )}
    </div>
  );
}
