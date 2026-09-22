import { actAsTenantHeaders } from '@/features/organization/utils/actAsTenant';
import { api } from '@/lib/axios';
import type {
  CreateDailyMachineLogDto,
  DailyMachineLog,
  MachineStat,
  RealMachine,
} from '../types/types';

export const fetchDailyMachineLogs = async (params?: {
  machineId?: string;
  date?: string;
  page?: number;
  limit?: number;
}): Promise<{
  data: DailyMachineLog[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}> => {
  const res = await api.get('/maintenance/daily-machine-logs', { params });
  const items: unknown[] = res.data?.data ?? [];
  return {
    data: items.map((raw) => {
      const item = raw as Record<string, unknown>;
      const machine = item.machine as Record<string, unknown> | null | undefined;
      return {
        id: item.id as string,
        machineId: item.machineId as string,
        machineName: (machine?.name as string | undefined) ?? (item.machineId as string),
        date: item.date as string,
        startTimeReading: (item.startTimeReading as string | null) ?? null,
        endTimeReading: (item.endTimeReading as string | null) ?? null,
        runtimeHours: item.runtimeHours as number,
        temperature: item.temperature as number,
        load: item.load as number,
        operatorName: item.operatorName as string,
        remarks: (item.remarks as string | null) ?? null,
        createdAt: item.createdAt as string,
        tenant: (item.tenant as { id: string; name: string } | undefined) ?? null,
      };
    }),
    pagination: res.data?.pagination ?? { total: 0, page: 1, limit: 50, totalPages: 1 },
  };
};

export const fetchMachineLogStats = async (): Promise<MachineStat[]> => {
  const res = await api.get('/maintenance/daily-machine-logs/stats');
  return res.data?.data ?? [];
};

export const createDailyMachineLog = async (
  dto: CreateDailyMachineLogDto,
  actAsTenantId?: string
): Promise<DailyMachineLog> => {
  const res = await api.post(
    '/maintenance/daily-machine-logs',
    dto,
    actAsTenantHeaders(actAsTenantId)
  );
  const item = res.data?.data as Record<string, unknown>;
  const machine = item.machine as Record<string, unknown> | null | undefined;
  return {
    id: item.id as string,
    machineId: item.machineId as string,
    machineName: (machine?.name as string | undefined) ?? (item.machineId as string),
    date: item.date as string,
    startTimeReading: (item.startTimeReading as string | null) ?? null,
    endTimeReading: (item.endTimeReading as string | null) ?? null,
    runtimeHours: item.runtimeHours as number,
    temperature: item.temperature as number,
    load: item.load as number,
    operatorName: item.operatorName as string,
    remarks: (item.remarks as string | null) ?? null,
    createdAt: item.createdAt as string,
  };
};

export const fetchRealMachines = async (actAsTenantId?: string): Promise<RealMachine[]> => {
  const res = await api.get('/maintenance/machines', {
    params: { limit: 200, page: 1 },
    ...actAsTenantHeaders(actAsTenantId),
  });
  const items: unknown[] = res.data?.data ?? [];
  return items.map((raw) => {
    const m = raw as Record<string, unknown>;
    return {
      id: m.id as string,
      name: m.name as string,
      assetCode: m.assetCode as string,
    };
  });
};
