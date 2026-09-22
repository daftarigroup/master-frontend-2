import { useCallback, useState } from 'react';

export interface AvailableCompany {
  id: string;
  name: string;
}

export function useCompanyPinForCreate() {
  const [pinnedCompany, setPinnedCompany] = useState<AvailableCompany | null>(null);

  const selectCompany = useCallback((company: AvailableCompany) => {
    setPinnedCompany(company);
  }, []);

  const reset = useCallback(() => setPinnedCompany(null), []);

  return { pinnedCompany, selectCompany, reset };
}

export default useCompanyPinForCreate;
