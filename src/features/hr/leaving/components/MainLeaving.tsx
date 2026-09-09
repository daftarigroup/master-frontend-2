'use client';

import {
  IconAlertCircle,
  IconArrowRight,
  IconBell,
  IconBriefcase,
  IconCalendar,
  IconCheck,
  IconChevronDown,
  IconClock,
  IconLoader2,
  IconMessage,
  IconRefresh,
  IconSend,
  IconUserX,
  IconWorld,
  IconX,
} from '@tabler/icons-react';
import React, { useMemo, useState } from 'react';
import UserAvatar from '@/components/ui/UserAvatar';
import { cn } from '@/lib/utils';
import { useAppSelector } from '@/store/hook';
import { selectUser } from '@/store/slice/userAccountData';
import type { EmployeeOffboard } from '../server/api/leavingApi';
import { ModalPortal } from '@/features/hr/_shared/components';
import {
  useLeavingEmployees,
  useMyOffboardingStatus,
  useSubmitResignation,
  useUpdateSeparationStatus,
} from '../server/tanstackQuery/useLeavingQueries';

const STATUS_CFG: Record<string, { label: string; bg: string; text: string }> = {
  active: { label: 'ACTIVE', bg: 'bg-success/10', text: 'text-success' },
  on_notice: { label: 'ON NOTICE', bg: 'bg-warning/10', text: 'text-warning' },
  exit_interview: {
    label: 'EXIT INTERVIEW',
    bg: 'bg-primary/10',
    text: 'text-primary',
  },
  left: { label: 'LEFT', bg: 'bg-muted', text: 'text-muted-foreground' },
  completed: { label: 'COMPLETED', bg: 'bg-success/10', text: 'text-success' },
};

const REASON_OPTIONS = [
  'Better Opportunity',
  'Personal Reasons',
  'Relocation',
  'Health Issues',
  'Higher Education',
  'Starting Own Business',
  'Work-Life Balance',
  'Other',
];

const STATUS_STEPS = [
  { key: 'on_notice', label: 'Resignation Submitted' },
  { key: 'exit_interview', label: 'Exit Interview' },
  { key: 'left', label: 'Relieved' },
];

const StatusPill = ({ status }: { status: string }) => {
  const cfg = STATUS_CFG[status] ?? {
    label: String(status).toUpperCase(),
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

const fmtDate = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';

const daysUntil = (d: string | null): number | null => {
  if (!d) return null;
  const diff = new Date(d).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
};

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
    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
      {label}
      {required && <span className="ml-1 text-destructive">*</span>}
    </label>
    {children}
    {error && <p className="mt-1 text-[11px] text-destructive">{error}</p>}
  </div>
);

const PageHeader = ({ eyebrow, title }: { eyebrow: string; title: string }) => (
  <div className="flex items-center justify-between gap-4">
    <div>
      <p className="mb-0.5 text-[12px] text-muted-foreground">{eyebrow}</p>
      <h1 className="text-[18px] font-bold leading-tight tracking-[-0.03em] sm:text-[22px]">
        {title}
      </h1>
    </div>
  </div>
);

// ─── Status Tracker (employee view) ─────────────────────────────────────────
const StatusTracker: React.FC<{ record: EmployeeOffboard }> = ({ record }) => {
  const currentIdx = STATUS_STEPS.findIndex(
    (s) => s.key === record.status || (record.status === 'completed' && s.key === 'left')
  );
  const remaining = daysUntil(record.lastWorkingDay);

  return (
    <div className="space-y-5">
      <div className="flex items-center">
        {STATUS_STEPS.map((step, i) => {
          const done = i <= currentIdx;
          const active = i === currentIdx;
          return (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center gap-1.5 text-center">
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full border-2 text-[12px] font-bold transition-all',
                    done
                      ? 'border-success bg-success text-success-foreground'
                      : 'border-border bg-card text-muted-foreground',
                    active && 'ring-4 ring-success/30'
                  )}
                >
                  {done ? <IconCheck className="h-4 w-4" strokeWidth={3} /> : i + 1}
                </div>
                <p
                  className={cn(
                    'text-[10px] font-semibold uppercase tracking-[0.04em]',
                    done ? 'text-success' : 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </p>
              </div>
              {i < STATUS_STEPS.length - 1 && (
                <div
                  className={cn('mb-5 h-0.5 flex-1', i < currentIdx ? 'bg-success' : 'bg-border')}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-muted/40 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
            Last Working Day
          </p>
          <p className="mt-1 text-[18px] font-bold tracking-[-0.02em]">
            {fmtDate(record.lastWorkingDay)}
          </p>
          {remaining !== null && remaining > 0 && (
            <p className="mt-0.5 text-[11px] font-medium text-warning">
              {remaining} days remaining on notice
            </p>
          )}
          {remaining === 0 && (
            <p className="mt-0.5 text-[11px] font-medium text-success">
              Today is your last working day
            </p>
          )}
        </div>
        <div className="rounded-xl border border-border bg-muted/40 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
            Reason
          </p>
          <p className="mt-1 text-[13px] font-semibold">{record.leavingReason ?? '—'}</p>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
        <IconMessage className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-[12px] text-primary">
          HR will reach out to schedule your exit interview and complete the offboarding process.
          Contact HR if you have questions.
        </p>
      </div>
    </div>
  );
};

// ─── Resignation Form (employee view) ───────────────────────────────────────
const ResignationForm: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const submit = useSubmitResignation();
  const [reason, setReason] = useState('');
  const [lastDay, setLastDay] = useState('');
  const [errors, setErrors] = useState<{ reason?: string; lastDay?: string }>({});
  const [submitted, setSubmitted] = useState(false);

  const minDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  }, []);

  const validate = () => {
    const e: typeof errors = {};
    if (!reason) e.reason = 'Required';
    if (!lastDay) e.lastDay = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    await submit.mutateAsync({
      leavingReason: reason,
      lastWorkingDay: new Date(lastDay).toISOString(),
    });
    setSubmitted(true);
    onSuccess();
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
          <IconCheck className="h-8 w-8 text-success" strokeWidth={2.5} />
        </div>
        <h3 className="text-[18px] font-bold tracking-[-0.02em]">Resignation Submitted</h3>
        <p className="mt-1 text-[13px] text-muted-foreground">
          HR will review your request and get in touch.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3">
        <IconAlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <p className="text-[12px] font-medium text-warning">
          A minimum notice period of 30 days is required as per company policy. Your last working
          day must be at least 30 days from today.
        </p>
      </div>

      <Field label="Reason for Leaving" required error={errors.reason}>
        <div className="relative">
          <IconChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <select
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setErrors((p) => ({ ...p, reason: undefined }));
            }}
            className={cn(inputCls(errors.reason), 'cursor-pointer appearance-none pr-9')}
          >
            <option value="">Select reason…</option>
            {REASON_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </Field>

      <Field label="Proposed Last Working Day" required error={errors.lastDay}>
        <input
          type="date"
          value={lastDay}
          min={minDate}
          onChange={(e) => {
            setLastDay(e.target.value);
            setErrors((p) => ({ ...p, lastDay: undefined }));
          }}
          className={inputCls(errors.lastDay)}
        />
        {lastDay && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            Notice period: {daysUntil(new Date(lastDay).toISOString()) ?? 0} days
          </p>
        )}
      </Field>

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

      <button
        type="button"
        disabled={submit.isPending}
        onClick={handleSubmit}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-destructive px-4 text-[13px] font-semibold text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {submit.isPending ? (
          <>
            <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
            Submitting…
          </>
        ) : (
          <>
            <IconSend className="h-3.5 w-3.5" />
            Submit Resignation
          </>
        )}
      </button>
    </div>
  );
};

// ─── HR Status Panel ────────────────────────────────────────────────────────
const StatusPanel: React.FC<{ emp: EmployeeOffboard; onClose: () => void }> = ({
  emp,
  onClose,
}) => {
  const update = useUpdateSeparationStatus();
  const nextMap: Record<string, { label: string; next: string }> = {
    on_notice: { label: 'Mark as Exit Interview', next: 'exit_interview' },
    exit_interview: { label: 'Mark as Left', next: 'left' },
  };
  const nextAction = nextMap[emp.status];

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      >
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/12 text-warning">
              <IconUserX className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold leading-tight tracking-[-0.01em]">{emp.name}</h2>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                {emp.designation ?? emp.department?.name ?? 'Employee'}
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

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                Status
              </span>
              <StatusPill status={emp.status} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                Last Working Day
              </span>
              <span className="text-[13px] font-semibold">{fmtDate(emp.lastWorkingDay)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                Department
              </span>
              <span className="text-[13px] font-semibold">{emp.department?.name ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                Employee ID
              </span>
              <span className="font-mono text-[11px] font-semibold text-muted-foreground">
                {emp.employeeId}
              </span>
            </div>
          </div>

          {emp.leavingReason && (
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                Reason for Leaving
              </p>
              <p className="rounded-xl bg-muted/30 px-3.5 py-3 text-[13px]">{emp.leavingReason}</p>
            </div>
          )}
        </div>

        {nextAction && (
          <div className="border-t border-border bg-muted/30 px-6 py-4">
            <button
              type="button"
              disabled={update.isPending}
              onClick={() =>
                update.mutate({ id: emp.id, status: nextAction.next }, { onSuccess: onClose })
              }
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {update.isPending ? (
                <>
                  <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
                  Updating…
                </>
              ) : (
                <>
                  <IconArrowRight className="h-3.5 w-3.5" />
                  {nextAction.label}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
    </ModalPortal>
  );
};

// ─── Main Page ──────────────────────────────────────────────────────────────
const MainLeaving = () => {
  const user = useAppSelector(selectUser);
  const isHR = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';

  const {
    data: leavingList,
    isLoading: listLoading,
    isError: listError,
    refetch,
  } = useLeavingEmployees();
  const { data: myStatus, isLoading: myLoading } = useMyOffboardingStatus();

  const [selectedEmp, setSelectedEmp] = useState<EmployeeOffboard | null>(null);

  const stats = useMemo(() => {
    const list = leavingList ?? [];
    return {
      onNotice: list.filter((e) => e.status === 'on_notice').length,
      exitInterview: list.filter((e) => e.status === 'exit_interview').length,
      left: list.filter((e) => ['left', 'completed'].includes(e.status)).length,
      total: list.length,
    };
  }, [leavingList]);

  // ── Employee (USER) view ──────────────────────────────────────────────────
  if (!isHR) {
    if (myLoading) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <IconLoader2 className="h-7 w-7 animate-spin text-primary" />
            <p className="text-[13px]">Loading your status…</p>
          </div>
        </div>
      );
    }

    const hasResigned = myStatus && myStatus.status !== 'active';

    return (
      <div className="bg-background text-foreground grow">
        <div className="mx-auto max-w-350 space-y-5 px-4 pt-6 pb-10 sm:px-6 lg:px-8">
          <PageHeader eyebrow="My Account" title="Leaving" />

          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            <div className="flex flex-wrap items-center gap-4 bg-linear-to-br from-card to-card/50 px-5 py-5 sm:px-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-warning/30 bg-warning/12 text-warning">
                <IconUserX className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-[18px] font-bold tracking-[-0.02em]">
                  Resignation & Offboarding
                </h2>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  Submit your resignation or track your offboarding status
                </p>
              </div>
            </div>
          </div>

          {!myStatus && (
            <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3.5">
              <IconAlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
              <div>
                <p className="text-[13px] font-semibold text-warning">No employee record found</p>
                <p className="text-[11px] text-warning/80">
                  Your account doesn't have a linked employee record. Contact HR to set this up
                  before submitting a resignation.
                </p>
              </div>
            </div>
          )}

          {myStatus && !hasResigned && (
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
              <div className="border-b border-border px-5 py-4">
                <h2 className="text-[14px] font-semibold">Submit Resignation</h2>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Once submitted, HR will review and guide you through the exit process.
                </p>
              </div>
              <div className="px-5 py-5">
                <ResignationForm onSuccess={() => {}} />
              </div>
            </div>
          )}

          {myStatus && hasResigned && (
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
              <div className="border-b border-border px-5 py-4">
                <h2 className="text-[14px] font-semibold">Your Offboarding Status</h2>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Track your exit process step by step.
                </p>
              </div>
              <div className="px-5 py-5">
                <StatusTracker record={myStatus} />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── HR / Admin view ───────────────────────────────────────────────────────
  if (listLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <IconLoader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-[13px]">Loading leaving employees…</p>
        </div>
      </div>
    );
  }

  if (listError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
          <IconAlertCircle className="h-7 w-7 text-destructive" />
          <p className="text-[13px] font-semibold text-destructive">
            Couldn't load leaving employees
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

  const statCards = [
    {
      label: 'On Notice',
      value: stats.onNotice,
      Icon: IconClock,
      tint: 'bg-warning/10 text-warning',
      valueColor: 'text-warning',
    },
    {
      label: 'Exit Interview',
      value: stats.exitInterview,
      Icon: IconBriefcase,
      tint: 'bg-primary/10 text-primary',
      valueColor: 'text-primary',
    },
    {
      label: 'Left',
      value: stats.left,
      Icon: IconUserX,
      tint: 'bg-muted text-muted-foreground',
      valueColor: 'text-foreground',
    },
    {
      label: 'Total Pipeline',
      value: stats.total,
      Icon: IconCalendar,
      tint: 'bg-primary/10 text-primary',
      valueColor: 'text-foreground',
    },
  ];

  return (
    <div className="bg-background text-foreground grow">
      <div className="mx-auto max-w-350 space-y-5 px-4 pt-6 pb-10 sm:px-6 lg:px-8">
        <PageHeader eyebrow="Offboarding" title="Employee Leaving" />

        {/* Hero banner */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <div className="flex flex-wrap items-center gap-4 bg-linear-to-br from-card to-card/50 px-5 py-5 sm:px-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-warning/30 bg-warning/12 text-warning">
              <IconUserX className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-[18px] font-bold tracking-[-0.02em]">Separation Pipeline</h2>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                Manage employee separations and the exit process
              </p>
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          {statCards.map((s, i) => (
            <div
              key={i}
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
                  'text-[28px] font-bold leading-none tracking-[-0.02em] tabular-nums',
                  s.valueColor
                )}
              >
                {s.value.toLocaleString('en-IN')}
              </p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <div className="border-b border-border px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10 text-warning">
                <IconUserX className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-[14px] font-semibold">Leaving Employees</h2>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                    {(leavingList ?? []).length}
                  </span>
                </div>
              </div>
            </div>
          </div>
          {(leavingList ?? []).length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-215">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="whitespace-nowrap px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                      Employee
                    </th>
                    <th className="whitespace-nowrap px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                      Department
                    </th>
                    <th className="whitespace-nowrap px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                      Last Working Day
                    </th>
                    <th className="whitespace-nowrap px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                      Reason
                    </th>
                    <th className="whitespace-nowrap px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                      Status
                    </th>
                    <th className="whitespace-nowrap px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(leavingList ?? []).map((emp) => (
                    <tr
                      key={emp.id}
                      className="cursor-pointer transition-colors hover:bg-muted/40"
                      onClick={() => setSelectedEmp(emp)}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            name={emp.name}
                            avatarUrl={(emp as any).avatarUrl ?? null}
                            size={36}
                          />
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-semibold">{emp.name}</p>
                            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                              {emp.email ?? '—'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-[12px] text-muted-foreground">
                        {emp.department?.name ?? '—'}
                      </td>
                      <td className="px-5 py-3.5 text-[12px] text-muted-foreground">
                        {fmtDate(emp.lastWorkingDay)}
                      </td>
                      <td className="max-w-40 truncate px-5 py-3.5 text-[12px] text-muted-foreground">
                        {emp.leavingReason ?? '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusPill status={emp.status} />
                      </td>
                      <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setSelectedEmp(emp)}
                          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted px-3 text-[11px] font-semibold text-foreground transition-colors hover:bg-muted-foreground/10"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <IconUserX className="h-6 w-6" />
              </div>
              <p className="text-[14px] font-semibold">No leaving employees</p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                When employees submit resignations, they will appear here.
              </p>
            </div>
          )}
        </div>

        {selectedEmp && <StatusPanel emp={selectedEmp} onClose={() => setSelectedEmp(null)} />}
      </div>
    </div>
  );
};

export default MainLeaving;
