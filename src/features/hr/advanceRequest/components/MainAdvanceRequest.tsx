'use client';

import {
  IconAlertCircle,
  IconArrowRight,
  IconBan,
  IconBell,
  IconCheck,
  IconClock,
  IconCurrencyRupee,
  IconEye,
  IconHistory,
  IconLoader2,
  IconMessageCircle,
  IconPlus,
  IconSend,
  IconWorld,
  IconX,
} from '@tabler/icons-react';
import type React from 'react';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { useAppSelector } from '@/store/hook';
import { selectUser } from '@/store/slice/userAccountData';
import {
  useAdvanceRequestsByEmployee,
  useLoanHistory,
  useSubmitAdvanceRequest,
} from '../server/tanstackQuery/useAdvanceRequestQueries';
import type { AdvanceRequest, AdvanceRequestStatus, SubmitAdvanceRequestDto } from '../types/types';
import { ModalPortal } from '@/features/hr/_shared/components';

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

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);

const MONTHS = [
  '',
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const inputCls = (err?: string) =>
  cn(
    'h-10 w-full rounded-lg border bg-muted px-3 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground',
    err ? 'border-destructive/40 focus:border-destructive' : 'border-border focus:border-primary'
  );

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

// ─── Apply Advance Request Modal ────────────────────────────────────────────

type FormState = {
  requestAmount: string;
  monthlyDeduction: string;
  reason: string;
  departmentId: string;
};

const INITIAL_FORM: FormState = {
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
  hasActiveAdvance: boolean;
  onClose: () => void;
}> = ({
  employeeId,
  employeeName,
  employeeDeptId,
  employeeDeptName,
  hasActiveAdvance,
  onClose,
}) => {
  const submit = useSubmitAdvanceRequest();
  const [form, setForm] = useState<FormState>({ ...INITIAL_FORM, departmentId: employeeDeptId });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitted, setSubmitted] = useState(false);

  const requestAmt = Number(form.requestAmount) || 0;
  const monthlyDed = Number(form.monthlyDeduction) || 0;
  const noOfMonths = requestAmt > 0 && monthlyDed > 0 ? Math.ceil(requestAmt / monthlyDed) : 0;

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormState, string>> = {};
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
    if (!validate()) return;
    const payload: SubmitAdvanceRequestDto = {
      employeeId,
      employeeName,
      departmentId: form.departmentId || undefined,
      requestAmount: requestAmt,
      monthlyDeduction: monthlyDed,
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
        {/* Header */}
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
            {((submit.data as { priorOutstandingBalance?: number })?.priorOutstandingBalance ?? 0) >
              0 && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-left text-[12px] text-warning">
                <IconAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Your existing outstanding balance of{' '}
                  <strong>
                    {fmtCurrency(
                      (submit.data as { priorOutstandingBalance?: number })
                        .priorOutstandingBalance ?? 0
                    )}
                  </strong>{' '}
                  will be combined with this request during approval.
                </span>
              </div>
            )}
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

              {/* Rollup notice — shown when employee already has an active advance */}
              {hasActiveAdvance && (
                <div className="flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning/5 px-3.5 py-3">
                  <IconAlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                  <p className="text-[12px] font-medium text-warning">
                    You have an existing active advance. The outstanding balance will be combined
                    with this new request when HR approves it.
                  </p>
                </div>
              )}

              {/* Auto-filled employee info */}
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

              {/* Amount fields */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Request Amount (₹)" required error={errors.requestAmount}>
                  <div className="relative">
                    <IconCurrencyRupee className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="number"
                      min="1"
                      value={form.requestAmount}
                      onChange={(e) => set('requestAmount', e.target.value)}
                      placeholder="e.g. 50000"
                      className={cn(inputCls(errors.requestAmount), 'pl-9')}
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
                      onChange={(e) => set('monthlyDeduction', e.target.value)}
                      placeholder="e.g. 5000"
                      className={cn(inputCls(errors.monthlyDeduction), 'pl-9')}
                    />
                  </div>
                </Field>
              </div>

              {/* Auto-calculated months preview */}
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

              {/* Reason */}
              <Field label="Reason for Advance" required error={errors.reason}>
                <textarea
                  rows={4}
                  value={form.reason}
                  onChange={(e) => set('reason', e.target.value)}
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

// ─── Reusable amount block ────────────────────────────────────────────────

const AmountBlock = ({
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
  const styles = {
    default: {
      wrap: 'bg-muted/30 border-border',
      title: 'text-muted-foreground',
      val: 'text-foreground',
    },
    warning: {
      wrap: 'bg-warning/5 border-warning/20',
      title: 'text-warning/80',
      val: 'text-warning',
    },
    success: {
      wrap: 'bg-success/5 border-success/20',
      title: 'text-success/80',
      val: 'text-success',
    },
  };
  const s = styles[tone];
  return (
    <div className={cn('rounded-xl border p-3.5', s.wrap)}>
      <p className={cn('mb-2 text-[10px] font-bold uppercase tracking-[0.05em]', s.title)}>
        {label}
      </p>
      <div className="grid grid-cols-3 divide-x divide-border/60">
        {[
          { l: 'Amount', v: fmtCurrency(amount) },
          { l: 'Monthly', v: fmtCurrency(monthly) },
          { l: 'Months', v: `${months} mo.` },
        ].map((item) => (
          <div key={item.l} className="px-3 text-center first:pl-0 last:pr-0">
            <p className={cn('text-[10px] font-semibold uppercase tracking-[0.04em]', s.title)}>
              {item.l}
            </p>
            <p className={cn('mt-0.5 text-[13px] font-bold tabular-nums', s.val)}>{item.v}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Detail Modal ─────────────────────────────────────────────────────────

const DetailModal: React.FC<{
  request: AdvanceRequest;
  onClose: () => void;
}> = ({ request, onClose }) => {
  const { data: loanHistory, isLoading: loanLoading } = useLoanHistory(
    request.id,
    request.status === 'approved' && !!request.loanId
  );

  const hasApproved = request.approvedAmount != null;
  const amountsModified =
    hasApproved &&
    (request.approvedAmount !== request.requestAmount ||
      request.approvedMonthlyDeduction !== request.monthlyDeduction);

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
              <IconCurrencyRupee className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold leading-tight tracking-[-0.01em]">
                Advance Request Details
              </h2>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                Submitted {fmtDate(request.requestDate)}
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
          <StatusPill status={request.status} />

          {/* Amount comparison */}
          <div className="space-y-2">
            <AmountBlock
              label="Your Request"
              amount={request.requestAmount}
              monthly={request.monthlyDeduction}
              months={request.noOfMonths}
              tone="warning"
            />

            {hasApproved && (
              <>
                <div className="flex items-center justify-center gap-2">
                  <IconArrowRight className="h-4 w-4 text-muted-foreground" />
                  {amountsModified && (
                    <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">
                      MODIFIED BY HR
                    </span>
                  )}
                </div>
                <AmountBlock
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
          </div>

          {request.department && (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                Department
              </p>
              <p className="rounded-xl bg-muted/30 px-3.5 py-3 text-[13px]">
                {request.department.name}
              </p>
            </div>
          )}

          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
              Reason
            </p>
            <p className="rounded-xl bg-muted/30 px-3.5 py-3 text-[13px]">{request.reason}</p>
          </div>

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

          {request.startDeductionMonth && (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                Deduction Starts
              </p>
              <p className="rounded-xl bg-primary/5 px-3.5 py-3 text-[13px] text-primary">
                {fmtDate(request.startDeductionMonth)}
              </p>
            </div>
          )}

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

          {/* Loan Deduction History */}
          {request.status === 'approved' && request.loanId && (
            <div>
              <div className="mb-2 flex items-center gap-1.5">
                <IconHistory className="h-3.5 w-3.5 text-primary" />
                <p className="text-[11px] font-bold uppercase tracking-[0.05em] text-primary">
                  Monthly Deduction History
                </p>
              </div>

              {loanLoading ? (
                <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-4 py-3">
                  <IconLoader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-[12px] text-muted-foreground">Loading history…</span>
                </div>
              ) : loanHistory ? (
                <div className="overflow-hidden rounded-xl border border-border">
                  {/* Loan summary bar */}
                  <div className="grid grid-cols-3 divide-x divide-border border-b border-border bg-muted/40 px-4 py-2.5">
                    {[
                      { label: 'Total Advance', value: fmtCurrency(loanHistory.amount) },
                      { label: 'EMI / Month', value: fmtCurrency(loanHistory.emiAmount) },
                      {
                        label: 'Outstanding',
                        value: fmtCurrency(loanHistory.outstandingBalance),
                        danger: loanHistory.outstandingBalance > 0,
                      },
                    ].map((item) => (
                      <div key={item.label} className="px-3 text-center first:pl-0 last:pr-0">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                          {item.label}
                        </p>
                        <p
                          className={cn(
                            'mt-0.5 text-[12px] font-bold tabular-nums',
                            item.danger ? 'text-warning' : 'text-foreground'
                          )}
                        >
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {loanHistory.deductions.length === 0 ? (
                    <div className="flex items-center gap-2 px-4 py-4 text-[12px] text-muted-foreground">
                      <IconClock className="h-4 w-4 shrink-0" />
                      No deductions processed yet. First deduction starts from{' '}
                      {request.startDeductionMonth ? fmtDate(request.startDeductionMonth) : '—'}.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[560px] text-[11px]">
                        <thead>
                          <tr className="border-b border-border bg-muted/20">
                            {['Month', 'Deducted', 'Balance Before', 'Balance After', 'Status'].map(
                              (h) => (
                                <th
                                  key={h}
                                  className="whitespace-nowrap px-3 py-2 text-left font-semibold uppercase tracking-[0.04em] text-muted-foreground"
                                >
                                  {h}
                                </th>
                              )
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {loanHistory.deductions.map((d) => {
                            const isPartial = d.actualDeduction < d.scheduledEmi;
                            return (
                              <tr key={d.id} className="hover:bg-muted/20">
                                <td className="whitespace-nowrap px-3 py-2.5 font-medium">
                                  {MONTHS[d.month]} {d.year}
                                </td>
                                <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-destructive font-semibold">
                                  −{fmtCurrency(d.actualDeduction)}
                                  {isPartial && (
                                    <span className="ml-1.5 rounded bg-warning/10 px-1 py-0.5 text-[9px] font-bold text-warning">
                                      PARTIAL
                                    </span>
                                  )}
                                </td>
                                <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-muted-foreground">
                                  {fmtCurrency(d.balanceBefore)}
                                </td>
                                <td className="whitespace-nowrap px-3 py-2.5 tabular-nums font-medium">
                                  {d.balanceAfter === 0 ? (
                                    <span className="text-success font-bold">Cleared!</span>
                                  ) : (
                                    fmtCurrency(d.balanceAfter)
                                  )}
                                </td>
                                <td className="whitespace-nowrap px-3 py-2.5">
                                  <span
                                    className={cn(
                                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase',
                                      d.balanceAfter === 0
                                        ? 'bg-success/10 text-success'
                                        : 'bg-primary/10 text-primary'
                                    )}
                                  >
                                    {d.balanceAfter === 0 ? (
                                      <IconCheck className="h-2.5 w-2.5" />
                                    ) : null}
                                    {d.balanceAfter === 0 ? 'Closed' : 'Deducted'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-border bg-muted/30 font-semibold">
                            <td className="px-3 py-2 text-muted-foreground">Total</td>
                            <td className="px-3 py-2 tabular-nums text-destructive">
                              −
                              {fmtCurrency(
                                loanHistory.deductions.reduce((s, d) => s + d.actualDeduction, 0)
                              )}
                            </td>
                            <td colSpan={3} className="px-3 py-2 text-muted-foreground">
                              {loanHistory.deductions.length} deduction
                              {loanHistory.deductions.length !== 1 ? 's' : ''} processed
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              ) : null}
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
};

// ─── Main Page ────────────────────────────────────────────────────────────

const MainAdvanceRequest = () => {
  const user = useAppSelector(selectUser);
  const employeeId = user?.employeeId ?? '';
  const employeeName =
    user?.fullName || (typeof user?.name === 'string' ? user.name : user?.email) || '';
  const employeeDeptId =
    (typeof user?.departmentId === 'string' ? user.departmentId : undefined) ??
    user?.department?.id ??
    '';
  const employeeDeptName =
    user?.department?.name ?? user?.userDepartments?.[0]?.department?.name ?? '';

  const { data: requests, isLoading } = useAdvanceRequestsByEmployee(employeeId);

  const [applying, setApplying] = useState(false);
  const [detailFor, setDetailFor] = useState<AdvanceRequest | null>(null);

  const stats = useMemo(() => {
    const all = requests ?? [];
    return {
      total: all.length,
      pending: all.filter((r) => r.status === 'pending').length,
      approved: all.filter((r) => r.status === 'approved').length,
      rejected: all.filter((r) => r.status === 'rejected').length,
    };
  }, [requests]);

  const hasActiveAdvance = useMemo(
    () => (requests ?? []).some((r) => r.status === 'approved' && !!r.loanId),
    [requests]
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <IconLoader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-[13px]">Loading your advance requests…</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total',
      value: stats.total,
      Icon: IconCurrencyRupee,
      tint: 'bg-primary/10 text-primary',
      valueColor: 'text-foreground',
    },
    {
      label: 'Pending',
      value: stats.pending,
      Icon: IconClock,
      tint: 'bg-warning/10 text-warning',
      valueColor: 'text-warning',
    },
    {
      label: 'Approved',
      value: stats.approved,
      Icon: IconCheck,
      tint: 'bg-success/10 text-success',
      valueColor: 'text-success',
    },
    {
      label: 'Rejected',
      value: stats.rejected,
      Icon: IconBan,
      tint: 'bg-destructive/10 text-destructive',
      valueColor: 'text-destructive',
    },
  ];

  return (
    <div className="bg-background text-foreground grow">
      <div className="mx-auto max-w-350 space-y-5 px-4 pt-6 pb-10 sm:px-6 lg:px-8">
        {/* Top header bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-0.5 text-[11px] sm:text-[12px] text-muted-foreground">My Account</p>
            <h1 className="text-[18px] sm:text-[22px] font-bold leading-tight tracking-[-0.03em]">
              Advance Request
            </h1>
          </div>
        </div>

        {/* Hero banner */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/12 text-primary">
                <IconCurrencyRupee className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-[16px] sm:text-[18px] font-bold tracking-[-0.02em]">
                  Advance Payment Requests
                </h2>
                <p className="mt-0.5 text-[12px] sm:text-[13px] text-muted-foreground">
                  Request an advance and track monthly deductions from your salary
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setApplying(true)}
              disabled={!employeeId}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto sm:shrink-0"
            >
              <IconPlus className="h-4 w-4" strokeWidth={2.5} />
              New Request
            </button>
          </div>
        </div>

        {!employeeId && (
          <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3.5">
            <IconAlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
            <div>
              <p className="text-[13px] font-semibold text-warning">Employee ID not assigned</p>
              <p className="text-[11px] text-warning/80">
                Your account does not have an Employee ID yet. Contact HR to have it assigned before
                submitting an advance request.
              </p>
            </div>
          </div>
        )}

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
                  'text-[22px] sm:text-[28px] font-bold leading-none tracking-[-0.02em] tabular-nums whitespace-nowrap',
                  s.valueColor
                )}
              >
                {s.value.toLocaleString('en-IN')}
              </p>
            </div>
          ))}
        </div>

        {/* Requests table */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <div className="border-b border-border px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <IconCurrencyRupee className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-[14px] font-semibold">My Advance Requests</h2>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  All advance payment requests you have submitted
                </p>
              </div>
            </div>
          </div>

          {(requests ?? []).length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-215">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {[
                      'Action',
                      ...((requests ?? []).some((r) => r.tenant) ? ['Company'] : []),
                      'Date',
                      'Amount',
                      'Monthly Deduction',
                      'Months',
                      'Reason',
                      'Status',
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
                  {(requests ?? []).map((req) => {
                    const hasApproved = req.approvedAmount != null;
                    const amtModified = hasApproved && req.approvedAmount !== req.requestAmount;
                    const dedModified =
                      hasApproved && req.approvedMonthlyDeduction !== req.monthlyDeduction;
                    const moModified = hasApproved && req.approvedNoOfMonths !== req.noOfMonths;
                    return (
                      <tr key={req.id} className="transition-colors hover:bg-muted/40">
                        <td className="px-5 py-3.5">
                          <button
                            type="button"
                            onClick={() => setDetailFor(req)}
                            className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-muted px-2.5 text-[11px] font-semibold text-foreground transition-colors hover:bg-muted-foreground/10"
                          >
                            <IconEye className="h-3 w-3" />
                            View
                          </button>
                        </td>
                        {(requests ?? []).some((r) => r.tenant) && (
                          <td className="px-5 py-3.5 text-[12px] text-muted-foreground whitespace-nowrap">
                            {req.tenant?.name ?? '—'}
                          </td>
                        )}
                        <td className="px-5 py-3.5 text-[12px] text-muted-foreground whitespace-nowrap">
                          {fmtDate(req.requestDate)}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span
                            className={cn(
                              'text-[13px] font-bold tabular-nums',
                              amtModified && 'text-muted-foreground line-through'
                            )}
                          >
                            {fmtCurrency(req.requestAmount)}
                          </span>
                          {hasApproved && (
                            <div className="mt-0.5 flex items-center gap-1">
                              <span className="text-[11px] font-semibold tabular-nums text-success">
                                {fmtCurrency(req.approvedAmount!)}
                              </span>
                              {amtModified && (
                                <span className="rounded bg-success/10 px-1 py-0.5 text-[9px] font-bold text-success">
                                  MODIFIED
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span
                            className={cn(
                              'text-[13px] font-semibold tabular-nums',
                              dedModified
                                ? 'text-muted-foreground line-through'
                                : 'text-muted-foreground'
                            )}
                          >
                            {fmtCurrency(req.monthlyDeduction)}
                          </span>
                          {hasApproved && req.approvedMonthlyDeduction != null && (
                            <div className="mt-0.5 flex items-center gap-1">
                              <span className="text-[11px] font-semibold tabular-nums text-success">
                                {fmtCurrency(req.approvedMonthlyDeduction)}
                              </span>
                              {dedModified && (
                                <span className="rounded bg-success/10 px-1 py-0.5 text-[9px] font-bold text-success">
                                  MODIFIED
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span
                            className={cn(
                              'text-[13px] font-bold tabular-nums',
                              moModified && 'text-muted-foreground line-through'
                            )}
                          >
                            {req.noOfMonths}
                          </span>
                          <span
                            className={cn(
                              'ml-1 text-[11px] text-muted-foreground',
                              moModified && 'line-through'
                            )}
                          >
                            mo.
                          </span>
                          {hasApproved && req.approvedNoOfMonths != null && moModified && (
                            <div className="mt-0.5">
                              <span className="text-[11px] font-semibold tabular-nums text-success">
                                {req.approvedNoOfMonths} mo.
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="max-w-48 truncate px-5 py-3.5 text-[12px] text-muted-foreground">
                          {req.reason}
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusPill status={req.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <IconCurrencyRupee className="h-6 w-6" />
              </div>
              <p className="text-[14px] font-semibold">No advance requests yet</p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Click 'New Request' to submit your first advance payment request.
              </p>
              {employeeId && (
                <button
                  type="button"
                  onClick={() => setApplying(true)}
                  className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-[12px] font-semibold text-primary-foreground hover:opacity-90"
                >
                  <IconPlus className="h-3.5 w-3.5" /> New Request
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {applying && (
        <ApplyAdvanceModal
          employeeId={employeeId}
          employeeName={employeeName}
          employeeDeptId={employeeDeptId}
          employeeDeptName={employeeDeptName}
          hasActiveAdvance={hasActiveAdvance}
          onClose={() => setApplying(false)}
        />
      )}

      {detailFor && <DetailModal request={detailFor} onClose={() => setDetailFor(null)} />}
    </div>
  );
};

export default MainAdvanceRequest;
