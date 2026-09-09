export const selectUser = (state: any) => {
  return state?.user || {
    id: 'user-admin-1',
    name: 'Admin User',
    email: 'admin@master.com',
    role: 'ADMIN',
    tenantId: 'tenant-1',
    tenant: { id: 'tenant-1', name: 'Master Org' },
    company: { id: '1', name: 'Master Infra' },
  };
};

export const selectOrgViewMode = (state: any) => {
  return state?.orgViewMode || 'all';
};
