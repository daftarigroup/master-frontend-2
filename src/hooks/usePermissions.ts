/**
 * Permissions hook for master-frontend.
 * Provides permissive defaults during prototype migration.
 */
export const usePermissions = (_systemKey?: string, _sectionKey?: string) => {
  return {
    isSuperAdmin: true,
    isAdmin: true,
    isUser: true,
    role: 'SUPERADMIN',
    permissions: null,
    sectionData: null,
    canSee: true,
    canRead: true,
    canWrite: true,
    canApprove: true,
    canDelete: true,
    can: () => true,
  };
};

export const useHasAccess = (_systemKey?: string, _sectionKey?: string): boolean => {
  return true;
};

export default usePermissions;
