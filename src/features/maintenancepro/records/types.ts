import type { DerivedStatus, EquipmentCategory, ReadingUnit } from '@/features/asset/equipment/types';

export type DueStatus = 'OVERDUE' | 'DUE_SOON' | 'OK' | 'NOT_SET';
export type DueUnit = 'HOURS' | 'KM' | 'DAYS';
export type ChecklistState = 'PENDING' | 'DONE' | 'ISSUE';
export type ServiceMode = 'IN_HOUSE' | 'VENDOR';

export interface Qty {
  value: number;
  unit: DueUnit;
}

/** The nearest service due for a machine (one definition, computed by the server). */
export interface NextService {
  status: DueStatus;
  scheduleId: string | null;
  scheduleName: string | null;
  left: Qty | null;
  overdueBy: Qty | null;
  nextDueReading: number | null;
  nextDueDate: string | null;
  trigger: 'READING' | 'DATE' | null;
  unit: DueUnit | null;
  missingBaseline: boolean;
}

export interface Person {
  id: string;
  name: string | null;
}

export interface RecordMachineBrief {
  id: string;
  name: string;
  assetCode: string;
  category: EquipmentCategory;
  imageUrl: string | null;
  readingUnit: ReadingUnit;
  capacityLabel: string | null;
  firmId?: string | null;
  firmName?: string | null;
  assignment?: { id?: string; firmId: string; firmName?: string | null } | null;
}

export interface RecordRow {
  machine: RecordMachineBrief;
  status: DerivedStatus;
  currentReading: number | null;
  due: NextService;
  schedules: number;
  openBreakdown: boolean;
  mechanic: Person | null;
}

export interface RecordStats {
  total: number;
  overdue: number;
  dueSoon: number;
  ok: number;
  notSet: number;
  openBreakdowns: number;
}

export interface RecordList {
  today: string;
  stats: RecordStats;
  total: number;
  rows: RecordRow[];
}

export interface RecordListQuery {
  firmId?: string;
  dueStatus?: DueStatus | '';
  q?: string;
  category?: string;
  siteId?: string;
  limit?: number;
  offset?: number;
}

export interface ScheduleLine {
  id: string;
  name: string;
  intervalValue: number | null;
  intervalDays: number | null;
  lastServiceAt: string | null;
  lastServiceReading: number | null;
  nextDueReading: number | null;
  nextDueDate: string | null;
  status: DueStatus;
  missingBaseline: boolean;
}

export interface ChecklistItem {
  id: string;
  text: string;
  state: ChecklistState;
  note: string | null;
}

export interface ChecklistBlock {
  workOrderId: string;
  workOrderCode: string | null;
  status: string;
  items: ChecklistItem[];
  done: number;
  total: number;
  percent: number;
}

export interface Mechanic {
  id: string;
  name: string | null;
  designation: string | null;
  phone: string | null;
}

export interface CostBlock {
  label: 'Est.' | 'Actual';
  total: number | null;
  parts: number | null;
  labour: number | null;
}

export interface OpenServiceWorkOrder {
  id: string;
  code: string | null;
  status: string;
  dueAt: string | null;
  serviceMode: ServiceMode | null;
  vendor: { id: string; name: string } | null;
}

export interface RecordSummary {
  machine: {
    id: string;
    name: string;
    assetCode: string;
    assetId: string | null;
    category: EquipmentCategory;
    imageUrl: string | null;
    ownershipType: 'OWNED' | 'RENTED';
    readingUnit: ReadingUnit;
    capacityLabel: string | null;
    currentReading: number | null;
    status: DerivedStatus;
  };
  nextService: NextService;
  schedules: ScheduleLine[];
  checklist: ChecklistBlock | null;
  breakdown: { reported: boolean; reportedAt: string | null; id: string | null; status: string | null; severity: string | null; workOrderId: string | null };
  mechanic: Mechanic | null;
  responsible: Person | null;
  openServiceWorkOrder: OpenServiceWorkOrder | null;
  /** present only for users with cost access; null when there is nothing to cost yet */
  cost?: CostBlock | null;
  canScheduleService: boolean;
  canManageSchedules: boolean;
}

export interface HistoryRow {
  id: string;
  code: string | null;
  type: string;
  title: string;
  completedAt: string | null;
  readingAtService: number | null;
  serviceMode: ServiceMode | null;
  vendor: { id: string; name: string; phone: string | null } | null;
  billNo: string | null;
  billUrl: string | null;
  mechanic: string | null;
  parts: number;
  cost?: number | null;
  actualPartsCost?: number | null;
  actualLabourCost?: number | null;
  estPartsCost?: number | null;
  estLabourCost?: number | null;
}

export interface HistoryPage {
  total: number;
  rows: HistoryRow[];
}

export interface PartRow {
  id: string;
  partName: string;
  quantity: number;
  vendorName: string | null;
  warrantyFromDate: string | null;
  warrantyToDate: string | null;
  workOrder: { id: string; code: string | null; title: string };
  date: string;
  unitCost?: number | null;
}

export interface ScheduleRow {
  id: string;
  machineId: string;
  name: string;
  intervalValue: number | null;
  intervalDays: number | null;
  leadValue: number | null;
  leadDays: number | null;
  lastServiceAt: string | null;
  lastServiceReading: number | null;
  checklistTemplate: { id: string; name: string } | null;
  isActive: boolean;
}

export interface ScheduleBody {
  name: string;
  intervalValue?: number | null;
  intervalDays?: number | null;
  leadValue?: number | null;
  leadDays?: number | null;
  lastServiceAt?: string | null;
  lastServiceReading?: number | null;
  checklistTemplateId?: string | null;
  isActive?: boolean;
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  isActive: boolean;
  items: Array<{ id: string; text: string; sortOrder: number }>;
}

export interface ScheduleServiceBody {
  dueAt?: string;
  assigneeId?: string;
  responsibleId?: string;
  estPartsCost?: number;
  estLabourCost?: number;
  serviceMode?: ServiceMode;
  vendorId?: string;
}

export interface ScheduledWorkOrder {
  id: string;
  workOrderCode?: string;
}

export interface AddPartBody {
  partName: string;
  quantity: number;
  unitCost?: number;
  vendorName?: string;
  warrantyFromDate?: string;
  warrantyToDate?: string;
}

