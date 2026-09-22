'use client';

import { AlertCircle, Calendar, CheckCircle2, Clock, FileText, Save, X, Zap } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { CompanySelectField } from '@/features/organization/components/CompanySelectField';
import { useCompanyPinForCreate } from '@/features/organization/hooks/useCompanyPinForCreate';
import { useGetProfileQuery } from '@/features/profile/shared/server/tanstackQuery/useProfileQueries';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useAppSelector } from '@/store/hook';
import { selectOrgViewMode, selectUser } from '@/store/slice/userAccountData';
import AddActivityTypeModal from '../../activityTypes/components/AddActivityTypeModal';
import { useActivityTypes } from '../../activityTypes/server/tanstackQuery/useActivityTypeQueries';
import { useMachineParts } from '../../machines/server/tanstackQuery/useMachinePartQueries';
import { useMachines } from '../../machines/server/tanstackQuery/useMachinesQueries';
import { useCreatePlan } from '../../plans/server/tanstackQuery/usePlansQueries';
import type { PlanFrequency } from '../../plans/types/types';
import { PLAN_FREQUENCY_LABELS } from '../../plans/types/types';
import { useAssignableUsers } from '../server/tanstackQuery/useUsersQueries';

// ─── Tokens ──────────────────────────────────────────────────────────────────
const T = {
  bg: 'var(--background)',
  bgDeep: 'var(--muted)',
  fg: 'var(--foreground)',
  card: 'var(--card)',
  mutedFg: 'var(--muted-foreground)',
  border: 'var(--border)',
  primary: 'var(--primary)',
  successBg: 'color-mix(in oklch, var(--success) 15%, transparent)',
  success: 'var(--success)',
  warningBg: 'color-mix(in oklch, var(--warning) 15%, transparent)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
  info: 'oklch(0.488 0.243 264.376)',
  infoBg: 'oklch(0.488 0.243 264.376 / 0.14)',
  font: "'DM Sans', system-ui, sans-serif" as React.CSSProperties['fontFamily'],
};

// ─── Primitives ───────────────────────────────────────────────────────────────
function FieldLabel({
  children,
  required,
  htmlFor,
}: {
  children: React.ReactNode;
  required?: boolean;
  htmlFor: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      style={{
        display: 'block',
        fontSize: 12,
        fontWeight: 600,
        color: T.fg,
        marginBottom: 7,
        letterSpacing: '.01em',
      }}
    >
      {children}
      {required && <span style={{ color: T.danger, marginLeft: 3 }}>*</span>}
    </label>
  );
}

function StyledInput({
  id,
  leftIcon,
  error,
  style,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  leftIcon?: React.ReactNode;
  error?: boolean;
}) {
  const [focus, setFocus] = useState(false);
  const borderColor = error ? T.danger : focus ? T.primary : T.border;
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      {leftIcon && (
        <div style={{ position: 'absolute', left: 12, color: T.mutedFg, display: 'flex' }}>
          {leftIcon}
        </div>
      )}
      <input
        id={id}
        {...props}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          width: '100%',
          background: T.bgDeep,
          border: `1px solid ${borderColor}`,
          borderRadius: 10,
          padding: leftIcon ? '10px 12px 10px 36px' : '10px 12px',
          fontSize: 13,
          color: T.fg,
          outline: 'none',
          transition: 'all .15s',
          boxShadow: focus
            ? '0 0 0 3px color-mix(in oklch, var(--primary) 15%, transparent)'
            : 'none',
          ...style,
        }}
      />
    </div>
  );
}

function StyledSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  error,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
}) {
  const [focus, setFocus] = useState(false);
  const borderColor = error ? T.danger : focus ? T.primary : T.border;
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      disabled={disabled}
      style={{
        width: '100%',
        background: T.bgDeep,
        border: `1px solid ${borderColor}`,
        borderRadius: 10,
        padding: '10px 34px 10px 12px',
        fontSize: 13,
        color: value ? T.fg : T.mutedFg,
        outline: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        appearance: 'none',
        transition: 'all .15s',
        boxShadow: focus
          ? '0 0 0 3px color-mix(in oklch, var(--primary) 15%, transparent)'
          : 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        background: checked ? T.primary : T.border,
        border: 'none',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background .2s',
        flexShrink: 0,
        padding: 0,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 2,
          left: checked ? 22 : 2,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: 'white',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          transition: 'left .2s',
        }}
      />
    </button>
  );
}

// ─── Form State ───────────────────────────────────────────────────────────────
type FormState = {
  machineId: string;
  machinePartId: string;
  assignedToId: string;
  activityTypeId: string;
  taskCode: string;
  temperature: string;
  priority: string;
  description: string;
  startDate: string;
  taskTime: string;
  frequency: PlanFrequency;
  alternateDaysInterval: string;
  enableReminder: boolean;
  requireAttachment: boolean;
  givenBy: string;
  expectedCompletionDate: string;
};

const EMPTY: FormState = {
  machineId: '',
  machinePartId: '',
  assignedToId: '',
  activityTypeId: '',
  taskCode: '',
  temperature: '',
  priority: '2',
  description: '',
  startDate: '',
  taskTime: '',
  frequency: 'MONTHLY',
  alternateDaysInterval: '2',
  enableReminder: false,
  requireAttachment: false,
  givenBy: '',
  expectedCompletionDate: '',
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AssignTaskMain() {
  const navigate = useNavigate();
  const router = { push: (p: string) => navigate(p), back: () => navigate(-1) };
  const isMobile = useIsMobile();
  const orgViewMode = useAppSelector(selectOrgViewMode);
  // Picks a company first when merged, instead of the blanket "leave All
  // Companies mode" block — same pattern as Repair Tasks' New Repair Task.
  const { pinnedCompany, selectCompany, reset: resetPinnedCompany } = useCompanyPinForCreate();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: machinesRes } = useMachines(undefined, pinnedCompany?.id);
  const { data: users } = useAssignableUsers(pinnedCompany?.id);
  const { data: partsRes } = useMachineParts(form.machineId || undefined, pinnedCompany?.id);
  const { data: activityTypes } = useActivityTypes(pinnedCompany?.id);
  const createPlan = useCreatePlan();
  const { data: profileRaw } = useGetProfileQuery();
  const [showAddActivityType, setShowAddActivityType] = useState(false);

  const [docUrl, setDocUrl] = useState('');
  const [docMediaId, setDocMediaId] = useState('');
  const [docName, setDocName] = useState('');
  const {
    uploadImage: uploadDoc,
    isUploading: isDocUploading,
    progress: docProgress,
    error: docUploadError,
    resetError: resetDocError,
  } = useImageUpload({
    bucket: 'uploads',
    pathPrefix: 'task-documents',
    maxSizeMB: 10,
    allowedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
  });

  const machines = machinesRes?.data ?? [];
  const parts: { id: string; name: string }[] = form.machineId
    ? ((partsRes?.data ?? []) as { id: string; name: string }[])
    : [];
  const profile = useAppSelector(selectUser);
  const selectedMachine = machines.find((m) => m.id === form.machineId);
  const selectedActivityType = (activityTypes ?? []).find((t) => t.id === form.activityTypeId);
  const isRepair = selectedActivityType?.code === 'REPAIR';

  const set = useCallback(<K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((p) => ({ ...p, [k]: v }));
    setError(null);
  }, []);

  const handleDocUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      resetDocError();
      try {
        const result = await uploadDoc(file);
        setDocUrl(result.url);
        setDocMediaId(result.mediaId);
        setDocName(file.name);
      } catch (_e) {}
    },
    [uploadDoc, resetDocError]
  );

  useEffect(() => {
    if (profile?.name) {
      setForm((p) => ({ ...p, givenBy: String(profile.name ?? '') }));
    }
  }, [profile?.name]);

  useEffect(() => {
    if (!form.activityTypeId && activityTypes && activityTypes.length > 0) {
      setForm((p) => ({ ...p, activityTypeId: activityTypes[0].id }));
    }
  }, [activityTypes, form.activityTypeId]);

  useEffect(() => {
    if (isRepair) {
      setForm((p) => ({ ...p, frequency: 'ONE_TIME' }));
    }
  }, [isRepair]);

  const buildScheduleConfig = useCallback((): Record<string, unknown> => {
    switch (form.frequency) {
      case 'DAILY':
        return { everyNDays: 1 };
      case 'WEEKLY':
        return { days: [1], everyNWeeks: 1 };
      case 'FORTNIGHTLY':
        return { days: [1], everyNWeeks: 2 };
      case 'ALTERNATE_DAYS': {
        const interval = Number.parseInt(form.alternateDaysInterval, 10);
        return { everyNDays: interval >= 1 ? interval : 2 };
      }
      case 'MONTHLY':
        return { type: 'DATE', dates: [1] };
      case 'QUARTERLY':
        return { monthOfQuarter: 1, date: 1 };
      case 'YEARLY':
        return { month: 1, date: 1 };
      case 'IN_FIRST_WEEK':
      case 'IN_SECOND_WEEK':
      case 'IN_THIRD_WEEK':
      case 'IN_FOURTH_WEEK':
        return {};
      case 'ONE_TIME':
        return form.expectedCompletionDate ? { specificDates: [form.expectedCompletionDate] } : {};
      case 'RUNNING_HOURS':
        return { afterHours: 500, toleranceHours: 50 };
      case 'METER_BASED':
        return { afterUnits: 10000, toleranceUnits: 500 };
      default:
        return {};
    }
  }, [form.frequency, form.expectedCompletionDate, form.alternateDaysInterval]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.machineId) return setError('Please select a machine');
    if (!form.assignedToId) return setError('Please select a technician to assign');
    if (!form.activityTypeId) return setError('Please select a task type');
    if (isRepair || form.frequency === 'ONE_TIME') {
      if (!form.expectedCompletionDate) return setError('Expected completion date is required');
    } else {
      if (!form.startDate) return setError('Task start date is required');
    }

    try {
      const autoTitle = `${selectedActivityType?.name ?? 'Task'} – ${selectedMachine?.name ?? 'Task'}`;
      const created = await createPlan.mutateAsync({
        machineId: form.machineId,
        assignedToId: form.assignedToId,
        title: autoTitle,
        planCode: form.taskCode.trim() || undefined,
        description: form.description.trim() || undefined,
        activityTypeId: form.activityTypeId,
        machinePartId: form.machinePartId || undefined,
        frequency: form.frequency,
        // `taskTime` was captured in state but never actually included here —
        // whatever the user typed into "Task Time"/"Expected Completion Time"
        // was silently discarded, and the plan's startDate always got a bare
        // date with no time component.
        startDate: `${isRepair || form.frequency === 'ONE_TIME' ? form.expectedCompletionDate : form.startDate}${form.taskTime ? `T${form.taskTime}:00` : ''}`,
        priority: Number.parseInt(form.priority, 10),
        scheduleConfig: buildScheduleConfig(),
        documentUrl: docUrl || undefined,
        documentMediaId: docMediaId || undefined,
        actAsTenantId: pinnedCompany?.id,
      });
      if (isRepair) {
        router.push('/repair/tasks');
        return;
      }
      // The assignee's on-leave notice is more actionable than the generic
      // success line, so it takes priority when both are true.
      setSuccess(created.notice || 'Maintenance plan assigned successfully!');
      setForm(EMPTY);
      setDocUrl('');
      setDocMediaId('');
      setDocName('');
      resetPinnedCompany();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to assign task'
      );
    }
  };

  const machineOptions = machines.map((m) => ({
    value: m.id,
    label: `${m.name} (${m.assetCode})`,
  }));
  const partOptions = parts.map((p) => ({ value: p.id, label: p.name }));
  const userOptions = (users ?? []).map((u) => ({ value: u.id, label: u.name }));
  const activityOptions = (activityTypes ?? []).map((t) => ({ value: t.id, label: t.name }));
  const frequencyOptions = Object.entries(PLAN_FREQUENCY_LABELS)
    .filter(([v]) => v !== 'RUNNING_HOURS' && v !== 'METER_BASED')
    .map(([v, l]) => ({
      value: v,
      label: l,
    }));
  const _priorityOptions = [
    { value: '1', label: 'Low' },
    { value: '2', label: 'Medium' },
    { value: '3', label: 'High' },
    { value: '4', label: 'Critical' },
  ];
  const temperatureOptions = [
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' },
  ];

  return (
    <div
      style={{
        fontFamily: T.font,
        width: '100%',
        background: T.bg,
        color: T.fg,
        padding: isMobile ? '16px' : '24px 32px',
        borderRadius: 16,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center',
          justifyContent: 'space-between',
          gap: isMobile ? 12 : 0,
          marginBottom: 28,
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>
            Assign Maintenance Task
          </h1>
          <p style={{ fontSize: 13, color: T.mutedFg }}>
            Create recurring maintenance plans for your machines
          </p>
        </div>
        <Link to="/maintenance/tasks">
          <button
            type="button"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              width: isMobile ? '100%' : 'auto',
              padding: '9px 16px',
              borderRadius: 10,
              border: `1px solid ${T.border}`,
              background: T.bgDeep,
              color: T.fg,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Zap size={14} /> View All Tasks
          </button>
        </Link>
      </div>

      {/* Success toast */}
      {success && (
        <div
          style={{
            background: T.successBg,
            border: `1px solid ${T.success}`,
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <CheckCircle2 size={16} color={T.success} />
          <span style={{ fontSize: 13, fontWeight: 500 }}>{success}</span>
        </div>
      )}

      {/* Form Card */}
      <div
        style={{
          maxWidth: 896,
          margin: '0 auto',
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 12,
          padding: isMobile ? 16 : 28,
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {orgViewMode === 'all' && !pinnedCompany ? (
          <CompanySelectField onSelect={selectCompany} />
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Error */}
            {error && (
              <div
                style={{
                  background: T.warningBg,
                  border: `1px solid ${T.warning}`,
                  borderRadius: 10,
                  padding: '12px 16px',
                  marginBottom: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <AlertCircle size={16} color={T.warning} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>{error}</span>
              </div>
            )}

            {/* Row 1: Task Type | Machine Name */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                gap: 20,
                marginBottom: 20,
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <FieldLabel htmlFor="activityType" required>
                    Task Type
                  </FieldLabel>
                  <button
                    type="button"
                    onClick={() => setShowAddActivityType(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: T.primary,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                      marginBottom: 7,
                    }}
                  >
                    + Add Task Type
                  </button>
                </div>
                <StyledSelect
                  id="activityType"
                  value={form.activityTypeId}
                  onChange={(v) => set('activityTypeId', v)}
                  options={activityOptions}
                  placeholder="Select Task Type"
                />
              </div>
              <div>
                <FieldLabel htmlFor="givenBy">Requested By</FieldLabel>
                <StyledInput
                  id="givenBy"
                  value={form.givenBy}
                  readOnly
                  placeholder="Loading profile..."
                  style={{ cursor: 'default' }}
                />
              </div>
            </div>

            {/* Row 2: Assigned To | Requested By */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                gap: 20,
                marginBottom: 20,
              }}
            >
              <div>
                <FieldLabel htmlFor="assignedToId" required>
                  Assigned To
                </FieldLabel>
                <StyledSelect
                  id="assignedToId"
                  value={form.assignedToId}
                  onChange={(v) => set('assignedToId', v)}
                  options={userOptions}
                  placeholder="Select Technician"
                  error={!!error && !form.assignedToId}
                />
              </div>
              <div>
                <FieldLabel htmlFor="machineId" required>
                  Machine Name
                </FieldLabel>
                <StyledSelect
                  id="machineId"
                  value={form.machineId}
                  onChange={(v) => {
                    set('machineId', v);
                    set('machinePartId', '');
                  }}
                  options={machineOptions}
                  placeholder="Select Machine"
                  error={!!error && !form.machineId}
                />
              </div>
            </div>

            {/* Row 3: Part Name | Temperature (Temperature hidden for REPAIR) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile || isRepair ? '1fr' : '1fr 1fr',
                gap: 20,
                marginBottom: 20,
              }}
            >
              <div>
                <FieldLabel htmlFor="machinePartId">Part Name</FieldLabel>
                <StyledSelect
                  id="machinePartId"
                  value={form.machinePartId}
                  onChange={(v) => set('machinePartId', v)}
                  options={partOptions}
                  placeholder={
                    !form.machineId
                      ? 'Select machine first'
                      : parts.length === 0
                        ? 'No parts available'
                        : 'Select Part'
                  }
                  disabled={!form.machineId || parts.length === 0}
                />
              </div>
              {!isRepair && (
                <div>
                  <FieldLabel htmlFor="temperature">Temperature</FieldLabel>
                  <StyledSelect
                    id="temperature"
                    value={form.temperature}
                    onChange={(v) => set('temperature', v)}
                    options={temperatureOptions}
                    placeholder="Select Temperature"
                  />
                </div>
              )}
            </div>

            {/* Work Description */}
            <div style={{ marginBottom: 20 }}>
              <FieldLabel htmlFor="workDescription">
                {isRepair ? 'Issue Details' : 'Work Description'}
              </FieldLabel>
              <textarea
                id="workDescription"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                rows={4}
                placeholder="Enter task description..."
                style={{
                  width: '100%',
                  background: T.bgDeep,
                  border: `1px solid ${T.border}`,
                  borderRadius: 10,
                  padding: '10px 12px',
                  fontSize: 13,
                  color: T.fg,
                  outline: 'none',
                  resize: 'none',
                  fontFamily: T.font as string,
                  boxSizing: 'border-box',
                  transition: 'all .15s',
                }}
              />
            </div>

            {/* Task ID — optional, leave blank to auto-generate */}
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                }}
              >
                <FieldLabel htmlFor="taskCode">Task ID</FieldLabel>
                <span style={{ fontSize: 11, color: T.mutedFg, marginBottom: 7 }}>optional</span>
              </div>
              <StyledInput
                id="taskCode"
                value={form.taskCode}
                onChange={(e) => set('taskCode', e.target.value)}
                placeholder="Leave blank to auto-generate (e.g. MP007)"
              />
            </div>

            {/* Task Document Upload */}
            <div style={{ marginBottom: 20 }}>
              <FieldLabel htmlFor="taskDocument">
                {isRepair ? 'Machine/Damage area' : 'Task Document'}{' '}
                <span style={{ color: T.mutedFg, fontWeight: 400, fontSize: 11 }}>
                  (PDF or image, max 10 MB)
                </span>
              </FieldLabel>
              {docUrl ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: T.bgDeep,
                    border: `1px solid ${T.success}`,
                    borderRadius: 10,
                    padding: '10px 14px',
                  }}
                >
                  <FileText size={15} color={T.success} style={{ flexShrink: 0 }} />
                  <a
                    href={docUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      flex: 1,
                      fontSize: 13,
                      color: T.success,
                      fontWeight: 500,
                      textDecoration: 'none',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {docName}
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setDocUrl('');
                      setDocMediaId('');
                      setDocName('');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: T.mutedFg,
                      display: 'flex',
                      padding: 0,
                      flexShrink: 0,
                    }}
                  >
                    <X size={15} />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="taskDocument"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: T.bgDeep,
                    border: `1px dashed ${isDocUploading ? T.primary : T.border}`,
                    borderRadius: 10,
                    padding: '12px 16px',
                    cursor: isDocUploading ? 'not-allowed' : 'pointer',
                    fontSize: 13,
                    color: isDocUploading ? T.primary : T.mutedFg,
                    transition: 'all .15s',
                  }}
                >
                  <FileText size={15} />
                  {isDocUploading ? `Uploading… ${docProgress}%` : 'Click to upload PDF or image'}
                  <input
                    id="taskDocument"
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                    disabled={isDocUploading}
                    onChange={handleDocUpload}
                  />
                </label>
              )}
              {isDocUploading && (
                <div
                  style={{
                    height: 4,
                    background: T.bgDeep,
                    borderRadius: 2,
                    marginTop: 6,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${docProgress}%`,
                      background: T.primary,
                      borderRadius: 2,
                      transition: 'width .2s',
                    }}
                  />
                </div>
              )}
              {docUploadError && (
                <div style={{ fontSize: 12, color: T.danger, marginTop: 4 }}>{docUploadError}</div>
              )}
            </div>

            {isRepair ? (
              /* Expected Completion Date — REPAIR only */
              <div style={{ marginBottom: 20 }}>
                <FieldLabel htmlFor="expectedCompletionDate" required>
                  Expected Completion Date
                </FieldLabel>
                <StyledInput
                  id="expectedCompletionDate"
                  type="date"
                  value={form.expectedCompletionDate}
                  onChange={(e) => set('expectedCompletionDate', e.target.value)}
                  leftIcon={<Calendar size={14} />}
                  error={!!error && !form.expectedCompletionDate}
                />
              </div>
            ) : (
              <>
                {/* Row 4: Frequency | Date | Time */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr',
                    gap: 20,
                    marginBottom: 20,
                  }}
                >
                  <div>
                    <FieldLabel htmlFor="frequency">Frequency</FieldLabel>
                    <StyledSelect
                      id="frequency"
                      value={form.frequency}
                      onChange={(v) => set('frequency', v as PlanFrequency)}
                      options={frequencyOptions}
                    />
                    {form.frequency === 'ALTERNATE_DAYS' && (
                      <div style={{ marginTop: 10 }}>
                        <FieldLabel htmlFor="alternateDaysInterval" required>
                          Gap between occurrences (days)
                        </FieldLabel>
                        <StyledInput
                          id="alternateDaysInterval"
                          type="text"
                          inputMode="numeric"
                          value={form.alternateDaysInterval}
                          onChange={(e) =>
                            set('alternateDaysInterval', e.target.value.replace(/\D/g, ''))
                          }
                        />
                      </div>
                    )}
                  </div>
                  {form.frequency === 'ONE_TIME' ? (
                    <>
                      <div>
                        <FieldLabel htmlFor="expectedCompletionDate" required>
                          Expected Completion Date
                        </FieldLabel>
                        <StyledInput
                          id="expectedCompletionDate"
                          type="date"
                          value={form.expectedCompletionDate}
                          onChange={(e) => set('expectedCompletionDate', e.target.value)}
                          leftIcon={<Calendar size={14} />}
                          error={!!error && !form.expectedCompletionDate}
                        />
                      </div>
                      <div>
                        <FieldLabel htmlFor="taskTime">Expected Completion Time</FieldLabel>
                        <StyledInput
                          id="taskTime"
                          type="time"
                          value={form.taskTime}
                          onChange={(e) => set('taskTime', e.target.value)}
                          leftIcon={<Clock size={14} />}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <FieldLabel htmlFor="startDate" required>
                          Task Start Date
                        </FieldLabel>
                        <StyledInput
                          id="startDate"
                          type="date"
                          value={form.startDate}
                          onChange={(e) => set('startDate', e.target.value)}
                          leftIcon={<Calendar size={14} />}
                          error={!!error && !form.startDate}
                        />
                      </div>
                      <div>
                        <FieldLabel htmlFor="taskTime">Task Time</FieldLabel>
                        <StyledInput
                          id="taskTime"
                          type="time"
                          value={form.taskTime}
                          onChange={(e) => set('taskTime', e.target.value)}
                          leftIcon={<Clock size={14} />}
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Schedule info banner */}
                <div
                  style={{
                    background: T.infoBg,
                    border: `1px solid ${T.info}`,
                    borderRadius: 10,
                    padding: '10px 14px',
                    marginBottom: 24,
                    fontSize: 12,
                    color: T.info,
                  }}
                >
                  <span style={{ fontWeight: 600 }}>Schedule: </span>
                  {form.frequency === 'ONE_TIME' ? (
                    <>
                      One-time task
                      {form.expectedCompletionDate &&
                        ` to be completed by ${form.expectedCompletionDate}`}
                      {selectedMachine && ` for ${selectedMachine.name}`}
                    </>
                  ) : (
                    <>
                      {PLAN_FREQUENCY_LABELS[form.frequency]} maintenance plan
                      {form.startDate && ` starting ${form.startDate}`}
                      {selectedMachine && ` for ${selectedMachine.name}`}
                    </>
                  )}
                </div>
              </>
            )}

            {/* Additional Options */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.fg, marginBottom: 16 }}>
                Additional Options
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 0',
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: T.fg }}>
                    Require Attachment
                  </div>
                  <div style={{ fontSize: 12, color: T.info, marginTop: 2 }}>
                    User must upload a file when completing task
                  </div>
                </div>
                <Toggle
                  checked={form.requireAttachment}
                  onChange={(v) => set('requireAttachment', v)}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={createPlan.isPending}
              style={{
                width: '100%',
                background: T.primary,
                color: 'white',
                border: 'none',
                borderRadius: 10,
                padding: '12px 20px',
                fontSize: 14,
                fontWeight: 700,
                cursor: createPlan.isPending ? 'not-allowed' : 'pointer',
                opacity: createPlan.isPending ? 0.7 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'opacity .15s',
              }}
            >
              <Save size={16} />
              {createPlan.isPending ? 'Assigning...' : 'Assign Task'}
            </button>
          </form>
        )}
      </div>

      {showAddActivityType && (
        <AddActivityTypeModal
          onClose={() => setShowAddActivityType(false)}
          onSuccess={(newId) => set('activityTypeId', newId)}
          actAsTenantId={pinnedCompany?.id}
        />
      )}
    </div>
  );
}
