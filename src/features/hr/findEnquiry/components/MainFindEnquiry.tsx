'use client';

import {
  IconAlertCircle,
  IconArrowRight,
  IconBell,
  IconBellRinging,
  IconBriefcase,
  IconBuilding,
  IconCalendar,
  IconCheck,
  IconClock,
  IconExternalLink,
  IconFileText,
  IconLoader2,
  IconLock,
  IconMail,
  IconMapPin,
  IconPhone,
  IconPlus,
  IconQrcode,
  IconRefresh,
  IconSearch,
  IconSettings,
  IconUpload,
  IconUserCheck,
  IconUsers,
  IconUsersGroup,
  IconWorld,
  IconX,
} from '@tabler/icons-react';
import type { UseMutationResult } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRequireCompanySelected } from '@/features/organization/hooks/useRequireCompanySelected';
import { resolveActAsTenant } from '@/features/organization/utils/actAsTenant';
import {
  confirmUpload,
  deleteStorageFile,
  getPresignedUrl,
  replaceStorageFile,
} from '@/lib/api/storage.api';
import { useAppSelector } from '@/store/hook';
import { selectUser } from '@/store/slice/userAccountData';
import type { DocVerificationPayload, InitializeJoiningPayload } from '../server/api/candidateApi';
import {
  useCandidateHistory,
  useInitializeJoining,
  useLogCandidateCall,
  useMarkJoined,
  useSaveFollowUp,
  useVerifyDocuments,
} from '../server/tanstackQuery/useCandidateQueries';
import type { Candidate, DocEntry, DocStatus } from '../types/types';
import { ModalPortal } from '@/features/hr/_shared/components';
import { ActionCell } from './ActionCell';
import type { CandidateFieldConfig } from './AddEnquiryModal';
import AddEnquiryModal from './AddEnquiryModal';
import {
  DelayBadge,
  JLabel,
  JSectionTitle,
  STATUS_CFG,
  StatusPill,
} from './FindEnquiryUiComponents';
import { Toggle } from './Toggle';

function fmtDt(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  } catch {
    return '—';
  }
}

// selected → joining modal (special), joining_initiated → doc verify modal (special)
const NEXT_STATUSES: Record<string, string[]> = {
  pending: ['shortlisted', 'rejected'],
  shortlisted: ['interviewed', 'rejected'],
  interviewed: ['selected', 'rejected'],
  selected: [],
  joining_initiated: ['rejected'],
  joined: [],
  rejected: ['pending'],
};

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return (parts[0]?.slice(0, 2) ?? '??').toUpperCase();
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
};

const SEARCH_FIELDS: {
  key: string;
  label: string;
  type: 'text' | 'select';
  options?: { value: string; label: string }[];
}[] = [
  { key: 'candidateName', label: 'Candidate Name', type: 'text' },
  { key: 'phoneNo', label: 'Phone', type: 'text' },
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'candidateEnquiryNo', label: 'ENQ No', type: 'text' },
  { key: 'indentTitle', label: 'Applied For', type: 'text' },
  { key: 'experience', label: 'Experience', type: 'text' },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'pending', label: 'Pending' },
      { value: 'shortlisted', label: 'Shortlisted' },
      { value: 'interviewed', label: 'Interviewed' },
      { value: 'selected', label: 'Selected' },
      { value: 'rejected', label: 'Rejected' },
      { value: 'joining_initiated', label: 'Joining Initiated' },
      { value: 'joined', label: 'Joined' },
      { value: 'resigned', label: 'Resigned' },
      { value: 'terminated', label: 'Terminated' },
      { value: 'completed', label: 'Offboarded' },
    ],
  },
  { key: 'previousCompany', label: 'Previous Company', type: 'text' },
  { key: 'previousPosition', label: 'Previous Position', type: 'text' },
  {
    key: 'maritalStatus',
    label: 'Marital Status',
    type: 'select',
    options: [
      { value: 'single', label: 'Single' },
      { value: 'married', label: 'Married' },
    ],
  },
];

const getFieldValue = (c: import('../types/types').Candidate, field: string): string => {
  switch (field) {
    case 'candidateName':
      return c.candidateName;
    case 'phoneNo':
      return c.phoneNo;
    case 'email':
      return c.email ?? '';
    case 'candidateEnquiryNo':
      return c.candidateEnquiryNo ?? '';
    case 'indentTitle':
      return c.indent?.title ?? '';
    case 'experience':
      return c.experience;
    case 'status':
      return c.status;
    case 'previousCompany':
      return c.previousCompany;
    case 'previousPosition':
      return c.previousPosition;
    case 'maritalStatus':
      return c.maritalStatus;
    default:
      return '';
  }
};

// ─── Joining Init Modal ──────────────────────────────────────────────────────

const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship'];

interface LocalDocEntry extends DocEntry {
  uploading?: boolean;
  uploadProgress?: number;
}

const VALID_DOC_STATUSES: DocStatus[] = ['submitted', 'pending', 'not_required'];

const normalizeSavedDoc = (val: unknown): LocalDocEntry => {
  if (typeof val === 'string') {
    const status = VALID_DOC_STATUSES.includes(val as DocStatus) ? (val as DocStatus) : 'pending';
    return { status };
  }
  if (val && typeof val === 'object') {
    const o = val as Record<string, unknown>;
    const status = VALID_DOC_STATUSES.includes(o.status as DocStatus)
      ? (o.status as DocStatus)
      : 'pending';
    return {
      status,
      url: typeof o.url === 'string' ? o.url : undefined,
      mediaId: typeof o.mediaId === 'string' ? o.mediaId : undefined,
      fileName: typeof o.fileName === 'string' ? o.fileName : undefined,
    };
  }
  return { status: 'pending' };
};

const JOINING_DOCS = [
  { key: 'aadhar', label: 'Aadhar Card' },
  { key: 'pan', label: 'PAN Card' },
  { key: 'tenth', label: '10th Certificate' },
  { key: 'twelfth', label: '12th Certificate' },
  { key: 'graduation', label: 'Graduation Certificate' },
  { key: 'experience_letter', label: 'Experience / Relieving Letter' },
  { key: 'bank_passbook', label: 'Bank Passbook / Cancelled Cheque' },
  { key: 'passport_photo', label: 'Passport Photo' },
  { key: 'medical', label: 'Medical Fitness Certificate' },
  { key: 'police_verification', label: 'Police Verification Certificate' },
];

const jInputCls =
  'h-10 w-full rounded-lg border border-border bg-muted px-3 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary';

type JoiningMutation = UseMutationResult<
  import('../types/types').Candidate,
  unknown,
  { id: string | number; payload: InitializeJoiningPayload; actAsTenantId?: string },
  unknown
>;

const ATTENDANCE_MODES = ['Office / On-site', 'Remote / WFH', 'Hybrid', 'Field'];
const PAYMENT_MODES = ['Bank Transfer', 'NEFT', 'RTGS', 'IMPS', 'Cheque', 'Cash'];

const JoiningInitModal: React.FC<{
  candidate: import('../types/types').Candidate;
  onClose: () => void;
  mutation: JoiningMutation;
}> = ({ candidate, onClose, mutation }) => {
  const user = useAppSelector(selectUser);
  const [form, setForm] = useState({
    // Personal
    fatherName: '',
    highestQualification: '',
    currentAddress: candidate.currentAddress ?? '',
    aadharAddress: '',
    aadharNo: candidate.aadharNo ?? '',
    // Job
    joiningDate: '',
    employmentType: 'Full-time',
    designationOffered: candidate.indent?.title ?? '',
    companyName: '',
    joiningPlace: '',
    attendanceMode: '',
    offeredCTC: '',
    monthlySalary: '',
    probationMonths: 3,
    reportingManager: '',
    workLocation: '',
    // Bank
    bankAccount: '',
    bankBranchName: '',
    ifscCode: '',
    paymentMode: '',
    // Emergency contact
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
    // Issuances / eligibility (stored as 'yes'|'no'|'' for select)
    emailToBeIssued: '',
    mobileToBeIssued: '',
    laptopToBeIssued: '',
    pfEligible: '',
    esicEligible: '',
    pastPfNo: '',
    esicNo: '',
  });
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((p) => ({
      ...p,
      [name]: name === 'probationMonths' ? parseInt(value, 10) || 0 : value,
    }));
    setError(null);
  };

  const parseBool = (v: string): boolean | undefined =>
    v === 'yes' ? true : v === 'no' ? false : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.joiningDate) {
      setError('Joining date is required.');
      return;
    }
    if (!form.offeredCTC.trim()) {
      setError('Offered CTC is required.');
      return;
    }
    if (!form.monthlySalary.trim()) {
      setError('Monthly salary is required.');
      return;
    }
    try {
      await mutation.mutateAsync({
        id: candidate.id,
        payload: {
          joiningDate: new Date(form.joiningDate).toISOString(),
          employmentType: form.employmentType,
          offeredCTC: form.offeredCTC,
          monthlySalary: form.monthlySalary ? Number(form.monthlySalary) : undefined,
          probationMonths: form.probationMonths,
          reportingManager: form.reportingManager || undefined,
          workLocation: form.workLocation || undefined,
          bankAccount: form.bankAccount || undefined,
          ifscCode: form.ifscCode || undefined,
          emergencyContactName: form.emergencyContactName || undefined,
          emergencyContactPhone: form.emergencyContactPhone || undefined,
          fatherName: form.fatherName || undefined,
          highestQualification: form.highestQualification || undefined,
          currentAddress: form.currentAddress || undefined,
          aadharAddress: form.aadharAddress || undefined,
          aadharNo: form.aadharNo || undefined,
          designationOffered: form.designationOffered || undefined,
          companyName: form.companyName || undefined,
          joiningPlace: form.joiningPlace || undefined,
          attendanceMode: form.attendanceMode || undefined,
          bankBranchName: form.bankBranchName || undefined,
          paymentMode: form.paymentMode || undefined,
          emergencyContactRelation: form.emergencyContactRelation || undefined,
          emailToBeIssued: parseBool(form.emailToBeIssued),
          mobileToBeIssued: parseBool(form.mobileToBeIssued),
          laptopToBeIssued: parseBool(form.laptopToBeIssued),
          pfEligible: parseBool(form.pfEligible),
          esicEligible: parseBool(form.esicEligible),
          pastPfNo: form.pastPfNo || undefined,
          esicNo: form.esicNo || undefined,
        },
        actAsTenantId: resolveActAsTenant(candidate.tenant, user?.tenantId),
      });
      onClose();
    } catch (_err) {
      setError('Failed to initialize joining. Please try again.');
    }
  };

  const selectCls = `${jInputCls} cursor-pointer pr-8`;

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <IconArrowRight className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[15px] font-bold">Initialize Joining</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {candidate.candidateName} · {candidate.indent?.title ?? 'Direct Enquiry'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-[12px] text-destructive"
              >
                <IconAlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Pre-filled info banner */}
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-muted/40 p-4 sm:grid-cols-3">
              <div>
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                  Candidate
                </p>
                <p className="mt-0.5 text-[13px] font-semibold">{candidate.candidateName}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                  Position
                </p>
                <p className="mt-0.5 text-[13px] font-semibold">
                  {candidate.indent?.title ?? 'Direct Enquiry'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                  Experience
                </p>
                <p className="mt-0.5 text-[13px] font-semibold">{candidate.experience || '—'}</p>
              </div>
            </div>

            {/* ── Personal Info ── */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <JSectionTitle>Personal Information</JSectionTitle>
              <div>
                <JLabel optional>Father Name</JLabel>
                <input
                  type="text"
                  name="fatherName"
                  value={form.fatherName}
                  onChange={handleChange}
                  placeholder="Father's full name"
                  className={jInputCls}
                />
              </div>
              <div>
                <JLabel optional>Highest Qualification</JLabel>
                <input
                  type="text"
                  name="highestQualification"
                  value={form.highestQualification}
                  onChange={handleChange}
                  placeholder="e.g. B.Tech, MBA"
                  className={jInputCls}
                />
              </div>
              <div>
                <JLabel optional>Aadhar No.</JLabel>
                <input
                  type="text"
                  name="aadharNo"
                  value={form.aadharNo}
                  onChange={handleChange}
                  placeholder="12-digit Aadhar number"
                  className={jInputCls}
                />
              </div>
            </div>

            {/* ── Address ── */}
            <div className="grid grid-cols-1 gap-4">
              <JSectionTitle>Address Details</JSectionTitle>
              <div>
                <JLabel optional>Current Address</JLabel>
                <input
                  type="text"
                  name="currentAddress"
                  value={form.currentAddress}
                  onChange={handleChange}
                  placeholder="Current residential address"
                  className={jInputCls}
                />
              </div>
              <div>
                <JLabel optional>Address as per Aadhar</JLabel>
                <input
                  type="text"
                  name="aadharAddress"
                  value={form.aadharAddress}
                  onChange={handleChange}
                  placeholder="Address as printed on Aadhar card"
                  className={jInputCls}
                />
              </div>
            </div>

            {/* ── Job Details ── */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <JSectionTitle>Job Details</JSectionTitle>
              <div>
                <JLabel>Joining Date</JLabel>
                <input
                  required
                  type="date"
                  name="joiningDate"
                  value={form.joiningDate}
                  onChange={handleChange}
                  className={jInputCls}
                />
              </div>
              <div>
                <JLabel>Employment Type</JLabel>
                <select
                  name="employmentType"
                  value={form.employmentType}
                  onChange={handleChange}
                  className={selectCls}
                >
                  {EMPLOYMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <JLabel optional>Designation</JLabel>
                <input
                  type="text"
                  name="designationOffered"
                  value={form.designationOffered}
                  onChange={handleChange}
                  placeholder="Offered designation"
                  className={jInputCls}
                />
              </div>
              <div>
                <JLabel optional>Joining Company Name</JLabel>
                <input
                  type="text"
                  name="companyName"
                  value={form.companyName}
                  onChange={handleChange}
                  placeholder="Name of the company"
                  className={jInputCls}
                />
              </div>
              <div>
                <JLabel optional>Joining Place</JLabel>
                <input
                  type="text"
                  name="joiningPlace"
                  value={form.joiningPlace}
                  onChange={handleChange}
                  placeholder="Branch / office where joining"
                  className={jInputCls}
                />
              </div>
              <div>
                <JLabel optional>Mode of Attendance</JLabel>
                <select
                  name="attendanceMode"
                  value={form.attendanceMode}
                  onChange={handleChange}
                  className={selectCls}
                >
                  <option value="">Select mode…</option>
                  {ATTENDANCE_MODES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <JLabel optional>Work Location</JLabel>
                <input
                  type="text"
                  name="workLocation"
                  value={form.workLocation}
                  onChange={handleChange}
                  placeholder="Regular office / city"
                  className={jInputCls}
                />
              </div>
              <div>
                <JLabel optional>Reporting Manager</JLabel>
                <input
                  type="text"
                  name="reportingManager"
                  value={form.reportingManager}
                  onChange={handleChange}
                  placeholder="Manager name"
                  className={jInputCls}
                />
              </div>
            </div>

            {/* ── Salary ── */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <JSectionTitle>Compensation</JSectionTitle>
              <div>
                <JLabel>Offered CTC / Annual</JLabel>
                <input
                  required
                  type="text"
                  name="offeredCTC"
                  value={form.offeredCTC}
                  onChange={handleChange}
                  placeholder="e.g. ₹6,00,000 p.a."
                  className={jInputCls}
                />
              </div>
              <div>
                <JLabel>Monthly Salary (₹)</JLabel>
                <input
                  required
                  type="number"
                  min="0"
                  name="monthlySalary"
                  value={form.monthlySalary}
                  onChange={handleChange}
                  placeholder="e.g. 50000"
                  className={jInputCls}
                />
              </div>
              <div>
                <JLabel>Probation (months)</JLabel>
                <input
                  type="number"
                  name="probationMonths"
                  min={0}
                  value={form.probationMonths}
                  onChange={handleChange}
                  className={jInputCls}
                />
              </div>
            </div>

            {/* ── Bank Details ── */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <JSectionTitle>Bank Details</JSectionTitle>
              <div>
                <JLabel optional>Current Account No.</JLabel>
                <input
                  type="text"
                  name="bankAccount"
                  value={form.bankAccount}
                  onChange={handleChange}
                  placeholder="Account number"
                  className={jInputCls}
                />
              </div>
              <div>
                <JLabel optional>Branch Name</JLabel>
                <input
                  type="text"
                  name="bankBranchName"
                  value={form.bankBranchName}
                  onChange={handleChange}
                  placeholder="e.g. Andheri East Branch"
                  className={jInputCls}
                />
              </div>
              <div>
                <JLabel optional>IFSC Code</JLabel>
                <input
                  type="text"
                  name="ifscCode"
                  value={form.ifscCode}
                  onChange={handleChange}
                  placeholder="e.g. SBIN0001234"
                  className={jInputCls}
                />
              </div>
              <div>
                <JLabel optional>Payment Mode</JLabel>
                <select
                  name="paymentMode"
                  value={form.paymentMode}
                  onChange={handleChange}
                  className={selectCls}
                >
                  <option value="">Select mode…</option>
                  {PAYMENT_MODES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* ── Emergency Contact ── */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <JSectionTitle>Emergency Contact</JSectionTitle>
              <div>
                <JLabel optional>Contact Name</JLabel>
                <input
                  type="text"
                  name="emergencyContactName"
                  value={form.emergencyContactName}
                  onChange={handleChange}
                  placeholder="Full name"
                  className={jInputCls}
                />
              </div>
              <div>
                <JLabel optional>Contact Phone</JLabel>
                <input
                  type="text"
                  name="emergencyContactPhone"
                  value={form.emergencyContactPhone}
                  onChange={handleChange}
                  placeholder="+91 XXXXXXXXXX"
                  className={jInputCls}
                />
              </div>
              <div>
                <JLabel optional>Relationship</JLabel>
                <input
                  type="text"
                  name="emergencyContactRelation"
                  value={form.emergencyContactRelation}
                  onChange={handleChange}
                  placeholder="e.g. Father, Spouse"
                  className={jInputCls}
                />
              </div>
            </div>

            {/* ── Issuances ── */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <JSectionTitle>Issuances</JSectionTitle>
              {(
                [
                  { name: 'emailToBeIssued', label: 'Email ID to be Issued' },
                  { name: 'mobileToBeIssued', label: 'Mobile to be Issued' },
                  { name: 'laptopToBeIssued', label: 'Laptop to be Issued' },
                ] as { name: keyof typeof form; label: string }[]
              ).map(({ name, label }) => (
                <div key={name}>
                  <JLabel optional>{label}</JLabel>
                  <select
                    name={name}
                    value={form[name] as string}
                    onChange={handleChange}
                    className={selectCls}
                  >
                    <option value="">Select…</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
              ))}
            </div>

            {/* ── PF / ESIC ── */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
              <JSectionTitle>PF / ESIC</JSectionTitle>
              <div>
                <JLabel optional>PF Eligible</JLabel>
                <select
                  name="pfEligible"
                  value={form.pfEligible}
                  onChange={handleChange}
                  className={selectCls}
                >
                  <option value="">Select…</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div>
                <JLabel optional>Past PF No. (if any)</JLabel>
                <input
                  type="text"
                  name="pastPfNo"
                  value={form.pastPfNo}
                  onChange={handleChange}
                  placeholder="Previous PF number"
                  className={jInputCls}
                />
              </div>
              <div>
                <JLabel optional>ESIC Eligible</JLabel>
                <select
                  name="esicEligible"
                  value={form.esicEligible}
                  onChange={handleChange}
                  className={selectCls}
                >
                  <option value="">Select…</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div>
                <JLabel optional>ESIC No. (if any)</JLabel>
                <input
                  type="text"
                  name="esicNo"
                  value={form.esicNo}
                  onChange={handleChange}
                  placeholder="ESIC number"
                  className={jInputCls}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-muted px-4 text-[12px] font-semibold transition-colors hover:bg-muted-foreground/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-[12px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {mutation.isPending ? (
                <>
                  <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <IconCheck className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Initialize Joining
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
};

// ─── Doc Verification Modal ───────────────────────────────────────────────────

type DocMutation = UseMutationResult<
  import('../types/types').Candidate,
  unknown,
  { id: string | number; payload: DocVerificationPayload; actAsTenantId?: string },
  unknown
>;

const ALLOWED_DOC_TYPES = 'image/jpeg,image/png,image/webp,application/pdf';

const DocVerificationModal: React.FC<{
  candidate: import('../types/types').Candidate;
  onClose: () => void;
  mutation: DocMutation;
  docConfig: Record<string, DocSetting>;
}> = ({ candidate, onClose, mutation, docConfig }) => {
  const user = useAppSelector(selectUser);
  const savedDocs = (candidate.joining?.documents ?? {}) as Record<string, unknown>;
  const isAlreadyVerified = candidate.joining?.status === 'docs_verified';

  const allDocs = isAlreadyVerified
    ? Object.keys(savedDocs).map((key) => ({
        key,
        label: JOINING_DOCS.find((d) => d.key === key)?.label ?? docConfig[key]?.label ?? key,
      }))
    : [
        ...JOINING_DOCS.map((d) => ({ key: d.key, label: d.label })),
        ...Object.entries(docConfig)
          .filter(([, cfg]) => cfg.custom)
          .map(([key, cfg]) => ({ key, label: cfg.label ?? key })),
      ].filter(({ key }) => docConfig[key]?.included !== false);

  const [docs, setDocs] = useState<Record<string, LocalDocEntry>>(() =>
    Object.fromEntries(allDocs.map((d) => [d.key, normalizeSavedDoc(savedDocs[d.key])]))
  );
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const anyUploading = Object.values(docs).some((d) => d.uploading);

  const handleFileChange = async (key: string, file: File) => {
    if (!ALLOWED_DOC_TYPES.split(',').includes(file.type)) {
      setError('Only PDF, JPEG, PNG, or WebP files are allowed.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be under 10 MB.');
      return;
    }
    setError(null);
    const oldMediaId = docs[key]?.mediaId;
    setDocs((prev) => ({
      ...prev,
      [key]: { status: 'pending', uploading: true, uploadProgress: 0 },
    }));
    try {
      const ext = file.name.split('.').pop() ?? 'bin';
      const path = `hr-joining/${candidate.id}/${key}-${Date.now()}.${ext}`;
      const presigned = oldMediaId
        ? await replaceStorageFile(oldMediaId, 'uploads', path, file.type, true)
        : await getPresignedUrl('uploads', path, file.type, true);
      setDocs((prev) => ({ ...prev, [key]: { ...prev[key]!, uploadProgress: 10 } }));
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round(10 + (e.loaded / e.total) * 80);
            setDocs((prev) => ({ ...prev, [key]: { ...prev[key]!, uploadProgress: pct } }));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed: ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.open(presigned.method, presigned.uploadUrl);
        if (presigned.method === 'POST' && presigned.fields) {
          const fd = new FormData();
          Object.entries(presigned.fields).forEach(([k, v]) => {
            fd.append(k, v);
          });
          fd.append('file', file);
          xhr.send(fd);
        } else {
          Object.entries(presigned.headers ?? {}).forEach(([k, v]) => {
            xhr.setRequestHeader(k, v);
          });
          xhr.send(file);
        }
      });
      const confirmed = await confirmUpload(presigned.sessionId, file.size);
      setDocs((prev) => ({
        ...prev,
        [key]: {
          status: 'submitted',
          url: confirmed.publicUrl,
          mediaId: confirmed.mediaId,
          fileName: file.name,
          uploading: false,
          uploadProgress: 100,
        },
      }));
    } catch (_err) {
      setError('Failed to upload. Please try again.');
      setDocs((prev) => ({ ...prev, [key]: { status: 'pending', uploading: false } }));
    }
  };

  const handleRemove = (key: string) => {
    const mid = docs[key]?.mediaId;
    if (mid) {
      deleteStorageFile({ mediaId: mid }).catch(() => {});
    }
    setDocs((prev) => ({ ...prev, [key]: { status: 'pending' } }));
  };

  const handleNotRequired = (key: string) => {
    const mid = docs[key]?.mediaId;
    if (mid) {
      deleteStorageFile({ mediaId: mid }).catch(() => {});
    }
    setDocs((prev) => ({ ...prev, [key]: { status: 'not_required' } }));
  };

  const handleUndo = (key: string) => {
    setDocs((prev) => ({ ...prev, [key]: { status: 'pending' } }));
  };

  const buildPayload = (complete: boolean): DocVerificationPayload => {
    const cleanDocs: Record<string, DocEntry> = {};
    for (const [k, v] of Object.entries(docs)) {
      cleanDocs[k] = { status: v.status, url: v.url, mediaId: v.mediaId, fileName: v.fileName };
    }
    return { documents: cleanDocs, notes: notes || undefined, complete };
  };

  const actAsTenantId = resolveActAsTenant(candidate.tenant, user?.tenantId);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await mutation.mutateAsync({ id: candidate.id, payload: buildPayload(false), actAsTenantId });
    } catch (_err) {
      setError('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await mutation.mutateAsync({ id: candidate.id, payload: buildPayload(true), actAsTenantId });
      onClose();
    } catch (_err) {
      setError('Failed to complete verification. Please try again.');
    }
  };

  const requiredPending = allDocs.some(
    (d) => docConfig[d.key]?.required === true && docs[d.key]?.status !== 'submitted'
  );
  const isPending = mutation.isPending || isSaving || anyUploading;

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
      <div
        className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-border px-6 py-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success/12 text-success">
            <IconFileText className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[15px] font-bold">Document Verification</h2>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {candidate.candidateName}
            </p>
          </div>
          {isAlreadyVerified && (
            <span className="shrink-0 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-success">
              Already Verified
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleComplete} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-2 overflow-y-auto px-6 py-5">
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-[12px] text-destructive"
              >
                <IconAlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <ul className="space-y-2.5">
              {allDocs.map((doc) => {
                const entry = docs[doc.key] ?? ({ status: 'pending' } as LocalDocEntry);
                const isRequired = docConfig[doc.key]?.required === true;
                return (
                  <li key={doc.key} className="rounded-xl border border-border bg-muted/20 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-[13px] font-semibold leading-tight">{doc.label}</span>
                      {isRequired && (
                        <span className="rounded-full bg-destructive/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-destructive">
                          required
                        </span>
                      )}
                      <span className="ml-auto shrink-0">
                        {entry.uploading ? (
                          <span className="flex items-center gap-1 text-[10px] text-primary">
                            <IconLoader2 className="h-3 w-3 animate-spin" />
                            {entry.uploadProgress ?? 0}%
                          </span>
                        ) : entry.status === 'submitted' ? (
                          <span className="rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                            ✓ Submitted
                          </span>
                        ) : entry.status === 'not_required' ? (
                          <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                            — Not Required
                          </span>
                        ) : (
                          <span className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning">
                            ⏳ Pending
                          </span>
                        )}
                      </span>
                    </div>

                    {entry.uploading && (
                      <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${entry.uploadProgress ?? 0}%` }}
                        />
                      </div>
                    )}

                    {entry.status === 'submitted' && !entry.uploading && (
                      <div className="flex items-center gap-2">
                        <IconFileText className="h-4 w-4 shrink-0 text-success" />
                        <span className="min-w-0 flex-1 truncate text-[12px] text-foreground">
                          {entry.fileName ?? 'Uploaded file'}
                        </span>
                        {entry.url && (
                          <a
                            href={entry.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 text-[11px] font-semibold text-primary hover:underline"
                          >
                            View
                          </a>
                        )}
                        <label
                          htmlFor={`doc-replace-${doc.key}`}
                          className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-lg border border-border bg-transparent px-2 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted"
                        >
                          <input
                            id={`doc-replace-${doc.key}`}
                            type="file"
                            className="sr-only"
                            accept={ALLOWED_DOC_TYPES}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) {
                                handleFileChange(doc.key, f);
                              }
                              e.target.value = '';
                            }}
                          />
                          Replace
                        </label>
                        <button
                          type="button"
                          onClick={() => handleRemove(doc.key)}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        >
                          <IconX className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}

                    {entry.status === 'pending' && !entry.uploading && (
                      <div className="flex items-center gap-2">
                        <label
                          htmlFor={`doc-upload-${doc.key}`}
                          className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-primary/10 px-3 text-[12px] font-semibold text-primary transition-colors hover:bg-primary/20"
                        >
                          <input
                            id={`doc-upload-${doc.key}`}
                            type="file"
                            className="sr-only"
                            accept={ALLOWED_DOC_TYPES}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) {
                                handleFileChange(doc.key, f);
                              }
                              e.target.value = '';
                            }}
                          />
                          <IconUpload className="h-3.5 w-3.5" />
                          Upload
                        </label>
                        {!isRequired && (
                          <button
                            type="button"
                            onClick={() => handleNotRequired(doc.key)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-transparent px-3 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted"
                          >
                            Not Required
                          </button>
                        )}
                      </div>
                    )}

                    {entry.status === 'not_required' && !entry.uploading && (
                      <button
                        type="button"
                        onClick={() => handleUndo(doc.key)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-transparent px-3 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted"
                      >
                        <IconRefresh className="h-3.5 w-3.5" />
                        Mark as Pending
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="pt-1">
              <JLabel optional>Remarks</JLabel>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any notes about document verification…"
                className={jInputCls}
              />
            </div>

            {requiredPending && (
              <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2.5 text-[11px] text-warning">
                <IconAlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>Upload all required documents to enable complete verification.</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-border bg-muted/30 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-muted px-4 text-[12px] font-semibold transition-colors hover:bg-muted-foreground/10"
            >
              Cancel
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-transparent px-4 text-[12px] font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <IconLoader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
                  </>
                ) : (
                  'Save'
                )}
              </button>
              <button
                type="submit"
                disabled={isPending || requiredPending}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-success px-4 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {mutation.isPending && !isSaving ? (
                  <>
                    <IconLoader2 className="h-3.5 w-3.5 animate-spin" /> Completing…
                  </>
                ) : (
                  <>
                    <IconCheck className="h-3.5 w-3.5" strokeWidth={2.5} />
                    {isAlreadyVerified ? 'Re-verify' : 'Complete Verification'}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

interface DocSetting {
  included: boolean;
  required: boolean;
  label?: string;
  custom?: boolean;
}

const DocSettingsModal: React.FC<{
  docConfig: Record<string, DocSetting>;
  setDocConfig: React.Dispatch<React.SetStateAction<Record<string, DocSetting>>>;
  onClose: () => void;
}> = ({ docConfig, setDocConfig, onClose }) => {
  const [newDocLabel, setNewDocLabel] = useState('');

  const toggle = (key: string, field: 'included' | 'required') => {
    setDocConfig((prev) => {
      const current: DocSetting = prev[key] ?? { included: true, required: false };
      if (field === 'included') {
        const newIncluded = !current.included;
        // turning off Included must also turn off Required
        return {
          ...prev,
          [key]: {
            ...current,
            included: newIncluded,
            required: newIncluded ? current.required : false,
          },
        };
      }
      return { ...prev, [key]: { ...current, required: !current.required } };
    });
  };

  const addCustomDoc = () => {
    const label = newDocLabel.trim();
    if (!label) return;
    const key = `custom_${Date.now()}`;
    setDocConfig((prev) => ({
      ...prev,
      [key]: { included: true, required: false, label, custom: true },
    }));
    setNewDocLabel('');
  };

  const removeCustomDoc = (key: string) => {
    setDocConfig((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  // Built-in docs first, then custom
  const builtIn = JOINING_DOCS.map((d) => ({ key: d.key, label: d.label, custom: false }));
  const custom = Object.entries(docConfig)
    .filter(([, cfg]) => cfg.custom)
    .map(([key, cfg]) => ({ key, label: cfg.label ?? key, custom: true }));
  const allRows = [...builtIn, ...custom];

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
      <div
        className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <IconFileText className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[15px] font-bold">Required Documents</p>
              <p className="text-[11px] text-muted-foreground">
                Configure which docs appear and which are required
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>

        {/* Column headers */}
        <div className="flex items-center border-b border-border bg-muted/40 px-5 py-2">
          <span className="flex-1 text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
            Document
          </span>
          <div className="flex w-44 shrink-0 items-center">
            <span className="w-20 text-center text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
              Included
            </span>
            <span className="w-20 text-center text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
              Required
            </span>
          </div>
        </div>

        {/* Rows */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          <ul className="space-y-1">
            {allRows.map(({ key, label, custom }) => {
              const cfg: DocSetting =
                docConfig[key] && typeof docConfig[key] === 'object' && 'included' in docConfig[key]
                  ? (docConfig[key] as DocSetting)
                  : { included: true, required: false };
              return (
                <li
                  key={key}
                  className="flex items-center gap-2 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/40"
                >
                  <span className="flex-1 text-[13px] font-medium text-foreground">{label}</span>
                  {custom && (
                    <button
                      type="button"
                      onClick={() => removeCustomDoc(key)}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <IconX className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {/* Included cell */}
                  <div className="flex w-20 shrink-0 items-center justify-center gap-1.5">
                    <Toggle on={cfg.included} onChange={() => toggle(key, 'included')} />
                    <span
                      className={`w-6 text-[11px] font-medium ${cfg.included ? 'text-primary' : 'text-muted-foreground'}`}
                    >
                      {cfg.included ? 'Yes' : 'No'}
                    </span>
                  </div>
                  {/* Required cell — disabled when not included */}
                  <div
                    className={`flex w-20 shrink-0 items-center justify-center gap-1.5 transition-opacity ${!cfg.included ? 'opacity-35' : ''}`}
                  >
                    <Toggle
                      on={cfg.required}
                      onChange={() => toggle(key, 'required')}
                      disabled={!cfg.included}
                    />
                    <span
                      className={`w-6 text-[11px] font-medium ${cfg.required && cfg.included ? 'text-primary' : 'text-muted-foreground'}`}
                    >
                      {cfg.required && cfg.included ? 'Yes' : 'No'}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Add custom doc */}
        <div className="border-t border-border px-5 py-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={newDocLabel}
              onChange={(e) => setNewDocLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCustomDoc();
                }
              }}
              placeholder="Add custom document…"
              className="h-9 flex-1 rounded-lg border border-border bg-muted px-3 text-[12px] text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
            />
            <button
              type="button"
              onClick={addCustomDoc}
              disabled={!newDocLabel.trim()}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary/10 px-3 text-[12px] font-semibold text-primary transition-colors hover:bg-primary/20 disabled:pointer-events-none disabled:opacity-40"
            >
              <IconPlus className="h-3.5 w-3.5" strokeWidth={2.5} />
              Add
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border bg-muted/30 px-6 py-4">
          <button
            type="button"
            onClick={() => setDocConfig(DEFAULT_DOC_CONFIG)}
            className="text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            Reset to defaults
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-[12px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <IconCheck className="h-3.5 w-3.5" strokeWidth={2.5} />
            Done
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};

const FIELD_CONFIG_STORAGE_KEY = 'hr-candidate-field-config';
const DOC_CONFIG_STORAGE_KEY = 'hr-candidate-doc-config';

const DEFAULT_DOC_CONFIG: Record<string, DocSetting> = Object.fromEntries(
  JOINING_DOCS.map((d) => [d.key, { included: true, required: true }])
);

const DEFAULT_FIELD_CONFIG: CandidateFieldConfig = {
  dob: true,
  email: false,
  previousCompany: true,
  previousPosition: true,
  experience: true,
  maritalStatus: true,
  aadharNo: true,
  lastSalary: true,
  reasonForLeaving: true,
  currentAddress: true,
  photo: false,
  resume: false,
};

const CONFIGURABLE_FIELDS: { key: keyof CandidateFieldConfig; label: string }[] = [
  { key: 'dob', label: 'Date of Birth' },
  { key: 'email', label: 'Email' },
  { key: 'previousCompany', label: 'Previous Company' },
  { key: 'previousPosition', label: 'Previous Position' },
  { key: 'experience', label: 'Experience' },
  { key: 'maritalStatus', label: 'Marital Status' },
  { key: 'aadharNo', label: 'Aadhar Number' },
  { key: 'lastSalary', label: 'Last Salary' },
  { key: 'reasonForLeaving', label: 'Reason for Leaving' },
  { key: 'currentAddress', label: 'Current Address' },
  { key: 'photo', label: 'Photo' },
  { key: 'resume', label: 'Resume' },
];

const FIELD_ORDER_KEYS: (keyof CandidateFieldConfig)[] = [
  'dob',
  'email',
  'previousCompany',
  'previousPosition',
  'experience',
  'maritalStatus',
  'aadharNo',
  'lastSalary',
  'reasonForLeaving',
  'currentAddress',
  'photo',
  'resume',
];

const MainFindEnquiry = () => {
  const requireCompanySelected = useRequireCompanySelected();
  const { data: candidates, isLoading, isError, refetch } = useCandidateHistory();
  const currentUser = useAppSelector(selectUser);
  const [searchField, setSearchField] = useState('candidateName');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isFormSettingsOpen, setIsFormSettingsOpen] = useState(false);
  const [showDirectQr, setShowDirectQr] = useState(false);
  const [directQrUrl, setDirectQrUrl] = useState('');
  const [isDocSettingsOpen, setIsDocSettingsOpen] = useState(false);
  const [docConfig, setDocConfig] = useState<Record<string, DocSetting>>(() => {
    try {
      const stored = localStorage.getItem(DOC_CONFIG_STORAGE_KEY);
      if (stored)
        return { ...DEFAULT_DOC_CONFIG, ...(JSON.parse(stored) as Record<string, DocSetting>) };
    } catch (_e) {}
    return DEFAULT_DOC_CONFIG;
  });

  useEffect(() => {
    try {
      localStorage.setItem(DOC_CONFIG_STORAGE_KEY, JSON.stringify(docConfig));
    } catch (_e) {}
  }, [docConfig]);
  const [resumeCandidate, setResumeCandidate] = useState<import('../types/types').Candidate | null>(
    null
  );
  const [photoViewUrl, setPhotoViewUrl] = useState<string | null>(null);
  const [followUpCandidate, setFollowUpCandidate] = useState<Candidate | null>(null);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const saveFollowUp = useSaveFollowUp();
  const [viewCandidate, setViewCandidate] = useState<import('../types/types').Candidate | null>(
    null
  );
  const [updateCandidate, setUpdateCandidate] = useState<import('../types/types').Candidate | null>(
    null
  );
  const [updateNotes, setUpdateNotes] = useState('');
  const [markJoinedDate, setMarkJoinedDate] = useState('');
  const [joiningInitCandidate, setJoiningInitCandidate] = useState<
    import('../types/types').Candidate | null
  >(null);
  const [docVerifyCandidate, setDocVerifyCandidate] = useState<
    import('../types/types').Candidate | null
  >(null);
  const logCall = useLogCandidateCall();
  const initJoining = useInitializeJoining();
  const verifyDocs = useVerifyDocuments();
  const markJoined = useMarkJoined();

  const handleStatusUpdate = useCallback(
    async (status: string) => {
      if (!updateCandidate) return;
      await logCall.mutateAsync({
        id: updateCandidate.id,
        payload: { status, notes: updateNotes },
        actAsTenantId: resolveActAsTenant(updateCandidate.tenant, currentUser?.tenantId),
      });
      setUpdateCandidate(null);
      setUpdateNotes('');
    },
    [updateCandidate, updateNotes, logCall, currentUser?.tenantId]
  );
  const [fieldConfig, setFieldConfig] = useState<CandidateFieldConfig>(() => {
    try {
      const stored = localStorage.getItem(FIELD_CONFIG_STORAGE_KEY);
      if (stored)
        return {
          ...DEFAULT_FIELD_CONFIG,
          ...(JSON.parse(stored) as Partial<CandidateFieldConfig>),
        };
    } catch (_e) {}
    return DEFAULT_FIELD_CONFIG;
  });

  useEffect(() => {
    try {
      localStorage.setItem(FIELD_CONFIG_STORAGE_KEY, JSON.stringify(fieldConfig));
    } catch (_e) {}
  }, [fieldConfig]);

  useEffect(() => {
    if (!currentUser?.tenantId) return;
    const encoded = FIELD_ORDER_KEYS.map((k) => (fieldConfig[k] ? '1' : '0')).join('');
    setDirectQrUrl(`${window.location.origin}/apply/direct/${currentUser.tenantId}?cfg=${encoded}`);
  }, [currentUser?.tenantId, fieldConfig]);

  const toggleFieldRequired = useCallback((key: keyof CandidateFieldConfig) => {
    setFieldConfig((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const backendBase = ((import.meta.env?.VITE_API_URL as string) ?? '').replace(/\/api\/?$/, '');
  const resolveUrl = (path: string) =>
    path.startsWith('http') ? path : `${backendBase}/${path.replace(/^\//, '')}`;

  const currentFieldDef = SEARCH_FIELDS.find((f) => f.key === searchField) ?? SEARCH_FIELDS[0]!;

  const filtered = useMemo(() => {
    if (!Array.isArray(candidates)) return [];
    const term = searchTerm.trim();
    if (!term) return candidates;
    const termLower = term.toLowerCase();
    return candidates.filter((c) => {
      const val = getFieldValue(c, searchField).toLowerCase();
      return currentFieldDef.type === 'select' ? val === termLower : val.includes(termLower);
    });
  }, [candidates, searchField, searchTerm, currentFieldDef]);

  const stats = useMemo(() => {
    const list = Array.isArray(candidates) ? candidates : [];
    return {
      total: list.length,
      // current state
      pending: list.filter((c) => c.status === 'pending').length,
      // cumulative: everyone who reached this stage or beyond
      shortlisted: list.filter((c) =>
        [
          'shortlisted',
          'interviewed',
          'selected',
          'joining_initiated',
          'joined',
          'resigned',
          'terminated',
          'completed',
        ].includes(c.status)
      ).length,
      interviewed: list.filter((c) =>
        [
          'interviewed',
          'selected',
          'joining_initiated',
          'joined',
          'resigned',
          'terminated',
          'completed',
        ].includes(c.status)
      ).length,
      selected: list.filter((c) =>
        ['selected', 'joining_initiated', 'joined', 'resigned', 'terminated', 'completed'].includes(
          c.status
        )
      ).length,
      joined: list.filter((c) =>
        ['joining_initiated', 'joined', 'resigned', 'terminated', 'completed'].includes(c.status)
      ).length,
      resigned: list.filter((c) => c.status === 'resigned').length,
      terminated: list.filter((c) => c.status === 'terminated').length,
    };
  }, [candidates]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <IconLoader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-[13px]">Loading candidate enquiries…</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
          <IconAlertCircle className="h-7 w-7 text-destructive" />
          <p className="text-[13px] font-semibold text-destructive">Couldn't load candidates</p>
          <p className="text-[11px] text-muted-foreground">
            The backend could not be reached. Check your connection and try again.
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
      label: 'Total Candidates',
      value: stats.total,
      Icon: IconUsers,
      tint: 'bg-primary/10 text-primary',
      valueColor: 'text-foreground',
    },
    {
      label: 'Pending',
      value: stats.pending,
      Icon: IconClock,
      tint: 'bg-muted text-muted-foreground',
      valueColor: 'text-foreground',
    },
    {
      label: 'Shortlisted',
      value: stats.shortlisted,
      Icon: IconAlertCircle,
      tint: 'bg-warning/10 text-warning',
      valueColor: 'text-warning',
    },
    {
      label: 'Interviewed',
      value: stats.interviewed,
      Icon: IconUsersGroup,
      tint: 'bg-primary/10 text-primary',
      valueColor: 'text-primary',
    },
    {
      label: 'Selected',
      value: stats.selected,
      Icon: IconUserCheck,
      tint: 'bg-success/10 text-success',
      valueColor: 'text-success',
    },
    {
      label: 'Joined',
      value: stats.joined,
      Icon: IconBriefcase,
      tint: 'bg-success/15 text-success',
      valueColor: 'text-success',
    },
  ];

  return (
    <div className="bg-background text-foreground grow">
      <div className="mx-auto max-w-350 space-y-5 px-4 pt-6 pb-10 sm:px-6 lg:px-8">
        {/* Top header bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-0.5 text-[12px] text-muted-foreground">Recruitment</p>
            <h1 className="text-[22px] font-bold leading-tight tracking-[-0.03em]">Find Enquiry</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {directQrUrl && (
              <button
                type="button"
                onClick={() => setShowDirectQr(true)}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-muted px-3 text-[12px] font-semibold text-muted-foreground transition-colors hover:bg-muted-foreground/10"
              >
                <IconQrcode className="h-4 w-4" />
                Candidate QR
              </button>
            )}
          </div>
        </div>

        {/* Hero banner */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <div className="flex flex-col items-start gap-4 bg-linear-to-br from-card to-card/50 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/12 text-primary">
                <IconUsersGroup className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-[18px] font-bold tracking-[-0.02em]">Candidate Enquiries</h2>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  Manage candidate enquiries and track their pipeline progress
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsFormSettingsOpen(true)}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-muted px-4 text-[13px] font-semibold text-foreground transition-colors hover:bg-muted-foreground/10"
              >
                <IconSettings className="h-4 w-4" />
                Edit Form
              </button>
              <button
                type="button"
                onClick={() => setIsDocSettingsOpen(true)}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-muted px-4 text-[13px] font-semibold text-foreground transition-colors hover:bg-muted-foreground/10"
              >
                <IconFileText className="h-4 w-4" />
                Required Docs
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!requireCompanySelected()) return;
                  setIsAddModalOpen(true);
                }}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                <IconPlus className="h-4 w-4" strokeWidth={2.5} />
                Add Candidate
              </button>
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
          {statCards.map((s, i) => (
            <div
              key={i}
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
                className={`text-[28px] font-bold leading-none tracking-[-0.02em] tabular-nums ${s.valueColor}`}
              >
                {s.value.toLocaleString('en-IN')}
              </p>
            </div>
          ))}
        </div>

        {/* Search bar */}
        <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs sm:px-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={searchField}
              onChange={(e) => {
                setSearchField(e.target.value);
                setSearchTerm('');
              }}
              className="h-10 cursor-pointer rounded-lg border border-border bg-muted px-3 pr-8 text-[13px] font-medium text-foreground outline-none transition-colors focus:border-primary sm:w-44 shrink-0"
            >
              {SEARCH_FIELDS.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>

            {currentFieldDef.type === 'select' ? (
              <select
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 flex-1 cursor-pointer rounded-lg border border-border bg-muted px-3 pr-8 text-[13px] text-foreground outline-none transition-colors focus:border-primary"
              >
                <option value="">All {currentFieldDef.label}</option>
                {currentFieldDef.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : (
              <div className="relative flex-1">
                <IconSearch className="pointer-events-none absolute top-1/2 left-3.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={`Search by ${currentFieldDef.label.toLowerCase()}…`}
                  className="h-10 w-full rounded-lg border border-border bg-muted pl-10 pr-9 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <IconX className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Result count */}
        <div className="px-1 text-[12px] text-muted-foreground">
          Showing{' '}
          <span className="font-semibold text-foreground tabular-nums">{filtered.length}</span> of{' '}
          <span className="font-semibold text-foreground tabular-nums">
            {candidates?.length ?? 0}
          </span>{' '}
          candidate{(candidates?.length ?? 0) === 1 ? '' : 's'}
        </div>

        {/* Table */}
        {filtered.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full min-w-215">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                      Action
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                      Candidate
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                      Applied For
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                      Contact
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                      Experience
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                      Status
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                      Resume
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                      Planned At
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                      Processed At
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                      Delay
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((candidate) => (
                    <tr key={candidate.id} className="transition-colors hover:bg-muted/40">
                      <td className="px-5 py-3.5">
                        <ActionCell
                          candidate={candidate}
                          onView={() => setViewCandidate(candidate)}
                          onUpdate={() => setUpdateCandidate(candidate)}
                        />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-[11px] font-bold text-primary">
                            {initials(candidate.candidateName)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-semibold">
                              {candidate.candidateName}
                            </p>
                            <p className="mt-0.5 truncate font-mono text-[10px] font-semibold text-muted-foreground">
                              {candidate.candidateEnquiryNo}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-[12px] text-foreground">
                        <div className="flex items-center gap-1.5">
                          <IconBriefcase className="h-3.5 w-3.5 text-muted-foreground" />
                          <div>
                            <span className="truncate">
                              {candidate.indent?.title ?? 'Direct Enquiry'}
                            </span>
                            {candidate.indent?.recordId && (
                              <p className="text-[10px] text-muted-foreground">
                                {candidate.indent.recordId}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 text-[12px] text-foreground">
                          <IconPhone className="h-3.5 w-3.5 text-muted-foreground" />
                          {candidate.phoneNo}
                        </div>
                        {candidate.email && (
                          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <IconMail className="h-3 w-3" />
                            <span className="truncate">{candidate.email}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-[12px] text-muted-foreground">
                        {candidate.experience}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-1.5">
                          <StatusPill status={candidate.status} />
                          {candidate.status === 'shortlisted' &&
                            candidate.nextCallDate &&
                            (() => {
                              const callDate = new Date(candidate.nextCallDate);
                              callDate.setHours(0, 0, 0, 0);
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              const diffDays = Math.ceil(
                                (callDate.getTime() - today.getTime()) / 86400000
                              );
                              if (diffDays > 3) return null;
                              const overdue = diffDays < 0;
                              const today_ = diffDays === 0;
                              const label = overdue
                                ? 'Call overdue'
                                : today_
                                  ? 'Call today'
                                  : `Call in ${diffDays}d`;
                              return (
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${overdue ? 'bg-destructive/10 text-destructive' : 'bg-warning/15 text-warning'}`}
                                >
                                  <IconBellRinging className="h-2.5 w-2.5" />
                                  {label}
                                </span>
                              );
                            })()}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {candidate.resume ? (
                          <button
                            type="button"
                            onClick={() => setResumeCandidate(candidate)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/8 px-2.5 py-1.5 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/15"
                          >
                            <IconFileText className="h-3.5 w-3.5" />
                            View
                          </button>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-[12px] text-muted-foreground whitespace-nowrap">
                        {candidate.processedAt ? (
                          fmtDt(candidate.tatPlannedAt)
                        ) : candidate.yourProjectedPlannedAt ? (
                          <>
                            {fmtDt(candidate.yourProjectedPlannedAt)}
                            <span className="ml-1 text-[10px] text-muted-foreground/70">
                              (estimate)
                            </span>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-[12px] text-muted-foreground whitespace-nowrap">
                        {fmtDt(candidate.processedAt)}
                        {candidate.processedAt && candidate.processedBy?.name && (
                          <div className="text-[10px] text-muted-foreground/70">
                            by {candidate.processedBy.name}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <DelayBadge delayMinutes={candidate.tatDelayMinutes} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <IconSearch className="h-6 w-6" />
            </div>
            <h3 className="text-[14px] font-semibold">No enquiries found</h3>
            <p className="mt-1 text-[12px] text-muted-foreground">
              {searchTerm
                ? 'No results for that search. Try a different value or field.'
                : "Click 'Add Enquiry' to register the first candidate."}
            </p>
            {!searchTerm && (
              <button
                type="button"
                onClick={() => {
                  if (!requireCompanySelected()) return;
                  setIsAddModalOpen(true);
                }}
                className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-[12px] font-semibold text-primary-foreground hover:opacity-90"
              >
                <IconPlus className="h-3.5 w-3.5" /> Add Candidate
              </button>
            )}
          </div>
        )}

        <AddEnquiryModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          fieldConfig={fieldConfig}
        />
      </div>

      {/* Update Status modal */}
      {updateCandidate && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => {
              setUpdateCandidate(null);
              setUpdateNotes('');
            }}
          >
          <div
            className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-[11px] font-bold text-primary">
                  {initials(updateCandidate.candidateName)}
                </div>
                <div>
                  <p className="text-[14px] font-bold leading-tight">
                    {updateCandidate.candidateName}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Current: <StatusPill status={updateCandidate.status} />
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUpdateCandidate(null);
                  setUpdateNotes('');
                }}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 px-6 py-5">
              {/* Special: selected → initialize joining */}
              {updateCandidate.status === 'selected' && (
                <div className="rounded-xl border border-success/20 bg-success/5 p-4">
                  <p className="mb-1 text-[12px] font-semibold text-success">Candidate selected</p>
                  <p className="mb-3 text-[11px] text-muted-foreground">
                    Fill the joining form to onboard this candidate.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setUpdateCandidate(null);
                      setJoiningInitCandidate(updateCandidate);
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    <IconArrowRight className="h-3.5 w-3.5" />
                    Initialize Joining
                  </button>
                </div>
              )}

              {/* Special: joining_initiated → confirm joining date + mark joined OR verify docs */}
              {updateCandidate.status === 'joining_initiated' && (
                <div className="rounded-xl border border-success/20 bg-success/5 p-4 space-y-3">
                  <div>
                    <p className="text-[12px] font-semibold text-success">Joining initialized</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Confirm the actual joining date, then mark as joined.
                    </p>
                  </div>
                  <div>
                    <label
                      htmlFor="mark-joined-date"
                      className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground"
                    >
                      Joining Date
                    </label>
                    <input
                      id="mark-joined-date"
                      type="date"
                      value={
                        markJoinedDate ||
                        (updateCandidate.joining?.joiningDate
                          ? new Date(updateCandidate.joining.joiningDate).toISOString().slice(0, 10)
                          : '')
                      }
                      onChange={(e) => setMarkJoinedDate(e.target.value)}
                      className="h-9 w-full rounded-lg border border-border bg-card px-3 text-[13px] text-foreground outline-none transition-colors focus:border-success"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={
                        markJoined.isPending ||
                        !(markJoinedDate || updateCandidate.joining?.joiningDate)
                      }
                      onClick={async () => {
                        const date =
                          markJoinedDate ||
                          (updateCandidate.joining?.joiningDate
                            ? new Date(updateCandidate.joining.joiningDate)
                                .toISOString()
                                .slice(0, 10)
                            : undefined);
                        await markJoined.mutateAsync({
                          id: updateCandidate.id,
                          joiningDate: date ? new Date(date).toISOString() : undefined,
                          actAsTenantId: resolveActAsTenant(
                            updateCandidate.tenant,
                            currentUser?.tenantId
                          ),
                        });
                        setMarkJoinedDate('');
                        setUpdateCandidate(null);
                      }}
                      className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      {markJoined.isPending ? (
                        <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <IconCheck className="h-3.5 w-3.5" strokeWidth={2.5} />
                      )}
                      Mark as Joined
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMarkJoinedDate('');
                        setUpdateCandidate(null);
                        setDocVerifyCandidate(updateCandidate);
                      }}
                      className="inline-flex items-center gap-2 rounded-lg border border-success/40 bg-transparent px-4 py-2 text-[12px] font-semibold text-success transition-opacity hover:opacity-80"
                    >
                      <IconCheck className="h-3.5 w-3.5" strokeWidth={2.5} />
                      Verify Documents
                    </button>
                  </div>
                </div>
              )}

              {/* Joined: show account status */}
              {updateCandidate.status === 'joined' && updateCandidate.hrEmployee?.userId && (
                <div className="rounded-xl border border-success/20 bg-success/5 p-4">
                  <div className="mb-1 flex items-center gap-1.5">
                    <IconUserCheck className="h-3.5 w-3.5 text-success" />
                    <p className="text-[12px] font-semibold text-success">
                      Account already created
                    </p>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    To modify account details or permissions, go to{' '}
                    <span className="font-medium text-foreground">Manage User</span> in settings.
                  </p>
                </div>
              )}

              {/* Verify docs available for joined candidates */}
              {updateCandidate.status === 'joined' && (
                <div className="flex flex-col gap-2">
                  {updateCandidate.joining?.status === 'docs_verified' && (
                    <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 px-3 py-2">
                      <IconCheck className="h-3.5 w-3.5 shrink-0 text-success" strokeWidth={2.5} />
                      <span className="text-[12px] font-semibold text-success">
                        Documents already verified
                      </span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setUpdateCandidate(null);
                      setDocVerifyCandidate(updateCandidate);
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted px-4 py-2 text-[12px] font-semibold text-foreground transition-opacity hover:opacity-80"
                  >
                    <IconCheck className="h-3.5 w-3.5" strokeWidth={2.5} />
                    {updateCandidate.joining?.status === 'docs_verified'
                      ? 'Edit Verified Docs'
                      : 'Verify Documents'}
                  </button>
                </div>
              )}

              {/* Follow-up for shortlisted candidates */}
              {updateCandidate.status === 'shortlisted' && (
                <div className="rounded-xl border border-warning/20 bg-warning/5 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <p className="text-[12px] font-semibold text-warning">Follow-up Call</p>
                      {updateCandidate.nextCallDate ? (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          Scheduled:{' '}
                          <span className="font-semibold text-foreground">
                            {new Date(updateCandidate.nextCallDate).toLocaleDateString(undefined, {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                          {updateCandidate.followUpNotes && (
                            <span className="ml-1 text-muted-foreground">
                              — {updateCandidate.followUpNotes}
                            </span>
                          )}
                        </p>
                      ) : (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          Schedule a call before the interview to confirm availability.
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFollowUpDate(
                        updateCandidate.nextCallDate
                          ? updateCandidate.nextCallDate.slice(0, 10)
                          : ''
                      );
                      setFollowUpNotes(updateCandidate.followUpNotes ?? '');
                      setFollowUpCandidate(updateCandidate);
                      setUpdateCandidate(null);
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-1.5 text-[11px] font-semibold text-warning transition-colors hover:bg-warning/20"
                  >
                    <IconBell className="h-3.5 w-3.5" />
                    {updateCandidate.nextCallDate ? 'Edit Follow Up' : 'Add Follow Up'}
                  </button>
                </div>
              )}

              {/* Normal next statuses (reject) */}
              {(NEXT_STATUSES[updateCandidate.status] ?? []).length > 0 && (
                <div>
                  <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                    Move to
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(NEXT_STATUSES[updateCandidate.status] ?? []).map((s) => {
                      const cfg = STATUS_CFG[s];
                      return (
                        <button
                          key={s}
                          type="button"
                          disabled={logCall.isPending}
                          onClick={() => handleStatusUpdate(s)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.04em] transition-opacity hover:opacity-80 disabled:opacity-50 ${cfg?.bg ?? 'bg-muted'} ${cfg?.text ?? 'text-muted-foreground'}`}
                        >
                          {logCall.isPending ? (
                            <IconLoader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            cfg?.icon
                          )}
                          {cfg?.actionLabel ?? cfg?.label ?? s}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                  Notes{' '}
                  <span className="font-normal normal-case tracking-normal text-muted-foreground/70">
                    (optional)
                  </span>
                </p>
                <input
                  type="text"
                  placeholder="Add a note about this status change…"
                  value={updateNotes}
                  onChange={(e) => setUpdateNotes(e.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-muted px-3 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end border-t border-border bg-muted/30 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setUpdateCandidate(null);
                  setUpdateNotes('');
                }}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-muted px-4 text-[12px] font-semibold transition-colors hover:bg-muted-foreground/10"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Candidate Detail modal */}
      {viewCandidate && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => setViewCandidate(null)}
          >
          <div
            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
              <div className="flex items-center gap-3">
                {viewCandidate.photo ? (
                  <button
                    type="button"
                    onClick={() => setPhotoViewUrl(resolveUrl(viewCandidate.photo!))}
                    className="h-11 w-11 shrink-0 overflow-hidden rounded-full ring-2 ring-primary/30 transition-opacity hover:opacity-80"
                    title="View photo"
                  >
                    <img
                      src={resolveUrl(viewCandidate.photo)}
                      alt={viewCandidate.candidateName}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/12 text-[13px] font-bold text-primary">
                    {initials(viewCandidate.candidateName)}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[16px] font-bold leading-tight">
                      {viewCandidate.candidateName}
                    </p>
                    <StatusPill status={viewCandidate.status} />
                  </div>
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    {viewCandidate.candidateEnquiryNo}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewCandidate(null)}
                aria-label="Close"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 space-y-5 overflow-y-auto p-6">
              {/* Applied for */}
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-3">
                <IconBriefcase className="h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                    Applied For
                  </p>
                  <p className="text-[13px] font-semibold">
                    {viewCandidate.indent?.title ?? 'Direct Enquiry'}
                  </p>
                  {viewCandidate.indent?.recordId && (
                    <p className="text-[11px] text-muted-foreground">
                      {viewCandidate.indent.recordId}
                    </p>
                  )}
                </div>
              </div>

              {/* Personal info grid */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {[
                  {
                    icon: <IconCalendar className="h-3.5 w-3.5" />,
                    label: 'Date of Birth',
                    value: viewCandidate.dob
                      ? new Date(viewCandidate.dob).toLocaleDateString(undefined, {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—',
                  },
                  {
                    icon: <IconPhone className="h-3.5 w-3.5" />,
                    label: 'Phone',
                    value: viewCandidate.phoneNo,
                  },
                  {
                    icon: <IconMail className="h-3.5 w-3.5" />,
                    label: 'Email',
                    value: viewCandidate.email || '—',
                  },
                  {
                    icon: <IconBuilding className="h-3.5 w-3.5" />,
                    label: 'Previous Company',
                    value: viewCandidate.previousCompany || '—',
                  },
                  {
                    icon: <IconUserCheck className="h-3.5 w-3.5" />,
                    label: 'Previous Position',
                    value: viewCandidate.previousPosition || '—',
                  },
                  {
                    icon: <IconClock className="h-3.5 w-3.5" />,
                    label: 'Experience',
                    value: viewCandidate.experience || '—',
                  },
                  {
                    icon: <IconUsers className="h-3.5 w-3.5" />,
                    label: 'Marital Status',
                    value: viewCandidate.maritalStatus || '—',
                  },
                  {
                    icon: <IconFileText className="h-3.5 w-3.5" />,
                    label: 'Aadhar No',
                    value: viewCandidate.aadharNo || '—',
                  },
                  {
                    icon: <IconFileText className="h-3.5 w-3.5" />,
                    label: 'Last Salary',
                    value: viewCandidate.lastSalary || '—',
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg border border-border bg-muted/30 px-3 py-3"
                  >
                    <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
                      {item.icon}
                      <p className="text-[10px] font-semibold uppercase tracking-[0.04em]">
                        {item.label}
                      </p>
                    </div>
                    <p className="truncate text-[13px] font-semibold text-foreground">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Reason for leaving */}
              {viewCandidate.reasonForLeaving && (
                <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                    Reason for Leaving
                  </p>
                  <p className="text-[13px] text-foreground">{viewCandidate.reasonForLeaving}</p>
                </div>
              )}

              {/* Current address */}
              {viewCandidate.currentAddress && (
                <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                  <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
                    <IconMapPin className="h-3.5 w-3.5" />
                    <p className="text-[10px] font-semibold uppercase tracking-[0.04em]">
                      Current Address
                    </p>
                  </div>
                  <p className="text-[13px] text-foreground">{viewCandidate.currentAddress}</p>
                </div>
              )}

              {/* Notes */}
              {viewCandidate.notes && (
                <div className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-warning">
                    Notes
                  </p>
                  <p className="text-[13px] text-foreground">{viewCandidate.notes}</p>
                </div>
              )}

              {/* Joining info */}
              {viewCandidate.joining?.joiningDate && (
                <div className="rounded-lg border border-success/25 bg-success/6 px-4 py-3">
                  <div className="mb-2 flex items-center gap-1.5 text-success">
                    <IconCalendar className="h-3.5 w-3.5" />
                    <p className="text-[10px] font-semibold uppercase tracking-[0.04em]">
                      Joining Details
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Joining Date</p>
                      <p className="text-[13px] font-semibold text-foreground">
                        {new Date(viewCandidate.joining.joiningDate).toLocaleDateString(undefined, {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    {viewCandidate.joining.employmentType && (
                      <div>
                        <p className="text-[10px] text-muted-foreground">Employment Type</p>
                        <p className="text-[13px] font-semibold text-foreground">
                          {viewCandidate.joining.employmentType}
                        </p>
                      </div>
                    )}
                    {viewCandidate.joining.offeredCTC && (
                      <div>
                        <p className="text-[10px] text-muted-foreground">Offered CTC</p>
                        <p className="text-[13px] font-semibold text-foreground">
                          {viewCandidate.joining.offeredCTC}
                        </p>
                      </div>
                    )}
                    {viewCandidate.joining.workLocation && (
                      <div>
                        <p className="text-[10px] text-muted-foreground">Work Location</p>
                        <p className="text-[13px] font-semibold text-foreground">
                          {viewCandidate.joining.workLocation}
                        </p>
                      </div>
                    )}
                    {viewCandidate.joining.reportingManager && (
                      <div>
                        <p className="text-[10px] text-muted-foreground">Reporting Manager</p>
                        <p className="text-[13px] font-semibold text-foreground">
                          {viewCandidate.joining.reportingManager}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground">
                <span>
                  Added:{' '}
                  <span className="font-semibold text-foreground">
                    {new Date(viewCandidate.createdAt).toLocaleDateString(undefined, {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </span>
                <span>
                  Updated:{' '}
                  <span className="font-semibold text-foreground">
                    {new Date(viewCandidate.updatedAt).toLocaleDateString(undefined, {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-6 py-4">
              {viewCandidate.resume && (
                <button
                  type="button"
                  onClick={() => {
                    setResumeCandidate(viewCandidate);
                    setViewCandidate(null);
                  }}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-primary/30 bg-primary/8 px-4 text-[12px] font-semibold text-primary transition-colors hover:bg-primary/15"
                >
                  <IconFileText className="h-3.5 w-3.5" />
                  View Resume
                </button>
              )}
              <button
                type="button"
                onClick={() => setViewCandidate(null)}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-muted px-4 text-[12px] font-semibold transition-colors hover:bg-muted-foreground/10"
              >
                Close
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Initialize Joining modal */}
      {joiningInitCandidate && (
        <JoiningInitModal
          candidate={joiningInitCandidate}
          onClose={() => setJoiningInitCandidate(null)}
          mutation={initJoining}
        />
      )}

      {/* Document Verification modal */}
      {docVerifyCandidate && (
        <DocVerificationModal
          candidate={docVerifyCandidate}
          onClose={() => setDocVerifyCandidate(null)}
          mutation={verifyDocs}
          docConfig={docConfig}
        />
      )}

      {/* Form Settings modal */}
      {isFormSettingsOpen && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => setIsFormSettingsOpen(false)}
          >
          <div
            className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <IconSettings className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-[15px] font-bold">Form Settings</p>
                  <p className="text-[11px] text-muted-foreground">
                    Toggle which fields are required
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormSettingsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>

            {/* Always-required notice */}
            <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2">
              <IconLock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <p className="text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground">Job Posting, Full Name, Phone</span>{' '}
                are always required and cannot be changed.
              </p>
            </div>

            {/* Field toggles */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <ul className="space-y-1">
                {CONFIGURABLE_FIELDS.map((field) => {
                  const isOn = fieldConfig[field.key];
                  return (
                    <li
                      key={field.key}
                      className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/50"
                    >
                      <span className="text-[13px] font-medium text-foreground">{field.label}</span>
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`text-[10px] font-semibold uppercase ${isOn ? 'text-primary' : 'text-muted-foreground'}`}
                        >
                          {isOn ? 'Required' : 'Optional'}
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isOn}
                          onClick={() => toggleFieldRequired(field.key)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none ${isOn ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform ${isOn ? 'translate-x-4' : 'translate-x-0'}`}
                          />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-border bg-muted/30 px-6 py-4">
              <button
                type="button"
                onClick={() => setFieldConfig(DEFAULT_FIELD_CONFIG)}
                className="text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                Reset to defaults
              </button>
              <button
                type="button"
                onClick={() => setIsFormSettingsOpen(false)}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-[12px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                <IconCheck className="h-3.5 w-3.5" strokeWidth={2.5} />
                Done
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Required Docs settings modal */}
      {isDocSettingsOpen && (
        <DocSettingsModal
          docConfig={docConfig}
          setDocConfig={setDocConfig}
          onClose={() => setIsDocSettingsOpen(false)}
        />
      )}

      {/* Follow-up modal */}
      {followUpCandidate && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => setFollowUpCandidate(null)}
          >
          <div
            className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning/12 text-warning">
                  <IconBell className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[14px] font-bold leading-tight">Add Follow Up</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {followUpCandidate.candidateName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFollowUpCandidate(null)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 px-6 py-5">
              <div>
                <label
                  htmlFor="follow-up-date"
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground"
                >
                  Next Call Date
                </label>
                <input
                  id="follow-up-date"
                  type="date"
                  value={followUpDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-muted px-3 text-[13px] text-foreground outline-none transition-colors focus:border-primary"
                />
              </div>
              <div>
                <label
                  htmlFor="follow-up-notes"
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground"
                >
                  Notes{' '}
                  <span className="font-normal normal-case tracking-normal text-muted-foreground/60">
                    (optional)
                  </span>
                </label>
                <input
                  id="follow-up-notes"
                  type="text"
                  placeholder="e.g. Confirm interview slot availability…"
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-muted px-3 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
                />
              </div>
              {followUpCandidate.nextCallDate && (
                <p className="text-[11px] text-muted-foreground">
                  Currently scheduled:{' '}
                  <span className="font-semibold text-foreground">
                    {new Date(followUpCandidate.nextCallDate).toLocaleDateString(undefined, {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-6 py-4">
              <button
                type="button"
                onClick={() => setFollowUpCandidate(null)}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-muted px-4 text-[12px] font-semibold transition-colors hover:bg-muted-foreground/10"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!followUpDate || saveFollowUp.isPending}
                onClick={async () => {
                  await saveFollowUp.mutateAsync({
                    id: followUpCandidate.id,
                    payload: {
                      nextCallDate: new Date(followUpDate).toISOString(),
                      followUpNotes: followUpNotes || undefined,
                    },
                    actAsTenantId: resolveActAsTenant(
                      followUpCandidate.tenant,
                      currentUser?.tenantId
                    ),
                  });
                  setFollowUpCandidate(null);
                  setFollowUpDate('');
                  setFollowUpNotes('');
                }}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-warning px-4 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {saveFollowUp.isPending ? (
                  <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <IconBell className="h-3.5 w-3.5" />
                )}
                Save Follow Up
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Photo lightbox */}
      {photoViewUrl && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 backdrop-blur-sm"
            onClick={() => setPhotoViewUrl(null)}
          >
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <img
              src={photoViewUrl}
              alt="Candidate"
              className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setPhotoViewUrl(null)}
              aria-label="Close photo"
              className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-card text-foreground shadow-lg transition-colors hover:bg-muted"
            >
              <IconX className="h-4 w-4" />
            </button>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Resume viewer modal */}
      {resumeCandidate && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => setResumeCandidate(null)}
          >
          <div
            className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <IconFileText className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-[14px] font-bold">{resumeCandidate.candidateName}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Resume · {resumeCandidate.candidateEnquiryNo}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={resolveUrl(resumeCandidate.resume!)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-1.5 text-[12px] font-semibold text-foreground transition-colors hover:bg-muted-foreground/10"
                >
                  <IconExternalLink className="h-3.5 w-3.5" />
                  Open in tab
                </a>
                <button
                  type="button"
                  onClick={() => setResumeCandidate(null)}
                  aria-label="Close"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <IconX className="h-4 w-4" />
                </button>
              </div>
            </div>
            {/* Viewer */}
            <div className="flex-1 overflow-hidden bg-muted/30">
              {(() => {
                const url = resolveUrl(resumeCandidate.resume!);
                const ext = url.split('?')[0]?.split('.').pop()?.toLowerCase() ?? '';
                const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
                if (isImage) {
                  return (
                    <div className="flex h-full items-center justify-center overflow-auto p-4">
                      <img
                        src={url}
                        alt="Resume"
                        className="max-w-full rounded-lg object-contain shadow-md"
                      />
                    </div>
                  );
                }
                return (
                  <iframe
                    src={url}
                    title="Resume"
                    className="h-full min-h-[70vh] w-full border-0"
                  />
                );
              })()}
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Direct Enquiry QR modal */}
      {showDirectQr && directQrUrl && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowDirectQr(false)}
          >
          <div
            className="flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/12 text-primary">
                  <IconQrcode className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-[14px] font-bold leading-tight">Candidate Enquiry QR</h2>
                  <p className="text-[11px] text-muted-foreground">
                    Scan to submit a direct enquiry
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDirectQr(false)}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col items-center gap-4 px-6 py-8">
              <div
                className="rounded-xl border border-border bg-white p-4 shadow-sm"
                id="direct-qr-wrap"
              >
                <QRCodeSVG
                  value={directQrUrl}
                  size={200}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="M"
                  includeMargin={false}
                />
              </div>
              <p className="text-center text-[11px] text-muted-foreground">
                Candidates scan this to fill their details · no specific job posting required
              </p>
              <p className="max-w-full break-all rounded-lg border border-border bg-muted px-3 py-2 text-center font-mono text-[10px] text-muted-foreground">
                {directQrUrl}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-5 py-4">
              <button
                type="button"
                onClick={() => {
                  const svg = document.querySelector<SVGSVGElement>('#direct-qr-wrap svg');
                  if (!svg) return;
                  const svgStr = new XMLSerializer().serializeToString(svg);
                  const win = window.open('', '_blank');
                  if (!win) return;
                  win.document.write(`<!doctype html><html><head><title>Candidate QR</title>
                    <style>body{font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;box-sizing:border-box;}
                    .card{border:1px solid #e5e7eb;border-radius:16px;padding:32px;text-align:center;max-width:340px;}
                    h1{font-size:18px;font-weight:700;margin:16px 0 4px;}p{font-size:12px;color:#6b7280;margin:4px 0;}
                    .url{font-size:10px;color:#9ca3af;word-break:break-all;margin-top:16px;}</style></head><body>
                    <div class="card">${svgStr}<h1>Candidate Enquiry</h1><p>Scan to apply</p><p class="url">${directQrUrl}</p></div></body></html>`);
                  win.document.close();
                  win.focus();
                  win.print();
                }}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-[12px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Print
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default MainFindEnquiry;
