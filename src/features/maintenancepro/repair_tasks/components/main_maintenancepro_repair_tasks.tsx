'use client';

import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { CompanySelectField } from '@/features/organization/components/CompanySelectField';
import { useCompanyPinForCreate } from '@/features/organization/hooks/useCompanyPinForCreate';
import { useRequireCompanySelected } from '@/features/organization/hooks/useRequireCompanySelected';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useProject } from '@/context/ProjectContext';
import { filterByFirmAccess } from '@/lib/firmAccess';

const useGetProfileQuery = () => ({
  data: { data: { id: 'user-1', name: 'Admin', role: 'ADMIN' } },
  isLoading: false,
});
import { useIsMobile } from '@/hooks/useIsMobile';
import { usePagination } from '@/hooks/usePagination';
import { useAppSelector } from '@/store/hook';
import { selectOrgViewMode, selectUser } from '@/store/slice/userAccountData';
import { useActivityTypes } from '../../activityTypes/server/tanstackQuery/useActivityTypeQueries';
import { useAssignableUsers } from '../../assign_task/server/tanstackQuery/useUsersQueries';
import { useMachineParts as useModalMachineParts } from '../../machines/server/tanstackQuery/useMachinePartQueries';
import { useMachines } from '../../machines/server/tanstackQuery/useMachinesQueries';
import {
  useCreatePlan,
  usePlanDetail,
  useUpdatePlan,
} from '../../plans/server/tanstackQuery/usePlansQueries';
import type { PlanFrequency } from '../../plans/types/types';
import { PLAN_FREQUENCY_LABELS } from '../../plans/types/types';
import type { RepairProcessData, WorkOrder } from '../../unique_task/server/api/workordersApi';
import {
  useDeleteWorkOrder,
  useRepairHistoryWorkOrders,
  useRepairWorkOrders,
} from '../../unique_task/server/tanstackQuery/useWorkOrdersQueries';
import ProcessModal from './ProcessModal';
import { RInput, RLabel, RSelect, RToggle } from './RepairFormComponents';
import StatusBadge from './StatusBadge';
import ViewModal from './ViewModal';

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  bg: 'var(--background)',
  fg: 'var(--foreground)',
  card: 'var(--card)',
  muted: 'var(--muted)',
  mutedFg: 'var(--muted-foreground)',
  border: 'var(--border)',
  primary: 'var(--primary)',
  primaryBg: 'color-mix(in oklch, var(--primary) 12%, transparent)',
  primaryFg: 'var(--primary-foreground, #fff)' as string,
  success: 'var(--success)',
  successBg: 'color-mix(in oklch, var(--success) 14%, transparent)',
  warning: 'var(--warning)',
  warningBg: 'color-mix(in oklch, var(--warning) 14%, transparent)',
  danger: 'var(--danger)',
  dangerBg: 'color-mix(in oklch, var(--danger) 14%, transparent)',
  info: 'oklch(0.488 0.243 264.376)',
  infoBg: 'oklch(0.488 0.243 264.376 / 0.14)',
  font: "'DM Sans', system-ui, sans-serif" as string,
};

// ── Action icons (matching Schedule Maintenance page) ─────────────────────────
const RIco = {
  eye: (s = 14) => (
    <svg
      aria-hidden="true"
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  wrench: (s = 14) => (
    <svg
      aria-hidden="true"
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
    </svg>
  ),
  edit: (s = 14) => (
    <svg
      aria-hidden="true"
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  trash: (s = 14) => (
    <svg
      aria-hidden="true"
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  ),
};

// ── Helpers ────────────────────────────────────────────────────────────────────
// Asia/Kolkata is a fixed UTC+5:30 offset year-round (no DST). A plan's
// startDate is stored as IST midnight expressed in UTC (e.g.
// 2026-08-04T18:30:00.000Z for Aug 5 IST) — reading its calendar date via
// `.toISOString().slice(0, 10)` (plain UTC) shows Aug 4, one day earlier than
// intended, for the ~5.5 hours after IST midnight has already passed in UTC
// terms. Shift by the IST offset before reading, same fix as Schedule
// Maintenance's isOverdue()/EditTaskModal.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
function istDateKey(d: Date) {
  const shifted = new Date(d.getTime() + IST_OFFSET_MS);
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(
    shifted.getUTCDate()
  ).padStart(2, '0')}`;
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function truncate(text: string, maxLength: number) {
  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text;
}

function getRepairProcess(wo: WorkOrder) {
  return (
    (wo.checklistResponses as { repairProcess?: RepairProcessData } | null)?.repairProcess ?? null
  );
}

function _repairStatusColor(status: string | null): { color: string; bg: string } {
  const s = (status ?? '').toUpperCase();
  if (s === 'IN_PROGRESS') return { color: T.info, bg: T.infoBg };
  if (s === 'COMPLETED' || s === 'COMPLETED_LATE') return { color: T.success, bg: T.successBg };
  if (s === 'CANCELLED' || s === 'COMPLETION_REJECTED') return { color: T.danger, bg: T.dangerBg };
  return { color: T.warning, bg: T.warningBg };
}

// ── Shared primitives (matching Schedule Maintenance page) ────────────────────
function TextInput({ style, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        background: T.muted,
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 13,
        color: T.fg,
        fontFamily: 'inherit',
        outline: 'none',
        transition: 'border-color .15s',
        ...style,
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = T.primary;
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = T.border;
      }}
    />
  );
}

function Btn({
  children,
  variant = 'default',
  size = 'default',
  style,
  onClick,
  disabled,
  type = 'button',
}: {
  children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'default';
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  const sizes: Record<string, React.CSSProperties> = {
    sm: { fontSize: 12, padding: '6px 12px', borderRadius: 6 },
    default: { fontSize: 13, padding: '8px 16px', borderRadius: 8 },
  };
  const variants: Record<string, React.CSSProperties> = {
    default: { background: T.primary, color: T.primaryFg },
    secondary: { background: T.muted, color: T.fg },
    ghost: { background: 'transparent', color: T.mutedFg },
    outline: { background: 'transparent', color: T.fg, border: `1px solid ${T.border}` },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        fontFamily: 'inherit',
        fontWeight: 500,
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all .15s',
        outline: 'none',
        whiteSpace: 'nowrap',
        opacity: disabled ? 0.5 : 1,
        ...sizes[size],
        ...variants[variant],
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function StatCard({
  label,
  value,
  color,
  bg,
  icon,
  active,
  onClick,
}: {
  label: string;
  value: number;
  color: string;
  bg: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  const base: React.CSSProperties = {
    background: T.card,
    border: active ? `2px solid ${color}` : `1px solid ${T.border}`,
    borderRadius: 12,
    padding: '14px 18px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    transition: 'all 0.2s ease',
    boxShadow: active ? `0 0 0 2px ${color}` : 'var(--shadow-md)',
    width: '100%',
    textAlign: 'left' as const,
    fontFamily: 'inherit',
    cursor: onClick ? 'pointer' : 'default',
  };
  const content = (
    <>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.02em', lineHeight: 1 }}>
          {value}
        </div>
        <div style={{ fontSize: 11, color: T.mutedFg, marginTop: 3 }}>{label}</div>
      </div>
    </>
  );
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        style={base}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = active ? `0 0 0 2px ${color}` : 'var(--shadow-md)';
        }}
      >
        {content}
      </button>
    );
  }
  return <div style={base}>{content}</div>;
}

function isOverdueRepair(wo: WorkOrder) {
  // Server-side OVERDUE (written by the cron, or overlaid in real time before
  // the cron catches up) takes precedence; the date check below is just a
  // fallback for the same-day gap in case the response predates either path.
  if (wo.status === 'OVERDUE') return true;
  if (wo.status !== 'PENDING' && wo.status !== 'IN_PROGRESS') return false;
  return new Date(wo.actualDueDate) < new Date();
}

const REPAIR_HISTORY_STATUSES = ['COMPLETED', 'COMPLETED_LATE', 'MISSED', 'SKIPPED', 'CANCELLED'];

// ── Add Vendor Modal (Pattern 2, inline) ──────────────────────────────────────
const INDIAN_STATES = [
  'Andhra Pradesh',
  'Assam',
  'Bihar',
  'Delhi',
  'Gujarat',
  'Haryana',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Punjab',
  'Rajasthan',
  'Tamil Nadu',
  'Telangana',
  'Uttar Pradesh',
  'West Bengal',
];

function _AddVendorModal({
  onClose: _onClose,
  onSuccess: _onSuccess,
}: {
  onClose: () => void;
  onSuccess: (name: string) => void;
}) {
  return null;
}

// ── Process Modal (exact match to reference) ───────────────────────────────────
interface PartRow {
  partId: string;
  partName: string;
  quantity: string;
  hasWarranty: boolean;
  warrantyFromDate: string;
  warrantyToDate: string;
}

function _emptyPartRow(): PartRow {
  return {
    partId: '',
    partName: '',
    quantity: '1',
    hasWarranty: false,
    warrantyFromDate: '',
    warrantyToDate: '',
  };
}
// ── New Repair Task Modal ─────────────────────────────────────────────────────

type RepairFormState = {
  machineId: string;
  machinePartId: string;
  assignedToId: string;
  priority: string;
  description: string;
  expectedCompletionDate: string;
  enableReminder: boolean;
  requireAttachment: boolean;
  givenBy: string;
};

const REPAIR_FORM_EMPTY: RepairFormState = {
  machineId: '',
  machinePartId: '',
  assignedToId: '',
  priority: '2',
  description: '',
  expectedCompletionDate: '',
  enableReminder: false,
  requireAttachment: false,
  givenBy: '',
};

const REPAIR_EDIT_PRIORITY_OPTIONS = [
  { value: '1', label: 'Low' },
  { value: '2', label: 'Medium' },
  { value: '3', label: 'High' },
  { value: '4', label: 'Critical' },
];

function EditSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: T.primary,
        textTransform: 'uppercase' as const,
        letterSpacing: '.08em',
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  );
}

function EditRepairTaskModal({
  workOrder,
  onClose,
  onSaved,
}: {
  workOrder: WorkOrder;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isMobile = useIsMobile();
  const planId = workOrder.plan?.id;
  const { data: planDetail, isLoading: isLoadingPlan } = usePlanDetail(planId ?? '');
  const { data: usersData } = useAssignableUsers();
  const { data: machinesData } = useMachines();
  const updatePlan = useUpdatePlan();
  const users = (usersData as { id: string; name: string }[] | undefined) ?? [];
  const machines =
    (machinesData as { data?: { id: string; name: string; assetCode: string }[] } | undefined)
      ?.data ?? [];
  const [form, setForm] = useState<{
    machineId: string;
    machinePartId: string;
    assignedToId: string;
    priority: string;
    description: string;
    completionDate: string;
    docUrl: string;
    docMediaId: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: partsRes } = useModalMachineParts(form?.machineId || undefined);
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

  useEffect(() => {
    if (planDetail) {
      const start = planDetail.startDate ? new Date(planDetail.startDate) : null;
      setForm({
        machineId: planDetail.machineId,
        machinePartId: planDetail.machinePart?.id ?? '',
        assignedToId: planDetail.assignedToId,
        priority: String(planDetail.priority),
        description: planDetail.description ?? '',
        completionDate: start ? istDateKey(start) : '',
        docUrl: planDetail.documentUrl ?? '',
        docMediaId: planDetail.documentMediaId ?? '',
      });
    }
  }, [planDetail]);

  const parts = (form?.machineId ? (partsRes?.data ?? []) : []) as { id: string; name: string }[];

  const handleDocUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      resetDocError();
      try {
        const result = await uploadDoc(file);
        setForm((p) => (p ? { ...p, docUrl: result.url, docMediaId: result.mediaId } : p));
      } catch (_e) {}
    },
    [uploadDoc, resetDocError]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planId || !form) return;
    if (!form.assignedToId) return setError('Please select an assignee');
    if (!form.machineId) return setError('Please select a machine');
    if (!form.completionDate) return setError('Expected completion date is required');
    try {
      await updatePlan.mutateAsync({
        id: planId,
        data: {
          machineId: form.machineId,
          machinePartId: form.machinePartId || null,
          assignedToId: form.assignedToId,
          priority: Number.parseInt(form.priority, 10),
          description: form.description.trim() || undefined,
          startDate: `${form.completionDate}T00:00:00`,
          documentUrl: form.docUrl,
          documentMediaId: form.docMediaId,
          editScope: 'FUTURE',
        },
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to update task'
      );
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        zIndex: 9600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? 12 : 24,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: T.card,
          borderRadius: 16,
          maxWidth: 560,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          fontFamily: T.font,
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Accent bar */}
        <div style={{ height: 5, width: '100%', background: T.primary, flexShrink: 0 }} />

        <div style={{ padding: isMobile ? '18px 16px' : '22px 28px', overflowY: 'auto' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 12,
              marginBottom: 20,
            }}
          >
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', minWidth: 0 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: T.primaryBg,
                  color: T.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {RIco.edit(20)}
              </div>
              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    fontSize: 11,
                    color: T.mutedFg,
                    margin: '0 0 4px',
                    textTransform: 'uppercase' as const,
                    letterSpacing: '.06em',
                    fontWeight: 700,
                  }}
                >
                  Edit Repair Task
                </p>
                <h2
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    color: T.fg,
                    margin: 0,
                    lineHeight: 1.3,
                    wordBreak: 'break-word',
                  }}
                >
                  {workOrder.plan?.title ??
                    (workOrder.workOrderCode
                      ? `WO ${workOrder.workOrderCode}`
                      : `Work Order #${workOrder.id.slice(-6)}`)}
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: T.muted,
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                width: 30,
                height: 30,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: T.mutedFg,
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>

          {isLoadingPlan || !form ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: T.mutedFg, fontSize: 13 }}>
              Loading task…
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <div
                  style={{
                    background: T.warningBg,
                    border: `1px solid ${T.warning}`,
                    borderRadius: 10,
                    padding: '10px 14px',
                    marginBottom: 16,
                    fontSize: 13,
                    color: T.fg,
                  }}
                >
                  {error}
                </div>
              )}

              {/* Task Info */}
              <div style={{ marginBottom: 20 }}>
                <EditSectionLabel>Task Info</EditSectionLabel>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                    gap: 14,
                    background: T.muted,
                    borderRadius: 10,
                    padding: '14px 16px',
                  }}
                >
                  <div>
                    <RLabel htmlFor="edit-assignedToId" required>
                      Assigned To
                    </RLabel>
                    <RSelect
                      id="edit-assignedToId"
                      value={form.assignedToId}
                      onChange={(v) => setForm((p) => (p ? { ...p, assignedToId: v } : p))}
                      options={users.map((u) => ({ value: u.id, label: u.name }))}
                      placeholder="Select Technician"
                    />
                  </div>
                  <div>
                    <RLabel htmlFor="edit-priority">Priority</RLabel>
                    <RSelect
                      id="edit-priority"
                      value={form.priority}
                      onChange={(v) => setForm((p) => (p ? { ...p, priority: v } : p))}
                      options={REPAIR_EDIT_PRIORITY_OPTIONS}
                    />
                  </div>
                  <div>
                    <RLabel htmlFor="edit-completionDate" required>
                      Expected Completion Date
                    </RLabel>
                    <RInput
                      id="edit-completionDate"
                      type="date"
                      value={form.completionDate}
                      onChange={(e) =>
                        setForm((p) => (p ? { ...p, completionDate: e.target.value } : p))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Machine */}
              <div style={{ marginBottom: 20 }}>
                <EditSectionLabel>Machine</EditSectionLabel>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                    gap: 14,
                    background: T.muted,
                    borderRadius: 10,
                    padding: '14px 16px',
                  }}
                >
                  <div>
                    <RLabel htmlFor="edit-machineId" required>
                      Machine
                    </RLabel>
                    <RSelect
                      id="edit-machineId"
                      value={form.machineId}
                      onChange={(v) =>
                        setForm((p) => (p ? { ...p, machineId: v, machinePartId: '' } : p))
                      }
                      options={machines.map((m) => ({
                        value: m.id,
                        label: `${m.name} (${m.assetCode})`,
                      }))}
                      placeholder="Select Machine"
                    />
                  </div>
                  <div>
                    <RLabel htmlFor="edit-machinePartId">Machine Part</RLabel>
                    <RSelect
                      id="edit-machinePartId"
                      value={form.machinePartId}
                      onChange={(v) => setForm((p) => (p ? { ...p, machinePartId: v } : p))}
                      options={parts.map((p) => ({ value: p.id, label: p.name }))}
                      placeholder="Select Part"
                      disabled={!form.machineId}
                    />
                  </div>
                </div>
              </div>

              {/* Issue Details */}
              <div style={{ marginBottom: 20 }}>
                <EditSectionLabel>Issue Details</EditSectionLabel>
                <textarea
                  id="edit-description"
                  value={form.description}
                  onChange={(e) => setForm((p) => (p ? { ...p, description: e.target.value } : p))}
                  rows={3}
                  style={{
                    width: '100%',
                    background: T.muted,
                    border: `1px solid ${T.border}`,
                    borderRadius: 10,
                    padding: '10px 12px',
                    fontSize: 13,
                    color: T.fg,
                    fontFamily: 'inherit',
                    outline: 'none',
                    resize: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Attachment */}
              <div style={{ marginBottom: 20 }}>
                <EditSectionLabel>Attachment</EditSectionLabel>
                {form.docUrl ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      background: T.muted,
                      border: `1px solid ${T.success}`,
                      borderRadius: 10,
                      padding: '10px 14px',
                    }}
                  >
                    📄
                    <a
                      href={form.docUrl}
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
                      View current document
                    </a>
                    <button
                      type="button"
                      onClick={() => setForm((p) => (p ? { ...p, docUrl: '', docMediaId: '' } : p))}
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
                      ✕
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="edit-repair-document"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: T.muted,
                      border: `1px dashed ${isDocUploading ? T.primary : T.border}`,
                      borderRadius: 10,
                      padding: '12px 16px',
                      cursor: isDocUploading ? 'not-allowed' : 'pointer',
                      fontSize: 13,
                      color: isDocUploading ? T.primary : T.mutedFg,
                      transition: 'all .15s',
                    }}
                  >
                    📄{' '}
                    {isDocUploading ? `Uploading… ${docProgress}%` : 'Click to upload PDF or image'}
                    <input
                      id="edit-repair-document"
                      type="file"
                      accept="application/pdf,image/jpeg,image/png,image/webp"
                      style={{ display: 'none' }}
                      disabled={isDocUploading}
                      onChange={handleDocUpload}
                    />
                  </label>
                )}
                {docUploadError && (
                  <div style={{ fontSize: 12, color: T.danger, marginTop: 4 }}>
                    {docUploadError}
                  </div>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 10,
                  paddingTop: 16,
                  borderTop: `1px solid ${T.border}`,
                }}
              >
                <button
                  type="button"
                  onClick={onClose}
                  disabled={updatePlan.isPending}
                  style={{
                    padding: '9px 16px',
                    borderRadius: 10,
                    border: `1px solid ${T.border}`,
                    background: 'transparent',
                    color: T.fg,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: updatePlan.isPending ? 'not-allowed' : 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatePlan.isPending}
                  style={{
                    padding: '9px 16px',
                    borderRadius: 10,
                    border: 'none',
                    background: T.primary,
                    color: T.primaryFg,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: updatePlan.isPending ? 'not-allowed' : 'pointer',
                  }}
                >
                  {updatePlan.isPending ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
// ── Main Component ─────────────────────────────────────────────────────────────
export default function MainRepairTasks() {
  const requireCompanySelected = useRequireCompanySelected();
  const isMobile = useIsMobile();
  const currentUser = useAppSelector(selectUser);
  const orgViewMode = useAppSelector(selectOrgViewMode);
  // "New Repair Task" — picks a company first when merged, instead of the
  // blanket "leave All Companies mode" block (see useRequireCompanySelected).
  const { pinnedCompany, selectCompany, reset: resetPinnedCompany } = useCompanyPinForCreate();
  const isAdmin =
    (currentUser as { role?: string } | null)?.role === 'ADMIN' ||
    (currentUser as { role?: string } | null)?.role === 'SUPERADMIN';
  const [viewMyTasksOnly, setViewMyTasksOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [givenByFilter, setGivenByFilter] = useState('');
  const [firmFilter, setFirmFilter] = useState('');

  const { effectivePermittedFirms } = useProject();

  const { data: firmsResponse } = useQuery({
    queryKey: ['repair', 'firms', 'list'],
    queryFn: () => api.get('/maintenance/firms'),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
  const rawFirms: { id: string; name: string }[] = firmsResponse?.data?.data ?? [];
  const firms: { id: string; name: string }[] = useMemo(() => {
    return filterByFirmAccess(rawFirms, effectivePermittedFirms);
  }, [rawFirms, effectivePermittedFirms]);

  const { page, setPage } = usePagination(20);
  // Page 2 of "All" isn't meaningful once you've switched to a different bucket.
  const selectStatusFilter = useCallback(
    (next: string) => {
      setStatusFilter(next);
      setPage(1);
    },
    [setPage]
  );
  const [processWo, setProcessWo] = useState<WorkOrder | null>(null);
  const [viewWo, setViewWo] = useState<WorkOrder | null>(null);
  const [editWo, setEditWo] = useState<WorkOrder | null>(null);
  const [deleteWo, setDeleteWo] = useState<WorkOrder | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // New Repair Task modal
  const [showRepairModal, setShowRepairModal] = useState(false);
  const [repairForm, setRepairForm] = useState<RepairFormState>(REPAIR_FORM_EMPTY);
  const [repairError, setRepairError] = useState<string | null>(null);
  const [repairSuccess, setRepairSuccess] = useState<string | null>(null);

  // Document upload for modal
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

  const limit = 20;

  const dateParams = {
    ...(startDate && { from: startDate }),
    ...(endDate && { to: endDate }),
    ...(assigneeFilter && { assigneeId: assigneeFilter }),
    ...(givenByFilter && { givenBy: givenByFilter }),
    ...(isAdmin && viewMyTasksOnly && { view: 'personal' as const }),
    // Merged from two independently-paginated sources (active + history), so a
    // real per-page server fetch isn't possible here — search is still applied
    // server-side, but pagination stays client-side over the combined batch below.
    search: searchTerm.trim() || undefined,
    limit: 100,
  };

  const {
    data: activeData,
    isLoading: activeLoading,
    refetch: refetchActive,
  } = useRepairWorkOrders(dateParams);
  const {
    data: historyData,
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = useRepairHistoryWorkOrders(dateParams);

  const isLoading = activeLoading || historyLoading;
  const refetch = useCallback(() => {
    refetchActive();
    refetchHistory();
  }, [refetchActive, refetchHistory]);

  // Hooks for New Repair Task modal — pinnedCompany?.id scopes each dropdown
  // to the picked company once one is chosen while merged; undefined (single
  // company, or not yet picked) leaves every one of these byte-identical to
  // before.
  const { data: machinesData } = useMachines(undefined, pinnedCompany?.id);
  const { data: usersData } = useAssignableUsers(pinnedCompany?.id);
  const { data: repairPartsRes } = useModalMachineParts(
    repairForm.machineId || undefined,
    pinnedCompany?.id
  );
  const { data: activityTypesData } = useActivityTypes(pinnedCompany?.id);
  const createPlan = useCreatePlan();
  const { data: profileRaw } = useGetProfileQuery();
  const repairActivityTypeId =
    (activityTypesData ?? []).find((t) => t.code === 'REPAIR' || t.name?.toLowerCase() === 'repair')?.id ??
    (activityTypesData ?? [])[0]?.id;
  const modalMachines =
    (machinesData as { data?: { id: string; name: string; assetCode: string }[] } | undefined)
      ?.data ?? [];
  const modalUsers = (usersData as { id: string; name: string }[] | undefined) ?? [];
  const modalParts = repairForm.machineId
    ? ((repairPartsRes?.data ?? []) as { id: string; name: string }[])
    : [];
  const modalMachine = modalMachines.find((m) => m.id === repairForm.machineId);
  const modalProfile = profileRaw?.data;

  useEffect(() => {
    if (modalProfile?.name)
      setRepairForm((p) => ({ ...p, givenBy: String(modalProfile.name ?? '') }));
  }, [modalProfile?.name]);

  const setR = useCallback(<K extends keyof RepairFormState>(k: K, v: RepairFormState[K]) => {
    setRepairForm((p) => ({ ...p, [k]: v }));
    setRepairError(null);
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

  const closeRepairModal = useCallback(() => {
    setShowRepairModal(false);
    setRepairForm(REPAIR_FORM_EMPTY);
    setDocUrl('');
    setDocMediaId('');
    setDocName('');
    setRepairError(null);
    setRepairSuccess(null);
    resetPinnedCompany();
  }, [resetPinnedCompany]);

  const handleRepairSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!repairForm.machineId) return setRepairError('Please select a machine');
      if (!repairForm.assignedToId) return setRepairError('Please select a technician to assign');
      if (!repairForm.expectedCompletionDate)
        return setRepairError('Expected completion date is required');
      try {
        const autoTitle = `Repair – ${modalMachine?.name ?? 'Task'}`;
        await createPlan.mutateAsync({
          machineId: repairForm.machineId,
          assignedToId: repairForm.assignedToId,
          title: autoTitle,
          description: repairForm.description.trim() || undefined,
          activityTypeId: repairActivityTypeId || undefined,
          machinePartId: repairForm.machinePartId || undefined,
          frequency: 'ONE_TIME',
          startDate: repairForm.expectedCompletionDate,
          priority: Number.parseInt(repairForm.priority, 10),
          scheduleConfig: { specificDates: [repairForm.expectedCompletionDate] },
          documentUrl: docUrl || undefined,
          documentMediaId: docMediaId || undefined,
          actAsTenantId: pinnedCompany?.id,
          isRepair: true,
        });
        setRepairSuccess('Repair task assigned successfully!');
        refetch();
        setRepairForm(REPAIR_FORM_EMPTY);
        setDocUrl('');
        setDocMediaId('');
        setDocName('');
        setTimeout(() => {
          setRepairSuccess(null);
          setShowRepairModal(false);
          resetPinnedCompany();
        }, 1500);
      } catch (err) {
        setRepairError(
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            'Failed to assign repair task'
        );
      }
    },
    [
      repairForm,
      modalMachine,
      createPlan,
      docMediaId,
      docUrl,
      repairActivityTypeId,
      pinnedCompany,
      resetPinnedCompany,
      refetch,
    ]
  );

  const allOrders: WorkOrder[] = useMemo(() => {
    // activeData and historyData are independently cached/refetched queries —
    // right after a repair transitions between them (e.g. marked Completed),
    // one can still hold a momentarily-stale snapshot of a work order the
    // other has already refetched fresh, so the SAME id briefly appears in
    // both lists with different field values (stale Pending + fresh
    // Completed). A plain concat renders both, producing a duplicate React
    // key and a visibly duplicated row. De-dupe by id here — history is
    // listed second, so `Map` naturally keeps its entry as the more
    // "resolved"/authoritative snapshot when both are present.
    const merged = [
      ...((activeData as { data?: WorkOrder[] } | undefined)?.data ?? []),
      ...((historyData as { data?: WorkOrder[] } | undefined)?.data ?? []),
    ];
    const deduped = Array.from(new Map(merged.map((wo) => [wo.id, wo])).values());
    return filterByFirmAccess(deduped, effectivePermittedFirms);
  }, [activeData, historyData, effectivePermittedFirms]);

  const stats = useMemo(
    () => ({
      total: allOrders.length,
      pending: allOrders.filter((w) => w.status === 'PENDING' || w.status === 'IN_PROGRESS').length,
      completed: allOrders.filter((w) => w.status === 'COMPLETED' || w.status === 'COMPLETED_LATE')
        .length,
      overdue: allOrders.filter(isOverdueRepair).length,
      history: allOrders.filter((w) => REPAIR_HISTORY_STATUSES.includes(w.status)).length,
    }),
    [allOrders]
  );

  // search is already applied server-side (see dateParams above) — status stays
  // client-side since HISTORY/OVERDUE/PENDING/COMPLETED are derived buckets, not
  // single backend fields.
  const filtered = useMemo(() => {
    return allOrders.filter((wo) => {
      if (firmFilter) {
        const matchesFirm =
          String(wo.machine?.firmId) === firmFilter ||
          wo.machine?.firm?.name === firmFilter ||
          wo.machine?.firmName === firmFilter;
        if (!matchesFirm) return false;
      }
      const matchStatus =
        statusFilter === 'All'
          ? true
          : statusFilter === 'HISTORY'
            ? REPAIR_HISTORY_STATUSES.includes(wo.status)
            : statusFilter === 'OVERDUE'
              ? isOverdueRepair(wo)
              : statusFilter === 'PENDING'
                ? wo.status === 'PENDING' || wo.status === 'IN_PROGRESS'
                : statusFilter === 'COMPLETED'
                  ? wo.status === 'COMPLETED' || wo.status === 'COMPLETED_LATE'
                  : wo.status === statusFilter;
      return matchStatus;
    });
  }, [allOrders, statusFilter, firmFilter]);

  const paginated = useMemo(() => {
    const start = (page - 1) * limit;
    return filtered.slice(start, start + limit);
  }, [filtered, page]);

  const totalPages = Math.ceil(filtered.length / limit);

  // Only true when the backend merged this list across companies (see
  // WorkOrderController) — `tenant` is absent for every individual company
  // and every single-company session, so this table stays byte-identical to
  // before for them.
  const hasTenantColumn = filtered.some((wo) => wo.tenant);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const deleteWorkOrderMutation = useDeleteWorkOrder();

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteWo) return;
    try {
      await deleteWorkOrderMutation.mutateAsync(deleteWo.id);
      showToast('Task deleted successfully');
      setDeleteWo(null);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to delete task';
      showToast(msg);
    }
  }, [deleteWo, deleteWorkOrderMutation, showToast]);

  const exportCsv = useCallback(() => {
    const headers = [
      'Work Order ID',
      ...(hasTenantColumn ? ['Company'] : []),
      'Machine',
      'Project (Firm)',
      'Activity Type',
      'Task',
      'Frequency',
      'Given By',
      'Assigned To',
      'Vendor',
      'Bill Amount',
      'Date',
      'Status',
    ];
    const rows = filtered.map((wo) => {
      const rp = getRepairProcess(wo);
      return [
        wo.workOrderCode || wo.id.slice(-6),
        ...(hasTenantColumn ? [wo.tenant?.name ?? ''] : []),
        wo.machine?.name ?? '',
        wo.machine?.firm?.name || wo.machine?.firmName || '',
        wo.plan?.activityType?.name ?? '',
        wo.plan?.title ?? '',
        wo.plan?.frequency
          ? (PLAN_FREQUENCY_LABELS[wo.plan.frequency as PlanFrequency] ?? wo.plan.frequency)
          : '',
        wo.plan?.createdBy?.name ?? '',
        wo.currentAssignee?.name ?? '',
        rp?.parts?.[0]?.vendorName ?? '',
        rp?.maintenanceCost != null ? `₹${rp.maintenanceCost}` : '',
        fmtDate(wo.createdAt),
        'In Progress',
      ];
    });
    const csv = [
      headers.join(','),
      ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `repair_tasks_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered, hasTenantColumn]);

  return (
    <div
      style={{
        padding: isMobile ? '14px 16px' : '24px 32px',
        fontFamily: T.font,
        background: T.bg,
        color: T.fg,
        width: '100%',
        borderRadius: 16,
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          flexWrap: 'wrap',
          alignItems: isMobile ? 'stretch' : 'flex-start',
          justifyContent: 'space-between',
          gap: 14,
          marginBottom: 24,
        }}
      >
        <div>
          <p style={{ fontSize: 12, color: T.mutedFg, marginBottom: 4 }}>Maintenance</p>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: '-.03em',
              margin: 0,
              color: T.fg,
            }}
          >
            Repair Tasks
          </h1>
          <p style={{ fontSize: 13, color: T.mutedFg, marginTop: 4 }}>
            Process and manage repair tasks · {filtered.length} tasks shown
          </p>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
            width: isMobile ? '100%' : 'auto',
          }}
        >
          {isAdmin && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: T.muted,
                borderRadius: 10,
                padding: 4,
              }}
            >
              {[
                { label: '✨ All Tasks', value: false },
                { label: '👤 My Tasks', value: true },
              ].map(({ label, value }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setViewMyTasksOnly(value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 7,
                    border: 'none',
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    background: viewMyTasksOnly === value ? T.card : 'transparent',
                    color: viewMyTasksOnly === value ? T.fg : T.mutedFg,
                    boxShadow: viewMyTasksOnly === value ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
                    transition: 'all .15s',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <Btn variant="ghost" size="sm" onClick={() => refetch()}>
            ↻ Refresh
          </Btn>
          <Btn variant="outline" onClick={exportCsv}>
            ↓ Export
          </Btn>
          <Btn
            onClick={() => {
              setRepairForm({ ...REPAIR_FORM_EMPTY, givenBy: String(modalProfile?.name ?? '') });
              setDocUrl('');
              setDocMediaId('');
              setDocName('');
              setRepairError(null);
              setRepairSuccess(null);
              resetPinnedCompany();
              setShowRepairModal(true);
            }}
          >
            + New Repair Task
          </Btn>
        </div>
      </div>

      {/* ── Summary stats ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <StatCard
          label="Total Tasks"
          value={stats.total}
          color={T.primary}
          bg={T.primaryBg}
          icon={'🔧'}
          active={statusFilter === 'All'}
          onClick={() => selectStatusFilter('All')}
        />
        <StatCard
          label="Pending"
          value={stats.pending}
          color={T.warning}
          bg={T.warningBg}
          icon={'⏳'}
          active={statusFilter === 'PENDING'}
          onClick={() => selectStatusFilter(statusFilter === 'PENDING' ? 'All' : 'PENDING')}
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          color={T.success}
          bg={T.successBg}
          icon={'✓'}
          active={statusFilter === 'COMPLETED'}
          onClick={() => selectStatusFilter(statusFilter === 'COMPLETED' ? 'All' : 'COMPLETED')}
        />
        <StatCard
          label="Overdue"
          value={stats.overdue}
          color={T.danger}
          bg={T.dangerBg}
          icon={'⏰'}
          active={statusFilter === 'OVERDUE'}
          onClick={() => selectStatusFilter(statusFilter === 'OVERDUE' ? 'All' : 'OVERDUE')}
        />
        <StatCard
          label="History"
          value={stats.history}
          color={T.info}
          bg={T.infoBg}
          icon={'🗂️'}
          active={statusFilter === 'HISTORY'}
          onClick={() => selectStatusFilter(statusFilter === 'HISTORY' ? 'All' : 'HISTORY')}
        />
      </div>

      {/* ── Search + Filters ── */}
      <div
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 12,
          padding: isMobile ? '12px 14px' : '14px 20px',
          marginBottom: 20,
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Search */}
          <div
            style={{
              flex: 1,
              minWidth: isMobile ? '100%' : 220,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                position: 'absolute',
                left: 12,
                color: T.mutedFg,
                pointerEvents: 'none',
                fontSize: 14,
              }}
            >
              🔍
            </span>
            <TextInput
              placeholder="Search by machine, task, or person…"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              style={{ width: '100%', paddingLeft: 36 }}
            />
          </div>
          <div
            style={{
              width: 1,
              height: 28,
              background: T.border,
              display: isMobile ? 'none' : 'block',
            }}
          />
          {/* Date range */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: T.mutedFg, fontWeight: 600 }}>Due</span>
            <TextInput
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              title="Start date"
              style={{ fontSize: 12, width: isMobile ? '100%' : 140 }}
            />
            <span style={{ fontSize: 12, color: T.mutedFg }}>to</span>
            <TextInput
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              title="End date"
              style={{ fontSize: 12, width: isMobile ? '100%' : 140 }}
            />
          </div>
          {/* Assignee / Given By */}
          <div style={{ width: isMobile ? '100%' : 150 }}>
            <RSelect
              id="repair-filter-assignee"
              value={assigneeFilter}
              onChange={(v) => {
                setAssigneeFilter(v);
                setPage(1);
              }}
              placeholder="All Assignees"
              options={modalUsers.map((u) => ({ value: u.id, label: u.name }))}
            />
          </div>
          <div style={{ width: isMobile ? '100%' : 150 }}>
            <RSelect
              id="repair-filter-given-by"
              value={givenByFilter}
              onChange={(v) => {
                setGivenByFilter(v);
                setPage(1);
              }}
              placeholder="Given By: All"
              options={modalUsers.map((u) => ({ value: u.id, label: u.name }))}
            />
          </div>
          <div style={{ width: isMobile ? '100%' : 160 }}>
            <RSelect
              id="repair-filter-firm"
              value={firmFilter}
              onChange={(v) => {
                setFirmFilter(v);
                setPage(1);
              }}
              placeholder="All Projects (Firms)"
              options={firms.map((f) => ({ value: String(f.id), label: f.name }))}
            />
          </div>
          {(searchTerm ||
            startDate ||
            endDate ||
            assigneeFilter ||
            givenByFilter ||
            firmFilter ||
            statusFilter !== 'All') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setStartDate('');
                setEndDate('');
                setAssigneeFilter('');
                setGivenByFilter('');
                setFirmFilter('');
                setStatusFilter('All');
                setPage(1);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 12,
                color: T.danger,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontWeight: 600,
              }}
            >
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 14,
          overflow: 'hidden',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        {isLoading ? (
          <div style={{ padding: '56px 0', textAlign: 'center', color: T.mutedFg, fontSize: 14 }}>
            Loading…
          </div>
        ) : paginated.length === 0 ? (
          <div style={{ padding: '56px 0', textAlign: 'center', color: T.mutedFg }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>🔧</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {searchTerm ||
              startDate ||
              endDate ||
              assigneeFilter ||
              givenByFilter ||
              statusFilter !== 'All'
                ? 'No tasks match your filters'
                : 'No repair tasks yet'}
            </div>
            <div style={{ fontSize: 12, marginTop: 4 }}>
              {searchTerm ||
              startDate ||
              endDate ||
              assigneeFilter ||
              givenByFilter ||
              statusFilter !== 'All'
                ? 'Try adjusting your search or filters.'
                : 'Tasks marked for repair in Schedule Maintenance appear here.'}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: T.muted, borderBottom: `1px solid ${T.border}` }}>
                  {[
                    'Action',
                    ...(hasTenantColumn ? ['Company'] : []),
                    'Work Order ID',
                    'Machine',
                    'Project (Firm)',
                    'Machine Part',
                    'Activity Type',
                    'Task',
                    'Description',
                    'Frequency',
                    'Requested By',
                    'Assigned To',
                    'Vendor',
                    'Bill Amount',
                    'Date',
                    'Status',
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '11px 14px',
                        textAlign: 'left',
                        fontSize: 10,
                        fontWeight: 700,
                        color: T.mutedFg,
                        textTransform: 'uppercase' as const,
                        letterSpacing: '.06em',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((wo) => {
                  const rp = getRepairProcess(wo);
                  return (
                    <tr
                      key={wo.id}
                      style={{
                        borderBottom: `1px solid ${T.border}`,
                        transition: 'background .12s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = `color-mix(in oklch, ${T.primary} 4%, ${T.card})`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {/* Action — first column */}
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button
                            type="button"
                            title="View details"
                            onClick={() => setViewWo(wo)}
                            style={{
                              width: 32,
                              height: 32,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: T.primaryBg,
                              color: T.primary,
                              border: `1px solid ${T.primary}`,
                              borderRadius: 7,
                              fontSize: 14,
                              cursor: 'pointer',
                            }}
                          >
                            {RIco.eye(14)}
                          </button>
                          {wo.status !== 'CANCELLED' && (
                            <button
                              type="button"
                              title={
                                wo.status === 'COMPLETED' || wo.status === 'COMPLETED_LATE'
                                  ? 'Edit repair process'
                                  : 'Process repair'
                              }
                              disabled={wo.status === 'PENDING_APPROVAL'}
                              onClick={() => {
                                if (!requireCompanySelected()) return;
                                setProcessWo(wo);
                              }}
                              style={{
                                width: 32,
                                height: 32,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background:
                                  wo.status === 'PENDING_APPROVAL'
                                    ? T.muted
                                    : wo.status === 'COMPLETED' || wo.status === 'COMPLETED_LATE'
                                      ? 'color-mix(in oklch, #2563eb 15%, transparent)'
                                      : '#2563eb',
                                color:
                                  wo.status === 'PENDING_APPROVAL'
                                    ? T.mutedFg
                                    : wo.status === 'COMPLETED' || wo.status === 'COMPLETED_LATE'
                                      ? '#2563eb'
                                      : '#fff',
                                border:
                                  wo.status === 'COMPLETED' || wo.status === 'COMPLETED_LATE'
                                    ? '1px solid #2563eb'
                                    : 'none',
                                borderRadius: 7,
                                fontSize: 14,
                                cursor:
                                  wo.status === 'PENDING_APPROVAL' ? 'not-allowed' : 'pointer',
                                opacity: wo.status === 'PENDING_APPROVAL' ? 0.5 : 1,
                              }}
                            >
                              {RIco.wrench(14)}
                            </button>
                          )}
                          {/* A recurring plan's "completion date" here is really its
                              original start date, not a movable deadline — editing it
                              doesn't make sense for anything but a genuine one-time
                              task. Most repair tasks are ONE_TIME already, but a
                              recurring plan tagged with a Repair activity type can
                              still show up in this list via the repair filter. */}
                          {isAdmin && wo.plan?.id && wo.plan?.frequency === 'ONE_TIME' && (
                            <button
                              type="button"
                              title="Edit Task"
                              onClick={() => setEditWo(wo)}
                              style={{
                                width: 32,
                                height: 32,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: T.muted,
                                color: T.mutedFg,
                                border: `1px solid ${T.border}`,
                                borderRadius: 7,
                                fontSize: 14,
                                cursor: 'pointer',
                                transition: 'all .15s',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = T.infoBg;
                                e.currentTarget.style.color = T.info;
                                e.currentTarget.style.borderColor = T.info;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = T.muted;
                                e.currentTarget.style.color = T.mutedFg;
                                e.currentTarget.style.borderColor = T.border;
                              }}
                            >
                              {RIco.edit(14)}
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              type="button"
                              title="Delete Task"
                              onClick={() => setDeleteWo(wo)}
                              style={{
                                width: 32,
                                height: 32,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: T.muted,
                                color: T.mutedFg,
                                border: `1px solid ${T.border}`,
                                borderRadius: 7,
                                fontSize: 14,
                                cursor: 'pointer',
                                transition: 'all .15s',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = T.dangerBg;
                                e.currentTarget.style.color = T.danger;
                                e.currentTarget.style.borderColor = T.danger;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = T.muted;
                                e.currentTarget.style.color = T.mutedFg;
                                e.currentTarget.style.borderColor = T.border;
                              }}
                            >
                              {RIco.trash(14)}
                            </button>
                          )}
                        </div>
                      </td>
                      {hasTenantColumn && (
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          {wo.tenant ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '3px 9px',
                                borderRadius: 999,
                                fontSize: 11,
                                fontWeight: 600,
                                color: T.info,
                                background: T.infoBg,
                              }}
                            >
                              {wo.tenant.name}
                            </span>
                          ) : (
                            <span style={{ fontSize: 12, color: T.mutedFg }}>—</span>
                          )}
                        </td>
                      )}
                      <td
                        style={{
                          padding: '12px 14px',
                          fontFamily: 'monospace',
                          fontSize: 11,
                          fontWeight: 600,
                          color: T.mutedFg,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {wo.workOrderCode || (wo.id ? `WO-${wo.id.slice(-6).toUpperCase()}` : '—')}
                      </td>
                      <td style={{ padding: '12px 14px', color: T.fg, whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600 }}>{wo.machine?.name ?? '-'}</div>
                        {wo.machine?.assetCode && (
                          <div style={{ fontSize: 10, color: T.mutedFg, fontFamily: 'monospace' }}>
                            {wo.machine.assetCode}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', color: T.fg, whiteSpace: 'nowrap', fontSize: 12 }}>
                        {wo.machine?.firm?.name || wo.machine?.firmName || '—'}
                      </td>
                      <td
                        style={{
                          padding: '12px 14px',
                          color: T.fg,
                          whiteSpace: 'nowrap',
                          fontSize: 12,
                        }}
                      >
                        {(wo.machinePart ?? wo.plan?.machinePart)?.name ?? '—'}
                      </td>
                      <td
                        style={{
                          padding: '12px 14px',
                          color: T.fg,
                          whiteSpace: 'nowrap',
                          fontSize: 11,
                        }}
                      >
                        {wo.plan?.activityType?.name ?? '-'}
                      </td>
                      <td style={{ padding: '12px 14px', color: T.fg, maxWidth: 200 }}>
                        <div
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {wo.plan?.title ?? '-'}
                        </div>
                        {wo.completionNote && (
                          <div
                            style={{
                              fontSize: 11,
                              color: T.mutedFg,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: 180,
                            }}
                          >
                            {wo.completionNote}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', color: T.mutedFg, maxWidth: 200 }}>
                        {wo.plan?.description ? (
                          <div
                            title={wo.plan.description}
                            style={{
                              fontSize: 12,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {truncate(wo.plan.description, 60)}
                          </div>
                        ) : (
                          <span style={{ fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        {wo.plan?.frequency ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              fontSize: 11,
                              fontWeight: 600,
                              color: T.primary,
                              background: T.primaryBg,
                              border: `1px solid ${T.primary}`,
                              borderRadius: 6,
                              padding: '3px 8px',
                            }}
                          >
                            {PLAN_FREQUENCY_LABELS[wo.plan.frequency as PlanFrequency] ??
                              wo.plan.frequency}
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: T.mutedFg }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', color: T.fg, whiteSpace: 'nowrap' }}>
                        {wo.plan?.createdBy?.name ?? '-'}
                      </td>
                      <td style={{ padding: '12px 14px', color: T.fg, whiteSpace: 'nowrap' }}>
                        {wo.currentAssignee?.name ?? '-'}
                      </td>
                      <td style={{ padding: '12px 14px', color: T.fg, whiteSpace: 'nowrap' }}>
                        {((rp?.parts ?? (wo as any).repairParts ?? [])
                          .map((p: any) => p.vendorName)
                          .filter(Boolean)
                          .join(', ')) ||
                          rp?.vendorName ||
                          (wo as any).vendorName ||
                          '-'}
                      </td>
                      <td
                        style={{
                          padding: '12px 14px',
                          fontWeight: 600,
                          color: T.fg,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {(rp?.maintenanceCost ?? rp?.billAmount ?? (wo as any).cost) != null
                          ? `₹${rp?.maintenanceCost ?? rp?.billAmount ?? (wo as any).cost}`
                          : '-'}
                      </td>
                      <td style={{ padding: '12px 14px', color: T.mutedFg, whiteSpace: 'nowrap' }}>
                        {fmtDate(wo.createdAt)}
                      </td>
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <StatusBadge status={wo.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'stretch' : 'center',
              justifyContent: 'space-between',
              gap: 10,
              padding: isMobile ? '12px 14px' : '12px 16px',
              borderTop: `1px solid ${T.border}`,
            }}
          >
            <span style={{ fontSize: 12, color: T.mutedFg }}>
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, filtered.length)} of{' '}
              {filtered.length}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                style={{
                  padding: '6px 10px',
                  background: T.muted,
                  border: `1px solid ${T.border}`,
                  borderRadius: 7,
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                  opacity: page === 1 ? 0.5 : 1,
                  fontSize: 14,
                  color: T.fg,
                  fontFamily: 'inherit',
                }}
              >
                ‹
              </button>
              <span style={{ fontSize: 12, color: T.fg, fontWeight: 500 }}>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                style={{
                  padding: '6px 10px',
                  background: T.muted,
                  border: `1px solid ${T.border}`,
                  borderRadius: 7,
                  cursor: page === totalPages ? 'not-allowed' : 'pointer',
                  opacity: page === totalPages ? 0.5 : 1,
                  fontSize: 14,
                  color: T.fg,
                  fontFamily: 'inherit',
                }}
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Modal */}
      {viewWo && <ViewModal wo={viewWo} onClose={() => setViewWo(null)} />}

      {/* Edit Task Modal */}
      {editWo && (
        <EditRepairTaskModal
          workOrder={editWo}
          onClose={() => setEditWo(null)}
          onSaved={() => {
            refetch();
            showToast('Task updated successfully');
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteWo && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            zIndex: 9700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isMobile ? 12 : 24,
          }}
          onClick={() => !deleteWorkOrderMutation.isPending && setDeleteWo(null)}
        >
          <div
            style={{
              background: T.card,
              borderRadius: 14,
              padding: isMobile ? '18px 16px' : '22px 26px',
              maxWidth: 420,
              width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              fontFamily: T.font,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 16 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: T.dangerBg,
                  color: T.danger,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {RIco.trash(18)}
              </div>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: T.fg, margin: '0 0 4px' }}>
                  Delete Task
                </h2>
                <p style={{ fontSize: 13, color: T.mutedFg, margin: 0, lineHeight: 1.5 }}>
                  Are you sure you want to delete{' '}
                  <strong style={{ color: T.fg }}>
                    {deleteWo.plan?.title ??
                      (deleteWo.workOrderCode
                        ? `WO ${deleteWo.workOrderCode}`
                        : `Work Order #${deleteWo.id.slice(-6)}`)}
                  </strong>
                  ? It will be removed from all views and excluded from cost calculations. This
                  cannot be undone from here.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setDeleteWo(null)}
                disabled={deleteWorkOrderMutation.isPending}
                style={{
                  padding: '9px 16px',
                  borderRadius: 10,
                  border: `1px solid ${T.border}`,
                  background: 'transparent',
                  color: T.fg,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: deleteWorkOrderMutation.isPending ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleteWorkOrderMutation.isPending}
                style={{
                  padding: '9px 16px',
                  borderRadius: 10,
                  border: 'none',
                  background: T.danger,
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: deleteWorkOrderMutation.isPending ? 'not-allowed' : 'pointer',
                }}
              >
                {deleteWorkOrderMutation.isPending ? 'Deleting…' : 'Delete Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Process Modal */}
      {processWo && (
        <ProcessModal
          wo={processWo}
          onClose={() => setProcessWo(null)}
          onSuccess={() => {
            showToast('Repair processed successfully');
            // The mutation's own invalidateQueries marks both the active and
            // history queries stale, but that alone doesn't guarantee they
            // refetch and settle together — explicitly kick off both here so
            // the transition between buckets resolves as close to atomically
            // as two independent requests can, shrinking (not eliminating —
            // the dedupe above is the actual fix) the stale-overlap window.
            refetch();
          }}
        />
      )}

      {/* ── New Repair Task Modal ── */}
      {showRepairModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            zIndex: 9800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isMobile ? 12 : 24,
          }}
          role="presentation"
          onClick={closeRepairModal}
          onKeyDown={(e) => {
            if (e.key === 'Escape') closeRepairModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            style={{
              background: T.card,
              borderRadius: 14,
              padding: isMobile ? '18px 16px' : '28px 32px',
              maxWidth: 820,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 12px 48px rgba(0,0,0,0.25)',
              fontFamily: T.font,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 10,
                marginBottom: 24,
              }}
            >
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>New Repair Task</h2>
                <p style={{ fontSize: 12, color: T.mutedFg, marginTop: 4 }}>
                  Assign a repair maintenance plan to a machine
                </p>
              </div>
              <button
                type="button"
                onClick={closeRepairModal}
                style={{
                  background: T.muted,
                  border: 'none',
                  borderRadius: 8,
                  width: 32,
                  height: 32,
                  cursor: 'pointer',
                  fontSize: 18,
                  color: T.mutedFg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>

            {orgViewMode === 'all' && !pinnedCompany ? (
              <CompanySelectField onSelect={selectCompany} />
            ) : (
              <>
                {/* Success */}
                {repairSuccess && (
                  <div
                    style={{
                      background: T.successBg,
                      border: `1px solid ${T.success}`,
                      borderRadius: 10,
                      padding: '12px 16px',
                      marginBottom: 20,
                      fontSize: 13,
                      fontWeight: 500,
                      color: T.success,
                    }}
                  >
                    ✓ {repairSuccess}
                  </div>
                )}

                <form onSubmit={handleRepairSubmit}>
                  {/* Error */}
                  {repairError && (
                    <div
                      style={{
                        background: T.warningBg,
                        border: `1px solid ${T.warning}`,
                        borderRadius: 10,
                        padding: '12px 16px',
                        marginBottom: 20,
                        fontSize: 13,
                        color: T.warning,
                      }}
                    >
                      {repairError}
                    </div>
                  )}

                  {/* Row 1: Task Type (fixed) | Machine */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                      gap: 20,
                      marginBottom: 20,
                    }}
                  >
                    <div>
                      <RLabel htmlFor="rt-activityType" required>
                        Task Type
                      </RLabel>
                      <RSelect
                        id="rt-activityType"
                        value="REPAIR"
                        onChange={() => {}}
                        options={[{ value: 'REPAIR', label: 'Repair' }]}
                        disabled
                      />
                    </div>
                    <div>
                      <RLabel htmlFor="rt-givenBy">Requested By</RLabel>
                      <RInput
                        id="rt-givenBy"
                        value={repairForm.givenBy}
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
                      <RLabel htmlFor="rt-assignedToId" required>
                        Assigned To
                      </RLabel>
                      <RSelect
                        id="rt-assignedToId"
                        value={repairForm.assignedToId}
                        onChange={(v) => setR('assignedToId', v)}
                        options={modalUsers.map((u) => ({ value: u.id, label: u.name }))}
                        placeholder="Select Technician"
                        error={!!repairError && !repairForm.assignedToId}
                      />
                    </div>
                    <div>
                      <RLabel htmlFor="rt-machineId" required>
                        Machine Name
                      </RLabel>
                      <RSelect
                        id="rt-machineId"
                        value={repairForm.machineId}
                        onChange={(v) => {
                          setR('machineId', v);
                          setR('machinePartId', '');
                        }}
                        options={modalMachines.map((m) => ({
                          value: m.id,
                          label: `${m.name} (${m.assetCode})`,
                        }))}
                        placeholder="Select Machine"
                        error={!!repairError && !repairForm.machineId}
                      />
                    </div>
                  </div>

                  {/* Row 3: Part Name */}
                  <div style={{ marginBottom: 20 }}>
                    <RLabel htmlFor="rt-machinePartId">Part Name</RLabel>
                    <RSelect
                      id="rt-machinePartId"
                      value={repairForm.machinePartId}
                      onChange={(v) => setR('machinePartId', v)}
                      options={modalParts.map((p) => ({ value: p.id, label: p.name }))}
                      placeholder={
                        !repairForm.machineId
                          ? 'Select machine first'
                          : modalParts.length === 0
                            ? 'No parts available'
                            : 'Select Part'
                      }
                      disabled={!repairForm.machineId || modalParts.length === 0}
                    />
                  </div>

                  {/* Work Description */}
                  <div style={{ marginBottom: 20 }}>
                    <RLabel htmlFor="rt-description">Issue Details</RLabel>
                    <textarea
                      id="rt-description"
                      value={repairForm.description}
                      onChange={(e) => setR('description', e.target.value)}
                      rows={4}
                      placeholder="Enter task description..."
                      style={{
                        width: '100%',
                        background: T.muted,
                        border: `1px solid ${T.border}`,
                        borderRadius: 10,
                        padding: '10px 12px',
                        fontSize: 13,
                        color: T.fg,
                        outline: 'none',
                        resize: 'none',
                        fontFamily: T.font,
                        boxSizing: 'border-box',
                        transition: 'all .15s',
                      }}
                    />
                  </div>

                  {/* Task Document Upload */}
                  <div style={{ marginBottom: 20 }}>
                    <RLabel htmlFor="rt-taskDocument">
                      Machine/Damage area{' '}
                      <span style={{ color: T.mutedFg, fontWeight: 400, fontSize: 11 }}>
                        (PDF or image, max 10 MB)
                      </span>
                    </RLabel>
                    {docUrl ? (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          background: T.muted,
                          border: `1px solid ${T.success}`,
                          borderRadius: 10,
                          padding: '10px 14px',
                        }}
                      >
                        <span style={{ fontSize: 15, flexShrink: 0 }}>📄</span>
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
                            fontSize: 16,
                            lineHeight: 1,
                            padding: 0,
                            flexShrink: 0,
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <label
                        htmlFor="rt-taskDocument"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          background: T.muted,
                          border: `1px dashed ${isDocUploading ? T.primary : T.border}`,
                          borderRadius: 10,
                          padding: '12px 16px',
                          cursor: isDocUploading ? 'not-allowed' : 'pointer',
                          fontSize: 13,
                          color: isDocUploading ? T.primary : T.mutedFg,
                          transition: 'all .15s',
                        }}
                      >
                        <span style={{ fontSize: 15 }}>📎</span>
                        {isDocUploading
                          ? `Uploading… ${docProgress}%`
                          : 'Click to upload PDF or image'}
                        <input
                          id="rt-taskDocument"
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
                          background: T.muted,
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
                      <div style={{ fontSize: 12, color: T.danger, marginTop: 4 }}>
                        {docUploadError}
                      </div>
                    )}
                  </div>

                  {/* Expected Completion Date */}
                  <div style={{ marginBottom: 24 }}>
                    <RLabel htmlFor="rt-expectedCompletionDate" required>
                      Expected Completion Date
                    </RLabel>
                    <RInput
                      id="rt-expectedCompletionDate"
                      type="date"
                      value={repairForm.expectedCompletionDate}
                      onChange={(e) => setR('expectedCompletionDate', e.target.value)}
                      error={!!repairError && !repairForm.expectedCompletionDate}
                    />
                  </div>

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
                        gap: 12,
                        padding: '14px 0',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>Require Attachment</div>
                        <div style={{ fontSize: 12, color: T.info, marginTop: 2 }}>
                          User must upload a file when completing task
                        </div>
                      </div>
                      <RToggle
                        checked={repairForm.requireAttachment}
                        onChange={(v) => setR('requireAttachment', v)}
                      />
                    </div>
                  </div>

                  {/* Error banner above submit button if scrolled down */}
                  {repairError && (
                    <div
                      style={{
                        background: T.warningBg,
                        border: `1px solid ${T.warning}`,
                        borderRadius: 10,
                        padding: '10px 14px',
                        marginBottom: 16,
                        fontSize: 13,
                        color: T.warning,
                      }}
                    >
                      {repairError}
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={createPlan.isPending}
                    style={{
                      width: '100%',
                      background: T.primary,
                      color: T.primaryFg,
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
                      fontFamily: T.font,
                    }}
                  >
                    {createPlan.isPending ? 'Assigning...' : 'Assign Repair Task'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 9999,
            background: T.card,
            border: `1px solid ${T.success}`,
            borderRadius: 10,
            padding: '12px 18px',
            fontSize: 13,
            fontWeight: 500,
            color: T.fg,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            boxShadow: '0 8px 30px rgba(0,0,0,.15)',
            minWidth: 220,
          }}
        >
          <div
            style={{ width: 6, height: 6, borderRadius: 3, background: T.success, flexShrink: 0 }}
          />
          {toast}
        </div>
      )}
    </div>
  );
}
