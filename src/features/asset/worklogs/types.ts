import type { ReadingUnit } from '@/features/asset/equipment/types';

export type WorkLogStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type Shift = 'DAY' | 'NIGHT' | 'GENERAL'; // only the operator assignment prefill still names a shift

/** One row of GET /fleet/work-logs (the can* flags are for the current user; the server re-checks every action). */
export interface WorkLog {
  id: string;
  logNumber: string | null;
  firmId: string;
  machineId: string;
  machine: { id: string; name: string; assetCode: string | null; readingUnit: ReadingUnit; capacityLabel: string | null };
  /** IST day, YYYY-MM-DD */
  date: string;
  startedAt: string;
  stoppedAt: string | null;
  startReading: number | null;
  stopReading: number | null;
  usage: number | null;
  isOpen: boolean;
  durationMinutes: number | null;
  clockMinutes: number | null;
  clockVarianceMinutes: number | null;
  clockVariance: boolean;
  operator: { id: string; name: string | null } | null;
  workType: { id: string; name: string } | null;
  locationText: string | null;
  remarks: string | null;
  wbs: { id: string; code: string; name: string } | null;
  status: WorkLogStatus;
  createdBy: { id: string; name: string | null };
  approvedBy: { id: string; name: string | null } | null;
  approvedAt: string | null;
  rejectReason: string | null;
  isFlagged: boolean;
  flagReasons: string[];
  meterReset: boolean;
  continuityGap: number | null;
  voided: boolean;
  canEdit?: boolean;
  canApprove?: boolean;
  canReopen?: boolean;
}

export interface WorkLogHistoryItem {
  id: string;
  from: WorkLogStatus | null;
  to: WorkLogStatus;
  note: string | null;
  at: string;
  by: string | null;
}
export interface WorkLogDetail extends WorkLog {
  history: WorkLogHistoryItem[];
}

export interface WorkLogKpis {
  hours: number;
  hoursLabel: string;
  km: number;
  clockMinutesNoMeter: number;
  pendingCount: number;
  provisional: boolean;
  counted: number;
  varianceCount: number;
}

export interface WorkLogList {
  total: number;
  rows: WorkLog[];
  kpis: WorkLogKpis;
}

export interface WorkLogQuery {
  firmId?: string;
  machineId?: string;
  date?: string;
  from?: string;
  to?: string;
  status?: WorkLogStatus;
  limit?: number;
  offset?: number;
}

export interface WorkLogPrefill {
  machine: { id: string; name: string; assetCode: string | null; readingUnit: ReadingUnit; capacityLabel: string | null };
  firmId: string;
  shift: Shift;
  lastStop: number | null;
  openEntry: { id: string; logNumber: string | null; startReading: number; startedAt: string } | null;
  operator: { id: string; name: string | null } | null;
  serviceStatus: string | null;
  inTransit: string | null;
}

export interface WorkType {
  id: string;
  name: string;
}

export interface Warning {
  code: string;
  message: string;
}

/** Fields shared by create and update; on update every one is optional. */
export interface WorkLogFields {
  startedAt?: string;
  stoppedAt?: string;
  startReading?: number;
  stopReading?: number;
  operatorId?: string;
  workTypeId?: string;
  locationText?: string;
  remarks?: string;
  wbsActivityId?: string;
  meterReset?: boolean;
  meterResetReason?: string;
  continuityReason?: string;
}
export interface CreateWorkLogBody extends WorkLogFields {
  clientRequestId: string;
  machineId: string;
  startedAt: string;
}

export interface WorkLogSaveResult {
  log: WorkLog;
  warnings: Warning[];
  idempotent?: boolean;
}

export interface BulkApproveResult {
  approved: string[];
  failed: Array<{ id: string; reason: string }>;
}
