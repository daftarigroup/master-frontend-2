'use client';

import { IconDownload, IconLoader2, IconX } from '@tabler/icons-react';
import jsPDF from 'jspdf';
import type React from 'react';
import { useState } from 'react';
import { resolveActAsTenant } from '@/features/organization/utils/actAsTenant';
import { useAppSelector } from '@/store/hook';
import { selectUser } from '@/store/slice/userAccountData';
import { useGeneratePayslip } from '../server/tanstackQuery/useSalaryQueries';
import { ModalPortal } from '../../_shared/components';
import type { Payslip, SalaryStructure } from '../types/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);

export const MONTHS = [
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

const THIS_YEAR = new Date().getFullYear();
export const YEARS = Array.from({ length: 5 }, (_, i) => THIS_YEAR - i);

const inputCls =
  'h-10 w-full rounded-lg border border-border bg-muted px-3 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary';
const labelCls =
  'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground';

// ─── PDF ──────────────────────────────────────────────────────────────────────

export function downloadPayslipPDF(
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
  const MARGIN = 12;
  const CW = W - MARGIN * 2; // content width
  let y = 0;

  // jsPDF built-in Helvetica cannot render the Rs. symbol — use text prefix
  const money = (n: number) =>
    `Rs. ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)}`;

  type RGB = [number, number, number];
  const setFill = (r: number, g: number, b: number) => doc.setFillColor(r, g, b);
  const setStroke = (r: number, g: number, b: number) => doc.setDrawColor(r, g, b);
  const setColor = (r: number, g: number, b: number) => doc.setTextColor(r, g, b);
  const resetColor = () => doc.setTextColor(0, 0, 0);

  const txt = (
    t: string,
    x: number,
    yy: number,
    opts?: { align?: 'left' | 'center' | 'right'; size?: number; bold?: boolean; color?: RGB }
  ) => {
    if (opts?.color) setColor(...opts.color);
    doc.setFontSize(opts?.size ?? 9);
    doc.setFont('helvetica', opts?.bold ? 'bold' : 'normal');
    doc.text(t, x, yy, { align: opts?.align ?? 'left' });
    if (opts?.color) resetColor();
  };

  // ── Header band ───────────────────────────────────────────────────────────
  setFill(15, 23, 42);
  doc.rect(0, 0, W, 30, 'F');
  // Accent stripe
  setFill(22, 163, 74);
  doc.rect(0, 26, W, 4, 'F');

  setColor(255, 255, 255);
  txt(struct.company ?? 'Company', W / 2, 12, { align: 'center', size: 16, bold: true });
  setColor(148, 163, 184);
  txt('S A L A R Y   S L I P', W / 2, 20, { align: 'center', size: 8 });
  // Period badge top-right
  setColor(255, 255, 255);
  txt(`${MONTHS[payslip.month].toUpperCase()} ${payslip.year}`, W - MARGIN, 11, {
    align: 'right',
    size: 8.5,
    bold: true,
  });
  const statusLabel = payslip.status === 'paid' ? 'PAID' : 'GENERATED';
  setColor(
    payslip.status === 'paid' ? 134 : 251,
    payslip.status === 'paid' ? 239 : 191,
    payslip.status === 'paid' ? 172 : 36
  );
  txt(statusLabel, W - MARGIN, 18, { align: 'right', size: 7 });
  resetColor();
  y = 36;

  // ── Employee details ──────────────────────────────────────────────────────
  setFill(241, 245, 249);
  setStroke(203, 213, 225);
  doc.rect(MARGIN, y, CW, 7, 'FD');
  txt('EMPLOYEE DETAILS', MARGIN + 4, y + 4.8, {
    size: 7.5,
    bold: true,
    color: [51, 65, 85],
  });
  y += 11;

  const COL_MID = W / 2;
  const LBL_W = 40;

  const detailRow = (l1: string, v1: string, l2: string, v2: string) => {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    setColor(100, 116, 139);
    doc.text(l1, MARGIN + 2, y);
    doc.text(l2, COL_MID + 2, y);
    doc.setFont('helvetica', 'bold');
    setColor(15, 23, 42);
    doc.text(v1, MARGIN + 2 + LBL_W, y);
    doc.text(v2, COL_MID + 2 + LBL_W, y);
    resetColor();
    y += 6;
  };

  detailRow('Employee Code', emp.employeeId, 'Company', struct.company ?? '—');
  detailRow('Employee Name', emp.fullName, 'Location', struct.location ?? '—');
  detailRow('Designation', emp.designation ?? '—', 'Pay Mode', 'Bank Transfer');
  detailRow(
    'Email',
    emp.email,
    'Joining Date',
    emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString('en-IN') : '—'
  );
  detailRow(
    'Working Days Present',
    `${payslip.daysPresent} / ${payslip.calculationDays}`,
    'Monthly CTC',
    money(payslip.monthlyCTC)
  );
  if (payslip.paidDate) {
    detailRow(
      'Payment Status',
      `Paid on ${new Date(payslip.paidDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`,
      'Pay Period',
      `${MONTHS[payslip.month]} ${payslip.year}`
    );
  }
  if (payslip.remarks) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    setColor(100, 116, 139);
    doc.text(`Remarks: ${payslip.remarks}`, MARGIN + 2, y);
    resetColor();
    y += 6;
  }

  // Divider
  y += 2;
  setStroke(226, 232, 240);
  doc.line(MARGIN, y, W - MARGIN, y);
  y += 6;

  // ── Attendance extras (only if any worked) ────────────────────────────────
  const hasExtras =
    payslip.weekendWorkDays > 0 || payslip.holidayWorkDays > 0 || payslip.overtimeHours > 0;
  if (hasExtras) {
    setFill(248, 250, 252);
    setStroke(226, 232, 240);
    doc.rect(MARGIN, y, CW, 14, 'FD');
    const attItems = [
      { label: 'Weekend Worked', val: `${payslip.weekendWorkDays}d` },
      { label: 'Holiday Worked', val: `${payslip.holidayWorkDays}d` },
      { label: 'OT Hours Worked', val: `${payslip.overtimeHours}h` },
    ];
    const attW = CW / attItems.length;
    attItems.forEach((item, i) => {
      const ax = MARGIN + attW * i + attW / 2;
      txt(item.val, ax, y + 6.5, { align: 'center', size: 9, bold: true, color: [15, 23, 42] });
      txt(item.label, ax, y + 11.5, { align: 'center', size: 6.5, color: [100, 116, 139] });
    });
    y += 18;
  }

  // ── Earnings / Deductions table ───────────────────────────────────────────
  const MID = W / 2 + 3;
  const EARN_W = MID - MARGIN - 3;
  const DED_W = W - MARGIN - MID;

  // Table header
  setFill(30, 58, 138);
  doc.rect(MARGIN, y, EARN_W, 8, 'F');
  setFill(127, 29, 29);
  doc.rect(MID, y, DED_W, 8, 'F');
  setColor(255, 255, 255);
  txt('EARNINGS', MARGIN + 3, y + 5.5, { size: 7.5, bold: true });
  txt('Amount (Rs.)', MID - 3, y + 5.5, { align: 'right', size: 7.5, bold: true });
  txt('DEDUCTIONS', MID + 3, y + 5.5, { size: 7.5, bold: true });
  txt('Amount (Rs.)', W - MARGIN - 1, y + 5.5, { align: 'right', size: 7.5, bold: true });
  resetColor();
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
      setFill(248, 250, 252);
      doc.rect(MARGIN, y, EARN_W, 6, 'F');
      setFill(255, 250, 250);
      doc.rect(MID, y, DED_W, 6, 'F');
    }
    const e = earningsRows[i];
    const d = deductionRows[i];
    if (e) {
      txt(e[0], MARGIN + 2, y + 4.2, { size: 8, color: [51, 65, 85] });
      txt(money(e[1]), MID - 3, y + 4.2, {
        align: 'right',
        size: 8,
        bold: true,
        color: [22, 101, 52],
      });
    }
    if (d) {
      txt(d[0], MID + 2, y + 4.2, { size: 8, color: [51, 65, 85] });
      txt(money(d[1]), W - MARGIN - 1, y + 4.2, {
        align: 'right',
        size: 8,
        bold: true,
        color: [153, 27, 27],
      });
    }
    y += 6;
  }

  // Totals row
  setStroke(203, 213, 225);
  doc.line(MARGIN, y, W - MARGIN, y);
  y += 2;
  setFill(220, 252, 231);
  doc.rect(MARGIN, y, EARN_W, 7, 'F');
  setFill(254, 226, 226);
  doc.rect(MID, y, DED_W, 7, 'F');
  txt('Gross Earnings', MARGIN + 2, y + 4.8, { size: 8.5, bold: true, color: [22, 101, 52] });
  txt(money(payslip.grossEarnings), MID - 3, y + 4.8, {
    align: 'right',
    size: 8.5,
    bold: true,
    color: [22, 101, 52],
  });
  txt('Total Deductions', MID + 2, y + 4.8, { size: 8.5, bold: true, color: [153, 27, 27] });
  txt(money(payslip.totalDeductions), W - MARGIN - 1, y + 4.8, {
    align: 'right',
    size: 8.5,
    bold: true,
    color: [153, 27, 27],
  });
  y += 11;

  // ── Net Pay banner — 3-column layout, no chopping ─────────────────────────
  setFill(21, 128, 61);
  doc.rect(MARGIN, y, CW, 20, 'F');

  const third = CW / 3;
  setStroke(255, 255, 255);
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.3);
  doc.line(MARGIN + third, y + 4, MARGIN + third, y + 16);
  doc.line(MARGIN + third * 2, y + 4, MARGIN + third * 2, y + 16);
  doc.setLineWidth(0.2);

  const s1cx = MARGIN + third * 0.5;
  const s2cx = MARGIN + third * 1.5;
  const s3cx = MARGIN + third * 2.5;

  txt('IN-HAND SALARY', s1cx, y + 6.5, { align: 'center', size: 6.5, color: [187, 247, 208] });
  txt(money(payslip.netPay), s1cx, y + 14, {
    align: 'center',
    size: 10,
    bold: true,
    color: [255, 255, 255],
  });

  txt('GROSS EARNINGS', s2cx, y + 6.5, { align: 'center', size: 6.5, color: [187, 247, 208] });
  txt(money(payslip.grossEarnings), s2cx, y + 14, {
    align: 'center',
    size: 9,
    bold: true,
    color: [255, 255, 255],
  });

  txt('TOTAL DEDUCTIONS', s3cx, y + 6.5, { align: 'center', size: 6.5, color: [187, 247, 208] });
  txt(money(payslip.totalDeductions), s3cx, y + 14, {
    align: 'center',
    size: 9,
    bold: true,
    color: [255, 255, 255],
  });

  resetColor();
  y += 24;

  // ── Mid-month note ────────────────────────────────────────────────────────
  if (payslip.daysPresent < payslip.calculationDays) {
    setFill(255, 251, 235);
    setStroke(251, 191, 36);
    doc.rect(MARGIN, y, CW, 10, 'FD');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    setColor(146, 64, 14);
    doc.text(
      `Mid-Month Payment: Covers ${payslip.daysPresent} of ${payslip.calculationDays} days. Remaining ${payslip.calculationDays - payslip.daysPresent} day(s) need a new payslip.`,
      W / 2,
      y + 6.5,
      { align: 'center' }
    );
    resetColor();
    y += 14;
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  setColor(148, 163, 184);
  doc.text('This is a computer-generated salary slip. No signature required.', W / 2, y, {
    align: 'center',
  });
  resetColor();

  doc.save(`Payslip_${MONTHS[payslip.month]}_${payslip.year}_${emp.employeeId}.pdf`);
}

// ─── Generate Payslip Modal ───────────────────────────────────────────────────

export interface GeneratePayslipModalProps {
  employeeId: string;
  employeeName: string;
  email: string;
  joiningDate?: string;
  designation?: string;
  department?: string;
  companyName?: string;
  struct: SalaryStructure | null | undefined;
  // Only present under "All Companies" (merged) view.
  tenant?: { id: string; name: string } | null;
  onClose: () => void;
}

const GeneratePayslipModal: React.FC<GeneratePayslipModalProps> = ({
  employeeId,
  employeeName,
  email,
  joiningDate,
  designation,
  department,
  companyName,
  struct,
  tenant,
  onClose,
}) => {
  const user = useAppSelector(selectUser);
  const generate = useGeneratePayslip();
  const now = new Date();

  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [err, setErr] = useState('');
  const [preview, setPreview] = useState<Payslip | null>(null);

  const handleGenerate = async () => {
    try {
      const result = await generate.mutateAsync({
        data: { employeeId, month, year },
        actAsTenantId: resolveActAsTenant(tenant, user?.tenantId),
      });
      setPreview(result);
    } catch (e) {
      setErr(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Generation failed'
      );
    }
  };

  const handleDownload = () => {
    if (!preview || !struct) return;
    downloadPayslipPDF(preview, struct, {
      fullName: employeeName,
      email,
      employeeId,
      joiningDate,
      designation,
    });
  };

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Generate payslip"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      tabIndex={-1}
    >
      <div
        className={`flex max-h-[92vh] w-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl ${preview ? 'max-w-2xl' : 'max-w-sm'}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-[15px] font-bold">
              {preview ? `Payslip — ${MONTHS[preview.month]} ${preview.year}` : 'Generate Payslip'}
            </h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {preview ? 'Saved · Review below and download PDF if needed' : employeeName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>

        {preview ? (
          <div className="flex-1 overflow-y-auto">
            <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-5 text-primary-foreground">
              <p className="text-[18px] font-bold tracking-tight">{companyName || 'Company'}</p>
              <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] opacity-80">
                Salary Slip — {MONTHS[preview.month]} {preview.year}
              </p>
            </div>

            <div className="space-y-4 px-6 py-4">
              <div className="overflow-hidden rounded-xl border border-border bg-muted/30">
                <div className="grid grid-cols-2 divide-y divide-border sm:grid-cols-3">
                  {[
                    { label: 'Employee Name', value: employeeName || '—' },
                    { label: 'Employee Code', value: employeeId || '—' },
                    { label: 'Department', value: department || '—' },
                    { label: 'Designation', value: designation || '—' },
                    { label: 'Email', value: email || '—' },
                    {
                      label: 'Joining Date',
                      value: joiningDate
                        ? new Date(joiningDate).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—',
                    },
                    { label: 'Monthly CTC', value: fmt(preview.monthlyCTC) },
                    {
                      label: 'Days Covered (Paid)',
                      value: `${preview.daysPresent} / ${preview.calculationDays} days`,
                    },
                    {
                      label: 'Pay Period',
                      value: `${MONTHS[preview.month]} ${preview.year}`,
                    },
                    ...(preview.paidDate
                      ? [
                          {
                            label: 'Paid On',
                            value: new Date(preview.paidDate).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            }),
                          },
                        ]
                      : []),
                    ...(preview.remarks ? [{ label: 'Remarks', value: preview.remarks }] : []),
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="border-r border-border px-3.5 py-2.5 last:border-r-0"
                    >
                      <p className="text-[9px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                        {item.label}
                      </p>
                      <p className="mt-0.5 truncate text-[12px] font-semibold">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-border">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-[12px]">
                    <thead>
                      <tr className="border-b border-border">
                        <th
                          colSpan={2}
                          className="border-r border-border bg-success/5 px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.06em] text-success"
                        >
                          Earnings
                        </th>
                        <th
                          colSpan={2}
                          className="bg-destructive/5 px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.06em] text-destructive"
                        >
                          Deductions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(() => {
                        const earnings = [
                          { label: 'Basic Salary', val: preview.basic },
                          { label: 'HRA', val: preview.hra },
                          { label: 'Conveyance', val: preview.conveyance },
                          { label: 'Medical Allowance', val: preview.medicalAllowance },
                          { label: 'Special Allowance', val: preview.specialAllowance },
                          { label: 'Other Allowances', val: preview.otherAllowances },
                        ];
                        const deductions = preview.deductionBreakdown ?? [];
                        const maxRows = Math.max(earnings.length, deductions.length);
                        return Array.from({ length: maxRows }).map((_, i) => {
                          const e = earnings[i];
                          const d = deductions[i];
                          return (
                            <tr key={i} className={i % 2 === 1 ? 'bg-muted/20' : ''}>
                              <td className="w-[28%] border-r border-border/60 px-3.5 py-2 text-muted-foreground">
                                {e?.label ?? ''}
                              </td>
                              <td className="w-[22%] border-r border-border px-3.5 py-2 text-right font-medium tabular-nums">
                                {e ? fmt(e.val) : ''}
                              </td>
                              <td className="w-[28%] border-r border-border/60 px-3.5 py-2 text-muted-foreground">
                                {d ? (
                                  <>
                                    {d.name}{' '}
                                    <span className="text-[10px] text-muted-foreground/60">
                                      ({d.percent}%)
                                    </span>
                                  </>
                                ) : (
                                  ''
                                )}
                              </td>
                              <td className="w-[22%] px-3.5 py-2 text-right font-medium tabular-nums text-destructive">
                                {d ? `−${fmt(d.amount)}` : ''}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border bg-muted/40">
                        <td className="border-r border-border/60 px-3.5 py-2.5 font-bold text-success">
                          Gross Earnings
                        </td>
                        <td className="border-r border-border px-3.5 py-2.5 text-right font-bold tabular-nums text-success">
                          {fmt(preview.grossEarnings)}
                        </td>
                        <td className="border-r border-border/60 px-3.5 py-2.5 font-bold text-destructive">
                          Total Deductions
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-bold tabular-nums text-destructive">
                          −{fmt(preview.totalDeductions)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="flex flex-col gap-2 rounded-xl border-2 border-primary/30 bg-primary/5 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                    In-Hand Salary
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Gross {fmt(preview.grossEarnings)} − Deductions {fmt(preview.totalDeductions)}
                  </p>
                </div>
                <p className="shrink-0 whitespace-nowrap text-[20px] font-bold tabular-nums tracking-tight text-primary sm:text-[28px]">
                  {fmt(preview.netPay)}
                </p>
              </div>

              {preview.daysPresent < preview.calculationDays && (
                <div className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3">
                  <p className="text-[11px] font-semibold text-warning">Mid-Month Payment Note</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    This payslip covers <strong>{preview.daysPresent}</strong> of{' '}
                    <strong>{preview.calculationDays}</strong> working days in{' '}
                    {MONTHS[preview.month]} {preview.year}. Salary has been prorated accordingly.
                    Remaining <strong>{preview.calculationDays - preview.daysPresent}</strong> day
                    {preview.calculationDays - preview.daysPresent !== 1 ? 's' : ''} will require a
                    separate payslip generation once attendance is updated.
                  </p>
                </div>
              )}
              <p className="text-center text-[10px] text-muted-foreground">
                This is a computer-generated salary slip and does not require a signature.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 px-5 py-5">
            {err && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12px] text-destructive">
                {err}
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="gm-month" className={labelCls}>
                  Month
                </label>
                <select
                  id="gm-month"
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className={`${inputCls} cursor-pointer`}
                >
                  {MONTHS.slice(1).map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="gm-year" className={labelCls}>
                  Year
                </label>
                <select
                  id="gm-year"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className={`${inputCls} cursor-pointer`}
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Days present and working days are calculated automatically from attendance records.
            </p>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center rounded-lg bg-muted px-4 text-[12px] font-semibold hover:bg-muted-foreground/10"
          >
            {preview ? 'Close' : 'Cancel'}
          </button>
          {preview ? (
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-[12px] font-semibold text-primary-foreground hover:opacity-90"
            >
              <IconDownload className="h-3.5 w-3.5" />
              Download PDF
            </button>
          ) : (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generate.isPending}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-[12px] font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {generate.isPending ? (
                <>
                  <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
                  Generating…
                </>
              ) : (
                'Generate Payslip'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  </ModalPortal>
);
};

export default GeneratePayslipModal;
