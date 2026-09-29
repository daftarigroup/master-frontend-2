import { api } from '@/lib/axios';
import type {
  DailyMachine,
  DailyReportData,
  DailyTaskStatus,
  DailyWorkOrder,
  RealMachineStatus,
} from '../types/types';

export const fetchMaintenanceDailyReport = async (firmId?: string): Promise<DailyReportData> => {
  const today = new Date();
  const from = new Date(today);
  from.setHours(0, 0, 0, 0);
  const to = new Date(today);
  to.setHours(23, 59, 59, 999);

  const [woRes, machinesRes] = await Promise.all([
    api.get('/maintenance/work-orders', {
      params: {
        from: from.toISOString(),
        to: to.toISOString(),
        limit: 200,
        page: 1,
        ...(firmId ? { firmId } : {}),
      },
    }),
    api.get('/maintenance/machines', {
      params: {
        limit: 200,
        page: 1,
        ...(firmId ? { firmId } : {}),
      },
    }),
  ]);

  const rawWOs: unknown[] = woRes.data?.data ?? [];
  const rawMachines: unknown[] = machinesRes.data?.data ?? [];

  const workOrders: DailyWorkOrder[] = rawWOs.map((raw) => {
    const wo = raw as Record<string, unknown>;
    const plan = wo.plan as Record<string, unknown> | null | undefined;
    const machine = wo.machine as Record<string, unknown> | null | undefined;
    const assignee = wo.currentAssignee as Record<string, unknown> | null | undefined;
    return {
      id: wo.id as string,
      firmId: (wo.firmId as string | undefined) ?? (machine?.firmId as string | undefined),
      title: (plan?.title as string | undefined) ?? 'Work Order',
      description:
        (plan?.activityType as { name?: string } | undefined)?.name ??
        (plan?.description as string | undefined) ??
        '',
      status: wo.status as DailyTaskStatus,
      machineId: wo.machineId as string,
      machineName: (machine?.name as string | undefined) ?? (wo.machineId as string),
      assigneeId: (wo.currentAssigneeId as string | undefined) ?? '',
      assignedTo: (assignee?.name as string | undefined) ?? 'Unassigned',
      dueDate:
        (wo.actualDueDate as string | undefined) ?? (wo.scheduledDate as string | undefined) ?? '',
      type: (wo.type as string | undefined) ?? '',
    };
  });

  const machines: DailyMachine[] = rawMachines.map((raw) => {
    const m = raw as Record<string, unknown>;
    return {
      id: m.id as string,
      firmId: (m.firmId as string | undefined) ?? (m.firm_id as string | undefined),
      name: m.name as string,
      status: ((m.status as string | undefined) ?? 'OPERATIONAL') as RealMachineStatus,
    };
  });

  return { workOrders, machines };
};
