// Real Repair API — talks to master-backend's Repair module (src/modules/repair),
// mounted at /api/repair-system. Replaces the mockRepairStore-backed version;
// response shapes are unchanged so call sites don't need to change.
import { api } from '@/lib/axios';
import { requestPresignedUrl } from '@/lib/s3Upload';

// --- Types ---

export interface ApiResponse<T> {
  status: string;
  data: T;
}

export interface Technician {
  id: string;
  name: string;
  contact?: string;
  whatsapp?: string;
  department?: string;
  isActive: boolean;
  createdAt?: string;
  tenant?: { id: string; name: string };
}

export interface TechniciansPageResult {
  items: Technician[];
  total: number;
  totalPages: number;
}

export interface Vendor {
  id: string;
  name: string;
  type: string;
  gstNumber?: string;
  email?: string;
  address?: string;
  mobileNumber?: string;
  contactName?: string;
}

export interface RBOuthouseOffer {
  id: string;
  outhouseId: string;
  vendorId: string;
  vendorName?: string;
  rate: number;
  paymentTerm?: string;
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
  vendor?: Vendor;
}

export interface RBOuthouseRepair {
  id: string;
  indentId: string;
  indent?: RBIndent;
  tenant?: { id: string; name: string } | null;
  vendorType?: string;
  vendorRemarks?: string;
  vendorAssignedAt?: string;
  rateApprovedAt?: string;
  transporterName?: string;
  vehicleNo?: string;
  driverName?: string;
  driverContact?: string;
  transportationCharges?: number;
  weighmentSlipNo?: string;
  transportImage?: string;
  sentPaymentType?: string;
  sentPaymentAmount?: number;
  sentAt?: string;
  expectedReturnDate?: string;
  inspectedBy?: string;
  inspectionResult?: string;
  returnTransporterName?: string;
  returnTransportAmount?: number;
  billImage?: string;
  billNo?: string;
  typeOfBill?: string;
  totalBillAmount?: number;
  toBePaidAmount?: number;
  receivedAt?: string;
  billMatch?: string;
  billStatus?: string;
  finalPaymentAmount?: number;
  paidAt?: string;
  offers?: RBOuthouseOffer[];
}

export interface RBIndent {
  id: string;
  indentNumber: string;
  machineName: string;
  machineSerialNo: string;
  doerName: string;
  department: string;
  firmId?: string | null;
  firmName?: string;
  machinePartName: string;
  problem: string;
  priority: 'High' | 'Medium' | 'Low';
  expectedDeliveryDays: number;
  location: string;
  taskStatus: string;
  image?: string;
  remarks: string;
  soundOfMachine?: string;
  temperature?: string;
  maintenanceCost?: number;
  approvalStatus?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  vendorName?: string;
  techAssignment?: {
    technicianId: string;
    technicianName: string;
    assignedDate: string;
    workNotes?: string;
  };
  paymentDetails?: {
    finalPaymentAmount: number;
    paymentBatchId?: string;
    paidAt?: string;
  };
  storeInDetails?: {
    toBePaidAmount: number;
    receivedAt?: string;
  };
  workUpdates?: any[];
  inspection?: any;
  outhouseRepair?: RBOuthouseRepair;
  outhouseOffers?: RBOuthouseOffer[];
  tenant?: { id: string; name: string } | null;
}

// --- API Service backed by master-backend's /repair-system endpoints ---

export const repairSystemApi = {
  // Indents
  getAllIndents: async (params?: { firmId?: string }): Promise<RBIndent[]> => {
    const res = await api.get('/repair-system/indents', { params });
    return res.data.data;
  },
  getIndentById: async (id: string): Promise<RBIndent> => {
    const res = await api.get(`/repair-system/indents/${id}`);
    return res.data.data;
  },
  getIndentsByMachine: async (machineName: string, serialNo?: string | null): Promise<RBIndent[]> => {
    const res = await api.get('/repair-system/indents/by-machine', { params: { machineName, serialNo: serialNo ?? undefined } });
    return res.data.data;
  },
  getNextSerialNumber: async (): Promise<string> => {
    const res = await api.get('/repair-system/indents/next-serial');
    return res.data.data;
  },
  createIndent: async (data: any): Promise<RBIndent> => {
    const res = await api.post('/repair-system/indents', data);
    return res.data.data;
  },
  updateIndent: async (id: string, data: any): Promise<RBIndent> => {
    const res = await api.patch(`/repair-system/indents/${id}`, data);
    return res.data.data;
  },
  getUploadUrl: async (fileName: string, bucket = 'repair-system') => {
    const timestamp = Date.now();
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `uploads/${timestamp}-${safeName}`;
    const presign = await requestPresignedUrl({
      bucket,
      path,
      contentType: 'application/octet-stream',
    });
    if (!presign) {
      throw new Error('Unable to obtain presigned upload URL from server');
    }
    return { uploadUrl: presign.uploadUrl, key: presign.key, publicUrl: presign.publicUrl };
  },

  // Technicians
  getAllTechnicians: async (): Promise<Technician[]> => {
    const res = await api.get('/repair-system/technicians');
    return res.data.data;
  },
  getTechniciansPage: async (params: { page: number; limit: number; search?: string }): Promise<TechniciansPageResult> => {
    const res = await api.get('/repair-system/technicians/page', { params });
    return res.data.data;
  },
  createTechnician: async (data: any, _actAsTenantId?: string): Promise<Technician> => {
    const res = await api.post('/repair-system/technicians', data);
    return res.data.data;
  },
  updateTechnician: async (id: string, data: any, _actAsTenantId?: string): Promise<Technician> => {
    const res = await api.patch(`/repair-system/technicians/${id}`, data);
    return res.data.data;
  },
  deleteTechnician: async (id: string, _actAsTenantId?: string): Promise<void> => {
    await api.delete(`/repair-system/technicians/${id}`);
  },

  // Vendors
  getAllVendors: async (): Promise<Vendor[]> => {
    const res = await api.get('/repair-system/vendors');
    return res.data.data;
  },
  createVendor: async (data: Partial<Vendor>): Promise<Vendor> => {
    const res = await api.post('/repair-system/vendors', data);
    return res.data.data;
  },

  // Inhouse & Outhouse Flows — the pending/history endpoints all read from the
  // same real indent list, filtered client-side (matching the original mock's
  // behavior; the real backend doesn't yet expose per-stage filtered queries).
  getPendingApproval: async (): Promise<RBIndent[]> => {
    const all = await repairSystemApi.getAllIndents();
    return all.filter((i) => i.approvalStatus === 'Pending');
  },
  getApprovalHistory: async (): Promise<RBIndent[]> => {
    const all = await repairSystemApi.getAllIndents();
    return all.filter((i) => i.approvalStatus !== 'Pending');
  },
  getPendingOuthouseApproval: async (): Promise<RBIndent[]> => {
    const all = await repairSystemApi.getAllIndents();
    return all.filter((i) => i.approvalStatus === 'Outhouse' && (!i.outhouseRepair?.offers?.length || !i.outhouseRepair?.offers?.some((o: any) => o.isApproved)));
  },
  getOuthouseApprovalHistory: async (): Promise<RBIndent[]> => {
    const all = await repairSystemApi.getAllIndents();
    return all.filter((i) => i.approvalStatus === 'Outhouse' && i.outhouseRepair?.offers?.some((o: any) => o.isApproved));
  },
  getPendingOuthouseSent: async (): Promise<RBIndent[]> => {
    const all = await repairSystemApi.getAllIndents();
    return all.filter((i) => {
      const isOuthouse = i.approvalStatus === 'Outhouse' || (i as any).routingType === 'OUTHOUSE';
      if (!isOuthouse) return false;
      const isDispatched = !!(
        i.outhouseRepair?.transporterName ||
        i.outhouseRepair?.sentAt ||
        i.taskStatus === 'Sent for Repair' ||
        i.taskStatus === 'Store In' ||
        i.taskStatus === 'Completed' ||
        i.taskStatus === 'Payment Done'
      );
      return !isDispatched;
    });
  },
  getOuthouseSentHistory: async (): Promise<RBIndent[]> => {
    const all = await repairSystemApi.getAllIndents();
    return all.filter((i) => {
      const isOuthouse = i.approvalStatus === 'Outhouse' || (i as any).routingType === 'OUTHOUSE';
      if (!isOuthouse) return false;
      const isDispatched = !!(
        i.outhouseRepair?.transporterName ||
        i.outhouseRepair?.sentAt ||
        i.taskStatus === 'Sent for Repair' ||
        i.taskStatus === 'Store In' ||
        i.taskStatus === 'Completed' ||
        i.taskStatus === 'Payment Done'
      );
      return isDispatched;
    });
  },
  getPendingOuthouseStoreIn: async (): Promise<RBIndent[]> => {
    const all = await repairSystemApi.getAllIndents();
    return all.filter((i) => {
      const isOuthouse = i.approvalStatus === 'Outhouse' || (i as any).routingType === 'OUTHOUSE';
      if (!isOuthouse) return false;
      const isDispatched = !!(
        i.outhouseRepair?.transporterName ||
        i.outhouseRepair?.sentAt ||
        i.taskStatus === 'Sent for Repair' ||
        i.taskStatus === 'Store In' ||
        i.taskStatus === 'Completed' ||
        i.taskStatus === 'Payment Done'
      );
      const isStoreIn = !!(
        i.outhouseRepair?.receivedAt ||
        i.storeInDetails?.receivedAt ||
        i.taskStatus === 'Store In' ||
        i.taskStatus === 'Completed' ||
        i.taskStatus === 'Payment Done'
      );
      return isDispatched && !isStoreIn;
    });
  },
  getOuthouseStoreInHistory: async (): Promise<RBIndent[]> => {
    const all = await repairSystemApi.getAllIndents();
    return all.filter((i) => {
      const isOuthouse = i.approvalStatus === 'Outhouse' || (i as any).routingType === 'OUTHOUSE';
      if (!isOuthouse) return false;
      const isStoreIn = !!(
        i.outhouseRepair?.receivedAt ||
        i.storeInDetails?.receivedAt ||
        i.taskStatus === 'Store In' ||
        i.taskStatus === 'Completed' ||
        i.taskStatus === 'Payment Done'
      );
      return isStoreIn;
    });
  },
  getPendingOuthousePayment: async (): Promise<RBIndent[]> => {
    const all = await repairSystemApi.getAllIndents();
    return all.filter((i) => {
      const isOuthouse = i.approvalStatus === 'Outhouse' || (i as any).routingType === 'OUTHOUSE';
      if (!isOuthouse) return false;
      const isStoreIn = !!(
        i.outhouseRepair?.receivedAt ||
        i.storeInDetails?.receivedAt ||
        i.taskStatus === 'Store In' ||
        i.taskStatus === 'Completed' ||
        i.taskStatus === 'Payment Done'
      );
      const remainingDue = i.outhouseRepair?.toBePaidAmount;
      const isSettled = (i.taskStatus === 'Payment Done' || i.taskStatus === 'Completed') ||
        (!!i.outhouseRepair?.paidAt && remainingDue !== undefined && remainingDue !== null && remainingDue <= 0);
      return isStoreIn && !isSettled;
    });
  },
  getOuthousePaymentHistory: async (): Promise<RBIndent[]> => {
    const all = await repairSystemApi.getAllIndents();
    return all.filter((i) => {
      const isOuthouse = i.approvalStatus === 'Outhouse' || (i as any).routingType === 'OUTHOUSE';
      if (!isOuthouse) return false;
      const remainingDue = i.outhouseRepair?.toBePaidAmount;
      const isSettled = (i.taskStatus === 'Payment Done' || i.taskStatus === 'Completed') ||
        (!!i.outhouseRepair?.paidAt && remainingDue !== undefined && remainingDue !== null && remainingDue <= 0);
      return isSettled;
    });
  },
  getOuthouseOfferHistory: async (): Promise<RBIndent[]> => {
    const all = await repairSystemApi.getAllIndents();
    return all.filter((i) => i.approvalStatus === 'Outhouse' && (i.outhouseRepair?.offers?.length ?? 0) > 0);
  },
  getOuthouseVendorHistory: async (): Promise<Vendor[]> => repairSystemApi.getAllVendors(),
  getPendingTechAssignment: async (): Promise<RBIndent[]> => {
    const all = await repairSystemApi.getAllIndents();
    return all.filter((i) => i.approvalStatus === 'Inhouse' && !i.techAssignment?.technicianId && i.taskStatus !== 'Completed');
  },
  getTechAssignmentHistory: async (): Promise<RBIndent[]> => {
    const all = await repairSystemApi.getAllIndents();
    return all.filter((i) => i.approvalStatus === 'Inhouse' && (!!i.techAssignment?.technicianId || i.taskStatus === 'Completed'));
  },
  getPendingWorkTracking: async (): Promise<RBIndent[]> => {
    const all = await repairSystemApi.getAllIndents();
    return all.filter((i) => i.approvalStatus === 'Inhouse' && !!i.techAssignment?.technicianId && i.taskStatus !== 'Completed');
  },
  getWorkTrackingHistory: async (): Promise<RBIndent[]> => {
    const all = await repairSystemApi.getAllIndents();
    return all.filter((i) => i.approvalStatus === 'Inhouse' && i.taskStatus === 'Completed');
  },
  getPendingInspection: async (): Promise<RBIndent[]> => {
    const all = await repairSystemApi.getAllIndents();
    return all.filter((i) => i.taskStatus === 'Store In' && !i.inspection?.result);
  },
  getInspectionHistory: async (): Promise<RBIndent[]> => {
    const all = await repairSystemApi.getAllIndents();
    return all.filter((i) => !!i.inspection?.result);
  },
  getPendingOuthouseVendor: async (): Promise<RBIndent[]> => {
    const all = await repairSystemApi.getAllIndents();
    return all.filter((i) => i.approvalStatus === 'Outhouse' && !i.vendorName && (!i.outhouseRepair?.offers || i.outhouseRepair.offers.length === 0));
  },
  getPendingOuthouseOffer: async (): Promise<RBIndent[]> => {
    const all = await repairSystemApi.getAllIndents();
    return all.filter((i) => i.approvalStatus === 'Outhouse' && ((i.outhouseRepair?.offers?.length ?? 0) > 0) && !i.outhouseRepair?.offers?.some((o: any) => o.isApproved));
  },

  approveIndent: async (id: string, approvalStatus: 'Inhouse' | 'Outhouse', approvalRemarks?: string): Promise<RBIndent> => {
    const res = await api.post(`/repair-system/indents/${id}/approve`, { approvalStatus, approvalRemarks });
    return res.data.data;
  },
  rejectIndent: async (id: string, reason?: string): Promise<RBIndent> => {
    const res = await api.post(`/repair-system/indents/${id}/reject`, { reason });
    return res.data.data;
  },
  assignTechnician: async (dataOrId: any, technicianId?: string, _technicianName?: string, workNotes?: string): Promise<RBIndent> => {
    const id = typeof dataOrId === 'object' ? dataOrId.indentId : dataOrId;
    const tId = typeof dataOrId === 'object' ? dataOrId.technicianId : technicianId;
    const notes = typeof dataOrId === 'object' ? dataOrId.workNotes : workNotes;
    const res = await api.post(`/repair-system/indents/${id}/assign-technician`, { technicianId: tId, workNotes: notes });
    return res.data.data;
  },
  completeRepair: async (id: string, finalCost: number, notes?: string): Promise<RBIndent> => {
    const res = await api.post(`/repair-system/indents/${id}/complete`, { finalCost, notes });
    return res.data.data;
  },
  submitWorkUpdate: async (id: string, data: any): Promise<RBIndent> => {
    const res = await api.patch(`/repair-system/indents/${id}`, data);
    return res.data.data;
  },
  submitInspection: async (data: any): Promise<any> => {
    const res = await api.post(`/repair-system/indents/${data.indentId ?? data.id}/inspection`, data);
    return res.data.data;
  },
  getDashboardStats: async () => {
    const res = await api.get('/repair-system/dashboard-stats');
    return res.data.data;
  },
  saveOuthouseVendor: async (idOrData: any, data?: any): Promise<any> => {
    const id = typeof idOrData === 'object' ? idOrData.indentId : idOrData;
    const body = typeof idOrData === 'object' ? idOrData : data;
    const res = await api.post(`/repair-system/indents/${id}/outhouse/vendor`, body);
    return res.data;
  },
  saveOuthouseOffers: async (idOrOffers: any, offers?: any): Promise<any> => {
    const id = typeof idOrOffers === 'object' ? idOrOffers.indentId : idOrOffers;
    const body = typeof idOrOffers === 'object' ? idOrOffers.offers : offers;
    const res = await api.post(`/repair-system/indents/${id}/outhouse/offers`, { offers: body });
    return res.data;
  },
  approveOuthouseRate: async (idOrOfferId: any, offerId?: any): Promise<any> => {
    const id = typeof idOrOfferId === 'object' ? idOrOfferId.indentId : idOrOfferId;
    const oId = typeof idOrOfferId === 'object' ? idOrOfferId.offerId : offerId;
    const res = await api.post(`/repair-system/indents/${id}/outhouse/offers/${oId}/approve`);
    return res.data;
  },
  recordOuthouseDispatch: async (idOrData: any, data?: any, _actAsTenantId?: string): Promise<any> => {
    const id = typeof idOrData === 'object' ? idOrData.indentId : idOrData;
    const body = typeof idOrData === 'object' ? idOrData : data;
    const res = await api.post(`/repair-system/indents/${id}/outhouse/dispatch`, body);
    return res.data;
  },
  recordOuthouseReceiving: async (idOrData: any, data?: any, _actAsTenantId?: string): Promise<any> => {
    const id = typeof idOrData === 'object' ? idOrData.indentId : idOrData;
    const body = typeof idOrData === 'object' ? idOrData : data;
    const res = await api.post(`/repair-system/indents/${id}/outhouse/receiving`, body);
    return res.data;
  },
  completeOuthousePayment: async (idOrData: any, data?: any, _actAsTenantId?: string): Promise<any> => {
    const id = typeof idOrData === 'object' ? idOrData.indentId : idOrData;
    const body = typeof idOrData === 'object' ? idOrData : data;
    const res = await api.post(`/repair-system/indents/${id}/outhouse/payment`, body);
    return res.data;
  },

  // StoreIn
  getStoreIn: async () => {
    const res = await api.get('/repair-system/store-in');
    return res.data.data;
  },
  updateStoreIn: async (id: string, data: any) => {
    return { id, ...data };
  },

  // SentMachine
  getSentMachine: async () => {
    const res = await api.get('/repair-system/sent-machine');
    return res.data.data;
  },

  // Payments
  getPayments: async () => {
    const res = await api.get('/repair-system/payments');
    return res.data.data;
  },

  // Daily Report
  getDailyReport: async (date?: string) => {
    const res = await api.get('/repair-system/daily-report', { params: { date } });
    return res.data;
  },

  // Calendar
  getCalendar: async () => {
    const res = await api.get('/repair-system/calendar');
    return res.data.data;
  },
};
