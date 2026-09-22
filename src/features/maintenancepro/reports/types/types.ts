export type ReportTimeframe = 'thisMonth' | 'lastQuarter' | 'thisYear';

export interface MonthlyCostPoint {
  month: string;
  cost: number;
}

export interface DepartmentCostPoint {
  department: string;
  cost: number;
}

export interface CostAnalysisReport {
  monthlyCosts: MonthlyCostPoint[];
  departmentCosts: DepartmentCostPoint[];
  totalCost: number;
}

export type ReliabilityStatus = 'Excellent' | 'Good' | 'Needs Attention';

export interface MachineReliabilityPoint {
  machineId: string;
  machineName: string;
  reliabilityScore: number;
  status: ReliabilityStatus;
  totalWorkOrders: number;
  breakdownCount: number;
  // Present only when the request resolved a multi-tenant ("All Companies") scope.
  tenant?: { id: string; name: string } | null;
}

export interface MachineReliabilityReport {
  machines: MachineReliabilityPoint[];
}

export interface ReportDepartmentOption {
  id: string;
  name: string;
}
