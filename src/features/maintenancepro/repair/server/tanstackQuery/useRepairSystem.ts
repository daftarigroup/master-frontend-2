'use client';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAppSelector } from '@/store/hook';
import { selectOrgViewMode } from '@/store/slice/userAccountData';
import { repairSystemApi } from '../api/repairSystemApi';

export const useRepairSystem = () => {
  const queryClient = useQueryClient();

  // --- Queries ---

  const useIndents = (params?: { firmId?: string }) =>
    useQuery({
      queryKey: ['repair-system', 'indents', params],
      queryFn: () => repairSystemApi.getAllIndents(params),
    });

  const useIndent = (id: string) =>
    useQuery({
      queryKey: ['repair-system', 'indents', id],
      queryFn: () => repairSystemApi.getIndentById(id),
      enabled: !!id,
    });

  const useIndentsByMachine = (machineName: string | null | undefined, serialNo?: string | null) =>
    useQuery({
      queryKey: ['repair-system', 'indents', 'by-machine', machineName, serialNo],
      queryFn: () => repairSystemApi.getIndentsByMachine(machineName!, serialNo),
      enabled: !!machineName,
    });

  const useNextSerialNumber = () =>
    useQuery({
      queryKey: ['repair-system', 'indents', 'serial-number'],
      queryFn: repairSystemApi.getNextSerialNumber,
    });

  const useTechnicians = () => {
    const orgViewMode = useAppSelector(selectOrgViewMode);
    return useQuery({
      queryKey: ['repair-system', 'technicians', orgViewMode],
      queryFn: repairSystemApi.getAllTechnicians,
    });
  };

  const useTechniciansPage = (params: { page: number; limit: number; search: string }) => {
    const orgViewMode = useAppSelector(selectOrgViewMode);
    return useQuery({
      queryKey: ['repair-system', 'technicians', 'page', params.page, params.search, orgViewMode],
      queryFn: () =>
        repairSystemApi.getTechniciansPage({
          page: params.page,
          limit: params.limit,
          search: params.search || undefined,
        }),
      placeholderData: keepPreviousData,
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
    });
  };

  const useDashboardStats = () =>
    useQuery({
      queryKey: ['repair-system', 'dashboard-stats'],
      queryFn: repairSystemApi.getDashboardStats,
    });

  // Inhouse
  const usePendingApproval = () =>
    useQuery({
      queryKey: ['repair-system', 'approval', 'pending'],
      queryFn: repairSystemApi.getPendingApproval,
    });

  const useApprovalHistory = () =>
    useQuery({
      queryKey: ['repair-system', 'approval', 'history'],
      queryFn: repairSystemApi.getApprovalHistory,
    });

  const usePendingTechAssignment = () =>
    useQuery({
      queryKey: ['repair-system', 'tech-assigned', 'pending'],
      queryFn: repairSystemApi.getPendingTechAssignment,
    });

  const useTechAssignmentHistory = () =>
    useQuery({
      queryKey: ['repair-system', 'tech-assigned', 'history'],
      queryFn: repairSystemApi.getTechAssignmentHistory,
    });

  const usePendingWorkTracking = () =>
    useQuery({
      queryKey: ['repair-system', 'work-tracking', 'pending'],
      queryFn: repairSystemApi.getPendingWorkTracking,
    });

  const useWorkTrackingHistory = () =>
    useQuery({
      queryKey: ['repair-system', 'work-tracking', 'history'],
      queryFn: repairSystemApi.getWorkTrackingHistory,
    });

  const usePendingInspection = () =>
    useQuery({
      queryKey: ['repair-system', 'inspection', 'pending'],
      queryFn: repairSystemApi.getPendingInspection,
    });

  const useInspectionHistory = () =>
    useQuery({
      queryKey: ['repair-system', 'inspection', 'history'],
      queryFn: repairSystemApi.getInspectionHistory,
    });

  // Outhouse
  const usePendingOuthouseVendor = () =>
    useQuery({
      queryKey: ['repair-system', 'outhouse-vendor', 'pending'],
      queryFn: repairSystemApi.getPendingOuthouseVendor,
    });

  const usePendingOuthouseOffer = () =>
    useQuery({
      queryKey: ['repair-system', 'outhouse-offer', 'pending'],
      queryFn: repairSystemApi.getPendingOuthouseOffer,
    });

  const useOuthouseOfferHistory = () =>
    useQuery({
      queryKey: ['repair-system', 'outhouse-offer', 'history'],
      queryFn: repairSystemApi.getOuthouseOfferHistory,
    });

  const usePendingOuthouseApproval = () =>
    useQuery({
      queryKey: ['repair-system', 'outhouse-approval', 'pending'],
      queryFn: repairSystemApi.getPendingOuthouseApproval,
    });

  const usePendingOuthouseSent = () => {
    const orgViewMode = useAppSelector(selectOrgViewMode);
    return useQuery({
      queryKey: ['repair-system', 'outhouse-sent', 'pending', orgViewMode],
      queryFn: repairSystemApi.getPendingOuthouseSent,
    });
  };

  const useOuthouseSentHistory = () => {
    const orgViewMode = useAppSelector(selectOrgViewMode);
    return useQuery({
      queryKey: ['repair-system', 'outhouse-sent', 'history', orgViewMode],
      queryFn: repairSystemApi.getOuthouseSentHistory,
    });
  };

  const usePendingOuthouseStoreIn = () => {
    const orgViewMode = useAppSelector(selectOrgViewMode);
    return useQuery({
      queryKey: ['repair-system', 'outhouse-store-in', 'pending', orgViewMode],
      queryFn: repairSystemApi.getPendingOuthouseStoreIn,
    });
  };

  const usePendingOuthousePayment = () => {
    const orgViewMode = useAppSelector(selectOrgViewMode);
    return useQuery({
      queryKey: ['repair-system', 'outhouse-payment', 'pending', orgViewMode],
      queryFn: repairSystemApi.getPendingOuthousePayment,
    });
  };

  const useOuthouseApprovalHistory = () =>
    useQuery({
      queryKey: ['repair-system', 'outhouse-approval', 'history'],
      queryFn: repairSystemApi.getOuthouseApprovalHistory,
    });

  const useVendors = () =>
    useQuery({
      queryKey: ['repair-system', 'vendors'],
      queryFn: repairSystemApi.getAllVendors,
    });

  const useOuthouseVendorHistory = () =>
    useQuery({
      queryKey: ['repair-system', 'outhouse-vendor', 'history'],
      queryFn: repairSystemApi.getOuthouseVendorHistory,
    });

  const useOuthouseStoreInHistory = () => {
    const orgViewMode = useAppSelector(selectOrgViewMode);
    return useQuery({
      queryKey: ['repair-system', 'outhouse-store-in', 'history', orgViewMode],
      queryFn: repairSystemApi.getOuthouseStoreInHistory,
    });
  };

  const useOuthousePaymentHistory = () => {
    const orgViewMode = useAppSelector(selectOrgViewMode);
    return useQuery({
      queryKey: ['repair-system', 'outhouse-payment', 'history', orgViewMode],
      queryFn: repairSystemApi.getOuthousePaymentHistory,
    });
  };

  // --- Mutations ---

  const createIndentMutation = useMutation({
    mutationFn: repairSystemApi.createIndent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repair-system', 'indents'] });
      toast.success('Indent created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create indent');
    },
  });

  const updateIndentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => repairSystemApi.updateIndent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repair-system', 'indents'] });
      toast.success('Indent updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update indent');
    },
  });

  const approveIndentMutation = useMutation({
    mutationFn: ({
      id,
      status,
      approvalRemarks,
    }: {
      id: string;
      status: 'Inhouse' | 'Outhouse';
      approvalRemarks?: string;
    }) => repairSystemApi.approveIndent(id, status, approvalRemarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repair-system'] });
      toast.success('Indent approved successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to approve indent');
    },
  });

  const assignTechnicianMutation = useMutation({
    mutationFn: (data: {
      indentId: string;
      technicianId: string;
      workNotes?: string;
      assignedDate?: string;
    }) => repairSystemApi.assignTechnician(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repair-system'] });
      toast.success('Technician assigned successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to assign technician');
    },
  });

  const submitWorkUpdateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      repairSystemApi.submitWorkUpdate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repair-system'] });
      toast.success('Work update submitted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to submit work update');
    },
  });

  const submitInspectionMutation = useMutation({
    mutationFn: repairSystemApi.submitInspection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repair-system'] });
      toast.success('Inspection submitted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to submit inspection');
    },
  });

  const createTechnicianMutation = useMutation({
    mutationFn: (data: any & { actAsTenantId?: string }) => {
      const { actAsTenantId, ...rest } = data;
      return repairSystemApi.createTechnician(rest, actAsTenantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repair-system', 'technicians'] });
      toast.success('Technician added successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to add technician');
    },
  });

  const updateTechnicianMutation = useMutation({
    mutationFn: ({ id, data, actAsTenantId }: { id: string; data: any; actAsTenantId?: string }) =>
      repairSystemApi.updateTechnician(id, data, actAsTenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repair-system', 'technicians'] });
      toast.success('Technician updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update technician');
    },
  });

  const deleteTechnicianMutation = useMutation({
    mutationFn: ({ id, actAsTenantId }: { id: string; actAsTenantId?: string }) =>
      repairSystemApi.deleteTechnician(id, actAsTenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repair-system', 'technicians'] });
      toast.success('Technician removed successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to remove technician');
    },
  });

  // Outhouse Mutations
  const saveOuthouseVendorMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      repairSystemApi.saveOuthouseVendor(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repair-system'] });
      toast.success('Vendor selection saved');
    },
  });

  const saveOuthouseOffersMutation = useMutation({
    mutationFn: ({ id, offers }: { id: string; offers: any[] }) =>
      repairSystemApi.saveOuthouseOffers(id, offers),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repair-system'] });
      toast.success('Offers saved successfully');
    },
  });

  const approveOuthouseRateMutation = useMutation({
    mutationFn: ({ id, offerId }: { id: string; offerId: string }) =>
      repairSystemApi.approveOuthouseRate(id, offerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repair-system'] });
      toast.success('Rate approved successfully');
    },
  });

  const recordOuthouseDispatchMutation = useMutation({
    mutationFn: ({ id, data, actAsTenantId }: { id: string; data: any; actAsTenantId?: string }) =>
      repairSystemApi.recordOuthouseDispatch(id, data, actAsTenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repair-system'] });
      toast.success('Dispatch recorded successfully');
    },
  });

  const recordOuthouseReceivingMutation = useMutation({
    mutationFn: ({ id, data, actAsTenantId }: { id: string; data: any; actAsTenantId?: string }) =>
      repairSystemApi.recordOuthouseReceiving(id, data, actAsTenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repair-system'] });
      toast.success('Receiving recorded successfully');
    },
  });

  const completeOuthousePaymentMutation = useMutation({
    mutationFn: ({ id, data, actAsTenantId }: { id: string; data: any; actAsTenantId?: string }) =>
      repairSystemApi.completeOuthousePayment(id, data, actAsTenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repair-system'] });
      toast.success('Payment completed successfully');
    },
  });

  return {
    // Queries
    useIndents,
    useIndent,
    useIndentsByMachine,
    useNextSerialNumber,
    useTechnicians,
    useTechniciansPage,
    useDashboardStats,
    usePendingApproval,
    useApprovalHistory,
    usePendingTechAssignment,
    useTechAssignmentHistory,
    usePendingWorkTracking,
    useWorkTrackingHistory,
    usePendingInspection,
    useInspectionHistory,
    usePendingOuthouseVendor,
    usePendingOuthouseOffer,
    usePendingOuthouseApproval,
    useOuthouseApprovalHistory,
    usePendingOuthouseSent,
    usePendingOuthouseStoreIn,
    usePendingOuthousePayment,
    useVendors,
    useOuthouseOfferHistory,
    useOuthouseSentHistory,
    useOuthouseVendorHistory,
    useOuthouseStoreInHistory,
    useOuthousePaymentHistory,
    getUploadUrl: repairSystemApi.getUploadUrl,

    // Mutations
    createIndentMutation,
    updateIndentMutation,
    approveIndentMutation,
    assignTechnicianMutation,
    submitWorkUpdateMutation,
    submitInspectionMutation,
    createTechnicianMutation,
    updateTechnicianMutation,
    deleteTechnicianMutation,
    saveOuthouseVendorMutation,
    saveOuthouseOffersMutation,
    approveOuthouseRateMutation,
    recordOuthouseDispatchMutation,
    recordOuthouseReceivingMutation,
    completeOuthousePaymentMutation,
  };
};
