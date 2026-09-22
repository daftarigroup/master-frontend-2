import { useMemo } from 'react';
import type {
  ChecklistItemData,
  DashboardStats,
  DepartmentCostData,
  FrequentRepairData,
  MachineData,
  RepairChartData,
  TaskData,
  TaskStatusData,
} from '../types/types';

export const useDashboardStats = (
  machines: MachineData[],
  tasks: TaskData[],
  checklistItems: ChecklistItemData[]
): DashboardStats => {
  return useMemo(
    () => ({
      totalMachines: machines.length,
      maintenanceTasks: tasks.filter((t) => t.type === 'Maintenance').length,
      tasksComplete: checklistItems.filter(
        (t) => t.status === 'completed' || t.status === 'COMPLETED'
      ).length,
      tasksPending: checklistItems.filter((t) => t.status === 'pending' || t.status === 'PENDING')
        .length,
      tasksInProgress: checklistItems.filter(
        (t) => t.status === 'in_progress' || t.status === 'IN_PROGRESS'
      ).length,
      totalCost: 0,
    }),
    [machines, tasks, checklistItems]
  );
};

export const useRepairVsPurchaseData = (machines: MachineData[]): RepairChartData[] => {
  return useMemo(
    () =>
      machines
        .filter((m) => m.purchaseDate && !Number.isNaN(new Date(m.purchaseDate).getTime()))
        .map((m) => ({
          name: m.name,
          purchasePrice: 0,
          repairCost: 0,
          status: m.status,
          department: m.department,
          purchaseDate: m.purchaseDate ?? undefined,
        }))
        .sort(
          (a, b) =>
            new Date(a.purchaseDate || '').getTime() - new Date(b.purchaseDate || '').getTime()
        ),
    [machines]
  );
};

export const useDepartmentCostData = (
  machines: MachineData[],
  tasks: TaskData[]
): DepartmentCostData[] => {
  return useMemo(() => {
    const deptMap: Record<string, DepartmentCostData> = {};
    for (const m of machines) {
      const dept = m.department || 'Unknown';
      if (!deptMap[dept]) {
        deptMap[dept] = { name: dept, cost: 0, machines: 0, tasks: 0 };
      }
      deptMap[dept].machines += 1;
    }
    for (const t of tasks) {
      const dept = t.department || 'Unknown';
      if (deptMap[dept]) {
        deptMap[dept].tasks += 1;
      }
    }
    return Object.values(deptMap);
  }, [machines, tasks]);
};

export const useFrequentRepairData = (machines: MachineData[]): FrequentRepairData[] => {
  return useMemo(
    () =>
      machines.slice(0, 5).map((m) => ({
        name: m.name,
        repairs: 0,
        lastRepair: 'N/A',
        cost: 0,
      })),
    [machines]
  );
};

export const useTaskStatusData = (stats: DashboardStats): TaskStatusData[] => {
  return useMemo(
    () =>
      [
        { name: 'Completed', value: stats.tasksComplete, color: '#10B981' },
        { name: 'Pending', value: stats.tasksPending, color: '#F59E0B' },
        { name: 'In-Progress', value: stats.tasksInProgress, color: '#3B82F6' },
      ].filter((d) => d.value > 0),
    [stats]
  );
};
