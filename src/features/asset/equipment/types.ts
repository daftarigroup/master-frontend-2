export type DerivedStatus = 'IN_USE' | 'IDLE' | 'UNDER_MAINT' | 'AVAILABLE' | 'IN_TRANSIT';
export type OwnershipFilter = 'OWNED' | 'RENTED';
export type ReadingUnit = 'HOURS' | 'KM' | 'NONE';

export const EQUIPMENT_CATEGORIES = [
  'EXCAVATOR', 'BACKHOE_LOADER', 'TIPPER', 'TRUCK', 'TRANSIT_MIXER', 'ROLLER', 'TRACTOR', 'WATER_PUMP', 'DG_SET', 'CAR', 'OTHER',
  'LOADER', 'DOZER', 'GRADER', 'CRANE', 'CONCRETE_PUMP', 'BATCHING_PLANT', 'COMPRESSOR', 'WATER_TANKER',
] as const;
export type EquipmentCategory = (typeof EQUIPMENT_CATEGORIES)[number];

export type SortKey = 'code' | 'name' | 'utilization' | 'status' | 'recent' | 'site';

/** One equipment row from GET /fleet/equipment. The cost fields are absent (not null) for users without cost access. */
export interface EquipmentItem {
  id: string;
  name: string;
  assetCode: string;
  /** The linked Asset record (its detail page), when the machine has one. */
  assetId: string | null;
  registrationNo: string | null;
  category: EquipmentCategory;
  imageUrl: string | null;
  ownershipType: OwnershipFilter;
  hireType: 'DRY' | 'WET' | null;
  vendor: string | null;
  site: string | null;
  siteId: string | null;
  firmId: string | null;
  firmName?: string | null;
  readingUnit: ReadingUnit;
  status: DerivedStatus;
  utilization: { percent: number | null; overShift: boolean };
  hoursThisMonth: number | null;
  unit: 'Hrs' | 'km' | null;
  lastActivityDate: string | null;
  lastDieselDate: string | null;
  lastReading: number | null;
  efficiency: { value: number; unit: 'L/hr' | 'km/L' | null } | null;
  createdAt: string;
  monthSpend?: number | null;
  dataComplete?: boolean;
}

export interface EquipmentStats {
  total: number;
  inUse: number;
  underMaint: number;
  /** Idle + Available: the Idle tile and its filter cover both */
  idle: number;
  available?: number;
  /** shown as its own tile only when a machine is on the road */
  inTransit?: number;
  owned: number;
  rented: number;
  fleetUtilization: number | null;
  fleetSpend?: number | null;
}

export interface EquipmentList {
  month: string;
  stats: EquipmentStats;
  total: number;
  items: EquipmentItem[];
}

export interface EquipmentSummary extends EquipmentItem {
  openingReading: number | null;
  rentalStartAt: string | null;
  rentalEndAt: string | null;
}

export interface EquipmentFilters {
  q: string;
  category: EquipmentCategory | '';
  ownership: OwnershipFilter | '';
  status: DerivedStatus | '';
  siteId: string;
  vendor: string;
  sort: SortKey;
  dir: 'asc' | 'desc';
}
