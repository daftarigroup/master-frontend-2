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
};

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
