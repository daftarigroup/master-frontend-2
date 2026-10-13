import { ChevronRight, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatusPill } from '@/features/asset/equipment/components/StatusPill';
import { Skeleton } from '@/components/ui/skeleton';
import { longDay } from '@/features/maintenancepro/records/lib/due';
import { pillStatus } from '../lib/docUi';
import { useMachineDocuments } from '../server/useDocumentQueries';

/**
 * A small documents card for other screens (Asset Detail, the Maintenance Records side column): the counts and the five most urgent
 * documents, with a link to the full Equipment Documents screen. It reads the same query as the full panel.
 */
export function DocumentsSummaryCard({ machineId, title = 'Documents' }: { machineId: string; title?: string }) {
  const q = useMachineDocuments(machineId);
  const d = q.data;
  const urgent = [...(d?.documents ?? [])].sort((a, b) => ({ EXPIRED: 0, EXPIRING_SOON: 1, VALID: 2, NO_EXPIRY: 3 })[a.status] - ({ EXPIRED: 0, EXPIRING_SOON: 1, VALID: 2, NO_EXPIRY: 3 })[b.status]).slice(0, 5);
  return (
    <section className="rounded-xl border bg-card p-4" aria-label={title}>
      <div className="mb-2 flex items-center gap-2">
        <h2 className="flex-1 text-sm font-semibold">{title}</h2>
        <Link to={`/asset/documents/${machineId}`} className="flex min-h-8 items-center gap-0.5 text-xs font-medium text-primary hover:underline">Open <ChevronRight className="size-3.5" aria-hidden /></Link>
      </div>
      {q.isLoading ? <Skeleton className="h-16 w-full" /> : q.isError || !d ? <p className="text-sm text-muted-foreground">Documents are not available to you.</p> : (
        <>
          <p className="mb-2 text-xs text-muted-foreground">
            {d.tabs.all} current · <b className={d.tabs.expiringSoon ? 'text-amber-600 dark:text-amber-400' : ''}>{d.tabs.expiringSoon}</b> expiring · <b className={d.tabs.expired ? 'text-red-600 dark:text-red-400' : ''}>{d.tabs.expired}</b> expired
          </p>
          {urgent.length === 0 ? <p className="text-sm text-muted-foreground">No documents yet.</p> : (
            <ul className="divide-y">
              {urgent.map((x) => {
                const pill = pillStatus(x);
                return (
                  <li key={x.id} className="flex items-center gap-2 py-2">
                    <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm">{x.title}</span>{x.validTill && <span className="block text-xs text-muted-foreground">Valid till {longDay(x.validTill)}</span>}</span>
                    {pill && <StatusPill status={pill} />}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
