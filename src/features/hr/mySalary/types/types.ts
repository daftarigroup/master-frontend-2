export interface DeductionDef {
  id: string;
  name: string;
  percent: number;
  employerPercent?: number;
  basis: 'basic' | 'gross';
  active: boolean;
  grossLimit?: number;
}

export interface DeductionItem {
  id: string;
  name: string;
  percent: number;
  basis: 'basic' | 'gross';
  amount: number;
}

export const DEFAULT_DEDUCTIONS: DeductionDef[] = [
  {
    id: 'emp_pf',
    name: 'Provident Fund (PF)',
    percent: 12,
    employerPercent: 13,
    basis: 'basic',
    active: true,
  },
  {
    id: 'emp_esic',
    name: 'ESIC',
    percent: 0.75,
    employerPercent: 3.25,
    basis: 'gross',
    active: true,
    grossLimit: 21000,
  },
];

export interface SalaryStructure {
  id: number;
  tenantId: string;
  basicPercent: number;
  hraPercent: number;
  conveyancePercent: number;
  medicalPercent: number;
  specialAllowancePercent: number;
  deductions: DeductionDef[];
  company?: string | null;
  location?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Payslip {
  id: number;
  tenantId: string;
  employeeId: string;
  structureId: number;
  salaryStructure: SalaryStructure;
  month: number;
  year: number;
  daysPresent: number;
  calculationDays: number;
  monthlyCTC: number;
  basic: number;
  hra: number;
  conveyance: number;
  medicalAllowance: number;
  specialAllowance: number;
  otherAllowances: number;
  additionalSalary: number;
  grossEarnings: number;
  deductionBreakdown: DeductionItem[];
  totalDeductions: number;
  netPay: number;
  // OT / extra pay breakdown
  overtimeHours: number;
  weekendWorkDays: number;
  holidayWorkDays: number;
  otPay: number;
  weekendPay: number;
  holidayPay: number;
  lateMinutes: number;
  punchMisDays: number;
  status: 'generated' | 'paid';
  paidDate?: string | null;
  remarks?: string | null;
  createdAt: string;
  updatedAt: string;
  // Present only under "All Companies" (merged) view.
  tenant?: { id: string; name: string } | null;
}

export interface UpsertStructureDto {
  basicPercent: number;
  hraPercent: number;
  conveyancePercent: number;
  medicalPercent: number;
  specialAllowancePercent: number;
  deductions: DeductionDef[];
}

export interface GeneratePayslipDto {
  employeeId: string;
  month: number;
  year: number;
  monthlyCTC?: number;
  daysPresent?: number;
  calculationDays?: number;
  remarks?: string;
}
