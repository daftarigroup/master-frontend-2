export type DailyTaskStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'PENDING_APPROVAL'
  | 'COMPLETION_REJECTED'
  | 'COMPLETED'
  | 'COMPLETED_LATE'
  | 'OVERDUE'
  | 'ON_LEAVE'
  | 'MISSED'
  | 'SKIPPED'
  | 'CANCELLED'
  | 'ON_HOLD';

export type RealMachineStatus = 'OPERATIONAL' | 'UNDER_MAINTENANCE' | 'BREAKDOWN';

export interface DailyWorkOrder {
  id: string;
  title: string;
  description: string;
  status: DailyTaskStatus;
  machineId: string;
  machineName: string;
  assigneeId: string;
  assignedTo: string;
  dueDate: string;
  type: string;
}

export interface DailyMachine {
  id: string;
  name: string;
  status: RealMachineStatus;
}

export interface DailyReportData {
  workOrders: DailyWorkOrder[];
  machines: DailyMachine[];
}
