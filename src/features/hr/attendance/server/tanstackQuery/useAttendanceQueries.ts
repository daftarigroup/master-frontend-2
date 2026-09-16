import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppSelector } from '@/store/hook';
import { selectOrgViewMode } from '@/store/slice/userAccountData';
import type { SubmitClaimPayload, SubmitPunchPayload } from '../../types/types';
import {
  type AttendanceConfigPayload,
  approveAttendanceClaim,
  editAttendanceClaimReview,
  fetchAllClaims,
  fetchAttendanceConfig,
  fetchAttendanceEmployees,
  fetchAttendancePunches,
  fetchAttendanceShifts,
  fetchDailyAttendance,
  fetchEmployeeMonthlyRecords,
  fetchHolidaysForYear,
  fetchMonthlyAttendanceSummary,
  fetchMyClaims,
  rejectAttendanceClaim,
  submitAttendanceClaim,
  submitAttendanceClaimAdmin,
  submitAttendancePunch,
  type UpsertAttendancePayload,
  updateAttendance,
  updateAttendanceConfig,
  upsertAttendance,
} from '../api/attendanceApi';

const KEYS = {
  employees: ['hr', 'attendance', 'employees'] as const,
  shifts: ['hr', 'attendance', 'shifts'] as const,
  daily: (date: string) => ['hr', 'attendance', 'daily', date] as const,
  monthly: (employeeId: string, y: number, m: number) =>
    ['hr', 'attendance', 'monthly', employeeId, y, m] as const,
};

export const useAttendanceEmployees = () => {
  const orgViewMode = useAppSelector(selectOrgViewMode);
  return useQuery({
    queryKey: [...KEYS.employees, orgViewMode],
    queryFn: fetchAttendanceEmployees,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useAttendanceShifts = () => {
  const orgViewMode = useAppSelector(selectOrgViewMode);
  return useQuery({
    queryKey: [...KEYS.shifts, orgViewMode],
    queryFn: fetchAttendanceShifts,
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useDailyAttendance = (date: string) => {
  const orgViewMode = useAppSelector(selectOrgViewMode);
  return useQuery({
    queryKey: [...KEYS.daily(date), orgViewMode],
    queryFn: () => fetchDailyAttendance(date),
    enabled: !!date,
    staleTime: 2 * 60 * 1000,
    gcTime: 4 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useEmployeeMonthlyRecords = (employeeId: string, year: number, month: number) =>
  useQuery({
    queryKey: KEYS.monthly(employeeId, year, month),
    queryFn: () => fetchEmployeeMonthlyRecords(employeeId, year, month),
    enabled: !!employeeId,
    staleTime: 2 * 60 * 1000,
    gcTime: 4 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

export const useMonthlyAttendance = (year: number, month: number) => {
  const orgViewMode = useAppSelector(selectOrgViewMode);
  return useQuery({
    queryKey: ['hr', 'attendance', 'monthly-summary', year, month, orgViewMode],
    queryFn: () => fetchMonthlyAttendanceSummary(year, month),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useUpsertAttendance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      payload,
      actAsTenantId,
    }: {
      payload: UpsertAttendancePayload;
      actAsTenantId?: string;
    }) => upsertAttendance(payload, actAsTenantId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr', 'attendance'] }),
  });
};

export const useAttendanceConfig = () =>
  useQuery({
    queryKey: ['hr', 'attendance', 'config'],
    queryFn: fetchAttendanceConfig,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

export const useUpdateAttendanceConfig = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AttendanceConfigPayload) => updateAttendanceConfig(payload),
    onSuccess: (data) => {
      qc.setQueryData(['hr', 'attendance', 'config'], data);
    },
  });
};

export const useAttendanceHolidays = (year: number) =>
  useQuery({
    queryKey: ['hr', 'attendance', 'holidays', year],
    queryFn: () => fetchHolidaysForYear(year),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

export const useUpdateAttendance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
      actAsTenantId,
    }: {
      id: number;
      payload: Partial<UpsertAttendancePayload>;
      actAsTenantId?: string;
    }) => updateAttendance(id, payload, actAsTenantId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr', 'attendance'] }),
  });
};

// ── Attendance Punch (kiosk) hooks ────────────────────────────────────────────

export const useAttendancePunches = (filters?: { employeeId?: string; date?: string }) =>
  useQuery({
    queryKey: ['hr', 'attendance', 'punches', filters],
    queryFn: () => fetchAttendancePunches(filters),
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

export const useSubmitPunch = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SubmitPunchPayload) => submitAttendancePunch(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr', 'attendance', 'punches'] });
      qc.invalidateQueries({ queryKey: ['hr', 'attendance', 'daily'] });
      qc.invalidateQueries({ queryKey: ['hr', 'attendance', 'monthly-summary'] });
    },
  });
};

// ── Attendance Claim hooks ────────────────────────────────────────────────────

const CLAIM_KEYS = {
  my: ['hr', 'attendance', 'claims', 'my'] as const,
  all: (filters?: { status?: string; claimType?: string }) =>
    ['hr', 'attendance', 'claims', 'all', filters] as const,
};

export const useMyClaims = (enabled: boolean = true) =>
  useQuery({
    queryKey: CLAIM_KEYS.my,
    queryFn: fetchMyClaims,
    enabled,
    retry: false,
    staleTime: 2 * 60 * 1000,
    gcTime: 4 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

export const useAllClaims = (filters?: { status?: string; claimType?: string }) => {
  const orgViewMode = useAppSelector(selectOrgViewMode);
  return useQuery({
    queryKey: [...CLAIM_KEYS.all(filters), orgViewMode],
    queryFn: () => fetchAllClaims(filters),
    staleTime: 2 * 60 * 1000,
    gcTime: 4 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useSubmitClaim = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SubmitClaimPayload) => submitAttendanceClaim(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CLAIM_KEYS.my });
      qc.invalidateQueries({ queryKey: ['hr', 'attendance', 'claims', 'all'] });
    },
  });
};

export const useSubmitClaimAdmin = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      payload,
      actAsTenantId,
    }: {
      payload: SubmitClaimPayload & { employeeId: string };
      actAsTenantId?: string;
    }) => submitAttendanceClaimAdmin(payload, actAsTenantId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr', 'attendance', 'claims'] });
    },
  });
};

export const useApproveClaim = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      reviewNote,
      actAsTenantId,
    }: {
      id: number;
      reviewNote?: string;
      actAsTenantId?: string;
    }) => approveAttendanceClaim(id, reviewNote, actAsTenantId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr', 'attendance', 'claims'] });
      qc.invalidateQueries({ queryKey: ['hr', 'attendance'] });
    },
  });
};

export const useRejectClaim = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      reviewNote,
      actAsTenantId,
    }: {
      id: number;
      reviewNote?: string;
      actAsTenantId?: string;
    }) => rejectAttendanceClaim(id, reviewNote, actAsTenantId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hr', 'attendance', 'claims'] }),
  });
};

export const useEditClaimReview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      reviewNote,
      actAsTenantId,
    }: {
      id: number;
      status: 'APPROVED' | 'REJECTED';
      reviewNote?: string;
      actAsTenantId?: string;
    }) => editAttendanceClaimReview(id, status, reviewNote, actAsTenantId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr', 'attendance', 'claims'] });
      qc.invalidateQueries({ queryKey: ['hr', 'attendance'] });
    },
  });
};
