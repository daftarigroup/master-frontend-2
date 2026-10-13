import { useAuth } from '@/context/AuthContext';
import { hasPageAccess } from '@/lib/permissions';

/** Permission to open documents (used to offer the menu entry, chip and cards; the server still decides what comes back). */
export function useDocumentsAccess(): boolean {
  const { user } = useAuth();
  return hasPageAccess(user, 'asset_documents', 'VIEW', 'assetDocuments');
}
