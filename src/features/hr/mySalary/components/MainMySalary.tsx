'use client';

import {
  IconBell,
  IconCalendar,
  IconCash,
  IconChevronDown,
  IconColumns,
  IconCurrencyRupee,
  IconDownload,
  IconEye,
  IconReceiptTax,
  IconTrendingUp,
  IconWallet,
  IconWorld,
  IconX,
} from '@tabler/icons-react';
import jsPDF from 'jspdf';
import { useMemo, useState } from 'react';
import { useAppSelector } from '@/store/hook';
import { selectUser } from '@/store/slice/userAccountData';
import { useGlobalStructure, useMyPayslips } from '../server/tanstackQuery/useSalaryQueries';
import type { Payslip, SalaryStructure } from '../types/types';
import { ModalPortal } from '@/features/hr/_shared/components';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);

const MONTHS = [
  '',
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

const isPF = (id: string, name: string) =>
  id === 'emp_pf' || name.toLowerCase().includes('pf') || name.toLowerCase().includes('provident');

// ─── PDF ──────────────────────────────────────────────────────────────────────

function downloadPayslipPDF(
  payslip: Payslip,
  struct: SalaryStructure,
  emp: {
    fullName: string;
    email: string;
    employeeId: string;
    joiningDate?: string;
    designation?: string;
  }
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 12; // margin
  const CW = W - M * 2;
  let y = 0;

  // Helvetica cannot render the Rs. glyph — use ASCII prefix
  const money = (n: number) =>
    `Rs. ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)}`;

  type RGB = [number, number, number];
  const fill = (r: number, g: number, b: number) => doc.setFillColor(r, g, b);
  const stroke = (r: number, g: number, b: number) => doc.setDrawColor(r, g, b);
  const color = (r: number, g: number, b: number) => doc.setTextColor(r, g, b);
  const reset = () => doc.setTextColor(0, 0, 0);

  const t = (
    s: string,
    x: number,
    yy: number,
    o?: { align?: 'left' | 'center' | 'right'; size?: number; bold?: boolean; color?: RGB }
  ) => {
    if (o?.color) color(...o.color);
    doc.setFontSize(o?.size ?? 9);
    doc.setFont('helvetica', o?.bold ? 'bold' : 'normal');
    doc.text(s, x, yy, { align: o?.align ?? 'left' });
    if (o?.color) reset();
  };

  // ── Header ────────────────────────────────────────────────────────────────
  fill(15, 23, 42);
  doc.rect(0, 0, W, 30, 'F');
  fill(22, 163, 74);
  doc.rect(0, 27, W, 3, 'F');

  color(255, 255, 255);
  t(struct.company ?? 'Company', W / 2, 12, { align: 'center', size: 16, bold: true });
  color(148, 163, 184);
  t('S A L A R Y   S L I P', W / 2, 20, { align: 'center', size: 8 });
  color(255, 255, 255);
  t(`${MONTHS[payslip.month].toUpperCase()} ${payslip.year}`, W - M, 11, {
    align: 'right',
    size: 9,
    bold: true,
  });
  color(
    payslip.status === 'paid' ? 134 : 251,
    payslip.status === 'paid' ? 239 : 191,
    payslip.status === 'paid' ? 172 : 36
  );
  t(payslip.status === 'paid' ? 'PAID' : 'GENERATED', W - M, 19, { align: 'right', size: 7 });
  reset();
  y = 36;

  // ── Employee Details ──────────────────────────────────────────────────────
  fill(241, 245, 249);
  stroke(203, 213, 225);
  doc.rect(M, y, CW, 7, 'FD');
  t('EMPLOYEE DETAILS', M + 4, y + 4.8, { size: 7.5, bold: true, color: [51, 65, 85] });
  y += 11;

  const HALF = W / 2;
  const LW = 42; // label width before value

  const dRow = (l1: string, v1: string, l2: string, v2: string) => {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    color(100, 116, 139);
    doc.text(l1, M + 2, y);
    doc.text(l2, HALF + 2, y);
    doc.setFont('helvetica', 'bold');
    color(15, 23, 42);
    doc.text(v1, M + 2 + LW, y);
    doc.text(v2, HALF + 2 + LW, y);
    reset();
    y += 6;
  };

  dRow('Employee Code', emp.employeeId, 'Company', struct.company ?? '—');
  dRow('Employee Name', emp.fullName, 'Location', struct.location ?? '—');
  dRow('Designation', emp.designation ?? '—', 'Pay Mode', 'Bank Transfer');
  dRow(
    'Email',
    emp.email,
    'Joining Date',
    emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString('en-IN') : '—'
  );
  dRow(
    'Monthly CTC',
    money(payslip.monthlyCTC),
    'Pay Period',
    `${MONTHS[payslip.month]} ${payslip.year}`
  );
  if (payslip.paidDate) {
    dRow(
      'Payment Status',
      `Paid on ${new Date(payslip.paidDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`,
      '',
      ''
    );
  }
  if (payslip.remarks) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    color(100, 116, 139);
    doc.text(`Remarks: ${payslip.remarks}`, M + 2, y);
    reset();
    y += 6;
  }

  // divider
  y += 2;
  stroke(226, 232, 240);
  doc.line(M, y, W - M, y);
  y += 6;

  // ── Attendance Summary ────────────────────────────────────────────────────
  fill(241, 245, 249);
  stroke(203, 213, 225);
  doc.rect(M, y, CW, 7, 'FD');
  t('ATTENDANCE SUMMARY', M + 4, y + 4.8, { size: 7.5, bold: true, color: [51, 65, 85] });
  y += 10;

  // Attendance boxes: 4 columns
  const attItems = [
    {
      label: 'Working Days Present',
      val: `${payslip.daysPresent} / ${payslip.calculationDays}`,
      color: [15, 23, 42] as RGB,
    },
    {
      label: 'Weekend Worked',
      val: payslip.weekendWorkDays > 0 ? `${payslip.weekendWorkDays} days` : '—',
      color: [30, 58, 138] as RGB,
    },
    {
      label: 'Holiday Worked',
      val: payslip.holidayWorkDays > 0 ? `${payslip.holidayWorkDays} days` : '—',
      color: [88, 28, 135] as RGB,
    },
    {
      label: 'OT Hours Worked',
      val: payslip.overtimeHours > 0 ? `${payslip.overtimeHours} hrs` : '—',
      color: [124, 45, 18] as RGB,
    },
  ];
  const boxW = CW / 4;
  attItems.forEach((item, i) => {
    const bx = M + boxW * i;
    fill(248, 250, 252);
    stroke(226, 232, 240);
    doc.rect(bx, y, boxW, 13, 'FD');
    const cx = bx + boxW / 2;
    t(item.val, cx, y + 6, { align: 'center', size: 9, bold: true, color: item.color });
    t(item.label, cx, y + 11, { align: 'center', size: 6, color: [100, 116, 139] });
  });
  y += 17;

  // ── Earnings / Deductions ─────────────────────────────────────────────────
  const MID = W / 2 + 3;
  const EW = MID - M - 3;
  const DW = W - M - MID;

  fill(30, 58, 138);
  doc.rect(M, y, EW, 8, 'F');
  fill(127, 29, 29);
  doc.rect(MID, y, DW, 8, 'F');
  color(255, 255, 255);
  t('EARNINGS', M + 3, y + 5.5, { size: 7.5, bold: true });
  t('Amount (Rs.)', MID - 3, y + 5.5, { align: 'right', size: 7.5, bold: true });
  t('DEDUCTIONS', MID + 3, y + 5.5, { size: 7.5, bold: true });
  t('Amount (Rs.)', W - M - 1, y + 5.5, { align: 'right', size: 7.5, bold: true });
  reset();
  y += 10;

  const earningsRows: [string, number][] = (
    [
      ['Basic Salary', payslip.basic],
      ['HRA', payslip.hra],
      ['Conveyance', payslip.conveyance],
      ['Medical Allowance', payslip.medicalAllowance],
      ['Special Allowance', payslip.specialAllowance],
      ['Other Allowances', payslip.otherAllowances],
      ['OT Pay', payslip.otPay],
      ['Weekend Pay', payslip.weekendPay],
      ['Holiday Pay', payslip.holidayPay],
    ] as [string, number][]
  ).filter(([, v]) => v > 0);

  const deductionRows: [string, number][] = (payslip.deductionBreakdown ?? []).map((d) => [
    `${d.name} (${d.percent}%)`,
    d.amount,
  ]);

  const maxRows = Math.max(earningsRows.length, deductionRows.length);
  for (let i = 0; i < maxRows; i++) {
    if (i % 2 === 0) {
      fill(248, 250, 252);
      doc.rect(M, y, EW, 6, 'F');
      fill(255, 250, 250);
      doc.rect(MID, y, DW, 6, 'F');
    }
    const e = earningsRows[i];
    const d = deductionRows[i];
    if (e) {
      t(e[0], M + 2, y + 4.2, { size: 8, color: [51, 65, 85] });
      t(money(e[1]), MID - 3, y + 4.2, {
        align: 'right',
        size: 8,
        bold: true,
        color: [22, 101, 52],
      });
    }
    if (d) {
      t(d[0], MID + 2, y + 4.2, { size: 8, color: [51, 65, 85] });
      t(money(d[1]), W - M - 1, y + 4.2, {
        align: 'right',
        size: 8,
        bold: true,
        color: [153, 27, 27],
      });
    }
    y += 6;
  }

  // totals row
  stroke(203, 213, 225);
  doc.line(M, y, W - M, y);
  y += 2;
  fill(220, 252, 231);
  doc.rect(M, y, EW, 7, 'F');
  fill(254, 226, 226);
  doc.rect(MID, y, DW, 7, 'F');
  t('Gross Earnings', M + 2, y + 4.8, { size: 8.5, bold: true, color: [22, 101, 52] });
  t(money(payslip.grossEarnings), MID - 3, y + 4.8, {
    align: 'right',
    size: 8.5,
    bold: true,
    color: [22, 101, 52],
  });
  t('Total Deductions', MID + 2, y + 4.8, { size: 8.5, bold: true, color: [153, 27, 27] });
  t(money(payslip.totalDeductions), W - M - 1, y + 4.8, {
    align: 'right',
    size: 8.5,
    bold: true,
    color: [153, 27, 27],
  });
  y += 11;

  // ── Net Pay Banner — 3 columns, nothing chopped ───────────────────────────
  fill(21, 128, 61);
  doc.rect(M, y, CW, 20, 'F');

  const third = CW / 3;
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.3);
  doc.line(M + third, y + 4, M + third, y + 16);
  doc.line(M + third * 2, y + 4, M + third * 2, y + 16);
  doc.setLineWidth(0.2);

  const c1 = M + third * 0.5;
  const c2 = M + third * 1.5;
  const c3 = M + third * 2.5;

  t('IN-HAND SALARY', c1, y + 6.5, { align: 'center', size: 6.5, color: [187, 247, 208] });
  t(money(payslip.netPay), c1, y + 14, {
    align: 'center',
    size: 10,
    bold: true,
    color: [255, 255, 255],
  });
  t('GROSS EARNINGS', c2, y + 6.5, { align: 'center', size: 6.5, color: [187, 247, 208] });
  t(money(payslip.grossEarnings), c2, y + 14, {
    align: 'center',
    size: 9,
    bold: true,
    color: [255, 255, 255],
  });
  t('TOTAL DEDUCTIONS', c3, y + 6.5, { align: 'center', size: 6.5, color: [187, 247, 208] });
  t(money(payslip.totalDeductions), c3, y + 14, {
    align: 'center',
    size: 9,
    bold: true,
    color: [255, 255, 255],
  });
  reset();
  y += 24;

  // ── Mid-month note ────────────────────────────────────────────────────────
  if (payslip.daysPresent < payslip.calculationDays) {
    fill(255, 251, 235);
    stroke(251, 191, 36);
    doc.rect(M, y, CW, 10, 'FD');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    color(146, 64, 14);
    doc.text(
      `Mid-Month: Covers ${payslip.daysPresent} of ${payslip.calculationDays} days. Remaining ${payslip.calculationDays - payslip.daysPresent} day(s) need a separate payslip.`,
      W / 2,
      y + 6.5,
      { align: 'center' }
    );
    reset();
    y += 14;
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  color(148, 163, 184);
  doc.text('This is a computer-generated salary slip. No signature required.', W / 2, y, {
    align: 'center',
  });
  reset();
  doc.save(`Payslip_${MONTHS[payslip.month]}_${payslip.year}_${emp.employeeId}.pdf`);
}

// ─── Payslip View Modal ───────────────────────────────────────────────────────

function PayslipViewModal({
  slip,
  empInfo,
  onClose,
  onDownload,
}: {
  slip: Payslip;
  empInfo: {
    fullName: string;
    email: string;
    employeeId: string;
    joiningDate?: string;
    designation?: string;
    department?: string;
  };
  onClose: () => void;
  onDownload: () => void;
}) {
  const statusCfg =
    slip.status === 'paid'
      ? { label: 'Paid', bg: 'bg-success/10', text: 'text-success', border: 'border-success/30' }
      : {
          label: 'Pending',
          bg: 'bg-warning/10',
          text: 'text-warning',
          border: 'border-warning/30',
        };

  const earnings: { label: string; amount: number; accent?: string }[] = [
    { label: 'Basic Salary', amount: slip.basic },
    { label: 'HRA', amount: slip.hra },
    { label: 'Conveyance Allowance', amount: slip.conveyance },
    { label: 'Medical Allowance', amount: slip.medicalAllowance },
    { label: 'Special Allowance', amount: slip.specialAllowance },
    ...(slip.otherAllowances > 0
      ? [{ label: 'Other Allowances', amount: slip.otherAllowances }]
      : []),
    ...(slip.otPay > 0
      ? [
          {
            label: `Overtime Pay (${slip.overtimeHours}h)`,
            amount: slip.otPay,
            accent: 'text-orange-500',
          },
        ]
      : []),
    ...(slip.weekendPay > 0
      ? [
          {
            label: `Weekend Work Pay (${slip.weekendWorkDays}d)`,
            amount: slip.weekendPay,
            accent: 'text-blue-500',
          },
        ]
      : []),
    ...(slip.holidayPay > 0
      ? [
          {
            label: `Holiday Work Pay (${slip.holidayWorkDays}d)`,
            amount: slip.holidayPay,
            accent: 'text-purple-500',
          },
        ]
      : []),
    ...(slip.additionalSalary > 0 && !(slip.otPay > 0 || slip.weekendPay > 0 || slip.holidayPay > 0)
      ? [{ label: 'Bonus / Additional', amount: slip.additionalSalary }]
      : []),
  ];

  const deductions = slip.deductionBreakdown ?? [];

  return (
    <ModalPortal>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Payslip details"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      tabIndex={-1}
    >
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* Modal header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-[15px] font-bold">
              Payslip — {MONTHS[slip.month]} {slip.year}
            </h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Pay period · {empInfo.fullName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onDownload}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-muted px-3 text-[12px] font-semibold text-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors"
            >
              <IconDownload className="h-3.5 w-3.5" />
              Download PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
            >
              <IconX className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {/* Company banner */}
          <div className="bg-gradient-to-r from-primary to-primary/75 px-6 py-5 text-primary-foreground">
            <p className="text-[18px] font-bold tracking-tight">
              {slip.salaryStructure?.company ?? 'Company'}
            </p>
            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] opacity-80">
              Salary Slip · {MONTHS[slip.month]} {slip.year}
            </p>
          </div>

          <div className="space-y-5 px-6 py-5">
            {/* Status + pay date row */}
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.05em] ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
              >
                {statusCfg.label}
              </span>
              {slip.paidDate && (
                <span className="text-[12px] text-muted-foreground">
                  Paid on{' '}
                  {new Date(slip.paidDate).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              )}
            </div>

            {/* Employee details grid */}
            <div className="overflow-hidden rounded-xl border border-border">
              <div className="border-b border-border bg-muted/40 px-4 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                  Employee Details
                </p>
              </div>
              <div className="grid grid-cols-2 divide-x divide-border sm:grid-cols-3">
                {[
                  { label: 'Employee Code', value: empInfo.employeeId },
                  { label: 'Full Name', value: empInfo.fullName },
                  { label: 'Email', value: empInfo.email },
                  { label: 'Designation', value: empInfo.designation ?? '—' },
                  { label: 'Department', value: empInfo.department ?? '—' },
                  {
                    label: 'Joining Date',
                    value: empInfo.joiningDate
                      ? new Date(empInfo.joiningDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—',
                  },
                  { label: 'Monthly CTC', value: fmt(slip.monthlyCTC) },
                  {
                    label: 'Working Days Present',
                    value: `${slip.daysPresent} / ${slip.calculationDays}`,
                  },
                  {
                    label: 'Pay Mode',
                    value: 'Bank Transfer',
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="border-b border-border px-4 py-3 last:border-b-0"
                  >
                    <p className="text-[9px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                      {item.label}
                    </p>
                    <p className="mt-0.5 truncate text-[12px] font-semibold">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Attendance summary */}
            <div className="grid grid-cols-4 gap-2 rounded-xl border border-border bg-muted/30 p-3">
              {[
                {
                  label: 'Working Days Present',
                  value: `${slip.daysPresent} / ${slip.calculationDays}`,
                  color: 'text-foreground',
                },
                {
                  label: 'Weekend Worked',
                  value: slip.weekendWorkDays > 0 ? `${slip.weekendWorkDays}d` : '—',
                  color: 'text-blue-500',
                },
                {
                  label: 'Holiday Worked',
                  value: slip.holidayWorkDays > 0 ? `${slip.holidayWorkDays}d` : '—',
                  color: 'text-purple-500',
                },
                {
                  label: 'OT Hours Worked',
                  value: slip.overtimeHours > 0 ? `${slip.overtimeHours}h` : '—',
                  color: 'text-orange-500',
                },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <p className={`text-[15px] font-bold tabular-nums ${item.color}`}>{item.value}</p>
                  <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Earnings & Deductions side-by-side */}
            <div className="overflow-hidden rounded-xl border border-border">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-[12px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th
                        colSpan={2}
                        className="border-r border-border bg-success/5 px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.06em] text-success"
                      >
                        Earnings
                      </th>
                      <th
                        colSpan={2}
                        className="bg-destructive/5 px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.06em] text-destructive"
                      >
                        Deductions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {Array.from({ length: Math.max(earnings.length, deductions.length) }).map(
                      (_, i) => {
                        const e = earnings[i];
                        const d = deductions[i];
                        return (
                          <tr key={i} className={i % 2 === 1 ? 'bg-muted/20' : ''}>
                            <td
                              className={`w-[28%] border-r border-border/60 px-4 py-2.5 ${e?.accent ?? 'text-muted-foreground'}`}
                            >
                              {e?.label ?? ''}
                            </td>
                            <td
                              className={`w-[22%] border-r border-border px-4 py-2.5 text-right font-medium tabular-nums ${e?.accent ?? ''}`}
                            >
                              {e ? fmt(e.amount) : ''}
                            </td>
                            <td className="w-[28%] border-r border-border/60 px-4 py-2.5 text-muted-foreground">
                              {d ? (
                                <>
                                  {d.name}{' '}
                                  <span className="text-[10px] opacity-60">({d.percent}%)</span>
                                </>
                              ) : (
                                ''
                              )}
                            </td>
                            <td className="w-[22%] px-4 py-2.5 text-right font-medium tabular-nums text-destructive">
                              {d ? `−${fmt(d.amount)}` : ''}
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-muted/40 font-semibold">
                      <td className="border-r border-border/60 px-4 py-3 text-success">
                        Gross Earnings
                      </td>
                      <td className="border-r border-border px-4 py-3 text-right tabular-nums text-success">
                        {fmt(slip.grossEarnings)}
                      </td>
                      <td className="border-r border-border/60 px-4 py-3 text-destructive">
                        Total Deductions
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-destructive">
                        −{fmt(slip.totalDeductions)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Net Pay */}
            <div className="flex flex-col gap-2 rounded-xl border-2 border-primary/25 bg-primary/5 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                  In-Hand Salary
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Gross {fmt(slip.grossEarnings)} − Deductions {fmt(slip.totalDeductions)}
                </p>
              </div>
              <p className="shrink-0 whitespace-nowrap text-[22px] font-bold tabular-nums tracking-tight text-primary sm:text-[30px]">
                {fmt(slip.netPay)}
              </p>
            </div>

            {slip.remarks && (
              <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-[12px] text-muted-foreground">
                <span className="font-semibold text-foreground">Remarks:</span> {slip.remarks}
              </p>
            )}

            <p className="text-center text-[10px] text-muted-foreground">
              This is a computer-generated salary slip and does not require a signature.
            </p>
          </div>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const MainMySalary = () => {
  const user = useAppSelector(selectUser);
  const employeeId = user?.employeeId ?? '';
  const fullName = (user?.name as string | undefined) || user?.fullName || '';
  const email = user?.email ?? '';

  // Featured period: prev month on the 1st of each month, else current month
  const today = new Date();
  const isFirstOfMonth = today.getDate() === 1;
  const featuredMonth = isFirstOfMonth
    ? today.getMonth() === 0
      ? 12
      : today.getMonth()
    : today.getMonth() + 1;
  const featuredYear =
    isFirstOfMonth && today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();

  const { data: structure } = useGlobalStructure();
  const { data: payslips, isLoading: slipsLoading } = useMyPayslips(employeeId);

  const [selectedYear, setSelectedYear] = useState(featuredYear);
  const [viewSlip, setViewSlip] = useState<Payslip | null>(null);
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  const [colPickerOpen, setColPickerOpen] = useState(false);

  const vis = (id: string) => !hiddenCols.has(id);
  const toggleCol = (id: string) => {
    setHiddenCols((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const displayStruct = structure ?? null;

  // Joining date determines the first visible row
  const joiningDateStr = (user as Record<string, unknown>)?.joiningDate as string | undefined;
  const joiningDate = joiningDateStr
    ? new Date(joiningDateStr)
    : new Date(today.getFullYear(), 0, 1);
  const joiningYear = joiningDate.getFullYear();
  const joiningMon = joiningDate.getMonth() + 1;

  // All months in the selected year to show as rows (newest first, from joining month)
  const allMonthsInYear = useMemo(() => {
    if (selectedYear < joiningYear) return [];
    const rows: { month: number; year: number }[] = [];
    for (let m = 12; m >= 1; m--) {
      if (selectedYear === featuredYear && m > featuredMonth) continue;
      if (selectedYear === joiningYear && m < joiningMon) continue;
      rows.push({ month: m, year: selectedYear });
    }
    return rows;
  }, [selectedYear, featuredYear, featuredMonth, joiningYear, joiningMon]);

  // Year range: joining year → featured year
  const yearOptions = useMemo(() => {
    const ys: number[] = [];
    for (let y = featuredYear; y >= joiningYear; y--) ys.push(y);
    return ys;
  }, [featuredYear, joiningYear]);

  // Fast payslip lookup: "year-month" → Payslip
  const payslipMap = useMemo(() => {
    const map = new Map<string, Payslip>();
    for (const s of payslips ?? []) map.set(`${s.year}-${s.month}`, s);
    return map;
  }, [payslips]);

  // Unique non-PF deduction types across all payslips (for dynamic columns)
  const otherDeductionDefs = useMemo(() => {
    const seen = new Map<string, string>();
    for (const p of payslips ?? []) {
      for (const d of p.deductionBreakdown ?? []) {
        if (!isPF(d.id, d.name) && !seen.has(d.id)) seen.set(d.id, d.name);
      }
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [payslips]);

  // Column groups definition (for the picker and colSpan calculation)
  const colGroups = useMemo(
    () => [
      {
        label: 'Period',
        cols: [
          { id: 'emp_id', label: 'Emp ID' },
          { id: 'name', label: 'Name' },
          { id: 'year', label: 'Year' },
          { id: 'month', label: 'Month' },
        ],
      },
      {
        label: 'Earnings',
        cols: [
          { id: 'basic', label: 'Basic' },
          { id: 'hra', label: 'HRA' },
          { id: 'conveyance', label: 'Conveyance' },
          { id: 'medical', label: 'Medical' },
          { id: 'special', label: 'Special Allow.' },
        ],
      },
      {
        label: 'Extra Pay',
        cols: [
          { id: 'lta', label: 'LTA' },
          { id: 'bonus', label: 'Bonus' },
          { id: 'other_allow', label: 'Other Allow.' },
          { id: 'overtime', label: 'OT Pay' },
          { id: 'weekend_pay', label: 'Weekend Pay' },
          { id: 'holiday_pay', label: 'Holiday Pay' },
        ],
      },
      {
        label: 'Summary',
        cols: [
          { id: 'gross', label: 'Gross Salary' },
          { id: 'net_pay', label: 'In-Hand Salary' },
        ],
      },
      {
        label: 'Deductions',
        cols: [
          { id: 'pf', label: 'PF' },
          ...otherDeductionDefs.map((d) => ({ id: `deduction_${d.id}`, label: d.name })),
          { id: 'total_deductions', label: 'Total Deduct.' },
        ],
      },
      {
        label: 'Info',
        cols: [
          { id: 'status', label: 'Status' },
          { id: 'pay_date', label: 'Pay Date' },
        ],
      },
    ],
    [otherDeductionDefs]
  );

  // Dynamic colSpan for each group header (counts visible columns in group)
  const gSpan = (ids: string[]) => ids.filter((id) => !hiddenCols.has(id)).length;

  // Column IDs per group (for header colSpan)
  const periodIds = ['action', 'emp_id', 'name', 'year', 'month'];
  const earningsIds = ['basic', 'hra', 'conveyance', 'medical', 'special'];
  const extraIds = ['lta', 'bonus', 'other_allow', 'overtime', 'weekend_pay', 'holiday_pay'];
  const deductionIds = [
    'pf',
    ...otherDeductionDefs.map((d) => `deduction_${d.id}`),
    'total_deductions',
  ];

  // YTD aggregates for selected year
  const yearPayslips = useMemo(
    () => (payslips ?? []).filter((s) => s.year === selectedYear),
    [payslips, selectedYear]
  );

  const stats = useMemo(() => {
    const gross = yearPayslips.reduce((a, s) => a + s.grossEarnings, 0);
    const net = yearPayslips.reduce((a, s) => a + s.netPay, 0);
    const ded = yearPayslips.reduce((a, s) => a + s.totalDeductions, 0);
    return { gross, net, ded, lastNet: yearPayslips[0]?.netPay ?? 0 };
  }, [yearPayslips]);

  const statCards = [
    {
      label: 'Last In-Hand Salary',
      value: fmt(stats.lastNet),
      sub: yearPayslips[0] ? `${MONTHS[yearPayslips[0].month]} ${yearPayslips[0].year}` : '—',
      Icon: IconWallet,
      tint: 'bg-success/10 text-success',
      valueColor: 'text-success',
    },
    {
      label: 'YTD Gross',
      value: fmt(stats.gross),
      sub: `${yearPayslips.length} payslip${yearPayslips.length === 1 ? '' : 's'}`,
      Icon: IconTrendingUp,
      tint: 'bg-primary/10 text-primary',
      valueColor: 'text-foreground',
    },
    {
      label: 'YTD Net',
      value: fmt(stats.net),
      sub: 'After deductions',
      Icon: IconCurrencyRupee,
      tint: 'bg-primary/10 text-primary',
      valueColor: 'text-primary',
    },
    {
      label: 'YTD Deductions',
      value: fmt(stats.ded),
      sub: 'PF & ESIC',
      Icon: IconReceiptTax,
      tint: 'bg-destructive/10 text-destructive',
      valueColor: 'text-destructive',
    },
  ];

  return (
    <div className="bg-background text-foreground grow">
      <div className="mx-auto max-w-350 space-y-5 px-4 pt-6 pb-10 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="mb-0.5 text-[12px] text-muted-foreground">Payroll</p>
            <h1 className="text-[18px] font-bold leading-tight tracking-[-0.03em] sm:text-[22px]">
              My Salary
            </h1>
          </div>
        </div>

        {/* Hero */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/12 text-primary">
                <IconCash className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-[18px] font-bold tracking-[-0.02em]">Salary & Payslips</h2>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  {displayStruct
                    ? `Basic: ${displayStruct.basicPercent}% · HRA: ${displayStruct.hraPercent}% · Conv: ${displayStruct.conveyancePercent}% · Medical: ${displayStruct.medicalPercent}% · Special: ${displayStruct.specialAllowancePercent}% · ${displayStruct.deductions?.filter((d) => d.active).length ?? 0} deduction(s) active`
                    : 'No global salary structure configured yet'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <IconChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="h-10 cursor-pointer appearance-none rounded-lg border border-border bg-muted px-4 pr-9 text-[13px] font-medium text-foreground outline-none transition-colors focus:border-primary"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
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
                className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-[9px] ${s.tint}`}
              >
                <s.Icon className="h-5.5 w-5.5" />
              </div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                {s.label}
              </p>
              <p
                className={`whitespace-nowrap text-[18px] font-bold leading-none tracking-[-0.02em] tabular-nums sm:text-[22px] ${s.valueColor}`}
              >
                {s.value}
              </p>
              <p className="mt-1.5 text-[10px] text-muted-foreground">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Salary History */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <div className="border-b border-border px-5 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <IconCalendar className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-[14px] font-semibold">Salary History</h2>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {yearPayslips.length} of {allMonthsInYear.length} month
                  {allMonthsInYear.length === 1 ? '' : 's'} generated for {selectedYear}
                </p>
              </div>

              {/* Column visibility picker */}
              <div className="relative ml-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setColPickerOpen((p) => !p)}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[11px] font-semibold transition-colors ${
                    hiddenCols.size > 0
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : 'border-border bg-muted text-muted-foreground hover:bg-muted-foreground/10'
                  }`}
                >
                  <IconColumns className="h-3.5 w-3.5" />
                  Columns
                  {hiddenCols.size > 0 && (
                    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-white">
                      {hiddenCols.size}
                    </span>
                  )}
                </button>

                {colPickerOpen && (
                  <>
                    {/* Backdrop */}
                    <button
                      type="button"
                      aria-label="Close column picker"
                      className="fixed inset-0 z-30 cursor-default border-none bg-transparent"
                      onClick={() => setColPickerOpen(false)}
                    />
                    {/* Panel */}
                    <div className="absolute right-0 top-10 z-40 w-80 rounded-xl border border-border bg-card p-4 shadow-2xl">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-[12px] font-semibold text-foreground">Visible Columns</p>
                        {hiddenCols.size > 0 && (
                          <button
                            type="button"
                            onClick={() => setHiddenCols(new Set())}
                            className="text-[11px] font-semibold text-primary hover:underline"
                          >
                            Show all
                          </button>
                        )}
                      </div>
                      <div className="space-y-3">
                        {colGroups.map((group) => (
                          <div key={group.label}>
                            <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.07em] text-muted-foreground">
                              {group.label}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {group.cols.map((col) => {
                                const isVisible = !hiddenCols.has(col.id);
                                return (
                                  <button
                                    key={col.id}
                                    type="button"
                                    onClick={() => toggleCol(col.id)}
                                    className={`rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${
                                      isVisible
                                        ? 'border-primary/30 bg-primary/8 text-primary'
                                        : 'border-border bg-muted text-muted-foreground/50 line-through'
                                    }`}
                                  >
                                    {col.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {slipsLoading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <div className="h-8 w-16 animate-pulse rounded-md bg-muted" />
                  <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                  <div className="ml-auto flex gap-6">
                    {Array.from({ length: 8 }).map((__, j) => (
                      <div key={j} className="h-4 w-20 animate-pulse rounded bg-muted" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : allMonthsInYear.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="border-collapse text-[12px]">
                <thead>
                  {/* Row 1 — group labels (colSpan shrinks with hidden cols) */}
                  <tr className="border-b border-border/50">
                    {gSpan(periodIds) > 0 && (
                      <th
                        colSpan={gSpan(periodIds)}
                        className="border-r border-border bg-muted/30 px-4 py-1.5 text-left text-[9px] font-bold uppercase tracking-[0.07em] text-muted-foreground"
                      >
                        Period
                      </th>
                    )}
                    {gSpan(earningsIds) > 0 && (
                      <th
                        colSpan={gSpan(earningsIds)}
                        className="border-r border-border bg-success/10 px-4 py-1.5 text-left text-[9px] font-bold uppercase tracking-[0.07em] text-success"
                      >
                        Earnings Components
                      </th>
                    )}
                    {gSpan(extraIds) > 0 && (
                      <th
                        colSpan={gSpan(extraIds)}
                        className="border-r border-border bg-blue-500/10 px-4 py-1.5 text-left text-[9px] font-bold uppercase tracking-[0.07em] text-blue-600"
                      >
                        Extra Pay
                      </th>
                    )}
                    {vis('gross') && (
                      <th className="border-r border-border bg-primary/10 px-4 py-1.5 text-center text-[9px] font-bold uppercase tracking-[0.07em] text-primary">
                        Gross
                      </th>
                    )}
                    {gSpan(deductionIds) > 0 && (
                      <th
                        colSpan={gSpan(deductionIds)}
                        className="border-r border-border bg-destructive/10 px-4 py-1.5 text-left text-[9px] font-bold uppercase tracking-[0.07em] text-destructive"
                      >
                        Deductions
                      </th>
                    )}
                    {vis('net_pay') && (
                      <th className="border-r border-border bg-success/10 px-4 py-1.5 text-center text-[9px] font-bold uppercase tracking-[0.07em] text-success">
                        In-Hand Salary
                      </th>
                    )}
                    {gSpan(['status', 'pay_date']) > 0 && (
                      <th
                        colSpan={gSpan(['status', 'pay_date'])}
                        className="bg-muted/30 px-4 py-1.5 text-left text-[9px] font-bold uppercase tracking-[0.07em] text-muted-foreground"
                      >
                        Info
                      </th>
                    )}
                  </tr>
                  {/* Row 2 — column names */}
                  <tr className="border-b border-border bg-muted/20">
                    {/* Period — Action is always visible */}
                    <th className="whitespace-nowrap px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                      Action
                    </th>
                    {vis('emp_id') && (
                      <th className="whitespace-nowrap px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                        Emp ID
                      </th>
                    )}
                    {vis('name') && (
                      <th className="whitespace-nowrap px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                        Name
                      </th>
                    )}
                    {vis('year') && (
                      <th className="whitespace-nowrap px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                        Year
                      </th>
                    )}
                    {vis('month') && (
                      <th className="whitespace-nowrap border-r border-border px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                        Month
                      </th>
                    )}
                    {/* Earnings */}
                    {vis('basic') && (
                      <th className="whitespace-nowrap px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.04em] text-success/80">
                        Basic
                      </th>
                    )}
                    {vis('hra') && (
                      <th className="whitespace-nowrap px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.04em] text-success/80">
                        HRA
                      </th>
                    )}
                    {vis('conveyance') && (
                      <th className="whitespace-nowrap px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.04em] text-success/80">
                        Conveyance
                      </th>
                    )}
                    {vis('medical') && (
                      <th className="whitespace-nowrap px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.04em] text-success/80">
                        Medical
                      </th>
                    )}
                    {vis('special') && (
                      <th className="whitespace-nowrap border-r border-border px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.04em] text-success/80">
                        Special Allow.
                      </th>
                    )}
                    {/* Extra Pay */}
                    {vis('lta') && (
                      <th className="whitespace-nowrap px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.04em] text-blue-500/80">
                        LTA
                      </th>
                    )}
                    {vis('bonus') && (
                      <th className="whitespace-nowrap px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.04em] text-blue-500/80">
                        Bonus
                      </th>
                    )}
                    {vis('other_allow') && (
                      <th className="whitespace-nowrap px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.04em] text-blue-500/80">
                        Other Allow.
                      </th>
                    )}
                    {vis('overtime') && (
                      <th className="whitespace-nowrap px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.04em] text-orange-500/80">
                        OT Pay
                      </th>
                    )}
                    {vis('weekend_pay') && (
                      <th className="whitespace-nowrap px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.04em] text-blue-500/80">
                        Weekend Pay
                      </th>
                    )}
                    {vis('holiday_pay') && (
                      <th className="whitespace-nowrap border-r border-border px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.04em] text-purple-500/80">
                        Holiday Pay
                      </th>
                    )}
                    {/* Gross */}
                    {vis('gross') && (
                      <th className="whitespace-nowrap border-r border-border px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.04em] text-primary">
                        Gross Salary
                      </th>
                    )}
                    {/* Deductions */}
                    {vis('pf') && (
                      <th className="whitespace-nowrap px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.04em] text-destructive/80">
                        PF
                      </th>
                    )}
                    {otherDeductionDefs.map(
                      (d) =>
                        vis(`deduction_${d.id}`) && (
                          <th
                            key={d.id}
                            className="whitespace-nowrap px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.04em] text-destructive/80"
                          >
                            {d.name}
                          </th>
                        )
                    )}
                    {vis('total_deductions') && (
                      <th className="whitespace-nowrap border-r border-border px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.04em] text-destructive">
                        Total Deduct.
                      </th>
                    )}
                    {/* Net Pay */}
                    {vis('net_pay') && (
                      <th className="whitespace-nowrap border-r border-border px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.04em] text-success">
                        In-Hand Salary
                      </th>
                    )}
                    {/* Info */}
                    {vis('status') && (
                      <th className="whitespace-nowrap px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                        Status
                      </th>
                    )}
                    {vis('pay_date') && (
                      <th className="whitespace-nowrap px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                        Pay Date
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {allMonthsInYear.map(({ month, year }) => {
                    const slip = payslipMap.get(`${year}-${month}`);
                    const isFeatured = month === featuredMonth && year === featuredYear;

                    if (slip) {
                      const pfItem = slip.deductionBreakdown?.find((d) => isPF(d.id, d.name));
                      const pfAmount = pfItem?.amount ?? 0;

                      const statusCfg =
                        slip.status === 'paid'
                          ? { label: 'Paid', cls: 'bg-success/10 text-success border-success/30' }
                          : {
                              label: 'Pending',
                              cls: 'bg-warning/10 text-warning border-warning/30',
                            };

                      return (
                        <tr
                          key={`${year}-${month}`}
                          className={`transition-colors hover:bg-muted/30 ${isFeatured ? 'bg-primary/5' : ''}`}
                        >
                          {/* Action — always visible */}
                          <td className="whitespace-nowrap px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                aria-label="View payslip"
                                onClick={() => setViewSlip(slip)}
                                className="inline-flex h-7 items-center gap-1.5 rounded-md border border-primary/40 bg-primary/5 px-2.5 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/15"
                              >
                                <IconEye className="h-3 w-3" />
                                View
                              </button>
                              <button
                                type="button"
                                aria-label="Download PDF payslip"
                                onClick={() =>
                                  downloadPayslipPDF(slip, slip.salaryStructure, {
                                    fullName,
                                    email,
                                    employeeId,
                                    joiningDate: joiningDateStr,
                                  })
                                }
                                className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-muted px-2.5 text-[11px] font-semibold text-foreground transition-colors hover:bg-muted-foreground/10"
                              >
                                <IconDownload className="h-3 w-3" />
                                PDF
                              </button>
                            </div>
                          </td>
                          {vis('emp_id') && (
                            <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-muted-foreground">
                              {employeeId || '—'}
                            </td>
                          )}
                          {vis('name') && (
                            <td className="whitespace-nowrap px-4 py-3 font-semibold">
                              {fullName || email || '—'}
                            </td>
                          )}
                          {vis('year') && (
                            <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                              {slip.year}
                            </td>
                          )}
                          {vis('month') && (
                            <td className="whitespace-nowrap border-r border-border px-4 py-3">
                              {MONTHS[slip.month]}
                              {isFeatured && (
                                <span className="ml-2 inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                                  Latest
                                </span>
                              )}
                            </td>
                          )}
                          {/* EARNINGS */}
                          {vis('basic') && (
                            <td className="whitespace-nowrap bg-success/5 px-4 py-3 text-right tabular-nums text-success">
                              {fmt(slip.basic)}
                            </td>
                          )}
                          {vis('hra') && (
                            <td className="whitespace-nowrap bg-success/5 px-4 py-3 text-right tabular-nums text-success">
                              {slip.hra > 0 ? (
                                fmt(slip.hra)
                              ) : (
                                <span className="text-muted-foreground/50">—</span>
                              )}
                            </td>
                          )}
                          {vis('conveyance') && (
                            <td className="whitespace-nowrap bg-success/5 px-4 py-3 text-right tabular-nums text-success">
                              {slip.conveyance > 0 ? (
                                fmt(slip.conveyance)
                              ) : (
                                <span className="text-muted-foreground/50">—</span>
                              )}
                            </td>
                          )}
                          {vis('medical') && (
                            <td className="whitespace-nowrap bg-success/5 px-4 py-3 text-right tabular-nums text-success">
                              {slip.medicalAllowance > 0 ? (
                                fmt(slip.medicalAllowance)
                              ) : (
                                <span className="text-muted-foreground/50">—</span>
                              )}
                            </td>
                          )}
                          {vis('special') && (
                            <td className="whitespace-nowrap border-r border-border bg-success/5 px-4 py-3 text-right tabular-nums text-success">
                              {slip.specialAllowance > 0 ? (
                                fmt(slip.specialAllowance)
                              ) : (
                                <span className="text-muted-foreground/50">—</span>
                              )}
                            </td>
                          )}
                          {/* EXTRA PAY */}
                          {vis('lta') && (
                            <td className="whitespace-nowrap bg-blue-500/5 px-4 py-3 text-right tabular-nums text-muted-foreground">
                              —
                            </td>
                          )}
                          {vis('bonus') && (
                            <td className="whitespace-nowrap bg-blue-500/5 px-4 py-3 text-right tabular-nums text-blue-600">
                              {slip.additionalSalary > 0 ? (
                                fmt(slip.additionalSalary)
                              ) : (
                                <span className="text-muted-foreground/50">—</span>
                              )}
                            </td>
                          )}
                          {vis('other_allow') && (
                            <td className="whitespace-nowrap bg-blue-500/5 px-4 py-3 text-right tabular-nums text-blue-600">
                              {slip.otherAllowances > 0 ? (
                                fmt(slip.otherAllowances)
                              ) : (
                                <span className="text-muted-foreground/50">—</span>
                              )}
                            </td>
                          )}
                          {vis('overtime') && (
                            <td className="whitespace-nowrap bg-orange-500/5 px-4 py-3 text-right tabular-nums text-orange-500">
                              {slip.otPay > 0 ? (
                                fmt(slip.otPay)
                              ) : (
                                <span className="text-muted-foreground/50">—</span>
                              )}
                            </td>
                          )}
                          {vis('weekend_pay') && (
                            <td className="whitespace-nowrap bg-blue-500/5 px-4 py-3 text-right tabular-nums text-blue-600">
                              {slip.weekendPay > 0 ? (
                                fmt(slip.weekendPay)
                              ) : (
                                <span className="text-muted-foreground/50">—</span>
                              )}
                            </td>
                          )}
                          {vis('holiday_pay') && (
                            <td className="whitespace-nowrap border-r border-border bg-purple-500/5 px-4 py-3 text-right tabular-nums text-purple-600">
                              {slip.holidayPay > 0 ? (
                                fmt(slip.holidayPay)
                              ) : (
                                <span className="text-muted-foreground/50">—</span>
                              )}
                            </td>
                          )}
                          {/* GROSS */}
                          {vis('gross') && (
                            <td className="whitespace-nowrap border-r border-border bg-primary/5 px-4 py-3 text-right tabular-nums font-semibold text-primary">
                              {fmt(slip.grossEarnings)}
                            </td>
                          )}
                          {/* DEDUCTIONS */}
                          {vis('pf') && (
                            <td className="whitespace-nowrap bg-destructive/5 px-4 py-3 text-right tabular-nums text-destructive">
                              {pfAmount > 0 ? (
                                `−${fmt(pfAmount)}`
                              ) : (
                                <span className="text-muted-foreground/50">—</span>
                              )}
                            </td>
                          )}
                          {otherDeductionDefs.map((def) => {
                            if (!vis(`deduction_${def.id}`)) return null;
                            const item = slip.deductionBreakdown?.find((d) => d.id === def.id);
                            return (
                              <td
                                key={def.id}
                                className="whitespace-nowrap bg-destructive/5 px-4 py-3 text-right tabular-nums text-destructive"
                              >
                                {item && item.amount > 0 ? (
                                  `−${fmt(item.amount)}`
                                ) : (
                                  <span className="text-muted-foreground/50">—</span>
                                )}
                              </td>
                            );
                          })}
                          {vis('total_deductions') && (
                            <td className="whitespace-nowrap border-r border-border bg-destructive/5 px-4 py-3 text-right tabular-nums font-semibold text-destructive">
                              −{fmt(slip.totalDeductions)}
                            </td>
                          )}
                          {/* NET PAY */}
                          {vis('net_pay') && (
                            <td className="whitespace-nowrap border-r border-border bg-success/5 px-4 py-3 text-right tabular-nums font-bold text-success">
                              {fmt(slip.netPay)}
                            </td>
                          )}
                          {/* STATUS */}
                          {vis('status') && (
                            <td className="whitespace-nowrap px-4 py-3">
                              <span
                                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] ${statusCfg.cls}`}
                              >
                                {statusCfg.label}
                              </span>
                            </td>
                          )}
                          {/* PAY DATE */}
                          {vis('pay_date') && (
                            <td className="whitespace-nowrap px-4 py-3 text-[12px] text-muted-foreground">
                              {slip.paidDate
                                ? new Date(slip.paidDate).toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })
                                : '—'}
                            </td>
                          )}
                        </tr>
                      );
                    }

                    const DASH = <span className="text-muted-foreground/30">—</span>;
                    return (
                      <tr
                        key={`${year}-${month}`}
                        className={`transition-colors hover:bg-muted/30 ${isFeatured ? 'bg-warning/5' : ''}`}
                      >
                        {/* Action always shown */}
                        <td className="whitespace-nowrap px-4 py-3">{DASH}</td>
                        {vis('emp_id') && (
                          <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-muted-foreground/40">
                            {employeeId || '—'}
                          </td>
                        )}
                        {vis('name') && (
                          <td className="whitespace-nowrap px-4 py-3 text-muted-foreground/40">
                            {fullName || email || '—'}
                          </td>
                        )}
                        {vis('year') && (
                          <td className="whitespace-nowrap px-4 py-3 text-muted-foreground/40">
                            {year}
                          </td>
                        )}
                        {vis('month') && (
                          <td className="whitespace-nowrap border-r border-border px-4 py-3 text-muted-foreground/40">
                            {MONTHS[month]}
                            {isFeatured && (
                              <span className="ml-2 inline-flex items-center rounded-full bg-warning/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-warning">
                                Pending
                              </span>
                            )}
                          </td>
                        )}
                        {/* Earnings dash cells */}
                        {vis('basic') && (
                          <td className="whitespace-nowrap px-4 py-3 text-right">{DASH}</td>
                        )}
                        {vis('hra') && (
                          <td className="whitespace-nowrap px-4 py-3 text-right">{DASH}</td>
                        )}
                        {vis('conveyance') && (
                          <td className="whitespace-nowrap px-4 py-3 text-right">{DASH}</td>
                        )}
                        {vis('medical') && (
                          <td className="whitespace-nowrap px-4 py-3 text-right">{DASH}</td>
                        )}
                        {vis('special') && (
                          <td className="whitespace-nowrap border-r border-border px-4 py-3 text-right">
                            {DASH}
                          </td>
                        )}
                        {/* Extra Pay dash cells */}
                        {vis('lta') && (
                          <td className="whitespace-nowrap px-4 py-3 text-right">{DASH}</td>
                        )}
                        {vis('bonus') && (
                          <td className="whitespace-nowrap px-4 py-3 text-right">{DASH}</td>
                        )}
                        {vis('other_allow') && (
                          <td className="whitespace-nowrap px-4 py-3 text-right">{DASH}</td>
                        )}
                        {vis('overtime') && (
                          <td className="whitespace-nowrap px-4 py-3 text-right">{DASH}</td>
                        )}
                        {vis('weekend_pay') && (
                          <td className="whitespace-nowrap px-4 py-3 text-right">{DASH}</td>
                        )}
                        {vis('holiday_pay') && (
                          <td className="whitespace-nowrap border-r border-border px-4 py-3 text-right">
                            {DASH}
                          </td>
                        )}
                        {/* Gross */}
                        {vis('gross') && (
                          <td className="whitespace-nowrap border-r border-border px-4 py-3 text-right">
                            {DASH}
                          </td>
                        )}
                        {/* Deduction dash cells */}
                        {vis('pf') && (
                          <td className="whitespace-nowrap px-4 py-3 text-right">{DASH}</td>
                        )}
                        {otherDeductionDefs.map(
                          (def) =>
                            vis(`deduction_${def.id}`) && (
                              <td key={def.id} className="whitespace-nowrap px-4 py-3 text-right">
                                {DASH}
                              </td>
                            )
                        )}
                        {vis('total_deductions') && (
                          <td className="whitespace-nowrap border-r border-border px-4 py-3 text-right">
                            {DASH}
                          </td>
                        )}
                        {/* Net Pay */}
                        {vis('net_pay') && (
                          <td className="whitespace-nowrap border-r border-border px-4 py-3 text-right">
                            {DASH}
                          </td>
                        )}
                        {/* Status */}
                        {vis('status') && (
                          <td className="whitespace-nowrap px-4 py-3">
                            <span className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-muted-foreground">
                              Not Generated
                            </span>
                          </td>
                        )}
                        {vis('pay_date') && (
                          <td className="whitespace-nowrap px-4 py-3 text-muted-foreground/40">
                            —
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
                <IconCash className="h-6 w-6" />
              </div>
              <p className="text-[14px] font-semibold">No salary records for {selectedYear}</p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Select a year after your joining date.
              </p>
            </div>
          )}
        </div>
      </div>

      {viewSlip && (
        <PayslipViewModal
          slip={viewSlip}
          empInfo={{
            fullName,
            email,
            employeeId,
            joiningDate: joiningDateStr,
            designation: (user as Record<string, unknown>)?.designation as string | undefined,
            department: user?.department?.name ?? user?.userDepartments?.[0]?.department?.name,
          }}
          onClose={() => setViewSlip(null)}
          onDownload={() =>
            downloadPayslipPDF(viewSlip, viewSlip.salaryStructure, {
              fullName,
              email,
              employeeId,
              joiningDate: joiningDateStr,
              designation: (user as Record<string, unknown>)?.designation as string | undefined,
            })
          }
        />
      )}
    </div>
  );
};

export default MainMySalary;
