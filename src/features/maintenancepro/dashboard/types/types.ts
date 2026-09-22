export interface DashboardStats {
  totalMachines: number;
  maintenanceTasks: number;
  tasksComplete: number;
  tasksPending: number;
  tasksInProgress: number;
  totalCost: number;
}

export interface MachineData {
  id: string;
  name: string;
  department: string;
  status: string;
  manufacturer: string | null;
  purchaseDate: string | null;
  assetCode: string;
  serialNumber: string | null;
}

export interface TaskData {
  id: string | number;
  type: string;
  taskTitle?: string;
  description?: string;
  machineName?: string;
  priority?: string;
  status: string;
  dueDate?: string;
  assignedTo?: string;
  assignedToName?: string;
  department?: string;
}

export interface ChecklistItemData {
  id: string | number;
  task_no?: string;
  description?: string;
  status: string;
  maintenance?: {
    machines?: { name: string };
    assigned_to?: string;
  };
}

export interface DepartmentCostData {
  name: string;
  cost: number;
  machines: number;
  tasks: number;
}

export interface RepairChartData {
  name: string;
  purchasePrice: number;
  repairCost: number;
  status: string;
  department: string;
  purchaseDate?: string;
}

export interface FrequentRepairData {
  name: string;
  repairs: number;
  lastRepair: string;
  cost: number;
}

export interface TaskStatusData {
  name: string;
  value: number;
  color: string;
}

// ── V3 Dashboard types ────────────────────────────────────────────────

export type V3MachineStatus = 'good' | 'warn' | 'critical';
export type V3WOStatus = 'pending' | 'overdue' | 'done' | 'transferred';
export type V3Priority = 'low' | 'normal' | 'urgent' | 'critical';
export type V3OnlineStatus = 'online' | 'busy' | 'offline';

export interface V3Machine {
  id: string;
  assetCode: string;
  name: string;
  line: string;
  health: number;
  lastMaintDays: number | null;
  nextDueDays: number | null;
  frequency: string;
  status: V3MachineStatus;
  pendingTasks: string[];
  overdueTasks: string[];
}

export interface V3Technician {
  id: string;
  name: string;
  role: string;
  color: string;
  onlineStatus: V3OnlineStatus;
  activeTasks: number;
}

export interface V3WorkOrder {
  id: string;
  shortId: string;
  title: string;
  machine: string;
  machineId: string;
  type: string;
  assignee: string;
  assigneeId: string;
  due: string;
  status: V3WOStatus;
  priority: V3Priority;
  notes: string;
  transferred: string | null;
}

export interface V3Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  machineId: string | null;
  timestamp: string;
}

export interface V3LogEntry {
  id: string;
  technicianId: string;
  technicianName: string;
  action: 'completed' | 'transferred' | 'started' | 'created' | 'noted';
  workOrderId: string;
  description: string;
  timestamp: string;
}

export interface V3WeeklyPoint {
  day: string;
  completed: number;
  isToday?: boolean;
}

export interface V3TaskTypePoint {
  type: string;
  label: string;
  count: number;
  color: string;
}

export interface V3KPI {
  totalWorkOrders: number;
  overdueTasks: number;
  completedToday: number;
  completionRate: number;
  criticalMachines: number;
  criticalMachineIds: string[];
  activeTechnicians: number;
  pendingToday: number;
  totalCost: number;
}

export interface V3DashboardPayload {
  machines: V3Machine[];
  workOrders: V3WorkOrder[];
  technicians: V3Technician[];
  alerts: V3Alert[];
  activityLog: V3LogEntry[];
  weeklyCompletion: V3WeeklyPoint[];
  taskTypeBreakdown: V3TaskTypePoint[];
  kpi: V3KPI;
}
