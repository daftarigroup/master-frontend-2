import { useQuery } from '@tanstack/react-query';

export function useTenantQuery(_tenantId?: string | null) {
  return useQuery({
    queryKey: ['tenant', _tenantId],
    queryFn: async () => {
      const tenantData = {
        id: _tenantId || 'tenant-1',
        name: 'Master Infra & Construction',
        companyName: 'Master Infra & Construction',
        address: 'Corporate Headquarters, Business Park, Phase 1',
        logo: null,
        logoUrl: null,
        email: 'contact@masterinfra.com',
        phone: '+91 98765 43210',
      };
      return {
        ...tenantData,
        data: tenantData,
      };
    },
  });
}
