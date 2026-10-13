import type { DerivedStatus, EquipmentCategory } from '@/features/asset/equipment/types';

export type { DerivedStatus, EquipmentCategory };
export type Shift = 'DAY' | 'NIGHT' | 'GENERAL';
export type TransferStatus = 'REQUESTED' | 'APPROVED' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED';

export interface AssignmentStats {
  total: number;
  inUse: number;
  available: number;
  maintenance: number;
  idle: number;
  inTransit: number;
  assigned: number;
  returnOverdue: number;
}

export interface Named { id: string; name: string | null }

export interface AssignmentInfo {
  id: string;
  firm: { id: string; name: string };
  site: { id: string; name: string } | null;
  since: string;
  expectedReturnAt: string | null;
  returnOverdue: boolean;
  responsible: Named | null;
  note: string | null;
}

export interface OperatorInfo {
  assignmentId: string;
  id: string;
  name: string | null;
  shift: Shift | null;
  validTill: string | null;
  expiringSoon: boolean;
}

export interface AssignmentMachine {
  id: string;
  name: string;
  assetCode: string;
  category: EquipmentCategory;
  imageUrl: string | null;
  ownershipType: 'OWNED' | 'RENTED';
  readingUnit: string;
}

export interface AssignmentRow {
  machine: AssignmentMachine;
  status: DerivedStatus;
  assignment: AssignmentInfo | null;
  operator: OperatorInfo | null;
  operators?: OperatorInfo[];
}

export interface AssignmentList {
  today: string;
  stats: AssignmentStats;
  total: number;
  rows: AssignmentRow[];
}

export interface AssignmentQuery {
  firmId?: string;
  status?: DerivedStatus | '';
  q?: string;
  siteId?: string;
  overdue?: boolean;
  assignedOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface OperatorRow {
  id: string;
  machine: { id: string; name: string; assetCode: string };
  operator: { id: string; name: string | null; code: string | null; designation: string | null };
  shift: Shift | null;
  validFrom: string | null;
  validTill: string | null;
  expiringSoon: boolean;
}

export interface AvailabilityCell { date: string; status: DerivedStatus; planned: boolean }
export interface AvailabilityRow { machineId: string; name: string; assetCode: string; cells: AvailabilityCell[] }
export interface Availability { from: string; days: number; today: string; rows: AvailabilityRow[] }

export interface TransferEnd { firm: { id: string; name: string }; site: string | null }
export interface TransferEvent { from: TransferStatus | null; to: TransferStatus; note: string | null; at: string; by: string | null }
export interface Transfer {
  id: string;
  transferNumber: string;
  status: TransferStatus;
  machine: { id: string; name: string; assetCode: string; imageUrl: string | null };
  from: TransferEnd;
  to: TransferEnd;
  requestedBy: string | null;
  requestedAt: string;
  dispatchedAt: string | null;
  transporter: string | null;
  vehicleNo: string | null;
  lrRef: string | null;
  eta: string | null;
  receivedAt: string | null;
  cancelReason: string | null;
  note: string | null;
  events: TransferEvent[];
}
export interface TransferList { total: number; rows: Transfer[] }

export interface FirmOption { id: string; name: string }

export interface AssignBody { machineId: string; firmId: string; siteLocationId?: string; expectedReturnAt?: string | null; responsibleUserId?: string; note?: string }
export interface ReleaseBody { reason?: string; returnedToVendor?: boolean }
export interface OperatorBody { machineId: string; userId?: string; userIds?: string[]; shift?: Shift; validFrom?: string; validTill?: string | null }
export interface TransferBody { machineId: string; toFirmId: string; toSiteLocationId?: string; eta?: string | null; note?: string }
export interface DispatchBody { transporter?: string; vehicleNo?: string; lrRef?: string; eta?: string | null }
export interface ReceiveBody { responsibleUserId?: string; expectedReturnAt?: string | null; note?: string }

/** What the dialogs act on; one is open at a time. */
export type AssignmentAction =
  | { kind: 'assign'; row?: AssignmentRow }
  | { kind: 'release'; row: AssignmentRow }
  | { kind: 'transfer'; row: AssignmentRow }
  | { kind: 'operator'; machine: { id: string; name: string }; current?: OperatorInfo | null; currentOperators?: OperatorInfo[] }
  | { kind: 'endOperator'; id: string; operatorName: string | null; machineName: string }
  | { kind: 'dispatch'; transfer: Transfer }
  | { kind: 'receive'; transfer: Transfer }
  | { kind: 'cancel'; transfer: Transfer };
