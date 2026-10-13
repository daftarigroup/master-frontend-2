// Shapes returned by master-backend /api/fleet (see modules/fleet). Numbers are already numbers.
export type OwnershipType = 'OWNED' | 'RENTED';
export type ReadingUnit = 'KM' | 'HOURS' | 'NONE';

export interface Warning {
  code: string;
  message: string;
}

export interface FleetMachine {
  id: string;
  name: string;
  assetCode: string | null;
  registrationNo: string | null;
  firmId: string | null;
  firmName?: string | null;
  assignment?: {
    id: string;
    firmId: string;
    firmName: string | null;
  } | null;
  ownershipType: OwnershipType;
  equipmentType: string | null;
  readingUnit: ReadingUnit;
  hireType: string | null;
  expectedConsumption: number | null;
  lastStop: number | null;
  openEntry: { id: string; startReading: number; startedAt: string } | null;
}

export interface LastReading {
  readingUnit: ReadingUnit;
  lastStop: number | null;
  lastStoppedAt: string | null;
  openEntry: { id: string; startReading: number; startedAt: string } | null;
}

export interface UsageLog {
  id: string;
  firmId: string;
  machineId: string;
  machineName: string | null;
  readingUnit: ReadingUnit | null;
  logDate: string;
  startedAt: string;
  stoppedAt: string | null;
  startReading: number;
  stopReading: number | null;
  usage: number | null;
  isOpen: boolean;
  meterReset: boolean;
  meterResetReason: string | null;
  continuityGap: number | null;
  continuityReason: string | null;
  isFlagged: boolean;
  flagReasons: string[];
  operatorId: string | null;
  operatorName: string | null;
  remarks: string | null;
  voidedAt: string | null;
  voidReason: string | null;
}

export interface LedgerCell {
  /** a diesel issue of that day has a doubtful meter reading (saved and flagged, not blocked) */
  flagged?: boolean;
  diesel: number;
  start: number | null;
  stop: number | null;
  usage: number | null;
  entries: number;
  hasOpen: boolean;
}
export interface LedgerRow {
  date: string;
  cells: Record<string, LedgerCell>;
  /** old diesel logged without a machine; empty in new months */
  other: number;
  total: number;
}
export interface LedgerMachineMeta {
  id: string;
  name: string;
  readingUnit: ReadingUnit;
  ownershipType: OwnershipType;
  registrationNo: string | null;
}
export interface MonthLedger {
  month: string;
  firmId: string;
  firmName: string | null;
  machines: LedgerMachineMeta[];
  rows: LedgerRow[];
  totals: {
    perMachine: Record<string, { diesel: number; usage: number }>;
    other: number;
    total: number;
  };
}

export interface EfficiencyRow {
  machineId: string;
  machineName: string;
  readingUnit: ReadingUnit;
  ownershipType: OwnershipType;
  litres: number;
  usage: number;
  rate: number | null;
  expected: number | null;
  deviationPct: number | null;
  flagged: boolean;
  excludedOpenEntries: number;
}

/** Efficiency of one machine over the history window (no name fields). */
export type EfficiencySummary = Omit<EfficiencyRow, 'machineName' | 'readingUnit' | 'ownershipType'>;

export interface MachineHistory {
  machine: {
    id: string;
    name: string;
    ownershipType: OwnershipType;
    readingUnit: ReadingUnit;
    openingReading: number | null;
    expectedConsumption: number | null;
  };
  range: { from: string; to: string };
  totalRun: number;
  efficiency: EfficiencySummary;
  usage: UsageLog[];
  flagged: UsageLog[];
  diesel: Array<{ id: string; issuedAt: string; litres: number; source: string; note: string | null; usageLogId: string | null; meterReading?: number | null; flags?: string[]; fromStore?: boolean }>;
  legacyLogs: Array<{ id: string; date: string; runtimeHours: number | null; operatorName: string | null; remarks: string | null }>;
}

export interface FleetAlerts {
  flaggedEntries: number;
  /** diesel issues (last 30 days) whose meter reading needs a check */
  flaggedDiesel?: Array<{ id: string; machineId: string | null; machineName: string | null; date: string; litres: number; meterReading: number | null; flags: string[] }>;
  flaggedList?: Array<{ id: string; machineId: string; machineName: string }>;
  staleOpenEntries: Array<{ id: string; machineId: string; machineName: string; startedAt: string; startReading: number }>;
}

export interface DailyEntryBody {
  firmId?: string;
  machineId?: string;
  wbsActivityId?: string;
  consumerLabel?: string;
  occurredAt: string;
  diesel?: { litres: number; issuedAt?: string; note?: string } | null;
  usage?: {
    startReading: number;
    stopReading?: number | null;
    stoppedAt?: string;
    meterReset?: boolean;
    meterResetReason?: string;
    continuityReason?: string;
    operatorId?: string;
    remarks?: string;
  } | null;
}

export const UNIT_LABEL: Record<ReadingUnit, string> = { KM: 'km', HOURS: 'hrs', NONE: '' };
/** Expected consumption is litres per reading unit: per hour or per km. */
export const CONSUMPTION_LABEL: Record<ReadingUnit, string> = { KM: 'L/km', HOURS: 'L/hr', NONE: 'L' };

export interface DieselLogRow {
  id: string;
  firmId: string;
  firmName: string;
  siteLocation: string | null;
  machineId: string | null;
  machineName: string | null;
  assetCode: string | null;
  registrationNo: string | null;
  equipmentType: string | null;
  ownershipType: OwnershipType | null;
  consumerLabel: string | null;
  usageLogId: string | null;
  issuedAt: string;
  issueDate: string;
  litres: number;
  meterReading: number | null;
  flags: string[];
  operator: string | null;
  issuedBy: string | null;
  source: 'STORE_ISSUE' | 'DAILY_ENTRY' | 'MANUAL';
  ratePerLitre: number | null;
  amount: number | null;
  externalRef: string | null;
  note: string | null;
  voidedAt: string | null;
  voidReason: string | null;
}

export interface DieselLogQuery {
  firmId?: string | null;
  machineId?: string;
  q?: string;
  from?: string;
  to?: string;
  includeVoided?: boolean;
  limit?: number;
  offset?: number;
}

export interface DieselLogListResponse {
  total: number;
  rows: DieselLogRow[];
}
