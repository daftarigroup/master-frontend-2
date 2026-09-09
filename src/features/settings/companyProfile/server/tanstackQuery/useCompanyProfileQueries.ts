import { useQuery } from '@tanstack/react-query';
import { fetchCompanyProfile } from '../api/companyProfileApi';

export function useCompanyProfile() {
  return useQuery({
    queryKey: ['company-profile'],
    queryFn: fetchCompanyProfile,
  });
}
