import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppSelector } from '@/store/hook';
import { selectOrgViewMode } from '@/store/slice/userAccountData';
import * as api from '../api/partAndVendorApi';

// Query Keys
export const partAndVendorKeys = {
  all: ['maintenancepro', 'parts-and-vendors'] as const,
  list: (
    page: number,
    limit: number,
    searchTerm: string,
    vendorFilter: string,
    partFilter: string,
    typeFilter: string
  ) =>
    [
      ...partAndVendorKeys.all,
      'list',
      { page, limit, searchTerm, vendorFilter, partFilter, typeFilter },
    ] as const,
  filters: () => [...partAndVendorKeys.all, 'filters'] as const,
  machineTypes: () => [...partAndVendorKeys.all, 'machine-types'] as const,
};

// --- Queries ---

// "All Companies" (docs/organizationplan/08-all-companies-rollout.md) —
// orgViewMode folded into the key so toggling doesn't keep serving a stale
// single-company list past this query's staleTime.
export const usePartsAndVendorsQuery = (
  page: number,
  limit: number,
  searchTerm: string,
  vendorFilter: string,
  partFilter: string,
  typeFilter = ''
) => {
  const orgViewMode = useAppSelector(selectOrgViewMode);
  return useQuery({
    queryKey: [
      ...partAndVendorKeys.list(page, limit, searchTerm, vendorFilter, partFilter, typeFilter),
      orgViewMode,
    ],
    queryFn: () =>
      api.fetchPartsAndVendors(page, limit, searchTerm, vendorFilter, partFilter, typeFilter),
    placeholderData: (previousData) => previousData,
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const usePartsAndVendorsFiltersQuery = () => {
  return useQuery({
    queryKey: partAndVendorKeys.filters(),
    queryFn: async () => {
      const [vendors, parts] = await Promise.all([api.getUniqueVendors(), api.getUniqueParts()]);
      return { vendors, parts };
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useMachineTypesQuery = () => {
  return useQuery({
    queryKey: partAndVendorKeys.machineTypes(),
    queryFn: api.getUniqueMachineTypes,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

// --- Mutations ---

export const useDeletePartAndVendorMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (partRowId: string) => api.deleteRepair(partRowId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: partAndVendorKeys.all });
    },
  });
};
