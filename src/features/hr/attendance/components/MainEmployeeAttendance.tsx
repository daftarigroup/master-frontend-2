'use client';

import {
  IconAlertCircle,
  IconBriefcase,
  IconCalendar,
  IconCalendarCheck,
  IconCalendarMonth,
  IconCalendarStats,
  IconCalendarTime,
  IconCamera,
  IconCheck,
  IconDownload,
  IconFileText,
  IconLoader2,
  IconLogin2,
  IconLogout2,
  IconRefresh,
  IconSearch,
  IconSettings,
  IconSun,
  IconThumbDown,
  IconThumbUp,
  IconUpload,
  IconUsers,
  IconX,
} from '@tabler/icons-react';
import type React from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ModalPortal } from '@/features/hr/_shared/components';
import { ClaimModal } from '@/features/hr/myAttendance/components/MainMyAttendance';
import {
  useMyToday,
  useSelfCheckIn,
  useSelfCheckOut,
} from '@/features/hr/myAttendance/server/tanstackQuery/useMyAttendanceQueries';
import { useRequireCompanySelected } from '@/features/organization/hooks/useRequireCompanySelected';
import { resolveActAsTenant } from '@/features/organization/utils/actAsTenant';
import { cn } from '@/lib/utils';
import { useAppSelector } from '@/store/hook';
import { selectUserRole } from '@/store/slice/permissionsSlice';
import { selectUser } from '@/store/slice/userAccountData';
import { getDepartments } from '../server/api/attendanceApi';
import {
  useAllClaims,
  useApproveClaim,
  useAttendanceEmployees,
  useAttendanceHolidays,
  useAttendanceShifts,
  useEditClaimReview,
  useEmployeeMonthlyRecords,
  useMonthlyAttendance,
  useMyClaims,
  useRejectClaim,
  useUpsertAttendance,
} from '../server/tanstackQuery/useAttendanceQueries';
import type { AttendanceClaim, AttendanceRecord, CompanyShift, EmployeeMeta, MonthlyAttendanceSummary } from '../types/types';
import AttendanceConfigTab from './AttendanceConfigTab';
import SubmitAttendanceTab from './SubmitAttendanceTab';

type ShiftInfo = Pick<CompanyShift, 'id' | 'name' | 'startTime' | 'endTime'>;

// ── Import tokens / types ─────────────────────────────────────────────────────
const T = {
  bg: 'var(--background)',
  fg: 'var(--foreground)',
  card: 'var(--card)',
  muted: 'var(--muted)',
  mutedFg: 'var(--muted-foreground)',
  border: 'var(--border)',
  primary: 'var(--primary)',
  primaryBg: 'color-mix(in oklch, var(--primary) 12%, transparent)',
  primaryFg: 'var(--primary-foreground, #fff)' as string,
  success: 'var(--success)',
  successBg: 'color-mix(in oklch, var(--success) 14%, transparent)',
  warning: 'var(--warning)',
  warningBg: 'color-mix(in oklch, var(--warning) 14%, transparent)',
  danger: 'var(--danger)',
  dangerBg: 'color-mix(in oklch, var(--danger) 14%, transparent)',
  font: "'DM Sans', system-ui, sans-serif" as string,
};

interface PreviewAttendanceRow {
  _id: number;
  employeeId: string;
  empCode?: string | null;
  employeeName: string;
  date: string;
  parsedDate: string;
  status: string;
  checkIn: string | null;
  checkOut: string | null;
  shiftId: string | null;
  shiftName: string | null;
  notes: string | null;
}

const VALID_STATUSES = ['present', 'absent', 'half_day', 'leave', 'holiday', 'overtime'];

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; bg: string; text: string }> = {
  present: { label: 'Present', bg: 'bg-success/10', text: 'text-success' },
  absent: { label: 'Absent', bg: 'bg-destructive/10', text: 'text-destructive' },
  half_day: { label: 'Half Day', bg: 'bg-warning/10', text: 'text-warning' },
  leave: { label: 'On Leave', bg: 'bg-primary/10', text: 'text-primary' },
  holiday: { label: 'Holiday', bg: 'bg-blue-500/10', text: 'text-blue-500' },
  weekoff: { label: 'Week Off', bg: 'bg-muted', text: 'text-muted-foreground' },
  punch_mis: { label: 'Punch Mis', bg: 'bg-orange-500/10', text: 'text-orange-500' },
  regularized: { label: 'Regularized', bg: 'bg-teal-500/10', text: 'text-teal-500' },
  unmarked: { label: 'Unmarked', bg: 'bg-muted', text: 'text-muted-foreground' },
};

const CLAIM_STATUS_CFG: Record<string, { label: string; bg: string; text: string }> = {
  PENDING: { label: 'Pending', bg: 'bg-orange-500/10', text: 'text-orange-500' },
  APPROVED: { label: 'Approved', bg: 'bg-success/10', text: 'text-success' },
  REJECTED: { label: 'Rejected', bg: 'bg-destructive/10', text: 'text-destructive' },
};

const CLAIM_TYPE_LABELS: Record<string, string> = {
  PUNCH_MIS: 'Punch Mis',
  OVERTIME: 'Overtime',
  WEEKEND_PRESENT: 'Weekend Work',
  HOLIDAY_PRESENT: 'Holiday Work',
};

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const initials = (name: string | null | undefined, fallback = '?') => {
  const n = (name ?? fallback).trim();
  const p = n.split(/\s+/);
  if (p.length === 1) return (p[0]?.slice(0, 2) ?? '??').toUpperCase();
  return ((p[0]?.[0] ?? '') + (p[p.length - 1]?.[0] ?? '')).toUpperCase();
};

const todayStr = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
};

const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const getDayName = (iso: string): string =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long' });

const parseOffDays = (str: string | null | undefined): number[] =>
  (str ?? '0,6')
    .split(',')
    .map((d) => parseInt(d.trim(), 10))
    .filter((d) => !Number.isNaN(d));

const isWorkingDay = (iso: string, holidaySet: Set<string>, offDays: number[]): boolean => {
  const dow = new Date(`${iso}T00:00:00`).getDay();
  return !offDays.includes(dow) && !holidaySet.has(iso);
};

const toMins = (t: string | null): number => {
  if (!t) return -1;
  const [h, m] = t.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

const fmtMins = (mins: number): string => {
  if (mins <= 0) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const fmt12 = (t: string | null): string => {
  if (!t) return '—';
  const [hStr, mStr] = t.split(':');
  const h = parseInt(hStr ?? '0', 10);
  const m = parseInt(mStr ?? '0', 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
};

interface Derived {
  effectiveStatus: string;
  lateMinutes: number;
  earlyOutMinutes: number;
  isPunchMis: boolean;
  resolvedShift: ShiftInfo | null;
}

const resolveShift = (
  record: AttendanceRecord | null,
  emp: EmployeeMeta,
  defaultShift: ShiftInfo | null
): ShiftInfo | null => record?.shift ?? emp.companyShift ?? defaultShift ?? null;

const derive = (
  record: AttendanceRecord | null,
  emp: EmployeeMeta,
  defaultShift: ShiftInfo | null,
  dateIso: string,
  holidaySet: Set<string>,
  offDays: number[]
): Derived => {
  const shift = resolveShift(record, emp, defaultShift);
  const isHoliday = holidaySet.has(dateIso);
  const isWeekoff = offDays.includes(new Date(`${dateIso}T00:00:00`).getDay());

  if (!record) {
    const effectiveStatus = isHoliday ? 'holiday' : isWeekoff ? 'weekoff' : 'unmarked';
    return {
      effectiveStatus,
      lateMinutes: 0,
      earlyOutMinutes: 0,
      isPunchMis: false,
      resolvedShift: shift,
    };
  }

  // Two signals feed "Punch Mis": the system auto-flags a checked-in-but-never-
  // checked-out day, and/or the employee has explicitly raised a claim for the
  // date (this is also how a fully-absent day — no check-in, no check-out — gets
  // corrected, since the auto-flag never fires without a check-in).
  const heuristicPunchMis = !!(record.checkIn && !record.checkOut);
  const claim = record.claim;
  const claimPending = claim?.status === 'PENDING';
  const claimApproved = claim?.status === 'APPROVED';
  const inMins = toMins(record.checkIn);
  const outMins = toMins(record.checkOut);
  const startMins = toMins(shift?.startTime ?? null);
  const endMins = toMins(shift?.endTime ?? null);

  let effectiveStatus: string;
  if (heuristicPunchMis || claimPending) {
    effectiveStatus = 'punch_mis';
  } else if (claimApproved) {
    // Approval already rewrote the underlying HrAttendance row to "present" —
    // show "Regularized" instead so the correction stays visible, not silently
    // indistinguishable from a normal on-time punch.
    effectiveStatus = 'regularized';
  } else if (isHoliday && !record.checkIn) {
    effectiveStatus = 'holiday';
  } else if (isWeekoff && !record.checkIn) {
    effectiveStatus = 'weekoff';
  } else {
    // Includes: present on holiday/weekoff (their actual status shows), regular present, absent, leave
    effectiveStatus = record.status;
  }

  return {
    effectiveStatus,
    lateMinutes: inMins > 0 && startMins > 0 && inMins > startMins ? inMins - startMins : 0,
    earlyOutMinutes: outMins > 0 && endMins > 0 && outMins < endMins ? endMins - outMins : 0,
    isPunchMis: heuristicPunchMis || !!claim,
    resolvedShift: shift,
  };
};

const StatusPill = ({ status, claim }: { status: string; claim?: AttendanceRecord['claim'] }) => {
  let c = STATUS_CFG[status] ?? { label: status, bg: 'bg-muted', text: 'text-muted-foreground' };
  // 'punch_mis'/'regularized' are generic buckets for "a claim is pending/approved for
  // this day" — swap in the real claim type so an Overtime or Weekend Work claim isn't
  // mislabeled as "Punch Mis" just because it shares the same pending/approved bucket.
  if (claim && (status === 'punch_mis' || status === 'regularized')) {
    const typeLabel = CLAIM_TYPE_LABELS[claim.claimType] ?? 'Claim';
    c = { ...c, label: `${typeLabel} ${status === 'punch_mis' ? 'Pending' : 'Approved'}` };
  }
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
        c.bg,
        c.text
      )}
    >
      {c.label}
    </span>
  );
};

const YesNo = ({ yes }: { yes: boolean }) => (
  <span
    className={cn(
      'inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
      yes ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
    )}
  >
    {yes ? 'YES' : 'NO'}
  </span>
);

// ── Monthly View Modal ────────────────────────────────────────────────────────

interface MonthlyModalProps {
  emp: EmployeeMeta;
  defaultShift: ShiftInfo | null;
  onClose: () => void;
  initialYear?: number;
  initialMonth?: number;
}

const MonthlyModal: React.FC<MonthlyModalProps> = ({
  emp,
  defaultShift,
  onClose,
  initialYear,
  initialMonth,
}) => {
  const now = new Date();
  const year = initialYear ?? now.getFullYear();
  const month = initialMonth ?? now.getMonth() + 1;

  const { data: records = [], isLoading } = useEmployeeMonthlyRecords(emp.employeeId, year, month);
  const { data: holidayList = [] } = useAttendanceHolidays(year);

  const holidaySet = useMemo(
    () => new Set(holidayList.map((h) => h.date.slice(0, 10))),
    [holidayList]
  );
  const holidayNameMap = useMemo(
    () => new Map(holidayList.map((h) => [h.date.slice(0, 10), h.title])),
    [holidayList]
  );

  const offDays = useMemo(() => parseOffDays(emp.companyShift?.weeklyOffDays), [emp]);

  const nowDate = now.getDate();
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth();
  const todayIso = `${nowYear}-${String(nowMonth + 1).padStart(2, '0')}-${String(nowDate).padStart(2, '0')}`;
  const joiningIso = emp.joiningDate ? new Date(emp.joiningDate).toISOString().slice(0, 10) : null;

  const slots = useMemo(() => {
    const isCurrentMonth = year === nowYear && month === nowMonth + 1;
    const lastDay = isCurrentMonth ? nowDate : new Date(year, month, 0).getDate();
    const map = new Map(records.map((r) => [r.date, r]));
    const result: { date: string; record: AttendanceRecord | null }[] = [];
    for (let day = lastDay; day >= 1; day--) {
      const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      result.push({ date: iso, record: map.get(iso) ?? null });
    }
    return result;
  }, [records, year, month, nowDate, nowYear, nowMonth]);

  const stats = useMemo(() => {
    let regularPresent = 0; // present on a working day
    let holidayWorked = 0; // came in on a holiday
    let weekoffWorked = 0; // came in on a weekoff day
    let halfDay = 0; // half day on a working day
    let absent = 0;
    let leave = 0;
    let punchMis = 0;
    let holidayOff = 0; // holiday taken off
    let weekoffOff = 0; // weekoff day (normal rest)
    let workingDayCount = 0;

    for (const { date, record } of slots) {
      if (joiningIso && date < joiningIso) continue; // before joining date — don't count
      const dow = new Date(`${date}T00:00:00`).getDay();
      const isHoliday = holidaySet.has(date);
      const isWeekoff = offDays.includes(dow);

      if (!isHoliday && !isWeekoff) workingDayCount++;

      const status = record?.status ?? null;
      const isPresent = status === 'present' || status === 'overtime';
      const isHalf = status === 'half_day' || status === 'halfday';
      // Approved claims already got the underlying record flipped to "present" by
      // the backend, so they fall into isPresent above. Pending claims (and the
      // checked-in-but-not-out heuristic) are the only ones that still need their
      // own bucket — otherwise a fully-absent day awaiting approval reads as Absent.
      const isPunchMisPending =
        !!(record?.checkIn && !record?.checkOut) || record?.claim?.status === 'PENDING';

      if (isHoliday) {
        if (isPresent || isPunchMisPending) holidayWorked++;
        else holidayOff++;
      } else if (isWeekoff) {
        if (isPresent || isPunchMisPending) weekoffWorked++;
        else weekoffOff++;
      } else {
        // Regular working day
        if (isPunchMisPending) punchMis++;
        else if (isPresent) regularPresent++;
        else if (isHalf) halfDay++;
        else if (status === 'absent') absent++;
        else if (status === 'leave') leave++;
        else if (!record && date < todayIso) absent++; // past day with no record = absent
      }
    }

    const totalPresent = regularPresent + holidayWorked + weekoffWorked + halfDay * 0.5;
    const pct =
      workingDayCount > 0
        ? Math.min(100, Math.round(((regularPresent + halfDay * 0.5) / workingDayCount) * 100))
        : 0;

    return {
      regularPresent,
      holidayWorked,
      weekoffWorked,
      halfDay,
      absent,
      leave,
      punchMis,
      holidayOff,
      weekoffOff,
      workingDayCount,
      totalPresent,
      pct,
    };
  }, [slots, holidaySet, offDays, todayIso, joiningIso]);

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 backdrop-blur-sm sm:p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
      <div className="flex h-[96vh] w-full max-w-7xl flex-col rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[12px] font-bold text-primary">
              {initials(emp.name)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold">{emp.name}</p>
              <p className="truncate text-[12px] text-muted-foreground">
                {emp.empCode || emp.employeeId} · {emp.designation ?? '—'} · {emp.department?.name ?? '—'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>

        {/* Month label + stats */}
        <div className="shrink-0 space-y-3 border-b border-border px-4 py-4 sm:px-6">
          <p className="text-[13px] font-medium text-muted-foreground">
            {MONTHS[month - 1]} {year} · {slots.length} day{slots.length !== 1 ? 's' : ''}
          </p>
          {!isLoading && (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
              {[
                {
                  label: `Regular / ${stats.workingDayCount}`,
                  value: (() => {
                    const v = stats.regularPresent + stats.halfDay * 0.5;
                    return v % 1 === 0 ? v : v.toFixed(1);
                  })(),
                  color: 'text-success',
                },
                {
                  label: 'Absent',
                  value: stats.absent,
                  color: stats.absent > 0 ? 'text-destructive' : 'text-muted-foreground',
                },
                {
                  label: 'Leave',
                  value: stats.leave,
                  color: stats.leave > 0 ? 'text-primary' : 'text-muted-foreground',
                },
                {
                  label: 'Punch Mis',
                  value: stats.punchMis,
                  color: stats.punchMis > 0 ? 'text-orange-500' : 'text-muted-foreground',
                },
                {
                  label: 'Holiday Work',
                  value: stats.holidayWorked,
                  color: stats.holidayWorked > 0 ? 'text-blue-500' : 'text-muted-foreground',
                },
                {
                  label: 'Weekend Work',
                  value: stats.weekoffWorked,
                  color: stats.weekoffWorked > 0 ? 'text-warning' : 'text-muted-foreground',
                },
                {
                  label: 'Total Present',
                  value: (() => {
                    const v = stats.totalPresent;
                    return v % 1 === 0 ? v : v.toFixed(1);
                  })(),
                  color: 'text-success',
                },
                {
                  label: 'Att Rate',
                  value: `${stats.pct}%`,
                  color:
                    stats.pct >= 75
                      ? 'text-success'
                      : stats.pct >= 50
                        ? 'text-warning'
                        : 'text-destructive',
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-border bg-background px-3 py-2 text-center"
                >
                  <p className={cn('text-[18px] font-bold tabular-nums', s.color)}>{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Records table */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <IconLoader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : (
            <table className="w-full min-w-[1100px] text-[13px]">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                <tr className="border-b border-border">
                  {[
                    'Date',
                    'Day',
                    'Day Type',
                    'Shift',
                    'In',
                    'Out',
                    'Status',
                    'Work Hrs',
                    'Late Mins',
                    'Early Out',
                    'OT Hrs',
                    'Punch Mis',
                    'Remarks',
                  ].map((h) => (
                    <th
                      key={h}
                      className="whitespace-nowrap px-4 py-2.5 text-left text-[10px] font-semibold uppercase text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {slots.map(({ date, record }) => {
                  const isPreJoin = joiningIso !== null && date < joiningIso;
                  if (isPreJoin) {
                    return (
                      <tr key={date} className="opacity-40">
                        <td className="whitespace-nowrap px-4 py-2.5 font-medium">
                          {fmtDate(date)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                          {getDayName(date)}
                        </td>
                        {Array.from({ length: 11 }).map((_, i) => (
                          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder cells
                          <td
                            key={i}
                            className="whitespace-nowrap px-4 py-2.5 text-muted-foreground"
                          >
                            —
                          </td>
                        ))}
                      </tr>
                    );
                  }
                  const d = derive(record, emp, defaultShift, date, holidaySet, offDays);
                  if (d.effectiveStatus === 'unmarked' && date < todayIso)
                    d.effectiveStatus = 'absent';
                  const sh = d.resolvedShift;
                  const wDay = isWorkingDay(date, holidaySet, offDays);
                  const isHolidayRow = holidaySet.has(date);
                  const holidayName = holidayNameMap.get(date);
                  const claim = record?.claim;
                  const claimRemark = claim
                    ? claim.status === 'PENDING'
                      ? `Punch Mis raised: ${claim.reason}`
                      : claim.status === 'APPROVED'
                        ? `Regularized (Punch Mis approved)${claim.reviewNote ? ` — ${claim.reviewNote}` : ''}`
                        : `Punch Mis rejected${claim.reviewNote ? ` — ${claim.reviewNote}` : ''}`
                    : null;
                  const remarkText =
                    record?.notes ?? claimRemark ?? (isHolidayRow ? holidayName : null) ?? null;
                  return (
                    <tr
                      key={date}
                      className={cn(
                        'hover:bg-muted/30',
                        !record && 'opacity-60',
                        isHolidayRow && 'bg-blue-500/10'
                      )}
                    >
                      <td className="whitespace-nowrap px-4 py-2.5 font-medium">{fmtDate(date)}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                        {getDayName(date)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        {isHolidayRow ? (
                          <span className="inline-flex rounded-full bg-blue-500/15 px-2.5 py-0.5 text-[10px] font-bold text-blue-500">
                            Holiday
                          </span>
                        ) : !wDay ? (
                          <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                            Week Off
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-success/10 px-2.5 py-0.5 text-[10px] font-bold text-success">
                            Working Day
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        {sh ? (
                          <span
                            className="text-[12px]"
                            title={`${fmt12(sh.startTime)} – ${fmt12(sh.endTime)}`}
                          >
                            {sh.name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono">
                        {record?.checkIn ? (
                          <span className="flex items-center gap-1 text-success">
                            <IconLogin2 className="h-3.5 w-3.5" />
                            {fmt12(record.checkIn)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono">
                        {record?.checkOut ? (
                          <span className="flex items-center gap-1 text-destructive">
                            <IconLogout2 className="h-3.5 w-3.5" />
                            {fmt12(record.checkOut)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <StatusPill status={d.effectiveStatus} claim={record?.claim} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 tabular-nums">
                        {record && record.workingHours > 0 ? `${record.workingHours}h` : '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 tabular-nums">
                        {d.lateMinutes > 0 ? (
                          <span className="text-warning">{fmtMins(d.lateMinutes)}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 tabular-nums">
                        {d.earlyOutMinutes > 0 ? (
                          <span className="text-warning">{fmtMins(d.earlyOutMinutes)}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 tabular-nums">
                        {record && record.overtime > 0 ? (
                          <span className="text-primary">{record.overtime}h</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        {record?.claim ? (
                          (() => {
                            const c =
                              CLAIM_STATUS_CFG[record.claim.status] ?? CLAIM_STATUS_CFG.PENDING;
                            return (
                              <span
                                className={cn(
                                  'inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                                  c.bg,
                                  c.text
                                )}
                              >
                                {c.label}
                              </span>
                            );
                          })()
                        ) : (
                          <YesNo yes={d.isPunchMis} />
                        )}
                      </td>
                      <td className="max-w-[160px] px-4 py-2.5 text-muted-foreground">
                        <span className="block truncate" title={remarkText ?? undefined}>
                          {remarkText ?? '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};

// ── Claims Tab ────────────────────────────────────────────────────────────────

interface RejectDialogProps {
  claim: AttendanceClaim;
  onClose: () => void;
}

const ClaimInfoLine: React.FC<{ claim: AttendanceClaim }> = ({ claim }) => (
  <p className="mb-3 text-[12px] text-muted-foreground">
    {claim.hrEmployee?.name ?? claim.employeeId} ·{' '}
    {CLAIM_TYPE_LABELS[claim.claimType] ?? claim.claimType} · {claim.date}
  </p>
);

const ReviewNoteField: React.FC<{
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}> = ({ id, label, value, onChange, placeholder }) => (
  <div>
    <label
      htmlFor={id}
      className="mb-1 block text-[12px] font-semibold uppercase tracking-wide text-muted-foreground"
    >
      {label} <span className="text-[10px] font-normal normal-case">(optional)</span>
    </label>
    <textarea
      id={id}
      rows={3}
      className="w-full resize-none rounded-lg border border-border bg-muted px-3 py-2 text-[13px] outline-none focus:border-primary"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  </div>
);

const ApproveDialog: React.FC<RejectDialogProps> = ({ claim, onClose }) => {
  const user = useAppSelector(selectUser);
  const approveMut = useApproveClaim();
  const [note, setNote] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await approveMut.mutateAsync({
        id: claim.id,
        reviewNote: note.trim() || undefined,
        actAsTenantId: resolveActAsTenant(claim.tenant, user?.tenantId),
      });
      toast.success('Claim approved');
      onClose();
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to approve'
      );
    }
  };

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl">
        <h3 className="mb-3 text-[14px] font-semibold">Approve Claim</h3>
        <ClaimInfoLine claim={claim} />
        <form onSubmit={handleSubmit} className="space-y-3">
          <ReviewNoteField
            id="approve-note"
            label="Approval Note"
            value={note}
            onChange={setNote}
            placeholder="Add a note (optional)…"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-[13px] hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={approveMut.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-success px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
            >
              {approveMut.isPending && <IconLoader2 className="h-3.5 w-3.5 animate-spin" />}
              Approve
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
};

const RejectDialog: React.FC<RejectDialogProps> = ({ claim, onClose }) => {
  const user = useAppSelector(selectUser);
  const rejectMut = useRejectClaim();
  const [note, setNote] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await rejectMut.mutateAsync({
        id: claim.id,
        reviewNote: note.trim() || undefined,
        actAsTenantId: resolveActAsTenant(claim.tenant, user?.tenantId),
      });
      toast.success('Claim rejected');
      onClose();
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to reject'
      );
    }
  };

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl">
        <h3 className="mb-3 text-[14px] font-semibold">Reject Claim</h3>
        <ClaimInfoLine claim={claim} />
        <form onSubmit={handleSubmit} className="space-y-3">
          <ReviewNoteField
            id="reject-note"
            label="Rejection Note"
            value={note}
            onChange={setNote}
            placeholder="Reason for rejection (optional)…"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-[13px] hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={rejectMut.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
            >
              {rejectMut.isPending && <IconLoader2 className="h-3.5 w-3.5 animate-spin" />}
              Reject
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
};

const EditReviewDialog: React.FC<RejectDialogProps> = ({ claim, onClose }) => {
  const user = useAppSelector(selectUser);
  const editMut = useEditClaimReview();
  const [status, setStatus] = useState<'APPROVED' | 'REJECTED'>(
    claim.status === 'APPROVED' ? 'APPROVED' : 'REJECTED'
  );
  const [note, setNote] = useState(claim.reviewNote ?? '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await editMut.mutateAsync({
        id: claim.id,
        status,
        reviewNote: note.trim() || undefined,
        actAsTenantId: resolveActAsTenant(claim.tenant, user?.tenantId),
      });
      toast.success('Review updated');
      onClose();
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to update review'
      );
    }
  };

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl">
        <h3 className="mb-3 text-[14px] font-semibold">Edit Review</h3>
        <ClaimInfoLine claim={claim} />
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
              Decision
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStatus('APPROVED')}
                className={cn(
                  'flex-1 rounded-lg border px-3 py-2 text-[13px] font-semibold transition-colors',
                  status === 'APPROVED'
                    ? 'border-success bg-success/10 text-success'
                    : 'border-border bg-muted text-muted-foreground hover:bg-muted-foreground/10'
                )}
              >
                Approved
              </button>
              <button
                type="button"
                onClick={() => setStatus('REJECTED')}
                className={cn(
                  'flex-1 rounded-lg border px-3 py-2 text-[13px] font-semibold transition-colors',
                  status === 'REJECTED'
                    ? 'border-destructive bg-destructive/10 text-destructive'
                    : 'border-border bg-muted text-muted-foreground hover:bg-muted-foreground/10'
                )}
              >
                Rejected
              </button>
            </div>
          </div>
          <ReviewNoteField
            id="edit-note"
            label="Review Note"
            value={note}
            onChange={setNote}
            placeholder="Update note (optional)…"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-[13px] hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editMut.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground disabled:opacity-60"
            >
              {editMut.isPending && <IconLoader2 className="h-3.5 w-3.5 animate-spin" />}
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
};

const ClaimsTab: React.FC<{ employees: EmployeeMeta[] }> = ({ employees }) => {
  const userRole = useAppSelector(selectUserRole);
  const user = useAppSelector(selectUser);
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPERADMIN';
  // A non-admin account with no HRFMS employee link has no attendance record
  // to raise a claim against.
  const canRaiseClaim = isAdmin || !!user?.employeeId;

  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [approveClaim, setApproveClaim] = useState<AttendanceClaim | null>(null);
  const [rejectClaim, setRejectClaim] = useState<AttendanceClaim | null>(null);
  const [editClaim, setEditClaim] = useState<AttendanceClaim | null>(null);
  const [showClaimModal, setShowClaimModal] = useState(false);

  const filters = useMemo(
    () => ({ status: statusFilter || undefined, claimType: typeFilter || undefined }),
    [statusFilter, typeFilter]
  );
  const { data: allClaims = [], isLoading: loadingAll } = useAllClaims(
    isAdmin ? filters : undefined
  );
  const { data: myClaims = [], isLoading: loadingMy } = useMyClaims(!isAdmin);

  const claims = isAdmin
    ? allClaims
    : myClaims.filter((c) => {
        if (statusFilter && c.status !== statusFilter) return false;
        if (typeFilter && c.claimType !== typeFilter) return false;
        return true;
      });
  const isLoading = isAdmin ? loadingAll : loadingMy;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs sm:px-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 cursor-pointer rounded-lg border border-border bg-muted px-3 text-[13px] outline-none focus:border-primary"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 cursor-pointer rounded-lg border border-border bg-muted px-3 text-[13px] outline-none focus:border-primary"
          >
            <option value="">All Types</option>
            <option value="PUNCH_MIS">Punch Mis</option>
            <option value="OVERTIME">Overtime</option>
            <option value="WEEKEND_PRESENT">Weekend Work</option>
            <option value="HOLIDAY_PRESENT">Holiday Work</option>
          </select>
          <span className="ml-auto text-[12px] text-muted-foreground">
            {claims.length} claim{claims.length !== 1 ? 's' : ''}
          </span>
          {canRaiseClaim && (
            <button
              type="button"
              onClick={() => setShowClaimModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <IconFileText className="h-4 w-4" />
              Raise a Claim
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <IconLoader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : claims.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <IconFileText className="h-8 w-8 text-muted-foreground" />
            <p className="text-[14px] font-semibold">No claims found</p>
            <p className="text-[12px] text-muted-foreground">
              {isAdmin
                ? 'Adjust filters or wait for employees to submit claims.'
                : 'You have not raised any claims yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-[13px]">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {[
                    ...(isAdmin ? ['Actions'] : []),
                    ...(claims.some((c) => c.tenant) ? ['Company'] : []),
                    ...(isAdmin ? ['Employee'] : []),
                    'Date',
                    'Type',
                    'Claim Details',
                    'Status',
                    'Submitted',
                  ].map((h) => (
                    <th
                      key={h}
                      className="whitespace-nowrap px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {claims.map((c) => {
                  const sc = CLAIM_STATUS_CFG[c.status] ?? {
                    label: c.status,
                    bg: 'bg-muted',
                    text: 'text-muted-foreground',
                  };
                  return (
                    <tr key={c.id} className="transition-colors hover:bg-muted/30">
                      {isAdmin && (
                        <td className="whitespace-nowrap px-4 py-3">
                          {c.status === 'PENDING' ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setApproveClaim(c)}
                                className="inline-flex items-center gap-1 rounded-lg border border-success/30 bg-success/10 px-2.5 py-1.5 text-[11px] font-semibold text-success hover:bg-success/20"
                              >
                                <IconThumbUp className="h-3 w-3" /> Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => setRejectClaim(c)}
                                className="inline-flex items-center gap-1 rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-[11px] font-semibold text-destructive hover:bg-destructive/20"
                              >
                                <IconThumbDown className="h-3 w-3" /> Reject
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setEditClaim(c)}
                              className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-muted-foreground/10"
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      )}
                      {claims.some((x) => x.tenant) && (
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {c.tenant?.name ?? '—'}
                        </td>
                      )}
                      {isAdmin && (
                        <td className="whitespace-nowrap px-4 py-3">
                          <p className="font-semibold">{c.hrEmployee?.name ?? c.employeeId}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {c.hrEmployee?.designation ?? c.employeeId}
                          </p>
                        </td>
                      )}
                      <td className="whitespace-nowrap px-4 py-3 font-medium">
                        {new Date(`${c.date}T00:00:00`).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {CLAIM_TYPE_LABELS[c.claimType] ?? c.claimType}
                      </td>
                      <td className="max-w-[220px] px-4 py-3">
                        <p className="truncate text-[12px]" title={c.reason}>
                          {c.reason}
                        </p>
                        {(c.checkIn || c.checkOut) && (
                          <p className="text-[11px] text-muted-foreground">
                            {c.checkIn && `In: ${c.checkIn}`}
                            {c.checkIn && c.checkOut ? '  ' : ''}
                            {c.checkOut && `Out: ${c.checkOut}`}
                          </p>
                        )}
                        {c.overtimeHours && (
                          <p className="text-[11px] text-muted-foreground">
                            OT: {c.overtimeHours}h
                          </p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                            sc.bg,
                            sc.text
                          )}
                        >
                          {sc.label}
                        </span>
                        {c.reviewNote && (
                          <p
                            className="mt-0.5 max-w-[140px] truncate text-[10px] text-muted-foreground"
                            title={c.reviewNote}
                          >
                            {c.reviewNote}
                          </p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {new Date(c.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {approveClaim && <ApproveDialog claim={approveClaim} onClose={() => setApproveClaim(null)} />}
      {rejectClaim && <RejectDialog claim={rejectClaim} onClose={() => setRejectClaim(null)} />}
      {editClaim && <EditReviewDialog claim={editClaim} onClose={() => setEditClaim(null)} />}
      {showClaimModal && (
        <ClaimModal
          onClose={() => setShowClaimModal(false)}
          isAdmin={isAdmin}
          employees={isAdmin ? employees : []}
          defaultEmployeeId={isAdmin ? undefined : (user?.employeeId ?? undefined)}
          defaultEmployeeName={
            isAdmin
              ? undefined
              : user?.fullName ||
                (typeof user?.name === 'string' ? user.name : undefined) ||
                undefined
          }
        />
      )}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

export const MainEmployeeAttendance = () => {
  // Guards the self check-in/check-out buttons only (below) — every other
  // write in this component now resolves its own target company inline via
  // resolveActAsTenant, see saveImportedRows/ApproveDialog/etc.
  const requireCompanySelected = useRequireCompanySelected();
  const now = new Date();
  const today = todayStr();
  const currentYear = now.getFullYear();

  const currentUserRole = useAppSelector(selectUserRole);
  const currentUser = useAppSelector(selectUser);
  const roleUpper = String(currentUserRole || '').toUpperCase().replace(/[^A-Z]/g, '');
  const isAdmin =
    !currentUser?.employeeId ||
    roleUpper.includes('ADMIN') ||
    roleUpper.includes('SUPER') ||
    roleUpper.includes('HR');

  const {
    data: rawEmployees,
    isLoading: loadingEmps,
    isError: errEmps,
    refetch,
  } = useAttendanceEmployees();
  const employees = useMemo(() => {
    if (Array.isArray(rawEmployees)) {
      return rawEmployees;
    }
    return [] as EmployeeMeta[];
  }, [rawEmployees]);

  const { data: rawShifts } = useAttendanceShifts();
  const allShifts = useMemo(
    () => (Array.isArray(rawShifts) ? rawShifts : []),
    [rawShifts]
  );

  const { data: rawHolidays } = useAttendanceHolidays(currentYear);
  const holidayList = useMemo(
    () => (Array.isArray(rawHolidays) ? rawHolidays : []),
    [rawHolidays]
  );

  const defaultShift: ShiftInfo | null = useMemo(
    () => allShifts.find((s) => s.isDefault) ?? allShifts[0] ?? null,
    [allShifts]
  );

  const holidaySet = useMemo(
    () => new Set(holidayList.map((h) => h.date.slice(0, 10))),
    [holidayList]
  );

  const [mainTab, setMainTab] = useState<'attendance' | 'submit' | 'claims' | 'config'>(
    'attendance'
  );
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [viewEmp, setViewEmp] = useState<EmployeeMeta | null>(null);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const { data: monthlyData = [], isLoading: loadingMonthly } = useMonthlyAttendance(
    selectedYear,
    selectedMonth
  );

  // Self check-in/out and claims only make sense for a real HRFMS employee —
  // an external/admin-only login has no attendance record to punch against.
  const isHrEmployee = !!currentUser?.employeeId;
  const { data: todayRecord, isLoading: todayLoading } = useMyToday({ enabled: isHrEmployee });
  const checkInMut = useSelfCheckIn();
  const checkOutMut = useSelfCheckOut();
  const isCheckedIn = !!todayRecord?.checkIn;
  const isCheckedOut = !!todayRecord?.checkOut;

  // ── Import state ────────────────────────────────────────────────────────────
  const upsertAttendance = useUpsertAttendance();
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewRows, setPreviewRows] = useState<PreviewAttendanceRow[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [saveResult, setSaveResult] = useState<{ saved: number; failed: number } | null>(null);
  const fmt12My = (t: string | null): string => {
    if (!t) return '—';
    const [hStr, mStr] = t.split(':');
    const h = parseInt(hStr ?? '0', 10);
    const m = parseInt(mStr ?? '0', 10);
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  };

  const departments = getDepartments(employees);
  const dayName = getDayName(today);
  const defaultOffDays = parseOffDays(
    (allShifts.find((s) => s.isDefault) ?? allShifts[0])?.weeklyOffDays
  );
  const workingDay = isWorkingDay(today, holidaySet, defaultOffDays);

  const availableYears = useMemo(
    () => Array.from({ length: 3 }, (_, i) => currentYear - i),
    [currentYear]
  );

  // Base rows on employees; join monthly summary per employee for stats columns
  const rows = useMemo(() => {
    const summaryMap = new Map((monthlyData || []).map((s) => [s.employeeId, s]));
    const term = search.toLowerCase().trim();

    return employees
      .filter((emp) => {
        if (!isAdmin && currentUser?.employeeId) {
          return emp.employeeId === currentUser.employeeId;
        }
        const matchSearch =
          !term ||
          (emp.name ?? '').toLowerCase().includes(term) ||
          (emp.empCode ?? '').toLowerCase().includes(term) ||
          (emp.employeeId ?? '').toLowerCase().includes(term) ||
          (emp.email ?? '').toLowerCase().includes(term);
        const matchDept = !deptFilter || emp.department?.name === deptFilter;
        return matchSearch && matchDept;
      })
      .map((emp) => {
        const fromApi = summaryMap.get(emp.employeeId);
        const summary: MonthlyAttendanceSummary = {
          employeeId: emp.employeeId,
          empCode: emp.empCode,
          employeeName: emp.name ?? 'Employee',
          department: emp.department?.name ?? 'General',
          workingDays: fromApi?.workingDays ?? 0,
          regularDays: fromApi?.regularDays ?? 0,
          holidayWorked: fromApi?.holidayWorked ?? 0,
          weekendWorked: fromApi?.weekendWorked ?? 0,
          totalPresent: fromApi?.totalPresent ?? 0,
          absentDays: fromApi?.absentDays ?? 0,
          halfDays: fromApi?.halfDays ?? 0,
          leaveDays: fromApi?.leaveDays ?? 0,
          lateDays: fromApi?.lateDays ?? 0,
          attendancePercentage: fromApi?.attendancePercentage ?? 0,
        };
        return { emp, summary };
      });
  }, [employees, monthlyData, search, deptFilter, isAdmin, currentUser]);

  // ── Import helpers ──────────────────────────────────────────────────────────
  const importFromExcel = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const XLSX = await import('xlsx');
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { raw: true });
        const parsed: PreviewAttendanceRow[] = [];
        const errors: string[] = [];

        const parseDate = (raw: unknown): { iso: string; display: string } | null => {
          if (raw == null || raw === '') return null;
          if (raw instanceof Date) {
            const y = raw.getFullYear();
            const m = String(raw.getMonth() + 1).padStart(2, '0');
            const d = String(raw.getDate()).padStart(2, '0');
            return { iso: `${y}-${m}-${d}`, display: `${d}/${m}/${y}` };
          }
          if (typeof raw === 'number') {
            const jsDate = new Date(Math.round((raw - 25569) * 86400 * 1000));
            if (!Number.isNaN(jsDate.getTime())) {
              const y = jsDate.getUTCFullYear();
              const m = String(jsDate.getUTCMonth() + 1).padStart(2, '0');
              const d = String(jsDate.getUTCDate()).padStart(2, '0');
              return { iso: `${y}-${m}-${d}`, display: `${d}/${m}/${y}` };
            }
            return null;
          }
          const s = String(raw).trim();
          const ddmm = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
          if (ddmm) {
            const dd = ddmm[1].padStart(2, '0');
            const mm = ddmm[2].padStart(2, '0');
            return { iso: `${ddmm[3]}-${mm}-${dd}`, display: `${dd}/${mm}/${ddmm[3]}` };
          }
          const yyyymm = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
          if (yyyymm) return { iso: s, display: `${yyyymm[3]}/${yyyymm[2]}/${yyyymm[1]}` };
          return null;
        };

        const parseTime = (raw: unknown): string | null => {
          if (raw == null || raw === '') return null;
          const s = String(raw).trim();
          if (/^\d{1,2}:\d{2}$/.test(s)) return s.padStart(5, '0');
          return null;
        };

        for (const [idx, row] of rows.entries()) {
          const rowNum = idx + 2;
          const rawEmpId = row.EmployeeID ?? row.employeeId ?? row['Employee ID'];
          if (!rawEmpId) {
            errors.push(`Row ${rowNum}: Missing EmployeeID`);
            continue;
          }
          const empIdStr = String(rawEmpId).trim();
          const emp = employees.find(
            (em) =>
              em.employeeId === empIdStr ||
              (em.empCode && em.empCode.toLowerCase() === empIdStr.toLowerCase()) ||
              em.employeeId.toLowerCase() === empIdStr.toLowerCase()
          );
          if (!emp) {
            errors.push(`Row ${rowNum}: Employee ID / Code "${empIdStr}" not found`);
            continue;
          }
          const rawDate = row.Date ?? row.date;
          if (rawDate == null || rawDate === '') {
            errors.push(`Row ${rowNum}: Missing Date`);
            continue;
          }
          const dateResult = parseDate(rawDate);
          if (!dateResult) {
            errors.push(`Row ${rowNum}: Invalid Date "${rawDate}" — use dd/mm/yyyy`);
            continue;
          }
          const rawStatus = String(row.Status ?? row.status ?? '')
            .trim()
            .toLowerCase();
          if (!rawStatus) {
            errors.push(`Row ${rowNum}: Missing Status`);
            continue;
          }
          const normalizedStatus = rawStatus === 'halfday' ? 'half_day' : rawStatus;
          if (!VALID_STATUSES.includes(normalizedStatus)) {
            errors.push(
              `Row ${rowNum}: Invalid Status "${rawStatus}" — must be one of: ${VALID_STATUSES.join(', ')}`
            );
            continue;
          }
          const rawShiftName = row.ShiftName ?? row.Shift ?? null;
          let shiftId: string | null = null;
          let shiftName: string | null = null;
          if (rawShiftName) {
            const matched = allShifts.find(
              (s) => s.name.toLowerCase() === String(rawShiftName).toLowerCase()
            );
            if (matched) {
              shiftId = matched.id;
              shiftName = matched.name;
            } else {
              errors.push(
                `Row ${rowNum}: ShiftName "${rawShiftName}" not found — row imported without shift`
              );
            }
          }
          parsed.push({
            _id: idx,
            employeeId: emp.employeeId,
            empCode: emp.empCode,
            employeeName: emp.name ?? emp.empCode ?? emp.employeeId,
            date: dateResult.display,
            parsedDate: dateResult.iso,
            status: normalizedStatus,
            checkIn: parseTime(row.CheckIn ?? row.checkIn ?? row['Check In']),
            checkOut: parseTime(row.CheckOut ?? row.checkOut ?? row['Check Out']),
            shiftId,
            shiftName,
            notes: row.Notes ? String(row.Notes) : null,
          });
        }

        setImportErrors(errors);
        setPreviewRows(parsed);
        setSelectedRowIds(new Set(parsed.map((r) => r._id)));
        setSaveResult(null);
        setShowPreviewModal(true);
      };
      reader.readAsArrayBuffer(file);
    },
    [employees, allShifts]
  );

  const downloadSampleCsv = useCallback(() => {
    const firstEmp = employees[0]?.empCode ?? employees[0]?.employeeId ?? 'EMP001';
    const secondEmp = employees[1]?.empCode ?? employees[1]?.employeeId ?? 'EMP002';
    const firstShift = allShifts[0]?.name ?? 'Morning Shift';
    const todayDate = new Date();
    const dd = String(todayDate.getDate()).padStart(2, '0');
    const mm = String(todayDate.getMonth() + 1).padStart(2, '0');
    const yyyy = todayDate.getFullYear();
    const yesterday = new Date(todayDate);
    yesterday.setDate(todayDate.getDate() - 1);
    const ydd = String(yesterday.getDate()).padStart(2, '0');
    const ymm = String(yesterday.getMonth() + 1).padStart(2, '0');
    const headers = ['EmployeeID', 'Date', 'Status', 'CheckIn', 'CheckOut', 'ShiftName', 'Notes'];
    const row1 = [firstEmp, `${dd}/${mm}/${yyyy}`, 'present', '09:00', '18:00', firstShift, ''];
    const row2 = [secondEmp, `${ydd}/${ymm}/${yyyy}`, 'absent', '', '', '', 'Informed leave'];
    const row3 = [firstEmp, `${ydd}/${ymm}/${yyyy}`, 'half_day', '09:00', '13:00', firstShift, ''];
    const csv = [headers.join(','), row1.join(','), row2.join(','), row3.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_attendance_import.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [employees, allShifts]);

  const handleExport = useCallback(async () => {
    if (!rows || rows.length === 0) {
      toast.error('No attendance data to export');
      return;
    }

    setIsExporting(true);
    try {
      const XLSX = await import('xlsx');
      const exportData = rows.map(({ emp, summary }) => {
        const reg = summary?.regularDays ?? 0;
        const regularFormatted = reg % 1 === 0 ? reg : Number(reg.toFixed(1));
        const regularDisplay = summary?.workingDays
          ? `${regularFormatted} / ${summary.workingDays}`
          : `${regularFormatted}`;

        return {
          'Employee Code': emp.empCode || emp.employeeId,
          'Employee Name': emp.name || emp.email || '—',
          'Department': emp.department?.name || '—',
          'Designation': emp.designation || '—',
          'Regular Days': regularDisplay,
          'Holiday Work': summary?.holidayWorked ?? 0,
          'Weekend Work': summary?.weekendWorked ?? 0,
          'Total Present': summary?.totalPresent ?? 0,
          'Absent Days': summary?.absentDays ?? 0,
          'Leave Days': summary?.leaveDays ?? 0,
          'Late Days': summary?.lateDays ?? 0,
          'Attendance %': `${(summary?.attendancePercentage ?? 0).toFixed(1)}%`,
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Records');

      const monthName = MONTHS[selectedMonth - 1] || `Month_${selectedMonth}`;
      XLSX.writeFile(workbook, `Attendance_Records_${monthName}_${selectedYear}.xlsx`);
      toast.success(`Exported ${rows.length} attendance record${rows.length !== 1 ? 's' : ''}`);
    } catch (error) {
      console.error('Failed to export attendance records:', error);
      toast.error('Failed to export attendance records');
    } finally {
      setIsExporting(false);
    }
  }, [rows, selectedMonth, selectedYear]);

  const saveImportedRows = useCallback(async () => {
    const toSave = previewRows.filter((r) => selectedRowIds.has(r._id));
    setIsSaving(true);
    let saved = 0;
    let failed = 0;
    await Promise.all(
      toSave.map(async (r) => {
        try {
          const emp = employees.find((e) => e.employeeId === r.employeeId);
          await upsertAttendance.mutateAsync({
            payload: {
              employeeId: r.employeeId,
              date: r.parsedDate,
              status: r.status,
              checkIn: r.checkIn,
              checkOut: r.checkOut,
              shiftId: r.shiftId,
              notes: r.notes,
            },
            actAsTenantId: resolveActAsTenant(emp?.tenant, currentUser?.tenantId),
          });
          saved++;
        } catch {
          failed++;
        }
      })
    );
    setIsSaving(false);
    setSaveResult({ saved, failed });
    if (failed === 0) {
      refetch();
      setTimeout(() => {
        setShowPreviewModal(false);
        setPreviewRows([]);
        setImportErrors([]);
        setSelectedRowIds(new Set());
        setSaveResult(null);
      }, 1200);
    }
  }, [previewRows, selectedRowIds, upsertAttendance, refetch, employees, currentUser?.tenantId]);

  const calendarStats = useMemo(() => {
    const totalDays = new Date(selectedYear, selectedMonth, 0).getDate();
    let workingDays = 0;
    let weekendDays = 0;
    for (let d = 1; d <= totalDays; d++) {
      const day = new Date(selectedYear, selectedMonth - 1, d).getDay();
      if (day === 0 || day === 6) weekendDays++;
      else workingDays++;
    }
    const nowYear = now.getFullYear();
    const nowMonth = now.getMonth() + 1;
    let elapsed: number;
    let remaining: number;
    if (selectedYear === nowYear && selectedMonth === nowMonth) {
      elapsed = now.getDate();
      remaining = totalDays - elapsed;
    } else if (selectedYear < nowYear || (selectedYear === nowYear && selectedMonth < nowMonth)) {
      elapsed = totalDays;
      remaining = 0;
    } else {
      elapsed = 0;
      remaining = totalDays;
    }
    return { totalDays, workingDays, weekendDays, elapsed, remaining };
  }, [selectedYear, selectedMonth, now.getDate, now.getFullYear, now.getMonth]);

  // Only block on employees loading; monthly summary loads reactively
  const isLoading = loadingEmps;

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <IconLoader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-[13px]">Loading attendance…</p>
        </div>
      </div>
    );
  }

  if (errEmps) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
          <IconAlertCircle className="h-7 w-7 text-destructive" />
          <p className="text-[13px] font-semibold text-destructive">Failed to load employees</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-[12px] font-semibold text-primary-foreground"
          >
            <IconRefresh className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background text-foreground grow">
      {/* Hidden file input for CSV/Excel import */}
      <input
        ref={csvInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) importFromExcel(f);
          e.target.value = '';
        }}
      />

      <div className="mx-auto max-w-[1600px] space-y-5 px-4 pt-6 pb-10 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4 shadow-xs sm:px-6 sm:py-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[11px] bg-primary/12 text-primary">
            <IconCalendarStats className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h1 className="text-[20px] font-bold leading-tight tracking-[-0.02em]">Attendance</h1>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
              <span>
                {new Date().toLocaleDateString('en-IN', {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
              <span>·</span>
              <span className="font-medium">{dayName}</span>
              <YesNo yes={workingDay} />
              {holidaySet.has(today) && (
                <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-blue-500">
                  Holiday
                </span>
              )}
            </div>
          </div>
          {/* Check-in / Check-out — only for accounts linked to a real HRFMS employee */}
          {isHrEmployee && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {todayRecord?.checkIn && (
                <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                  <IconLogin2 className="h-4 w-4 text-success" />
                  <span className="font-semibold tabular-nums text-foreground">
                    {fmt12My(todayRecord.checkIn)}
                  </span>
                  {todayRecord.checkOut && (
                    <>
                      <IconLogout2 className="ml-1 h-4 w-4 text-destructive" />
                      <span className="font-semibold tabular-nums text-foreground">
                        {fmt12My(todayRecord.checkOut)}
                      </span>
                    </>
                  )}
                </div>
              )}
              {todayLoading ? (
                <IconLoader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : isCheckedOut ? (
                <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-1.5 text-[13px] font-semibold text-success">
                  <IconCheck className="h-4 w-4" strokeWidth={2.5} /> Checked Out
                </div>
              ) : isCheckedIn ? (
                <button
                  type="button"
                  onClick={() => {
                    if (!requireCompanySelected()) return;
                    checkOutMut.mutate(undefined);
                  }}
                  disabled={checkOutMut.isPending}
                  className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-[13px] font-semibold text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-60"
                >
                  {checkOutMut.isPending ? (
                    <IconLoader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <IconLogout2 className="h-4 w-4" />
                  )}
                  Check Out
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (!requireCompanySelected()) return;
                    checkInMut.mutate(undefined);
                  }}
                  disabled={checkInMut.isPending}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-1.5 text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                >
                  {checkInMut.isPending ? (
                    <IconLoader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <IconLogin2 className="h-4 w-4" />
                  )}
                  Check In
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tab switcher */}
        <div className="overflow-x-auto">
          <div className="flex w-fit items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-xs">
            {(
              [
                { key: 'attendance', label: 'Attendance', Icon: IconCalendarStats },
                ...(isAdmin
                  ? ([{ key: 'submit', label: 'Mark Attendance', Icon: IconCamera }] as const)
                  : []),
                { key: 'claims', label: 'Claim Requests', Icon: IconFileText },
                ...(isAdmin
                  ? ([{ key: 'config', label: 'Attendance Config', Icon: IconSettings }] as const)
                  : []),
              ] as const
            ).map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setMainTab(key)}
                className={cn(
                  'inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-[13px] font-semibold transition-colors',
                  mainTab === key
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {mainTab === 'submit' && isAdmin && <SubmitAttendanceTab employees={employees} />}

        {mainTab === 'claims' && <ClaimsTab employees={employees} />}

        {mainTab === 'config' && isAdmin && <AttendanceConfigTab />}

        {mainTab === 'attendance' && (
          <>
            {/* Month/Year selector + KPI strip */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-xs sm:p-5">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <p className="text-[13px] font-semibold text-muted-foreground">Viewing month:</p>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="h-9 cursor-pointer rounded-lg border border-border bg-background px-3 text-[13px] font-medium outline-none focus:border-primary"
                >
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="h-9 cursor-pointer rounded-lg border border-border bg-background px-3 text-[13px] font-medium outline-none focus:border-primary"
                >
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <span className="ml-auto text-[12px] text-muted-foreground">
                  {monthlyData.length} employee{monthlyData.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {[
                  {
                    label: 'Total Days',
                    value: calendarStats.totalDays,
                    sub: `${MONTHS[selectedMonth - 1]} ${selectedYear}`,
                    Icon: IconCalendar,
                    tint: 'bg-primary/10 text-primary',
                    vc: 'text-foreground',
                  },
                  {
                    label: 'Working Days',
                    value: calendarStats.workingDays,
                    sub: 'Mon – Fri',
                    Icon: IconBriefcase,
                    tint: 'bg-success/10 text-success',
                    vc: 'text-success',
                  },
                  {
                    label: 'Weekends',
                    value: calendarStats.weekendDays,
                    sub: 'Sat & Sun',
                    Icon: IconSun,
                    tint: 'bg-warning/10 text-warning',
                    vc: 'text-warning',
                  },
                  {
                    label: 'Days Elapsed',
                    value: calendarStats.elapsed,
                    sub: 'Since month start',
                    Icon: IconCalendarCheck,
                    tint: 'bg-primary/10 text-primary',
                    vc: 'text-primary',
                  },
                  {
                    label: 'Days Remaining',
                    value: calendarStats.remaining,
                    sub: calendarStats.remaining === 0 ? 'Month complete' : 'Until month end',
                    Icon: IconCalendarTime,
                    tint: 'bg-muted text-muted-foreground',
                    vc: 'text-foreground',
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="rounded-xl border border-border bg-background p-4 sm:p-5"
                  >
                    <div
                      className={cn(
                        'mb-3 inline-flex h-9 w-9 items-center justify-center rounded-[9px]',
                        s.tint
                      )}
                    >
                      <s.Icon className="h-5 w-5" />
                    </div>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {s.label}
                    </p>
                    <p className={cn('text-[28px] font-bold leading-none tabular-nums', s.vc)}>
                      {s.value}
                    </p>
                    <p className="mt-1.5 text-[10px] text-muted-foreground">{s.sub}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Filter bar — admin only */}
            {isAdmin && (
              <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs sm:px-5">
                <div className="flex flex-col gap-2.5 md:flex-row md:items-center">
                  <div className="relative flex-1">
                    <IconSearch className="pointer-events-none absolute top-1/2 left-3.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search by name or ID…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="h-10 w-full rounded-lg border border-border bg-muted pl-10 pr-3 text-[13px] outline-none focus:border-primary"
                    />
                  </div>
                  <select
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                    className="h-10 cursor-pointer rounded-lg border border-border bg-muted px-3 text-[13px] font-medium outline-none focus:border-primary md:min-w-44"
                  >
                    <option value="">All Departments</option>
                    {departments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Monthly summary table */}
            <div className="rounded-2xl border border-border bg-card shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 overflow-hidden rounded-t-2xl border-b border-border px-5 py-3.5">
                <h2 className="text-[14px] font-semibold">
                  Attendance Records —{' '}
                  <span className="text-muted-foreground">
                    {MONTHS[selectedMonth - 1]} {selectedYear}
                  </span>
                </h2>
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {rows.length} employee{rows.length !== 1 ? 's' : ''}
                    </span>
                  )}
                  {isAdmin && (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowImportModal(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-1.5 text-[12px] font-semibold text-foreground transition-opacity hover:opacity-80"
                      >
                        <IconUpload className="h-3.5 w-3.5" /> Import
                      </button>
                      <button
                        type="button"
                        onClick={handleExport}
                        disabled={isExporting}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[12px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        {isExporting ? (
                          <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <IconDownload className="h-3.5 w-3.5" />
                        )}
                        Export
                      </button>
                    </>
                  )}
                </div>
              </div>

              {employees.length === 0 ? (
                <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                  <IconUsers className="h-8 w-8 text-muted-foreground" />
                  <p className="text-[14px] font-semibold">No active employees found</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-b-2xl">
                  <table className="w-full min-w-[900px] text-[13px]">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        {[
                          'Action',
                          'Emp Code',
                          'Name',
                          'Department',
                          'Regular',
                          'Holiday Work',
                          'Weekend Work',
                          'Total Present',
                          'Absent',
                          'Leave',
                          'Late Days',
                          'Att %',
                        ].map((h) => (
                          <th
                            key={h}
                            className="whitespace-nowrap px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {rows.map(({ emp, summary }) => {
                        const pct = summary?.attendancePercentage ?? 0;
                        return (
                          <tr key={emp.employeeId} className="transition-colors hover:bg-muted/30">
                            <td className="whitespace-nowrap px-4 py-3">
                              <button
                                type="button"
                                onClick={() => setViewEmp(emp)}
                                className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] font-semibold hover:bg-muted"
                              >
                                <IconCalendarMonth className="h-3.5 w-3.5" /> View
                              </button>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 font-mono text-[12px] font-semibold text-foreground">
                              {emp.empCode || emp.employeeId}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                                  {initials(emp.name)}
                                </div>
                                <div>
                                  <p className="font-semibold leading-tight">
                                    {emp.name ?? emp.email}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground">
                                    {emp.designation ?? '—'}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                              {emp.department?.name ?? '—'}
                            </td>
                            {/* Regular — X / workingDays */}
                            <td className="whitespace-nowrap px-4 py-3">
                              {loadingMonthly && !summary ? (
                                <span className="text-muted-foreground">—</span>
                              ) : (
                                <span className="tabular-nums">
                                  <span className="font-semibold text-foreground">
                                    {(summary?.regularDays ?? 0) % 1 === 0
                                      ? (summary?.regularDays ?? 0)
                                      : (summary?.regularDays ?? 0).toFixed(1)}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground">
                                    {' '}
                                    / {summary?.workingDays ?? '—'}
                                  </span>
                                </span>
                              )}
                            </td>
                            {/* Holiday Work */}
                            <td className="whitespace-nowrap px-4 py-3">
                              {loadingMonthly && !summary ? (
                                <span className="text-muted-foreground">—</span>
                              ) : (
                                <span
                                  className={cn(
                                    'font-semibold tabular-nums',
                                    (summary?.holidayWorked ?? 0) > 0
                                      ? 'text-blue-500'
                                      : 'text-muted-foreground'
                                  )}
                                >
                                  {summary?.holidayWorked ?? 0}
                                </span>
                              )}
                            </td>
                            {/* Weekend Work */}
                            <td className="whitespace-nowrap px-4 py-3">
                              {loadingMonthly && !summary ? (
                                <span className="text-muted-foreground">—</span>
                              ) : (
                                <span
                                  className={cn(
                                    'font-semibold tabular-nums',
                                    (summary?.weekendWorked ?? 0) > 0
                                      ? 'text-warning'
                                      : 'text-muted-foreground'
                                  )}
                                >
                                  {summary?.weekendWorked ?? 0}
                                </span>
                              )}
                            </td>
                            {/* Total Present */}
                            <td className="whitespace-nowrap px-4 py-3">
                              {loadingMonthly && !summary ? (
                                <span className="text-muted-foreground">—</span>
                              ) : (
                                <span className="font-semibold tabular-nums text-success">
                                  {(summary?.totalPresent ?? 0) % 1 === 0
                                    ? (summary?.totalPresent ?? 0)
                                    : (summary?.totalPresent ?? 0).toFixed(1)}
                                </span>
                              )}
                            </td>
                            {/* Absent */}
                            <td className="whitespace-nowrap px-4 py-3">
                              {loadingMonthly && !summary ? (
                                <span className="text-muted-foreground">—</span>
                              ) : (
                                <span
                                  className={cn(
                                    'font-semibold tabular-nums',
                                    (summary?.absentDays ?? 0) > 0
                                      ? 'text-destructive'
                                      : 'text-muted-foreground'
                                  )}
                                >
                                  {summary?.absentDays ?? 0}
                                </span>
                              )}
                            </td>
                            {/* Leave */}
                            <td className="whitespace-nowrap px-4 py-3">
                              {loadingMonthly && !summary ? (
                                <span className="text-muted-foreground">—</span>
                              ) : (
                                <span className="font-semibold tabular-nums text-primary">
                                  {summary?.leaveDays ?? 0}
                                </span>
                              )}
                            </td>
                            {/* Late Days */}
                            <td className="whitespace-nowrap px-4 py-3">
                              {loadingMonthly && !summary ? (
                                <span className="text-muted-foreground">—</span>
                              ) : (
                                <span
                                  className={cn(
                                    'font-semibold tabular-nums',
                                    (summary?.lateDays ?? 0) > 0
                                      ? 'text-orange-500'
                                      : 'text-muted-foreground'
                                  )}
                                >
                                  {summary?.lateDays ?? 0}
                                </span>
                              )}
                            </td>
                            {/* Attendance % */}
                            <td className="whitespace-nowrap px-4 py-3">
                              {loadingMonthly && !summary ? (
                                <span className="text-muted-foreground">—</span>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                                    <div
                                      className={cn(
                                        'h-full rounded-full',
                                        pct >= 75
                                          ? 'bg-success'
                                          : pct >= 50
                                            ? 'bg-warning'
                                            : 'bg-destructive'
                                      )}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <span
                                    className={cn(
                                      'text-[12px] font-semibold tabular-nums',
                                      pct >= 75
                                        ? 'text-success'
                                        : pct >= 50
                                          ? 'text-warning'
                                          : 'text-destructive'
                                    )}
                                  >
                                    {pct}%
                                  </span>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {viewEmp && (
        <MonthlyModal
          emp={viewEmp}
          defaultShift={defaultShift}
          onClose={() => setViewEmp(null)}
          initialYear={selectedYear}
          initialMonth={selectedMonth}
        />
      )}

      {/* ── Import Instructions Modal ── */}
      {showImportModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            zIndex: 9000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
          onClick={() => setShowImportModal(false)}
        >
          <div
            style={{
              background: T.card,
              borderRadius: 14,
              padding: '28px 32px',
              maxWidth: 560,
              width: '90%',
              boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
              fontFamily: T.font,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <IconUpload size={18} color={T.primary} />
              <h2 style={{ fontSize: 17, fontWeight: 700, color: T.fg, margin: 0 }}>
                Import Attendance from CSV / Excel
              </h2>
            </div>
            <p style={{ fontSize: 13, color: T.mutedFg, marginBottom: 18 }}>
              Upload a <strong>.csv</strong> or <strong>.xlsx</strong> file. Each row creates or
              updates one attendance record.
            </p>

            {/* Required columns */}
            <div
              style={{
                background: T.primaryBg,
                border: `1px solid color-mix(in oklch, ${T.primary} 25%, transparent)`,
                borderRadius: 8,
                padding: '14px 16px',
                marginBottom: 14,
              }}
            >
              <p style={{ fontSize: 12, fontWeight: 600, color: T.primary, marginBottom: 10 }}>
                Required Columns
              </p>
              {(
                [
                  {
                    col: 'EmployeeID',
                    type: 'text',
                    note: 'Must match an existing employee ID (e.g. EMP001)',
                  },
                  { col: 'Date', type: 'date', note: 'Format: dd/mm/yyyy (e.g. 15/06/2025)' },
                  {
                    col: 'Status',
                    type: 'enum',
                    note: 'present · absent · half_day · leave · holiday · overtime',
                  },
                ] as const
              ).map(({ col, type, note }) => (
                <div
                  key={col}
                  style={{ display: 'flex', gap: 8, marginBottom: 7, alignItems: 'flex-start' }}
                >
                  <span
                    style={{
                      minWidth: 100,
                      fontSize: 11,
                      fontWeight: 700,
                      color: T.primaryFg,
                      background: T.primary,
                      borderRadius: 4,
                      padding: '3px 8px',
                      flexShrink: 0,
                    }}
                  >
                    {col}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: T.mutedFg,
                      background: T.muted,
                      borderRadius: 4,
                      padding: '3px 7px',
                      flexShrink: 0,
                    }}
                  >
                    {type}
                  </span>
                  <span style={{ fontSize: 12, color: T.mutedFg, paddingTop: 2 }}>{note}</span>
                </div>
              ))}
            </div>

            {/* Optional columns */}
            <div
              style={{
                background: T.muted,
                borderRadius: 8,
                padding: '14px 16px',
                marginBottom: 20,
              }}
            >
              <p style={{ fontSize: 12, fontWeight: 600, color: T.fg, marginBottom: 10 }}>
                Optional Columns
              </p>
              {(
                [
                  { col: 'CheckIn', type: 'time', note: 'HH:MM format (e.g. 09:00)' },
                  { col: 'CheckOut', type: 'time', note: 'HH:MM format (e.g. 18:00)' },
                  { col: 'ShiftName', type: 'text', note: 'Must match an existing shift name' },
                  { col: 'Notes', type: 'text', note: 'Any remarks for this record' },
                ] as const
              ).map(({ col, type, note }) => (
                <div
                  key={col}
                  style={{ display: 'flex', gap: 8, marginBottom: 7, alignItems: 'flex-start' }}
                >
                  <span
                    style={{
                      minWidth: 100,
                      fontSize: 11,
                      fontWeight: 600,
                      color: T.fg,
                      background: 'color-mix(in oklch, var(--muted-foreground) 15%, transparent)',
                      borderRadius: 4,
                      padding: '3px 8px',
                      flexShrink: 0,
                    }}
                  >
                    {col}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: T.mutedFg,
                      background: T.card,
                      borderRadius: 4,
                      padding: '3px 7px',
                      flexShrink: 0,
                    }}
                  >
                    {type}
                  </span>
                  <span style={{ fontSize: 12, color: T.mutedFg, paddingTop: 2 }}>{note}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: `1px solid ${T.border}`,
                  background: 'transparent',
                  color: T.mutedFg,
                  fontSize: 13,
                  cursor: 'pointer',
                  fontFamily: T.font,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={downloadSampleCsv}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: `1px solid ${T.border}`,
                  background: T.muted,
                  color: T.fg,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontFamily: T.font,
                }}
              >
                <IconDownload size={14} /> Download Sample CSV
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  csvInputRef.current?.click();
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: T.primary,
                  color: T.primaryFg,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontFamily: T.font,
                }}
              >
                <IconUpload size={14} /> Choose File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Import Preview Modal ── */}
      {showPreviewModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            zIndex: 9500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            style={{
              background: T.card,
              borderRadius: 14,
              padding: '24px 28px',
              maxWidth: 1000,
              width: '100%',
              maxHeight: '88vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 12px 48px rgba(0,0,0,0.22)',
              fontFamily: T.font,
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginBottom: 16,
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: T.fg, margin: 0 }}>
                  Review Attendance Import
                </h2>
                <p style={{ fontSize: 12, color: T.mutedFg, margin: '4px 0 0' }}>
                  {selectedRowIds.size} of {previewRows.length} row
                  {previewRows.length !== 1 ? 's' : ''} selected — uncheck rows to skip them
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowPreviewModal(false);
                    setPreviewRows([]);
                    setImportErrors([]);
                    setSelectedRowIds(new Set());
                    setSaveResult(null);
                  }}
                  style={{
                    padding: '7px 16px',
                    borderRadius: 8,
                    border: `1px solid ${T.border}`,
                    background: 'transparent',
                    color: T.mutedFg,
                    fontSize: 13,
                    cursor: 'pointer',
                    fontFamily: T.font,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveImportedRows}
                  disabled={selectedRowIds.size === 0 || isSaving}
                  style={{
                    padding: '7px 20px',
                    borderRadius: 8,
                    border: 'none',
                    background: selectedRowIds.size === 0 || isSaving ? T.muted : T.primary,
                    color: selectedRowIds.size === 0 || isSaving ? T.mutedFg : T.primaryFg,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: selectedRowIds.size === 0 || isSaving ? 'default' : 'pointer',
                    fontFamily: T.font,
                    minWidth: 90,
                  }}
                >
                  {isSaving
                    ? 'Saving…'
                    : `Save${selectedRowIds.size > 0 ? ` (${selectedRowIds.size})` : ''}`}
                </button>
              </div>
            </div>

            {/* Save result */}
            {saveResult && (
              <div
                style={{
                  background: saveResult.failed === 0 ? T.successBg : T.warningBg,
                  border: `1px solid color-mix(in oklch, ${saveResult.failed === 0 ? T.success : T.warning} 30%, transparent)`,
                  borderRadius: 8,
                  padding: '10px 14px',
                  marginBottom: 12,
                  fontSize: 13,
                  fontWeight: 600,
                  color: saveResult.failed === 0 ? T.success : T.warning,
                }}
              >
                {saveResult.saved} record{saveResult.saved !== 1 ? 's' : ''} saved
                {saveResult.failed > 0 ? ` · ${saveResult.failed} failed` : ' successfully'}
              </div>
            )}

            {/* Errors */}
            {importErrors.length > 0 && (
              <div
                style={{
                  background: T.dangerBg,
                  border: `1px solid color-mix(in oklch, ${T.danger} 30%, transparent)`,
                  borderRadius: 8,
                  padding: '10px 14px',
                  marginBottom: 12,
                  maxHeight: 120,
                  overflowY: 'auto',
                }}
              >
                <p style={{ fontSize: 12, fontWeight: 600, color: T.danger, margin: '0 0 6px' }}>
                  {importErrors.length} row{importErrors.length !== 1 ? 's' : ''} skipped due to
                  errors:
                </p>
                {importErrors.map((err) => (
                  <p key={err} style={{ fontSize: 11, color: T.danger, margin: '2px 0' }}>
                    • {err}
                  </p>
                ))}
              </div>
            )}

            {previewRows.length === 0 ? (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: T.mutedFg,
                  fontSize: 13,
                }}
              >
                No valid rows found in file.
              </div>
            ) : (
              <>
                {/* Select All */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: T.muted,
                    marginBottom: 10,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={previewRows.length > 0 && selectedRowIds.size === previewRows.length}
                    onChange={(e) => {
                      if (e.target.checked)
                        setSelectedRowIds(new Set(previewRows.map((r) => r._id)));
                      else setSelectedRowIds(new Set());
                    }}
                    style={{ width: 15, height: 15, cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.fg }}>Select All</span>
                </div>

                {/* Preview table */}
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: T.muted }}>
                        {[
                          '',
                          'Employee',
                          'Employee ID',
                          'Date',
                          'Status',
                          'Check In',
                          'Check Out',
                          'Shift',
                          'Notes',
                        ].map((h) => (
                          <th
                            key={h}
                            style={{
                              padding: '9px 10px',
                              textAlign: 'left',
                              fontWeight: 600,
                              color: T.mutedFg,
                              position: 'sticky',
                              top: 0,
                              background: T.muted,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((r) => {
                        const sel = selectedRowIds.has(r._id);
                        const statusColor =
                          r.status === 'present' || r.status === 'overtime'
                            ? { bg: T.successBg, fg: T.success }
                            : r.status === 'absent'
                              ? { bg: T.dangerBg, fg: T.danger }
                              : r.status === 'half_day'
                                ? { bg: T.warningBg, fg: T.warning }
                                : { bg: T.muted, fg: T.mutedFg };
                        return (
                          <tr
                            key={r._id}
                            style={{
                              borderBottom: `1px solid ${T.border}`,
                              background: sel ? T.primaryBg : 'transparent',
                              cursor: 'pointer',
                            }}
                            onClick={() =>
                              setSelectedRowIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(r._id)) next.delete(r._id);
                                else next.add(r._id);
                                return next;
                              })
                            }
                          >
                            <td style={{ padding: '10px 10px' }}>
                              <input
                                type="checkbox"
                                checked={sel}
                                onChange={() => {}}
                                style={{ width: 14, height: 14 }}
                              />
                            </td>
                            <td
                              style={{
                                padding: '10px 10px',
                                fontWeight: 500,
                                color: T.fg,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {r.employeeName}
                            </td>
                            <td
                              style={{
                                padding: '10px 10px',
                                color: T.mutedFg,
                                fontFamily: 'monospace',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {r.empCode || r.employeeId}
                            </td>
                            <td
                              style={{
                                padding: '10px 10px',
                                color: T.mutedFg,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {r.date}
                            </td>
                            <td style={{ padding: '10px 10px' }}>
                              <span
                                style={{
                                  fontSize: 11,
                                  padding: '3px 8px',
                                  borderRadius: 12,
                                  background: statusColor.bg,
                                  color: statusColor.fg,
                                  fontWeight: 600,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {r.status}
                              </span>
                            </td>
                            <td
                              style={{
                                padding: '10px 10px',
                                color: T.mutedFg,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {r.checkIn ?? '—'}
                            </td>
                            <td
                              style={{
                                padding: '10px 10px',
                                color: T.mutedFg,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {r.checkOut ?? '—'}
                            </td>
                            <td
                              style={{
                                padding: '10px 10px',
                                color: T.mutedFg,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {r.shiftName ?? '—'}
                            </td>
                            <td
                              style={{
                                padding: '10px 10px',
                                color: T.mutedFg,
                                maxWidth: 160,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {r.notes ?? '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MainEmployeeAttendance;
