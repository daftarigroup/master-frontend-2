'use client';

import {
  IconAlertCircle,
  IconArrowRight,
  IconBan,
  IconBell,
  IconCheck,
  IconChevronDown,
  IconCircleCheck,
  IconClock,
  IconCurrencyRupee,
  IconEdit,
  IconExternalLink,
  IconListDetails,
  IconLoader2,
  IconMessageCircle,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconSend,
  IconTrendingUp,
  IconUsers,
  IconWorld,
  IconX,
} from '@tabler/icons-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  useAdvanceDashboardStats,
  useAdvanceRequests,
  useAdvanceRequestsByEmployee,
  useLoanHistory,
  useMarkAdvanceComplete,
  useSubmitAdvanceRequest,
  useUpdateAdvanceRequest,
  useUpdateAdvanceRequestStatus,
} from '@/features/hr/advanceRequest/server/tanstackQuery/useAdvanceRequestQueries';
import type {
  AdvanceRequest,
  AdvanceRequestStatus,
  EmployeeLoanSummary,
  SubmitAdvanceRequestDto,
} from '@/features/hr/advanceRequest/types/types';
import { ModalPortal } from '@/features/hr/_shared/components';
import { useRequireCompanySelected } from '@/features/organization/hooks/useRequireCompanySelected';
import { resolveActAsTenant } from '@/features/organization/utils/actAsTenant';
import { cn } from '@/lib/utils';
import { useAppSelector } from '@/store/hook';
import { selectUser } from '@/store/slice/userAccountData';
import { Role } from '@/types/permissions';
import { useEmployees } from '@/features/hr/employee/server/tanstackQuery/useEmployeeQueries';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<
  AdvanceRequestStatus,
  { label: string; bg: string; text: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  pending: { label: 'PENDING', bg: 'bg-warning/10', text: 'text-warning', Icon: IconClock },
  approved: { label: 'APPROVED', bg: 'bg-success/10', text: 'text-success', Icon: IconCheck },
  rejected: {
    label: 'REJECTED',
    bg: 'bg-destructive/10',
    text: 'text-destructive',
    Icon: IconBan,
  },
};

const StatusPill = ({ status }: { status: AdvanceRequestStatus }) => {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.pending;
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

const LoanStatusPill = ({ status }: { status: string }) => {
  const cfg =
    status === 'paid'
      ? { label: 'PAID', bg: 'bg-success/10', text: 'text-success' }
      : status === 'active'
        ? { label: 'ACTIVE', bg: 'bg-primary/10', text: 'text-primary' }
        : { label: status.toUpperCase(), bg: 'bg-muted', text: 'text-muted-foreground' };
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

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return (parts[0]?.slice(0, 2) ?? '??').toUpperCase();
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

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

const fmtCurrency = (n: number | null | undefined) => {
  const val = typeof n === 'number' && !Number.isNaN(n) ? n : 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);
};

const inputCls = (err?: boolean) =>
  cn(
    'h-10 w-full rounded-lg border bg-muted px-3 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground',
    err ? 'border-destructive/40 focus:border-destructive' : 'border-border focus:border-primary'
  );

// ─── Mini Bar Chart ───────────────────────────────────────────────────────────

const MiniBarChart = ({
  data,
}: {
  data: { label: string; disbursed: number; count: number }[];
}) => {
  const safeData = Array.isArray(data) ? data : [];
  const max = Math.max(...safeData.map((d) => d.disbursed || 0), 1);
  const hasData = safeData.some((d) => (d.disbursed || 0) > 0 || (d.count || 0) > 0);

  if (!hasData) {
    return (
      <div className="flex h-24 items-center justify-center text-[12px] text-muted-foreground">
        No disbursements in the last 6 months
      </div>
    );
  }

  return (
    <div className="flex h-24 items-end gap-1.5">
      {safeData.map((d) => (
        <div key={d.label} className="group relative flex flex-1 flex-col items-center gap-1">
          <div
            className="w-full rounded-t-md bg-primary/20 transition-all group-hover:bg-primary/40"
            style={{ height: `${Math.max(((d.disbursed || 0) / max) * 72, (d.count || 0) > 0 ? 8 : 2)}px` }}
          />
          <span className="text-[9px] text-muted-foreground">{d.label}</span>
          {(d.count || 0) > 0 && (
            <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[9px] text-background opacity-0 transition-opacity group-hover:opacity-100">
              {fmtCurrency(d.disbursed)} ({d.count})
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ─── Amount Summary Row ───────────────────────────────────────────────────────

const AmountRow = ({
  label,
  amount,
  monthly,
  months,
  tone,
}: {
  label: string;
  amount: number;
  monthly: number;
  months: number;
  tone: 'default' | 'success' | 'warning';
}) => {
  const tones = {
    default: {
      wrap: 'bg-muted/30 border-border',
      label: 'text-muted-foreground',
      val: 'text-foreground',
    },
    success: {
      wrap: 'bg-success/5 border-success/20',
      label: 'text-success/70',
      val: 'text-success',
    },
    warning: {
      wrap: 'bg-warning/5 border-warning/20',
      label: 'text-warning/70',
      val: 'text-warning',
    },
  };
  const t = tones[tone];
  return (
    <div className={cn('rounded-xl border p-3.5', t.wrap)}>
      <p className={cn('mb-2 text-[10px] font-bold uppercase tracking-[0.05em]', t.label)}>
        {label}
      </p>
      <div className="grid grid-cols-3 divide-x divide-border/60">
        {[
          { l: 'Amount', v: fmtCurrency(amount) },
          { l: 'Monthly', v: fmtCurrency(monthly) },
          { l: 'Months', v: `${months} mo.` },
        ].map((item) => (
          <div key={item.l} className="px-3 text-center first:pl-0 last:pr-0">
            <p className={cn('text-[10px] font-semibold uppercase tracking-[0.04em]', t.label)}>
              {item.l}
            </p>
            <p className={cn('mt-0.5 text-[13px] font-bold tabular-nums', t.val)}>{item.v}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Employee-side helpers ────────────────────────────────────────────────────

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

type EmployeeFormState = {
  requestAmount: string;
  monthlyDeduction: string;
  reason: string;
  departmentId: string;
};

const INITIAL_EMPLOYEE_FORM: EmployeeFormState = {
  requestAmount: '',
  monthlyDeduction: '',
  reason: '',
  departmentId: '',
};

const ApplyAdvanceModal: React.FC<{
  employeeId: string;
  employeeName: string;
  employeeDeptId: string;
  employeeDeptName: string;
  isAdmin?: boolean;
  onClose: () => void;
}> = ({ employeeId, employeeName, employeeDeptId, employeeDeptName, isAdmin = false, onClose }) => {
  const requireCompanySelected = useRequireCompanySelected();
  const submit = useSubmitAdvanceRequest();
  const { data: employees = [] } = useEmployees();

  const [selectedEmpId, setSelectedEmpId] = useState(employeeId);
  const [selectedEmpName, setSelectedEmpName] = useState(employeeName);
  const [selectedEmpCode, setSelectedEmpCode] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState(employeeDeptId);
  const [selectedDeptName, setSelectedDeptName] = useState(employeeDeptName);

  const [form, setForm] = useState<EmployeeFormState>({
    ...INITIAL_EMPLOYEE_FORM,
    departmentId: employeeDeptId,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof EmployeeFormState | 'employee', string>>>({});
  const [submitted, setSubmitted] = useState(false);

  const requestAmt = Number(form.requestAmount) || 0;
  const monthlyDed = Number(form.monthlyDeduction) || 0;
  const noOfMonths = requestAmt > 0 && monthlyDed > 0 ? Math.ceil(requestAmt / monthlyDed) : 0;

  const isFormValid = Boolean(
    (!isAdmin || Boolean(selectedEmpId)) &&
    Boolean(isAdmin ? selectedEmpId : (employeeId || selectedEmpId)) &&
    requestAmt > 0 &&
    monthlyDed > 0 &&
    monthlyDed <= requestAmt &&
    form.reason.trim().length > 0
  );

  const setF = <K extends keyof EmployeeFormState>(k: K, v: EmployeeFormState[K]) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const handleEmpSelect = (empValue: string) => {
    const emp = employees.find((e) => e.employeeId === empValue || String(e.id) === empValue);
    if (emp) {
      const empId = emp.employeeId || String(emp.id);
      setSelectedEmpId(empId);
      setSelectedEmpName(emp.name);
      setSelectedEmpCode(emp.empCode || '');
      const deptId = emp.departmentId || emp.department?.id || '';
      const deptName = emp.department?.name || '';
      setSelectedDeptId(deptId);
      setSelectedDeptName(deptName);
      setF('departmentId', deptId);
      setErrors((prev) => ({ ...prev, employee: undefined }));
    } else {
      setSelectedEmpId('');
      setSelectedEmpName('');
      setSelectedEmpCode('');
      setSelectedDeptId('');
      setSelectedDeptName('');
    }
  };

  const validate = (): boolean => {
    const e: Partial<Record<keyof EmployeeFormState | 'employee', string>> = {};
    if (isAdmin && !selectedEmpId) {
      e.employee = 'Please select an employee';
    }
    if (!form.requestAmount || requestAmt <= 0)
      e.requestAmount = 'Required — must be a positive amount';
    if (!form.monthlyDeduction || monthlyDed <= 0)
      e.monthlyDeduction = 'Required — must be a positive amount';
    if (monthlyDed > requestAmt && requestAmt > 0)
      e.monthlyDeduction = 'Cannot exceed request amount';
    if (!form.reason.trim()) e.reason = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!requireCompanySelected()) return;
    if (!validate()) return;
    const finalEmpId = (isAdmin && selectedEmpId) ? selectedEmpId : employeeId;
    const finalEmpName = (isAdmin && selectedEmpName) ? selectedEmpName : employeeName;
    const finalDeptId = (isAdmin && selectedDeptId) ? selectedDeptId : (form.departmentId || employeeDeptId);

    const payload: SubmitAdvanceRequestDto = {
      employeeId: finalEmpId,
      empCode: selectedEmpCode || undefined,
      employeeName: finalEmpName,
      departmentId: finalDeptId || undefined,
      departmentName: selectedDeptName || undefined,
      requestAmount: requestAmt,
      monthlyDeduction: monthlyDed,
      noOfMonths: noOfMonths,
      reason: form.reason.trim(),
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
      aria-label="Apply advance request"
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
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <IconCurrencyRupee className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold leading-tight tracking-[-0.01em]">
                Request Advance Payment
              </h2>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                Submitting as {employeeName}
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

        {submitted ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <IconCheck className="h-8 w-8 text-success" strokeWidth={2.5} />
            </div>
            <h3 className="text-[18px] font-bold tracking-[-0.02em]">Request Submitted!</h3>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Your advance request has been sent to HR for review.
            </p>
            <div className="mt-5 rounded-xl border border-border bg-muted/40 px-6 py-4 text-center">
              <div className="grid grid-cols-3 divide-x divide-border">
                {[
                  { label: 'Request Amount', value: fmtCurrency(requestAmt) },
                  { label: 'Monthly Deduction', value: fmtCurrency(monthlyDed) },
                  { label: 'No. of Months', value: `${noOfMonths} mo.` },
                ].map((item) => (
                  <div key={item.label} className="px-4 py-2 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-[14px] font-bold tabular-nums">{item.value}</p>
                  </div>
                ))}
              </div>
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
                      value={selectedEmpId}
                      onChange={(e) => handleEmpSelect(e.target.value)}
                      className={cn(
                        inputCls(!!errors.employee),
                        'cursor-pointer appearance-none pr-9'
                      )}
                    >
                      <option value="">Select employee…</option>
                      {employees
                        .filter((e) => e.status === 'active')
                        .map((e) => {
                          const code = e.empCode || e.employeeId;
                          return (
                            <option key={e.id} value={e.employeeId || String(e.id)}>
                              {e.name} {code ? `(${code})` : ''}
                              {e.department?.name ? ` · ${e.department.name}` : ''}
                            </option>
                          );
                        })}
                    </select>
                  </div>
                  {selectedEmpName && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Selected: <strong className="text-foreground">{selectedEmpName}</strong>
                      {selectedEmpCode ? ` (${selectedEmpCode})` : (selectedEmpId ? ` (${selectedEmpId})` : '')}
                      {selectedDeptName && <> · {selectedDeptName}</>}
                    </p>
                  )}
                </Field>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                      Employee Name
                    </div>
                    <div className="flex h-10 items-center rounded-lg border border-border bg-muted/60 px-3 text-[13px] font-medium text-foreground">
                      <span className="truncate">{employeeName || '—'}</span>
                    </div>
                  </div>
                  <div>
                    <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                      Department
                    </div>
                    <div className="flex h-10 items-center rounded-lg border border-border bg-muted/60 px-3 text-[13px] font-medium text-foreground">
                      <span className="truncate">{employeeDeptName || 'Not assigned'}</span>
                    </div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Request Amount (₹)" required error={errors.requestAmount}>
                  <div className="relative">
                    <IconCurrencyRupee className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="number"
                      min="1"
                      value={form.requestAmount}
                      onChange={(e) => setF('requestAmount', e.target.value)}
                      placeholder="e.g. 50000"
                      className={cn(inputCls(!!errors.requestAmount), 'pl-9')}
                    />
                  </div>
                </Field>
                <Field label="Monthly Deduction (₹)" required error={errors.monthlyDeduction}>
                  <div className="relative">
                    <IconCurrencyRupee className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="number"
                      min="1"
                      value={form.monthlyDeduction}
                      onChange={(e) => setF('monthlyDeduction', e.target.value)}
                      placeholder="e.g. 5000"
                      className={cn(inputCls(!!errors.monthlyDeduction), 'pl-9')}
                    />
                  </div>
                </Field>
              </div>
              {noOfMonths > 0 && (
                <div className="flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2.5">
                  <IconCurrencyRupee className="h-4 w-4 shrink-0 text-primary" />
                  <span className="text-[13px] font-semibold text-primary">
                    {fmtCurrency(monthlyDed)} will be deducted monthly for{' '}
                    <strong>
                      {noOfMonths} month{noOfMonths !== 1 ? 's' : ''}
                    </strong>{' '}
                    to recover {fmtCurrency(requestAmt)}
                  </span>
                </div>
              )}
              <Field label="Reason for Advance" required error={errors.reason}>
                <textarea
                  rows={4}
                  value={form.reason}
                  onChange={(e) => setF('reason', e.target.value)}
                  placeholder="Describe why you need this advance payment…"
                  className="w-full resize-none rounded-lg border border-border bg-muted px-3 py-2.5 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
                />
              </Field>
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
                disabled={submit.isPending || !isFormValid}
                onClick={handleSubmit}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-[12px] font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submit.isPending ? (
                  <>
                    <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <IconSend className="h-3.5 w-3.5" />
                    Submit Request
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

// ─── Reject Modal ─────────────────────────────────────────────────────────────

const RejectModal: React.FC<{
  request: AdvanceRequest;
  loading: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}> = ({ request, loading, onClose, onConfirm }) => {
  const [reason, setReason] = useState('');
  const trimmed = reason.trim();

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-70 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Reject advance request"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      tabIndex={-1}
    >
      <div
        className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-200"
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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/12 text-destructive">
              <IconBan className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold leading-tight tracking-[-0.01em]">
                Reject Request
              </h2>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                {request.employeeName} · {fmtCurrency(request.requestAmount)}
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

        <div className="space-y-4 px-6 py-5">
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
              placeholder="Explain why this request is being rejected…"
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
                Reject
              </>
            )}
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};

// ─── Mark Complete Confirm Modal ──────────────────────────────────────────────

const CompleteModal: React.FC<{
  request: AdvanceRequest;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}> = ({ request, loading, onClose, onConfirm }) => (
  <ModalPortal>
    <div
      className="fixed inset-0 z-70 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200"
    onClick={onClose}
    role="dialog"
    aria-modal="true"
    aria-label="Mark advance complete"
    onKeyDown={(e) => {
      if (e.key === 'Escape') onClose();
    }}
    tabIndex={-1}
  >
    <div
      className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-200"
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/12 text-success">
            <IconCircleCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-[16px] font-bold leading-tight tracking-[-0.01em]">
              Mark as Fully Repaid
            </h2>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {request.employeeName} ·{' '}
              {fmtCurrency(request.approvedAmount ?? request.requestAmount)}
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

      <div className="space-y-4 px-6 py-5">
        <div className="flex items-start gap-2.5 rounded-xl border border-success/30 bg-success/5 px-3.5 py-3">
          <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          <p className="text-[12px] font-medium text-success">
            This will set the outstanding loan balance to ₹0 and mark the loan as paid. Use this
            when the advance has been fully recovered through salary deductions or a lump-sum
            payment.
          </p>
        </div>
        <p className="text-[13px] text-muted-foreground">
          The advance request will remain in the system for records. This action cannot be undone.
        </p>
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
          disabled={loading}
          onClick={onConfirm}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-success px-4 text-[12px] font-semibold text-success-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {loading ? (
            <>
              <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
              Processing…
            </>
          ) : (
            <>
              <IconCircleCheck className="h-3.5 w-3.5" />
              Mark as Repaid
            </>
          )}
        </button>
      </div>
    </div>
  </div>
  </ModalPortal>
);

// ─── Detail + Edit + Approve Modal ───────────────────────────────────────────

type ApproveForm = {
  approvedAmount: string;
  approvedMonthlyDeduction: string;
  startDeductionMonth: string;
  remarks: string;
};

const DetailModal: React.FC<{
  request: AdvanceRequest;
  onClose: () => void;
  onReject: () => void;
  onComplete: () => void;
  onSaved: (updated: AdvanceRequest) => void;
  statusLoading: boolean;
  readOnly?: boolean;
}> = ({ request, onClose, onReject, onComplete, onSaved, statusLoading, readOnly = false }) => {
  const user = useAppSelector(selectUser);
  const router = useRouter();
  const updateStatus = useUpdateAdvanceRequestStatus();
  const updateRequest = useUpdateAdvanceRequest();
  const { data: loanHistory, isLoading: loanLoading } = useLoanHistory(
    request.id,
    request.status === 'approved' && !!request.loanId
  );

  const today = new Date();
  const currentMonthValue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const [editing, setEditing] = useState(false);
  const [saveErr, setSaveErr] = useState('');
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ApproveForm, string>>>({});

  const toMonthStr = (d: string | null | undefined) => {
    if (!d) return '';
    return new Date(d).toISOString().slice(0, 7);
  };

  const [form, setForm] = useState<ApproveForm>({
    approvedAmount: String(request.approvedAmount ?? request.requestAmount),
    approvedMonthlyDeduction: String(request.approvedMonthlyDeduction ?? request.monthlyDeduction),
    startDeductionMonth: toMonthStr(request.startDeductionMonth),
    remarks: request.remarks ?? '',
  });

  const approvedAmt = Number(form.approvedAmount) || 0;
  const approvedDed = Number(form.approvedMonthlyDeduction) || 0;
  const priorOutstanding = request.priorOutstandingBalance ?? 0;
  const combinedTotal = approvedAmt + priorOutstanding;
  const previewMonths =
    combinedTotal > 0 && approvedDed > 0 ? Math.ceil(combinedTotal / approvedDed) : 0;

  const amountsChanged =
    approvedAmt !== request.requestAmount || approvedDed !== request.monthlyDeduction;

  const setF = <K extends keyof ApproveForm>(k: K, v: ApproveForm[K]) => {
    setForm((p) => ({ ...p, [k]: v }));
    setFormErrors((p) => ({ ...p, [k]: undefined }));
    setSaveErr('');
  };

  const validate = () => {
    const e: Partial<Record<keyof ApproveForm, string>> = {};
    if (approvedAmt <= 0) e.approvedAmount = 'Must be a positive amount';
    if (approvedDed <= 0) e.approvedMonthlyDeduction = 'Must be a positive amount';
    if (approvedDed > combinedTotal && combinedTotal > 0)
      e.approvedMonthlyDeduction = 'Cannot exceed combined loan total';
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSaveEdit = async () => {
    if (!validate()) return;
    try {
      const updated = await updateRequest.mutateAsync({
        id: request.id,
        data: {
          approvedAmount: approvedAmt,
          approvedMonthlyDeduction: approvedDed,
          approvedNoOfMonths: previewMonths || undefined,
          startDeductionMonth: form.startDeductionMonth
            ? (form.startDeductionMonth.length === 7 ? `${form.startDeductionMonth}-01` : form.startDeductionMonth)
            : undefined,
          remarks: form.remarks.trim() || undefined,
        },
        actAsTenantId: resolveActAsTenant(request.tenant, user?.tenantId),
      });
      onSaved(updated);
      setEditing(false);
    } catch (err) {
      setSaveErr(
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data
          ?.message ?? 'Save failed. Please try again.'
      );
    }
  };

  const handleApprove = async () => {
    if (!priorOutstanding) {
      // Fresh advance — deduction start month is required
      if (!form.startDeductionMonth || form.startDeductionMonth < currentMonthValue) {
        setFormErrors((p) => ({
          ...p,
          startDeductionMonth: !form.startDeductionMonth
            ? 'Deduction start month is required'
            : 'Must be current month or later',
        }));
        return;
      }
    }
    if (!validate()) return;
    try {
      await updateStatus.mutateAsync({
        id: request.id,
        data: {
          status: 'approved',
          approvedAmount: approvedAmt,
          approvedMonthlyDeduction: approvedDed,
          approvedNoOfMonths: previewMonths || undefined,
          remarks: form.remarks.trim() || undefined,
          ...(priorOutstanding
            ? {}
            : {
                startDeductionMonth: form.startDeductionMonth
                  ? (form.startDeductionMonth.length === 7 ? `${form.startDeductionMonth}-01` : form.startDeductionMonth)
                  : undefined,
              }),
        },
        actAsTenantId: resolveActAsTenant(request.tenant, user?.tenantId),
      });
      onClose();
    } catch (err) {
      setSaveErr(
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data
          ?.message ?? 'Approval failed. Please try again.'
      );
    }
  };

  const isActionLoading = statusLoading || updateStatus.isPending || updateRequest.isPending;

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Advance request details"
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
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <IconCurrencyRupee className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold leading-tight tracking-[-0.01em]">
                Advance Request
              </h2>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                {request.employeeName} · Submitted {fmtDate(request.requestDate)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {request.status === 'pending' && !editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-muted px-3 text-[11px] font-semibold text-foreground transition-colors hover:bg-muted-foreground/10"
              >
                <IconEdit className="h-3.5 w-3.5" />
                Edit Approved Amounts
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <IconX className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {saveErr && (
            <div className="flex items-start gap-2.5 rounded-xl border border-destructive/40 bg-destructive/5 px-3.5 py-3">
              <IconAlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <p className="text-[12px] font-medium text-destructive">{saveErr}</p>
            </div>
          )}

          {/* Employee card */}
          <div className="flex items-center gap-3.5 rounded-xl border border-border bg-muted/40 p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/12 text-[13px] font-bold text-primary">
              {initials(request.employeeName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-bold">{request.employeeName}</p>
              <p className="truncate text-[12px] text-muted-foreground">
                {[request.empCode || request.employeeId, request.department?.name].filter(Boolean).join(' · ')}
              </p>
              <div className="mt-1.5">
                <StatusPill status={request.status} />
              </div>
            </div>
            {request.loanId && (
              <div className="shrink-0 text-right">
                <p className="text-[10px] text-muted-foreground">Loan ID</p>
                <p className="text-[11px] font-mono font-semibold text-foreground">
                  {request.loanId.slice(0, 8)}…
                </p>
              </div>
            )}
          </div>

          {/* ── Amounts section ── */}
          {editing ? (
            <div className="space-y-4 rounded-xl border border-primary/20 bg-primary/3 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.05em] text-primary">
                Set Approved Amounts
              </p>

              {/* reference: prior loan + employee request */}
              {priorOutstanding > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                      Prior Remaining
                    </p>
                    <p className="text-[13px] font-bold tabular-nums">
                      {fmtCurrency(priorOutstanding)}
                      {request.priorLoanEmi ? ` · ${fmtCurrency(request.priorLoanEmi)}/mo` : ''}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                      Employee Requested
                    </p>
                    <p className="text-[13px] font-bold tabular-nums">
                      {fmtCurrency(request.requestAmount)} · {fmtCurrency(request.monthlyDeduction)}
                      /mo
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-border bg-muted/40 px-4 py-2.5">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                    Employee Requested
                  </p>
                  <p className="text-[13px] font-semibold tabular-nums">
                    {fmtCurrency(request.requestAmount)} · {fmtCurrency(request.monthlyDeduction)}
                    /mo · {request.noOfMonths} mo.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                    Approved Amount (₹) <span className="text-destructive">*</span>
                  </div>
                  <div className="relative">
                    <IconCurrencyRupee className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="number"
                      min="1"
                      value={form.approvedAmount}
                      onChange={(e) => setF('approvedAmount', e.target.value)}
                      className={cn(inputCls(!!formErrors.approvedAmount), 'pl-9')}
                    />
                  </div>
                  {formErrors.approvedAmount && (
                    <p className="mt-1 text-[11px] text-destructive">{formErrors.approvedAmount}</p>
                  )}
                </div>
                <div>
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                    Approved Monthly Ded. (₹) <span className="text-destructive">*</span>
                  </div>
                  <div className="relative">
                    <IconCurrencyRupee className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="number"
                      min="1"
                      value={form.approvedMonthlyDeduction}
                      onChange={(e) => setF('approvedMonthlyDeduction', e.target.value)}
                      className={cn(inputCls(!!formErrors.approvedMonthlyDeduction), 'pl-9')}
                    />
                  </div>
                  {formErrors.approvedMonthlyDeduction && (
                    <p className="mt-1 text-[11px] text-destructive">
                      {formErrors.approvedMonthlyDeduction}
                    </p>
                  )}
                </div>
              </div>

              {previewMonths > 0 && (
                <div className="space-y-2">
                  {priorOutstanding > 0 && (
                    <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-[12px] font-medium text-warning">
                      <IconCurrencyRupee className="h-3.5 w-3.5 shrink-0" />
                      New {fmtCurrency(approvedAmt)} + Prior outstanding{' '}
                      {fmtCurrency(priorOutstanding)} ={' '}
                      <strong>Combined {fmtCurrency(combinedTotal)}</strong>
                    </div>
                  )}
                  <div className="flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2.5">
                    <IconCurrencyRupee className="h-4 w-4 shrink-0 text-primary" />
                    <span className="text-[13px] font-semibold text-primary">
                      {fmtCurrency(approvedDed)} / month ×{' '}
                      <strong>
                        {previewMonths} month{previewMonths !== 1 ? 's' : ''}
                      </strong>{' '}
                      = {fmtCurrency(combinedTotal)}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                  Admin Remarks
                </div>
                <textarea
                  rows={2}
                  value={form.remarks}
                  onChange={(e) => setF('remarks', e.target.value)}
                  placeholder="Optional note for the employee…"
                  className="w-full resize-none rounded-lg border border-border bg-muted px-3 py-2.5 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
                />
              </div>
            </div>
          ) : priorOutstanding > 0 ? (
            /* ── Rollup read-only view ── */
            <div className="space-y-3">
              {/* 1. Prior loan table */}
              <div className="overflow-hidden rounded-xl border border-border">
                <div className="border-b border-border bg-muted/40 px-4 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.05em] text-muted-foreground">
                    Previous Loan (will be superseded)
                  </p>
                </div>
                <div className="grid grid-cols-3 divide-x divide-border">
                  {[
                    {
                      label: 'Original Amount',
                      value: request.priorLoanOriginalAmount
                        ? fmtCurrency(request.priorLoanOriginalAmount)
                        : '—',
                    },
                    { label: 'Remaining Balance', value: fmtCurrency(priorOutstanding) },
                    {
                      label: 'Monthly EMI',
                      value: request.priorLoanEmi ? fmtCurrency(request.priorLoanEmi) : '—',
                    },
                  ].map((col) => (
                    <div key={col.label} className="px-4 py-3 text-center">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                        {col.label}
                      </p>
                      <p className="mt-0.5 text-[14px] font-bold tabular-nums text-foreground">
                        {col.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. New request (requested vs admin-approved) */}
              <div className="overflow-hidden rounded-xl border border-warning/30">
                <div className="border-b border-warning/20 bg-warning/5 px-4 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.05em] text-warning/80">
                    New Advance Request
                  </p>
                </div>
                <div className="grid grid-cols-2 divide-x divide-border">
                  <div className="px-4 py-3 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                      Requested by Employee
                    </p>
                    <p className="mt-0.5 text-[14px] font-bold tabular-nums text-warning">
                      {fmtCurrency(request.requestAmount)}
                    </p>
                  </div>
                  <div className="px-4 py-3 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                      {request.approvedAmount != null ? 'Admin Approved' : 'Pending Review'}
                    </p>
                    <p className="mt-0.5 text-[14px] font-bold tabular-nums text-foreground">
                      {request.approvedAmount != null ? fmtCurrency(request.approvedAmount) : '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. Combined outcome */}
              {(request.approvedAmount != null || request.status === 'approved') && (
                <div className="overflow-hidden rounded-xl border border-success/30">
                  <div className="border-b border-success/20 bg-success/5 px-4 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.05em] text-success/80">
                      {request.status === 'approved'
                        ? 'New Combined Loan'
                        : 'Combined Loan (on approval)'}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 divide-x divide-border">
                    {[
                      {
                        label: 'Total Amount',
                        value: fmtCurrency(
                          (request.approvedAmount ?? request.requestAmount) + priorOutstanding
                        ),
                      },
                      {
                        label: 'New Monthly EMI',
                        value: fmtCurrency(
                          request.approvedMonthlyDeduction ?? request.monthlyDeduction
                        ),
                      },
                      {
                        label: 'Duration',
                        value: `${request.approvedNoOfMonths ?? request.noOfMonths} mo.`,
                      },
                    ].map((col) => (
                      <div key={col.label} className="px-4 py-3 text-center">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                          {col.label}
                        </p>
                        <p className="mt-0.5 text-[14px] font-bold tabular-nums text-success">
                          {col.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {request.status === 'pending' && request.approvedAmount == null && (
                <p className="text-center text-[11px] text-muted-foreground">
                  Click "Edit Approved Amounts" to set the approved new amount and new EMI.
                </p>
              )}
            </div>
          ) : (
            /* ── Fresh advance read-only view ── */
            <div className="space-y-3">
              <AmountRow
                label="Requested by Employee"
                amount={request.requestAmount}
                monthly={request.monthlyDeduction}
                months={request.noOfMonths}
                tone="warning"
              />
              {(request.approvedAmount != null || request.status === 'approved') && (
                <>
                  <div className="flex items-center justify-center">
                    <IconArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <AmountRow
                    label={
                      request.status === 'approved' ? 'Approved by HR/Admin' : 'Staged for Approval'
                    }
                    amount={request.approvedAmount ?? request.requestAmount}
                    monthly={request.approvedMonthlyDeduction ?? request.monthlyDeduction}
                    months={request.approvedNoOfMonths ?? request.noOfMonths}
                    tone="success"
                  />
                </>
              )}
              {request.status === 'pending' && request.approvedAmount == null && (
                <p className="text-center text-[11px] text-muted-foreground">
                  Click "Edit Approved Amounts" to modify before approving.
                </p>
              )}
            </div>
          )}

          {/* Deduction Start Month — not needed when rolling up an active loan */}
          {request.status === 'pending' ? (
            priorOutstanding > 0 ? (
              <div className="flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-3">
                <IconCurrencyRupee className="h-4 w-4 shrink-0 text-primary" />
                <p className="text-[12px] font-medium text-primary">
                  Deductions are already running on the existing loan — only the monthly EMI will be
                  updated. No new start month needed.
                </p>
              </div>
            ) : (
              <div>
                <label
                  htmlFor="deduction-start-month"
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground"
                >
                  Deduction Start Month <span className="text-destructive">*</span>
                </label>
                <input
                  id="deduction-start-month"
                  type="month"
                  min={currentMonthValue}
                  value={form.startDeductionMonth}
                  onChange={(e) => setF('startDeductionMonth', e.target.value)}
                  className={inputCls(!!formErrors.startDeductionMonth)}
                />
                {formErrors.startDeductionMonth && (
                  <p className="mt-1 text-[11px] text-destructive">
                    {formErrors.startDeductionMonth}
                  </p>
                )}
              </div>
            )
          ) : request.startDeductionMonth ? (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                Deduction Starts
              </p>
              <p className="rounded-xl bg-primary/5 px-3.5 py-3 text-[13px] text-primary">
                {fmtDate(request.startDeductionMonth)}
              </p>
            </div>
          ) : null}

          {/* Reason */}
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
              Employee's Reason
            </p>
            <p className="rounded-xl bg-muted/30 px-3.5 py-3 text-[13px]">{request.reason}</p>
          </div>

          {/* Approved date */}
          {request.approvedDate && (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                Approved On
              </p>
              <p className="rounded-xl bg-success/5 px-3.5 py-3 text-[13px] text-success">
                {fmtDate(request.approvedDate)}
              </p>
            </div>
          )}

          {/* Remarks */}
          {request.remarks && !editing && (
            <div>
              <div className="mb-1 flex items-center gap-1.5">
                <IconMessageCircle className="h-3 w-3 text-muted-foreground" />
                <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                  Admin Remarks
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

          {/* Recent Transactions Preview (approved only) */}
          {request.status === 'approved' && request.loanId && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <IconListDetails className="h-3 w-3 text-muted-foreground" />
                  <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                    Recent Deductions
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('main-scroll');
                    sessionStorage.setItem('advanceApprovalScroll', String(el?.scrollTop ?? 0));
                    onClose();
                    router.push(`/hr/advance/loan/${request.id}`);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                >
                  View all
                  <IconExternalLink className="h-3 w-3" />
                </button>
              </div>

              {loanLoading ? (
                <div className="flex h-10 items-center justify-center">
                  <IconLoader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : loanHistory?.deductions && loanHistory.deductions.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-border">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[420px]">
                      <thead>
                        <tr className="border-b border-border bg-muted/40">
                          {['Period', 'Scheduled', 'Deducted', 'Balance After'].map((h) => (
                            <th
                              key={h}
                              className="whitespace-nowrap px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {loanHistory.deductions.slice(-3).map((d) => (
                          <tr key={d.id} className="bg-card">
                            <td className="whitespace-nowrap px-3 py-2 text-[12px] font-medium">
                              {new Date(2000, d.month - 1).toLocaleString('en-IN', {
                                month: 'short',
                              })}{' '}
                              {d.year}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-[12px] tabular-nums text-muted-foreground">
                              {fmtCurrency(d.scheduledEmi)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-[12px] tabular-nums text-success">
                              {fmtCurrency(d.actualDeduction)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-[12px] tabular-nums font-semibold">
                              {fmtCurrency(d.balanceAfter)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {loanHistory.deductions.length > 3 && (
                    <div className="border-t border-border bg-muted/20 px-3 py-2 text-center text-[11px] text-muted-foreground">
                      +{loanHistory.deductions.length - 3} more transactions
                    </div>
                  )}
                </div>
              ) : (
                <p className="rounded-xl border border-border bg-muted/20 px-3.5 py-3 text-center text-[12px] text-muted-foreground">
                  No deductions recorded yet
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border bg-muted/30 px-6 py-4">
          {!readOnly && editing ? (
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setSaveErr('');
                  setFormErrors({});
                }}
                disabled={isActionLoading}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-muted px-4 text-[12px] font-semibold transition-colors hover:bg-muted-foreground/10 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isActionLoading}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-[12px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {updateRequest.isPending ? (
                  <>
                    <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <IconCheck className="h-3.5 w-3.5" />
                    Save Amounts
                  </>
                )}
              </button>
            </div>
          ) : !readOnly && request.status === 'pending' ? (
            <div className="space-y-2">
              {amountsChanged && request.approvedAmount != null && (
                <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2">
                  <IconAlertCircle className="h-3.5 w-3.5 shrink-0 text-warning" />
                  <p className="text-[11px] font-medium text-warning">
                    Approved amounts differ from the employee's request — they will see both
                    figures.
                  </p>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isActionLoading}
                  onClick={handleApprove}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-success px-4 text-[13px] font-semibold text-success-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {updateStatus.isPending ? (
                    <>
                      <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
                      Approving…
                    </>
                  ) : (
                    <>
                      <IconCheck className="h-3.5 w-3.5" strokeWidth={2.5} />
                      Approve
                    </>
                  )}
                </button>
                <button
                  type="button"
                  disabled={isActionLoading}
                  onClick={onReject}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-destructive px-4 text-[13px] font-semibold text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  <IconBan className="h-3.5 w-3.5" />
                  Reject
                </button>
              </div>
            </div>
          ) : request.status === 'approved' ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {!readOnly && (
                  <button
                    type="button"
                    onClick={onComplete}
                    className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-lg border border-success/40 bg-success/10 px-3 text-[12px] font-semibold text-success transition-colors hover:bg-success/20"
                  >
                    <IconCircleCheck className="h-3.5 w-3.5" />
                    Mark Repaid
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('main-scroll');
                    sessionStorage.setItem('advanceApprovalScroll', String(el?.scrollTop ?? 0));
                    onClose();
                    router.push(`/hr/advance/loan/${request.id}`);
                  }}
                  className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-lg border border-primary/30 bg-primary/10 px-3 text-[12px] font-semibold text-primary transition-colors hover:bg-primary/20"
                >
                  <IconListDetails className="h-3.5 w-3.5" />
                  Full History
                </button>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-lg bg-muted px-4 text-[12px] font-semibold transition-colors hover:bg-muted-foreground/10"
              >
                Close
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

// ─── Loan Tracker Row ─────────────────────────────────────────────────────────

const LoanTrackerRow = ({
  summary,
  onAction,
}: {
  summary: EmployeeLoanSummary;
  onAction: () => void;
}) => {
  const router = useRouter();
  const pct =
    summary.disbursedAmount > 0
      ? Math.round((summary.collected / summary.disbursedAmount) * 100)
      : 100;

  return (
    <tr className="transition-colors hover:bg-muted/40">
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onAction}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-muted px-2.5 text-[11px] font-semibold text-foreground transition-colors hover:bg-muted-foreground/10"
          >
            <IconEdit className="h-3 w-3" />
            View
          </button>
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('main-scroll');
              sessionStorage.setItem('advanceApprovalScroll', String(el?.scrollTop ?? 0));
              router.push(`/hr/advance/loan/${summary.advanceId}`);
            }}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2.5 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/20"
          >
            <IconListDetails className="h-3 w-3" />
            History
          </button>
        </div>
      </td>
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
            {initials(summary.employeeName)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold">{summary.employeeName}</p>
            <p className="text-[11px] text-muted-foreground">
              {[summary.empCode || summary.employeeId, summary.department].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
      </td>
      <td className="px-5 py-3.5 whitespace-nowrap">
        <span className="text-[13px] font-bold tabular-nums text-foreground">
          {fmtCurrency(summary.disbursedAmount)}
        </span>
      </td>
      <td className="px-5 py-3.5 whitespace-nowrap">
        <span className="text-[13px] font-bold tabular-nums text-success">
          {fmtCurrency(summary.collected)}
        </span>
      </td>
      <td className="px-5 py-3.5 whitespace-nowrap">
        <span
          className={cn(
            'text-[13px] font-bold tabular-nums',
            summary.outstandingBalance > 0 ? 'text-warning' : 'text-muted-foreground'
          )}
        >
          {fmtCurrency(summary.outstandingBalance)}
        </span>
      </td>
      <td className="px-5 py-3.5 whitespace-nowrap text-[12px] tabular-nums text-muted-foreground">
        {fmtCurrency(summary.monthlyEmi)}
      </td>
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                pct >= 100 ? 'bg-success' : pct >= 60 ? 'bg-primary' : 'bg-warning'
              )}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
            {pct}%
          </span>
        </div>
      </td>
      <td className="px-5 py-3.5">
        <LoanStatusPill status={summary.loanStatus} />
      </td>
      <td className="px-5 py-3.5 text-[12px] text-muted-foreground">
        {summary.approvedDate ? fmtDate(summary.approvedDate) : '—'}
      </td>
      <td className="px-5 py-3.5 text-[12px] text-muted-foreground whitespace-nowrap">
        {fmtDt(summary.createdAt)}
      </td>
      <td className="px-5 py-3.5 text-[12px] text-muted-foreground whitespace-nowrap">
        {fmtDt(summary.tatPlannedAt)}
      </td>
      <td className="px-5 py-3.5 text-[12px] text-muted-foreground whitespace-nowrap">
        {fmtDt(summary.processedAt)}
        {summary.processedAt && summary.processedBy?.name && (
          <div className="text-[10px] text-muted-foreground/70">by {summary.processedBy.name}</div>
        )}
      </td>
      <td className="px-5 py-3.5">
        <DelayBadge delayMinutes={summary.tatDelayMinutes} />
      </td>
    </tr>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = 'pending' | 'loans';

const MainAdvanceApproval = () => {
  // Guards the "New Request" button (opens ApplyAdvanceModal, a create
  // flow — out of scope for this pilot's company-picker work, so it stays
  // blocked in "All Companies" mode exactly as before).
  const requireCompanySelected = useRequireCompanySelected();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Employee view data
  const user = useAppSelector(selectUser);
  const roleUpper = String(user?.role || '').toUpperCase().replace(/[^A-Z]/g, '');
  const isAdmin =
    roleUpper.includes('ADMIN') ||
    roleUpper.includes('SUPER') ||
    roleUpper.includes('HR') ||
    user?.role === Role.ADMIN ||
    user?.role === Role.SUPERADMIN ||
    (user as any)?.administrate === true ||
    !user?.employeeId;

  const employeeId = user?.employeeId ?? '';
  const employeeName =
    user?.fullName || (typeof user?.name === 'string' ? user.name : user?.email) || '';
  const employeeDeptId =
    (typeof user?.departmentId === 'string' ? user.departmentId : undefined) ??
    user?.department?.id ??
    '';
  const employeeDeptName =
    user?.department?.name ?? user?.userDepartments?.[0]?.department?.name ?? '';
  const canCreateAdvance = isAdmin || !!employeeId;
  const [applying, setApplying] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const {
    data: allRequests,
    isLoading: adminLoading,
    isError: adminError,
    refetch: adminRefetch,
  } = useAdvanceRequests({ enabled: isAdmin });
  const {
    data: myRequests,
    isLoading: myLoading,
    isError: myError,
    refetch: myRefetch,
  } = useAdvanceRequestsByEmployee(employeeId);
  const requests = isAdmin ? allRequests : myRequests;
  const isLoading = !hydrated || (isAdmin ? adminLoading : myLoading);
  const isError = isAdmin ? adminError : myError;
  const refetch = isAdmin ? adminRefetch : myRefetch;

  const { data: dashStats, isLoading: statsLoading } = useAdvanceDashboardStats();
  const updateStatus = useUpdateAdvanceRequestStatus();
  const markComplete = useMarkAdvanceComplete();

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem('advanceApprovalScroll');
    if (saved) {
      const y = parseInt(saved, 10);
      sessionStorage.removeItem('advanceApprovalScroll');
      requestAnimationFrame(() => {
        const el = document.getElementById('main-scroll');
        if (el) el.scrollTop = y;
      });
    }
  }, []);

  const activeTab = (searchParams.get('tab') as Tab | null) ?? 'pending';
  const setActiveTab = (tab: Tab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const [search, setSearch] = useState('');
  const [loanSearch, setLoanSearch] = useState('');
  const [loanStatusFilter, setLoanStatusFilter] = useState('');
  const [detailFor, setDetailFor] = useState<AdvanceRequest | null>(null);
  const [rejectFor, setRejectFor] = useState<AdvanceRequest | null>(null);
  const [completeFor, setCompleteFor] = useState<AdvanceRequest | null>(null);

  const stats = useMemo(() => {
    const all = Array.isArray(requests) ? requests : [];
    return {
      total: all.length,
      pending: all.filter((r) => r.status === 'pending').length,
      approved: all.filter((r) => r.status === 'approved').length,
      rejected: all.filter((r) => r.status === 'rejected').length,
    };
  }, [requests]);

  const displayStats = useMemo(() => {
    const defaultStats = {
      totalDisbursed: 0,
      totalOutstanding: 0,
      totalCollected: 0,
      recoveryRate: 0,
      activeLoanCount: 0,
      paidLoanCount: 0,
      totalApprovedCount: 0,
      departmentBreakdown: [] as { name: string; count: number; amount: number }[],
      monthlyTrend: [] as { label: string; disbursed: number; count: number }[],
      employeeSummary: [] as EmployeeLoanSummary[],
    };

    if (!dashStats) return defaultStats;
    const summary = Array.isArray(dashStats.employeeSummary) ? dashStats.employeeSummary : [];
    if (isAdmin) {
      return {
        ...dashStats,
        totalDisbursed: Number(dashStats.totalDisbursed) || 0,
        totalOutstanding: Number(dashStats.totalOutstanding) || 0,
        totalCollected: Number(dashStats.totalCollected) || 0,
        recoveryRate: Number(dashStats.recoveryRate) || 0,
        activeLoanCount: Number(dashStats.activeLoanCount) || 0,
        paidLoanCount: Number(dashStats.paidLoanCount) || 0,
        totalApprovedCount: Number(dashStats.totalApprovedCount) || 0,
        departmentBreakdown: Array.isArray(dashStats.departmentBreakdown)
          ? dashStats.departmentBreakdown
          : [],
        monthlyTrend: Array.isArray(dashStats.monthlyTrend) ? dashStats.monthlyTrend : [],
        employeeSummary: summary,
      };
    }
    const mine = summary.filter(
      (s) => s.employeeId === employeeId && s.loanStatus !== 'superseded'
    );
    const totalDisbursed = mine.reduce((s, l) => s + (Number(l.disbursedAmount) || 0), 0);
    const totalOutstanding = mine.reduce((s, l) => s + (Number(l.outstandingBalance) || 0), 0);
    const totalCollected = mine.reduce((s, l) => s + (Number(l.collected) || 0), 0);
    const recoveryRate =
      totalDisbursed > 0 ? Math.round((totalCollected / totalDisbursed) * 1000) / 10 : 0;
    const activeLoanCount = mine.filter((l) => l.loanStatus === 'active').length;
    const paidLoanCount = mine.filter((l) => l.loanStatus === 'paid' || l.loanStatus === 'settled').length;
    return {
      ...dashStats,
      totalDisbursed,
      totalOutstanding,
      totalCollected,
      recoveryRate,
      activeLoanCount,
      paidLoanCount,
      totalApprovedCount: mine.length,
      employeeSummary: mine,
      departmentBreakdown: [] as { name: string; count: number; amount: number }[],
      monthlyTrend: Array.isArray(dashStats.monthlyTrend) ? dashStats.monthlyTrend : [],
    };
  }, [dashStats, isAdmin, employeeId]);

  const filtered = useMemo(() => {
    if (!Array.isArray(requests)) return [];
    const term = search.toLowerCase().trim();
    return requests.filter((r) => {
      if (r.status !== 'pending') return false;
      return (
        !term ||
        r.employeeName?.toLowerCase().includes(term) ||
        r.employeeId?.toLowerCase().includes(term)
      );
    });
  }, [requests, search]);

  const filteredLoans = useMemo(() => {
    if (!Array.isArray(displayStats?.employeeSummary)) return [];
    const term = loanSearch.toLowerCase().trim();
    return displayStats.employeeSummary.filter((s) => {
      if (s.loanStatus === 'superseded') return false;
      const matchSearch =
        !term ||
        s.employeeName?.toLowerCase().includes(term) ||
        s.employeeId?.toLowerCase().includes(term);
      const matchStatus = !loanStatusFilter || s.loanStatus === loanStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [displayStats, loanSearch, loanStatusFilter]);

  const handleReject = async (req: AdvanceRequest, reason: string) => {
    await updateStatus.mutateAsync({
      id: req.id,
      data: { status: 'rejected', remarks: reason },
      actAsTenantId: resolveActAsTenant(req.tenant, user?.tenantId),
    });
    setRejectFor(null);
    setDetailFor(null);
  };

  const handleMarkComplete = async () => {
    if (!completeFor) return;
    await markComplete.mutateAsync({
      id: completeFor.id,
      actAsTenantId: resolveActAsTenant(completeFor.tenant, user?.tenantId),
    });
    setCompleteFor(null);
    setDetailFor(null);
  };

  const openDetailForLoan = (summary: EmployeeLoanSummary) => {
    const req = requests?.find((r) => r.id === summary.advanceId);
    if (req) setDetailFor(req);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <IconLoader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-[13px]">Loading advance requests…</p>
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
            Couldn't load advance requests
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

  return (
    <div className="bg-background text-foreground grow">
      <div className="mx-auto max-w-350 space-y-5 px-4 pt-6 pb-10 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-0.5 text-[11px] sm:text-[12px] text-muted-foreground">HR Management</p>
            <h1 className="text-[18px] sm:text-[22px] font-bold leading-tight tracking-[-0.03em]">
              Advance
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (!requireCompanySelected()) return;
                setApplying(true);
              }}
              disabled={!canCreateAdvance}
              title="Request Advance"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60 cursor-pointer"
            >
              <IconPlus className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* ── Financial Dashboard ── */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <div className="border-b border-border px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <IconTrendingUp className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-[14px] font-semibold">Financial Overview</h2>
                <p className="text-[11px] text-muted-foreground">
                  {isAdmin
                    ? 'Advance disbursement & recovery summary'
                    : 'Your advance & repayment summary'}
                </p>
              </div>
            </div>
          </div>

          {statsLoading ? (
            <div className="flex h-32 items-center justify-center">
              <IconLoader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : displayStats ? (
            <div className="p-5">
              {/* 4 financial metric cards */}
              <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  {
                    label: isAdmin ? 'Total Disbursed' : 'Total Borrowed',
                    value: fmtCurrency(displayStats.totalDisbursed),
                    sub: isAdmin
                      ? `${displayStats.totalApprovedCount ?? 0} approval${displayStats.totalApprovedCount === 1 ? '' : 's'}`
                      : `${displayStats.totalApprovedCount ?? 0} advance(s)`,
                    tint: 'bg-primary/10 text-primary',
                    Icon: IconCurrencyRupee,
                  },
                  {
                    label: isAdmin ? 'Total Collected' : 'Amount Repaid',
                    value: fmtCurrency(displayStats.totalCollected),
                    sub: isAdmin ? 'Amount recovered' : 'Paid back so far',
                    tint: 'bg-success/10 text-success',
                    Icon: IconCheck,
                  },
                  {
                    label: isAdmin ? 'Outstanding' : 'Remaining Balance',
                    value: fmtCurrency(displayStats.totalOutstanding),
                    sub: isAdmin
                      ? `${displayStats.activeLoanCount ?? 0} active loan${displayStats.activeLoanCount === 1 ? '' : 's'}`
                      : `${displayStats.activeLoanCount ?? 0} active loan(s)`,
                    tint: 'bg-warning/10 text-warning',
                    Icon: IconClock,
                  },
                  {
                    label: isAdmin ? 'Recovery Rate' : 'Repaid',
                    value: `${(displayStats.recoveryRate ?? 0).toFixed((displayStats.recoveryRate ?? 0) % 1 !== 0 ? 1 : 0)}%`,
                    sub: isAdmin
                      ? `${displayStats.paidLoanCount ?? 0} fully paid`
                      : `${displayStats.paidLoanCount ?? 0} fully repaid`,
                    tint: 'bg-success/10 text-success',
                    Icon: IconTrendingUp,
                  },
                ].map((card) => (
                  <div key={card.label} className="rounded-xl border border-border bg-muted/30 p-4">
                    <div
                      className={cn(
                        'mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg',
                        card.tint
                      )}
                    >
                      <card.Icon className="h-4 w-4" />
                    </div>
                    <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                      {card.label}
                    </p>
                    <p className="text-[17px] sm:text-[20px] font-bold leading-none tracking-[-0.02em] tabular-nums whitespace-nowrap">
                      {card.value}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{card.sub}</p>
                  </div>
                ))}
              </div>

              {/* Recovery progress bar */}
              <div className="mb-5 rounded-xl border border-border bg-muted/20 px-4 py-3.5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {isAdmin ? 'Overall Recovery Progress' : 'Repayment Progress'}
                  </span>
                  <span className="text-[12px] font-bold tabular-nums">
                    {(displayStats.recoveryRate ?? 0).toFixed((displayStats.recoveryRate ?? 0) % 1 !== 0 ? 1 : 0)}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-success transition-all duration-500"
                    style={{ width: `${Math.min(displayStats.recoveryRate ?? 0, 100)}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
                  <span>
                    {fmtCurrency(displayStats.totalCollected)} {isAdmin ? 'collected' : 'repaid'}
                  </span>
                  <span>{fmtCurrency(displayStats.totalOutstanding)} remaining</span>
                </div>
              </div>

              {/* Bottom row: chart + dept breakdown (admin-only analytics) */}
              {isAdmin && dashStats && (
                <div className="grid gap-4 lg:grid-cols-2">
                  {/* Monthly trend */}
                  <div className="rounded-xl border border-border bg-muted/20 p-4">
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                      Monthly Disbursements (6 mo.)
                    </p>
                    <MiniBarChart data={Array.isArray(dashStats.monthlyTrend) ? dashStats.monthlyTrend : []} />
                  </div>

                  {/* Department breakdown */}
                  {Array.isArray(dashStats.departmentBreakdown) && dashStats.departmentBreakdown.length > 0 && (
                    <div className="rounded-xl border border-border bg-muted/20 p-4">
                      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                        By Department
                      </p>
                      <div className="space-y-2">
                        {dashStats.departmentBreakdown.slice(0, 5).map((dept) => {
                          const pct =
                            dashStats.totalDisbursed > 0
                              ? Math.round((dept.amount / dashStats.totalDisbursed) * 100)
                              : 0;
                          return (
                            <div key={dept.name} className="flex items-center gap-3">
                              <span className="w-28 shrink-0 truncate text-[12px] font-medium">
                                {dept.name}
                              </span>
                              <div className="flex flex-1 items-center gap-2">
                                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                                  <div
                                    className="h-full rounded-full bg-primary/60"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="w-10 shrink-0 whitespace-nowrap text-right text-[11px] tabular-nums text-muted-foreground">
                                  {pct}%
                                </span>
                              </div>
                              <span className="w-20 shrink-0 whitespace-nowrap text-right text-[11px] font-semibold tabular-nums text-foreground">
                                {fmtCurrency(dept.amount)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 rounded-xl border border-border bg-muted/40 p-1">
          {(
            [
              { key: 'pending', label: 'Pending Requests', Icon: IconClock },
              { key: 'loans', label: 'Loan Tracker', Icon: IconUsers },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold transition-colors',
                activeTab === tab.key
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <tab.Icon className="h-4 w-4" />
              {tab.label}
              {tab.key === 'pending' && stats.pending > 0 && (
                <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-warning px-1 text-[10px] font-bold text-warning-foreground">
                  {stats.pending}
                </span>
              )}
              {tab.key === 'loans' && (displayStats?.activeLoanCount ?? 0) > 0 && (
                <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {displayStats?.activeLoanCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Pending Requests Tab ── */}
        {activeTab === 'pending' && (
          <>
            {/* Search */}
            <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs sm:px-5">
              <div className="relative">
                <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by employee name or ID…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-muted pl-10 pr-3 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
              <div className="border-b border-border px-5 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning">
                      <IconClock className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-[14px] font-semibold">Pending Requests</h2>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {filtered.length} of {stats.pending} pending
                      </p>
                    </div>
                  </div>
                  {stats.pending > 0 && (
                    <span className="inline-flex w-fit items-center gap-1 whitespace-nowrap rounded-full bg-warning/10 px-2.5 py-1 text-[11px] font-semibold text-warning">
                      <IconClock className="h-3 w-3" />
                      {stats.pending} awaiting review
                    </span>
                  )}
                </div>
              </div>

              {filtered.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px]">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        {[
                          'Action',
                          'Employee',
                          'Requested Amt',
                          'Staged Amt',
                          'Monthly Ded.',
                          'Months',
                          'Created At',
                          'Planned At',
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filtered.map((req) => {
                        const hasStaged =
                          req.approvedAmount != null &&
                          (req.approvedAmount !== req.requestAmount ||
                            req.approvedMonthlyDeduction !== req.monthlyDeduction);
                        return (
                          <tr key={req.id} className="transition-colors hover:bg-muted/40">
                            <td className="px-5 py-3.5">
                              <button
                                type="button"
                                onClick={() => setDetailFor(req)}
                                className={cn(
                                  'inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-[11px] font-semibold transition-colors',
                                  isAdmin
                                    ? 'border-warning/40 bg-warning/10 text-warning hover:bg-warning/20'
                                    : 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20'
                                )}
                              >
                                {isAdmin ? (
                                  <>
                                    <IconEdit className="h-3 w-3" />
                                    Review
                                  </>
                                ) : (
                                  <>
                                    <IconListDetails className="h-3 w-3" />
                                    View
                                  </>
                                )}
                              </button>
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                                  {initials(req.employeeName)}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-[13px] font-semibold">
                                    {req.employeeName}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground">
                                    {[req.empCode || req.employeeId, req.department?.name].filter(Boolean).join(' · ')}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <span className="text-[13px] font-bold tabular-nums text-warning">
                                {fmtCurrency(req.requestAmount)}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              {req.approvedAmount != null ? (
                                <span className="text-[13px] font-bold tabular-nums text-success">
                                  {fmtCurrency(req.approvedAmount)}
                                  {hasStaged && (
                                    <span className="ml-1.5 inline-flex items-center rounded-full bg-success/10 px-1.5 py-0.5 text-[9px] font-bold text-success">
                                      STAGED
                                    </span>
                                  )}
                                </span>
                              ) : (
                                <span className="text-[12px] text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap text-[12px] tabular-nums text-muted-foreground">
                              {fmtCurrency(req.approvedMonthlyDeduction ?? req.monthlyDeduction)}
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <span className="text-[13px] font-bold tabular-nums">
                                {req.approvedNoOfMonths ?? req.noOfMonths}
                              </span>
                              <span className="ml-1 text-[11px] text-muted-foreground">mo.</span>
                            </td>
                            <td className="px-5 py-3.5 text-[12px] text-muted-foreground whitespace-nowrap">
                              {fmtDt(req.createdAt)}
                            </td>
                            <td className="px-5 py-3.5 text-[12px] text-muted-foreground whitespace-nowrap">
                              {req.yourProjectedPlannedAt ? (
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
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-warning/10 text-warning">
                    <IconClock className="h-6 w-6" />
                  </div>
                  <p className="text-[14px] font-semibold">No pending requests</p>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    {search ? 'Try adjusting your search.' : 'All requests have been reviewed.'}
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Loan Tracker Tab ── */}
        {activeTab === 'loans' && (
          <>
            {/* Filters */}
            <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs sm:px-5">
              <div className="flex flex-col gap-2.5 md:flex-row md:items-center">
                <div className="relative flex-1">
                  <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by employee name or ID…"
                    value={loanSearch}
                    onChange={(e) => setLoanSearch(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-muted pl-10 pr-3 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
                  />
                </div>
                <select
                  value={loanStatusFilter}
                  onChange={(e) => setLoanStatusFilter(e.target.value)}
                  className="h-10 cursor-pointer rounded-lg border border-border bg-muted px-3 pr-8 text-[13px] font-medium text-foreground outline-none transition-colors focus:border-primary md:min-w-36"
                >
                  <option value="">All Loans</option>
                  <option value="active">Active</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
            </div>

            {/* Loan table */}
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
              <div className="border-b border-border px-5 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <IconUsers className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-[14px] font-semibold">Repayment Tracker</h2>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {filteredLoans.length} of {displayStats?.employeeSummary?.length ?? 0} loans
                        shown
                      </p>
                    </div>
                  </div>
                  {(displayStats?.activeLoanCount ?? 0) > 0 && (
                    <span className="inline-flex w-fit items-center gap-1 whitespace-nowrap rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                      <IconClock className="h-3 w-3" />
                      {displayStats?.activeLoanCount} active
                    </span>
                  )}
                </div>
              </div>

              {statsLoading ? (
                <div className="flex h-32 items-center justify-center">
                  <IconLoader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : filteredLoans.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1080px]">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        {[
                          'Action',
                          'Employee',
                          'Disbursed',
                          'Collected',
                          'Outstanding',
                          'Monthly EMI',
                          'Recovery',
                          'Status',
                          'Approved On',
                          'Created At',
                          'Planned At',
                          'Processed At',
                          'Delay',
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredLoans.map((summary) => (
                        <LoanTrackerRow
                          key={summary.advanceId}
                          summary={summary}
                          onAction={() => openDetailForLoan(summary)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <IconUsers className="h-6 w-6" />
                  </div>
                  <p className="text-[14px] font-semibold">No loans found</p>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    {loanSearch || loanStatusFilter
                      ? 'Try adjusting your search or filter.'
                      : 'No approved advances yet.'}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Employee Modals */}
      {applying && (
        <ApplyAdvanceModal
          employeeId={employeeId}
          employeeName={employeeName}
          employeeDeptId={employeeDeptId}
          employeeDeptName={employeeDeptName}
          isAdmin={isAdmin}
          onClose={() => setApplying(false)}
        />
      )}
      {/* Modals */}
      {detailFor && (
        <DetailModal
          request={detailFor}
          statusLoading={updateStatus.isPending}
          onClose={() => setDetailFor(null)}
          onReject={() => setRejectFor(detailFor)}
          onComplete={() => setCompleteFor(detailFor)}
          onSaved={(updated) => setDetailFor(updated)}
          readOnly={!isAdmin}
        />
      )}

      {rejectFor && (
        <RejectModal
          request={rejectFor}
          loading={updateStatus.isPending}
          onClose={() => setRejectFor(null)}
          onConfirm={(reason) => handleReject(rejectFor, reason)}
        />
      )}

      {completeFor && (
        <CompleteModal
          request={completeFor}
          loading={markComplete.isPending}
          onClose={() => setCompleteFor(null)}
          onConfirm={handleMarkComplete}
        />
      )}
    </div>
  );
};

export default MainAdvanceApproval;
