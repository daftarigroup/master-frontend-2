import type { DerivedStatus, EquipmentCategory, SortKey } from '../types';

export const CATEGORY_LABEL: Record<EquipmentCategory, string> = {
  EXCAVATOR: 'Excavator',
  BACKHOE_LOADER: 'Backhoe Loader',
  TIPPER: 'Tipper',
  TRUCK: 'Truck',
  TRANSIT_MIXER: 'Concrete Mixer',
  ROLLER: 'Roller',
  TRACTOR: 'Tractor',
  WATER_PUMP: 'Water Pump',
  DG_SET: 'DG Set',
  CAR: 'Car',
  OTHER: 'Other',
  LOADER: 'Wheel Loader',
  DOZER: 'Dozer',
  GRADER: 'Motor Grader',
  CRANE: 'Crane',
  CONCRETE_PUMP: 'Concrete Pump',
  BATCHING_PLANT: 'Batching Plant',
  COMPRESSOR: 'Air Compressor',
  WATER_TANKER: 'Water Tanker',
};

export type DocPillStatus = 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'LATEST' | 'NO_EXPIRY';
export const DOC_PILL_LABEL: Record<DocPillStatus, string> = { VALID: 'Valid', EXPIRING_SOON: 'Expiring Soon', EXPIRED: 'Expired', LATEST: 'Latest', NO_EXPIRY: 'No expiry' };

export const STATUS_LABEL: Record<DerivedStatus, string> = {
  IN_USE: 'In Use',
  IDLE: 'Idle',
  UNDER_MAINT: 'Under Maint.',
  AVAILABLE: 'Available',
  IN_TRANSIT: 'In Transit',
};

export const SORT_LABEL: Record<SortKey, string> = {
  code: 'Asset Code',
  name: 'Name',
  utilization: 'Utilization',
  status: 'Status',
  recent: 'Recently added',
  site: 'Site',
};

export const OWNERSHIP_LABEL = { OWNED: 'Owned', RENTED: 'Rented' } as const;
