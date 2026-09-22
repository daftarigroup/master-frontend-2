import { api } from '@/lib/axios';
import { PLAN_FREQUENCY_LABELS } from '../../../plans/types/types';
import type {
  ChecklistItemData,
  DashboardStats,
  MachineData,
  TaskData,
  V3Alert,
  V3DashboardPayload,
  V3LogEntry,
  V3Machine,
  V3MachineStatus,
  V3Priority,
  V3TaskTypePoint,
  V3Technician,
  V3WeeklyPoint,
  V3WOStatus,
  V3WorkOrder,
} from '../../types/types';

export interface MachineListResponse {
  data: MachineData[];
  total: number;
}

export interface TaskListResponse {
  data: TaskData[];
  total: number;
}

export const fetchAllMachines = async (): Promise<MachineListResponse> => {
  const res = await api.get('/maintenance/machines', { params: { page: 1, limit: 100 } });
  const items: any[] = res.data?.data ?? [];
  const data: MachineData[] = items.map((m) => ({
    id: m.id,
    name: m.name,
    department: m.department?.name ?? 'Unknown',
    status: m.status,
    manufacturer: m.manufacturer ?? null,
    purchaseDate: m.purchaseDate ?? null,
    assetCode: m.assetCode,
    serialNumber: m.serialNumber ?? null,
  }));
  return { data, total: res.data?.pagination?.total ?? data.length };
};

export const fetchDashboardSummary = async (): Promise<DashboardStats> => {
  try {
    const [machinesRes, plansRes, woRes] = await Promise.all([
      api.get('/maintenance/machines', { params: { page: 1, limit: 1 } }),
      api.get('/maintenance/plans', { params: { page: 1, limit: 1, status: 'ACTIVE' } }),
      api
        .get('/maintenance/work-orders', { params: { page: 1, limit: 1 } })
        .catch(() => ({ data: null })),
    ]);

    const totalMachines: number = machinesRes.data?.pagination?.total ?? 0;
    const maintenanceTasks: number = plansRes.data?.pagination?.total ?? 0;
    const wos: any[] = woRes.data?.data ?? [];

    return {
      totalMachines,
      maintenanceTasks,
      tasksComplete: wos.filter(
        (w: any) => w.status === 'COMPLETED' || w.status === 'COMPLETED_LATE'
      ).length,
      tasksPending: wos.filter((w: any) => w.status === 'PENDING').length,
      tasksInProgress: wos.filter((w: any) => w.status === 'IN_PROGRESS').length,
      totalCost: 0,
    };
  } catch {
    return {
      totalMachines: 0,
      maintenanceTasks: 0,
      tasksComplete: 0,
      tasksPending: 0,
      tasksInProgress: 0,
      totalCost: 0,
    };
  }
};

export const fetchAllTasks = async (): Promise<TaskListResponse> => {
  try {
    const res = await api
      .get('/maintenance/work-orders', { params: { page: 1, limit: 100 } })
      .catch(() => null);
    if (!res) {
      // Fall back to listing active plans as tasks
      const plansRes = await api.get('/maintenance/plans', {
        params: { page: 1, limit: 100, status: 'ACTIVE' },
      });
      const plans: any[] = plansRes.data?.data ?? [];
      const tasks: TaskData[] = plans.map((plan: any) => ({
        id: plan.id,
        type: 'Maintenance',
        taskTitle: plan.title,
        description: plan.description ?? '',
        machineName: plan.machine?.name ?? plan.machineId,
        priority:
          plan.priority === 1
            ? 'Critical'
            : plan.priority === 2
              ? 'High'
              : plan.priority === 3
                ? 'Medium'
                : 'Low',
        status: plan.status === 'ACTIVE' ? 'pending' : plan.status.toLowerCase(),
        dueDate: plan.startDate,
        assignedTo: plan.assignedTo?.name ?? plan.assignedToId,
        department: plan.machine?.name ?? '',
      }));
      return { data: tasks, total: tasks.length };
    }

    const wos: any[] = res.data?.data ?? [];
    const tasks: TaskData[] = wos.map((wo: any) => ({
      id: wo.id,
      type: wo.type ?? 'Maintenance',
      taskTitle: wo.plan?.title ?? 'Work Order',
      description: wo.plan?.activityType?.name ?? '',
      machineName: wo.machine?.name ?? wo.machineId,
      priority:
        wo.priority === 1
          ? 'Critical'
          : wo.priority === 2
            ? 'High'
            : wo.priority === 3
              ? 'Medium'
              : 'Low',
      status: (wo.status as string).toLowerCase(),
      dueDate: wo.actualDueDate ?? wo.scheduledDate,
      assignedTo: wo.currentAssignee?.name ?? wo.currentAssigneeId,
      department: wo.machine?.department?.name ?? '',
    }));
    return { data: tasks, total: res.data?.pagination?.total ?? tasks.length };
  } catch {
    return { data: [], total: 0 };
  }
};

// ── V3 Dashboard ─────────────────────────────────────────────────────

const TECH_COLORS = [
  '#E8500A',
  '#2563EB',
  '#16A34A',
  '#7C3AED',
  '#D97706',
  '#0891B2',
  '#BE185D',
  '#15803D',
];

const TASK_TYPE_COLORS: Record<string, string> = {
  cleaning: '#0369A1',
  lubrication: '#A16207',
  inspection: '#7C3AED',
  oil: '#E8500A',
  filter: '#15803D',
  calibration: '#475569',
  bearing: '#B91C1C',
  electrical: '#1D4ED8',
  repair: '#B91C1C',
  replacement: '#15803D',
  overhaul: '#7C3AED',
  other: '#475569',
};

const TASK_TYPE_LABELS: Record<string, string> = {
  cleaning: 'Cleaning',
  lubrication: 'Lubrication',
  inspection: 'Inspection',
  oil: 'Oil Change',
  filter: 'Filter Repl.',
  calibration: 'Calibration',
  bearing: 'Bearing',
  electrical: 'Electrical',
  repair: 'Repair',
  replacement: 'Replacement',
  overhaul: 'Overhaul',
  other: 'Other',
};

const initialsFromName = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return (parts[0]?.slice(0, 2) ?? '??').toUpperCase();
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
};

const mapPriority = (p: number | null | undefined): V3Priority => {
  if (p === 1) return 'critical';
  if (p === 2) return 'urgent';
  if (p === 4) return 'low';
  return 'normal';
};

// Due dates are stored as IST midnight (e.g. 2026-08-06T18:30:00.000Z for
// Aug 7 IST) — comparing that raw instant against `Date.now()` makes every
// task due *today* read as overdue the moment any time at all has passed
// since midnight IST, since the stored instant is always "yesterday" in UTC.
// Must compare IST calendar days instead. Asia/Kolkata has no DST, so a fixed
// +5:30 offset is always correct here (same approach as unique_task's
// istDateKey / WorkOrderService's overdue check).
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
function istDateKey(d: Date) {
  const shifted = new Date(d.getTime() + IST_OFFSET_MS);
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(
    shifted.getUTCDate()
  ).padStart(2, '0')}`;
}

const mapWOStatus = (
  status: string,
  actualDueDate: string | null | undefined,
  hasTransfer: boolean
): V3WOStatus => {
  const upper = String(status).toUpperCase();
  if (upper === 'COMPLETED' || upper === 'COMPLETED_LATE' || upper === 'PENDING_APPROVAL') {
    return 'done';
  }
  if (hasTransfer && upper !== 'COMPLETED' && upper !== 'COMPLETED_LATE') return 'transferred';
  if (actualDueDate) {
    const due = new Date(actualDueDate);
    if (!Number.isNaN(due.getTime()) && istDateKey(due) < istDateKey(new Date())) {
      return 'overdue';
    }
  }
  return 'pending';
};

const mapActivityType = (
  rawType: string | null | undefined,
  planActivityType?: string | null
): string => {
  const t = String(rawType ?? planActivityType ?? 'OTHER').toUpperCase();
  switch (t) {
    case 'LUBRICATION':
      return 'lubrication';
    case 'CLEANING':
      return 'cleaning';
    case 'INSPECTION':
      return 'inspection';
    case 'CALIBRATION':
      return 'calibration';
    case 'REPAIR':
      return 'repair';
    case 'REPLACEMENT':
      return 'filter';
    case 'OVERHAUL':
      return 'overhaul';
    default:
      return (rawType ?? 'other').toString().toLowerCase();
  }
};

const daysBetween = (a: number, b: number): number => Math.round((a - b) / (1000 * 60 * 60 * 24));

const buildMachineDerived = (
  machineId: string,
  workOrders: V3WorkOrder[],
  rawCompleted: { machineId: string; completedAt: number }[],
  rawPending: { machineId: string; due: number }[]
): {
  health: number;
  lastMaintDays: number | null;
  nextDueDays: number | null;
  status: V3MachineStatus;
  pendingTasks: string[];
  overdueTasks: string[];
} => {
  const now = Date.now();
  const machineWOs = workOrders.filter((w) => w.machineId === machineId);
  const overdueWOs = machineWOs.filter((w) => w.status === 'overdue');
  const pendingWOs = machineWOs.filter((w) => w.status === 'pending' || w.status === 'overdue');

  const completed = rawCompleted.filter((c) => c.machineId === machineId);
  const lastDate = completed.length ? Math.max(...completed.map((c) => c.completedAt)) : null;
  const lastMaintDays = lastDate ? Math.max(0, daysBetween(now, lastDate)) : null;

  const pending = rawPending.filter((p) => p.machineId === machineId);
  const nextDate = pending.length ? Math.min(...pending.map((p) => p.due)) : null;
  const nextDueDays = nextDate ? daysBetween(nextDate, now) : null;

  let health = 100 - overdueWOs.length * 20 - Math.min(60, (lastMaintDays ?? 0) * 1.2);
  if (nextDueDays !== null && nextDueDays > 7) health += 10;
  health = Math.max(0, Math.min(100, Math.round(health)));

  const status: V3MachineStatus = health < 40 ? 'critical' : health < 75 ? 'warn' : 'good';

  const pendingTaskTypes = Array.from(
    new Set(pendingWOs.map((w) => TASK_TYPE_LABELS[w.type] ?? w.type))
  );
  const overdueTaskTypes = Array.from(
    new Set(overdueWOs.map((w) => TASK_TYPE_LABELS[w.type] ?? w.type))
  );

  return {
    health,
    lastMaintDays,
    nextDueDays,
    status,
    pendingTasks: pendingTaskTypes,
    overdueTasks: overdueTaskTypes,
  };
};

export const fetchMaintenanceDashboardV3 = async (
  from?: string,
  to?: string
): Promise<V3DashboardPayload> => {
  const woParams: Record<string, unknown> = { page: 1, limit: 500 };
  if (from) woParams.from = from;
  if (to) woParams.to = to;

  const [machinesRes, woRes, usersRes] = await Promise.all([
    api.get('/maintenance/machines', { params: { page: 1, limit: 200 } }).catch(() => null),
    api.get('/maintenance/work-orders', { params: woParams }).catch(() => null),
    api.get('/user/list').catch(() => null),
  ]);

  const rawMachines: any[] = machinesRes?.data?.data ?? [];
  const rawWOs: any[] = woRes?.data?.data ?? [];
  const rawUsers: any[] = usersRes?.data?.data ?? [];

  // ── Technicians ─────────────────────────────────────────────────────
  const techActiveCount: Record<string, number> = {};
  for (const wo of rawWOs) {
    const status = String(wo.status).toUpperCase();
    const aid = wo.currentAssigneeId;
    if (!aid) continue;
    if (status !== 'COMPLETED' && status !== 'COMPLETED_LATE' && status !== 'CANCELLED') {
      techActiveCount[aid] = (techActiveCount[aid] ?? 0) + 1;
    }
  }

  const technicians: V3Technician[] = rawUsers.map((u: any, idx: number) => {
    const active = techActiveCount[u.id] ?? 0;
    const onlineStatus = active >= 4 ? 'busy' : active === 0 ? 'offline' : 'online';
    return {
      id: initialsFromName(u.name ?? u.email ?? 'U U'),
      name: u.name ?? 'Unknown',
      role: u.role ?? 'Technician',
      color: TECH_COLORS[idx % TECH_COLORS.length] ?? '#475569',
      onlineStatus,
      activeTasks: active,
    };
  });
  const techByUserId: Record<string, V3Technician> = {};
  rawUsers.forEach((u: any, i: number) => {
    const t = technicians[i];
    if (t) techByUserId[u.id] = t;
  });

  // ── Work Orders ─────────────────────────────────────────────────────
  const workOrders: V3WorkOrder[] = rawWOs.map((wo: any, idx: number) => {
    const due = wo.actualDueDate ?? wo.scheduledDate ?? null;
    const hasTransfer = Boolean(wo.lastTransferAt) || Boolean(wo.transferredFromId);
    const v3status = mapWOStatus(wo.status, due, hasTransfer);
    const tech = wo.currentAssigneeId ? techByUserId[wo.currentAssigneeId] : null;
    const planTitle = wo.plan?.title ?? 'Work Order';
    const machineName = wo.machine?.name ?? 'Unknown';
    const assetCode = wo.machine?.assetCode ?? wo.machineId ?? '';
    return {
      id: wo.id,
      shortId: `WO-${String(idx + 1).padStart(3, '0')}`,
      title: `${planTitle} — ${machineName}${assetCode ? ` ${assetCode}` : ''}`,
      machine: `${machineName}${assetCode ? ` ${assetCode}` : ''}`,
      machineId: wo.machineId,
      type: mapActivityType(wo.type, wo.plan?.activityType?.code ?? wo.plan?.activityType?.name),
      assignee: wo.currentAssignee?.name ?? 'Unassigned',
      assigneeId: tech?.id ?? '',
      due: due ?? '',
      status: v3status,
      priority: mapPriority(wo.priority),
      notes: wo.completionNote ?? wo.plan?.activityType?.name ?? '',
      transferred: hasTransfer ? (wo.currentAssignee?.name ?? null) : null,
    };
  });

  // ── Machines ────────────────────────────────────────────────────────
  const completedSamples = rawWOs
    .filter(
      (w) =>
        (String(w.status).toUpperCase() === 'COMPLETED' ||
          String(w.status).toUpperCase() === 'COMPLETED_LATE') &&
        w.completedAt
    )
    .map((w) => ({ machineId: w.machineId, completedAt: new Date(w.completedAt).getTime() }));
  const pendingSamples = rawWOs
    .filter(
      (w) =>
        String(w.status).toUpperCase() !== 'COMPLETED' &&
        String(w.status).toUpperCase() !== 'COMPLETED_LATE' &&
        String(w.status).toUpperCase() !== 'CANCELLED' &&
        (w.actualDueDate ?? w.scheduledDate)
    )
    .map((w) => ({
      machineId: w.machineId,
      due: new Date(w.actualDueDate ?? w.scheduledDate).getTime(),
    }));

  const machines: V3Machine[] = rawMachines.map((m: any) => {
    const derived = buildMachineDerived(m.id, workOrders, completedSamples, pendingSamples);
    const backendStatus = String(m.status).toUpperCase();
    const status: V3MachineStatus =
      backendStatus === 'BREAKDOWN'
        ? 'critical'
        : backendStatus === 'UNDER_MAINTENANCE'
          ? derived.status === 'critical'
            ? 'critical'
            : 'warn'
          : derived.status;

    return {
      id: m.id,
      assetCode: m.assetCode ?? m.id,
      name: m.name,
      line: m.department?.name ?? m.location ?? '—',
      health: derived.health,
      lastMaintDays: derived.lastMaintDays,
      nextDueDays: derived.nextDueDays,
      frequency: PLAN_FREQUENCY_LABELS[m.frequency as keyof typeof PLAN_FREQUENCY_LABELS] ?? '—',
      status,
      pendingTasks: derived.pendingTasks,
      overdueTasks: derived.overdueTasks,
    };
  });

  // ── KPI ─────────────────────────────────────────────────────────────
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setHours(23, 59, 59, 999);

  const completedToday = rawWOs.filter((w) => {
    const upper = String(w.status).toUpperCase();
    if (upper !== 'COMPLETED' && upper !== 'COMPLETED_LATE') return false;
    if (!w.completedAt) return false;
    const t = new Date(w.completedAt).getTime();
    return t >= startOfToday.getTime() && t <= endOfToday.getTime();
  }).length;

  const overdue = workOrders.filter((w) => w.status === 'overdue').length;
  const pendingToday = rawWOs.filter((w) => {
    const upper = String(w.status).toUpperCase();
    if (upper === 'COMPLETED' || upper === 'COMPLETED_LATE' || upper === 'CANCELLED') return false;
    const due = w.actualDueDate ?? w.scheduledDate;
    if (!due) return false;
    const t = new Date(due).getTime();
    return t <= endOfToday.getTime();
  }).length;

  const criticalMachines = machines.filter((m) => m.status === 'critical');
  const totalDone = workOrders.filter((w) => w.status === 'done').length;
  const completionRate =
    workOrders.length > 0 ? Math.round((totalDone / workOrders.length) * 100) : 0;

  // Repair vendor bill amounts are recorded on the work order's checklistResponses
  // (WorkOrderService.processRepair -> repairProcess.maintenanceCost) — not a DB column.
  const totalCost = rawWOs.reduce((sum, w) => {
    const cost = w.checklistResponses?.repairProcess?.maintenanceCost;
    return sum + (typeof cost === 'number' ? cost : 0);
  }, 0);

  const kpi = {
    totalWorkOrders: workOrders.length,
    overdueTasks: overdue,
    completedToday,
    completionRate,
    criticalMachines: criticalMachines.length,
    criticalMachineIds: criticalMachines.map((m) => m.assetCode),
    activeTechnicians: technicians.filter((t) => t.onlineStatus !== 'offline').length,
    pendingToday,
    totalCost,
  };

  // ── Alerts ──────────────────────────────────────────────────────────
  const alerts: V3Alert[] = [];
  for (const m of machines) {
    if (m.lastMaintDays !== null && m.lastMaintDays > 30) {
      alerts.push({
        id: `ALT-${m.id}-stale`,
        severity: 'critical',
        message: `${m.name} ${m.assetCode} has not been maintained for ${m.lastMaintDays} days.`,
        machineId: m.assetCode,
        timestamp: 'Today',
      });
    }
  }
  for (const w of workOrders) {
    if (w.status !== 'overdue' || !w.due) continue;
    const daysOverdue = daysBetween(Date.now(), new Date(w.due).getTime());
    if (daysOverdue > 7) {
      alerts.push({
        id: `ALT-${w.id}-late`,
        severity: 'critical',
        message: `${w.title} is ${daysOverdue} days overdue.`,
        machineId: w.machineId,
        timestamp: w.due,
      });
    } else if (daysOverdue >= 3) {
      alerts.push({
        id: `ALT-${w.id}-late`,
        severity: 'warning',
        message: `${w.title} is ${daysOverdue} days overdue.`,
        machineId: w.machineId,
        timestamp: w.due,
      });
    }
  }
  alerts.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 } as const;
    return order[a.severity] - order[b.severity];
  });

  // ── Activity Log ────────────────────────────────────────────────────
  const formatRelative = (iso: string): string => {
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return iso;
    const diff = Date.now() - t;
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min} min ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ${min % 60}m ago`;
    const day = Math.floor(hr / 24);
    if (day === 1) return 'Yesterday';
    return `${day}d ago`;
  };

  const recentEventsRaw: { entry: V3LogEntry; sortAt: number }[] = [];
  for (const wo of rawWOs) {
    const upper = String(wo.status).toUpperCase();
    const tech = wo.currentAssigneeId ? techByUserId[wo.currentAssigneeId] : null;
    if (!tech) continue;

    if ((upper === 'COMPLETED' || upper === 'COMPLETED_LATE') && wo.completedAt) {
      recentEventsRaw.push({
        entry: {
          id: `LOG-${wo.id}-c`,
          technicianId: tech.id,
          technicianName: tech.name,
          action: 'completed',
          workOrderId: wo.id.slice(0, 8),
          description: `Completed ${wo.plan?.title ?? 'Work Order'} on ${wo.machine?.name ?? ''}`,
          timestamp: formatRelative(wo.completedAt),
        },
        sortAt: new Date(wo.completedAt).getTime(),
      });
    } else if (upper === 'IN_PROGRESS' && wo.startedAt) {
      recentEventsRaw.push({
        entry: {
          id: `LOG-${wo.id}-s`,
          technicianId: tech.id,
          technicianName: tech.name,
          action: 'started',
          workOrderId: wo.id.slice(0, 8),
          description: `Started ${wo.plan?.title ?? 'Work Order'} on ${wo.machine?.name ?? ''}`,
          timestamp: formatRelative(wo.startedAt),
        },
        sortAt: new Date(wo.startedAt).getTime(),
      });
    } else if (wo.lastTransferAt) {
      recentEventsRaw.push({
        entry: {
          id: `LOG-${wo.id}-t`,
          technicianId: tech.id,
          technicianName: tech.name,
          action: 'transferred',
          workOrderId: wo.id.slice(0, 8),
          description: `Transferred ${wo.plan?.title ?? 'Work Order'} (${wo.machine?.name ?? ''})`,
          timestamp: formatRelative(wo.lastTransferAt),
        },
        sortAt: new Date(wo.lastTransferAt).getTime(),
      });
    }
  }
  recentEventsRaw.sort((a, b) => b.sortAt - a.sortAt);
  const activityLog = recentEventsRaw.slice(0, 8).map((e) => e.entry);

  // ── Weekly Completion ───────────────────────────────────────────────
  const weeklyCompletion: V3WeeklyPoint[] = [];
  const todayDow = new Date().getDay(); // 0=Sun
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  for (let i = 0; i < 7; i++) {
    const dayStart = new Date(startOfWeek);
    dayStart.setDate(startOfWeek.getDate() + i);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    const count = rawWOs.filter((w) => {
      const upper = String(w.status).toUpperCase();
      if (upper !== 'COMPLETED' && upper !== 'COMPLETED_LATE') return false;
      if (!w.completedAt) return false;
      const t = new Date(w.completedAt).getTime();
      return t >= dayStart.getTime() && t <= dayEnd.getTime();
    }).length;
    weeklyCompletion.push({
      day: dayNames[i] ?? '',
      completed: count,
      isToday: i === todayDow,
    });
  }
  // Reorder to start with Monday for display preference
  const reordered = [...weeklyCompletion.slice(1), weeklyCompletion[0]!];

  // ── Task Type Breakdown ─────────────────────────────────────────────
  const typeCounts: Record<string, number> = {};
  for (const w of workOrders) {
    if (w.status === 'done') continue;
    typeCounts[w.type] = (typeCounts[w.type] ?? 0) + 1;
  }
  const taskTypeBreakdown: V3TaskTypePoint[] = Object.entries(typeCounts)
    .map(([type, count]) => ({
      type,
      label: TASK_TYPE_LABELS[type] ?? type,
      count,
      color: TASK_TYPE_COLORS[type] ?? '#475569',
    }))
    .sort((a, b) => b.count - a.count);

  return {
    machines,
    workOrders,
    technicians,
    alerts,
    activityLog,
    weeklyCompletion: reordered,
    taskTypeBreakdown,
    kpi,
  };
};

export const fetchAllMaintenanceChecklistItems = async (): Promise<ChecklistItemData[]> => {
  try {
    const res = await api
      .get('/maintenance/work-orders', { params: { page: 1, limit: 100 } })
      .catch(() => null);
    if (!res) return [];

    const wos: any[] = res.data?.data ?? [];
    return wos.map((wo: any, idx: number) => ({
      id: wo.id,
      task_no: `WO-${String(idx + 1).padStart(3, '0')}`,
      description: wo.plan?.title ?? 'Work Order',
      status: (wo.status as string).toLowerCase(),
      maintenance: {
        machines: { name: wo.machine?.name ?? wo.machineId },
        assigned_to: wo.currentAssignee?.name ?? wo.currentAssigneeId,
      },
    }));
  } catch {
    return [];
  }
};
