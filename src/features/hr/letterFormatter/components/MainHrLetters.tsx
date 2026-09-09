'use client';

import {
  IconBriefcase,
  IconChevronDown,
  IconDownload,
  IconLoader2,
  IconPlus,
  IconReceipt,
  IconRefresh,
  IconTrash,
} from '@tabler/icons-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { resolveActAsTenant } from '@/features/organization/utils/actAsTenant';
import { useTenantQuery } from '@/features/profile/companyProfile/server/tanstackQuery/useTenantQueries';
import type { CompanyProfile } from '@/features/settings/companyProfile/server/api/companyProfileApi';
import { useCompanyProfile } from '@/features/settings/companyProfile/server/tanstackQuery/useCompanyProfileQueries';
import { useAppSelector } from '@/store/hook';
import { selectUser } from '@/store/slice/userAccountData';
import {
  useEmployeeById,
  useEmployees,
} from '../../employee/server/tanstackQuery/useEmployeeQueries';
import {
  fmt as fmtMoney,
  MONTHS as PAYSLIP_MONTHS,
  YEARS as PAYSLIP_YEARS,
} from '../../mySalary/components/GeneratePayslipModal';
import {
  useGeneratePayslip,
  usePayslips,
} from '../../mySalary/server/tanstackQuery/useSalaryQueries';
import type { Payslip } from '../../mySalary/types/types';

// ── types ────────────────────────────────────────────────────────────────────

interface Joining {
  probationMonths?: number | null;
  offeredCTC?: string | null;
  companyName?: string | null;
  joiningPlace?: string | null;
  reportingManager?: string | null;
  employmentType?: string | null;
  designationOffered?: string | null;
  monthlySalary?: number | null;
}
interface FullEmployee {
  employeeId: string;
  name: string;
  designation: string | null;
  email: string | null;
  phone: string | null;
  joiningDate: string;
  lastWorkingDay?: string | null;
  managerName?: string | null;
  workLocation?: string | null;
  status: string;
  department?: { id: string; name: string } | null;
  // Direct Employee Joining links here; candidate-pipeline joins link via candidate.joining
  joining?: Joining | null;
  candidate?: { joining?: Joining | null } | null;
}

// Flat field bag passed into every letter doc
interface LetterFields {
  employeeName: string;
  employeeId: string;
  email: string;
  phone: string;
  designation: string;
  department: string;
  joiningDate: string;
  lastWorkingDay: string;
  employmentType: string;
  probationMonths: string;
  manager: string;
  location: string;
  ctc: string;
  monthlySalary: string;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyGstin: string;
  companyLogoUrl: string;
  offerTerms: string[];
  appointmentTerms: string[];
}

type LetterTab = 'offer' | 'appointment' | 'experience' | 'payslip';

// ── helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (iso: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
};

const fmtCurrency = (v: string) => {
  if (!v) return '—';
  const n = parseFloat(v);
  if (Number.isNaN(n)) return v;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
};

const todayStr = () =>
  new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

const refNo = (prefix: string, empId: string) =>
  `${prefix}/${new Date().getFullYear()}/${(empId || 'XXXX').slice(-4).toUpperCase()}`;

const BLANK: LetterFields = {
  employeeName: 'Employee Name',
  employeeId: 'EMP0001',
  email: '',
  phone: '',
  designation: 'Designation',
  department: 'Department',
  joiningDate: '',
  lastWorkingDay: '',
  employmentType: 'Permanent',
  probationMonths: '3',
  manager: '',
  location: '',
  ctc: '',
  monthlySalary: '',
  companyName: '',
  companyAddress: '',
  companyPhone: '',
  companyEmail: '',
  companyGstin: '',
  companyLogoUrl: '',
  offerTerms: [
    'This offer is contingent upon satisfactory background verification.',
    'You are required to submit all original documents at the time of joining.',
    'The offer is subject to your medical fitness as per company norms.',
    'Please sign and return a copy of this letter as acceptance within 7 days.',
  ],
  appointmentTerms: [
    'Your appointment is on probation, subject to satisfactory performance.',
    'You shall maintain strict confidentiality of company information at all times.',
    "Either party may terminate with one month's notice or payment in lieu thereof.",
    'You are expected to adhere to all company policies and code of conduct.',
  ],
};

function fieldsFromEmployee(
  emp: FullEmployee,
  cp: CompanyProfile | null | undefined,
  prev?: LetterFields
): LetterFields {
  const j = emp.joining ?? emp.candidate?.joining;
  return {
    employeeName: emp.name || '',
    employeeId: emp.employeeId || '',
    email: emp.email || '',
    phone: emp.phone || '',
    designation: j?.designationOffered || emp.designation || '',
    department: emp.department?.name || '',
    joiningDate: emp.joiningDate || '',
    lastWorkingDay: emp.lastWorkingDay || '',
    employmentType: j?.employmentType || '',
    probationMonths: j?.probationMonths != null ? String(j.probationMonths) : '',
    manager: j?.reportingManager || emp.managerName || '',
    location: j?.joiningPlace || emp.workLocation || '',
    ctc: j?.offeredCTC || '',
    monthlySalary: j?.monthlySalary != null ? String(j.monthlySalary) : '',
    companyName: j?.companyName || cp?.name || '',
    companyAddress: cp?.address || '',
    companyPhone: cp?.phone || '',
    companyEmail: cp?.email || '',
    companyGstin: cp?.gstin || '',
    companyLogoUrl: cp?.logoUrl || '',
    // preserve any edits the user made to terms
    offerTerms: prev?.offerTerms ?? BLANK.offerTerms,
    appointmentTerms: prev?.appointmentTerms ?? BLANK.appointmentTerms,
  };
}

// ── shared letter-head ───────────────────────────────────────────────────────

function LetterHead({
  f,
  accentFrom,
  accentTo,
  badgeLabel,
}: {
  f: LetterFields;
  accentFrom: string;
  accentTo: string;
  badgeLabel: string;
}) {
  return (
    <div
      className="rounded-t-2xl px-5 sm:px-8 py-5 sm:py-6 text-white"
      style={{ background: `linear-gradient(135deg, ${accentFrom} 0%, ${accentTo} 100%)` }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4 sm:gap-6">
        <div className="flex items-center gap-3 sm:gap-4">
          {f.companyLogoUrl ? (
            // biome-ignore lint/performance/noImgElement: html2canvas needs plain img
            <img
              src={f.companyLogoUrl}
              alt="Logo"
              className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl object-cover bg-white/20 border border-white/30 flex-shrink-0"
            />
          ) : (
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center flex-shrink-0">
              <IconBriefcase size={26} className="text-white/70" />
            </div>
          )}
          <div>
            <h1 className="text-lg sm:text-2xl font-black tracking-tight">
              {f.companyName || 'Company Name'}
            </h1>
            {f.companyAddress && (
              <p className="mt-0.5 text-[11px] text-white/75 max-w-xs leading-relaxed">
                {f.companyAddress}
              </p>
            )}
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-white/65">
              {f.companyPhone && <span>📞 {f.companyPhone}</span>}
              {f.companyEmail && <span>✉ {f.companyEmail}</span>}
              {f.companyGstin && <span>GSTIN: {f.companyGstin}</span>}
            </div>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <span
            className="inline-block rounded-full px-3 sm:px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.12em]"
            style={{
              background: 'rgba(255,255,255,0.18)',
              border: '1px solid rgba(255,255,255,0.35)',
            }}
          >
            {badgeLabel}
          </span>
          <p className="mt-3 text-xl sm:text-3xl font-black tracking-tighter opacity-15">
            {badgeLabel.split(' ')[0].toUpperCase()}
          </p>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td
        className="py-2.5 pl-4 pr-6 text-[10px] font-black uppercase tracking-widest whitespace-nowrap"
        style={{ color: accent, width: '42%' }}
      >
        {label}
      </td>
      <td className="py-2.5 pr-4 text-[12px] font-semibold text-slate-800">{value || '—'}</td>
    </tr>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// OFFER LETTER
// ═══════════════════════════════════════════════════════════════════════════

function OfferLetterDoc({ f }: { f: LetterFields }) {
  return (
    <div className="mx-auto bg-white shadow-2xl rounded-2xl overflow-hidden text-slate-800 font-sans">
      <LetterHead f={f} accentFrom="#1e3a8a" accentTo="#3b82f6" badgeLabel="Offer Letter" />
      <div className="px-5 sm:px-10 py-6 sm:py-8">
        <div className="flex flex-wrap gap-3 justify-between items-start">
          <div className="space-y-0.5 text-[11px] text-slate-500">
            <p>
              <span className="font-bold text-slate-400 uppercase text-[9px] tracking-widest mr-2">
                Date:
              </span>
              {todayStr()}
            </p>
            <p>
              <span className="font-bold text-slate-400 uppercase text-[9px] tracking-widest mr-2">
                Ref No:
              </span>
              {refNo('OL', f.employeeId)}
            </p>
          </div>
          <span className="rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-700 border border-blue-200">
            Offer of Employment
          </span>
        </div>

        <div className="mt-6 text-[12px] leading-relaxed text-slate-700">
          <p className="font-black text-slate-900 text-sm">To,</p>
          <p className="font-bold">{f.employeeName}</p>
          {f.email && <p className="text-slate-500">{f.email}</p>}
          {f.phone && <p className="text-slate-500">{f.phone}</p>}
        </div>

        <div className="mt-6 border-l-4 border-blue-600 bg-blue-50 px-4 py-3 rounded-r-lg">
          <p className="text-[9px] font-black uppercase tracking-widest text-blue-400">Subject</p>
          <p className="text-sm font-black text-blue-900">Offer of Employment — {f.designation}</p>
        </div>

        <div className="mt-6 text-[12px] leading-[1.85] text-slate-600 space-y-3">
          <p>
            Dear <span className="font-bold text-slate-800">{f.employeeName}</span>,
          </p>
          <p>
            We are delighted to extend this offer of employment for the position of{' '}
            <span className="font-bold text-blue-700">{f.designation}</span> at{' '}
            <span className="font-bold text-slate-800">{f.companyName}</span>. After careful
            consideration, we believe your skills and experience make you an excellent fit for our
            team. Please review the details of this offer below.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
            <div className="px-4 py-2.5 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest">
              Position Details
            </div>
            <table className="w-full">
              <tbody>
                <DetailRow label="Designation" value={f.designation} accent="#2563eb" />
                <DetailRow label="Department" value={f.department} accent="#2563eb" />
                <DetailRow
                  label="Date of Joining"
                  value={fmtDate(f.joiningDate)}
                  accent="#2563eb"
                />
                <DetailRow label="Employment Type" value={f.employmentType} accent="#2563eb" />
                <DetailRow
                  label="Probation Period"
                  value={f.probationMonths ? `${f.probationMonths} Months` : '—'}
                  accent="#2563eb"
                />
              </tbody>
            </table>
          </div>
          <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
            <div className="px-4 py-2.5 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest">
              Work & Compensation
            </div>
            <table className="w-full">
              <tbody>
                <DetailRow label="Reporting To" value={f.manager} accent="#2563eb" />
                <DetailRow label="Work Location" value={f.location} accent="#2563eb" />
                <DetailRow label="Annual CTC" value={fmtCurrency(f.ctc)} accent="#2563eb" />
                <DetailRow
                  label="Monthly Salary"
                  value={fmtCurrency(f.monthlySalary)}
                  accent="#2563eb"
                />
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6">
          <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 border-b border-slate-100 pb-1">
            Terms & Conditions
          </h4>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-500 leading-relaxed">
            {f.offerTerms.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>

        <p className="mt-5 text-[12px] text-slate-600">
          We look forward to welcoming you to our team.
        </p>
        <p className="mt-1 text-[12px] text-slate-600">Yours sincerely,</p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-8">
          <div>
            <div className="h-14 border-b-2 border-slate-800 rounded-t-md bg-slate-50" />
            <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-700">
              Authorized Signatory
            </p>
            <p className="text-[10px] text-slate-500">HR Department · {f.companyName}</p>
          </div>
          <div>
            <div className="h-14 border-b-2 border-blue-300 rounded-t-md bg-blue-50/40" />
            <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-blue-700">
              Employee Acceptance
            </p>
            <p className="text-[10px] text-slate-500">Name: {f.employeeName}</p>
            <p className="text-[10px] text-slate-500">Date: _______________</p>
          </div>
        </div>
      </div>
      <div
        className="px-10 py-3 text-[9px] text-white/80 flex justify-between"
        style={{ background: 'linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%)' }}
      >
        <span>{f.companyName}</span>
        <span>Confidential — For {f.employeeName} only</span>
        <span>Page 1 of 1</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// APPOINTMENT / JOINING LETTER
// ═══════════════════════════════════════════════════════════════════════════

function AppointmentLetterDoc({ f }: { f: LetterFields }) {
  const probation = f.probationMonths ? `${f.probationMonths} Months` : '—';
  return (
    <div className="mx-auto bg-white shadow-2xl rounded-2xl overflow-hidden text-slate-800 font-sans">
      <LetterHead f={f} accentFrom="#4c1d95" accentTo="#7c3aed" badgeLabel="Appointment Letter" />
      <div className="px-5 sm:px-10 py-6 sm:py-8">
        <div className="flex flex-wrap gap-3 justify-between items-start">
          <div className="space-y-0.5 text-[11px] text-slate-500">
            <p>
              <span className="font-bold text-slate-400 uppercase text-[9px] tracking-widest mr-2">
                Date:
              </span>
              {todayStr()}
            </p>
            <p>
              <span className="font-bold text-slate-400 uppercase text-[9px] tracking-widest mr-2">
                Ref No:
              </span>
              {refNo('AL', f.employeeId)}
            </p>
          </div>
          <span className="rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-violet-50 text-violet-700 border border-violet-200">
            Appointment Letter
          </span>
        </div>

        <div className="mt-6 text-[12px] leading-relaxed text-slate-700">
          <p className="font-black text-slate-900 text-sm">To,</p>
          <p className="font-bold">{f.employeeName}</p>
          {f.email && <p className="text-slate-500">{f.email}</p>}
          {f.phone && <p className="text-slate-500">{f.phone}</p>}
        </div>

        <div className="mt-6 border-l-4 border-violet-600 bg-violet-50 px-4 py-3 rounded-r-lg">
          <p className="text-[9px] font-black uppercase tracking-widest text-violet-400">Subject</p>
          <p className="text-sm font-black text-violet-900">
            Letter of Appointment — {f.designation}
          </p>
        </div>

        <div className="mt-6 text-[12px] leading-[1.85] text-slate-600 space-y-3">
          <p>
            Dear <span className="font-bold text-slate-800">{f.employeeName}</span>,
          </p>
          <p>
            With reference to your application and subsequent interviews, we are pleased to appoint
            you as <span className="font-bold text-violet-700">{f.designation}</span> in the{' '}
            <span className="font-bold text-slate-800">{f.department}</span> department at{' '}
            <span className="font-bold text-slate-800">{f.companyName}</span>, with effect from{' '}
            <span className="font-bold text-violet-700">{fmtDate(f.joiningDate)}</span>.
          </p>
          <p>
            This appointment is subject to the terms and conditions set forth below. We are
            confident you will make a meaningful contribution to our organisation.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
            <div className="px-4 py-2.5 bg-violet-600 text-white text-[9px] font-black uppercase tracking-widest">
              Appointment Details
            </div>
            <table className="w-full">
              <tbody>
                <DetailRow label="Designation" value={f.designation} accent="#7c3aed" />
                <DetailRow label="Department" value={f.department} accent="#7c3aed" />
                <DetailRow
                  label="Date of Joining"
                  value={fmtDate(f.joiningDate)}
                  accent="#7c3aed"
                />
                <DetailRow label="Employment Type" value={f.employmentType} accent="#7c3aed" />
                <DetailRow label="Probation Period" value={probation} accent="#7c3aed" />
              </tbody>
            </table>
          </div>
          <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
            <div className="px-4 py-2.5 bg-violet-600 text-white text-[9px] font-black uppercase tracking-widest">
              Reporting & Compensation
            </div>
            <table className="w-full">
              <tbody>
                <DetailRow label="Reporting To" value={f.manager} accent="#7c3aed" />
                <DetailRow label="Work Location" value={f.location} accent="#7c3aed" />
                <DetailRow label="Annual CTC" value={fmtCurrency(f.ctc)} accent="#7c3aed" />
                <DetailRow
                  label="Monthly Salary"
                  value={fmtCurrency(f.monthlySalary)}
                  accent="#7c3aed"
                />
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6">
          <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 border-b border-slate-100 pb-1">
            Terms of Appointment
          </h4>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-500 leading-relaxed">
            {f.appointmentTerms.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>

        <p className="mt-5 text-[12px] text-slate-600">
          Please sign and return a copy as acknowledgement. We welcome you to the {f.companyName}{' '}
          family.
        </p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-8">
          <div>
            <div className="h-14 border-b-2 border-slate-800 rounded-t-md bg-slate-50" />
            <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-700">
              Authorized Signatory
            </p>
            <p className="text-[10px] text-slate-500">HR Department · {f.companyName}</p>
          </div>
          <div>
            <div className="h-14 border-b-2 border-violet-400 rounded-t-md bg-violet-50/40" />
            <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-violet-700">
              Accepted By
            </p>
            <p className="text-[10px] text-slate-500">Name: {f.employeeName}</p>
            <p className="text-[10px] text-slate-500">Date: _______________</p>
          </div>
        </div>
      </div>
      <div
        className="px-10 py-3 text-[9px] text-white/80 flex justify-between"
        style={{ background: 'linear-gradient(135deg,#4c1d95 0%,#7c3aed 100%)' }}
      >
        <span>{f.companyName}</span>
        <span>Confidential — For {f.employeeName} only</span>
        <span>Page 1 of 1</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPERIENCE LETTER
// ═══════════════════════════════════════════════════════════════════════════

function ExperienceLetterDoc({ f }: { f: LetterFields }) {
  const start = new Date(f.joiningDate || Date.now());
  const end = f.lastWorkingDay ? new Date(f.lastWorkingDay) : new Date();
  const diffMs = Math.max(0, end.getTime() - start.getTime());
  const years = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365));
  const months = Math.floor((diffMs % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30));
  const tenure =
    years > 0
      ? `${years} year${years > 1 ? 's' : ''}${months > 0 ? ` and ${months} month${months > 1 ? 's' : ''}` : ''}`
      : months > 0
        ? `${months} month${months > 1 ? 's' : ''}`
        : 'less than a month';

  const toDate = f.lastWorkingDay ? fmtDate(f.lastWorkingDay) : 'Present';
  const firstName = f.employeeName.split(' ')[0] || f.employeeName;

  return (
    <div className="mx-auto bg-white shadow-2xl rounded-2xl overflow-hidden text-slate-800 font-sans">
      <LetterHead f={f} accentFrom="#064e3b" accentTo="#10b981" badgeLabel="Experience Letter" />
      <div className="px-5 sm:px-10 py-6 sm:py-8">
        <div className="flex flex-wrap gap-3 justify-between items-start">
          <div className="space-y-0.5 text-[11px] text-slate-500">
            <p>
              <span className="font-bold text-slate-400 uppercase text-[9px] tracking-widest mr-2">
                Date:
              </span>
              {todayStr()}
            </p>
            <p>
              <span className="font-bold text-slate-400 uppercase text-[9px] tracking-widest mr-2">
                Ref No:
              </span>
              {refNo('EL', f.employeeId)}
            </p>
          </div>
          <span className="rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200">
            Experience Certificate
          </span>
        </div>

        <div className="mt-8 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
            To Whomsoever It May Concern
          </p>
          <div className="mt-2 mx-auto h-0.5 w-24 bg-emerald-500 rounded-full" />
        </div>

        <div className="mt-8 rounded-2xl border-2 border-emerald-200 bg-emerald-50/40 px-8 py-6">
          <p className="text-[13px] leading-[2] text-slate-700">
            This is to certify that{' '}
            <span className="font-black text-slate-900 text-[14px]">{f.employeeName}</span>
            {f.employeeId && (
              <>
                {' '}
                (Employee ID: <span className="font-bold text-emerald-700">{f.employeeId}</span>)
              </>
            )}{' '}
            was employed with <span className="font-black text-slate-900">{f.companyName}</span> as{' '}
            <span className="font-bold text-emerald-700">{f.designation}</span> in the{' '}
            <span className="font-bold text-slate-800">{f.department}</span> department from{' '}
            <span className="font-bold text-emerald-700">{fmtDate(f.joiningDate)}</span> to{' '}
            <span className="font-bold text-emerald-700">{toDate}</span>, a tenure of{' '}
            <span className="font-black text-slate-900">{tenure}</span>.
          </p>
        </div>

        <div className="mt-6 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
          <div className="px-4 py-2.5 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest">
            Employment Summary
          </div>
          <table className="w-full">
            <tbody>
              <DetailRow label="Employee Name" value={f.employeeName} accent="#059669" />
              <DetailRow label="Employee ID" value={f.employeeId} accent="#059669" />
              <DetailRow label="Designation" value={f.designation} accent="#059669" />
              <DetailRow label="Department" value={f.department} accent="#059669" />
              <DetailRow label="Date of Joining" value={fmtDate(f.joiningDate)} accent="#059669" />
              <DetailRow label="Last Working Day" value={toDate} accent="#059669" />
              <DetailRow label="Total Tenure" value={tenure} accent="#059669" />
            </tbody>
          </table>
        </div>

        <div className="mt-6 text-[12px] leading-[1.85] text-slate-600 space-y-3">
          <p>
            During {firstName}&apos;s tenure, {firstName} demonstrated professionalism, dedication,
            and commitment to {firstName}&apos;s responsibilities. We found {firstName} to be a
            diligent and sincere employee and wish {firstName} the very best in all future
            endeavours.
          </p>
          <p>
            This certificate is issued at the request of{' '}
            <span className="font-bold text-slate-800">{f.employeeName}</span> and is true to the
            best of our knowledge.
          </p>
        </div>

        <div className="mt-10 flex justify-end">
          <div className="text-center">
            <div className="h-14 w-52 border-b-2 border-emerald-700 rounded-t-md bg-emerald-50/60" />
            <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-emerald-700">
              Authorized Signatory
            </p>
            <p className="text-[10px] text-slate-500">HR Department</p>
            <p className="text-[10px] font-bold text-slate-700">{f.companyName}</p>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
          <div className="h-12 w-12 rounded-full border-2 border-dashed border-emerald-400 flex items-center justify-center flex-shrink-0">
            <span className="text-[7px] text-emerald-500 font-black text-center leading-tight">
              COMPANY{'\n'}SEAL
            </span>
          </div>
          <p className="text-[10px] text-slate-400 italic">Official seal to be affixed here</p>
        </div>
      </div>
      <div
        className="px-10 py-3 text-[9px] text-white/80 flex justify-between"
        style={{ background: 'linear-gradient(135deg,#064e3b 0%,#10b981 100%)' }}
      >
        <span>{f.companyName}</span>
        <span>Issued in good faith</span>
        <span>Page 1 of 1</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PAYSLIP
// ═══════════════════════════════════════════════════════════════════════════

function PayslipDoc({
  payslip,
  companyName,
  companyAddress,
  companyPhone,
  companyEmail,
  companyLogoUrl,
  employeeName,
  employeeId,
  email,
  designation,
  department,
  joiningDate,
}: {
  payslip: Payslip | null;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyLogoUrl: string;
  employeeName: string;
  employeeId: string;
  email: string;
  designation: string;
  department: string;
  joiningDate: string;
}) {
  if (!payslip) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border-2 border-dashed border-slate-300 bg-white/60 px-8 py-16 text-center">
        <IconReceipt size={40} className="mx-auto text-slate-300" />
        <p className="mt-4 text-sm font-black text-slate-500">No payslip generated yet</p>
        <p className="mt-1 text-[12px] text-slate-400">
          Select an employee, choose a month &amp; year, then click "Generate Payslip" in the
          sidebar.
        </p>
      </div>
    );
  }

  const earnings = (
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
  const deductions = payslip.deductionBreakdown ?? [];
  const maxRows = Math.max(earnings.length, deductions.length);

  return (
    <div className="mx-auto bg-white shadow-2xl rounded-2xl overflow-hidden text-slate-800 font-sans">
      <div
        className="rounded-t-2xl px-5 sm:px-8 py-5 sm:py-6 text-white"
        style={{ background: 'linear-gradient(135deg, #78350f 0%, #f59e0b 100%)' }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4 sm:gap-6">
          <div className="flex items-center gap-3 sm:gap-4">
            {companyLogoUrl ? (
              // biome-ignore lint/performance/noImgElement: html2canvas needs plain img
              <img
                src={companyLogoUrl}
                alt="Logo"
                className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl object-cover bg-white/20 border border-white/30 flex-shrink-0"
              />
            ) : (
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center flex-shrink-0">
                <IconReceipt size={26} className="text-white/70" />
              </div>
            )}
            <div>
              <h1 className="text-lg sm:text-2xl font-black tracking-tight">
                {companyName || 'Company Name'}
              </h1>
              {companyAddress && (
                <p className="mt-0.5 text-[11px] text-white/75 max-w-xs leading-relaxed">
                  {companyAddress}
                </p>
              )}
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-white/65">
                {companyPhone && <span>📞 {companyPhone}</span>}
                {companyEmail && <span>✉ {companyEmail}</span>}
              </div>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <span
              className="inline-block rounded-full px-3 sm:px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.12em]"
              style={{
                background: 'rgba(255,255,255,0.18)',
                border: '1px solid rgba(255,255,255,0.35)',
              }}
            >
              Salary Slip
            </span>
            <p className="mt-3 text-base sm:text-lg font-black tracking-tight">
              {PAYSLIP_MONTHS[payslip.month]} {payslip.year}
            </p>
            <span
              className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest ${
                payslip.status === 'paid'
                  ? 'bg-emerald-300/30 text-emerald-50'
                  : 'bg-amber-200/30 text-amber-50'
              }`}
            >
              {payslip.status === 'paid' ? 'Paid' : 'Generated'}
            </span>
          </div>
        </div>
      </div>

      <div className="px-5 sm:px-10 py-6 sm:py-8">
        {/* Employee details */}
        <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
          <div className="px-4 py-2.5 bg-amber-600 text-white text-[9px] font-black uppercase tracking-widest">
            Employee Details
          </div>
          <table className="w-full">
            <tbody>
              <DetailRow label="Employee Name" value={employeeName} accent="#b45309" />
              <DetailRow label="Employee Code" value={employeeId} accent="#b45309" />
              <DetailRow label="Designation" value={designation} accent="#b45309" />
              <DetailRow label="Department" value={department} accent="#b45309" />
              <DetailRow label="Email" value={email} accent="#b45309" />
              <DetailRow
                label="Joining Date"
                value={joiningDate ? fmtDate(joiningDate) : '—'}
                accent="#b45309"
              />
              <DetailRow
                label="Pay Period"
                value={`${PAYSLIP_MONTHS[payslip.month]} ${payslip.year}`}
                accent="#b45309"
              />
              <DetailRow
                label="Days Paid"
                value={`${payslip.daysPresent} / ${payslip.calculationDays} days`}
                accent="#b45309"
              />
              <DetailRow
                label="Monthly CTC"
                value={fmtMoney(payslip.monthlyCTC)}
                accent="#b45309"
              />
              {payslip.paidDate && (
                <DetailRow label="Paid On" value={fmtDate(payslip.paidDate)} accent="#b45309" />
              )}
            </tbody>
          </table>
        </div>

        {/* Earnings / Deductions */}
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 shadow-sm">
          <div className="grid grid-cols-2">
            <div className="px-4 py-2.5 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest">
              Earnings
            </div>
            <div className="px-4 py-2.5 bg-rose-600 text-white text-[9px] font-black uppercase tracking-widest">
              Deductions
            </div>
          </div>
          <div>
            {Array.from({ length: maxRows }, (_, i) => {
              const e = earnings[i];
              const d = deductions[i];
              return (
                <div
                  key={e?.[0] ?? d?.id ?? i}
                  className={`grid grid-cols-2 ${i % 2 === 1 ? 'bg-slate-50' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2 px-4 py-2 border-r border-slate-100 text-[11px]">
                    <span className="text-slate-500">{e?.[0] ?? ''}</span>
                    <span className="font-bold text-emerald-700 tabular-nums whitespace-nowrap">
                      {e ? fmtMoney(e[1]) : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 px-4 py-2 text-[11px]">
                    <span className="text-slate-500">{d ? `${d.name} (${d.percent}%)` : ''}</span>
                    <span className="font-bold text-rose-700 tabular-nums whitespace-nowrap">
                      {d ? `−${fmtMoney(d.amount)}` : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-2 border-t-2 border-slate-200">
            <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-emerald-50 border-r border-slate-100">
              <span className="text-[11px] font-black text-emerald-700">Gross Earnings</span>
              <span className="text-[12px] font-black text-emerald-700 tabular-nums whitespace-nowrap">
                {fmtMoney(payslip.grossEarnings)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-rose-50">
              <span className="text-[11px] font-black text-rose-700">Total Deductions</span>
              <span className="text-[12px] font-black text-rose-700 tabular-nums whitespace-nowrap">
                −{fmtMoney(payslip.totalDeductions)}
              </span>
            </div>
          </div>
        </div>

        {/* Net pay banner */}
        <div
          className="mt-6 rounded-xl overflow-hidden"
          style={{ background: 'linear-gradient(135deg,#78350f,#f59e0b)' }}
        >
          <div className="grid grid-cols-1 divide-y divide-white/25 text-center text-white sm:grid-cols-3 sm:divide-y-0 sm:divide-x">
            <div className="py-4">
              <p className="text-[9px] font-bold uppercase tracking-widest text-white/70">
                In-Hand Salary
              </p>
              <p className="mt-1 text-lg sm:text-xl font-black">{fmtMoney(payslip.netPay)}</p>
            </div>
            <div className="py-4">
              <p className="text-[9px] font-bold uppercase tracking-widest text-white/70">
                Gross Earnings
              </p>
              <p className="mt-1 text-base sm:text-lg font-black">
                {fmtMoney(payslip.grossEarnings)}
              </p>
            </div>
            <div className="py-4">
              <p className="text-[9px] font-bold uppercase tracking-widest text-white/70">
                Total Deductions
              </p>
              <p className="mt-1 text-base sm:text-lg font-black">
                {fmtMoney(payslip.totalDeductions)}
              </p>
            </div>
          </div>
        </div>

        {payslip.daysPresent < payslip.calculationDays && (
          <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-[11px] text-amber-800">
            <strong>Mid-Month Payment:</strong> Covers {payslip.daysPresent} of{' '}
            {payslip.calculationDays} days. Remaining{' '}
            {payslip.calculationDays - payslip.daysPresent} day(s) will need a separate payslip once
            attendance is updated.
          </div>
        )}

        {payslip.remarks && (
          <p className="mt-4 text-[11px] italic text-slate-500">Remarks: {payslip.remarks}</p>
        )}

        <p className="mt-6 text-center text-[10px] text-slate-400 italic">
          This is a computer-generated salary slip and does not require a signature.
        </p>
      </div>
      <div
        className="px-10 py-3 text-[9px] text-white/80 flex justify-between"
        style={{ background: 'linear-gradient(135deg,#78350f 0%,#f59e0b 100%)' }}
      >
        <span>{companyName}</span>
        <span>Confidential — For {employeeName} only</span>
        <span>Page 1 of 1</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FIELD DEFINITIONS per tab
// ═══════════════════════════════════════════════════════════════════════════

type FieldKey = keyof LetterFields;

interface FieldDef {
  key: FieldKey;
  label: string;
  type?: 'text' | 'date' | 'number';
}

const COMMON_FIELDS: FieldDef[] = [
  { key: 'employeeName', label: 'Employee Name' },
  { key: 'employeeId', label: 'Employee ID' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'designation', label: 'Designation' },
  { key: 'department', label: 'Department' },
  { key: 'joiningDate', label: 'Date of Joining', type: 'date' },
];

const OFFER_EXTRA: FieldDef[] = [
  { key: 'employmentType', label: 'Employment Type' },
  { key: 'probationMonths', label: 'Probation (months)', type: 'number' },
  { key: 'manager', label: 'Reporting Manager' },
  { key: 'location', label: 'Work Location' },
  { key: 'ctc', label: 'Annual CTC (₹)', type: 'number' },
  { key: 'monthlySalary', label: 'Monthly Salary (₹)', type: 'number' },
];

const EXP_EXTRA: FieldDef[] = [{ key: 'lastWorkingDay', label: 'Last Working Day', type: 'date' }];

const COMPANY_FIELDS: FieldDef[] = [
  { key: 'companyName', label: 'Company Name' },
  { key: 'companyAddress', label: 'Company Address' },
  { key: 'companyPhone', label: 'Company Phone' },
  { key: 'companyEmail', label: 'Company Email' },
  { key: 'companyGstin', label: 'Company GSTIN' },
];

const TAB_FIELDS: Record<LetterTab, FieldDef[]> = {
  offer: [...COMMON_FIELDS, ...OFFER_EXTRA],
  appointment: [...COMMON_FIELDS, ...OFFER_EXTRA],
  experience: [...COMMON_FIELDS, ...EXP_EXTRA],
  payslip: [],
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

const TABS: { key: LetterTab; label: string; from: string; to: string }[] = [
  { key: 'offer', label: 'Offer Letter', from: '#1e3a8a', to: '#3b82f6' },
  { key: 'appointment', label: 'Joining Letter', from: '#4c1d95', to: '#7c3aed' },
  { key: 'experience', label: 'Experience Letter', from: '#064e3b', to: '#10b981' },
  { key: 'payslip', label: 'Payslip', from: '#78350f', to: '#f59e0b' },
];

export default function MainHrLetters() {
  const [tab, setTab] = useState<LetterTab>('offer');
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [fields, setFields] = useState<LetterFields>({ ...BLANK });
  const [showCompany, setShowCompany] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const [payslipMonth, setPayslipMonth] = useState(now.getMonth() + 1);
  const [payslipYear, setPayslipYear] = useState(now.getFullYear());
  const [payslipPreview, setPayslipPreview] = useState<Payslip | null>(null);
  const [payslipError, setPayslipError] = useState('');

  const user = useAppSelector(selectUser);
  const { data: employees = [] } = useEmployees();
  // The employee list is already tagged with `.tenant` under "All Companies"
  // (merged) view — resolve the picked row's own company from it, since the
  // single-employee-by-id fetch below has no way to know which tenant to look
  // in until we tell it.
  const selectedEmpRow = employees.find((e) => String(e.id) === String(selectedEmpId));
  const actAsTenantId = resolveActAsTenant(selectedEmpRow?.tenant, user?.tenantId);
  const { data: rawEmployee, isLoading: empLoading } = useEmployeeById(
    selectedEmpId,
    actAsTenantId
  );
  const { data: company } = useCompanyProfile();
  const { data: tenantRes } = useTenantQuery();
  const tenantName = tenantRes?.data?.name ?? '';

  const empBusinessId = (rawEmployee as unknown as FullEmployee | undefined)?.employeeId ?? '';
  const { data: existingPayslips } = usePayslips(empBusinessId, actAsTenantId);
  const generatePayslipMutation = useGeneratePayslip();

  // Auto-show an already-generated payslip for the selected employee + period
  useEffect(() => {
    if (!existingPayslips) {
      setPayslipPreview(null);
      return;
    }
    const found = existingPayslips.find((p) => p.month === payslipMonth && p.year === payslipYear);
    setPayslipPreview(found ?? null);
    setPayslipError('');
  }, [existingPayslips, payslipMonth, payslipYear]);

  const handleGeneratePayslip = useCallback(async () => {
    if (!empBusinessId) {
      setPayslipError('Select an employee first.');
      return;
    }
    setPayslipError('');
    try {
      const result = await generatePayslipMutation.mutateAsync({
        data: {
          employeeId: empBusinessId,
          month: payslipMonth,
          year: payslipYear,
        },
        actAsTenantId,
      });
      setPayslipPreview(result);
    } catch (e) {
      setPayslipError(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to generate payslip'
      );
    }
  }, [empBusinessId, payslipMonth, payslipYear, actAsTenantId, generatePayslipMutation]);

  // Fill company fields from DB whenever company profile or tenant data loads (only overwrites empty slots)
  useEffect(() => {
    setFields((prev) => ({
      ...prev,
      companyName: prev.companyName || company?.name || tenantName || '',
      companyAddress: prev.companyAddress || company?.address || '',
      companyPhone: prev.companyPhone || company?.phone || '',
      companyEmail: prev.companyEmail || company?.email || '',
      companyGstin: prev.companyGstin || company?.gstin || '',
      companyLogoUrl: prev.companyLogoUrl || company?.logoUrl || '',
    }));
  }, [company, tenantName]);

  // When employee loads, merge all fields but preserve user-edited terms
  useEffect(() => {
    if (!rawEmployee) return;
    const emp = rawEmployee as unknown as FullEmployee;
    setFields((prev) => fieldsFromEmployee(emp, company, prev));
  }, [rawEmployee, company]);

  const setField = useCallback((key: FieldKey, val: string) => {
    setFields((prev) => ({ ...prev, [key]: val }));
  }, []);

  const termsKey = tab === 'offer' ? 'offerTerms' : 'appointmentTerms';

  const updateTerm = useCallback(
    (idx: number, val: string) => {
      setFields((prev) => {
        const key = tab === 'offer' ? 'offerTerms' : 'appointmentTerms';
        const next = [...prev[key]];
        next[idx] = val;
        return { ...prev, [key]: next };
      });
    },
    [tab]
  );

  const addTerm = useCallback(() => {
    setFields((prev) => {
      const key = tab === 'offer' ? 'offerTerms' : 'appointmentTerms';
      return { ...prev, [key]: [...prev[key], ''] };
    });
  }, [tab]);

  const removeTerm = useCallback(
    (idx: number) => {
      setFields((prev) => {
        const key = tab === 'offer' ? 'offerTerms' : 'appointmentTerms';
        const next = prev[key].filter((_, i) => i !== idx);
        return { ...prev, [key]: next };
      });
    },
    [tab]
  );

  const handleReset = useCallback(() => {
    if (rawEmployee) {
      const emp = rawEmployee as unknown as FullEmployee;
      setFields(fieldsFromEmployee(emp, company));
    } else {
      setFields({ ...BLANK });
    }
  }, [rawEmployee, company]);

  const handleDownload = useCallback(() => {
    if (!printRef.current) return;

    // Absolute hrefs for linked stylesheets (work from any origin context).
    const linkTags = Array.from(
      document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')
    )
      .map((l) => `<link rel="stylesheet" href="${l.href}" />`)
      .join('\n');

    // Inline <style> blocks injected by Next.js (includes Tailwind CSS variables).
    const inlineStyles = Array.from(document.querySelectorAll('style'))
      .map((s) => `<style>${s.textContent ?? ''}</style>`)
      .join('\n');

    const tabLabel = TABS.find((t) => t.key === tab)?.label ?? 'HR Letter';
    const title = `${tabLabel} — ${fields.employeeName}`;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  ${linkTags}
  ${inlineStyles}
  <style>
    /* Force background colors to print */
    *, *::before, *::after {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    /* margin:0 removes Chrome's URL/date header and footer lines */
    @page { size: A4 portrait; margin: 0; }

    html, body { background: white; margin: 0; padding: 0; }

    /* No shadow, no card effect — letter fills the page like a payslip */
    * { box-shadow: none !important; }
    /* No rounded corners — clean edge-to-edge blocks */
    * { border-radius: 0 !important; }
    /* overflow-hidden clips content at page breaks */
    .overflow-hidden { overflow: visible !important; }

    /* ── Page-break control (targeted — not over-broad) ── */
    /* Never break inside a table or its rows */
    table, tr { break-inside: avoid !important; }
    /* Keep the two-column grid (each card) together */
    .grid { break-inside: avoid !important; }
    /* Keep signature block together and with the footer */
    .mt-8.grid, .mt-10 { break-inside: avoid !important; }
    /* Footer gradient bar must not be orphaned */
    .px-10.py-3 {
      break-before: avoid !important;
      page-break-before: avoid !important;
    }
  </style>
</head>
<body>
  <div style="width:100%;margin:0;padding:0;">
    ${printRef.current.outerHTML}
  </div>
  <script>
    /* Single print trigger — runs after fonts + stylesheets are ready */
    (function () {
      function go() {
        document.fonts.ready.then(function () {
          setTimeout(function () { window.focus(); window.print(); }, 400);
        });
      }
      if (document.readyState === 'complete') { go(); }
      else { window.addEventListener('load', go); }
    })();
  </script>
</body>
</html>`;

    // Blob URL: self-contained, no about:blank, no double-load race.
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const pw = window.open(blobUrl, '_blank');
    if (!pw) {
      URL.revokeObjectURL(blobUrl);
      toast.error('Pop-up blocked — allow pop-ups for this page and try again');
      return;
    }
    // Release the object URL after a generous delay.
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  }, [tab, fields.employeeName]);

  const activeTab = TABS.find((t) => t.key === tab) ?? TABS[0];
  const letterFields = TAB_FIELDS[tab];

  return (
    <div className="bg-slate-100 font-sans">
      {/* ── Page Header ── */}
      <div className="bg-card border-b border-border px-4 py-3 sm:px-6 sm:py-4 sticky top-0 z-30">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <h1 className="text-base sm:text-lg font-black text-foreground tracking-tight">
              HR Letters
            </h1>
            <div className="flex flex-wrap gap-1.5">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className="px-3 sm:px-4 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-black uppercase tracking-wide transition-all"
                  style={
                    tab === t.key
                      ? {
                          background: `linear-gradient(135deg,${t.from},${t.to})`,
                          color: '#fff',
                          boxShadow: `0 3px 10px ${t.to}55`,
                        }
                      : { background: 'var(--muted)', color: 'var(--muted-foreground)' }
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={handleDownload}
            disabled={tab === 'payslip' && !payslipPreview}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-black text-[13px] text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              background: `linear-gradient(135deg,${activeTab.from},${activeTab.to})`,
            }}
          >
            {<IconDownload size={15} />}
            Download PDF
          </button>
        </div>
      </div>

      {/* ── Two-Panel Layout ── */}
      <div className="flex flex-col lg:flex-row gap-0 items-stretch lg:items-start">
        {/* LEFT — Controls (sticky on desktop) */}
        <div className="w-full lg:w-72 flex-shrink-0 bg-card border-b lg:border-b-0 lg:border-r border-border lg:sticky lg:top-[64px] lg:h-[calc(100vh-64px)] overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Employee Selector */}
            <div>
              <label
                htmlFor="emp-select"
                className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5"
              >
                Auto-fill from Employee
              </label>
              <div className="relative">
                <select
                  id="emp-select"
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className="w-full appearance-none pl-3 pr-8 py-2 rounded-lg border border-border bg-muted text-[12px] font-semibold text-foreground outline-none focus:border-ring cursor-pointer"
                >
                  <option value="">— Select employee —</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                      {e.designation ? ` · ${e.designation}` : ''}
                    </option>
                  ))}
                </select>
                {empLoading ? (
                  <IconLoader2
                    size={13}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground"
                  />
                ) : (
                  <IconChevronDown
                    size={13}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                  />
                )}
              </div>
              {selectedEmpId && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground font-semibold"
                >
                  <IconRefresh size={11} /> Reset to employee data
                </button>
              )}
            </div>

            <div className="border-t border-border" />

            {tab === 'payslip' ? (
              /* Payslip period + generate controls */
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Payslip Period
                </p>
                {!empBusinessId && (
                  <p className="rounded-lg border border-warning/30 bg-warning/10 px-2.5 py-2 text-[11px] text-warning">
                    Select an employee above to generate a payslip.
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label
                      htmlFor="ps-month"
                      className="block text-[10px] font-bold text-muted-foreground mb-1"
                    >
                      Month
                    </label>
                    <select
                      id="ps-month"
                      value={payslipMonth}
                      onChange={(e) => setPayslipMonth(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-muted text-[12px] text-foreground outline-none focus:border-ring focus:bg-background cursor-pointer"
                    >
                      {PAYSLIP_MONTHS.slice(1).map((m, i) => (
                        <option key={m} value={i + 1}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="ps-year"
                      className="block text-[10px] font-bold text-muted-foreground mb-1"
                    >
                      Year
                    </label>
                    <select
                      id="ps-year"
                      value={payslipYear}
                      onChange={(e) => setPayslipYear(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-muted text-[12px] text-foreground outline-none focus:border-ring focus:bg-background cursor-pointer"
                    >
                      {PAYSLIP_YEARS.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {payslipError && (
                  <p className="rounded-lg border border-danger/30 bg-danger/10 px-2.5 py-2 text-[11px] text-danger">
                    {payslipError}
                  </p>
                )}

                {payslipPreview ? (
                  <div className="rounded-lg border border-success/30 bg-success/10 px-2.5 py-2 text-[11px] font-semibold text-success">
                    ✓ Payslip already generated for this period
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleGeneratePayslip}
                    disabled={!empBusinessId || generatePayslipMutation.isPending}
                    className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-[12px] font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg,#78350f,#f59e0b)' }}
                  >
                    {generatePayslipMutation.isPending ? (
                      <>
                        <IconLoader2 size={13} className="animate-spin" /> Generating…
                      </>
                    ) : (
                      'Generate Payslip'
                    )}
                  </button>
                )}
                <p className="text-[10px] text-muted-foreground">
                  Days present and working days are calculated automatically from attendance
                  records.
                </p>
              </div>
            ) : (
              /* Letter fields */
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Letter Fields
                </p>
                {letterFields.map((fd) => (
                  <div key={fd.key}>
                    <label
                      htmlFor={`f-${fd.key}`}
                      className="block text-[10px] font-bold text-muted-foreground mb-1"
                    >
                      {fd.label}
                    </label>
                    <input
                      id={`f-${fd.key}`}
                      type={fd.type ?? 'text'}
                      value={fields[fd.key]}
                      onChange={(e) => setField(fd.key, e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-muted text-[12px] text-foreground outline-none focus:border-ring focus:bg-background"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-border" />

            {/* Company fields — collapsible */}
            <div>
              <button
                type="button"
                onClick={() => setShowCompany((v) => !v)}
                className="flex w-full items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground"
              >
                Company Details
                <IconChevronDown
                  size={13}
                  className={`transition-transform ${showCompany ? 'rotate-180' : ''}`}
                />
              </button>
              {showCompany && (
                <div className="mt-3 space-y-3">
                  {COMPANY_FIELDS.map((fd) => (
                    <div key={fd.key}>
                      <label
                        htmlFor={`f-${fd.key}`}
                        className="block text-[10px] font-bold text-muted-foreground mb-1"
                      >
                        {fd.label}
                      </label>
                      <input
                        id={`f-${fd.key}`}
                        type="text"
                        value={fields[fd.key]}
                        onChange={(e) => setField(fd.key, e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-muted text-[12px] text-foreground outline-none focus:border-ring focus:bg-background"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Terms — only for offer and appointment */}
            {(tab === 'offer' || tab === 'appointment') && (
              <>
                <div className="border-t border-border" />
                <div>
                  <button
                    type="button"
                    onClick={() => setShowTerms((v) => !v)}
                    className="flex w-full items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                  >
                    Terms & Conditions
                    <IconChevronDown
                      size={13}
                      className={`transition-transform ${showTerms ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {showTerms && (
                    <div className="mt-3 space-y-2">
                      {fields[termsKey].map((term, idx) => (
                        <div key={idx} className="flex gap-1.5 items-start">
                          <textarea
                            value={term}
                            onChange={(e) => updateTerm(idx, e.target.value)}
                            rows={2}
                            className="flex-1 px-2.5 py-1.5 rounded-lg border border-border bg-muted text-[11px] text-foreground outline-none focus:border-ring focus:bg-background resize-none leading-relaxed"
                          />
                          <button
                            type="button"
                            onClick={() => removeTerm(idx)}
                            className="mt-1 flex-shrink-0 p-1 rounded-md text-muted-foreground hover:text-danger hover:bg-danger/10"
                          >
                            <IconTrash size={13} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addTerm}
                        className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground mt-1"
                      >
                        <IconPlus size={13} /> Add term
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* RIGHT — Live Preview */}
        <div className="flex-1 min-w-0 bg-slate-100 p-3 sm:p-6 overflow-x-auto">
          <div ref={printRef}>
            {tab === 'offer' && <OfferLetterDoc f={fields} />}
            {tab === 'appointment' && <AppointmentLetterDoc f={fields} />}
            {tab === 'experience' && <ExperienceLetterDoc f={fields} />}
            {tab === 'payslip' && (
              <PayslipDoc
                payslip={payslipPreview}
                companyName={fields.companyName}
                companyAddress={fields.companyAddress}
                companyPhone={fields.companyPhone}
                companyEmail={fields.companyEmail}
                companyLogoUrl={fields.companyLogoUrl}
                employeeName={fields.employeeName}
                employeeId={empBusinessId || fields.employeeId}
                email={fields.email}
                designation={fields.designation}
                department={fields.department}
                joiningDate={fields.joiningDate}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
