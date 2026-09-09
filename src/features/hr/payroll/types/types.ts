// HR Payroll Types

export interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  designation: string;
  month: string;
  year: number;
  basicSalary: number;
  hra: number;
  conveyance: number;
  otherAllowances: number;
  grossSalary: number;
  pf: number;
  esi: number;
  tax: number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary: number;
  status: 'pending' | 'processed' | 'paid';
  payDate?: string;
}

export interface PayrollSummary {
  totalEmployees: number;
  totalGrossSalary: number;
  totalDeductions: number;
  totalNetSalary: number;
  processed: number;
  pending: number;
}
