import { api } from '@/lib/axios';

export interface DailyReportTask {
  id: string;
  indentNumber?: string;
  title: string;
  problem?: string;
  description?: string;
  machineName?: string;
  machineId?: string;
  assignedTo: string;
  status: string;
  priority?: string;
  createdAt: string;
  updatedAt?: string;
  tenant?: { id: string; name: string } | null;
}

export interface DailyReportData {
  tasks: DailyReportTask[];
  stats: {
    totalTasks: number;
    completed: number;
    inProgress: number;
    pending: number;
  };
  machineStats: {
    operational: number;
    maintenance: number;
    down: number;
    totalMachines: number;
  };
}

export const fetchDailyReport = async (date?: string): Promise<DailyReportData> => {
  const response = await api.get('/repair-system/daily-report', {
    params: { date },
  });
  return response.data;
};
