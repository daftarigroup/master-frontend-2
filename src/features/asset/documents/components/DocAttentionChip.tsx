import { FileWarning } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useDocumentsAccess } from '../lib/useDocumentsAccess';
import { useDocumentCounts } from '../server/useDocumentQueries';

/**
 * A small chip on a machine row, only when that machine has expired or expiring documents. All rows share ONE request (the fleet counts
 * with a per-machine breakdown), so a list of 200 machines still costs one call. Nothing is shown to people without document access.
 */
export function DocAttentionChip({ machineId, className }: { machineId: string; className?: string }) {
  const allowed = useDocumentsAccess();
  const q = useDocumentCounts({ perMachine: true }, allowed);
  const m = q.data?.perMachine?.[machineId];
  if (!allowed || !m || (m.expired === 0 && m.expiringSoon === 0)) return null;
  const expired = m.expired > 0;
  return (
    <Link
      to={`/asset/documents/${machineId}`}
      onClick={(e) => e.stopPropagation()}
      title={expired ? `${m.expired} document${m.expired === 1 ? '' : 's'} expired` : `${m.expiringSoon} document${m.expiringSoon === 1 ? '' : 's'} expiring soon`}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2 py-1 text-[11px] font-semibold leading-none',
        expired
          ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300'
          : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
        className,
      )}
    >
      <FileWarning className="size-3" aria-hidden />
      {expired ? 'Docs expired' : 'Docs due'}
    </Link>
  );
}
