import { AlertTriangle, CheckCircle2, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { useProject } from '@/context/ProjectContext';
import { useDocumentsAccess } from '../lib/useDocumentsAccess';
import { useDocumentCounts } from '../server/useDocumentQueries';

/** Dashboard alert: the register's own counts (expired, expiring soon, machines with expired papers), with a link to the register. */
export function DocumentAlertsCard() {
  const allowed = useDocumentsAccess();
  const { selectedProject } = useProject();
  const firmId = selectedProject && selectedProject.id !== 'all' ? String(selectedProject.id) : undefined;
  const { data } = useDocumentCounts({ firmId }, allowed);
  if (!allowed || !data) return null;
  const clear = data.expired === 0 && data.expiringSoon === 0;
  return (
    <Card className="space-y-3 p-4">
      <h3 className="flex items-center gap-2 text-sm font-bold"><FileText className="size-4 text-blue-600" /> Document alerts</h3>
      {clear ? (
        <p className="flex items-center gap-1.5 text-sm text-emerald-600"><CheckCircle2 className="size-4" /> No documents are expired or expiring soon.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {data.expired > 0 && (
            <li className="flex items-start gap-2 text-red-700 dark:text-red-300">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>{data.expired} document{data.expired === 1 ? '' : 's'} expired on {data.machinesWithExpired} machine{data.machinesWithExpired === 1 ? '' : 's'}. <Link to="/asset/documents?status=EXPIRED" className="underline">Open</Link></span>
            </li>
          )}
          {data.expiringSoon > 0 && (
            <li className="flex items-start gap-2 text-amber-700 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>{data.expiringSoon} document{data.expiringSoon === 1 ? '' : 's'} expiring soon. <Link to="/asset/documents?status=EXPIRING_SOON" className="underline">Open</Link></span>
            </li>
          )}
        </ul>
      )}
    </Card>
  );
}
