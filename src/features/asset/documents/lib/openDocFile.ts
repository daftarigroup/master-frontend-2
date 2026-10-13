import { toast } from 'sonner';
import { apiErrorMessage } from '@/features/asset/fleet/lib/format';
import { documentsApi } from '../server/documentsApi';

/**
 * Opens (or downloads) one stored file through the authenticated download endpoint, which checks scope and role and returns a
 * short-lived link. The tab is opened inside the click so popup blockers allow it; a failure says so instead of leaving a dead link.
 */
export async function openDocFile(fileId: string, mode: 'view' | 'download' = 'view'): Promise<void> {
  const tab = mode === 'view' ? window.open('', '_blank') : null;
  try {
    const r = await documentsApi.download(fileId, mode === 'view');
    if (tab) tab.location.href = r.url;
    else {
      const a = document.createElement('a');
      a.href = r.url;
      a.download = r.filename;
      a.rel = 'noreferrer';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  } catch (e) {
    tab?.close();
    toast.error(apiErrorMessage(e, 'This file could not be opened. It may have been removed from storage.'));
  }
}
