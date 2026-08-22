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
 * Role check for Store Stage Deletion & Reset:
 * Allows SUPER_ADMIN, ADMIN, or users with administrate: true.
 */
export const canDeleteStoreStage = (user: UserPermissions | null | undefined): boolean => {
  if (!user) return false;
  const role = user.role?.toUpperCase();
  return role === 'SUPER_ADMIN' || role === 'ADMIN' || user.administrate === true;
};

