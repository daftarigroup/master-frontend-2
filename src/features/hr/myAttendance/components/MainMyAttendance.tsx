'use client';

import {
  IconAlertCircle,
  IconCalendar,
  IconCheck,
  IconChevronDown,
  IconClipboardList,
  IconClock,
  IconFileText,
  IconLoader2,
  IconLogin2,
  IconLogout2,
  IconX,
} from '@tabler/icons-react';
import type React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useRequireCompanySelected } from '@/features/organization/hooks/useRequireCompanySelected';
import { resolveActAsTenant } from '@/features/organization/utils/actAsTenant';
import { cn } from '@/lib/utils';
import { useAppSelector } from '@/store/hook';
import { selectUser } from '@/store/slice/userAccountData';
import {
  useMyClaims,
  useSubmitClaim,
  useSubmitClaimAdmin,
} from '../../attendance/server/tanstackQuery/useAttendanceQueries';
import type {
  AttendanceClaimType,
  EmployeeMeta,
  SubmitClaimPayload,
} from '../../attendance/types/types';
import type { MyAttendanceRecord } from '../server/api/myAttendanceApi';
import { useMyMonthly } from '../server/tanstackQuery/useMyAttendanceQueries';
import { ModalPortal } from '@/features/hr/_shared/components';

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<
  string,
  {
    label: string;
    bg: string;
    text: string;
    Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  }
> = {
  present: { label: 'PRESENT', bg: 'bg-success/10', text: 'text-success', Icon: IconCheck },
  absent: { label: 'ABSENT', bg: 'bg-destructive/10', text: 'text-destructive', Icon: IconX },
  half_day: { label: 'HALF DAY', bg: 'bg-warning/10', text: 'text-warning', Icon: IconClock },
  leave: { label: 'LEAVE', bg: 'bg-primary/10', text: 'text-primary', Icon: IconCalendar },
  holiday: { label: 'HOLIDAY', bg: 'bg-muted', text: 'text-muted-foreground', Icon: IconCalendar },
  punch_mis: {
    label: 'PUNCH MIS',
    bg: 'bg-orange-500/10',
    text: 'text-orange-500',
    Icon: IconAlertCircle,
  },
  weekoff: { label: 'WEEK OFF', bg: 'bg-muted', text: 'text-muted-foreground', Icon: IconCalendar },
};

const CLAIM_TYPE_LABELS: Record<AttendanceClaimType, string> = {
  PUNCH_MIS: 'Punch Mis (Missing checkout)',
  OVERTIME: 'Overtime',
  WEEKEND_PRESENT: 'Weekend Work',
  HOLIDAY_PRESENT: 'Holiday Work',
};

const CLAIM_STATUS_CFG: Record<string, { label: string; bg: string; text: string }> = {
  PENDING: { label: 'Pending', bg: 'bg-orange-500/10', text: 'text-orange-500' },
  APPROVED: { label: 'Approved', bg: 'bg-success/10', text: 'text-success' },
  REJECTED: { label: 'Rejected', bg: 'bg-destructive/10', text: 'text-destructive' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', weekday: 'short' });
};

const fmt12 = (t: string | null): string => {
  if (!t) return '-';
  const [hStr, mStr] = t.split(':');
  const h = parseInt(hStr ?? '0', 10);
  const m = parseInt(mStr ?? '0', 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
};

const fmtHours = (h: number): string => {
  if (!h) return '0h';
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return mins ? `${hrs}h ${mins}m` : `${hrs}h`;
};

const isLate = (checkIn: string | null): boolean => {
  if (!checkIn) return false;
  const [hStr, mStr] = checkIn.split(':');
  const totalMins = parseInt(hStr ?? '0', 10) * 60 + parseInt(mStr ?? '0', 10);
  return totalMins > 9 * 60 + 15;
};

const MONTH_LABEL = (d: Date) => d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

type DateSlot = { date: string; record: MyAttendanceRecord | null };

// ── Claim Modal ───────────────────────────────────────────────────────────────

const todayISOGlobal = (() => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
})();

const maxClaimDate = (() => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
})();

const minClaimDate = (() => {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
})();

const CHIP_CONFIG = [
  {
    type: 'PUNCH_MIS' as AttendanceClaimType,
    label: 'Punch Mis',
    desc: 'Missing check-in or check-out',
    Icon: IconAlertCircle,
    activeClass: 'bg-orange-500 text-white border-orange-500',
  },
  {
    type: 'WEEKEND_PRESENT' as AttendanceClaimType,
    label: 'Weekend Work',
    desc: 'Worked on weekly off day',
    Icon: IconCalendar,
    activeClass: 'bg-blue-500 text-white border-blue-500',
  },
  {
    type: 'HOLIDAY_PRESENT' as AttendanceClaimType,
    label: 'Holiday Work',
    desc: 'Worked on a holiday',
    Icon: IconCalendar,
    activeClass: 'bg-purple-500 text-white border-purple-500',
  },
  {
    type: 'OVERTIME' as AttendanceClaimType,
    label: 'Overtime',
    desc: 'Extra hours on regular workday',
    Icon: IconClock,
    activeClass: 'bg-primary text-primary-foreground border-primary',
  },
];

export const ClaimModal: React.FC<{
  onClose: () => void;
  isAdmin?: boolean;
  employees?: EmployeeMeta[];
  defaultEmployeeId?: string;
  defaultEmployeeName?: string;
}> = ({ onClose, isAdmin = false, employees = [], defaultEmployeeId, defaultEmployeeName }) => {
  const requireCompanySelected = useRequireCompanySelected();
  const user = useAppSelector(selectUser);
  const submitMut = useSubmitClaim();
  const submitAdminMut = useSubmitClaimAdmin();

  const [selectedEmployeeId, setSelectedEmployeeId] = useState(defaultEmployeeId ?? '');
  const [date, setDate] = useState(maxClaimDate);
  const [primaryType, setPrimaryType] = useState<AttendanceClaimType>('PUNCH_MIS');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [otHours, setOtHours] = useState('');
  const [reason, setReason] = useState('');

  const handleTypeChange = (t: AttendanceClaimType) => {
    setPrimaryType(t);
    setOtHours('');
    if (t !== 'PUNCH_MIS') {
      setCheckIn('');
      setCheckOut('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Admin submitting on behalf of a chosen employee resolves that
    // employee's own company below instead of blocking on "All Companies" —
    // only the self-service path (no employee to pick) needs the guard.
    if (!isAdmin && !requireCompanySelected()) return;
    if (isAdmin && !selectedEmployeeId) {
      toast.error('Please select an employee');
      return;
    }
    if (!date) {
      toast.error('Please select a date');
      return;
    }
    if (!reason.trim()) {
      toast.error('Reason is required');
      return;
    }
    if (primaryType === 'PUNCH_MIS' && (!checkIn || !checkOut)) {
      toast.error('Check-in and check-out time are required for Punch Mis');
      return;
    }
    if (primaryType === 'OVERTIME' && !otHours) {
      toast.error('Please enter overtime hours');
      return;
    }

    const basePayload: SubmitClaimPayload = {
      date,
      claimType: primaryType,
      checkIn: primaryType === 'PUNCH_MIS' ? checkIn || null : null,
      checkOut: primaryType === 'PUNCH_MIS' ? checkOut || null : null,
      overtimeHours: primaryType === 'OVERTIME' ? (otHours ? Number(otHours) : null) : null,
      reason: reason.trim(),
    };

    try {
      if (isAdmin) {
        const selectedEmployee = employees.find((emp) => emp.employeeId === selectedEmployeeId);
        await submitAdminMut.mutateAsync({
          payload: { ...basePayload, employeeId: selectedEmployeeId },
          actAsTenantId: resolveActAsTenant(selectedEmployee?.tenant, user?.tenantId),
        });
        toast.success('Claim submitted successfully');
      } else {
        await submitMut.mutateAsync(basePayload);
        toast.success('Claim submitted successfully');
      }
      onClose();
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to submit claim'
      );
    }
  };

  const showOTInput = primaryType === 'OVERTIME';

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
      <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold">Raise Attendance Claim</h2>
            <p className="text-[12px] text-muted-foreground">
              Submit a correction or claim for a past date
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {/* Employee */}
            <div>
              <label
                htmlFor="claim-employee"
                className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Employee <span className="text-destructive">*</span>
              </label>
              {isAdmin ? (
                <select
                  id="claim-employee"
                  required
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-muted px-3 text-[13px] outline-none focus:border-primary"
                >
                  <option value="">Select employee…</option>
                  {employees.map((emp) => (
                    <option key={emp.employeeId} value={emp.employeeId}>
                      {emp.name ?? emp.employeeId}
                      {emp.department?.name ? ` — ${emp.department.name}` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex h-10 items-center rounded-lg border border-border bg-muted px-3 text-[13px] text-foreground">
                  {defaultEmployeeName ?? defaultEmployeeId ?? '—'}
                </div>
              )}
            </div>

            {/* Date */}
            <div>
              <label
                htmlFor="claim-date"
                className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Date <span className="text-destructive">*</span>
              </label>
              <input
                id="claim-date"
                type="date"
                required
                min={minClaimDate}
                max={maxClaimDate}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-muted px-3 text-[13px] outline-none focus:border-primary"
              />
            </div>

            {/* Claim Type chips */}
            <div>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                What happened? <span className="text-destructive">*</span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                {CHIP_CONFIG.map(({ type, label, desc, Icon, activeClass }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleTypeChange(type)}
                    className={cn(
                      'flex items-start gap-2.5 rounded-xl border p-3 text-left transition-colors',
                      primaryType === type
                        ? activeClass
                        : 'border-border bg-muted text-foreground hover:bg-muted-foreground/10'
                    )}
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      <span className="block text-[12px] font-semibold">{label}</span>
                      <span
                        className={cn(
                          'block text-[10px] leading-tight',
                          primaryType === type ? 'opacity-80' : 'text-muted-foreground'
                        )}
                      >
                        {desc}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Times — only required/shown for Punch Mis claims */}
            {primaryType === 'PUNCH_MIS' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="claim-checkin"
                    className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    Check-In Time <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="claim-checkin"
                    type="time"
                    required
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-muted px-3 text-[13px] outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label
                    htmlFor="claim-checkout"
                    className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    Check-Out Time <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="claim-checkout"
                    type="time"
                    required
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-muted px-3 text-[13px] outline-none focus:border-primary"
                  />
                </div>
              </div>
            )}

            {showOTInput && (
              <div>
                <label
                  htmlFor="ot-hours"
                  className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  OT Hours <span className="text-destructive">*</span>
                </label>
                <input
                  id="ot-hours"
                  type="number"
                  min="0.5"
                  max="12"
                  step="0.5"
                  placeholder="e.g. 2"
                  value={otHours}
                  onChange={(e) => setOtHours(e.target.value)}
                  className="h-10 w-32 rounded-lg border border-border bg-muted px-3 text-[13px] outline-none focus:border-primary"
                />
              </div>
            )}

            {/* Reason */}
            <div>
              <label
                htmlFor="claim-reason"
                className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Reason <span className="text-destructive">*</span>
              </label>
              <textarea
                id="claim-reason"
                rows={3}
                placeholder="Explain why you're raising this claim…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full resize-none rounded-lg border border-border bg-muted px-3 py-2 text-[13px] outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-[13px] font-medium hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitMut.isPending || submitAdminMut.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-[13px] font-semibold text-primary-foreground disabled:opacity-60"
            >
              {(submitMut.isPending || submitAdminMut.isPending) && (
                <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              Submit Claim
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function MainMyAttendance() {
  const user = useAppSelector(selectUser);
  const [monthOffset, setMonthOffset] = useState(0);
  const [filter, setFilter] = useState<'all' | 'present' | 'absent' | 'half_day'>('all');
  const [showClaimModal, setShowClaimModal] = useState(false);

  const selectedDate = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);

  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth() + 1;
  const monthLabel = MONTH_LABEL(selectedDate);
  const { data: records = [], isLoading: monthlyLoading } = useMyMonthly(year, month);
  const { data: myClaims = [] } = useMyClaims();

  const allSlots = useMemo<DateSlot[]>(() => {
    const toLocalISO = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const isCurrentMonth = monthOffset === 0;
    const today = new Date();
    const endDay = isCurrentMonth ? today.getDate() : new Date(year, month, 0).getDate();
    const endMonth = isCurrentMonth ? today.getMonth() + 1 : month;
    const endYear = isCurrentMonth ? today.getFullYear() : year;
    const end = new Date(endYear, endMonth - 1, endDay);
    // Grouped by date into an array, not a single value — a multi-company
    // identity user (see UserIdentity) can have one record per linked
    // company for the same calendar date, and a plain date-keyed Map would
    // silently drop all but the last one. For every single-company session
    // this array holds at most one record, so behavior is unchanged.
    const byDate = new Map<string, MyAttendanceRecord[]>();
    for (const r of records) {
      const arr = byDate.get(r.date);
      if (arr) arr.push(r);
      else byDate.set(r.date, [r]);
    }
    const slots: DateSlot[] = [];
    const cur = new Date(year, month - 1, 1);
    while (cur <= end) {
      const iso = toLocalISO(cur);
      const dayRecords = byDate.get(iso);
      if (dayRecords && dayRecords.length > 0) {
        for (const record of dayRecords) slots.push({ date: iso, record });
      } else {
        slots.push({ date: iso, record: null });
      }
      cur.setDate(cur.getDate() + 1);
    }
    return slots.reverse();
  }, [year, month, monthOffset, records]);

  const getEffectiveStatus = useCallback(
    (date: string, record: MyAttendanceRecord | null): string => {
      if (!record) return 'absent';
      if (record.checkIn && !record.checkOut && date !== todayISOGlobal) return 'punch_mis';
      return record.status;
    },
    []
  );

  const { presentDays, halfDayCount, absentDays, lateCheckIns, avgHours } = useMemo(() => {
    const present = records.filter((r) => r.status === 'present').length;
    const halfDay = records.filter((r) => r.status === 'half_day').length;
    const absent = records.filter((r) => r.status === 'absent').length;
    const late = records.filter((r) => isLate(r.checkIn)).length;
    const worked = records.filter((r) => r.workingHours > 0);
    const avg =
      worked.length > 0 ? worked.reduce((sum, r) => sum + r.workingHours, 0) / worked.length : 0;
    return {
      presentDays: present,
      halfDayCount: halfDay,
      absentDays: absent,
      lateCheckIns: late,
      avgHours: avg,
    };
  }, [records]);

  const totalDays = presentDays + halfDayCount + absentDays;
  const attendancePct =
    totalDays > 0 ? Math.round(((presentDays + halfDayCount) / totalDays) * 100) : 0;

  const statCards = useMemo(
    () => [
      {
        label: 'Present Days',
        value: presentDays + halfDayCount,
        sub: `${attendancePct}% attendance`,
        Icon: IconCheck,
        tint: 'bg-success/10 text-success',
        valueColor: 'text-success',
      },
      {
        label: 'Absent Days',
        value: absentDays,
        sub: 'This period',
        Icon: IconX,
        tint: 'bg-destructive/10 text-destructive',
        valueColor: 'text-destructive',
      },
      {
        label: 'Late Check-ins',
        value: lateCheckIns,
        sub: 'After 9:15 AM',
        Icon: IconClock,
        tint: 'bg-warning/10 text-warning',
        valueColor: 'text-warning',
      },
      {
        label: 'Avg Hours',
        value: fmtHours(Math.round(avgHours * 10) / 10),
        sub: 'Per working day',
        Icon: IconClipboardList,
        tint: 'bg-primary/10 text-primary',
        valueColor: 'text-primary',
      },
    ],
    [presentDays, halfDayCount, absentDays, lateCheckIns, avgHours, attendancePct]
  );

  const filterTabs: {
    key: 'all' | 'present' | 'absent' | 'half_day';
    label: string;
    count: number;
  }[] = useMemo(
    () => [
      { key: 'all', label: 'All', count: allSlots.length },
      {
        key: 'present',
        label: 'Present',
        count: allSlots.filter((s) => s.record?.status === 'present').length,
      },
      {
        key: 'absent',
        label: 'Absent',
        count: allSlots.filter((s) => s.record?.status === 'absent').length,
      },
      {
        key: 'half_day',
        label: 'Half Day',
        count: allSlots.filter((s) => s.record?.status === 'half_day').length,
      },
    ],
    [allSlots]
  );

  const filtered = useMemo<DateSlot[]>(() => {
    if (filter === 'all') return allSlots;
    return allSlots.filter((s) => s.record?.status === filter);
  }, [allSlots, filter]);

  return (
    <div className="bg-background text-foreground grow">
      <div className="mx-auto max-w-350 space-y-5 px-4 pt-6 pb-10 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center sm:gap-4">
          <div>
            <p className="mb-0.5 text-[12px] text-muted-foreground">My Account</p>
            <h1 className="text-[18px] font-bold leading-tight tracking-[-0.03em] sm:text-[22px]">
              My Attendance
            </h1>
          </div>
          {user && (
            <p className="text-[13px] text-muted-foreground">
              Hello,{' '}
              <span className="font-semibold text-foreground">
                {user.fullName || (typeof user.name === 'string' ? user.name : user.email)}
              </span>
            </p>
          )}
        </div>

        {/* Attendance history banner */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <div className="flex flex-col items-start gap-4 px-5 py-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/12 text-primary">
                <IconClipboardList className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-[16px] font-bold tracking-[-0.02em] sm:text-[18px]">
                  Attendance History
                </h2>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  View and track your daily attendance and working hours
                </p>
              </div>
            </div>
            <div className="relative w-full sm:w-auto">
              <IconChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <select
                value={String(monthOffset)}
                onChange={(e) => setMonthOffset(parseInt(e.target.value, 10))}
                className="h-10 w-full cursor-pointer appearance-none rounded-lg border border-border bg-muted px-4 pr-9 text-[13px] font-medium text-foreground outline-none transition-colors focus:border-primary sm:w-auto"
              >
                <option value="0">This Month</option>
                <option value="-1">Last Month</option>
                <option value="-2">2 Months Ago</option>
                <option value="-3">3 Months Ago</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
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
                <s.Icon className="h-5.5 w-5.5" />
              </div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                {s.label}
              </p>
              <p
                className={cn(
                  'text-[22px] font-bold leading-none tracking-[-0.02em] tabular-nums sm:text-[28px]',
                  s.valueColor
                )}
              >
                {monthlyLoading ? '-' : s.value}
              </p>
              <p className="mt-1.5 text-[10px] text-muted-foreground">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Attendance table */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <div className="border-b border-border px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <IconCalendar className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-[14px] font-semibold">{monthLabel}</h2>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {filtered.length} day{filtered.length === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {filterTabs.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setFilter(t.key)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors',
                      filter === t.key
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-muted text-muted-foreground hover:bg-muted-foreground/10'
                    )}
                  >
                    {t.label}
                    <span
                      className={cn(
                        'rounded-full px-1.5 text-[10px] tabular-nums',
                        filter === t.key
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : 'bg-card text-foreground'
                      )}
                    >
                      {t.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {monthlyLoading ? (
            <div className="flex items-center justify-center py-16">
              <IconLoader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-200">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {[
                      'Date',
                      'Status',
                      'Check In',
                      'Check Out',
                      'Working Hours',
                      ...(filtered.some((s) => s.record?.tenant) ? ['Company'] : []),
                    ].map((h) => (
                      <th
                        key={h}
                        className="whitespace-nowrap px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(({ date, record }) => {
                    const effStatus = getEffectiveStatus(date, record);
                    return (
                      <tr
                        key={record?.tenant ? `${date}-${record.tenant.id}` : date}
                        className="transition-colors hover:bg-muted/40"
                      >
                        <td className="whitespace-nowrap px-5 py-3.5 text-[13px] font-semibold">
                          {fmtDate(date)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5">
                          {record ? (
                            (() => {
                              const cfg = STATUS_CFG[effStatus] ?? {
                                label: effStatus.replace(/_/g, ' ').toUpperCase(),
                                bg: 'bg-muted',
                                text: 'text-muted-foreground',
                                Icon: IconAlertCircle,
                              };
                              return (
                                <span
                                  className={cn(
                                    'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em]',
                                    cfg.bg,
                                    cfg.text
                                  )}
                                >
                                  <cfg.Icon className="h-2.5 w-2.5" strokeWidth={3} />
                                  {cfg.label}
                                </span>
                              );
                            })()
                          ) : (
                            <span className="text-[11px] text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5">
                          <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                            {record?.checkIn && <IconLogin2 className="h-3.5 w-3.5" />}
                            <span className="font-mono tabular-nums">
                              {fmt12(record?.checkIn ?? null)}
                            </span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5">
                          <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                            {record?.checkOut && <IconLogout2 className="h-3.5 w-3.5" />}
                            <span className="font-mono tabular-nums">
                              {fmt12(record?.checkOut ?? null)}
                            </span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-[13px] font-semibold tabular-nums">
                          {record ? fmtHours(record.workingHours) : '—'}
                        </td>
                        {filtered.some((s) => s.record?.tenant) && (
                          <td className="whitespace-nowrap px-5 py-3.5 text-[12px] text-muted-foreground">
                            {record?.tenant?.name ?? '—'}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <IconCalendar className="h-6 w-6" />
              </div>
              <p className="text-[14px] font-semibold">No attendance records</p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                {filter !== 'all'
                  ? `No records match "${filter.replace(/_/g, ' ')}" filter.`
                  : 'No days in range.'}
              </p>
            </div>
          )}
        </div>

        {/* My Claims section */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <div className="border-b border-border px-5 py-4">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500">
                  <IconFileText className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-[14px] font-semibold">My Claims</h2>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Your submitted attendance claims
                  </p>
                </div>
              </div>
              {!!user?.employeeId && (
                <button
                  type="button"
                  onClick={() => setShowClaimModal(true)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground hover:bg-primary/90 sm:w-auto"
                >
                  <IconFileText className="h-4 w-4" />
                  Raise a Claim
                </button>
              )}
            </div>
          </div>
          {myClaims.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-[13px] text-muted-foreground">No claims submitted yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {[
                      'Date',
                      'Type',
                      'Status',
                      'Submitted',
                      'HR Note',
                      ...(myClaims.some((c) => c.tenant) ? ['Company'] : []),
                    ].map((h) => (
                      <th
                        key={h}
                        className="whitespace-nowrap px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {myClaims.map((c) => {
                    const sc = CLAIM_STATUS_CFG[c.status] ?? {
                      label: c.status,
                      bg: 'bg-muted',
                      text: 'text-muted-foreground',
                    };
                    return (
                      <tr key={c.id} className="hover:bg-muted/30">
                        <td className="whitespace-nowrap px-5 py-3 font-medium">
                          {fmtDate(c.date)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">
                          {CLAIM_TYPE_LABELS[c.claimType]}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3">
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                              sc.bg,
                              sc.text
                            )}
                          >
                            {sc.label}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">
                          {new Date(c.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </td>
                        <td className="max-w-[200px] px-5 py-3 text-muted-foreground">
                          <span className="block truncate" title={c.reviewNote ?? undefined}>
                            {c.reviewNote ?? '—'}
                          </span>
                        </td>
                        {myClaims.some((x) => x.tenant) && (
                          <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">
                            {c.tenant?.name ?? '—'}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showClaimModal && (
        <ClaimModal
          onClose={() => setShowClaimModal(false)}
          defaultEmployeeId={user?.employeeId ?? undefined}
          defaultEmployeeName={
            user?.fullName || (typeof user?.name === 'string' ? user.name : undefined) || undefined
          }
        />
      )}
    </div>
  );
}
