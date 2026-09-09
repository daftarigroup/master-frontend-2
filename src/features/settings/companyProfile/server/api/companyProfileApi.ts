export interface CompanyProfile {
  id: string;
  name: string;
  companyName: string;
  email?: string;
  phone?: string;
  address?: string;
  cin?: string;
  gstin?: string;
  website?: string;
  logo?: string | null;
  logoUrl?: string | null;
}

export async function fetchCompanyProfile(): Promise<CompanyProfile> {
  return {
    id: 'comp-1',
    name: 'Master Infra & Construction',
    companyName: 'Master Infra & Construction',
    email: 'info@masterinfra.com',
    phone: '+91 98765 43210',
    address: 'Survey No. 102, Industrial Corridor, Pune',
    website: 'https://masterinfra.com',
    logo: null,
    logoUrl: null,
  };
}
