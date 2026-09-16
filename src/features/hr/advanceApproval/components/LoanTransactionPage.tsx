'use client';

import {
  IconAlertCircle,
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconCircleCheck,
  IconClock,
  IconCurrencyRupee,
  IconHistory,
  IconListDetails,
  IconLoader2,
} from '@tabler/icons-react';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  useAdvanceRequestById,
  useAdvanceRequestsByEmployee,
  useLoanHistory,
} from '@/features/hr/advanceRequest/server/tanstackQuery/useAdvanceRequestQueries';
import type { AdvanceRequest } from '@/features/hr/advanceRequest/types/types';
import { cn } from '@/lib/utils';

const fmtCurrency = (n: number | null | undefined) => {
  const val = typeof n === 'number' && !Number.isNaN(n) ? n : 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const monthLabel = (month: number, year: number) =>
  `${new Date(2000, month - 1).toLocaleString('en-IN', { month: 'short' })} ${year}`;

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return (parts[0]?.slice(0, 2) ?? '??').toUpperCase();
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
};

// ─── Approval History Tab ─────────────────────────────────────────────────────

function ApprovalHistory({
  currentAdvanceId,
  employeeId,
}: {
  currentAdvanceId: number;
  employeeId: string;
}) {
  const { data: allRequests, isLoading } = useAdvanceRequestsByEmployee(employeeId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <IconLoader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const approved = (allRequests ?? [])
    .filter((r): r is AdvanceRequest => r.status === 'approved')
    .sort(
      (a, b) =>
        new Date(b.approvedDate ?? b.requestDate).getTime() -
        new Date(a.approvedDate ?? a.requestDate).getTime()
    );

  if (!approved.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <IconHistory className="mb-3 h-10 w-10 text-muted-foreground/40" />
        <p className="text-[13px] font-semibold">No approval history found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {approved.map((r, idx) => {
        const isCurrent = r.id === currentAdvanceId;
        const prior = r.priorOutstandingBalance ?? 0;
        const approvedAmt = r.approvedAmount ?? r.requestAmount;
        const combinedTotal = approvedAmt + prior;
        const emi = r.approvedMonthlyDeduction ?? r.monthlyDeduction;
        const months = r.approvedNoOfMonths ?? r.noOfMonths;

        return (
          <div
            key={r.id}
            className={cn(
              'overflow-hidden rounded-xl border',
              isCurrent ? 'border-primary/40 bg-primary/3' : 'border-border bg-card'
            )}
          >
            {/* Header row */}
            <div
              className={cn(
                'flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3.5',
                isCurrent ? 'border-primary/20 bg-primary/5' : 'border-border bg-muted/30'
              )}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold',
                    isCurrent
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {approved.length - idx}
                </span>
                <span
                  className={cn(
                    'text-[12px] font-bold uppercase tracking-[0.04em]',
                    isCurrent ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {isCurrent ? 'Current Loan' : `Advance #${r.id}`}
                </span>
                {prior > 0 && (
                  <span className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning">
                    Rollup
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                <span>Requested {fmtDate(r.requestDate)}</span>
                {r.approvedDate && <span>Approved {fmtDate(r.approvedDate)}</span>}
              </div>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Amounts */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                    Requested
                  </p>
                  <p className="text-[14px] font-bold tabular-nums text-warning">
                    {fmtCurrency(r.requestAmount)}
                  </p>
                </div>
                <div>
                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                    Admin Approved
                  </p>
                  <p className="text-[14px] font-bold tabular-nums text-foreground">
                    {fmtCurrency(approvedAmt)}
                  </p>
                </div>
                {prior > 0 ? (
                  <div>
                    <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                      Prior Outstanding
                    </p>
                    <p className="flex items-center gap-1 text-[14px] font-bold tabular-nums text-warning">
                      <IconArrowRight className="h-3 w-3 shrink-0" />
                      {fmtCurrency(prior)}
                    </p>
                  </div>
                ) : null}
                <div>
                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                    {prior > 0 ? 'Combined Total' : 'Loan Amount'}
                  </p>
                  <p
                    className={cn(
                      'text-[14px] font-bold tabular-nums',
                      isCurrent ? 'text-primary' : 'text-success'
                    )}
                  >
                    {fmtCurrency(combinedTotal)}
                  </p>
                </div>
              </div>

              {/* EMI + months + start */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg bg-muted/40 px-4 py-2.5 text-[12px]">
                <span>
                  <span className="text-muted-foreground">EMI: </span>
                  <span className="font-semibold tabular-nums">{fmtCurrency(emi)}/mo</span>
                </span>
                <span>
                  <span className="text-muted-foreground">Duration: </span>
                  <span className="font-semibold tabular-nums">{months} months</span>
                </span>
                {r.startDeductionMonth && (
                  <span>
                    <span className="text-muted-foreground">Starts: </span>
                    <span className="font-semibold">{fmtDate(r.startDeductionMonth)}</span>
                  </span>
                )}
              </div>

              {/* Reason + remarks */}
              <div className="space-y-2">
                <div>
                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                    Reason
                  </p>
                  <p className="text-[12px] text-foreground">{r.reason}</p>
                </div>
                {r.remarks && (
                  <div>
                    <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                      Admin Remarks
                    </p>
                    <p className="text-[12px] text-muted-foreground">{r.remarks}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LoanTransactionPage({ advanceId: propAdvanceId }: { advanceId?: number } = {}) {
  const router = useRouter();
  const routeParams = useParams<{ advanceId?: string }>();
  const parsedId = routeParams?.advanceId ? parseInt(routeParams.advanceId, 10) : 0;
  const advanceId = propAdvanceId ?? (isNaN(parsedId) ? 0 : parsedId);
  const [tab, setTab] = useState<'transactions' | 'history'>('transactions');

  const {
    data: request,
    isLoading: reqLoading,
    isError: reqError,
  } = useAdvanceRequestById(advanceId);
  const {
    data: loan,
    isLoading: loanLoading,
    isError: loanError,
  } = useLoanHistory(advanceId, advanceId > 0);

  const isLoading = reqLoading || loanLoading;
  const isError = reqError || loanError;

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <IconLoader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-[13px]">Loading…</p>
        </div>
      </div>
    );
  }

  if (isError || !request) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
          <IconAlertCircle className="h-7 w-7 text-destructive" />
          <p className="text-[13px] font-semibold text-destructive">
            Could not load transaction history
          </p>
          <button
            type="button"
            onClick={() => router.push('/hr/advance?tab=loans', { scroll: false })}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-4 text-[12px] font-semibold text-primary-foreground hover:opacity-90"
          >
            <IconArrowLeft className="h-3.5 w-3.5" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const priorOutstanding = request.priorOutstandingBalance ?? 0;
  const disbursed =
    priorOutstanding > 0
      ? (request.approvedAmount ?? request.requestAmount) + priorOutstanding
      : (request.approvedAmount ?? request.requestAmount);
  const emi = request.approvedMonthlyDeduction ?? request.monthlyDeduction;
  const totalMonths = request.approvedNoOfMonths ?? request.noOfMonths;
  const outstanding = loan?.outstandingBalance ?? 0;
  const collected = disbursed - outstanding;
  const recoveryPct = disbursed > 0 ? Math.min(Math.round((collected / disbursed) * 100), 100) : 0;
  const deductions = loan?.deductions ?? [];
  const isPaid = loan?.status === 'paid';

  const totalScheduled = deductions.reduce((s, d) => s + d.scheduledEmi, 0);
  const totalActual = deductions.reduce((s, d) => s + d.actualDeduction, 0);
  const shortfall = totalScheduled - totalActual;

  return (
    <div className="bg-background text-foreground grow">
      <div className="mx-auto max-w-350 space-y-5 px-4 pt-6 pb-10 sm:px-6 lg:px-8">
        {/* Back + Header */}
        <div className="flex items-start gap-4">
          <button
            type="button"
            onClick={() => router.push('/hr/advance?tab=loans', { scroll: false })}
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Go back"
          >
            <IconArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="mb-0.5 text-[11px] sm:text-[12px] text-muted-foreground">
              HR Management · Advance Approval
            </p>
            <h1 className="text-[18px] sm:text-[22px] font-bold leading-tight tracking-[-0.03em]">
              Loan Details
            </h1>
          </div>
        </div>

        {/* Employee + Loan Summary Card */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <div className="flex flex-wrap items-center gap-4 border-b border-border p-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/12 text-[15px] font-bold text-primary">
              {initials(request.employeeName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[18px] font-bold leading-tight">{request.employeeName}</p>
              <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
                {[request.empCode || request.employeeId, request.department?.name].filter(Boolean).join(' · ')}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em]',
                    isPaid ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'
                  )}
                >
                  {isPaid ? (
                    <IconCircleCheck className="h-2.5 w-2.5" />
                  ) : (
                    <IconClock className="h-2.5 w-2.5" />
                  )}
                  {isPaid ? 'FULLY REPAID' : 'ACTIVE LOAN'}
                </span>
                {request.startDeductionMonth && (
                  <span className="text-[12px] text-muted-foreground">
                    Started {fmtDate(request.startDeductionMonth)}
                  </span>
                )}
              </div>
            </div>
            {request.approvedDate && (
              <div className="shrink-0 text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                  Approved On
                </p>
                <p className="text-[13px] font-semibold">{fmtDate(request.approvedDate)}</p>
              </div>
            )}
          </div>

          {/* Financial summary chips */}
          <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
            {[
              { label: 'Loan Amount', value: fmtCurrency(disbursed), color: 'text-foreground' },
              { label: 'Collected', value: fmtCurrency(collected), color: 'text-success' },
              {
                label: 'Outstanding',
                value: fmtCurrency(outstanding),
                color: outstanding > 0 ? 'text-warning' : 'text-muted-foreground',
              },
              { label: 'Monthly EMI', value: fmtCurrency(emi), color: 'text-primary' },
            ].map((item) => (
              <div key={item.label} className="px-5 py-4">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                  {item.label}
                </p>
                <p
                  className={cn(
                    'text-[15px] sm:text-[18px] font-bold tabular-nums leading-none whitespace-nowrap',
                    item.color
                  )}
                >
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          {/* Recovery progress */}
          <div className="border-t border-border px-5 py-4">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground">
                Recovery Progress · {deductions.length} of {totalMonths} month
                {totalMonths !== 1 ? 's' : ''} processed
              </span>
              <span className="text-[12px] font-bold tabular-nums">{recoveryPct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  recoveryPct >= 100
                    ? 'bg-success'
                    : recoveryPct >= 60
                      ? 'bg-primary'
                      : 'bg-warning'
                )}
                style={{ width: `${recoveryPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 rounded-xl border border-border bg-muted/40 p-1">
          {(
            [
              { key: 'transactions', label: 'Transaction History', Icon: IconListDetails },
              { key: 'history', label: 'Approval History', Icon: IconHistory },
            ] as const
          ).map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[12px] font-semibold transition-colors',
                tab === key
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* ── Tab: Transaction History ── */}
        {tab === 'transactions' && (
          <>
            {/* Deduction summary row */}
            {deductions.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    label: 'Total Scheduled',
                    value: fmtCurrency(totalScheduled),
                    sub: `${deductions.length} EMI${deductions.length !== 1 ? 's' : ''}`,
                    tint: 'bg-muted/60 border-border',
                    val: 'text-foreground',
                  },
                  {
                    label: 'Total Deducted',
                    value: fmtCurrency(totalActual),
                    sub: 'Actual recovered',
                    tint: 'bg-success/5 border-success/20',
                    val: 'text-success',
                  },
                  {
                    label: shortfall > 0 ? 'Shortfall' : 'On Track',
                    value: shortfall > 0 ? fmtCurrency(shortfall) : '✓ No shortfall',
                    sub: shortfall > 0 ? 'Less than scheduled' : 'All EMIs collected',
                    tint:
                      shortfall > 0
                        ? 'bg-warning/5 border-warning/20'
                        : 'bg-success/5 border-success/20',
                    val: shortfall > 0 ? 'text-warning' : 'text-success',
                  },
                ].map((card) => (
                  <div key={card.label} className={cn('rounded-xl border p-3 sm:p-4', card.tint)}>
                    <p className="mb-1 text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                      {card.label}
                    </p>
                    <p
                      className={cn(
                        'text-[13px] sm:text-[16px] font-bold tabular-nums leading-tight',
                        card.val
                      )}
                    >
                      {card.value}
                    </p>
                    <p className="mt-0.5 text-[10px] sm:text-[11px] text-muted-foreground">
                      {card.sub}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Transaction Table */}
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
              <div className="flex items-center gap-3 border-b border-border px-5 py-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <IconListDetails className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-[14px] font-semibold">All Deduction Transactions</h2>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {deductions.length} transaction{deductions.length !== 1 ? 's' : ''} recorded
                  </p>
                </div>
              </div>

              {deductions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px]">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        {[
                          '#',
                          'Period',
                          'Scheduled EMI',
                          'Actual Deduction',
                          'Difference',
                          'Balance Before',
                          'Balance After',
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
                      {deductions.map((d, idx) => {
                        const diff = d.actualDeduction - d.scheduledEmi;
                        const isShort = diff < 0;
                        const isExact = diff === 0;
                        return (
                          <tr key={d.id} className="transition-colors hover:bg-muted/40">
                            <td className="px-5 py-3.5">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground">
                                {idx + 1}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-5 py-3.5">
                              <span className="text-[13px] font-semibold">
                                {monthLabel(d.month, d.year)}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-5 py-3.5 text-[13px] tabular-nums text-muted-foreground">
                              {fmtCurrency(d.scheduledEmi)}
                            </td>
                            <td className="whitespace-nowrap px-5 py-3.5">
                              <div className="flex items-center gap-1.5">
                                <IconCurrencyRupee className="h-3 w-3 text-success" />
                                <span className="text-[13px] font-semibold tabular-nums text-success">
                                  {fmtCurrency(d.actualDeduction)}
                                </span>
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-5 py-3.5">
                              {isExact ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
                                  <IconCheck className="h-2.5 w-2.5" />
                                  Exact
                                </span>
                              ) : (
                                <span
                                  className={cn(
                                    'text-[12px] font-semibold tabular-nums',
                                    isShort ? 'text-warning' : 'text-success'
                                  )}
                                >
                                  {isShort ? '−' : '+'}
                                  {fmtCurrency(Math.abs(diff))}
                                </span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-5 py-3.5 text-[12px] tabular-nums text-muted-foreground">
                              {fmtCurrency(d.balanceBefore)}
                            </td>
                            <td className="whitespace-nowrap px-5 py-3.5">
                              <span
                                className={cn(
                                  'text-[13px] font-bold tabular-nums',
                                  d.balanceAfter === 0 ? 'text-success' : 'text-foreground'
                                )}
                              >
                                {fmtCurrency(d.balanceAfter)}
                              </span>
                              {d.balanceAfter === 0 && (
                                <span className="ml-1.5 inline-flex items-center rounded-full bg-success/10 px-1.5 py-0.5 text-[9px] font-bold text-success">
                                  CLEARED
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border bg-muted/40">
                        <td className="whitespace-nowrap px-5 py-3" colSpan={2}>
                          <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted-foreground">
                            Totals
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-[13px] font-bold tabular-nums text-muted-foreground">
                          {fmtCurrency(totalScheduled)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-[13px] font-bold tabular-nums text-success">
                          {fmtCurrency(totalActual)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3">
                          {shortfall > 0 ? (
                            <span className="text-[12px] font-bold tabular-nums text-warning">
                              −{fmtCurrency(shortfall)}
                            </span>
                          ) : (
                            <span className="text-[12px] font-bold text-success">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3" />
                        <td className="whitespace-nowrap px-5 py-3 text-[13px] font-bold tabular-nums">
                          {fmtCurrency(outstanding)}
                          <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                            remaining
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <IconListDetails className="h-6 w-6" />
                  </div>
                  <p className="text-[14px] font-semibold">No transactions yet</p>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    Deductions will appear here once salary processing begins.
                  </p>
                </div>
              )}
            </div>

            {/* Reason card */}
            <div className="rounded-xl border border-border bg-card px-5 py-4">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                Advance Reason
              </p>
              <p className="text-[13px]">{request.reason}</p>
            </div>
          </>
        )}

        {/* ── Tab: Approval History ── */}
        {tab === 'history' && (
          <ApprovalHistory currentAdvanceId={advanceId} employeeId={request.employeeId} />
        )}
      </div>
    </div>
  );
}
