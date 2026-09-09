'use client';

import {
  IconAlertCircle,
  IconCheck,
  IconLoader2,
  IconUpload,
  IconUserPlus,
  IconX,
} from '@tabler/icons-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useRequireCompanySelected } from '@/features/organization/hooks/useRequireCompanySelected';
import { useIndents } from '../../indent/server/tanstackQuery/useIndentQueries';
import { useSubmitCandidate } from '../server/tanstackQuery/useCandidateQueries';
import { ModalPortal } from '../../_shared/components';

export interface CandidateFieldConfig {
  dob: boolean;
  email: boolean;
  previousCompany: boolean;
  previousPosition: boolean;
  experience: boolean;
  maritalStatus: boolean;
  aadharNo: boolean;
  lastSalary: boolean;
  reasonForLeaving: boolean;
  currentAddress: boolean;
  photo: boolean;
  resume: boolean;
}

interface AddEnquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  fieldConfig: CandidateFieldConfig;
  defaultIndentId?: string | number;
}

const MARITAL_STATUS_OPTIONS = ['Single', 'Married', 'Divorced', 'Widowed'];

const initialForm = {
  indentId: '' as string | number,
  candidateName: '',
  dob: '',
  phoneNo: '',
  email: '',
  previousCompany: '',
  previousPosition: '',
  experience: '',
  maritalStatus: '',
  aadharNo: '',
  lastSalary: '',
  reasonForLeaving: '',
  currentAddress: '',
};

const FieldLabel = ({
  children,
  required = false,
}: {
  children: React.ReactNode;
  required?: boolean;
}) => (
  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
    {children}
    {!required && (
      <span className="ml-1 font-normal text-muted-foreground/70 normal-case tracking-normal">
        (optional)
      </span>
    )}
  </label>
);

const inputCls =
  'h-10 w-full rounded-lg border border-border bg-muted px-3 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary';

const AddEnquiryModal: React.FC<AddEnquiryModalProps> = ({
  isOpen,
  onClose,
  fieldConfig,
  defaultIndentId,
}) => {
  const requireCompanySelected = useRequireCompanySelected();
  const { data: indents = [], isLoading: isLoadingIndents } = useIndents();
  const submitMutation = useSubmitCandidate();

  const [formData, setFormData] = useState(() => ({
    ...initialForm,
    indentId: defaultIndentId ?? ('' as string | number),
  }));
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const resumeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (defaultIndentId) {
      setFormData((prev) => ({ ...prev, indentId: defaultIndentId }));
    }
  }, [defaultIndentId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const reset = () => {
    setFormData({ ...initialForm, indentId: defaultIndentId ?? ('' as string | number) });
    setPhotoFile(null);
    setResumeFile(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireCompanySelected()) return;
    setError(null);

    if (fieldConfig.photo && !photoFile) {
      setError('Photo is required.');
      return;
    }
    if (fieldConfig.resume && !resumeFile) {
      setError('Resume is required.');
      return;
    }

    try {
      await submitMutation.mutateAsync({
        data: {
          indentId:
            formData.indentId === 'direct_enquiry' ? undefined : formData.indentId || undefined,
          candidateName: formData.candidateName,
          dob: formData.dob ? new Date(formData.dob).toISOString() : new Date().toISOString(),
          phoneNo: formData.phoneNo,
          email: formData.email || undefined,
          previousCompany: formData.previousCompany,
          previousPosition: formData.previousPosition,
          experience: formData.experience,
          maritalStatus: formData.maritalStatus,
          aadharNo: formData.aadharNo,
          lastSalary: formData.lastSalary,
          reasonForLeaving: formData.reasonForLeaving,
          currentAddress: formData.currentAddress,
        },
        files: {
          photo: photoFile ?? undefined,
          resume: resumeFile ?? undefined,
        },
      });
      reset();
      onClose();
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data
          ?.message ||
        (err as { message?: string })?.message ||
        'Failed to submit candidate. Please try again.';
      setError(message);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      >
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-candidate-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <IconUserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="add-candidate-title"
                className="text-[16px] font-bold leading-tight tracking-[-0.01em]"
              >
                Add Candidate
              </h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Register a candidate against an open job posting
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

        {/* Form body */}
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

            {/* Job Posting */}
            <div>
              <FieldLabel>Job Posting (Indent)</FieldLabel>
              {defaultIndentId ? (
                (() => {
                  const matched = indents.find((i) => String(i.id) === String(defaultIndentId));
                  return (
                    <div
                      className={`${inputCls} flex cursor-not-allowed items-center justify-between opacity-80`}
                    >
                      <span className="truncate font-medium text-foreground">
                        {matched
                          ? `${matched.recordId ? `${matched.recordId} — ` : ''}${matched.title}`
                          : isLoadingIndents
                            ? 'Loading…'
                            : String(defaultIndentId)}
                      </span>
                    </div>
                  );
                })()
              ) : (
                <select
                  name="indentId"
                  value={formData.indentId}
                  onChange={handleChange}
                  disabled={isLoadingIndents}
                  className={`${inputCls} cursor-pointer pr-8 disabled:opacity-60`}
                >
                  <option value="">{isLoadingIndents ? 'Loading…' : 'Select Job Posting'}</option>
                  <option value="direct_enquiry">— Direct Enquiry (no job posting) —</option>
                  {indents
                    .filter((i) => i.status !== 'closed' && i.status !== 'cancelled')
                    .map((indent) => (
                      <option key={indent.id} value={indent.id}>
                        {indent.recordId ? `${indent.recordId} — ` : ''}
                        {indent.title}
                      </option>
                    ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Full Name — always required */}
              <div>
                <FieldLabel required>Full Name</FieldLabel>
                <input
                  required
                  type="text"
                  name="candidateName"
                  value={formData.candidateName}
                  onChange={handleChange}
                  placeholder="e.g. Amit Kumar"
                  className={inputCls}
                />
              </div>

              {/* DOB */}
              <div>
                <FieldLabel required={fieldConfig.dob}>Date of Birth</FieldLabel>
                <input
                  required={fieldConfig.dob}
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  className={inputCls}
                />
              </div>

              {/* Phone — always required */}
              <div>
                <FieldLabel required>Phone Number</FieldLabel>
                <input
                  required
                  type="text"
                  name="phoneNo"
                  value={formData.phoneNo}
                  onChange={handleChange}
                  placeholder="+91 9876543210"
                  className={inputCls}
                />
              </div>

              {/* Email */}
              <div>
                <FieldLabel required={fieldConfig.email}>Email</FieldLabel>
                <input
                  required={fieldConfig.email}
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="candidate@email.com"
                  className={inputCls}
                />
              </div>

              {/* Previous Company */}
              <div>
                <FieldLabel required={fieldConfig.previousCompany}>Previous Company</FieldLabel>
                <input
                  required={fieldConfig.previousCompany}
                  type="text"
                  name="previousCompany"
                  value={formData.previousCompany}
                  onChange={handleChange}
                  placeholder="Company name"
                  className={inputCls}
                />
              </div>

              {/* Previous Position */}
              <div>
                <FieldLabel required={fieldConfig.previousPosition}>Previous Position</FieldLabel>
                <input
                  required={fieldConfig.previousPosition}
                  type="text"
                  name="previousPosition"
                  value={formData.previousPosition}
                  onChange={handleChange}
                  placeholder="Job title"
                  className={inputCls}
                />
              </div>

              {/* Experience */}
              <div>
                <FieldLabel required={fieldConfig.experience}>Experience</FieldLabel>
                <input
                  required={fieldConfig.experience}
                  type="text"
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  placeholder="e.g. 3 years"
                  className={inputCls}
                />
              </div>

              {/* Marital Status */}
              <div>
                <FieldLabel required={fieldConfig.maritalStatus}>Marital Status</FieldLabel>
                <select
                  required={fieldConfig.maritalStatus}
                  name="maritalStatus"
                  value={formData.maritalStatus}
                  onChange={handleChange}
                  className={`${inputCls} cursor-pointer pr-8`}
                >
                  <option value="">Select Status</option>
                  {MARITAL_STATUS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Aadhar */}
              <div>
                <FieldLabel required={fieldConfig.aadharNo}>Aadhar Number</FieldLabel>
                <input
                  required={fieldConfig.aadharNo}
                  type="text"
                  name="aadharNo"
                  value={formData.aadharNo}
                  onChange={handleChange}
                  placeholder="XXXX XXXX XXXX"
                  className={inputCls}
                />
              </div>

              {/* Last Salary */}
              <div>
                <FieldLabel required={fieldConfig.lastSalary}>Last Salary</FieldLabel>
                <input
                  required={fieldConfig.lastSalary}
                  type="text"
                  name="lastSalary"
                  value={formData.lastSalary}
                  onChange={handleChange}
                  placeholder="e.g. ₹25,000/month"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Reason for Leaving */}
            <div>
              <FieldLabel required={fieldConfig.reasonForLeaving}>Reason for Leaving</FieldLabel>
              <input
                required={fieldConfig.reasonForLeaving}
                type="text"
                name="reasonForLeaving"
                value={formData.reasonForLeaving}
                onChange={handleChange}
                placeholder="Brief reason"
                className={inputCls}
              />
            </div>

            {/* Current Address */}
            <div>
              <FieldLabel required={fieldConfig.currentAddress}>Current Address</FieldLabel>
              <textarea
                required={fieldConfig.currentAddress}
                name="currentAddress"
                value={formData.currentAddress}
                onChange={handleChange}
                rows={3}
                placeholder="Full residential address"
                className="w-full resize-none rounded-lg border border-border bg-muted px-3 py-2.5 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
              />
            </div>

            {/* File uploads */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <FieldLabel required={fieldConfig.photo}>Photo</FieldLabel>
                <button
                  type="button"
                  onClick={() => photoRef.current?.click()}
                  className="flex h-10 w-full items-center gap-2 rounded-lg border border-dashed border-border bg-muted px-3 text-[13px] text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
                >
                  <IconUpload className="h-3.5 w-3.5" />
                  <span className="truncate">{photoFile ? photoFile.name : 'Upload photo'}</span>
                </button>
                <input
                  ref={photoRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <div>
                <FieldLabel required={fieldConfig.resume}>Resume</FieldLabel>
                <button
                  type="button"
                  onClick={() => resumeRef.current?.click()}
                  className="flex h-10 w-full items-center gap-2 rounded-lg border border-dashed border-border bg-muted px-3 text-[13px] text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
                >
                  <IconUpload className="h-3.5 w-3.5" />
                  <span className="truncate">{resumeFile ? resumeFile.name : 'Upload resume'}</span>
                </button>
                <input
                  ref={resumeRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
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
              disabled={submitMutation.isPending}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-[12px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {submitMutation.isPending ? (
                <>
                  <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
                  Submitting…
                </>
              ) : (
                <>
                  <IconCheck className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Add Candidate
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

export default AddEnquiryModal;
