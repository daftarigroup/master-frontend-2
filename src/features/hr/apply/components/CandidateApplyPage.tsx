'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  IconBriefcase,
  IconBuilding,
  IconCalendar,
  IconCheck,
  IconClock,
  IconFileText,
  IconId,
  IconLoader2,
  IconMail,
  IconMapPin,
  IconPhone,
  IconUpload,
  IconUser,
  IconX,
} from '@tabler/icons-react';
import { uploadFileViaPresignedUrl } from '@/lib/api/storage.api';
import { api } from '@/lib/axios';
import { cn } from '@/lib/utils';

interface PublicIndentInfo {
  id?: string;
  recordId?: string;
  title?: string;
  department?: { id: string; name: string } | null;
  gender?: string;
  prefer?: string;
  experienceYears?: string;
  noOfPost?: number;
  jobType?: string[];
  status?: string;
  isDirect?: boolean;
}

const FIELD_ORDER = [
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
] as const;

type FieldKey = (typeof FIELD_ORDER)[number];

const MARITAL_STATUS_OPTIONS = ['Single', 'Married', 'Divorced', 'Widowed'];

export default function CandidateApplyPage() {
  const { indentId, tenantId } = useParams<{ indentId?: string; tenantId?: string }>();
  const [searchParams] = useSearchParams();
  const cfgParam = searchParams.get('cfg');

  const [indent, setIndent] = useState<PublicIndentInfo | null>(null);
  const [isLoadingIndent, setIsLoadingIndent] = useState(true);

  // Field requirement config derived from `cfg` bitmask
  const [config, setConfig] = useState<Record<FieldKey, boolean>>(() => {
    const res = {} as Record<FieldKey, boolean>;
    FIELD_ORDER.forEach((key, idx) => {
      res[key] = cfgParam ? cfgParam[idx] === '1' : false;
    });
    return res;
  });

  useEffect(() => {
    if (cfgParam) {
      const res = {} as Record<FieldKey, boolean>;
      FIELD_ORDER.forEach((key, idx) => {
        res[key] = cfgParam[idx] === '1';
      });
      setConfig(res);
    }
  }, [cfgParam]);

  // Form state
  const [formData, setFormData] = useState({
    candidateName: '',
    phoneNo: '',
    email: '',
    dob: '',
    previousCompany: '',
    previousPosition: '',
    experience: '',
    maritalStatus: '',
    aadharNo: '',
    lastSalary: '',
    reasonForLeaving: '',
    currentAddress: '',
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<{
    enquiryNo: string;
    candidateName: string;
  } | null>(null);

  // Load indent info
  useEffect(() => {
    let isMounted = true;
    const fetchInfo = async () => {
      if (!indentId || indentId === 'direct') {
        setIsLoadingIndent(false);
        setIndent({ isDirect: true, title: 'General Candidate Application' });
        return;
      }
      try {
        const res = await api.get(`/public/hr/indent/${indentId}`);
        if (isMounted && res.data?.data) {
          setIndent(res.data.data);
        }
      } catch (err) {
        if (isMounted) {
          setIndent({ isDirect: true, title: 'Candidate Application' });
        }
      } finally {
        if (isMounted) setIsLoadingIndent(false);
      }
    };
    fetchInfo();
    return () => {
      isMounted = false;
    };
  }, [indentId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrorMessage(null);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
    }
  };

  const handleResumeSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setResumeFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Core validation
    if (!formData.candidateName.trim()) {
      setErrorMessage('Full name is required.');
      return;
    }
    if (!formData.phoneNo.trim()) {
      setErrorMessage('Phone number is required.');
      return;
    }

    // Configurable validation
    if (config.email && !formData.email.trim()) {
      setErrorMessage('Email address is required.');
      return;
    }
    if (config.dob && !formData.dob) {
      setErrorMessage('Date of birth is required.');
      return;
    }
    if (config.aadharNo && !formData.aadharNo.trim()) {
      setErrorMessage('Aadhaar / ID number is required.');
      return;
    }
    if (config.currentAddress && !formData.currentAddress.trim()) {
      setErrorMessage('Current address is required.');
      return;
    }
    if (config.photo && !photoFile) {
      setErrorMessage('Candidate photo is required.');
      return;
    }
    if (config.resume && !resumeFile) {
      setErrorMessage('Resume / CV is required.');
      return;
    }

    setIsSubmitting(true);

    try {
      let photoUrl: string | undefined = undefined;
      let resumeUrl: string | undefined = undefined;

      // Upload photo if present
      if (photoFile) {
        setUploadProgress('Uploading photo...');
        photoUrl = await uploadFileViaPresignedUrl(photoFile, 'hr', 'candidates/photos');
      }

      // Upload resume if present
      if (resumeFile) {
        setUploadProgress('Uploading resume...');
        resumeUrl = await uploadFileViaPresignedUrl(resumeFile, 'hr', 'candidates/resumes');
      }

      setUploadProgress('Submitting application...');

      const payload = {
        candidateName: formData.candidateName.trim(),
        phoneNo: formData.phoneNo.trim(),
        email: formData.email.trim() || undefined,
        dob: formData.dob || undefined,
        previousCompany: formData.previousCompany.trim() || undefined,
        previousPosition: formData.previousPosition.trim() || undefined,
        experience: formData.experience.trim() || undefined,
        maritalStatus: formData.maritalStatus || undefined,
        aadharNo: formData.aadharNo.trim() || undefined,
        lastSalary: formData.lastSalary.trim() || undefined,
        reasonForLeaving: formData.reasonForLeaving.trim() || undefined,
        currentAddress: formData.currentAddress.trim() || undefined,
        indentId: indentId && indentId !== 'direct' ? indentId : undefined,
        photo: photoUrl,
        resume: resumeUrl,
      };

      const res = await api.post('/public/hr/apply', payload);
      const data = res.data?.data;

      setSubmittedData({
        enquiryNo: data?.candidateEnquiryNo || 'Submitted',
        candidateName: formData.candidateName.trim(),
      });
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || 'Failed to submit application. Please check your connection and try again.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  // Success Confirmation Screen
  if (submittedData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-50/50 via-background to-background px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-lg">
          <div className="overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-8 text-center animate-in zoom-in-95 duration-200">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-600 ring-8 ring-emerald-500/5">
              <IconCheck className="h-8 w-8" />
            </div>

            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Application Submitted!
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Thank you, <span className="font-semibold text-foreground">{submittedData.candidateName}</span>. Your application has been received successfully.
            </p>

            <div className="mt-6 rounded-xl border border-border bg-muted/40 p-4 text-left">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Enquiry Reference
              </div>
              <div className="mt-1 font-mono text-lg font-bold tracking-tight text-primary">
                {submittedData.enquiryNo}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Please save this reference number for future communication regarding your application.
              </p>
            </div>

            <div className="mt-6 text-xs text-muted-foreground space-y-1">
              <p>Our Human Resources team will review your profile.</p>
              <p>If shortlisted, we will reach out to you directly on your contact number.</p>
            </div>

            <div className="mt-8 border-t border-border pt-6">
              <button
                type="button"
                onClick={() => {
                  setSubmittedData(null);
                  setFormData({
                    candidateName: '',
                    phoneNo: '',
                    email: '',
                    dob: '',
                    previousCompany: '',
                    previousPosition: '',
                    experience: '',
                    maritalStatus: '',
                    aadharNo: '',
                    lastSalary: '',
                    reasonForLeaving: '',
                    currentAddress: '',
                  });
                  setPhotoFile(null);
                  setResumeFile(null);
                  setPhotoPreview(null);
                }}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                Submit Another Application
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50/60 via-background to-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {/* Header Job / Organization Card */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm">
          {isLoadingIndent ? (
            <div className="flex items-center gap-3 text-muted-foreground">
              <IconLoader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm">Loading job details…</span>
            </div>
          ) : (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <IconBriefcase className="h-3.5 w-3.5" />
                  Candidate Application Form
                </span>
                {indent?.recordId && (
                  <span className="font-mono text-xs font-medium text-muted-foreground">
                    Ref: {indent.recordId}
                  </span>
                )}
              </div>

              <h1 className="mt-3 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                {indent?.title || 'Open Position Application'}
              </h1>

              {indent?.department?.name && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <IconBuilding className="h-4 w-4 shrink-0 text-muted-foreground/70" />
                  <span>{indent.department.name}</span>
                </div>
              )}

              {/* Requirement Pills */}
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                {indent?.experienceYears && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 text-muted-foreground font-medium">
                    <IconClock className="h-3.5 w-3.5" />
                    Exp: {indent.experienceYears}
                  </span>
                )}
                {indent?.noOfPost && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 text-muted-foreground font-medium">
                    <IconUser className="h-3.5 w-3.5" />
                    {indent.noOfPost} Vacanc{indent.noOfPost === 1 ? 'y' : 'ies'}
                  </span>
                )}
                {Array.isArray(indent?.jobType) &&
                  indent.jobType.map((t, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center rounded-lg bg-muted px-2.5 py-1 text-muted-foreground font-medium"
                    >
                      {t}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Application Form */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="border-b border-border pb-4 mb-6">
            <h2 className="text-base font-bold text-foreground">Your Information</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Please enter your details accurately. Mandatory fields are marked with <span className="text-destructive">*</span>.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs font-medium text-destructive">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Core Identification */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-foreground">
                  Full Name <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <IconUser className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    name="candidateName"
                    value={formData.candidateName}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    className="h-10 w-full rounded-xl border border-border bg-muted/40 pl-9 pr-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:bg-background"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-foreground">
                  Mobile / Phone Number <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <IconPhone className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="tel"
                    name="phoneNo"
                    value={formData.phoneNo}
                    onChange={handleChange}
                    placeholder="e.g. 9876543210"
                    className="h-10 w-full rounded-xl border border-border bg-muted/40 pl-9 pr-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:bg-background"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-foreground">
                  Email Address {config.email && <span className="text-destructive">*</span>}
                </label>
                <div className="relative">
                  <IconMail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="e.g. rahul@example.com"
                    className="h-10 w-full rounded-xl border border-border bg-muted/40 pl-9 pr-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:bg-background"
                    required={config.email}
                  />
                </div>
              </div>

              {/* Date of Birth */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-foreground">
                  Date of Birth {config.dob && <span className="text-destructive">*</span>}
                </label>
                <div className="relative">
                  <IconCalendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="date"
                    name="dob"
                    value={formData.dob}
                    onChange={handleChange}
                    className="h-10 w-full rounded-xl border border-border bg-muted/40 pl-9 pr-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:bg-background"
                    required={config.dob}
                  />
                </div>
              </div>

              {/* Marital Status */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-foreground">
                  Marital Status {config.maritalStatus && <span className="text-destructive">*</span>}
                </label>
                <select
                  name="maritalStatus"
                  value={formData.maritalStatus}
                  onChange={handleChange}
                  className="h-10 w-full rounded-xl border border-border bg-muted/40 px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:bg-background"
                  required={config.maritalStatus}
                >
                  <option value="">Select status</option>
                  {MARITAL_STATUS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Aadhaar Number */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-foreground">
                  Aadhaar / National ID {config.aadharNo && <span className="text-destructive">*</span>}
                </label>
                <div className="relative">
                  <IconId className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    name="aadharNo"
                    value={formData.aadharNo}
                    onChange={handleChange}
                    placeholder="12-digit Aadhaar Number"
                    maxLength={14}
                    className="h-10 w-full rounded-xl border border-border bg-muted/40 pl-9 pr-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:bg-background"
                    required={config.aadharNo}
                  />
                </div>
              </div>

              {/* Total Experience */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-foreground">
                  Total Experience {config.experience && <span className="text-destructive">*</span>}
                </label>
                <input
                  type="text"
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  placeholder="e.g. 2 Years, Fresher"
                  className="h-10 w-full rounded-xl border border-border bg-muted/40 px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:bg-background"
                  required={config.experience}
                />
              </div>

              {/* Previous Company */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-foreground">
                  Previous / Current Company {config.previousCompany && <span className="text-destructive">*</span>}
                </label>
                <input
                  type="text"
                  name="previousCompany"
                  value={formData.previousCompany}
                  onChange={handleChange}
                  placeholder="e.g. Larsen & Toubro"
                  className="h-10 w-full rounded-xl border border-border bg-muted/40 px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:bg-background"
                  required={config.previousCompany}
                />
              </div>

              {/* Previous Position */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-foreground">
                  Previous / Current Designation {config.previousPosition && <span className="text-destructive">*</span>}
                </label>
                <input
                  type="text"
                  name="previousPosition"
                  value={formData.previousPosition}
                  onChange={handleChange}
                  placeholder="e.g. Site Engineer"
                  className="h-10 w-full rounded-xl border border-border bg-muted/40 px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:bg-background"
                  required={config.previousPosition}
                />
              </div>

              {/* Last Salary */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-foreground">
                  Last Drawn Salary / CTC {config.lastSalary && <span className="text-destructive">*</span>}
                </label>
                <input
                  type="text"
                  name="lastSalary"
                  value={formData.lastSalary}
                  onChange={handleChange}
                  placeholder="e.g. ₹ 35,000 / month"
                  className="h-10 w-full rounded-xl border border-border bg-muted/40 px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:bg-background"
                  required={config.lastSalary}
                />
              </div>

              {/* Reason for Leaving */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-foreground">
                  Reason for Leaving {config.reasonForLeaving && <span className="text-destructive">*</span>}
                </label>
                <input
                  type="text"
                  name="reasonForLeaving"
                  value={formData.reasonForLeaving}
                  onChange={handleChange}
                  placeholder="e.g. Career growth, relocation"
                  className="h-10 w-full rounded-xl border border-border bg-muted/40 px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:bg-background"
                  required={config.reasonForLeaving}
                />
              </div>

              {/* Current Address */}
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-foreground">
                  Current Residential Address {config.currentAddress && <span className="text-destructive">*</span>}
                </label>
                <div className="relative">
                  <IconMapPin className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <textarea
                    rows={2}
                    name="currentAddress"
                    value={formData.currentAddress}
                    onChange={handleChange}
                    placeholder="Enter your current address"
                    className="w-full rounded-xl border border-border bg-muted/40 pl-9 pr-3 pt-2 text-sm text-foreground outline-none transition-colors focus:border-primary focus:bg-background resize-none"
                    required={config.currentAddress}
                  />
                </div>
              </div>
            </div>

            {/* Document Attachments */}
            <div className="border-t border-border pt-6">
              <h3 className="text-sm font-bold text-foreground mb-4">Documents & Attachments</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Photo Upload */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground">
                    Passport Photo {config.photo && <span className="text-destructive">*</span>}
                  </label>
                  <div className="relative">
                    {photoPreview ? (
                      <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-2.5">
                        <img
                          src={photoPreview}
                          alt="Candidate"
                          className="h-12 w-12 rounded-lg object-cover border border-border"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-foreground">
                            {photoFile?.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {((photoFile?.size || 0) / 1024).toFixed(0)} KB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setPhotoFile(null);
                            setPhotoPreview(null);
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive"
                        >
                          <IconX className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex min-h-24 w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border bg-muted/20 p-4 transition-colors hover:border-primary/50 hover:bg-muted/40">
                        <IconUpload className="h-5 w-5 text-muted-foreground" />
                        <span className="text-xs font-semibold text-foreground">Upload Photo</span>
                        <span className="text-[11px] text-muted-foreground">JPG, PNG (Max 5MB)</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoSelect}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Resume Upload */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground">
                    Resume / CV {config.resume && <span className="text-destructive">*</span>}
                  </label>
                  <div className="relative">
                    {resumeFile ? (
                      <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-2.5">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <IconFileText className="h-6 w-6" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-foreground">
                            {resumeFile.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {((resumeFile.size || 0) / 1024).toFixed(0)} KB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setResumeFile(null)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive"
                        >
                          <IconX className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex min-h-24 w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border bg-muted/20 p-4 transition-colors hover:border-primary/50 hover:bg-muted/40">
                        <IconUpload className="h-5 w-5 text-muted-foreground" />
                        <span className="text-xs font-semibold text-foreground">Upload Resume / CV</span>
                        <span className="text-[11px] text-muted-foreground">PDF, DOC, DOCX (Max 10MB)</span>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={handleResumeSelect}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="border-t border-border pt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  'flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/95 disabled:pointer-events-none disabled:opacity-50'
                )}
              >
                {isSubmitting ? (
                  <>
                    <IconLoader2 className="h-5 w-5 animate-spin" />
                    <span>{uploadProgress || 'Submitting application…'}</span>
                  </>
                ) : (
                  <>
                    <IconCheck className="h-5 w-5" />
                    <span>Submit Application</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
