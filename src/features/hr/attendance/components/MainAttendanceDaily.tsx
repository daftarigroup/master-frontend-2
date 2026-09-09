'use client';

import {
  IconAlertCircle,
  IconBell,
  IconBuilding,
  IconCalendar,
  IconClock,
  IconClockPause,
  IconEye,
  IconLoader2,
  IconLogin2,
  IconLogout2,
  IconRefresh,
  IconSearch,
  IconUserCheck,
  IconUsers,
  IconUserX,
  IconWorld,
  IconX,
} from '@tabler/icons-react';
import type React from 'react';
import { useMemo, useState } from 'react';
import UserAvatar from '@/components/ui/UserAvatar';
import { cn } from '@/lib/utils';
import { getDepartments } from '../server/api/attendanceApi';
import {
  useAttendanceEmployees,
  useDailyAttendance,
} from '../server/tanstackQuery/useAttendanceQueries';
import type { AttendanceRecord } from '../types/types';
import { ModalPortal } from '@/features/hr/_shared/components';

// ─── Status config ───────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; bg: string; text: string }> = {
  present: { label: 'PRESENT', bg: 'bg-success/10', text: 'text-success' },
  absent: { label: 'ABSENT', bg: 'bg-destructive/10', text: 'text-destructive' },
  half_day: { label: 'HALF DAY', bg: 'bg-warning/10', text: 'text-warning' },
  leave: { label: 'ON LEAVE', bg: 'bg-primary/10', text: 'text-primary' },
  holiday: { label: 'HOLIDAY', bg: 'bg-muted', text: 'text-muted-foreground' },
  weekoff: { label: 'WEEK OFF', bg: 'bg-muted', text: 'text-muted-foreground' },
  punch_mis: { label: 'PUNCH MIS', bg: 'bg-orange-500/10', text: 'text-orange-500' },
};

const StatusPill = ({ status }: { status: string }) => {
  const cfg = STATUS_CFG[status] ?? {
    label: String(status).replace(/_/g, ' ').toUpperCase(),
    bg: 'bg-muted',
    text: 'text-muted-foreground',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em]',
        cfg.bg,
        cfg.text
      )}
    >
      {cfg.label}
    </span>
  );
};

const YesNo = ({ yes }: { yes: boolean }) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em]',
      yes ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
    )}
  >
    {yes ? 'YES' : 'NO'}
  </span>
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

const fmtSelectedDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

const getDayName = (iso: string): string => {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { weekday: 'long' });
};

const isWorkingDay = (iso: string): boolean => {
  const d = new Date(`${iso}T00:00:00`);
  return d.getDay() !== 0; // Sunday = 0 → not a working day
};

interface DerivedRecord extends AttendanceRecord {
  effectiveStatus: string;
  lateMinutes: number;
  earlyOutMinutes: number;
  isPunchMis: boolean;
  workingDayFlag: boolean;
  dayName: string;
  designation: string | null;
  departmentName: string | null;
}

const deriveRecord = (r: AttendanceRecord, dateISO: string): DerivedRecord => {
  const punchMis = !!(r.checkIn && !r.checkOut);
  const effectiveStatus = punchMis ? 'punch_mis' : r.status;

  const shiftStart = r.shift?.startTime ?? r.hrEmployee?.companyShift?.startTime ?? null;
  const shiftEnd = r.shift?.endTime ?? r.hrEmployee?.companyShift?.endTime ?? null;

  const inMins = toMins(r.checkIn);
  const outMins = toMins(r.checkOut);
  const startMins = toMins(shiftStart);
  const endMins = toMins(shiftEnd);

  const lateMinutes = inMins > 0 && startMins > 0 && inMins > startMins ? inMins - startMins : 0;
  const earlyOutMinutes = outMins > 0 && endMins > 0 && outMins < endMins ? endMins - outMins : 0;

  return {
    ...r,
    effectiveStatus,
    lateMinutes,
    earlyOutMinutes,
    isPunchMis: punchMis,
    workingDayFlag: isWorkingDay(dateISO),
    dayName: getDayName(dateISO),
    designation: r.hrEmployee?.designation ?? null,
    departmentName: r.department ?? r.hrEmployee?.department?.name ?? null,
  };
};

// ─── View Drawer ─────────────────────────────────────────────────────────────

const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-0">
    <span className="min-w-[120px] text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
      {label}
    </span>
    <span className="text-right text-[13px] font-medium">{value}</span>
  </div>
);

const ViewDrawer = ({ record, onClose }: { record: DerivedRecord; onClose: () => void }) => (
  <ModalPortal>
    {/* Backdrop */}
    <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
    {/* Panel */}
    <div className="fixed top-0 right-0 z-50 flex h-full w-full max-w-sm flex-col overflow-y-auto border-l border-border bg-card shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <UserAvatar
            name={record.hrEmployee?.name ?? record.employeeName ?? record.employeeId}
            avatarUrl={null}
            size={40}
          />
          <div>
            <p className="text-[14px] font-semibold">
              {record.hrEmployee?.name ?? record.employeeName ?? '—'}
            </p>
            <p className="font-mono text-[11px] text-muted-foreground">{record.employeeId}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted"
        >
          <IconX className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 px-5 py-4">
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
          Attendance Details
        </p>

        <DetailRow label="Date" value={fmtSelectedDate(record.date)} />
        <DetailRow label="Day" value={record.dayName} />
        <DetailRow label="Designation" value={record.designation ?? '—'} />
        <DetailRow label="Department" value={record.departmentName ?? '—'} />
        <DetailRow
          label="Shift"
          value={
            record.shift
              ? `${record.shift.name} (${fmt12(record.shift.startTime)} – ${fmt12(record.shift.endTime)})`
              : record.hrEmployee?.companyShift
                ? `${record.hrEmployee.companyShift.name} (${fmt12(record.hrEmployee.companyShift.startTime)} – ${fmt12(record.hrEmployee.companyShift.endTime)})`
                : '—'
          }
        />
        <DetailRow label="Working Day" value={<YesNo yes={record.workingDayFlag} />} />
        <DetailRow label="Status" value={<StatusPill status={record.effectiveStatus} />} />
        <DetailRow label="Check In" value={fmt12(record.checkIn)} />
        <DetailRow label="Check Out" value={fmt12(record.checkOut)} />
        <DetailRow
          label="Working Hours"
          value={record.workingHours > 0 ? `${record.workingHours}h` : '—'}
        />
        <DetailRow label="Late Minutes" value={fmtMins(record.lateMinutes)} />
        <DetailRow label="Early Out" value={fmtMins(record.earlyOutMinutes)} />
        <DetailRow
          label="Overtime Hours"
          value={record.overtime > 0 ? `${record.overtime}h` : '—'}
        />
        <DetailRow label="Punch Mis" value={<YesNo yes={record.isPunchMis} />} />
        <DetailRow label="Remarks" value={record.notes ?? '—'} />
      </div>
    </div>
  </ModalPortal>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const MainAttendanceDaily = () => {
  const today = (() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  })();

  const [selectedDate, setSelectedDate] = useState(today);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewRecord, setViewRecord] = useState<DerivedRecord | null>(null);

  const { data: attendanceData, isLoading, isError, refetch } = useDailyAttendance(selectedDate);
  const { data: employees = [] } = useAttendanceEmployees();
  const departments = getDepartments(employees);

  const derived = useMemo<DerivedRecord[]>(() => {
    if (!Array.isArray(attendanceData)) return [];
    return attendanceData.map((r) => deriveRecord(r, selectedDate));
  }, [attendanceData, selectedDate]);

  const filteredData = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return derived.filter((record) => {
      const name = record.hrEmployee?.name ?? record.employeeName ?? '';
      const matchesSearch =
        !term ||
        name.toLowerCase().includes(term) ||
        (record.employeeId ?? '').toLowerCase().includes(term);
      const matchesDept = !departmentFilter || record.departmentName === departmentFilter;
      const matchesStatus = !statusFilter || record.effectiveStatus === statusFilter;
      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [derived, searchTerm, departmentFilter, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: derived.length,
      present: derived.filter((r) => r.effectiveStatus === 'present').length,
      absent: derived.filter((r) => r.effectiveStatus === 'absent').length,
      halfDay: derived.filter((r) => r.effectiveStatus === 'half_day').length,
      onLeave: derived.filter((r) => r.effectiveStatus === 'leave').length,
      punchMis: derived.filter((r) => r.effectiveStatus === 'punch_mis').length,
    };
  }, [derived]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <IconLoader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-[13px]">Loading attendance data…</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
          <IconAlertCircle className="h-7 w-7 text-destructive" />
          <p className="text-[13px] font-semibold text-destructive">
            Couldn't load attendance data
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-4 text-[12px] font-semibold text-primary-foreground hover:opacity-90"
          >
            <IconRefresh className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      </div>
    );
  }

  const attendanceRate = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;

  const statCards = [
    {
      label: 'Present',
      value: stats.present,
      sub: `${attendanceRate}% attendance`,
      Icon: IconUserCheck,
      tint: 'bg-success/10 text-success',
      valueColor: 'text-success',
    },
    {
      label: 'Absent',
      value: stats.absent,
      sub: stats.absent > 0 ? 'Need follow-up' : 'All clear',
      Icon: IconUserX,
      tint: 'bg-destructive/10 text-destructive',
      valueColor: 'text-destructive',
    },
    {
      label: 'Half Day',
      value: stats.halfDay,
      sub: 'Partial attendance',
      Icon: IconClockPause,
      tint: 'bg-warning/10 text-warning',
      valueColor: 'text-warning',
    },
    {
      label: 'On Leave',
      value: stats.onLeave,
      sub: 'Approved leaves',
      Icon: IconClock,
      tint: 'bg-primary/10 text-primary',
      valueColor: 'text-primary',
    },
    {
      label: 'Punch Mis',
      value: stats.punchMis,
      sub: 'Missing checkout',
      Icon: IconAlertCircle,
      tint: 'bg-orange-500/10 text-orange-500',
      valueColor: 'text-orange-500',
    },
    {
      label: 'Total',
      value: stats.total,
      sub: 'Employees',
      Icon: IconUsers,
      tint: 'bg-primary/10 text-primary',
      valueColor: 'text-foreground',
    },
  ];

  const dayName = getDayName(selectedDate);
  const workingDay = isWorkingDay(selectedDate);

  return (
    <div className="bg-background text-foreground grow">
      {viewRecord && <ViewDrawer record={viewRecord} onClose={() => setViewRecord(null)} />}

      <div className="mx-auto max-w-[1600px] space-y-5 px-4 pt-6 pb-10 sm:px-6 lg:px-8">
        {/* Top header bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-0.5 text-[12px] text-muted-foreground">Attendance</p>
            <h1 className="text-[18px] font-bold leading-tight tracking-[-0.03em] sm:text-[22px]">
              Daily Attendance
            </h1>
          </div>
        </div>

        {/* Hero banner */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <div className="flex flex-col gap-4 bg-linear-to-br from-card to-card/50 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/12 text-primary">
                <IconCalendar className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-[18px] font-bold tracking-[-0.02em]">
                  {fmtSelectedDate(selectedDate)}
                </h2>
                <div className="mt-1 flex items-center gap-3">
                  <span className="text-[12px] text-muted-foreground">{dayName}</span>
                  <YesNo yes={workingDay} />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:w-auto sm:shrink-0">
              <IconCalendar className="h-4 w-4 text-muted-foreground" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-10 w-full cursor-pointer rounded-lg border border-border bg-muted px-3 text-[13px] font-medium text-foreground outline-none transition-colors focus:border-primary sm:w-auto"
              />
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
          {statCards.map((s) => (
            <div
              key={s.label}
              className="group rounded-xl border border-border bg-card p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg sm:p-5"
            >
              <div
                className={cn(
                  'mb-3 inline-flex h-9 w-9 items-center justify-center rounded-[9px]',
                  s.tint
                )}
              >
                <s.Icon className="h-5 w-5" />
              </div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                {s.label}
              </p>
              <p
                className={cn(
                  'text-[26px] font-bold leading-none tracking-[-0.02em] tabular-nums',
                  s.valueColor
                )}
              >
                {s.value.toLocaleString('en-IN')}
              </p>
              <p className="mt-1.5 text-[10px] text-muted-foreground">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs sm:px-5">
          <div className="flex flex-col gap-2.5 md:flex-row md:items-center">
            <div className="relative flex-1">
              <IconSearch className="pointer-events-none absolute top-1/2 left-3.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name or ID…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-muted pl-10 pr-3 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
              />
            </div>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="h-10 cursor-pointer rounded-lg border border-border bg-muted px-3 pr-8 text-[13px] font-medium text-foreground outline-none transition-colors focus:border-primary md:min-w-44"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 cursor-pointer rounded-lg border border-border bg-muted px-3 pr-8 text-[13px] font-medium text-foreground outline-none transition-colors focus:border-primary md:min-w-36"
            >
              <option value="">All Status</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="half_day">Half Day</option>
              <option value="leave">On Leave</option>
              <option value="holiday">Holiday</option>
              <option value="weekoff">Week Off</option>
              <option value="punch_mis">Punch Mis</option>
            </select>
          </div>
        </div>

        {/* Result count */}
        <div className="px-1 text-[12px] text-muted-foreground">
          Showing{' '}
          <span className="font-semibold text-foreground tabular-nums">{filteredData.length}</span>{' '}
          of <span className="font-semibold text-foreground tabular-nums">{derived.length}</span>{' '}
          record{derived.length === 1 ? '' : 's'}
        </div>

        {/* Attendance table */}
        {filteredData.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1400px]">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {[
                      'Employee',
                      'Day',
                      'Designation',
                      'Department',
                      'Working Day',
                      'Check In',
                      'Check Out',
                      'Status',
                      'Work Hrs',
                      'Late Mins',
                      'Early Out',
                      'OT Hrs',
                      'Punch Mis',
                      'Remarks',
                      '',
                    ].map((h, i) => (
                      <th
                        key={h || `col-${i}`}
                        className={cn(
                          'whitespace-nowrap px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground',
                          i === 0 ? 'text-left' : i >= 14 ? 'text-center' : 'text-left'
                        )}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredData.map((record) => (
                    <tr key={record.id} className="transition-colors hover:bg-muted/40">
                      {/* Employee */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <UserAvatar
                            name={
                              record.hrEmployee?.name ?? record.employeeName ?? record.employeeId
                            }
                            avatarUrl={null}
                            size={32}
                          />
                          <div className="min-w-0">
                            <p className="truncate text-[12px] font-semibold">
                              {record.hrEmployee?.name ?? record.employeeName ?? '—'}
                            </p>
                            <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                              {record.employeeId}
                            </p>
                          </div>
                        </div>
                      </td>
                      {/* Day */}
                      <td className="px-4 py-3 text-[12px] font-medium">{record.dayName}</td>
                      {/* Designation */}
                      <td className="px-4 py-3 text-[12px] text-muted-foreground">
                        {record.designation ?? '—'}
                      </td>
                      {/* Department */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-[12px] text-muted-foreground">
                          <IconBuilding className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{record.departmentName ?? '—'}</span>
                        </div>
                      </td>
                      {/* Working Day */}
                      <td className="px-4 py-3">
                        <YesNo yes={record.workingDayFlag} />
                      </td>
                      {/* Check In */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-[12px] text-muted-foreground">
                          {record.checkIn && <IconLogin2 className="h-3.5 w-3.5 text-success" />}
                          <span className="font-mono tabular-nums">{fmt12(record.checkIn)}</span>
                        </div>
                      </td>
                      {/* Check Out */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-[12px] text-muted-foreground">
                          {record.checkOut && (
                            <IconLogout2 className="h-3.5 w-3.5 text-destructive" />
                          )}
                          <span className="font-mono tabular-nums">{fmt12(record.checkOut)}</span>
                        </div>
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusPill status={record.effectiveStatus} />
                      </td>
                      {/* Work Hrs */}
                      <td className="px-4 py-3 text-[12px] font-semibold tabular-nums">
                        {record.workingHours > 0 ? `${record.workingHours}h` : '—'}
                      </td>
                      {/* Late Mins */}
                      <td className="px-4 py-3 text-[12px] tabular-nums">
                        {record.lateMinutes > 0 ? (
                          <span className="text-warning">{fmtMins(record.lateMinutes)}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      {/* Early Out */}
                      <td className="px-4 py-3 text-[12px] tabular-nums">
                        {record.earlyOutMinutes > 0 ? (
                          <span className="text-warning">{fmtMins(record.earlyOutMinutes)}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      {/* OT Hrs */}
                      <td className="px-4 py-3 text-[12px] font-semibold tabular-nums">
                        {record.overtime > 0 ? (
                          <span className="text-primary">{record.overtime}h</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      {/* Punch Mis */}
                      <td className="px-4 py-3">
                        <YesNo yes={record.isPunchMis} />
                      </td>
                      {/* Remarks */}
                      <td className="max-w-[120px] px-4 py-3 text-[12px] text-muted-foreground">
                        <span className="truncate block" title={record.notes ?? undefined}>
                          {record.notes ?? '—'}
                        </span>
                      </td>
                      {/* View */}
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => setViewRecord(record)}
                          className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-muted px-2.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                        >
                          <IconEye className="h-3.5 w-3.5" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <IconUsers className="h-6 w-6" />
            </div>
            <p className="text-[14px] font-semibold">No attendance records found</p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              {searchTerm || departmentFilter || statusFilter
                ? 'Try adjusting your filters.'
                : `No records for ${fmtSelectedDate(selectedDate)}.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MainAttendanceDaily;
