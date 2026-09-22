export type BreakdownSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type BreakdownStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type DisplaySeverity = 'Critical' | 'Major' | 'Minor';
export type DisplayStatus = 'Open' | 'In Progress' | 'Completed' | 'Resolved' | 'Closed';

export interface BreakdownReport {
  id: string;
  machineId: string;
  machineName: string;
  assetCode: string;
  reportedAt: string;
  failureType: string | null;
  description: string;
  severity: BreakdownSeverity;
  isResolved: boolean;
  resolvedAt: string | null;
  rootCause: string | null;
  correctiveAction: string | null;
  estimatedDowntimeHours: number | null;
  actualDowntimeMinutes: number | null;
  remarks: string | null;
  reportedByName: string;
  assigneeName: string | null;
  breakdownNumber?: string | null;
  workOrderId: string | null;
  workOrderCode?: string | null;
  workOrderStatus: string | null;
  status: string | null;
  firmId?: string | number | null;
  firmName?: string | null;
  firm?: { id: string | number; name: string } | null;
  // Only present in "All Companies" mode
  tenant?: { id: string; name: string } | null;
}

export interface CreateBreakdownDto {
  machineId: string;
  failureType: string;
  description: string;
  severity: BreakdownSeverity;
  estimatedDowntimeHours: number;
  remarks?: string;
  assignToUserId?: string;
}

export interface ResolveBreakdownDto {
  rootCause?: string;
  correctiveAction?: string;
  preventiveAction?: string;
}

export interface RealUser {
  id: string;
  name: string;
  role: string;
}
