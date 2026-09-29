export interface DailyMachineLog {
  id: string;
  firmId?: string;
  machineId: string;
  machineName: string;
  date: string;
  startTimeReading: string | null;
  endTimeReading: string | null;
  runtimeHours: number;
  temperature: number;
  load: number;
  operatorName: string;
  remarks: string | null;
  approvalStatus?: 'APPROVED' | 'PENDING' | 'REJECTED' | string;
  fuelUsed?: number;
  workType?: string;
  location?: string;
  createdAt: string;
  // Only present in "All Companies" mode
  tenant?: { id: string; name: string } | null;
  machine?: { id: string; name: string; assetCode: string; firmId?: string } | null;
}

export interface MachineStat {
  machineId: string;
  machineName: string;
  totalHours: number;
}

export interface RealMachine {
  id: string;
  name: string;
  assetCode: string;
  firmId?: string;
}

export interface CreateDailyMachineLogDto {
  machineId: string;
  date: string;
  startTimeReading?: string;
  endTimeReading?: string;
  runtimeHours: number;
  temperature: number;
  load: number;
  operatorName: string;
  remarks?: string;
}
