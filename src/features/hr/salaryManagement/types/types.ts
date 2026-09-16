export interface DeductionDef {
  id: string;
  name: string;
  percent: number;
  employerPercent?: number;
  basis: 'basic' | 'gross';
  active: boolean;
  grossLimit?: number;
}

export interface UpsertStructureDto {
  basicPercent: number;
  hraPercent: number;
  conveyancePercent: number;
  medicalPercent: number;
  specialAllowancePercent: number;
  deductions: DeductionDef[];
}

export interface EmployeeSalaryStructure {
  id: number;
  tenantId: string;
  employeeId: string;
  basicPercent: number;
  hraPercent: number;
  conveyancePercent: number;
  medicalPercent: number;
  specialAllowancePercent: number;
  deductions: DeductionDef[];
  createdAt: string;
  updatedAt: string;
}

export interface PayrollDeductionItem {
  id: string;
  name: string;
  percent: number;
  basis: string;
  amount: number;
}

export interface PayrollPayslip {
  id: number;
  month: number;
  year: number;
  daysPresent: number;
  calculationDays: number;
  monthlyCTC: number;
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  // OT / extra pay
  overtimeHours: number;
  weekendWorkDays: number;
  holidayWorkDays: number;
  otPay: number;
  weekendPay: number;
  holidayPay: number;
  deductionBreakdown: PayrollDeductionItem[] | null;
  status: 'generated' | 'paid';
  paidDate: string | null;
  remarks: string | null;
}

export interface SalaryBreakdown {
  basic: number;
  hra: number;
  conveyance: number;
  medicalAllowance: number;
  specialAllowance: number;
  grossEarnings: number;
  empPF: number;
  erPF: number;
  empESIC: number;
  erESIC: number;
  isPreview: boolean;
}

export interface PayrollEmployee {
  id: number;
  employeeId: string;
  empCode?: string | null;
  name: string;
  email: string | null;
  designation: string | null;
  department: { id: string; name: string } | null;
  joiningDate: string | null;
  status: string;
  salaryOnHold: boolean;
  salaryHoldReason: string | null;
  monthlySalary: number;
  daysPresent: number;
  workingDays: number;
  overtimeHours: number;
  weekendWorkDays: number;
  holidayWorkDays: number;
  weekOffDays: number;
  elapsedWeekOffDays: number;
  holidays: number;
  elapsedHolidays: number;
  payslip: PayrollPayslip | null;
  // Employee details
  company: string | null;
  location: string | null;
  mode: string | null;
  bankName: string | null;
  bankAccount: string | null;
  ifscCode: string | null;
  uan: string | null;
  insuranceId: string | null;
  // Salary breakdown (actual from payslip or preview calculated)
  salaryBreakdown: SalaryBreakdown | null;
  // Present only under "All Companies" (merged) view.
  tenant?: { id: string; name: string } | null;
}

export interface PayrollOverview {
  month: number;
  year: number;
  workingDays: number;
  employees: PayrollEmployee[];
}

export interface SalaryEmployeeListItem {
  id: number;
  employeeId: string;
  name: string;
  designation: string | null;
  status: string;
  joiningDate: string | null;
  lastWorkingDay: string | null;
  salaryOnHold: boolean;
  department: { id: string; name: string } | null;
  monthlySalary: number;
  paidPayslipCount: number;
  // Present only under "All Companies" (merged) view.
  tenant?: { id: string; name: string } | null;
}

export interface AttendanceDayRecord {
  id: number;
  employeeId: string;
  date: string;
  status: string;
  checkIn: string | null;
  checkOut: string | null;
  workingHours: number;
  overtime: number;
  notes: string | null;
  shift?: { id: string; name: string; startTime: string; endTime: string } | null;
}

export interface LoanDeduction {
  id: string;
  month: number;
  year: number;
  scheduledEmi: number;
  actualDeduction: number;
  balanceBefore: number;
  balanceAfter: number;
  adjusted: boolean;
}

export interface EmployeeLoan {
  id: string;
  amount: number;
  emiAmount: number;
  outstandingBalance: number;
  purpose: string | null;
  startDate: string;
  status: string;
  createdAt: string;
  deductions: LoanDeduction[];
}

export interface AllTransaction {
  id: number;
  month: number;
  year: number;
  employeeId: string;
  employeeName: string;
  employeeStatus: string;
  designation: string | null;
  department: { id: string; name: string } | null;
  daysPresent: number;
  calculationDays: number;
  monthlyCTC: number;
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  otPay: number;
  weekendPay: number;
  holidayPay: number;
  overtimeHours: number;
  deductionBreakdown: PayrollDeductionItem[] | null;
  status: 'generated' | 'paid';
  paidDate: string | null;
  remarks: string | null;
  createdAt: string;
  // Present only under "All Companies" (merged) view.
  tenant?: { id: string; name: string } | null;
}

export interface AllTransactionsSummary {
  totalNetPay: number;
  totalGross: number;
  totalDeductions: number;
  paidCount: number;
  generatedCount: number;
  totalCount: number;
}

export interface AllTransactionsResponse {
  payslips: AllTransaction[];
  pagination: { page: number; limit: number; total: number; pages: number };
  summary: AllTransactionsSummary;
}
