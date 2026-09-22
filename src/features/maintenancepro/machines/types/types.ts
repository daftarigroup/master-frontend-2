// Machine types — aligned with EMMS backend schema

export type MachineStatus =
  | 'OPERATIONAL'
  | 'UNDER_MAINTENANCE'
  | 'BREAKDOWN'
  | 'IDLE'
  | 'DECOMMISSIONED';

export type MachineCategory =
  | 'PRODUCTION'
  | 'UTILITY'
  | 'MATERIAL_HANDLING'
  | 'HVAC'
  | 'ELECTRICAL'
  | 'INSTRUMENTATION'
  | 'SAFETY'
  | 'FACILITY';

export interface MachineDepartment {
  id: string;
  name: string;
}

export interface MachineAssignment {
  id: string;
  user: { id: string; name: string; email: string; role?: string };
}

export interface Machine {
  id: string;
  tenantId: string;
  firmId: string | null;
  firmName?: string | null;
  firm?: { id: string; name: string } | null;
  departmentId: string | null;
  department: MachineDepartment | null;
  name: string;
  assetCode: string;
  qrCode: string | null;
  serialNumber: string | null;
  modelNumber: string | null;
  manufacturer: string | null;
  supplier: string | null;
  category: MachineCategory;
  subCategory: string | null;
  ownershipType?: 'OWNED' | 'RENTED' | 'HIRED' | string | null;
  criticalityLevel: number;
  location: string | null;
  locationCode: string | null;
  purchaseDate: string | null;
  purchasePrice: number | null;
  installationDate: string | null;
  warrantyExpiry: string | null;
  status: MachineStatus;
  statusChangedAt: string | null;
  runningHours: number;
  specifications?: Record<string, unknown> | null;
  isActive: boolean;
  imageUrl: string | null;
  documentUrls: string[];
  createdAt: string;
  updatedAt: string;
  assignments?: MachineAssignment[];
  parts?: MachinePart[];
  maintenancePlans?: MaintenancePlan[];
  breakdownReports?: BreakdownReport[];
  workOrders?: MaintenanceWorkOrder[];
  totalRepairCost?: number;
  storeCheckInId?: string | null;
  storeCheckIn?: {
    id: string;
    status?: string | null;
    billAmount?: number | null;
    createdAt?: string;
    location?: string | null;
    poItem?: {
      rate?: number | null;
      amount?: number | null;
      product?: { name?: string | null } | null;
      po?: { poNumber?: string | null; supplierName?: string | null } | null;
    } | null;
  } | null;
  _count?: {
    workOrders: number;
    breakdownReports: number;
    downTimeLogs: number;
    parts: number;
    maintenancePlans?: number;
  };
  // Only present in "All Companies" mode — see
  // docs/organizationplan/08-all-companies-rollout.md. Not currently
  // rendered by this MaintenancePro machines list — added for type safety
  // since this feature shares the /maintenance/machines endpoint with the
  // Settings → Machines page, which does render it.
  tenant?: { id: string; name: string };
}

export type WorkOrderStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'PENDING_APPROVAL'
  | 'COMPLETED'
  | 'COMPLETED_LATE'
  | 'COMPLETION_REJECTED'
  | 'OVERDUE'
  | 'ON_LEAVE'
  | 'MISSED'
  | 'SKIPPED'
  | 'CANCELLED'
  | 'ON_HOLD';

export interface MaintenanceWorkOrder {
  id: string;
  breakdownReportId: string | null;
  type: 'SCHEDULED' | 'BREAKDOWN' | 'ONE_TIME';
  status: WorkOrderStatus;
  priority: number;
  scheduledDate: string;
  actualDueDate: string;
  startedAt: string | null;
  completedAt: string | null;
  completionNote: string | null;
  actualMinutesTaken: number | null;
  slaBreach: boolean;
  cancelReason: string | null;
  skipReason: string | null;
  currentAssignee: { id: string; name: string; email?: string };
  plan: {
    title: string;
    activityType: { id: string; name: string; code: string | null } | null;
  } | null;
  completedBy: { id: string; name: string } | null;
  machinePart: { id: string; name: string } | null;
  breakdownReport: {
    id: string;
    title: string;
    description: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
    isResolved: boolean;
    reportedAt: string;
    resolvedAt: string | null;
    failureType: string | null;
    rootCause: string | null;
    correctiveAction: string | null;
  } | null;
  statusLogs?: { id: string; sendMachine: string | null; createdAt: string }[];
}

export interface MaintenancePlan {
  id: string;
  name?: string;
  title?: string;
  description?: string | null;
  frequency?: string;
  status?: string;
  nextDueDate?: string | null;
  isActive?: boolean;
}

export interface BreakdownReport {
  id: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isResolved: boolean;
  reportedAt: string;
  resolvedAt: string | null;
}

export interface MachinePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface MachineListResponse {
  status: string;
  data: Machine[];
  pagination: MachinePagination;
}

export interface CreateMachinePayload {
  name: string;
  assetCode: string;
  category: MachineCategory;
  firmId?: string;
  departmentId?: string;
  serialNumber?: string;
  modelNumber?: string;
  manufacturer?: string;
  supplier?: string;
  subCategory?: string;
  criticalityLevel?: number;
  location?: string;
  locationCode?: string;
  purchaseDate?: string;
  installationDate?: string;
  warrantyExpiry?: string;
  imageUrl?: string;
  documentUrls?: string[];
  // Fields from reference
  purchasePrice?: number;
  vendor?: string;
  warrantyExpiration?: string;
  maintenanceSchedule?: string[];
  maintenancePartsList?: string[];
  initialMaintenanceDate?: string;
  userManualUrl?: string;
  specificationsSheetUrl?: string;
  additionalSpecifications?: { name: string; value: string }[];
  notes?: string;
  parts?: {
    name: string;
    partNumber?: string;
    description?: string;
    imageUrl?: string;
  }[];
}

export interface MachineFilters {
  firm?: string;
  firmId?: string;
  department: string;
  status: string;
  category: string;
}

export interface MachineSortConfig {
  column: string;
  direction: 'asc' | 'desc';
}

export const MACHINE_CATEGORY_LABELS: Record<MachineCategory, string> = {
  PRODUCTION: 'Production',
  UTILITY: 'Utility',
  MATERIAL_HANDLING: 'Material Handling',
  HVAC: 'HVAC',
  ELECTRICAL: 'Electrical',
  INSTRUMENTATION: 'Instrumentation',
  SAFETY: 'Safety',
  FACILITY: 'Facility',
};

export const MACHINE_STATUS_LABELS: Record<MachineStatus, string> = {
  OPERATIONAL: 'Operational',
  UNDER_MAINTENANCE: 'Under Maintenance',
  BREAKDOWN: 'Breakdown',
  IDLE: 'Idle',
  DECOMMISSIONED: 'Decommissioned',
};

export interface MachinePart {
  id: string;
  tenantId: string;
  machineId: string;
  machine?: {
    id: string;
    name: string;
    assetCode: string;
  };
  name: string;
  partNumber: string | null;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  workOrders?: MaintenanceWorkOrder[];
  breakdowns?: BreakdownReport[];
}

export interface CreateMachinePartPayload {
  machineId: string;
  name: string;
  partNumber?: string;
  description?: string;
  imageUrl?: string;
}

export interface UpdateMachinePartPayload extends Partial<CreateMachinePartPayload> {
  isActive?: boolean;
}
