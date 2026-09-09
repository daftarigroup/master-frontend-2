import { useQuery } from '@tanstack/react-query';

export function useGetProfileQuery() {
  return useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const profile = {
        id: 'usr-1',
        name: 'Admin User',
        fullName: 'Admin User',
        email: 'admin@master.com',
        phone: '+91 98765 43210',
        mobile: '+91 98765 43210',
        employeeId: 'EMP-000',
        isEmailVerified: true,
        tenantId: 'tenant-1',
        companyName: 'Master Infra & Construction',
        isActive: true,
        status: 'Active',
        role: 'ADMIN',
        designation: 'HR Administrator',
        department: 'Human Resources',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
        createdByAdminId: 'sys-admin',
        deletedAt: null,
      };
      return {
        success: true,
        data: profile,
        ...profile,
      };
    },
  });
}
