'use client';

import {
  IconArrowLeft,
  IconBriefcase,
  IconCalendar,
  IconCheck,
  IconCurrencyRupee,
  IconLoader2,
  IconUser,
  IconWallet,
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import {
  useGlobalStructure,
  usePayslips,
} from '@/features/hr/mySalary/server/tanstackQuery/useSalaryQueries';
import type { Payslip } from '@/features/hr/mySalary/types/types';
import { resolveActAsTenant } from '@/features/organization/utils/actAsTenant';
import { useAppSelector } from '@/store/hook';
import { selectUser } from '@/store/slice/userAccountData';

const T = {
  bg: 'var(--background)',
  fg: 'var(--foreground)',
  card: 'var(--card)',
  muted: 'var(--muted)',
  mutedFg: 'var(--muted-foreground)',
  border: 'var(--border)',
  primary: 'var(--primary)',
  primaryBg: 'color-mix(in oklch, var(--primary) 12%, transparent)',
  success: 'var(--success)',
  successBg: 'color-mix(in oklch, var(--success) 14%, transparent)',
  warning: 'var(--warning)',
  warningBg: 'color-mix(in oklch, var(--warning) 14%, transparent)',
  danger: 'var(--danger)',
  dangerBg: 'color-mix(in oklch, var(--danger) 14%, transparent)',
  info: 'oklch(0.488 0.243 264.376)',
  infoBg: 'oklch(0.488 0.243 264.376 / 0.14)',
  chart5: 'var(--chart-5)',
  chart5Bg: 'color-mix(in oklch, var(--chart-5) 14%, transparent)',
  font: "'DM Sans', system-ui, sans-serif" as string,
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);

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

const DASH = <span style={{ color: 'var(--muted-foreground)', opacity: 0.4 }}>—</span>;

const numCell = (extra?: React.CSSProperties): React.CSSProperties => ({
  padding: '11px 14px',
  whiteSpace: 'nowrap',
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
  ...extra,
});

const txtCell = (extra?: React.CSSProperties): React.CSSProperties => ({
  padding: '11px 14px',
  whiteSpace: 'nowrap',
  ...extra,
});

const GRP = {
  earnings: {
    hdr: T.successBg,
    cell: 'color-mix(in oklch, var(--success) 5%, transparent)',
    fg: T.success,
  },
  extra: {
    hdr: T.infoBg,
    cell: 'color-mix(in oklch, oklch(0.488 0.243 264.376) 5%, transparent)',
    fg: T.info,
  },
  gross: { hdr: T.primaryBg, cell: T.primaryBg, fg: T.primary },
  deduct: {
    hdr: T.dangerBg,
    cell: 'color-mix(in oklch, var(--danger) 5%, transparent)',
    fg: T.danger,
  },
  net: {
    hdr: 'color-mix(in oklch, var(--success) 20%, transparent)',
    cell: 'color-mix(in oklch, var(--success) 8%, transparent)',
    fg: T.success,
  },
  attend: {
    hdr: T.warningBg,
    cell: 'color-mix(in oklch, var(--warning) 5%, transparent)',
    fg: T.warning,
  },
};

interface Props {
  employeeId: string;
  name: string;
  department?: string;
  designation?: string;
  from?: string;
  // Only present under "All Companies" (merged) view — see the navigate()
  // call site in AllTransactionsTab.tsx.
  tenant?: { id: string; name: string };
}

export default function EmployeeSalaryDetail({
  employeeId,
  name,
  department,
  designation,
  from,
  tenant,
}: Props) {
  const router = useRouter();
  const user = useAppSelector(selectUser);
  const actAsTenantId = resolveActAsTenant(tenant, user?.tenantId);

  const backTab = from === 'salary-records' ? 'salary-records' : 'payroll';
  const backLabel = from === 'salary-records' ? 'Back to Salary Records' : 'Back to Salary';

  const { data: payslips, isLoading } = usePayslips(employeeId, actAsTenantId);
  useGlobalStructure();

  const sorted: Payslip[] = [...(payslips ?? [])]
    .filter((p) => p.status === 'paid')
    .sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });

  const totalNetPaid = sorted.reduce((s, p) => s + p.netPay, 0);
  const paidCount = sorted.length;

  const isPF = (id: string, n: string) =>
    id === 'emp_pf' || n.toLowerCase().includes('pf') || n.toLowerCase().includes('provident');

  const otherDeductionDefs = (() => {
    const seen = new Map<string, string>();
    for (const p of sorted) {
      for (const d of p.deductionBreakdown ?? []) {
        if (!isPF(d.id, d.name) && !seen.has(d.id)) seen.set(d.id, d.name);
      }
    }
    return Array.from(seen.entries()).map(([id, n]) => ({ id, name: n }));
  })();

  const groupHdr = (color: string, extra?: React.CSSProperties): React.CSSProperties => ({
    padding: '8px 14px',
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    textAlign: 'center' as const,
    background: color,
    borderBottom: `1px solid ${T.border}`,
    whiteSpace: 'nowrap' as const,
    ...extra,
  });

  const subHdr = (color: string, right = true): React.CSSProperties => ({
    padding: '7px 14px',
    fontSize: 10,
    fontWeight: 600,
    color,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
    textAlign: right ? ('right' as const) : ('left' as const),
    whiteSpace: 'nowrap' as const,
    background: 'color-mix(in oklch, var(--card) 96%, var(--foreground))',
  });

  return (
    <div
      style={{
        padding: 'clamp(16px, 4vw, 24px) clamp(14px, 4vw, 28px)',
        fontFamily: T.font,
        color: T.fg,
        minHeight: '100vh',
        background: T.bg,
      }}
    >
      {/* Back */}
      <button
        type="button"
        onClick={() => router.push(`/hr/salary-management?tab=${backTab}`)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          borderRadius: 8,
          border: `1px solid ${T.border}`,
          background: T.muted,
          color: T.mutedFg,
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: T.font,
          marginBottom: 16,
        }}
      >
        <IconArrowLeft size={14} /> {backLabel}
      </button>

      {/* Employee info bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '16px 20px',
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 14,
          flexWrap: 'wrap',
          marginBottom: 24,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: T.primaryBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: T.primary,
            flexShrink: 0,
          }}
        >
          <IconUser size={22} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1
            style={{
              fontSize: 'clamp(16px, 4vw, 18px)',
              fontWeight: 700,
              margin: 0,
              color: T.fg,
            }}
          >
            {name || 'Employee'}
          </h1>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              marginTop: 4,
              flexWrap: 'wrap',
            }}
          >
            {designation && (
              <span
                style={{
                  fontSize: 11,
                  color: T.mutedFg,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <IconBriefcase size={12} />
                {designation}
              </span>
            )}
            {department && (
              <span
                style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 5,
                  background: T.primaryBg,
                  color: T.primary,
                  fontWeight: 600,
                }}
              >
                {department}
              </span>
            )}
            <span style={{ fontSize: 11, color: T.mutedFg, fontFamily: 'monospace' }}>
              {employeeId}
            </span>
          </div>
        </div>

        {/* Quick stats */}
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {(
            [
              {
                val: String(paidCount),
                label: 'PAID',
                color: T.success,
                Icon: IconCalendar,
              },
              { val: fmt(totalNetPaid), label: 'DISBURSED', color: T.success, Icon: IconWallet },
            ] as const
          ).map(({ val, label, color, Icon }, i) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {i > 0 && (
                <div
                  style={{ width: 1, background: T.border, alignSelf: 'stretch', margin: '4px 0' }}
                />
              )}
              <div style={{ textAlign: 'center' }}>
                <p
                  style={{
                    fontSize: 'clamp(15px, 4vw, 18px)',
                    fontWeight: 700,
                    color,
                    margin: 0,
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {val}
                </p>
                <p
                  style={{
                    fontSize: 10,
                    color: T.mutedFg,
                    margin: '3px 0 0',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={10} />
                  {label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SALARY HISTORY ─────────────────────────────────────────────── */}
      <div
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '14px 20px',
            borderBottom: `1px solid ${T.border}`,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <IconCalendar size={16} color={T.primary} />
          <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: T.fg }}>
            Paid Salary History
          </h2>
          {sorted.length > 0 && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 20,
                background: T.successBg,
                color: T.success,
              }}
            >
              {sorted.length} paid record{sorted.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {isLoading && (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: T.mutedFg }}>
            <IconLoader2
              size={28}
              style={{
                animation: 'spin 1s linear infinite',
                margin: '0 auto 8px',
                display: 'block',
              }}
            />
            <p style={{ fontSize: 13, margin: 0 }}>Loading salary history…</p>
          </div>
        )}

        {!isLoading && sorted.length === 0 && (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: T.mutedFg }}>
            <IconCurrencyRupee
              size={32}
              style={{ margin: '0 auto 10px', display: 'block', opacity: 0.3 }}
            />
            <p style={{ fontSize: 13, margin: 0, fontWeight: 600 }}>No paid payslips yet</p>
            <p style={{ fontSize: 12, margin: '6px 0 0', opacity: 0.7 }}>
              Paid salary records will appear here once marked as paid
            </p>
          </div>
        )}

        {!isLoading && sorted.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 12,
                fontFamily: T.font,
                minWidth: 2000,
              }}
            >
              <thead>
                {/* ── Row 1: Group labels ─────────────────────────────────── */}
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  <th
                    colSpan={3}
                    style={groupHdr('transparent', { textAlign: 'left', color: T.mutedFg })}
                  >
                    Period
                  </th>

                  <th
                    colSpan={5}
                    style={groupHdr(GRP.earnings.hdr, {
                      color: T.success,
                      borderLeft: `2px solid ${T.success}40`,
                      borderRight: `2px solid ${T.success}40`,
                    })}
                  >
                    Earnings Components
                  </th>

                  <th
                    colSpan={6}
                    style={groupHdr(GRP.extra.hdr, {
                      color: T.info,
                      borderRight: `2px solid ${T.info}40`,
                    })}
                  >
                    Extra Pay
                  </th>

                  <th
                    colSpan={1}
                    style={groupHdr(GRP.gross.hdr, {
                      color: T.primary,
                      borderRight: `2px solid ${T.primary}40`,
                    })}
                  >
                    Gross
                  </th>

                  <th
                    colSpan={1 + otherDeductionDefs.length + 1}
                    style={groupHdr(GRP.deduct.hdr, {
                      color: T.danger,
                      borderRight: `2px solid ${T.danger}40`,
                    })}
                  >
                    Deductions
                  </th>

                  <th
                    colSpan={1}
                    style={groupHdr(GRP.net.hdr, {
                      color: T.success,
                      borderRight: `2px solid ${T.success}40`,
                    })}
                  >
                    In-Hand Salary
                  </th>

                  {/* Attendance group */}
                  <th
                    colSpan={4}
                    style={groupHdr(GRP.attend.hdr, {
                      color: T.warning,
                      borderRight: `2px solid ${T.warning}40`,
                    })}
                  >
                    Attendance
                  </th>

                  <th colSpan={2} style={groupHdr('transparent', { color: T.mutedFg })}>
                    Info
                  </th>
                </tr>

                {/* ── Row 2: Sub-column labels ────────────────────────────── */}
                <tr style={{ borderBottom: `2px solid ${T.border}` }}>
                  {/* Period */}
                  <th style={subHdr(T.mutedFg, false)}>Name</th>
                  <th style={subHdr(T.mutedFg, false)}>Year</th>
                  <th style={subHdr(T.mutedFg, false)}>Month</th>

                  {/* Earnings */}
                  <th style={{ ...subHdr(T.success), borderLeft: `2px solid ${T.success}40` }}>
                    Basic
                  </th>
                  <th style={subHdr(T.success)}>HRA</th>
                  <th style={subHdr(T.success)}>Conveyance</th>
                  <th style={subHdr(T.success)}>Medical</th>
                  <th style={{ ...subHdr(T.success), borderRight: `2px solid ${T.success}40` }}>
                    Special Allow.
                  </th>

                  {/* Extra pay */}
                  <th style={subHdr(T.info)}>LTA</th>
                  <th style={subHdr(T.info)}>Bonus</th>
                  <th style={subHdr(T.info)}>Other Allow.</th>
                  <th style={subHdr(T.info)}>OT Pay</th>
                  <th style={subHdr(T.info)}>Weekend Pay</th>
                  <th style={{ ...subHdr(T.info), borderRight: `2px solid ${T.info}40` }}>
                    Holiday Pay
                  </th>

                  {/* Gross */}
                  <th
                    style={{
                      ...subHdr(T.primary),
                      fontWeight: 700,
                      borderRight: `2px solid ${T.primary}40`,
                    }}
                  >
                    Gross Salary
                  </th>

                  {/* Deductions */}
                  <th style={subHdr(T.danger)}>PF</th>
                  {otherDeductionDefs.map((d) => (
                    <th
                      key={d.id}
                      title={d.name}
                      style={{
                        ...subHdr(T.danger),
                        maxWidth: 140,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        cursor: 'default',
                      }}
                    >
                      {d.name}
                    </th>
                  ))}
                  <th
                    style={{
                      ...subHdr(T.danger),
                      fontWeight: 700,
                      borderRight: `2px solid ${T.danger}40`,
                    }}
                  >
                    Total Deduct.
                  </th>

                  {/* Net */}
                  <th
                    style={{
                      ...subHdr(T.success),
                      fontWeight: 700,
                      borderRight: `2px solid ${T.success}40`,
                    }}
                  >
                    In-Hand Salary
                  </th>

                  {/* Attendance */}
                  <th style={subHdr(T.warning)}>Working Days Present</th>
                  <th style={subHdr(T.warning)}>Weekend Worked</th>
                  <th style={subHdr(T.warning)}>Holiday Worked</th>
                  <th style={{ ...subHdr(T.warning), borderRight: `2px solid ${T.warning}40` }}>
                    OT Hours Worked
                  </th>

                  {/* Info */}
                  <th style={subHdr(T.mutedFg, false)}>Status</th>
                  <th style={subHdr(T.mutedFg, false)}>Pay Date</th>
                </tr>
              </thead>

              <tbody>
                {sorted.map((p, i) => {
                  const pfItem = p.deductionBreakdown?.find((d) => isPF(d.id, d.name));
                  const pfAmount = pfItem?.amount ?? 0;
                  const isLatest = i === 0;
                  const rowBg = isLatest ? T.primaryBg : 'transparent';

                  const eBg = isLatest
                    ? 'color-mix(in oklch, var(--success) 7%, var(--primary) 5%)'
                    : GRP.earnings.cell;
                  const xBg = isLatest
                    ? 'color-mix(in oklch, oklch(0.488 0.243 264.376) 7%, var(--primary) 5%)'
                    : GRP.extra.cell;
                  const gBg = isLatest
                    ? 'color-mix(in oklch, var(--primary) 16%, transparent)'
                    : GRP.gross.cell;
                  const dBg = isLatest
                    ? 'color-mix(in oklch, var(--danger) 7%, var(--primary) 5%)'
                    : GRP.deduct.cell;
                  const nBg = isLatest
                    ? 'color-mix(in oklch, var(--success) 14%, var(--primary) 5%)'
                    : GRP.net.cell;
                  const aBg = isLatest
                    ? 'color-mix(in oklch, var(--warning) 7%, var(--primary) 5%)'
                    : GRP.attend.cell;

                  const eCell = (val: React.ReactNode, extra?: React.CSSProperties) => (
                    <td style={{ ...numCell({ background: eBg, color: T.success, ...extra }) }}>
                      {val}
                    </td>
                  );
                  const xCell = (val: React.ReactNode) => (
                    <td style={numCell({ background: xBg, color: T.info })}>{val}</td>
                  );
                  const dCell = (val: React.ReactNode, extra?: React.CSSProperties) => (
                    <td style={{ ...numCell({ background: dBg, color: T.danger, ...extra }) }}>
                      {val}
                    </td>
                  );
                  const aCell = (val: React.ReactNode, extra?: React.CSSProperties) => (
                    <td
                      style={{
                        ...txtCell({
                          background: aBg,
                          color: T.warning,
                          textAlign: 'center',
                          ...extra,
                        }),
                      }}
                    >
                      {val}
                    </td>
                  );

                  return (
                    <tr
                      key={p.id}
                      style={{
                        borderBottom: `1px solid ${T.border}`,
                        background: rowBg,
                        transition: 'background 0.15s',
                      }}
                    >
                      {/* Name */}
                      <td style={txtCell({ fontWeight: 600, color: T.fg, minWidth: 120 })}>
                        {name || '—'}
                      </td>

                      {/* Year */}
                      <td style={txtCell({ fontVariantNumeric: 'tabular-nums', color: T.mutedFg })}>
                        {p.year}
                      </td>

                      {/* Month */}
                      <td style={txtCell({ minWidth: 110 })}>
                        <span style={{ fontWeight: isLatest ? 700 : 400 }}>
                          {MONTHS[p.month - 1]}
                        </span>
                        {isLatest && (
                          <span
                            style={{
                              marginLeft: 6,
                              fontSize: 9,
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: 4,
                              background: T.primaryBg,
                              color: T.primary,
                              display: 'inline-block',
                            }}
                          >
                            Latest
                          </span>
                        )}
                      </td>

                      {/* Earnings */}
                      {eCell(fmt(p.basic), { borderLeft: `2px solid ${T.success}40` })}
                      {eCell(fmt(p.hra))}
                      {eCell(fmt(p.conveyance))}
                      {eCell(fmt(p.medicalAllowance))}
                      {eCell(fmt(p.specialAllowance), { borderRight: `2px solid ${T.success}40` })}

                      {/* Extra pay */}
                      {xCell(DASH)}
                      {xCell(p.additionalSalary > 0 ? fmt(p.additionalSalary) : DASH)}
                      {xCell(p.otherAllowances > 0 ? fmt(p.otherAllowances) : DASH)}
                      {xCell(p.otPay > 0 ? fmt(p.otPay) : DASH)}
                      {xCell(p.weekendPay > 0 ? fmt(p.weekendPay) : DASH)}
                      <td
                        style={numCell({
                          background: xBg,
                          color: T.info,
                          borderRight: `2px solid ${T.info}40`,
                        })}
                      >
                        {p.holidayPay > 0 ? fmt(p.holidayPay) : DASH}
                      </td>

                      {/* Gross */}
                      <td
                        style={numCell({
                          background: gBg,
                          color: T.primary,
                          fontWeight: 700,
                          fontSize: 13,
                          borderRight: `2px solid ${T.primary}40`,
                        })}
                      >
                        {fmt(p.grossEarnings)}
                      </td>

                      {/* Deductions */}
                      {dCell(pfAmount > 0 ? `−${fmt(pfAmount)}` : DASH)}
                      {otherDeductionDefs.map((def) => {
                        const item = p.deductionBreakdown?.find((d) => d.id === def.id);
                        return (
                          <td key={def.id} style={numCell({ background: dBg, color: T.danger })}>
                            {item && item.amount > 0 ? `−${fmt(item.amount)}` : DASH}
                          </td>
                        );
                      })}
                      <td
                        style={numCell({
                          background: dBg,
                          color: T.danger,
                          fontWeight: 700,
                          borderRight: `2px solid ${T.danger}40`,
                        })}
                      >
                        −{fmt(p.totalDeductions)}
                      </td>

                      {/* Net Salary */}
                      <td
                        style={numCell({
                          background: nBg,
                          color: T.success,
                          fontWeight: 700,
                          fontSize: 14,
                          borderRight: `2px solid ${T.success}40`,
                        })}
                      >
                        {fmt(p.netPay)}
                      </td>

                      {/* Attendance */}
                      <td style={txtCell({ background: aBg, minWidth: 140 })}>
                        <div>
                          <span
                            style={{
                              fontWeight: 700,
                              color: T.warning,
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {p.daysPresent}
                          </span>
                          <span style={{ color: T.mutedFg }}> / {p.calculationDays}</span>
                          <span style={{ fontSize: 10, color: T.mutedFg, marginLeft: 3 }}>
                            days
                          </span>
                        </div>
                        <div
                          style={{
                            height: 3,
                            borderRadius: 2,
                            background: T.muted,
                            marginTop: 4,
                            overflow: 'hidden',
                            width: 70,
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              borderRadius: 2,
                              background: T.warning,
                              width: `${Math.min(100, (p.daysPresent / Math.max(1, p.calculationDays)) * 100)}%`,
                            }}
                          />
                        </div>
                      </td>
                      {aCell(
                        p.weekendWorkDays > 0 ? (
                          <span style={{ fontWeight: 700 }}>{p.weekendWorkDays} days</span>
                        ) : (
                          DASH
                        )
                      )}
                      {aCell(
                        p.holidayWorkDays > 0 ? (
                          <span style={{ fontWeight: 700 }}>{p.holidayWorkDays} days</span>
                        ) : (
                          DASH
                        )
                      )}
                      {aCell(
                        p.overtimeHours > 0 ? (
                          <span style={{ fontWeight: 700 }}>{p.overtimeHours.toFixed(1)} hrs</span>
                        ) : (
                          DASH
                        ),
                        { borderRight: `2px solid ${T.warning}40` }
                      )}

                      {/* Status */}
                      <td style={txtCell()}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: 6,
                            background: T.successBg,
                            color: T.success,
                            border: `1px solid ${T.success}40`,
                          }}
                        >
                          <IconCheck size={10} /> Paid
                        </span>
                      </td>

                      {/* Pay Date */}
                      <td style={txtCell({ fontSize: 12, color: T.fg })}>
                        {p.paidDate
                          ? new Date(p.paidDate).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Totals footer */}
              {sorted.length > 1 && (
                <tfoot>
                  <tr
                    style={{
                      borderTop: `2px solid ${T.border}`,
                      background: 'color-mix(in oklch, var(--card) 96%, var(--foreground))',
                    }}
                  >
                    <td
                      colSpan={3}
                      style={{
                        padding: '11px 14px',
                        fontWeight: 700,
                        color: T.mutedFg,
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      Total · {sorted.length} months
                    </td>
                    {/* Earnings */}
                    <td
                      style={numCell({
                        fontWeight: 700,
                        color: T.success,
                        borderLeft: `2px solid ${T.success}40`,
                      })}
                    >
                      {fmt(sorted.reduce((s, p) => s + p.basic, 0))}
                    </td>
                    <td style={numCell({ color: T.success })}>
                      {fmt(sorted.reduce((s, p) => s + p.hra, 0))}
                    </td>
                    <td style={numCell({ color: T.success })}>
                      {fmt(sorted.reduce((s, p) => s + p.conveyance, 0))}
                    </td>
                    <td style={numCell({ color: T.success })}>
                      {fmt(sorted.reduce((s, p) => s + p.medicalAllowance, 0))}
                    </td>
                    <td
                      style={numCell({ color: T.success, borderRight: `2px solid ${T.success}40` })}
                    >
                      {fmt(sorted.reduce((s, p) => s + p.specialAllowance, 0))}
                    </td>
                    {/* Extra pay */}
                    <td style={numCell({ color: T.mutedFg })}>{DASH}</td>
                    <td style={numCell({ color: T.info })}>
                      {fmt(sorted.reduce((s, p) => s + p.additionalSalary, 0))}
                    </td>
                    <td style={numCell({ color: T.info })}>
                      {fmt(sorted.reduce((s, p) => s + p.otherAllowances, 0))}
                    </td>
                    <td style={numCell({ color: T.info })}>
                      {fmt(sorted.reduce((s, p) => s + p.otPay, 0))}
                    </td>
                    <td style={numCell({ color: T.info })}>
                      {fmt(sorted.reduce((s, p) => s + p.weekendPay, 0))}
                    </td>
                    <td style={numCell({ color: T.info, borderRight: `2px solid ${T.info}40` })}>
                      {fmt(sorted.reduce((s, p) => s + p.holidayPay, 0))}
                    </td>
                    {/* Gross */}
                    <td
                      style={numCell({
                        fontWeight: 700,
                        color: T.primary,
                        borderRight: `2px solid ${T.primary}40`,
                      })}
                    >
                      {fmt(sorted.reduce((s, p) => s + p.grossEarnings, 0))}
                    </td>
                    {/* Deductions */}
                    <td style={numCell({ color: T.danger })}>
                      {fmt(
                        sorted.reduce(
                          (s, p) =>
                            s +
                            (p.deductionBreakdown?.find((d) => isPF(d.id, d.name))?.amount ?? 0),
                          0
                        )
                      )}
                    </td>
                    {otherDeductionDefs.map((def) => (
                      <td key={def.id} style={numCell({ color: T.danger })}>
                        {fmt(
                          sorted.reduce(
                            (s, p) =>
                              s + (p.deductionBreakdown?.find((d) => d.id === def.id)?.amount ?? 0),
                            0
                          )
                        )}
                      </td>
                    ))}
                    <td
                      style={numCell({
                        fontWeight: 700,
                        color: T.danger,
                        borderRight: `2px solid ${T.danger}40`,
                      })}
                    >
                      −{fmt(sorted.reduce((s, p) => s + p.totalDeductions, 0))}
                    </td>
                    {/* Net */}
                    <td
                      style={numCell({
                        fontWeight: 700,
                        color: T.success,
                        fontSize: 13,
                        borderRight: `2px solid ${T.success}40`,
                      })}
                    >
                      {fmt(sorted.reduce((s, p) => s + p.netPay, 0))}
                    </td>
                    {/* Attendance totals */}
                    <td style={numCell({ color: T.warning, fontWeight: 700, textAlign: 'center' })}>
                      {sorted.reduce((s, p) => s + p.daysPresent, 0)} days
                    </td>
                    <td style={numCell({ color: T.warning, fontWeight: 700, textAlign: 'center' })}>
                      {sorted.reduce((s, p) => s + p.weekendWorkDays, 0)} days
                    </td>
                    <td style={numCell({ color: T.warning, fontWeight: 700, textAlign: 'center' })}>
                      {sorted.reduce((s, p) => s + p.holidayWorkDays, 0)} days
                    </td>
                    <td
                      style={numCell({
                        color: T.warning,
                        fontWeight: 700,
                        textAlign: 'center',
                        borderRight: `2px solid ${T.warning}40`,
                      })}
                    >
                      {sorted.reduce((s, p) => s + p.overtimeHours, 0).toFixed(1)} hrs
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
