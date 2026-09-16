import { actAsTenantHeaders } from '@/features/organization/utils/actAsTenant';
import { api } from '@/lib/axios';
import type {
  AttendanceClaim,
  AttendanceConfig,
  AttendancePunch,
  AttendanceRecord,
  CompanyShift,
  EmployeeMeta,
  MonthlyAttendanceSummary,
  SubmitClaimPayload,
  SubmitPunchPayload,
  SubmitPunchResult,
} from '../../types/types';

export const fetchAttendanceEmployees = async (): Promise<EmployeeMeta[]> => {
  const res = await api.get('/hrfms/attendance/employees');
  const items = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
  return items.map((e: any) => ({
    employeeId: e.employee_id || e.employeeId || String(e.id),
    empCode: e.emp_code || e.empCode || null,
    name: e.name || null,
    email: e.email || null,
    designation: e.designation || null,
    joiningDate: e.joining_date || e.joiningDate || null,
    department: e.department
      ? {
          id: Number(e.department.id || e.department_id || 0),
          name: e.department.name || String(e.department),
        }
      : null,
    companyShiftId: null,
    companyShift: null,
  }));
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
  try {
    const res = await api.get('/hrfms/attendance/claims/my');
    return res.data.data ?? [];
  } catch (err: any) {
    if (err?.response?.status === 400 || err?.response?.status === 404) {
      return [];
    }
    throw err;
  }
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

// ── Attendance Punch (kiosk) ──────────────────────────────────────────────────

/**
 * Requests a presigned S3 PUT URL (via the same authenticated /hrfms alias
 * the rest of this feature uses — not the unauthenticated /store one) and
 * uploads the geo-stamped photo directly to S3. Returns the public URL to
 * hand to submitAttendancePunch.
 */
export const uploadPunchPhoto = async (file: Blob, employeeId: string): Promise<string> => {
  const presignRes = await api.post('/hrfms/upload/presign', {
    bucket: 'attendance-punches',
    path: `${employeeId}/${Date.now()}.jpg`,
    contentType: file.type || 'image/jpeg',
  });
  const { uploadUrl, publicUrl } = presignRes.data.data;
  if (!uploadUrl || !publicUrl) {
    throw new Error('Could not get an upload URL from the server.');
  }

  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'image/jpeg' },
    body: file,
  });
  if (!putRes.ok) {
    throw new Error(`Photo upload failed (status ${putRes.status}).`);
  }

  return publicUrl as string;
};

export const submitAttendancePunch = async (
  payload: SubmitPunchPayload
): Promise<SubmitPunchResult> => {
  const res = await api.post('/hrfms/attendance/punch', payload);
  return res.data.data;
};

export const fetchAttendancePunches = async (filters?: {
  employeeId?: string;
  date?: string;
}): Promise<AttendancePunch[]> => {
  const res = await api.get('/hrfms/attendance/punches', { params: filters });
  return res.data.data ?? [];
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
