import { actAsTenantHeaders } from '@/features/organization/utils/actAsTenant';
import { api } from '@/lib/axios';
import type {
  AttendanceClaim,
  AttendanceConfig,
  AttendanceRecord,
  CompanyShift,
  EmployeeMeta,
  MonthlyAttendanceSummary,
  SubmitClaimPayload,
} from '../../types/types';

export const fetchAttendanceEmployees = async (): Promise<EmployeeMeta[]> => {
  const res = await api.get('/hrfms/attendance/employees');
  return res.data.data ?? [];
};

export const fetchAttendanceShifts = async (): Promise<CompanyShift[]> => {
  const res = await api.get('/hrfms/attendance/shifts');
  return res.data.data ?? [];
};

export const fetchDailyAttendance = async (date: string): Promise<AttendanceRecord[]> => {
  const res = await api.get('/hrfms/attendance/daily', { params: { date } });
  return res.data.data ?? [];
};

export const fetchEmployeeMonthlyRecords = async (
  employeeId: string,
  year: number,
  month: number
): Promise<AttendanceRecord[]> => {
  const res = await api.get('/hrfms/attendance/monthly', { params: { employeeId, year, month } });
  return res.data.data ?? [];
};

export interface UpsertAttendancePayload {
  employeeId: string;
  date: string;
  shiftId?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  status: string;
  notes?: string | null;
}

export const upsertAttendance = async (
  payload: UpsertAttendancePayload,
  actAsTenantId?: string
): Promise<AttendanceRecord> => {
  const res = await api.post('/hrfms/attendance', payload, actAsTenantHeaders(actAsTenantId));
  return res.data.data;
};

export const updateAttendance = async (
  id: number,
  payload: Partial<UpsertAttendancePayload>,
  actAsTenantId?: string
): Promise<AttendanceRecord> => {
  const res = await api.patch(
    `/hrfms/attendance/${id}`,
    payload,
    actAsTenantHeaders(actAsTenantId)
  );
  return res.data.data;
};

export interface AttendanceConfigPayload {
  fullDayHours: number;
  halfDayMinHours: number;
  lateGraceMinutes: number;
}

export const fetchAttendanceConfig = async (): Promise<AttendanceConfig> => {
  const res = await api.get('/hrfms/attendance/config');
  return res.data.data;
};

export const updateAttendanceConfig = async (
  payload: AttendanceConfigPayload
): Promise<AttendanceConfig> => {
  const res = await api.put('/hrfms/attendance/config', payload);
  return res.data.data;
};

export const getDepartments = (employees: EmployeeMeta[]): string[] => [
  ...new Set(employees.map((e) => e.department?.name).filter(Boolean) as string[]),
];

export const fetchMonthlyAttendanceSummary = async (
  year: number,
  month: number
): Promise<MonthlyAttendanceSummary[]> => {
  const res = await api.get('/hrfms/attendance/monthly-summary', { params: { year, month } });
  return res.data.data ?? [];
};

export interface HolidayEntry {
  id: string;
  title: string;
  date: string;
  isYearly: boolean;
}

export const fetchHolidaysForYear = async (year: number): Promise<HolidayEntry[]> => {
  const res = await api.get('/checklist-delegation/settings/holidays', { params: { year } });
  return res.data?.data ?? res.data ?? [];
};

// ── Attendance Claims ─────────────────────────────────────────────────────────

export const submitAttendanceClaim = async (
  payload: SubmitClaimPayload
): Promise<AttendanceClaim> => {
  const res = await api.post('/hrfms/attendance/claims', payload);
  return res.data.data;
};

export const submitAttendanceClaimAdmin = async (
  payload: SubmitClaimPayload & { employeeId: string },
  actAsTenantId?: string
): Promise<AttendanceClaim> => {
  const res = await api.post(
    '/hrfms/attendance/claims/admin-submit',
    payload,
    actAsTenantHeaders(actAsTenantId)
  );
  return res.data.data;
};

export const fetchMyClaims = async (): Promise<AttendanceClaim[]> => {
  const res = await api.get('/hrfms/attendance/claims/my');
  return res.data.data ?? [];
};

export const fetchAllClaims = async (filters?: {
  status?: string;
  claimType?: string;
}): Promise<AttendanceClaim[]> => {
  const res = await api.get('/hrfms/attendance/claims', { params: filters });
  return res.data.data ?? [];
};

export const approveAttendanceClaim = async (
  id: number,
  reviewNote?: string,
  actAsTenantId?: string
): Promise<AttendanceClaim> => {
  const res = await api.patch(
    `/hrfms/attendance/claims/${id}/approve`,
    { reviewNote },
    actAsTenantHeaders(actAsTenantId)
  );
  return res.data.data;
};

export const rejectAttendanceClaim = async (
  id: number,
  reviewNote?: string,
  actAsTenantId?: string
): Promise<AttendanceClaim> => {
  const res = await api.patch(
    `/hrfms/attendance/claims/${id}/reject`,
    { reviewNote },
    actAsTenantHeaders(actAsTenantId)
  );
  return res.data.data;
};

export const editAttendanceClaimReview = async (
  id: number,
  status: 'APPROVED' | 'REJECTED',
  reviewNote?: string,
  actAsTenantId?: string
): Promise<AttendanceClaim> => {
  const res = await api.patch(
    `/hrfms/attendance/claims/${id}/edit-review`,
    { status, reviewNote },
    actAsTenantHeaders(actAsTenantId)
  );
  return res.data.data;
};
