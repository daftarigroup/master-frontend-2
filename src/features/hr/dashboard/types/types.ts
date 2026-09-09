// HR Dashboard Types

export interface DashboardStats {
  totalEmployee: number;
  activeEmployee: number;
  leftEmployee: number;
  leaveThisMonth: number;
}

export interface MonthlyHiringData {
  month: string;
  hired: number;
  left: number;
}

export interface DepartmentData {
  department: string;
  employees: number;
  [key: string]: any;
}

export interface DesignationData {
  designation: string;
  employees: number;
  [key: string]: any;
}

export interface LeaveStatusData {
  status: string;
  count: number;
  [key: string]: any;
}

export interface LeaveTypeData {
  type: string;
  count: number;
}

export interface DashboardData {
  stats: DashboardStats;
  monthlyHiringData: MonthlyHiringData[];
  departmentData: DepartmentData[];
  designationData: DesignationData[];
  leaveStatusData: LeaveStatusData[];
  leaveTypeData: LeaveTypeData[];
}

// ── V3 HR Dashboard types ─────────────────────────────────────────────

export interface V3HrKPI {
  totalActiveEmployees: number;
  newJoiningThisMonth: number;
  openVacancies: number;
  totalOpenSeats: number;
  totalApplications: number;
  selectedCandidates: number;
  rejectedCandidates: number;
  pendingJoining: number;
  employeesOnLeaveToday: number;
  pendingLeaveRequests: number;
  approvedLeaveThisMonth: number;
  exitedThisMonth?: number;
  inNoticePeriod?: number;
}

export interface V3HrFunnel {
  stage: string;
  count: number;
}

export interface V3HrVacancy {
  id: string;
  title: string;
  department: string;
  totalSeats: number;
  filledSeats: number;
  remainingSeats: number;
  applicantCount: number;
  deadline: string | null;
  status: string;
}

export interface V3HrCandidate {
  id: string;
  name: string;
  vacancyTitle: string;
  appliedDate: string;
  status: string;
  finalResult: string;
}

export interface V3HrLeaveRequest {
  id: string;
  employeeName: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason: string;
  status: string;
  appliedDate: string;
}

export interface V3HrJoining {
  id: string;
  employeeName: string;
  department: string;
  designation: string;
  joiningDate: string;
  status: string;
}

export interface V3HrActiveEmployee {
  id: string;
  name: string;
  photo: string | null;
  department: string;
  designation: string;
  joiningDate: string | null;
  status: string;
}

export interface V3HrRecruitmentRow {
  designation: string;
  applied: number;
  ongoing: number;
  joining: number;
  rejected: number;
}

export interface V3HrSalaryEmployee {
  id: string;
  name: string;
  designation: string;
  salary: number;
  email: string;
  joiningDate: string | null;
  // Present only under "All Companies" (merged) view — carried through from
  // the underlying /hrfms/employee row (see dashboardApi.ts's mapping).
  tenant?: { id: string; name: string } | null;
}

export interface V3HrDeptSalary {
  department: string;
  total: number;
  employees: V3HrSalaryEmployee[];
}

export interface V3HrSalarySummary {
  totalMonthly: number;
  byDepartment: V3HrDeptSalary[];
}

export interface V3HrAdvanceReqItem {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  requestAmount: number;
  monthlyDeduction: number;
  noOfMonths: number;
  reason: string;
  status: string;
  requestDate: string;
}

export interface V3HrAdvanceSummary {
  holdCount: number;
  loanCount: number;
  holdEmployees: V3HrAdvanceReqItem[];
  loanRequests: V3HrAdvanceReqItem[];
}

export interface V3HrDashboardPayload {
  kpi: V3HrKPI;
  hiringFunnel: V3HrFunnel[];
  monthlyHiring: MonthlyHiringData[];
  departmentDist: DepartmentData[];
  designationDist: DesignationData[];
  leaveStatusDist: LeaveStatusData[];
  leaveTypeDist: LeaveTypeData[];
  openVacancies: V3HrVacancy[];
  recentCandidates: V3HrCandidate[];
  pendingLeaveRequests: V3HrLeaveRequest[];
  recentJoinings: V3HrJoining[];
  activeEmployees: V3HrActiveEmployee[];
  recruitmentByDesignation: V3HrRecruitmentRow[];
  salarySummary: V3HrSalarySummary;
  advanceSummary: V3HrAdvanceSummary;
}
