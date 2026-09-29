import type { UserPermissions } from '@/types/sheets';

/**
 * Independent 3-tier role for the Checklist & Delegation module.
 * Deliberately separate from the legacy `administrate` boolean, which
 * continues to gate the Store module only.
 */
export type ChecklistRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER';

export const hasChecklistRole = (
  user: UserPermissions | null | undefined,
  ...allowed: ChecklistRole[]
) => !!user?.role && allowed.includes(user.role as ChecklistRole);

export const isChecklistAdmin = (user: UserPermissions | null | undefined) =>
  hasChecklistRole(user, 'SUPER_ADMIN', 'ADMIN');

export const isChecklistSuperAdmin = (user: UserPermissions | null | undefined) =>
  hasChecklistRole(user, 'SUPER_ADMIN');

/**
 * Role check for Stage Deletion & Reset:
 * - SUPER_ADMIN: Unrestricted access (always true)
 * - USER: Strictly denied (always false, even if modify_access is EDIT)
 * - ADMIN: Conditionally allowed if delete access is granted for the specific stage/page in page_access
 */
export const canDeletePage = (
  user: UserPermissions | null | undefined,
  pageId?: string
): boolean => {
  if (!user) return false;
  const role = user.role?.toUpperCase();

  // Super admin always has full delete access
  if (role === 'SUPER_ADMIN') return true;

  // Standard users are never allowed to delete, even if modify/edit is permitted
  if (role === 'USER') return false;

  // Admin role or legacy administrate flag
  if (role === 'ADMIN' || user.administrate === true) {
    if (!pageId) return true;

    // Resolve page_access to an object (it may arrive as a JSON string from the DB)
    const rawPageAccess = user.page_access;
    const pageAccessObj: Record<string, any> | null =
      typeof rawPageAccess === 'string'
        ? (() => { try { return JSON.parse(rawPageAccess); } catch { return null; } })()
        : (rawPageAccess ?? null);

    if (!pageAccessObj || Object.keys(pageAccessObj).length === 0) return true;

    // Check if delete access is explicitly granted
    const pageDeleteKey = `${pageId}_delete`;
    if (pageAccessObj[pageDeleteKey] === true) return true;
    if (pageAccessObj[pageDeleteKey] === false) return false;

    const pageAcc = pageAccessObj[pageId];
    if (typeof pageAcc === 'object' && pageAcc !== null && pageAcc.canDelete !== undefined) {
      return pageAcc.canDelete === true;
    }

    // Global admin wildcard
    if (pageAccessObj['ALL'] || pageAccessObj['all']) return true;

    // If granular page_access exists but delete was not granted for this page
    return false;
  }

  return false;
};

export const canDeleteStoreStage = (
  user: UserPermissions | null | undefined,
  pageId?: string
): boolean => {
  return canDeletePage(user, pageId);
};

