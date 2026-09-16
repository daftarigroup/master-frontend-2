export type AdvanceRequestStatus = 'pending' | 'approved' | 'rejected';

export interface LoanDeductionRecord {
  id: string;
  month: number;
  year: number;
  scheduledEmi: number;
  actualDeduction: number;
  balanceBefore: number;
  balanceAfter: number;
}

export interface LoanHistory {
  id: string;
  amount: number;
  emiAmount: number;
  outstandingBalance: number;
  purpose: string | null;
  startDate: string;
  status: string;
  deductions: LoanDeductionRecord[];
}

export interface AdvanceRequest {
  id: number;
  tenantId: string;
  employeeId: string;
  empCode?: string | null;
  employeeName: string;
  departmentId?: string | null;
  department?: { id: string; name: string } | null;
  // ── Original request (immutable after submission) ──
  requestAmount: number;
  monthlyDeduction: number;
  noOfMonths: number;
  reason: string;
  // ── Admin-approved values (set only on approval) ──
  approvedAmount?: number | null;
  approvedMonthlyDeduction?: number | null;
  approvedNoOfMonths?: number | null;
  // ── Rollup: prior active loan snapshotted at submission time ──
  priorOutstandingBalance?: number;
  priorLoanId?: string | null;
  priorLoanOriginalAmount?: number | null;
  priorLoanEmi?: number | null;
  // ── Status & meta ──
  status: AdvanceRequestStatus;
  remarks?: string | null;
  requestDate: string;
  approvedDate?: string | null;
  startDeductionMonth?: string | null;
  loanId?: string | null;
  createdAt: string;
  updatedAt: string;
  tatPlannedAt?: string | null;
  tatDelayMinutes?: number | null;
  processedAt?: string | null;
  processedBy?: { id: string; name: string | null } | null;
  yourProjectedPlannedAt?: string | null;
  // Only present for a multi-company identity user (see UserIdentity) —
  // absent for every individual company and every single-company session.
  tenant?: { id: string; name: string };
}

export interface SubmitAdvanceRequestDto {
  employeeId: string;
  empCode?: string;
  employeeName: string;
  departmentId?: string;
  departmentName?: string;
  requestAmount: number;
  monthlyDeduction: number;
  noOfMonths?: number;
  reason: string;
}

export interface UpdateAdvanceStatusDto {
  status: AdvanceRequestStatus;
  remarks?: string;
  startDeductionMonth?: string;
  approvedAmount?: number;
  approvedMonthlyDeduction?: number;
  approvedNoOfMonths?: number;
}

export interface UpdateAdvanceRequestDto {
  approvedAmount?: number;
  approvedMonthlyDeduction?: number;
  approvedNoOfMonths?: number;
  remarks?: string;
  startDeductionMonth?: string;
}

export interface EmployeeLoanSummary {
  advanceId: number;
  employeeId: string;
  empCode?: string | null;
  employeeName: string;
  department: string | null;
  disbursedAmount: number;
  newlyDisbursedAmount?: number;
  priorRolledIn?: number;
  monthlyEmi: number;
  totalMonths: number;
  startDeductionMonth: string | null;
  approvedDate: string | null;
  loanId: string | null;
  outstandingBalance: number;
  loanStatus: string;
  collected: number;
  createdAt?: string | null;
  tatPlannedAt?: string | null;
  processedAt?: string | null;
  tatDelayMinutes?: number | null;
  processedBy?: { id: string; name: string | null } | null;
}

export interface AdvanceDashboardStats {
  totalDisbursed: number;
  totalOutstanding: number;
  totalCollected: number;
  recoveryRate: number;
  activeLoanCount: number;
  paidLoanCount: number;
  totalApprovedCount: number;
  departmentBreakdown: { name: string; count: number; amount: number }[];
  monthlyTrend: { label: string; disbursed: number; count: number }[];
  employeeSummary: EmployeeLoanSummary[];
}
