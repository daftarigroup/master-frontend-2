import type { ActivityType } from '../../activityTypes/types/types';

export type PlanFrequency =
  | 'ONE_TIME'
  | 'DAILY'
  | 'WEEKLY'
  | 'FORTNIGHTLY'
  | 'ALTERNATE_DAYS'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'HALF_YEARLY'
  | 'YEARLY'
  | 'IN_FIRST_WEEK'
  | 'IN_SECOND_WEEK'
  | 'IN_THIRD_WEEK'
  | 'IN_FOURTH_WEEK'
  | 'RUNNING_HOURS'
  | 'METER_BASED';

export type PlanHolidayAction = 'KEEP' | 'SKIP' | 'SHIFT_NEXT' | 'SHIFT_PREV';

export type PlanStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';

export interface PlanMachine {
  id: string;
  name: string;
  assetCode: string;
  status: string;
}

export interface PlanAssignee {
  id: string;
  name: string;
  email: string;
}

export interface MaintenancePlan {
  id: string;
  planCode?: string;
  tenantId: string;
  machineId: string;
  title: string;
  description: string | null;
  activityType: ActivityType | null;
  machinePart: { id: string; name: string; partNumber: string | null } | null;
  documentUrl: string | null;
  documentMediaId: string | null;
  frequency: PlanFrequency;
  status: PlanStatus;
  priority: number;
  estimatedMinutes: number;
  onHoliday: PlanHolidayAction;
  startDate: string;
  endDate: string | null;
  assignedToId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  machine: PlanMachine | null;
  assignedTo: PlanAssignee | null;
  workOrders?: Array<{
    id: string;
    status: string;
    actualDueDate: string;
    currentAssignee: { id: string; name: string } | null;
  }>;
  _count?: { workOrders: number };
  // Only present in "All Companies" mode
  tenant?: { id: string; name: string } | null;
  // Present only right after creation, when the assignee already has approved
  // leave overlapping part of this recurring plan's schedule — informational,
  // never blocking (see MaintenancePlanService.create).
  notice?: string | null;
}

export interface PlanPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PlansListResponse {
  status: string;
  data: MaintenancePlan[];
  pagination: PlanPagination;
}

export interface CreatePlanDto {
  machineId: string;
  assignedToId: string;
  title: string;
  planCode?: string;
  description?: string;
  activityTypeId?: string;
  machinePartId?: string;
  frequency: PlanFrequency;
  startDate: string;
  endDate?: string;
  priority?: number;
  estimatedMinutes?: number;
  onHoliday?: PlanHolidayAction;
  scheduleConfig?: Record<string, any>;
  triggerAfterHours?: number;
  toleranceHours?: number;
  triggerAfterUnits?: number;
  toleranceUnits?: number;
  creationType?: 'MANUAL' | 'BULK';
  documentUrl?: string;
  documentMediaId?: string;
  isRepair?: boolean;
}

export interface UpdatePlanDto {
  title?: string;
  description?: string;
  activityTypeId?: string;
  machineId?: string;
  machinePartId?: string | null;
  documentUrl?: string;
  documentMediaId?: string;
  startDate?: string;
  priority?: number;
  estimatedMinutes?: number;
  assignedToId?: string;
  onHoliday?: PlanHolidayAction;
  endDate?: string;
  editScope?: 'SINGLE' | 'FUTURE' | 'ALL';
}

export interface PlansQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  machineId?: string;
  frequency?: string;
  status?: string;
}

export const PLAN_STATUS_LABELS: Record<PlanStatus, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  ARCHIVED: 'Archived',
};

export const PLAN_FREQUENCY_LABELS: Record<PlanFrequency, string> = {
  ONE_TIME: 'One Time',
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  FORTNIGHTLY: 'Fortnightly',
  ALTERNATE_DAYS: 'Alternate Days',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  HALF_YEARLY: 'Half Yearly',
  YEARLY: 'Yearly',
  IN_FIRST_WEEK: 'In 1st Week',
  IN_SECOND_WEEK: 'In 2nd Week',
  IN_THIRD_WEEK: 'In 3rd Week',
  IN_FOURTH_WEEK: 'In 4th Week',
  RUNNING_HOURS: 'Running Hours',
  METER_BASED: 'Meter Based',
};
