'use client';

import {
  IconAdjustmentsHorizontal,
  IconAlertCircle,
  IconArrowsRightLeft,
  IconBan,
  IconBell,
  IconCalendar,
  IconCheck,
  IconChevronDown,
  IconClock,
  IconEdit,
  IconEye,
  IconLoader2,
  IconMessageCircle,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconSend,
  IconUsers,
  IconWorld,
  IconX,
} from '@tabler/icons-react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useEmployees } from '@/features/hr/employee/server/tanstackQuery/useEmployeeQueries';
import { useRequireCompanySelected } from '@/features/organization/hooks/useRequireCompanySelected';
import { resolveActAsTenant } from '@/features/organization/utils/actAsTenant';
import {
  type ManagerRecord,
  useManagers,
} from '@/features/profile/users/server/tanstackQuery/useUsersQueries';
import { cn } from '@/lib/utils';
import { useAppSelector } from '@/store/hook';
import { selectUser } from '@/store/slice/userAccountData';
import type { DepartmentOption } from '../../_shared/api/departmentsApi';
import { useDepartmentOptions } from '../../_shared/tanstackQuery/useDepartments';
import { ModalPortal } from '@/features/hr/_shared/components';
import type { LeaveDayEntry, SubmitLeavePayload } from '../server/api/leaveManagementApi';
import {
  useAvailableTransferUsers,
  useLeaveRequests,
  useLeavesByEmployee,
  useSubmitLeave,
  useTaskImpact,
  useUpdateLeaveStatus,
} from '../server/tanstackQuery/useLeaveManagementQueries';
import type { AffectedItem, LeaveRequest, TaskImpact, TaskTransferDecision } from '../types/types';

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = 'pending' | 'processed';
type EffectiveStatus = LeaveRequest['status'] | 'partial';
type DayEntry = {
  date: string;
  checked: boolean;
  type: 'full' | 'half';
  half: 'first' | 'second';
};

// ─── Config ───────────────────────────────────────────────────────────────────
const STATUS_CFG: Record<
  EffectiveStatus,
  { label: string; bg: string; text: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  pending: { label: 'PENDING', bg: 'bg-warning/10', text: 'text-warning', Icon: IconClock },
  approved: { label: 'APPROVED', bg: 'bg-success/10', text: 'text-success', Icon: IconCheck },
  partial: {
    label: 'PARTIAL',
    bg: 'bg-primary/10',
    text: 'text-primary',
    Icon: IconAdjustmentsHorizontal,
  },
  rejected: {
    label: 'REJECTED',
    bg: 'bg-destructive/10',
    text: 'text-destructive',
    Icon: IconBan,
  },
  cancelled: {
    label: 'CANCELLED',
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    Icon: IconX,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const initials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return (parts[0]?.slice(0, 2) ?? '??').toUpperCase();
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
};

const fmtDate = (d: string) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtDt = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
};

function DelayBadge({ delayMinutes }: { delayMinutes: number | null | undefined }) {
  if (delayMinutes == null) return <span className="text-[11px] text-muted-foreground">—</span>;
  if (delayMinutes === 0) {
    return (
      <span className="inline-flex items-center rounded-full border border-success/30 bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">
        On time
      </span>
    );
  }
  const d = Math.floor(delayMinutes / 1440);
  const h = Math.floor((delayMinutes % 1440) / 60);
  const m = delayMinutes % 60;
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || parts.length === 0) parts.push(`${m}m`);
  return (
    <span
      className="inline-flex items-center whitespace-nowrap rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive"
      title={`Processed ${parts.join(' ')} late vs planned`}
    >
      +{parts.join(' ')}
    </span>
  );
}

function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

const fmtDayLabel = (dateStr: string) =>
  parseLocalDate(dateStr).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getDatesInRange(from: string, to: string): string[] {
  if (!from || !to || to < from) return [];
  const dates: string[] = [];
  const curr = parseLocalDate(from);
  const end = parseLocalDate(to);
  while (curr <= end) {
    dates.push(localDateStr(curr));
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
}

function buildDayEntries(from: string, to: string, existing: DayEntry[]): DayEntry[] {
  const map = new Map(existing.map((e) => [e.date, e]));
  return getDatesInRange(from, to).map(
    (date) =>
      map.get(date) ?? { date, checked: true, type: 'full' as const, half: 'first' as const }
  );
}

const getEffectiveStatus = (leave: LeaveRequest): EffectiveStatus => {
  if (leave.status === 'partial') return 'partial';
  if (leave.status !== 'approved') return leave.status;
  // fallback: detect partial from day decisions for legacy records
  const days = leave.leaveDays ?? [];
  if (!days.length) return 'approved';
  const hasApproved = days.some((d) => d.decision === 'approved');
  const hasRejected = days.some((d) => d.decision === 'rejected');
  if (hasApproved && hasRejected) return 'partial';
  return 'approved';
};

const inputCls = (err?: string) =>
  cn(
    'h-10 w-full rounded-lg border bg-muted px-3 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground',
    err ? 'border-destructive/40 focus:border-destructive' : 'border-border focus:border-primary'
  );

// ─── Shared sub-components ────────────────────────────────────────────────────
const StatusPill = ({ status }: { status: EffectiveStatus }) => {
  const cfg = STATUS_CFG[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em]',
        cfg.bg,
        cfg.text
      )}
    >
      <cfg.Icon className="h-2.5 w-2.5" />
      {cfg.label}
    </span>
  );
};

// ─── Apply Leave Form ─────────────────────────────────────────────────────────
type FormState = {
  departmentId: string;
  fromDate: string;
  toDate: string;
  reason: string;
  hodId: string;
  hodName: string;
  substitute: string;
};

const INITIAL_FORM: FormState = {
  departmentId: '',
  fromDate: '',
  toDate: '',
  reason: '',
  hodId: '',
  hodName: '',
  substitute: '',
};

const Field = ({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) => (
  <div>
    <div className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
      {label}
      {required && <span className="ml-1 text-destructive">*</span>}
    </div>
    {children}
    {error && <p className="mt-1 text-[11px] text-destructive">{error}</p>}
  </div>
);

const ApplyLeaveModal: React.FC<{
  employeeId: string;
  employeeName: string;
  employeeDeptId: string;
  departments: DepartmentOption[];
  managers: ManagerRecord[];
  employees: import('@/features/hr/employee/types/types').Employee[];
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  onClose: () => void;
}> = ({
  employeeId,
  employeeName,
  employeeDeptId,
  departments,
  managers,
  employees,
  isAdmin,
  isSuperAdmin = false,
  onClose,
}) => {
  const requireCompanySelected = useRequireCompanySelected();
  const submit = useSubmitLeave();
  // A superadmin is never treated as an employee, even if a matching HrEmployee
  // record happens to exist — they can only apply leave on behalf of others.
  const canSelfApply = !!employeeId && !isSuperAdmin;
  // admin can pick a different employee; defaults to the logged-in user when
  // they are themselves a real employee, otherwise starts blank so they must
  // choose someone else
  // selectedEmpDbId: database UUID (always non-empty after selection, used for UI/validation)
  // selectedEmpId: HR employee code sent in the payload
  const [selectedEmpDbId, setSelectedEmpDbId] = useState(() =>
    !isAdmin || canSelfApply
      ? String(employees.find((e) => e.employeeId === employeeId)?.id ?? '')
      : ''
  );
  const [selectedEmpId, setSelectedEmpId] = useState(employeeId);
  const [selectedEmpName, setSelectedEmpName] = useState(employeeName);
  const [form, setForm] = useState<FormState>({ ...INITIAL_FORM, departmentId: employeeDeptId });
  const [dayEntries, setDayEntries] = useState<DayEntry[]>([]);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | 'employee', string>>>({});
  const [submitted, setSubmitted] = useState(false);

  const handleEmpSelect = (empDbId: string) => {
    const emp = employees.find((e) => String(e.id) === empDbId);
    if (!emp) return;
    setSelectedEmpDbId(empDbId);
    setSelectedEmpId(emp.employeeId);
    setSelectedEmpName(emp.name);
    setForm((p) => ({ ...p, departmentId: emp.departmentId ?? p.departmentId }));
    setErrors((p) => ({ ...p, employee: undefined }));
  };

  const totalDays = useMemo(
    () =>
      dayEntries
        .filter((d) => d.checked)
        .reduce((sum, d) => sum + (d.type === 'full' ? 1 : 0.5), 0),
    [dayEntries]
  );

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const handleFromDate = (val: string) => {
    setForm((p) => ({ ...p, fromDate: val }));
    setDayEntries((prev) => buildDayEntries(val, form.toDate, prev));
    setErrors((p) => ({ ...p, fromDate: undefined }));
  };

  const handleToDate = (val: string) => {
    setForm((p) => ({ ...p, toDate: val }));
    setDayEntries((prev) => buildDayEntries(form.fromDate, val, prev));
    setErrors((p) => ({ ...p, toDate: undefined }));
  };

  const toggleDay = (idx: number, checked: boolean) => {
    setDayEntries((prev) => prev.map((d, i) => (i === idx ? { ...d, checked } : d)));
  };

  const setDayType = (idx: number, type: 'full' | 'half') => {
    setDayEntries((prev) => prev.map((d, i) => (i === idx ? { ...d, type } : d)));
  };

  const setDayHalf = (idx: number, half: 'first' | 'second') => {
    setDayEntries((prev) => prev.map((d, i) => (i === idx ? { ...d, half } : d)));
  };

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormState | 'employee', string>> = {};
    if (isAdmin && !selectedEmpDbId) e.employee = 'Select an employee';
    if (!form.departmentId) e.departmentId = 'Required';
    if (!form.fromDate) e.fromDate = 'Required';
    if (!form.toDate) e.toDate = 'Required';
    if (form.toDate && form.toDate < form.fromDate) e.toDate = 'Must be on or after From date';
    if (form.fromDate && form.toDate && dayEntries.filter((d) => d.checked).length === 0)
      e.fromDate = 'Select at least one day';
    if (!form.reason.trim()) e.reason = 'Required';
    if (!form.hodId.trim()) e.hodName = 'Required';
    if (!form.substitute.trim()) e.substitute = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!requireCompanySelected()) return;
    if (!validate()) return;
    const selectedDays = dayEntries.filter((d) => d.checked);
    if (selectedDays.length === 0) return;
    const leaveDays = selectedDays.map((d) => ({
      date: d.date,
      type: d.type,
      ...(d.type === 'half' ? { half: d.half } : {}),
    }));
    const payload: SubmitLeavePayload = {
      employeeId: selectedEmpId,
      employeeName: selectedEmpName,
      departmentId: form.departmentId,
      fromDate: new Date(`${selectedDays[0]?.date}T00:00:00Z`).toISOString(),
      toDate: new Date(`${selectedDays[selectedDays.length - 1]?.date}T00:00:00Z`).toISOString(),
      leaveDays,
      reason: form.reason.trim(),
      hodId: form.hodId,
      hodName: form.hodName,
      substitute: form.substitute.trim(),
    };
    await submit.mutateAsync(payload);
    setSubmitted(true);
  };

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Apply leave"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      tabIndex={-1}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
        tabIndex={-1}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <IconCalendar className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-[16px] font-bold leading-tight tracking-[-0.01em]">
                Apply for Leave
              </h2>
              <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                Submitting as {selectedEmpName || employeeName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>

        {submitted ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <IconCheck className="h-8 w-8 text-success" strokeWidth={2.5} />
            </div>
            <h3 className="text-[18px] font-bold tracking-[-0.02em]">Application Submitted!</h3>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Your leave request has been sent to HR for review.
            </p>
            <div className="mt-5 rounded-xl border border-border bg-muted/40 px-6 py-4 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                Duration
              </p>
              <p className="mt-1 text-[16px] font-bold tracking-[-0.02em]">
                {totalDays} day{totalDays !== 1 ? 's' : ''}
              </p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                {selectedEmpName || employeeName}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg bg-success px-4 text-[12px] font-semibold text-success-foreground transition-opacity hover:opacity-90"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              {submit.isError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-destructive/40 bg-destructive/5 px-3.5 py-3">
                  <IconAlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <p className="text-[12px] font-medium text-destructive">
                    {(
                      submit.error as {
                        response?: { data?: { message?: string } };
                        message?: string;
                      }
                    )?.response?.data?.message ?? 'Submission failed. Please try again.'}
                  </p>
                </div>
              )}

              {isAdmin ? (
                <Field label="Employee" required error={errors.employee}>
                  <div className="relative">
                    <IconChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <select
                      value={selectedEmpDbId}
                      onChange={(e) => handleEmpSelect(e.target.value)}
                      className={cn(
                        inputCls(errors.employee),
                        'cursor-pointer appearance-none pr-9'
                      )}
                    >
                      <option value="">Select employee…</option>
                      {employees
                        .filter(
                          (e) =>
                            e.status === 'active' && !(isSuperAdmin && e.employeeId === employeeId)
                        )
                        .map((e) => (
                          <option key={e.id} value={String(e.id)}>
                            {e.name}
                            {e.designation ? ` — ${e.designation}` : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                </Field>
              ) : (
                <Field label="Employee">
                  <div className={cn(inputCls(), 'flex items-center text-foreground opacity-70')}>
                    {selectedEmpName || employeeName}
                  </div>
                </Field>
              )}

              <Field label="Department" required error={errors.departmentId}>
                <div className="relative">
                  <IconChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <select
                    value={form.departmentId}
                    onChange={(e) => set('departmentId', e.target.value)}
                    className={cn(
                      inputCls(errors.departmentId),
                      'cursor-pointer appearance-none pr-9'
                    )}
                  >
                    <option value="">Select department…</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="From Date" required error={errors.fromDate}>
                  <input
                    type="date"
                    value={form.fromDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => handleFromDate(e.target.value)}
                    className={inputCls(errors.fromDate)}
                  />
                </Field>
                <Field label="To Date" required error={errors.toDate}>
                  <input
                    type="date"
                    value={form.toDate}
                    min={form.fromDate || new Date().toISOString().split('T')[0]}
                    onChange={(e) => handleToDate(e.target.value)}
                    className={inputCls(errors.toDate)}
                  />
                </Field>
              </div>

              {dayEntries.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                      Select Days
                    </p>
                    {totalDays > 0 && (
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                        {totalDays} day{totalDays !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="max-h-56 divide-y divide-border overflow-y-auto rounded-xl border border-border">
                    {dayEntries.map((entry, idx) => (
                      <div
                        key={entry.date}
                        className={cn(
                          'flex flex-wrap items-center gap-2 px-3 py-2.5 transition-colors',
                          entry.checked ? 'bg-primary/5' : 'bg-transparent'
                        )}
                      >
                        <input
                          type="checkbox"
                          id={`day-${entry.date}`}
                          checked={entry.checked}
                          onChange={(e) => toggleDay(idx, e.target.checked)}
                          className="h-4 w-4 cursor-pointer accent-primary"
                        />
                        <label
                          htmlFor={`day-${entry.date}`}
                          className="flex-1 cursor-pointer text-[13px] font-medium"
                        >
                          {fmtDayLabel(entry.date)}
                        </label>
                        {entry.checked && (
                          <div className="flex items-center gap-1">
                            {(['full', 'half'] as const).map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => setDayType(idx, t)}
                                className={cn(
                                  'rounded px-2 py-0.5 text-[11px] font-semibold transition-all',
                                  entry.type === t
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground hover:bg-muted-foreground/20'
                                )}
                              >
                                {t === 'full' ? 'Full Day' : 'Half Day'}
                              </button>
                            ))}
                          </div>
                        )}
                        {entry.checked && entry.type === 'half' && (
                          <div className="flex items-center gap-1">
                            {(['first', 'second'] as const).map((h) => (
                              <button
                                key={h}
                                type="button"
                                onClick={() => setDayHalf(idx, h)}
                                className={cn(
                                  'rounded px-2 py-0.5 text-[11px] font-semibold transition-all',
                                  entry.half === h
                                    ? 'bg-warning/15 text-warning ring-1 ring-warning/40'
                                    : 'bg-muted text-muted-foreground hover:bg-muted-foreground/20'
                                )}
                              >
                                {h === 'first' ? '1st Half' : '2nd Half'}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {dayEntries.filter((d) => d.checked).length === 0 && (
                    <p className="mt-1 text-[11px] text-destructive">Select at least one day</p>
                  )}
                </div>
              )}

              <Field label="Reason for Leave" required error={errors.reason}>
                <textarea
                  rows={3}
                  value={form.reason}
                  onChange={(e) => set('reason', e.target.value)}
                  placeholder="Describe the reason for your leave…"
                  className="w-full resize-none rounded-lg border border-border bg-muted px-3 py-2.5 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
                />
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="HOD / Manager" required error={errors.hodName}>
                  <div className="relative">
                    <IconChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <select
                      value={form.hodId}
                      onChange={(e) => {
                        const manager = managers.find((m) => m.id === e.target.value);
                        setForm((p) => ({
                          ...p,
                          hodId: manager?.id ?? '',
                          hodName: manager?.name ?? '',
                        }));
                        setErrors((p) => ({ ...p, hodName: undefined }));
                      }}
                      className={cn(
                        inputCls(errors.hodName),
                        'cursor-pointer appearance-none pr-9'
                      )}
                    >
                      <option value="">Select reporting manager…</option>
                      {managers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name ?? m.id}
                        </option>
                      ))}
                    </select>
                  </div>
                </Field>
                <Field label="Substitute" required error={errors.substitute}>
                  <div className="relative">
                    <IconUsers className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={form.substitute}
                      onChange={(e) => set('substitute', e.target.value)}
                      placeholder="Colleague who will cover"
                      className={cn(inputCls(errors.substitute), 'pl-9')}
                    />
                  </div>
                </Field>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                disabled={submit.isPending}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-muted px-4 text-[12px] font-semibold transition-colors hover:bg-muted-foreground/10 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submit.isPending}
                onClick={handleSubmit}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-[12px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {submit.isPending ? (
                  <>
                    <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <IconSend className="h-3.5 w-3.5" />
                    Submit Application
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
    </ModalPortal>
  );
};

// ─── Read-only Detail Modal (employee view) ───────────────────────────────────
const DetailModal: React.FC<{ request: LeaveRequest; onClose: () => void }> = ({
  request,
  onClose,
}) => (
  <ModalPortal>
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200"
    onClick={onClose}
    role="dialog"
    aria-modal="true"
    aria-label="Leave details"
    onKeyDown={(e) => {
      if (e.key === 'Escape') onClose();
    }}
    tabIndex={-1}
  >
    <div
      className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-200"
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      tabIndex={-1}
    >
      <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <IconCalendar className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-[16px] font-bold leading-tight tracking-[-0.01em]">
              Leave Details
            </h2>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              Applied {fmtDate(request.appliedDate ?? request.createdAt ?? '')}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <IconX className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusPill status={getEffectiveStatus(request)} />
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
            {request.days} day{request.days !== 1 ? 's' : ''}
          </span>
          {request.leaveDays && request.leaveDays.length > 0 && (
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground">
              {request.leaveDays.length} req{request.leaveDays.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {request.leaveDays && request.leaveDays.length > 0 ? (
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
              Day-wise Breakdown
            </p>
            <div className="divide-y divide-border rounded-xl border border-border">
              {request.leaveDays.map((d) => (
                <div key={d.date} className="flex flex-wrap items-center gap-2 px-3.5 py-2.5">
                  <span className="flex-1 text-[13px] font-medium">{fmtDayLabel(d.date)}</span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        'rounded px-2 py-0.5 text-[11px] font-semibold',
                        d.type === 'full'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-warning/10 text-warning'
                      )}
                    >
                      {d.type === 'full' ? 'Full Day' : 'Half Day'}
                    </span>
                    {d.type === 'half' && d.half && (
                      <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                        {d.half === 'first' ? '1st Half' : '2nd Half'}
                      </span>
                    )}
                    {d.decision && (
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em]',
                          d.decision === 'approved'
                            ? 'bg-success/10 text-success'
                            : 'bg-destructive/10 text-destructive'
                        )}
                      >
                        {d.decision}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-muted/30">
            {[
              { label: 'From', value: fmtDate(request.fromDate) },
              { label: 'To', value: fmtDate(request.toDate) },
              { label: 'Days', value: String(request.days) },
            ].map((item) => (
              <div key={item.label} className="px-3 py-3 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                  {item.label}
                </p>
                <p className="mt-0.5 text-[13px] font-bold tabular-nums">{item.value}</p>
              </div>
            ))}
          </div>
        )}

        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
            Reason
          </p>
          <p className="rounded-xl bg-muted/30 px-3.5 py-3 text-[13px]">{request.reason}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-muted/30 px-3.5 py-3">
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
              Submitted by
            </p>
            <p className="text-[13px] font-semibold">
              {request.submittedBy || request.employeeName}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {fmtDate(request.appliedDate ?? request.createdAt ?? '')}
            </p>
          </div>
          {request.approvedBy && (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                {request.status === 'approved' || request.status === 'partial'
                  ? 'Approved by'
                  : request.status === 'rejected'
                    ? 'Rejected by'
                    : 'Actioned by'}
              </p>
              <p className="text-[13px] font-semibold">{request.approvedBy}</p>
              {request.approvedDate && (
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {fmtDate(request.approvedDate)}
                </p>
              )}
            </div>
          )}
        </div>

        {request.remarks && (
          <div>
            <div className="mb-1 flex items-center gap-1.5">
              <IconMessageCircle className="h-3 w-3 text-muted-foreground" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                HR Remarks
              </p>
            </div>
            <div
              className={cn(
                'rounded-xl border px-3.5 py-3 text-[13px]',
                request.status === 'rejected'
                  ? 'border-destructive/40 bg-destructive/5 text-destructive'
                  : 'border-border bg-muted/30'
              )}
            >
              {request.remarks}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border bg-muted/30 px-6 py-4">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-muted px-4 text-[12px] font-semibold transition-colors hover:bg-muted-foreground/10"
        >
          Close
        </button>
      </div>
    </div>
  </div>
  </ModalPortal>
);

// ─── Admin Reject Modal ───────────────────────────────────────────────────────
const RejectModal: React.FC<{
  request: LeaveRequest;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading: boolean;
  subtitleOverride?: string;
}> = ({ request, onClose, onConfirm, loading, subtitleOverride }) => {
  const [reason, setReason] = useState('');
  const trimmed = reason.trim();

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/12 text-destructive">
              <IconBan className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-[16px] font-bold leading-tight tracking-[-0.01em]">
                Reject Leave Request
              </h2>
              <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                {subtitleOverride ??
                  `${request.employeeName} · ${request.days} day${request.days !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 px-6 py-5">
          <div className="flex items-start gap-2.5 rounded-xl border border-destructive/40 bg-destructive/5 px-3.5 py-3">
            <IconAlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <p className="text-[12px] font-medium text-destructive">
              The employee will be notified of the rejection along with your reason.
            </p>
          </div>
          <div>
            <label
              htmlFor="reject-reason"
              className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground"
            >
              Rejection Reason <span className="text-destructive">*</span>
            </label>
            <textarea
              id="reject-reason"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this leave request is being rejected…"
              className="w-full resize-none rounded-lg border border-border bg-muted px-3 py-2.5 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              {trimmed.length} / 500 characters
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-muted px-4 text-[12px] font-semibold transition-colors hover:bg-muted-foreground/10 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!trimmed || loading}
            onClick={() => onConfirm(trimmed)}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-destructive px-4 text-[12px] font-semibold text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? (
              <>
                <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
                Rejecting…
              </>
            ) : (
              <>
                <IconBan className="h-3.5 w-3.5" />
                Reject Request
              </>
            )}
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};

// ─── Task Transfer Decision Modal ─────────────────────────────────────────────
// Shown BEFORE a leave is finalized as approved, whenever the employee has
// active Checklist & Delegation work. The reviewer must make an explicit
// per-item decision (transfer to X, or don't transfer) for every affected
// task/occurrence — approval is blocked server-side until every item is
// covered. The configured Backup Assignee is only a pre-filled suggestion;
// the reviewer can change it or select "Don't transfer" for any item, and may
// still pick a backup who is themself on leave if they choose to.
const TaskTransferDecisionModal: React.FC<{
  request: LeaveRequest;
  impact: Extract<TaskImpact, { status: 'needs_decision' }>;
  onClose: () => void;
  onConfirm: (decisions: TaskTransferDecision[]) => void;
  loading: boolean;
}> = ({ request, impact, onClose, onConfirm, loading }) => {
  const user = useAppSelector(selectUser);
  const { data: availableUsers = [], isLoading: usersLoading } = useAvailableTransferUsers(
    resolveActAsTenant(request.tenant, user?.tenantId)
  );
  const isOneTime = (it: AffectedItem) => it.targetType === 'task' && it.frequency === 'ONE_TIME';

  // ONE_TIME tasks can't be transferred — the only decision for them is pushing
  // the due date out. Default to the day right after the leave ends.
  const defaultExtendDate = (() => {
    const d = new Date(request.toDate);
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  })();
  const [extendDates, setExtendDates] = useState<Record<string, string>>(() =>
    Object.fromEntries(impact.items.filter(isOneTime).map((it) => [it.id, defaultExtendDate]))
  );
  const [choices, setChoices] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      impact.items.filter((it) => !isOneTime(it)).map((it) => [it.id, impact.defaultBackupId ?? ''])
    )
  );
  // Group items by their underlying task so every scheduled date of a
  // recurring task renders under one heading, each with its own selector —
  // ONE_TIME tasks always form a single-item group (their one due date, via
  // the extend action below).
  const groups = useMemo(() => {
    const map = new Map<string, AffectedItem[]>();
    for (const it of impact.items) {
      const arr = map.get(it.taskId) ?? [];
      arr.push(it);
      map.set(it.taskId, arr);
    }
    return [...map.values()];
  }, [impact.items]);

  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(
    () => new Set(groups.filter((g) => g.length > 1).map((g) => g[0].taskId))
  );
  const toggleExpanded = (taskId: string) =>
    setExpandedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });

  const overlaps = (aFrom: string, aTo: string, bFrom: string, bTo: string) =>
    new Date(aFrom) <= new Date(bTo) && new Date(aTo) >= new Date(bFrom);

  const candidates = availableUsers
    // Exclude the person taking leave — their own tasks can't be "transferred" to themself.
    .filter((u) => u.employeeId !== request.employeeId && u.name !== request.employeeName)
    .map((u) => ({
      ...u,
      onLeave: u.leaves.some((l) =>
        overlaps(request.fromDate, request.toDate, l.fromDate, l.toDate)
      ),
    }))
    // Hard-excluded, not just labeled — the backend rejects a transfer to
    // anyone on leave for the affected dates (see
    // LeaveTaskTransferService.assertDelegateeAvailable), so offering them
    // here would just let the approver pick a choice that fails on confirm.
    .filter((u) => !u.onLeave);

  // The suggested default backup (or any prior choice) may point at the person
  // taking leave — e.g. a misconfigured backupAssigneeId pointing at themself.
  // They're excluded from `candidates` above; clear any choice that no longer
  // resolves to a real candidate so a self-transfer can never be submitted.
  useEffect(() => {
    if (availableUsers.length === 0) return;
    const validIds = new Set(candidates.map((c) => c.id));
    setChoices((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const [id, val] of Object.entries(next)) {
        if (val && !validIds.has(val)) {
          next[id] = '';
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [availableUsers, candidates]);

  const allDecided = impact.items.every((it) =>
    isOneTime(it) ? !!extendDates[it.id] : choices[it.id] !== undefined
  );

  const handleConfirm = () => {
    const decisions: TaskTransferDecision[] = impact.items.map((it) => {
      if (isOneTime(it)) {
        return {
          targetType: 'task',
          targetId: it.id,
          action: 'extend',
          newDate: extendDates[it.id],
        };
      }
      const chosen = choices[it.id];
      if (!chosen) return { targetType: it.targetType, targetId: it.id, action: 'skip' };
      return {
        targetType: it.targetType,
        targetId: it.id,
        action: 'transfer',
        delegateeId: chosen,
      };
    });
    onConfirm(decisions);
  };

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <IconArrowsRightLeft className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-[16px] font-bold leading-tight tracking-[-0.01em]">
                Review affected tasks before approving
              </h2>
              <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                {request.employeeName} · {impact.items.length} item
                {impact.items.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 px-6 py-5">
          <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/40 px-3.5 py-3">
            <IconAlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-[12px] font-medium text-muted-foreground">
              Every item below needs a decision before this leave can be approved — transfer
              recurring tasks to someone (or leave them with the original assignee); one-time tasks
              can't be transferred, so pick a new due date for them instead.
              {impact.backupOnLeave &&
                " The configured backup is also on approved leave during this period, so they've been left out of the list below — pick someone else."}
            </p>
          </div>

          <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-border bg-muted/20 p-2">
            {groups.map((group) => {
              const first = group[0];
              const taskId = first.taskId;
              // ONE_TIME groups always have exactly one item — extend its due date.
              if (isOneTime(first)) {
                return (
                  <div key={taskId} className="rounded-lg border border-border bg-card px-3 py-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] font-medium text-foreground">
                          {first.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{first.frequency}</p>
                      </div>
                      <input
                        type="date"
                        aria-label="Extend due date to"
                        min={defaultExtendDate}
                        value={extendDates[first.id] ?? defaultExtendDate}
                        onChange={(e) =>
                          setExtendDates((prev) => ({ ...prev, [first.id]: e.target.value }))
                        }
                        className="w-40 shrink-0 rounded-lg border border-border bg-muted px-2.5 py-2 text-[12px] text-foreground outline-none transition-colors focus:border-primary"
                      />
                    </div>
                  </div>
                );
              }

              // Recurring group: one row per scheduled date, each with its own
              // delegatee selector — different dates of the same task can go
              // to different people.
              const isExpanded = expandedTaskIds.has(taskId) || group.length === 1;
              return (
                <div key={taskId} className="rounded-lg border border-border bg-card px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    {group.length > 1 && (
                      <button
                        type="button"
                        onClick={() => toggleExpanded(taskId)}
                        aria-label={isExpanded ? 'Collapse dates' : 'Expand dates'}
                        className="flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground transition-transform hover:text-foreground"
                      >
                        <IconChevronDown
                          className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </button>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-medium text-foreground">
                        {first.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {first.frequency}
                        {' · '}
                        {group.length === 1
                          ? fmtDate(group[0].scheduledDate ?? '')
                          : `${group.length} days during this leave`}
                      </p>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="mt-2 space-y-2 border-t border-border pt-2">
                      {group.map((it) => (
                        <div key={it.id} className="flex items-center justify-between gap-3 pl-5">
                          <span className="text-[12px] text-foreground">
                            {fmtDate(it.scheduledDate ?? '')}
                          </span>
                          <select
                            value={choices[it.id] ?? ''}
                            onChange={(e) =>
                              setChoices((prev) => ({ ...prev, [it.id]: e.target.value }))
                            }
                            disabled={usersLoading}
                            className="w-48 shrink-0 rounded-lg border border-border bg-muted px-2.5 py-2 text-[12px] text-foreground outline-none transition-colors focus:border-primary disabled:opacity-60"
                          >
                            <option value="">Don't transfer</option>
                            {candidates.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                                {c.id === impact.defaultBackupId ? ' — backup' : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-6 py-4">
          <button
            type="button"
            disabled={!allDecided || loading}
            onClick={handleConfirm}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-[12px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? (
              <>
                <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
                Approving…
              </>
            ) : (
              <>
                <IconArrowsRightLeft className="h-3.5 w-3.5" />
                Confirm & Approve Leave
              </>
            )}
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};

// ─── Admin Detail Panel ───────────────────────────────────────────────────────
const DetailPanel: React.FC<{
  request: LeaveRequest;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  onProcess: (status: LeaveRequest['status'], updatedLeaveDays: LeaveDayEntry[]) => void;
  loading: boolean;
  allowEdit?: boolean;
}> = ({ request, onClose, onApprove, onReject, onProcess, loading, allowEdit }) => {
  const hasPerDay = (request.leaveDays ?? []).length > 0;
  const isPending = request.status === 'pending';
  const showActions = isPending || allowEdit;

  const [decisions, setDecisions] = useState<Map<string, 'approved' | 'rejected'>>(
    () =>
      new Map(
        (request.leaveDays ?? []).map((d) => [
          d.date,
          (d.decision ?? 'approved') as 'approved' | 'rejected',
        ])
      )
  );

  const toggleDecision = (date: string) => {
    setDecisions((prev) => {
      const next = new Map(prev);
      next.set(date, prev.get(date) === 'approved' ? 'rejected' : 'approved');
      return next;
    });
  };

  const approvedCount = [...decisions.values()].filter((d) => d === 'approved').length;
  const rejectedCount = [...decisions.values()].filter((d) => d === 'rejected').length;

  const handleProcess = () => {
    if (!request.leaveDays) return;
    const updated: LeaveDayEntry[] = request.leaveDays.map((d) => ({
      ...d,
      decision: decisions.get(d.date) ?? ('approved' as const),
    }));
    const overallStatus =
      approvedCount === 0 ? 'rejected' : rejectedCount === 0 ? 'approved' : 'partial';
    onProcess(overallStatus, updated);
  };

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <IconCalendar className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-[16px] font-bold leading-tight tracking-[-0.01em]">
                Leave Request Details
              </h2>
              <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                {request.employeeName} · Applied{' '}
                {fmtDate(request.appliedDate ?? request.createdAt ?? '')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div className="flex items-center gap-3.5 rounded-xl border border-border bg-muted/40 p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/12 text-[13px] font-bold text-primary">
              {initials(request.employeeName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-bold">{request.employeeName}</p>
              <p className="truncate text-[12px] text-muted-foreground">
                {request.employeeId} · {request.department}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <StatusPill status={getEffectiveStatus(request)} />
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                  {request.days} day{request.days !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {hasPerDay ? (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                  Day-wise Decision
                </p>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="font-semibold text-success">{approvedCount} approve</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="font-semibold text-destructive">{rejectedCount} reject</span>
                </div>
              </div>
              <div className="divide-y divide-border rounded-xl border border-border">
                {(request.leaveDays ?? []).map((d) => {
                  const dec = decisions.get(d.date) ?? 'approved';
                  return (
                    <div key={d.date} className="flex flex-wrap items-center gap-2 px-3.5 py-2.5">
                      <span className="flex-1 text-[13px] font-medium">{fmtDayLabel(d.date)}</span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            'rounded px-2 py-0.5 text-[11px] font-semibold',
                            d.type === 'full'
                              ? 'bg-primary/10 text-primary'
                              : 'bg-warning/10 text-warning'
                          )}
                        >
                          {d.type === 'full' ? 'Full Day' : 'Half Day'}
                        </span>
                        {d.type === 'half' && d.half && (
                          <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                            {d.half === 'first' ? '1st Half' : '2nd Half'}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleDecision(d.date)}
                        className={cn(
                          'rounded-full px-3 py-0.5 text-[11px] font-bold transition-all',
                          dec === 'approved'
                            ? 'bg-success/15 text-success ring-1 ring-success/40'
                            : 'bg-destructive/15 text-destructive ring-1 ring-destructive/40'
                        )}
                      >
                        {dec === 'approved' ? '✓ Approve' : '✗ Reject'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-muted/30">
              {[
                { label: 'From', value: fmtDate(request.fromDate) },
                { label: 'To', value: fmtDate(request.toDate) },
                { label: 'Days', value: String(request.days) },
              ].map((item) => (
                <div key={item.label} className="px-4 py-3 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-[14px] font-bold tabular-nums">{item.value}</p>
                </div>
              ))}
            </div>
          )}

          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
              Employee's Reason
            </p>
            <p className="rounded-xl bg-muted/30 px-3.5 py-3 text-[13px]">{request.reason}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-muted/30 px-3.5 py-3">
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                Submitted by
              </p>
              <p className="text-[13px] font-semibold">
                {request.submittedBy || request.employeeName}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {fmtDate(request.appliedDate ?? request.createdAt ?? '')}
              </p>
            </div>
            {request.approvedBy && (
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                  {request.status === 'approved' || request.status === 'partial'
                    ? 'Approved by'
                    : request.status === 'rejected'
                      ? 'Rejected by'
                      : 'Actioned by'}
                </p>
                <p className="text-[13px] font-semibold">{request.approvedBy}</p>
                {request.approvedDate && (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {fmtDate(request.approvedDate)}
                  </p>
                )}
              </div>
            )}
          </div>

          {request.remarks && (
            <div>
              <div className="mb-1.5 flex items-center gap-1.5">
                <IconMessageCircle className="h-3 w-3 text-muted-foreground" />
                <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                  HR Remarks
                </p>
              </div>
              <div
                className={cn(
                  'rounded-xl border px-3.5 py-3 text-[13px]',
                  request.status === 'rejected'
                    ? 'border-destructive/40 bg-destructive/5 text-destructive'
                    : 'border-border bg-muted/30'
                )}
              >
                {request.remarks}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border bg-muted/30 px-6 py-4">
          {hasPerDay ? (
            showActions ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleProcess}
                  className={cn(
                    'inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-[13px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-60',
                    approvedCount === 0
                      ? 'bg-destructive text-destructive-foreground'
                      : 'bg-success text-success-foreground'
                  )}
                >
                  {loading ? (
                    <>
                      <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
                      Processing…
                    </>
                  ) : approvedCount === 0 ? (
                    <>
                      <IconBan className="h-3.5 w-3.5" />
                      Reject All Days
                    </>
                  ) : (
                    <>
                      <IconCheck className="h-3.5 w-3.5" strokeWidth={2.5} />
                      Update Decision
                    </>
                  )}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-muted px-4 text-[12px] font-semibold transition-colors hover:bg-muted-foreground/10"
              >
                Close
              </button>
            )
          ) : showActions ? (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={onApprove}
                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-success px-4 text-[13px] font-semibold text-success-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
                    Approving…
                  </>
                ) : (
                  <>
                    <IconCheck className="h-3.5 w-3.5" strokeWidth={2.5} />
                    {isPending ? 'Approve' : 'Re-approve'}
                  </>
                )}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={onReject}
                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-destructive px-4 text-[13px] font-semibold text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                <IconBan className="h-3.5 w-3.5" />
                {isPending ? 'Reject' : 'Re-reject'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-muted px-4 text-[12px] font-semibold transition-colors hover:bg-muted-foreground/10"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};

// ─── Dummy Leave Requests for Visual Verification ─────────────────────────────
const DUMMY_LEAVE_REQUESTS: LeaveRequest[] = [
  // ── Pending Requests ────────────────────────────
  {
    id: 'lr-101',
    employeeId: 'EMP001',
    employeeName: 'Alex Johnson',
    department: 'Engineering',
    leaveType: 'Privilege Leave',
    fromDate: '2026-09-10',
    toDate: '2026-09-12',
    days: 3,
    leaveDays: [
      { date: '2026-09-10', type: 'full', decision: 'approved' },
      { date: '2026-09-11', type: 'full', decision: 'approved' },
      { date: '2026-09-12', type: 'full', decision: 'approved' },
    ],
    reason: 'Family function in hometown',
    status: 'pending',
    appliedDate: '2026-09-06T10:30:00.000Z',
    createdAt: '2026-09-06T10:30:00.000Z',
    yourProjectedPlannedAt: '2026-09-08T18:00:00.000Z',
  },
  {
    id: 'lr-102',
    employeeId: 'EMP002',
    employeeName: 'Sarah Williams',
    department: 'Design',
    leaveType: 'Casual Leave',
    fromDate: '2026-09-14',
    toDate: '2026-09-15',
    days: 2,
    leaveDays: [
      { date: '2026-09-14', type: 'full', decision: 'approved' },
      { date: '2026-09-15', type: 'full', decision: 'approved' },
    ],
    reason: 'Personal errands and documentation work',
    status: 'pending',
    appliedDate: '2026-09-07T09:15:00.000Z',
    createdAt: '2026-09-07T09:15:00.000Z',
    yourProjectedPlannedAt: '2026-09-09T18:00:00.000Z',
  },
  {
    id: 'lr-103',
    employeeId: 'EMP003',
    employeeName: 'Michael Chang',
    department: 'Human Resources',
    leaveType: 'Sick Leave',
    fromDate: '2026-09-08',
    toDate: '2026-09-08',
    days: 1,
    leaveDays: [
      { date: '2026-09-08', type: 'full', decision: 'approved' },
    ],
    reason: 'Routine medical checkup and consultation',
    status: 'pending',
    appliedDate: '2026-09-07T08:00:00.000Z',
    createdAt: '2026-09-07T08:00:00.000Z',
    yourProjectedPlannedAt: '2026-09-08T12:00:00.000Z',
  },
  {
    id: 'lr-104',
    employeeId: 'EMP004',
    employeeName: 'Pooja Patel',
    department: 'Finance',
    leaveType: 'Casual Leave',
    fromDate: '2026-09-18',
    toDate: '2026-09-18',
    days: 0.5,
    leaveDays: [
      { date: '2026-09-18', type: 'half', half: 'second', decision: 'approved' },
    ],
    reason: 'Bank visit and official financial verification in 2nd half',
    status: 'pending',
    appliedDate: '2026-09-06T16:45:00.000Z',
    createdAt: '2026-09-06T16:45:00.000Z',
    yourProjectedPlannedAt: '2026-09-08T18:00:00.000Z',
  },

  // ── Processed Requests ──────────────────────────
  {
    id: 'lr-201',
    employeeId: 'EMP001',
    employeeName: 'Alex Johnson',
    department: 'Engineering',
    leaveType: 'Casual Leave',
    fromDate: '2026-09-01',
    toDate: '2026-09-02',
    days: 2,
    leaveDays: [
      { date: '2026-09-01', type: 'full', decision: 'approved' },
      { date: '2026-09-02', type: 'full', decision: 'approved' },
    ],
    reason: 'Attending family wedding ceremony',
    status: 'approved',
    appliedDate: '2026-08-28T11:00:00.000Z',
    createdAt: '2026-08-28T11:00:00.000Z',
    tatPlannedAt: '2026-08-29T18:00:00.000Z',
    processedAt: '2026-08-29T14:20:00.000Z',
    tatDelayMinutes: -220,
    processedBy: { id: 'admin-1', name: 'Superadmin' },
  },
  {
    id: 'lr-202',
    employeeId: 'EMP003',
    employeeName: 'Michael Chang',
    department: 'Human Resources',
    leaveType: 'Sick Leave',
    fromDate: '2026-08-25',
    toDate: '2026-08-26',
    days: 2,
    leaveDays: [
      { date: '2026-08-25', type: 'full', decision: 'approved' },
      { date: '2026-08-26', type: 'full', decision: 'rejected' },
    ],
    reason: 'Seasonal viral fever',
    status: 'partial',
    appliedDate: '2026-08-24T14:30:00.000Z',
    createdAt: '2026-08-24T14:30:00.000Z',
    tatPlannedAt: '2026-08-25T18:00:00.000Z',
    processedAt: '2026-08-25T11:00:00.000Z',
    tatDelayMinutes: -420,
    processedBy: { id: 'admin-1', name: 'Superadmin' },
  },
  {
    id: 'lr-203',
    employeeId: 'EMP002',
    employeeName: 'Sarah Williams',
    department: 'Design',
    leaveType: 'Earned Leave',
    fromDate: '2026-08-20',
    toDate: '2026-08-22',
    days: 3,
    leaveDays: [
      { date: '2026-08-20', type: 'full', decision: 'rejected' },
      { date: '2026-08-21', type: 'full', decision: 'rejected' },
      { date: '2026-08-22', type: 'full', decision: 'rejected' },
    ],
    reason: 'Vacation trip',
    status: 'rejected',
    remarks: 'Critical sprint design review scheduled on these dates',
    appliedDate: '2026-08-18T10:00:00.000Z',
    createdAt: '2026-08-18T10:00:00.000Z',
    tatPlannedAt: '2026-08-19T18:00:00.000Z',
    processedAt: '2026-08-20T09:30:00.000Z',
    tatDelayMinutes: 930,
    processedBy: { id: 'admin-1', name: 'Superadmin' },
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────
const MainLeaveManagement = () => {
  // Guards the "Apply Leave" button (opens ApplyLeaveModal, a create flow —
  // out of scope for this pilot's company-picker work, so it stays blocked
  // in "All Companies" mode exactly as before).
  const requireCompanySelected = useRequireCompanySelected();
  const user = useAppSelector(selectUser);
  const employeeId = user?.employeeId ?? '';
  const roleUpper = String(user?.role || '').toUpperCase().replace(/[^A-Z]/g, '');
  const isAdmin =
    !employeeId ||
    roleUpper.includes('ADMIN') ||
    roleUpper.includes('SUPER') ||
    roleUpper.includes('HR');
  const isSuperAdmin = roleUpper.includes('SUPER');
  const canApplyLeave = isAdmin || !!employeeId;
  const employeeName =
    user?.fullName || (typeof user?.name === 'string' ? user.name : user?.email) || '';
  const employeeDeptId =
    (typeof user?.departmentId === 'string' ? user.departmentId : undefined) ??
    user?.department?.id ??
    '';

  const { data: departments } = useDepartmentOptions();
  const { data: managers } = useManagers();
  const { data: employees = [] } = useEmployees();
  const {
    data: leaveRequests,
    isLoading: adminLoading,
    isError: adminError,
    refetch,
  } = useLeaveRequests(isAdmin);
  const { data: myLeaves, isLoading: myLoading } = useLeavesByEmployee(employeeId);
  const updateStatus = useUpdateLeaveStatus();
  const taskImpactMutation = useTaskImpact();

  // ── Unified data source: admins see all, normal users see only their own ────
  const isLoading = isAdmin ? adminLoading : myLoading;
  const isError = isAdmin ? adminError : false;

  const rawRequests = isAdmin ? leaveRequests : myLeaves;
  const requests = useMemo(() => {
    if (Array.isArray(rawRequests) && rawRequests.length > 0) {
      return rawRequests;
    }
    return DUMMY_LEAVE_REQUESTS;
  }, [rawRequests]);

  // ── Tab state ───────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<Tab>('pending');

  // ── State ───────────────────────────────────────────────────────────────────
  const [applying, setApplying] = useState(false);
  const [myDetailFor, setMyDetailFor] = useState<LeaveRequest | null>(null);
  const [search, setSearch] = useState('');
  const [detailFor, setDetailFor] = useState<LeaveRequest | null>(null);
  const [editFor, setEditFor] = useState<LeaveRequest | null>(null);
  const [rejectFor, setRejectFor] = useState<LeaveRequest | null>(null);
  const [pendingLeaveDays, setPendingLeaveDays] = useState<LeaveDayEntry[] | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkAction, setIsBulkAction] = useState(false);
  const [taskTransferFor, setTaskTransferFor] = useState<{
    request: LeaveRequest;
    impact: Extract<TaskImpact, { status: 'needs_decision' }>;
    pendingStatus: LeaveRequest['status'];
    pendingLeaveDays?: LeaveDayEntry[];
  } | null>(null);

  // Runs the mandatory pre-approval review: fetches what this leave would
  // affect, and if anything needs a decision, opens the modal INSTEAD of
  // approving — the backend rejects the approval itself until matching
  // taskDecisions are submitted, so approval only proceeds directly when
  // there's nothing to review. `actAsTenantId` (see resolveActAsTenant) is
  // threaded through every call below so a merged request from a
  // non-active company is acted on correctly — no session switch, "All
  // Companies" is never left (see actAsTenantMiddleware on the backend).
  const approveWithReview = async (
    request: LeaveRequest,
    status: LeaveRequest['status'] = 'approved',
    leaveDays?: LeaveDayEntry[]
  ): Promise<LeaveRequest | null> => {
    const actAsTenantId = resolveActAsTenant(request.tenant, user?.tenantId);
    if (status !== 'approved' && status !== 'partial') {
      return updateStatus.mutateAsync({ id: request.id, status, leaveDays, actAsTenantId });
    }
    const impact = await taskImpactMutation.mutateAsync({ id: request.id, actAsTenantId });
    if (impact.status === 'needs_decision') {
      setTaskTransferFor({ request, impact, pendingStatus: status, pendingLeaveDays: leaveDays });
      return null;
    }
    return updateStatus.mutateAsync({ id: request.id, status, leaveDays, actAsTenantId });
  };

  // ── Counts + filter ─────────────────────────────────────────────────────────
  const pendingCount = useMemo(() => {
    return requests.filter((r) => r.status === 'pending').length;
  }, [requests]);

  const processedCount = useMemo(() => {
    return requests.filter((r) => r.status !== 'pending').length;
  }, [requests]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    return requests.filter((r) => {
      const matchTab = tab === 'pending' ? r.status === 'pending' : r.status !== 'pending';
      const matchSearch =
        !term ||
        r.employeeName.toLowerCase().includes(term) ||
        r.employeeId.toLowerCase().includes(term);
      return matchTab && matchSearch;
    });
  }, [requests, tab, search]);

  const switchTab = useCallback((t: Tab) => {
    setTab(t);
    setSelectedIds(new Set());
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const allFilteredSelected = filtered.length > 0 && filtered.every((r) => selectedIds.has(r.id));

  const toggleSelectAll = useCallback(() => {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((r) => r.id)));
    }
  }, [allFilteredSelected, filtered]);

  const handleBulkApprove = useCallback(async () => {
    const targets = filtered.filter((r) => selectedIds.has(r.id));
    if (targets.some((r) => r.id.startsWith('lr-'))) {
      toast.success(`Approved ${targets.length} leave requests (Demo)`);
      setSelectedIds(new Set());
      return;
    }
    // Checked sequentially since each needs its own impact check before
    // deciding whether it can approve directly — the "surface only the
    // first flagged one" behavior below depends on processing in order.
    const flagged: {
      request: LeaveRequest;
      impact: Extract<TaskImpact, { status: 'needs_decision' }>;
    }[] = [];
    for (const r of targets) {
      const actAsTenantId = resolveActAsTenant(r.tenant, user?.tenantId);
      const impact = await taskImpactMutation.mutateAsync({ id: r.id, actAsTenantId });
      if (impact.status === 'needs_decision') {
        flagged.push({ request: r, impact });
      } else {
        await updateStatus.mutateAsync({ id: r.id, status: 'approved', actAsTenantId });
      }
    }
    setSelectedIds(new Set());
    // A batch can flag more than one leave as needing review — surface the
    // first one; the rest stay PENDING_DECISION and can be resolved by
    // reopening that request individually (known v1 gap for the remainder).
    if (flagged.length > 0) {
      const first = flagged[0];
      setTaskTransferFor({
        request: first.request,
        impact: first.impact,
        pendingStatus: 'approved',
      });
    }
  }, [filtered, selectedIds, updateStatus, taskImpactMutation, user?.tenantId]);

  const openBulkReject = useCallback(() => {
    const firstSelected = filtered.find((r) => selectedIds.has(r.id));
    if (!firstSelected) return;
    setIsBulkAction(true);
    setRejectFor(firstSelected);
  }, [filtered, selectedIds]);

  const closeActivePanel = () => {
    setDetailFor(null);
    setEditFor(null);
  };

  const handleApprove = async (request: LeaveRequest) => {
    if (request.id.startsWith('lr-')) {
      toast.success(`Leave approved for ${request.employeeName} (Demo)`);
      closeActivePanel();
      return;
    }
    const updated = await approveWithReview(request, 'approved');
    if (updated) closeActivePanel();
  };

  const handleProcess = async (
    request: LeaveRequest,
    status: LeaveRequest['status'],
    updatedLeaveDays: LeaveDayEntry[]
  ) => {
    if (request.id.startsWith('lr-')) {
      toast.success(`Leave updated to ${status} for ${request.employeeName} (Demo)`);
      closeActivePanel();
      return;
    }
    if (status === 'rejected') {
      setPendingLeaveDays(updatedLeaveDays);
      setRejectFor(request);
    } else {
      const updated = await approveWithReview(request, status, updatedLeaveDays);
      if (updated) closeActivePanel();
    }
  };

  const handleConfirmTaskTransfer = async (decisions: TaskTransferDecision[]) => {
    if (!taskTransferFor) return;
    const actAsTenantId = resolveActAsTenant(taskTransferFor.request.tenant, user?.tenantId);
    try {
      await updateStatus.mutateAsync({
        id: taskTransferFor.request.id,
        status: taskTransferFor.pendingStatus,
        leaveDays: taskTransferFor.pendingLeaveDays,
        taskDecisions: decisions,
        actAsTenantId,
      });
      setTaskTransferFor(null);
      closeActivePanel();
    } catch {
      // Keep the modal open so the reviewer can retry.
    }
  };

  const handleReject = async (request: LeaveRequest, reason: string) => {
    if (request.id.startsWith('lr-')) {
      toast.success(`Leave rejected for ${request.employeeName} (Demo)`);
      setRejectFor(null);
      closeActivePanel();
      setPendingLeaveDays(null);
      setIsBulkAction(false);
      return;
    }
    if (isBulkAction) {
      const targets = filtered.filter((r) => selectedIds.has(r.id));
      // Every row's write can run concurrently now — no shared session
      // state to race between companies (see actAsTenantMiddleware).
      await Promise.all(
        targets.map((r) =>
          updateStatus.mutateAsync({
            id: r.id,
            status: 'rejected',
            remarks: reason,
            actAsTenantId: resolveActAsTenant(r.tenant, user?.tenantId),
          })
        )
      );
      setSelectedIds(new Set());
      setIsBulkAction(false);
    } else {
      await updateStatus.mutateAsync({
        id: request.id,
        status: 'rejected',
        remarks: reason,
        ...(pendingLeaveDays ? { leaveDays: pendingLeaveDays } : {}),
        actAsTenantId: resolveActAsTenant(request.tenant, user?.tenantId),
      });
    }
    setRejectFor(null);
    closeActivePanel();
    setPendingLeaveDays(null);
  };

  return (
    <div className="bg-background text-foreground grow">
      <div className="mx-auto max-w-350 space-y-5 px-4 pt-6 pb-10 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div>
            <p className="mb-0.5 text-[11px] sm:text-[12px] text-muted-foreground">Time Off</p>
            <h1 className="text-[18px] sm:text-[22px] font-bold leading-tight tracking-[-0.03em]">
              Leave Management
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {canApplyLeave && (
              <button
                type="button"
                onClick={() => {
                  if (!requireCompanySelected()) return;
                  setApplying(true);
                }}
                className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:flex-none"
              >
                <IconPlus className="h-4 w-4" strokeWidth={2.5} />
                Apply Leave
              </button>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <div className="flex border-b border-border">
            <button
              type="button"
              onClick={() => switchTab('pending')}
              className={cn(
                'relative flex flex-1 items-center justify-center gap-1.5 px-3 py-3 text-[12px] font-semibold transition-colors sm:gap-2 sm:px-5 sm:py-3.5 sm:text-[13px]',
                tab === 'pending'
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <IconClock className="h-4 w-4" />
              Pending
              {pendingCount > 0 && (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums',
                    tab === 'pending'
                      ? 'bg-warning/15 text-warning'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {pendingCount}
                </span>
              )}
              {tab === 'pending' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full bg-primary" />
              )}
            </button>
            <button
              type="button"
              onClick={() => switchTab('processed')}
              className={cn(
                'relative flex flex-1 items-center justify-center gap-1.5 px-3 py-3 text-[12px] font-semibold transition-colors sm:gap-2 sm:px-5 sm:py-3.5 sm:text-[13px]',
                tab === 'processed'
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <IconCheck className="h-4 w-4" />
              Processed
              {processedCount > 0 && (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums',
                    tab === 'processed'
                      ? 'bg-success/15 text-success'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {processedCount}
                </span>
              )}
              {tab === 'processed' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full bg-primary" />
              )}
            </button>
          </div>

          {/* Search — admin only */}
          {isAdmin && (
            <div className="p-3.5 sm:px-5">
              <div className="relative">
                <IconSearch className="pointer-events-none absolute top-1/2 left-3.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by employee name or ID…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-muted pl-10 pr-3 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Tab Content (Pending / Processed) ────────────────────────────── */}
        {isLoading ? (
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <IconLoader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-[13px]">Loading leave requests…</p>
            </div>
          </div>
        ) : isError ? (
          <div className="flex min-h-[60vh] items-center justify-center px-4">
            <div className="flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
              <IconAlertCircle className="h-7 w-7 text-destructive" />
              <p className="text-[13px] font-semibold text-destructive">Couldn't load leave data</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-4 text-[12px] font-semibold text-primary-foreground hover:opacity-90"
              >
                <IconRefresh className="h-3.5 w-3.5" /> Retry
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Bulk action bar — admin only */}
            {isAdmin && selectedIds.size > 0 && (
              <div className="flex flex-col gap-2.5 rounded-xl border border-primary/30 bg-primary/8 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-[12px] sm:text-[13px] font-semibold text-primary">
                  {selectedIds.size} request{selectedIds.size !== 1 ? 's' : ''} selected
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={updateStatus.isPending}
                    onClick={handleBulkApprove}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-success px-3 text-[12px] font-semibold text-success-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    {updateStatus.isPending ? (
                      <IconLoader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <IconCheck className="h-3 w-3" strokeWidth={3} />
                    )}
                    Approve Selected ({selectedIds.size})
                  </button>
                  <button
                    type="button"
                    disabled={updateStatus.isPending}
                    onClick={openBulkReject}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-destructive px-3 text-[12px] font-semibold text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    <IconBan className="h-3 w-3" />
                    Reject Selected ({selectedIds.size})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedIds(new Set())}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-muted px-3 text-[12px] font-semibold transition-colors hover:bg-muted-foreground/10"
                  >
                    <IconX className="h-3 w-3" />
                    Clear
                  </button>
                </div>
              </div>
            )}

            {/* Result count */}
            <div className="px-1 text-[12px] text-muted-foreground">
              Showing{' '}
              <span className="font-semibold text-foreground tabular-nums">{filtered.length}</span>{' '}
              of{' '}
              <span className="font-semibold text-foreground tabular-nums">
                {tab === 'pending' ? pendingCount : processedCount}
              </span>{' '}
              {tab} request{filtered.length !== 1 ? 's' : ''}
            </div>

            {/* Table */}
            {filtered.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-215">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        {isAdmin && tab === 'pending' && (
                          <th className="w-10 px-3 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={allFilteredSelected}
                              onChange={toggleSelectAll}
                              className="h-4 w-4 cursor-pointer accent-primary"
                              aria-label="Select all"
                            />
                          </th>
                        )}
                        <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                          Actions
                        </th>
                        {filtered.some((r) => r.tenant) && (
                          <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                            Company
                          </th>
                        )}
                        {isAdmin && (
                          <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                            Employee
                          </th>
                        )}
                        <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                          Duration
                        </th>
                        <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                          Days
                        </th>
                        <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                          Status
                        </th>
                        <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                          Created At
                        </th>
                        <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                          Planned At
                        </th>
                        {tab === 'processed' && (
                          <>
                            <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                              Processed At
                            </th>
                            <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                              Delay
                            </th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filtered.map((req) => {
                        const isPendingReq = req.status === 'pending';
                        const approving =
                          updateStatus.isPending &&
                          updateStatus.variables?.id === req.id &&
                          updateStatus.variables?.status === 'approved';
                        return (
                          <tr key={req.id} className="transition-colors hover:bg-muted/40">
                            {isAdmin && tab === 'pending' && (
                              <td className="w-10 px-3 py-3.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(req.id)}
                                  onChange={() => toggleSelect(req.id)}
                                  className="h-4 w-4 cursor-pointer accent-primary"
                                  aria-label={`Select ${req.employeeName}`}
                                />
                              </td>
                            )}
                            <td className="px-5 py-3.5">
                              <div className="inline-flex items-center gap-1.5 whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() =>
                                    isAdmin ? setDetailFor(req) : setMyDetailFor(req)
                                  }
                                  className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-muted px-2.5 text-[11px] font-semibold text-foreground transition-colors hover:bg-muted-foreground/10"
                                >
                                  <IconEye className="h-3 w-3" />
                                  View
                                </button>
                                {isAdmin &&
                                  (tab === 'processed' ? (
                                    <button
                                      type="button"
                                      onClick={() => setEditFor(req)}
                                      className="inline-flex h-8 items-center gap-1 rounded-md border border-primary/40 bg-primary/8 px-2.5 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/15"
                                    >
                                      <IconEdit className="h-3 w-3" />
                                      Edit
                                    </button>
                                  ) : (
                                    isPendingReq && (
                                      <>
                                        <button
                                          type="button"
                                          disabled={approving}
                                          onClick={() => handleApprove(req)}
                                          className="inline-flex h-8 items-center gap-1 rounded-md bg-success px-2.5 text-[11px] font-semibold text-success-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                                        >
                                          {approving ? (
                                            <IconLoader2 className="h-3 w-3 animate-spin" />
                                          ) : (
                                            <IconCheck className="h-3 w-3" strokeWidth={3} />
                                          )}
                                          Approve
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setRejectFor(req)}
                                          className="inline-flex h-8 items-center gap-1 rounded-md bg-destructive px-2.5 text-[11px] font-semibold text-destructive-foreground transition-opacity hover:opacity-90"
                                        >
                                          <IconBan className="h-3 w-3" />
                                          Reject
                                        </button>
                                      </>
                                    )
                                  ))}
                              </div>
                            </td>
                            {filtered.some((r) => r.tenant) && (
                              <td className="px-5 py-3.5 text-[12px] text-muted-foreground whitespace-nowrap">
                                {req.tenant?.name ?? '—'}
                              </td>
                            )}
                            {isAdmin && (
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-[11px] font-bold text-primary">
                                    {initials(req.employeeName)}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="truncate text-[13px] font-semibold">
                                      {req.employeeName}
                                    </p>
                                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                      {req.department}
                                    </p>
                                  </div>
                                </div>
                              </td>
                            )}
                            <td className="px-5 py-3.5 text-[12px] text-muted-foreground">
                              {fmtDate(req.fromDate)} – {fmtDate(req.toDate)}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="text-[13px] font-bold tabular-nums">{req.days}</span>
                              <span className="ml-1 text-[11px] text-muted-foreground">
                                day{req.days !== 1 ? 's' : ''}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <StatusPill status={req.status} />
                            </td>
                            <td className="px-5 py-3.5 text-[12px] text-muted-foreground whitespace-nowrap">
                              {fmtDt(req.createdAt)}
                            </td>
                            <td className="px-5 py-3.5 text-[12px] text-muted-foreground whitespace-nowrap">
                              {req.processedAt ? (
                                fmtDt(req.tatPlannedAt)
                              ) : req.yourProjectedPlannedAt ? (
                                <>
                                  {fmtDt(req.yourProjectedPlannedAt)}
                                  <span className="ml-1 text-[10px] text-muted-foreground/70">
                                    (estimate)
                                  </span>
                                </>
                              ) : (
                                '—'
                              )}
                            </td>
                            {tab === 'processed' && (
                              <>
                                <td className="px-5 py-3.5 text-[12px] text-muted-foreground whitespace-nowrap">
                                  {fmtDt(req.processedAt)}
                                  {req.processedAt && req.processedBy?.name && (
                                    <div className="text-[10px] text-muted-foreground/70">
                                      by {req.processedBy.name}
                                    </div>
                                  )}
                                </td>
                                <td className="px-5 py-3.5">
                                  <DelayBadge delayMinutes={req.tatDelayMinutes} />
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-16 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <IconCalendar className="h-6 w-6" />
                </div>
                <p className="text-[14px] font-semibold">No leave requests found</p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {search
                    ? 'Try adjusting your search.'
                    : tab === 'pending'
                      ? 'No pending requests — all caught up!'
                      : 'No processed requests yet.'}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {applying && (
        <ApplyLeaveModal
          employeeId={employeeId}
          employeeName={employeeName}
          employeeDeptId={employeeDeptId}
          departments={departments ?? []}
          managers={managers ?? []}
          employees={employees}
          isAdmin={isAdmin}
          isSuperAdmin={isSuperAdmin}
          onClose={() => setApplying(false)}
        />
      )}

      {myDetailFor && <DetailModal request={myDetailFor} onClose={() => setMyDetailFor(null)} />}

      {detailFor && !rejectFor && (
        <DetailPanel
          request={detailFor}
          onClose={() => setDetailFor(null)}
          onApprove={() => handleApprove(detailFor)}
          onReject={() => setRejectFor(detailFor)}
          onProcess={(status, leaveDays) => handleProcess(detailFor, status, leaveDays)}
          loading={updateStatus.isPending}
        />
      )}

      {editFor && !rejectFor && (
        <DetailPanel
          request={editFor}
          onClose={() => setEditFor(null)}
          onApprove={() => handleApprove(editFor)}
          onReject={() => setRejectFor(editFor)}
          onProcess={(status, leaveDays) => handleProcess(editFor, status, leaveDays)}
          loading={updateStatus.isPending}
          allowEdit
        />
      )}

      {rejectFor && (
        <RejectModal
          request={rejectFor}
          onClose={() => {
            setRejectFor(null);
            setIsBulkAction(false);
          }}
          onConfirm={(reason) => handleReject(rejectFor, reason)}
          loading={updateStatus.isPending}
          subtitleOverride={
            isBulkAction
              ? `${selectedIds.size} leave request${selectedIds.size !== 1 ? 's' : ''} will be rejected`
              : undefined
          }
        />
      )}

      {taskTransferFor && (
        <TaskTransferDecisionModal
          request={taskTransferFor.request}
          impact={taskTransferFor.impact}
          onClose={() => setTaskTransferFor(null)}
          onConfirm={handleConfirmTaskTransfer}
          loading={updateStatus.isPending}
        />
      )}
    </div>
  );
};

export default MainLeaveManagement;

// Re-exported for Dashboard LeaveWidget usage
export function ApplyLeaveModalProvider({ onClose }: { onClose: () => void }) {
  const user = useAppSelector(selectUser);
  const { data: departments = [] } = useDepartmentOptions();
  const { data: managers = [] } = useManagers();
  const { data: employees = [] } = useEmployees();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';
  const isSuperAdmin = user?.role === 'SUPERADMIN';

  const employeeId = user?.employeeId ?? '';
  const employeeName =
    user?.fullName || (typeof user?.name === 'string' ? user.name : user?.email) || '';
  const employeeDeptId =
    (typeof user?.departmentId === 'string' ? user.departmentId : undefined) ??
    user?.department?.id ??
    '';

  return (
    <ApplyLeaveModal
      employeeId={employeeId}
      employeeName={employeeName}
      employeeDeptId={employeeDeptId}
      departments={departments}
      managers={managers}
      employees={employees}
      isAdmin={isAdmin}
      isSuperAdmin={isSuperAdmin}
      onClose={onClose}
    />
  );
}
