import type { DerivedStatus, EquipmentCategory, OwnershipFilter, ReadingUnit } from '../equipment/types';

export type TileStatus = 'OK' | 'ESTIMATED' | 'PARTIAL' | 'NO_RATE' | 'INCLUDED' | 'INVOICED' | 'NOT_APPLICABLE';
export type CostCategory = 'fuel' | 'maintenance' | 'rental' | 'other';
export type RateBasis = 'HOUR' | 'DAY' | 'MONTH' | 'KM';
export type RateType = 'INTERNAL_HOURLY' | 'RENTAL';
export type EntryCategory = 'OPERATOR' | 'TRANSPORT' | 'INSURANCE' | 'CONSUMABLES' | 'RENTAL_INVOICE' | 'OTHER';
export type LogKind = 'usage' | 'diesel' | 'maintenance' | 'entries' | 'rates';

/** Direction-aware change vs the comparison period. `tone` already accounts for "more spend is bad". */
export interface Delta {
  kind: 'percent' | 'points';
  value: number | null;
  direction: 'up' | 'down' | 'flat' | null;
  tone: 'good' | 'bad' | 'neutral';
}

export interface Tile {
  amount: number | null;
  status: TileStatus;
  share: number | null;
}

export interface WbsRow {
  wbsActivityId: string | null;
  code: string | null;
  name: string;
  hours: number;
  fuel: number | null;
  maintenance: number | null;
  rental: number | null;
  other: number | null;
  total: number | null;
  costPerUnit: number | null;
  percentOfSpend: number | null;
}

export interface Completeness {
  missingInternalRate: boolean;
  missingRentalRate: boolean;
  rentalNotInvoiced: boolean;
  unpricedDieselLogs: number;
  estimatedDieselLogs: number;
  untaggedHours: number;
  openUsageEntries: number;
  complete: boolean;
}

export interface MachineCost {
  machine: {
    id: string;
    firmId: string | null;
    name: string;
    assetCode: string;
    category: EquipmentCategory;
    imageUrl: string | null;
    site: string | null;
    ownershipType: OwnershipFilter;
    hireType: 'DRY' | 'WET' | null;
    vendor: string | null;
    rentalStartAt: string | null;
    rentalEndAt: string | null;
    readingUnit: ReadingUnit;
    lifetimeReading: number;
    status: DerivedStatus;
  };
  month: string;
  filters: { category: string | null; wbsId: string | null };
  period: { from: string; to: string };
  tiles: { fuel: Tile; maintenance: Tile; rental: Tile; other: Tile; total: number };
  rental: { applicable: boolean; status: TileStatus; source: 'COMPUTED' | 'INVOICED' | null; estimatedAmount: number | null; invoicedAmount: number | null; uncovered: boolean };
  usage: { quantity: number; unit: 'Hrs' | 'km' | null; entries: number };
  utilization: { percent: number | null; overShift: boolean; workingDays: number; availableHours: number | null };
  metrics: {
    referenceRate: { amount: number | null; basis: RateBasis } | null;
    chargeOutValue: number | null;
    costPerUnit: number | null;
    efficiency: { value: number | null; unit: 'L/hr' | 'km/L' | null; litres: number; usage: number; entries: number };
  };
  wbs: { rows: WbsRow[]; totals: WbsRow };
  completeness: Completeness;
  comparison: {
    label: string;
    likeForLike: boolean;
    totalSpend: Delta;
    totalHours: Delta;
    utilization: Delta;
    costByCategory: Record<CostCategory, Delta>;
    previous: { total: number | null; hours: number; utilization: number | null };
  };
}

export interface TrendPoint {
  month: string;
  fuel: number | null;
  maintenance: number | null;
  rental: number | null;
  other: number | null;
  total: number | null;
  hours: number;
}

export interface FleetRow {
  machineId: string;
  name: string;
  assetCode: string;
  category: EquipmentCategory;
  ownershipType: OwnershipFilter;
  site: string | null;
  spend: number | null;
  spendDelta: Delta;
  hours: number;
  unit: 'Hrs' | 'km' | null;
  costPerUnit: number | null;
  efficiency: { value: number; unit: 'L/hr' | 'km/L' | null } | null;
  utilization: number | null;
  utilizationDelta: Delta;
  dataComplete: boolean;
}

export interface FleetCosts {
  month: string;
  comparison: { label: string; likeForLike: boolean };
  kpis: {
    totalSpend: number | null;
    categories: Record<CostCategory, number | null>;
    shares: Record<CostCategory, number> | null;
    hours: number;
    costPerHour: number | null;
    utilization: number | null;
    machines: number;
    deltas: { spend: Delta; hours: Delta; utilization: Delta };
  };
  total: number;
  rows: FleetRow[];
  wbsRollup: Array<{ wbsActivityId: string | null; code: string | null; name: string; hours: number; total: number | null }>;
}

export interface UsageLogRow { id: string; date: string; startReading: number | null; stopReading: number | null; usage: number | null; wbsActivityId: string | null; counted: boolean }
export interface DieselLogRow { id: string; date: string; litres: number | null; ratePerLitre: number | null; amount: number | null; rateSource: string | null; wbsActivityId: string | null; usageLogId: string | null }
export interface MaintenanceRowDto { workOrderId: string; code: string | null; type: string | null; outsourceStatus: string | null; date: string; amount: number | null }
export interface EntryRow { id: string; date: string; category: EntryCategory; amount: number | null; description: string | null; attachmentUrl: string | null; wbsActivityId: string | null }
export interface RateRow {
  id: string;
  rateType: RateType;
  basis: RateBasis;
  amount: number | null;
  minBillableQty: number | null;
  extraRate: number | null;
  deductBreakdownDays: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  note: string | null;
}
export interface LogRows {
  usage: UsageLogRow[];
  diesel: DieselLogRow[];
  maintenance: MaintenanceRowDto[];
  entries: EntryRow[];
  rates: RateRow[];
}

export interface WbsActivity { id: string; firmId: string; code: string; name: string; parentId: string | null; status: 'ACTIVE' | 'CLOSED'; siteLocationId: string | null }

export interface CreateRateBody {
  rateType: RateType;
  basis: RateBasis;
  amount: number;
  minBillableQty?: number | null;
  extraRate?: number | null;
  deductBreakdownDays?: boolean;
  effectiveFrom: string;
  note?: string | null;
}
export interface CreateEntryBody {
  machineId: string;
  costDate: string;
  category: EntryCategory;
  amount: number;
  wbsActivityId?: string | null;
  description?: string | null;
}
