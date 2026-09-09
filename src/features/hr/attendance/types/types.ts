export interface CompanyShift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  isDefault: boolean;
  weeklyOffDays?: string;
}

export interface EmployeeMeta {
  employeeId: string;
  name: string | null;
  email: string | null;
  designation: string | null;
  joiningDate?: string | null;
  department: { id: number; name: string } | null;
  companyShiftId: string | null;
  companyShift: Pick<
    CompanyShift,
    'id' | 'name' | 'startTime' | 'endTime' | 'weeklyOffDays'
  > | null;
  // Present only under "All Companies" (merged) view.
  tenant?: { id: string; name: string } | null;
}

export interface AttendanceRecord {
  id: number;
  employeeId: string;
  date: string;
  shiftId: string | null;
  shift: Pick<CompanyShift, 'id' | 'name' | 'startTime' | 'endTime'> | null;
  checkIn: string | null;
  checkOut: string | null;
  status: 'present' | 'absent' | 'half_day' | 'halfday' | 'leave' | 'holiday' | 'overtime';
  workingHours: number;
  overtime: number;
  notes: string | null;
  hrEmployee?: EmployeeMeta;
  // Denormalised fields populated in daily attendance response
  employeeName?: string;
  department?: string;
  // Punch Mis (or other) regularization claim raised for this date, if any
  claim?: Pick<
    AttendanceClaim,
    'id' | 'claimType' | 'status' | 'reason' | 'reviewNote' | 'reviewedAt'
  > | null;
  // Present only under "All Companies" (merged) view.
  tenant?: { id: string; name: string } | null;
}

export interface MonthlyAttendanceSummary {
  employeeId: string;
  employeeName: string;
  department: string;
  workingDays: number;
  regularDays: number;
  holidayWorked: number;
  weekendWorked: number;
  totalPresent: number;
  absentDays: number;
  halfDays: number;
  leaveDays: number;
  lateDays: number;
  attendancePercentage: number;
  // Present only under "All Companies" (merged) view.
  tenant?: { id: string; name: string } | null;
}

export type AttendanceClaimType = 'PUNCH_MIS' | 'OVERTIME' | 'WEEKEND_PRESENT' | 'HOLIDAY_PRESENT';

export type AttendanceClaimStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AttendanceClaim {
  id: number;
  tenantId: string;
  employeeId: string;
  date: string;
  claimType: AttendanceClaimType;
  checkIn: string | null;
  checkOut: string | null;
  overtimeHours: number | null;
  reason: string;
  status: AttendanceClaimStatus;
  reviewedBy: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  hrEmployee?: { name: string | null; designation: string | null };
  // Only present for a multi-company identity user (see UserIdentity) —
  // absent for every individual company and every single-company session.
  tenant?: { id: string; name: string };
}

export interface AttendanceConfig {
  id: string;
  tenantId: string;
  fullDayHours: number;
  halfDayMinHours: number;
  lateGraceMinutes: number;
}

export interface SubmitClaimPayload {
  date: string;
  claimType: AttendanceClaimType;
  checkIn: string | null;
  checkOut: string | null;
  overtimeHours: number | null;
  reason: string;
}
