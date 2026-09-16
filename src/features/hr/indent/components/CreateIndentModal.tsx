'use client';

import {
  IconAlertCircle,
  IconBriefcase,
  IconCheck,
  IconLoader2,
  IconPlus,
  IconX,
} from '@tabler/icons-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { useRequireCompanySelected } from '@/features/organization/hooks/useRequireCompanySelected';
import { useDepartmentOptions } from '../../_shared/tanstackQuery/useDepartments';
import { useCreateIndent } from '../server/tanstackQuery/useIndentQueries';
import { ModalPortal } from '../../_shared/components';
import type { Indent } from '../types/types';

interface CreateIndentModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefillData?: Indent | null;
}

type Gender = 'MALE' | 'FEMALE' | 'ANY';
type Prefer = 'FRESHER' | 'EXPERIENCE' | 'ANY';
type Priority = 'urgent' | 'normal';

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'ANY', label: 'Any' },
];

const PREFER_OPTIONS: { value: Prefer; label: string }[] = [
  { value: 'FRESHER', label: 'Fresher' },
  { value: 'EXPERIENCE', label: 'Experience' },
  { value: 'ANY', label: 'Any' },
];

const POPULAR_PLATFORMS = [
  'LinkedIn',
  'Naukri',
  'Indeed',
  'Monster',
  'Shine',
  'Internshala',
  'Glassdoor',
  'Unstop',
];

const JOB_TYPES = ['Onsite', 'Remote', 'Hybrid'];

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
    {children}
  </p>
);

const inputCls =
  'h-10 w-full rounded-lg border border-border bg-muted px-3 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary';

const CheckboxPill = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) => (
  <label
    className={`inline-flex cursor-pointer select-none items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors ${
      checked
        ? 'border-primary/50 bg-primary/10 text-primary'
        : 'border-border bg-muted text-muted-foreground hover:border-primary/30 hover:text-foreground'
    }`}
  >
    <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
    {checked && <IconCheck className="h-3 w-3 shrink-0" strokeWidth={3} />}
    {label}
  </label>
);

const CreateIndentModal: React.FC<CreateIndentModalProps> = ({ isOpen, onClose, prefillData }) => {
  const requireCompanySelected = useRequireCompanySelected();
  const { data: departments = [], isLoading: isLoadingDepartments } = useDepartmentOptions();
  const createIndentMutation = useCreateIndent();

  const [formData, setFormData] = useState({
    title: '',
    gender: 'ANY' as Gender,
    departmentId: '',
    prefer: 'ANY' as Prefer,
    experienceYears: '',
    noOfPost: 1,
    completionDate: '',
    socialsite: [] as string[],
    jobType: [] as string[],
    budget: '',
    priority: 'normal' as Priority,
  });
  const [customPlatforms, setCustomPlatforms] = useState<string[]>([]);
  const [newPlatformInput, setNewPlatformInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (prefillData) {
      const sites = prefillData.socialsite ?? [];
      const custom = sites.filter(
        (s) => !POPULAR_PLATFORMS.map((p) => p.toLowerCase()).includes(s.toLowerCase())
      );
      setCustomPlatforms(custom);
      setNewPlatformInput('');
      setError(null);
      setFormData({
        title: prefillData.title,
        gender: prefillData.gender,
        departmentId: prefillData.departmentId,
        prefer: prefillData.prefer,
        experienceYears: prefillData.experienceYears ?? '',
        noOfPost: prefillData.noOfPost,
        completionDate: prefillData.completionDate ? prefillData.completionDate.slice(0, 10) : '',
        socialsite: sites,
        jobType: prefillData.jobType ?? [],
        budget: prefillData.budget != null ? String(prefillData.budget) : '',
        priority: (prefillData.priority as Priority) ?? 'normal',
      });
    } else {
      setFormData({
        title: '',
        gender: 'ANY',
        departmentId: '',
        prefer: 'ANY',
        experienceYears: '',
        noOfPost: 1,
        completionDate: '',
        socialsite: [],
        jobType: [],
        budget: '',
        priority: 'normal',
      });
      setCustomPlatforms([]);
      setNewPlatformInput('');
      setError(null);
    }
  }, [isOpen, prefillData]);

  const reset = () => {
    setFormData({
      title: '',
      gender: 'ANY',
      departmentId: '',
      prefer: 'ANY',
      experienceYears: '',
      noOfPost: 1,
      completionDate: '',
      socialsite: [],
      jobType: [],
      budget: '',
      priority: 'normal',
    });
    setCustomPlatforms([]);
    setNewPlatformInput('');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'noOfPost' ? parseInt(value, 10) || 0 : value,
    }));
    setError(null);
  };

  const togglePlatform = (platform: string) => {
    setFormData((prev) => ({
      ...prev,
      socialsite: prev.socialsite.includes(platform)
        ? prev.socialsite.filter((p) => p !== platform)
        : [...prev.socialsite, platform],
    }));
  };

  const toggleJobType = (jt: string) => {
    setFormData((prev) => ({
      ...prev,
      jobType: prev.jobType.includes(jt)
        ? prev.jobType.filter((t) => t !== jt)
        : [...prev.jobType, jt],
    }));
  };

  const addCustomPlatform = () => {
    const trimmed = newPlatformInput.trim();
    if (!trimmed) return;
    const alreadyExists =
      POPULAR_PLATFORMS.map((p) => p.toLowerCase()).includes(trimmed.toLowerCase()) ||
      customPlatforms.map((p) => p.toLowerCase()).includes(trimmed.toLowerCase());
    if (!alreadyExists) {
      setCustomPlatforms((prev) => [...prev, trimmed]);
    }
    if (!formData.socialsite.map((p) => p.toLowerCase()).includes(trimmed.toLowerCase())) {
      setFormData((prev) => ({ ...prev, socialsite: [...prev.socialsite, trimmed] }));
    }
    setNewPlatformInput('');
  };

  const handleAddPlatformKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomPlatform();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireCompanySelected()) return;
    setError(null);

    if (!formData.title.trim()) {
      setError('Please enter a position title.');
      return;
    }
    if (!formData.departmentId) {
      setError('Please select a department.');
      return;
    }
    if (formData.prefer === 'EXPERIENCE' && !formData.experienceYears.trim()) {
      setError('Experience years is required when preference is set to Experience.');
      return;
    }

    let isoCompletionDate = '';
    if (formData.completionDate) {
      const parsed = new Date(formData.completionDate);
      if (!isNaN(parsed.getTime())) {
        isoCompletionDate = parsed.toISOString();
      }
    }
    if (!isoCompletionDate) {
      isoCompletionDate = new Date(Date.now() + 30 * 86400000).toISOString();
    }

    try {
      await createIndentMutation.mutateAsync({
        title: formData.title.trim(),
        gender: formData.gender,
        departmentId: formData.departmentId,
        prefer: formData.prefer,
        experienceYears: formData.experienceYears,
        noOfPost: formData.noOfPost,
        socialsite: formData.socialsite,
        jobType: formData.jobType,
        budget: formData.budget ? Number(formData.budget) : null,
        priority: formData.priority,
        completionDate: isoCompletionDate,
      });
      reset();
      onClose();
    } catch (err: any) {
      console.error('Failed to create indent:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to create indent. Please try again.');
    }
  };

  if (!isOpen) return null;

  const allPlatforms = [...POPULAR_PLATFORMS, ...customPlatforms];

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      >
      <div
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-indent-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <IconBriefcase className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="create-indent-title"
                className="text-[16px] font-bold leading-tight tracking-[-0.01em]"
              >
                {prefillData ? 'Re-indent' : 'Create Indent'}
              </h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {prefillData
                  ? `Based on ${prefillData.recordId ?? prefillData.title}`
                  : 'Define a new manpower requirement'}
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

            {/* Title */}
            <div>
              <FieldLabel>Position Title</FieldLabel>
              <input
                required
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Senior Software Engineer"
                className={inputCls}
              />
            </div>

            {/* Department + Posts */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <FieldLabel>Department</FieldLabel>
                <select
                  required
                  name="departmentId"
                  value={formData.departmentId}
                  onChange={handleChange}
                  disabled={isLoadingDepartments}
                  className={`${inputCls} cursor-pointer pr-8 disabled:opacity-60`}
                >
                  <option value="">
                    {isLoadingDepartments ? 'Loading…' : 'Select Department'}
                  </option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <FieldLabel>Number of Positions</FieldLabel>
                <input
                  required
                  type="number"
                  name="noOfPost"
                  min={1}
                  value={formData.noOfPost}
                  onChange={handleChange}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Budget + Priority */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <FieldLabel>Budget (₹)</FieldLabel>
                <input
                  type="number"
                  name="budget"
                  min={0}
                  value={formData.budget}
                  onChange={handleChange}
                  placeholder="e.g. 800000"
                  className={inputCls}
                />
              </div>

              <div>
                <FieldLabel>Priority</FieldLabel>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className={`${inputCls} cursor-pointer pr-8`}
                >
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            {/* Gender + Prefer */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <FieldLabel>Gender Preference</FieldLabel>
                <div className="flex gap-1 rounded-lg border border-border bg-muted p-1">
                  {GENDER_OPTIONS.map((opt) => {
                    const active = formData.gender === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFormData((p) => ({ ...p, gender: opt.value }))}
                        className={`flex-1 rounded-md px-2 py-1.5 text-[12px] font-semibold transition-colors ${
                          active
                            ? 'bg-card text-foreground shadow-xs'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <FieldLabel>Candidate Preference</FieldLabel>
                <div className="flex gap-1 rounded-lg border border-border bg-muted p-1">
                  {PREFER_OPTIONS.map((opt) => {
                    const active = formData.prefer === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFormData((p) => ({ ...p, prefer: opt.value }))}
                        className={`flex-1 rounded-md px-2 py-1.5 text-[12px] font-semibold transition-colors ${
                          active
                            ? 'bg-card text-foreground shadow-xs'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Conditional experience field */}
            {formData.prefer === 'EXPERIENCE' && (
              <div className="animate-in slide-in-from-top-2 duration-200">
                <FieldLabel>Required Experience</FieldLabel>
                <input
                  required
                  type="text"
                  name="experienceYears"
                  value={formData.experienceYears}
                  onChange={handleChange}
                  placeholder="e.g. 3–5 years"
                  className={inputCls}
                />
              </div>
            )}

            {/* Job Type */}
            <div>
              <FieldLabel>Job Type</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {JOB_TYPES.map((jt) => (
                  <CheckboxPill
                    key={jt}
                    label={jt}
                    checked={formData.jobType.includes(jt)}
                    onChange={() => toggleJobType(jt)}
                  />
                ))}
              </div>
            </div>

            {/* Closing date */}
            <div>
              <FieldLabel>Target Completion Date</FieldLabel>
              <input
                required
                type="date"
                name="completionDate"
                value={formData.completionDate}
                onChange={handleChange}
                className={inputCls}
              />
            </div>

            {/* Target Platforms */}
            <div>
              <FieldLabel>Target Platforms</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {allPlatforms.map((platform) => (
                  <CheckboxPill
                    key={platform}
                    label={platform}
                    checked={formData.socialsite.includes(platform)}
                    onChange={() => togglePlatform(platform)}
                  />
                ))}
              </div>
              {/* Add custom platform */}
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={newPlatformInput}
                  onChange={(e) => setNewPlatformInput(e.target.value)}
                  onKeyDown={handleAddPlatformKey}
                  placeholder="Add custom platform…"
                  className="h-9 flex-1 rounded-lg border border-border bg-muted px-3 text-[12px] text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
                />
                <button
                  type="button"
                  onClick={addCustomPlatform}
                  disabled={!newPlatformInput.trim()}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 text-[12px] font-semibold text-primary transition-colors hover:bg-primary/20 disabled:pointer-events-none disabled:opacity-40"
                >
                  <IconPlus className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Add
                </button>
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
              disabled={createIndentMutation.isPending}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-[12px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {createIndentMutation.isPending ? (
                <>
                  <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <IconCheck className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Create Indent
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

export default CreateIndentModal;
