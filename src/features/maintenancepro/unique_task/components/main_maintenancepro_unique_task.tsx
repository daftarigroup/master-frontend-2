'use client';

import { Link } from 'react-router-dom';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useProject } from '@/context/ProjectContext';
import { filterByFirmAccess } from '@/lib/firmAccess';
import { PaginationBar } from '@/components/shared/PaginationBar';
import { useRequireCompanySelected } from '@/features/organization/hooks/useRequireCompanySelected';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useIsMobile } from '@/hooks/useIsMobile';
import { usePagination } from '@/hooks/usePagination';
import { useAppSelector } from '@/store/hook';
import { selectUser } from '@/store/slice/userAccountData';
import {
  useActivityTypes,
  useCreateActivityType,
} from '../../activityTypes/server/tanstackQuery/useActivityTypeQueries';
import { useAssignableUsers } from '../../assign_task/server/tanstackQuery/useUsersQueries';
import { useMachineParts } from '../../machines/server/tanstackQuery/useMachinePartQueries';
import { useMachines } from '../../machines/server/tanstackQuery/useMachinesQueries';
import {
  useCreatePlan,
  usePlanDetail,
  useUpdatePlan,
} from '../../plans/server/tanstackQuery/usePlansQueries';
import type { PlanFrequency } from '../../plans/types/types';
import { PLAN_FREQUENCY_LABELS } from '../../plans/types/types';
import type { ReplacementItem, WorkOrder, WorkOrderStatus } from '../server/api/workordersApi';
import {
  useDeleteWorkOrder,
  useReportWorkOrder,
  useWorkOrderById,
  useWorkOrderStats,
  useWorkOrders,
} from '../server/tanstackQuery/useWorkOrdersQueries';
import { StatCard } from './StatCard';
import { Btn, Chip, Dropdown, TextInput, Toast } from './UniqueTaskUiComponents';

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
  chart5: 'var(--chart-5)',
  chart5Bg: 'color-mix(in oklch, var(--chart-5) 14%, transparent)',
  font: "'DM Sans', system-ui, sans-serif" as string,
};

// ── Status metadata ────────────────────────────────────────────────────────────
const STATUS_META: Record<WorkOrderStatus, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'Pending', color: T.warning, bg: T.warningBg },
  IN_PROGRESS: { label: 'Pending', color: T.warning, bg: T.warningBg },
  PENDING_APPROVAL: { label: 'Awaiting Approval', color: T.warning, bg: T.warningBg },
  COMPLETION_REJECTED: { label: 'Completion Rejected', color: T.danger, bg: T.dangerBg },
  COMPLETED: { label: 'Completed', color: T.success, bg: T.successBg },
  COMPLETED_LATE: { label: 'Completed Late', color: T.warning, bg: T.warningBg },
  OVERDUE: { label: 'Overdue', color: T.danger, bg: T.dangerBg },
  ON_LEAVE: { label: 'On Leave', color: T.info, bg: T.infoBg },
  MISSED: { label: 'Missed', color: T.danger, bg: T.dangerBg },
  SKIPPED: { label: 'Skipped', color: T.mutedFg, bg: T.muted },
  CANCELLED: { label: 'Cancelled', color: T.mutedFg, bg: T.muted },
  ON_HOLD: { label: 'On Hold', color: T.chart5, bg: T.chart5Bg },
};

const FREQ_COLORS: Record<string, { bg: string; color: string }> = {
  DAILY: { bg: T.primaryBg, color: T.primary },
  WEEKLY: { bg: T.successBg, color: T.success },
  MONTHLY: { bg: T.warningBg, color: T.warning },
  QUARTERLY: {
    bg: 'color-mix(in oklch, var(--chart-3) 15%, transparent)',
    color: 'var(--chart-3)',
  },
  HALF_YEARLY: {
    bg: 'color-mix(in oklch, var(--chart-2) 15%, transparent)',
    color: 'var(--chart-2)',
  },
  YEARLY: { bg: 'color-mix(in oklch, var(--chart-4) 15%, transparent)', color: 'var(--chart-4)' },
  ONE_TIME: { bg: T.chart5Bg, color: T.chart5 },
  FORTNIGHTLY: {
    bg: 'color-mix(in oklch, var(--chart-2) 12%, transparent)',
    color: 'var(--chart-2)',
  },
  RUNNING_HOURS: { bg: T.warningBg, color: T.warning },
  METER_BASED: {
    bg: 'color-mix(in oklch, var(--chart-3) 12%, transparent)',
    color: 'var(--chart-3)',
  },
  ALTERNATE_DAYS: { bg: T.primaryBg, color: T.primary },
  IN_FIRST_WEEK: { bg: T.successBg, color: T.success },
  IN_SECOND_WEEK: { bg: T.successBg, color: T.success },
  IN_THIRD_WEEK: { bg: T.successBg, color: T.success },
  IN_FOURTH_WEEK: { bg: T.successBg, color: T.success },
};

// ── Icons (decorative, aria-hidden) ───────────────────────────────────────────
const Ico = {
  search: (s = 16) => (
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
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  ),
  filter: (s = 16) => (
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
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  ),
  plus: (s = 16) => (
    <svg
      aria-hidden="true"
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  list: (s = 16) => (
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
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  ),
  chevDown: (s = 14) => (
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
      <path d="M6 9l6 6 6-6" />
    </svg>
  ),
  chevUp: (s = 14) => (
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
      <path d="M18 15l-6-6-6 6" />
    </svg>
  ),
  x: (s = 14) => (
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
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  ),
  clock: (s = 14) => (
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
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  ),
  check: (s = 12) => (
    <svg
      aria-hidden="true"
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6L9 17l-5-5" />
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
  refresh: (s = 14) => (
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
      <path d="M23 4v6h-6" />
      <path d="M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  ),
  eye: (s = 15) => (
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
  edit: (s = 15) => (
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
  fileText: (s = 14) => (
    <svg
      aria-hidden="true"
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M16 13H8M16 17H8M10 9H8" />
    </svg>
  ),
  download: (s = 14) => (
    <svg
      aria-hidden="true"
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
};

// ── Types ──────────────────────────────────────────────────────────────────────
interface MachineRef {
  id: string;
  name: string;
  assetCode?: string;
}
interface UserRef {
  id: string;
  name: string;
}
interface PreviewTask {
  _id: number;
  title: string;
  description: string;
  machine: string;
  machineId: string;
  assignee: string;
  assignedToId: string;
  givenBy?: string;
  startDate: string;
  parsedDate: string;
  frequency: string;
  activityType: string;
}

// ── Edit Task Modal ────────────────────────────────────────────────────────────
const EDIT_PRIORITY_OPTIONS = [
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

function EditFieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 600, color: T.fg, marginBottom: 6 }}>
      {children}
      {required && <span style={{ color: T.danger, marginLeft: 3 }}>*</span>}
    </div>
  );
}

function EditTaskModal({
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
  const { data: activityTypes } = useActivityTypes();
  const { data: users } = useAssignableUsers();
  const { data: machinesRes } = useMachines();
  const updatePlan = useUpdatePlan();
  const [form, setForm] = useState<{
    activityTypeId: string;
    machineId: string;
    machinePartId: string;
    assignedToId: string;
    priority: string;
    description: string;
    completionDate: string;
    completionTime: string;
    docUrl: string;
    docMediaId: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: partsRes } = useMachineParts(form?.machineId || undefined);
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
      // Both the date and the time-of-day must be read via IST, not `.toISOString()`/
      // `.getHours()` (UTC / browser-local respectively) — a plan stored as IST
      // midnight (e.g. 2026-08-04T18:30:00.000Z, meaning Aug 5 00:00 IST) would
      // otherwise show the wrong calendar date (Aug 4) and a fabricated non-zero
      // time (05:30 in a browser set to IST reading raw UTC hours), even though no
      // time was ever actually set.
      const istTime = start ? istTimeOfDay(start) : null;
      setForm({
        activityTypeId: planDetail.activityType?.id ?? '',
        machineId: planDetail.machineId,
        machinePartId: planDetail.machinePart?.id ?? '',
        assignedToId: planDetail.assignedToId,
        priority: String(planDetail.priority),
        description: planDetail.description ?? '',
        completionDate: start ? istDateKey(start) : '',
        completionTime:
          istTime && (istTime.hours !== 0 || istTime.minutes !== 0)
            ? `${String(istTime.hours).padStart(2, '0')}:${String(istTime.minutes).padStart(2, '0')}`
            : '',
        docUrl: planDetail.documentUrl ?? '',
        docMediaId: planDetail.documentMediaId ?? '',
      });
    }
  }, [planDetail]);

  const machines =
    (machinesRes as { data?: { id: string; name: string; assetCode: string }[] } | undefined)
      ?.data ?? [];
  const parts: { id: string; name: string }[] = form?.machineId
    ? ((partsRes?.data ?? []) as { id: string; name: string }[])
    : [];
  const activityOptions = (activityTypes ?? []).map((t) => ({ value: t.id, label: t.name }));
  const userOptions = (users ?? []).map((u) => ({ value: u.id, label: u.name }));
  const machineOptions = machines.map((m) => ({
    value: m.id,
    label: `${m.name} (${m.assetCode})`,
  }));
  const partOptions = parts.map((p) => ({ value: p.id, label: p.name }));
  const selectedActivityType = (activityTypes ?? []).find((t) => t.id === form?.activityTypeId);
  const isRepair = selectedActivityType?.code === 'REPAIR';

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
          activityTypeId: form.activityTypeId,
          machineId: form.machineId,
          machinePartId: form.machinePartId || null,
          assignedToId: form.assignedToId,
          priority: Number.parseInt(form.priority, 10),
          description: form.description.trim() || undefined,
          startDate: `${form.completionDate}T${isRepair ? '00:00' : form.completionTime || '00:00'}:00`,
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

        <div
          style={{
            padding: isMobile ? '18px 16px' : '22px 28px',
            overflowY: 'auto',
          }}
        >
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
                {Ico.edit(20)}
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
                  Edit Task
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
              {Ico.x(14)}
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
                    <EditFieldLabel required>Task Type</EditFieldLabel>
                    <Dropdown
                      value={form.activityTypeId}
                      onChange={(v) => setForm((p) => (p ? { ...p, activityTypeId: v } : p))}
                      options={activityOptions}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <EditFieldLabel required>Assigned To</EditFieldLabel>
                    <Dropdown
                      value={form.assignedToId}
                      onChange={(v) => setForm((p) => (p ? { ...p, assignedToId: v } : p))}
                      options={userOptions}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <EditFieldLabel>Priority</EditFieldLabel>
                    <Dropdown
                      value={form.priority}
                      onChange={(v) => setForm((p) => (p ? { ...p, priority: v } : p))}
                      options={EDIT_PRIORITY_OPTIONS}
                      style={{ width: '100%' }}
                    />
                  </div>
                  {isRepair ? (
                    <div>
                      <EditFieldLabel required>Expected Completion Date</EditFieldLabel>
                      <TextInput
                        type="date"
                        value={form.completionDate}
                        onChange={(e) =>
                          setForm((p) => (p ? { ...p, completionDate: e.target.value } : p))
                        }
                        style={{ width: '100%' }}
                      />
                    </div>
                  ) : (
                    <>
                      <div>
                        <EditFieldLabel required>Expected Completion Date</EditFieldLabel>
                        <TextInput
                          type="date"
                          value={form.completionDate}
                          onChange={(e) =>
                            setForm((p) => (p ? { ...p, completionDate: e.target.value } : p))
                          }
                          style={{ width: '100%' }}
                        />
                      </div>
                      <div>
                        <EditFieldLabel>Expected Completion Time</EditFieldLabel>
                        <TextInput
                          type="time"
                          value={form.completionTime}
                          onChange={(e) =>
                            setForm((p) => (p ? { ...p, completionTime: e.target.value } : p))
                          }
                          style={{ width: '100%' }}
                        />
                      </div>
                    </>
                  )}
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
                    <EditFieldLabel required>Machine</EditFieldLabel>
                    <Dropdown
                      value={form.machineId}
                      onChange={(v) =>
                        setForm((p) => (p ? { ...p, machineId: v, machinePartId: '' } : p))
                      }
                      options={machineOptions}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <EditFieldLabel>Machine Part</EditFieldLabel>
                    <Dropdown
                      value={form.machinePartId}
                      onChange={(v) => setForm((p) => (p ? { ...p, machinePartId: v } : p))}
                      options={partOptions}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: 20 }}>
                <EditSectionLabel>Description</EditSectionLabel>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => (p ? { ...p, description: e.target.value } : p))}
                  rows={3}
                  style={{
                    width: '100%',
                    background: T.muted,
                    border: `1px solid ${T.border}`,
                    borderRadius: 8,
                    padding: '8px 12px',
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
                    {Ico.fileText(15)}
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
                      {Ico.x(15)}
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="edit-task-document"
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
                    {Ico.fileText(15)}
                    {isDocUploading ? `Uploading… ${docProgress}%` : 'Click to upload PDF or image'}
                    <input
                      id="edit-task-document"
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
                <Btn
                  variant="outline"
                  type="button"
                  onClick={onClose}
                  disabled={updatePlan.isPending}
                >
                  Cancel
                </Btn>
                <Btn type="submit" disabled={updatePlan.isPending}>
                  {updatePlan.isPending ? 'Saving…' : 'Save Changes'}
                </Btn>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
}

// The app is used exclusively by India-based tenants, and due dates are
// stored as today's IST midnight (see the backend engine's date math) — so
// "overdue" must compare calendar days in IST, not raw instants. Comparing
// `actualDueDate < new Date()` made every task due *today* read as overdue
// the moment any time at all had passed since midnight IST. Asia/Kolkata has
// no DST, so a fixed +5:30 offset is always correct here.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
function istDateKey(d: Date) {
  const shifted = new Date(d.getTime() + IST_OFFSET_MS);
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(
    shifted.getUTCDate()
  ).padStart(2, '0')}`;
}

// Hour/minute of `d`'s IST wall-clock time — NOT `d.getHours()`, which reads the
// *browser's* ambient local timezone. A tech opening this app from a browser set
// to a different timezone than IST would otherwise see a different, wrong time
// for the exact same plan.
function istTimeOfDay(d: Date): { hours: number; minutes: number } {
  const shifted = new Date(d.getTime() + IST_OFFSET_MS);
  return { hours: shifted.getUTCHours(), minutes: shifted.getUTCMinutes() };
}

function isOverdue(wo: WorkOrder) {
  // Server-side OVERDUE (written by the cron, or overlaid in real time before
  // the cron catches up) takes precedence; the date check below is just a
  // fallback for the same-day gap in case the response predates either path.
  if (wo.status === 'OVERDUE') return true;
  if (wo.status !== 'PENDING' && wo.status !== 'IN_PROGRESS') return false;
  return istDateKey(new Date(wo.actualDueDate)) < istDateKey(new Date());
}

// How many days ahead of today "Schedule Maintenance" previews by default —
// matches UPCOMING_WINDOW_DAYS on the backend (WorkOrderService.ts). Tasks in
// this window are visible so you can see what's coming, but not yet due —
// same "view-only until due" rule as checklist_delegation's `isFuture`.
const UPCOMING_WINDOW_DAYS = 3;

function isUpcoming(wo: WorkOrder) {
  // ON_LEAVE included alongside PENDING/IN_PROGRESS: a work order whose
  // current assignee is on approved leave for its due date still has a
  // future due date and still needs coverage — it shouldn't disappear from
  // "Upcoming" just because it's also flagged for transfer. Matches the
  // backend's WorkOrderService.getStats "upcoming" bucket definition.
  if (wo.status !== 'PENDING' && wo.status !== 'IN_PROGRESS' && wo.status !== 'ON_LEAVE') {
    return false;
  }
  return istDateKey(new Date(wo.actualDueDate)) > istDateKey(new Date());
}

// Exact UTC instant for "IST midnight, N days from today" — matches how
// actualDueDate is always stored (every due date is exactly that midnight
// instant, never a time-of-day within it), so boundary comparisons against
// this are exact, unlike a plain YYYY-MM-DD string which is off by the IST
// offset in one direction or the other depending on whether it's a `from` or
// a `to`.
function istMidnightISO(daysFromToday: number) {
  const istNow = new Date(Date.now() + IST_OFFSET_MS);
  const istMidnightUTCMs = Date.UTC(
    istNow.getUTCFullYear(),
    istNow.getUTCMonth(),
    istNow.getUTCDate() + daysFromToday
  );
  return new Date(istMidnightUTCMs - IST_OFFSET_MS).toISOString();
}

function truncate(text: string, maxLength: number) {
  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text;
}

const HISTORY_STATUSES: WorkOrderStatus[] = [
  'COMPLETED',
  'COMPLETED_LATE',
  'MISSED',
  'SKIPPED',
  'CANCELLED',
];

// ── Main Component ─────────────────────────────────────────────────────────────
export default function UniqueTaskMain() {
  const requireCompanySelected = useRequireCompanySelected();
  const isMobile = useIsMobile();
  const currentUser = useAppSelector(selectUser);
  // currentUser's role is available slightly earlier on the client than the
  // server-rendered HTML accounts for, so branching on it directly causes a
  // hydration mismatch (admin-only text/controls flip right as the page
  // hydrates). Force `false` — same as the server — until after mount, then
  // let the real role take over on the next client render.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const isAdmin =
    mounted &&
    ((currentUser as any)?.role === 'ADMIN' ||
      (currentUser as any)?.role === 'SUPERADMIN' ||
      (currentUser as any)?.role === 'SUPER_ADMIN' ||
      (currentUser as any)?.administrate === true);
  const [viewMyTasksOnly, setViewMyTasksOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [freqFilter, setFreqFilter] = useState('All Frequencies');
  const [assigneeFilter, setAssigneeFilter] = useState('All');
  const [givenByFilter, setGivenByFilter] = useState('All');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [previewTasks, setPreviewTasks] = useState<PreviewTask[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<number>>(new Set());
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [toast, setToast] = useState<{
    msg: string;
    type: 'success' | 'warning' | 'info';
    key: number;
  } | null>(null);
  const [viewOrder, setViewOrder] = useState<WorkOrder | null>(null);
  const [updateOrder, setUpdateOrder] = useState<WorkOrder | null>(null);
  const [editOrder, setEditOrder] = useState<WorkOrder | null>(null);
  const [deleteOrder, setDeleteOrder] = useState<WorkOrder | null>(null);
  const [reportStatus, setReportStatus] = useState<'complete' | 'repair' | 'breakdown'>('complete');
  const [isReplaced, setIsReplaced] = useState<'yes' | 'no'>('no');
  const [replacements, setReplacements] = useState<ReplacementItem[]>([
    { name: '', quantity: 1, cost: 0 },
  ]);
  const [reportNotes, setReportNotes] = useState('');
  const excelInputRef = useRef<HTMLInputElement>(null);

  const reportWorkOrderMutation = useReportWorkOrder();
  const deleteWorkOrderMutation = useDeleteWorkOrder();
  const { data: viewOrderDetail } = useWorkOrderById(viewOrder?.id ?? null);

  const showToast = useCallback((msg: string, type: 'success' | 'warning' | 'info' = 'success') => {
    setToast({ msg, type, key: Date.now() });
  }, []);

  const clearToast = useCallback(() => setToast(null), []);

  const openUpdateModal = useCallback((wo: WorkOrder) => {
    setUpdateOrder(wo);
    setReportStatus('complete');
    setIsReplaced('no');
    setReplacements([{ name: '', quantity: 1, cost: 0 }]);
    setReportNotes('');
  }, []);

  const handleReport = useCallback(async () => {
    if (!updateOrder) return;
    if (!requireCompanySelected()) return;
    try {
      await reportWorkOrderMutation.mutateAsync({
        id: updateOrder.id,
        data: {
          reportStatus,
          notes: reportNotes || undefined,
          replacements:
            reportStatus === 'complete' && isReplaced === 'yes'
              ? replacements.filter((r) => r.name.trim())
              : undefined,
        },
      });
      showToast(
        reportStatus === 'complete'
          ? 'Submitted for admin approval — awaiting review'
          : 'Task updated successfully',
        'success'
      );
      setUpdateOrder(null);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Update failed';
      showToast(msg, 'warning');
    }
  }, [
    updateOrder,
    reportStatus,
    reportNotes,
    isReplaced,
    replacements,
    reportWorkOrderMutation,
    showToast,
    requireCompanySelected,
  ]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteOrder) return;
    if (!requireCompanySelected()) return;
    try {
      await deleteWorkOrderMutation.mutateAsync(deleteOrder.id);
      showToast('Task deleted successfully', 'success');
      setDeleteOrder(null);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to delete task';
      showToast(msg, 'warning');
    }
  }, [deleteOrder, deleteWorkOrderMutation, showToast, requireCompanySelected]);

  const { page, limit, setPage } = usePagination(20);

  // Every filter that narrows the result set must reset back to page 1 —
  // otherwise switching status/frequency/search/date while sitting on page 3
  // of the *previous* filter's results silently filters that stale page
  // instead of jumping back to a page that actually has matches.
  useEffect(() => {
    setPage(1);
  }, [setPage]);

  // Maps the status dropdown's value to the backend query params that
  // actually narrow the result set server-side (see WorkOrderService.buildWhere).
  // 'All'/'PENDING'/'OVERDUE'/'UPCOMING'/'HISTORY' aren't literal WorkOrderStatus
  // values — they're buckets the backend already understands via comma-separated
  // `status` lists, the dedicated `overdue` flag, or an explicit from/to window,
  // same definitions the stat cards use, so the list and the cards always agree.
  const statusParams: { status?: string; overdue?: boolean; from?: string; to?: string } =
    statusFilter === 'All'
      ? {}
      : statusFilter === 'PENDING'
        ? // OVERDUE included alongside PENDING/IN_PROGRESS — matches
          // WorkOrderService.getStats' "pending" bucket definition: a task
          // whose status has already flipped to the literal OVERDUE value is
          // still incomplete work, not a separate thing from "pending".
          { status: 'PENDING,IN_PROGRESS,OVERDUE', to: istMidnightISO(0) }
        : statusFilter === 'OVERDUE'
          ? { overdue: true }
          : statusFilter === 'UPCOMING'
            ? {
                // ON_LEAVE included alongside PENDING/IN_PROGRESS — matches
                // WorkOrderService.getStats' "upcoming" bucket definition: a
                // work order awaiting transfer still has a future due date and
                // still needs coverage, so it belongs in this bucket too.
                status: 'PENDING,IN_PROGRESS,ON_LEAVE',
                from: istMidnightISO(1),
                to: istMidnightISO(UPCOMING_WINDOW_DAYS),
              }
            : statusFilter === 'HISTORY'
              ? { status: HISTORY_STATUSES.join(',') }
              : { status: statusFilter };

  // Shared across the main list fetch and all stat queries below, so the stat
  // cards always reflect the same search/date/frequency/view scope as what's
  // on screen. `status`/`overdue` are intentionally left out of the params
  // shared with stats — those ARE the bucket definitions the stat cards
  // compute independently, so folding the current status filter into them
  // would make every bucket just echo whichever one is currently selected.
  //
  // Default `to` caps the view to today + a few days ahead (UPCOMING_WINDOW_DAYS)
  // instead of showing every occurrence out to the full 60-day generation
  // horizon — matches checklist_delegation's "today + upcoming preview"
  // pattern. An explicit advanced-filter `dateTo` always overrides it.
  const commonParams = {
    excludeRepair: true,
    excludeWeekOff: true,
    search: searchTerm.trim() || undefined,
    ...(freqFilter !== 'All Frequencies' && { frequency: freqFilter }),
    ...(assigneeFilter !== 'All' && { assigneeId: assigneeFilter }),
    ...(givenByFilter !== 'All' && { givenBy: givenByFilter }),
    ...(dateFrom && { from: dateFrom }),
    to: dateTo || istMidnightISO(UPCOMING_WINDOW_DAYS),
    ...(isAdmin && viewMyTasksOnly && { view: 'personal' as const }),
  };

  // Backend handles role-based filtering: admins see all, users see only assigned
  const {
    data: woData,
    isLoading,
    refetch,
  } = useWorkOrders({
    ...commonParams,
    ...statusParams,
    page,
    limit,
  });

  // Stat cards: one dedicated endpoint computes all five bucket counts
  // server-side over the full matching set (not just the current page) in a
  // single request, instead of five separate limit:1 list queries.
  const { data: statsData } = useWorkOrderStats(commonParams);

  const { data: machinesData } = useMachines();
  const { data: usersData } = useAssignableUsers();
  const { data: activityTypesData } = useActivityTypes();
  const createPlan = useCreatePlan();
  const createActivityType = useCreateActivityType();

  const { effectivePermittedFirms } = useProject();
  const allOrders: WorkOrder[] = woData?.data ?? [];
  const machines = (machinesData as { data?: MachineRef[] } | undefined)?.data ?? [];
  const users = (usersData as UserRef[] | undefined) ?? [];
  const activityTypes = activityTypesData ?? [];

  // Scoped to permitted project/firms
  const filtered = useMemo<WorkOrder[]>(() => {
    return filterByFirmAccess(allOrders, effectivePermittedFirms);
  }, [allOrders, effectivePermittedFirms]);

  // Only true when the backend merged this list across a multi-company
  // identity's linked companies (see UserIdentity) — `tenant` is absent for
  // every individual company and every single-company session, so the
  // table grid stays byte-identical to before for them.
  const hasTenantColumn = filtered.some((wo) => wo.tenant);

  // Summary stats — real totals from the server, not the current page.
  const stats = {
    total: statsData?.data?.total ?? 0,
    pending: statsData?.data?.pending ?? 0,
    completed: statsData?.data?.completed ?? 0,
    overdue: statsData?.data?.overdue ?? 0,
    history: statsData?.data?.history ?? 0,
    upcoming: statsData?.data?.upcoming ?? 0,
  };

  const hasActiveFilters =
    searchTerm !== '' ||
    statusFilter !== 'All' ||
    freqFilter !== 'All Frequencies' ||
    assigneeFilter !== 'All' ||
    givenByFilter !== 'All' ||
    dateFrom !== '' ||
    dateTo !== '';

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('All');
    setFreqFilter('All Frequencies');
    setAssigneeFilter('All');
    setGivenByFilter('All');
    setDateFrom('');
    setDateTo('');
  };

  // ── Import from Excel (creates plans which generate work orders) ──────────
  const importFromExcel = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const XLSX = await import('xlsx');
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { raw: true });
        const parsed: PreviewTask[] = [];
        const errors: string[] = [];

        const parseDate = (raw: unknown): { iso: string; display: string } | null => {
          if (raw == null || raw === '') return null;
          if (raw instanceof Date) {
            const y = raw.getFullYear();
            const m = String(raw.getMonth() + 1).padStart(2, '0');
            const d = String(raw.getDate()).padStart(2, '0');
            return { iso: `${y}-${m}-${d}`, display: `${d}/${m}/${y}` };
          }
          if (typeof raw === 'number') {
            const jsDate = new Date(Math.round((raw - 25569) * 86400 * 1000));
            if (!Number.isNaN(jsDate.getTime())) {
              const y = jsDate.getUTCFullYear();
              const m = String(jsDate.getUTCMonth() + 1).padStart(2, '0');
              const d = String(jsDate.getUTCDate()).padStart(2, '0');
              return { iso: `${y}-${m}-${d}`, display: `${d}/${m}/${y}` };
            }
            return null;
          }
          const s = String(raw).trim();
          const ddmm = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
          if (ddmm) {
            const dd = ddmm[1].padStart(2, '0');
            const mm = ddmm[2].padStart(2, '0');
            return { iso: `${ddmm[3]}-${mm}-${dd}`, display: `${dd}/${mm}/${ddmm[3]}` };
          }
          const yyyymm = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
          if (yyyymm) return { iso: s, display: `${yyyymm[3]}/${yyyymm[2]}/${yyyymm[1]}` };
          return null;
        };

        const freqMap: Record<string, string> = {
          'one time': 'ONE_TIME',
          one_time: 'ONE_TIME',
          daily: 'DAILY',
          weekly: 'WEEKLY',
          fortnightly: 'FORTNIGHTLY',
          'alternate days': 'ALTERNATE_DAYS',
          alternate_days: 'ALTERNATE_DAYS',
          monthly: 'MONTHLY',
          quarterly: 'QUARTERLY',
          'half yearly': 'HALF_YEARLY',
          half_yearly: 'HALF_YEARLY',
          yearly: 'YEARLY',
        };

        for (const [idx, row] of rows.entries()) {
          const rowNum = idx + 2;
          if (!row.Title) {
            errors.push(`Row ${rowNum}: Missing Title`);
            continue;
          }
          if (!row.Description) {
            errors.push(`Row ${rowNum}: Missing Description`);
            continue;
          }
          if (!row.Frequency) {
            errors.push(`Row ${rowNum}: Missing Frequency`);
            continue;
          }
          const rawDate = row.StartDate;
          if (rawDate == null || rawDate === '') {
            errors.push(`Row ${rowNum}: Missing StartDate`);
            continue;
          }
          const dateResult = parseDate(rawDate);
          if (!dateResult) {
            errors.push(`Row ${rowNum}: Invalid date "${rawDate}" — use dd/mm/yyyy`);
            continue;
          }

          const machine = machines.find(
            (m) =>
              (m.name || '').toLowerCase() === String(row.Machine || '').toLowerCase() ||
              (m.assetCode || '').toLowerCase() === String(row.AssetCode || '').toLowerCase()
          );
          if (!machine) {
            errors.push(`Row ${rowNum}: Machine "${row.Machine}" not found`);
            continue;
          }

          if (!row.Assignee) {
            errors.push(`Row ${rowNum}: Missing Assignee`);
            continue;
          }
          const assignee = users.find(
            (u) => (u.name || '').toLowerCase() === String(row.Assignee || '').toLowerCase()
          );
          if (!assignee) {
            errors.push(
              `Row ${rowNum}: Assignee "${row.Assignee}" not found — must match an existing user name exactly`
            );
            continue;
          }

          const freq =
            freqMap[String(row.Frequency).toLowerCase()] || String(row.Frequency).toUpperCase();

          parsed.push({
            _id: idx,
            title: String(row.Title),
            description: String(row.Description),
            machine: machine.name,
            machineId: machine.id,
            assignee: assignee.name,
            assignedToId: assignee.id,
            givenBy: row.GivenBy ? String(row.GivenBy) : undefined,
            startDate: dateResult.display,
            parsedDate: dateResult.iso,
            frequency: freq,
            activityType: String(row.ActivityType || 'OTHER').toUpperCase(),
          });
        }

        setImportErrors(errors);
        setPreviewTasks(parsed);
        setSelectedTaskIds(new Set(parsed.map((t) => t._id)));
        setShowPreviewModal(true);
      };
      reader.readAsArrayBuffer(file);
    },
    [machines, users]
  );

  const downloadSampleCsv = () => {
    const firstMachine = machines[0]?.name ?? 'Machine A';
    const secondMachine = machines[1]?.name ?? firstMachine;
    const firstUser = users[0]?.name ?? 'John Doe';
    const secondUser = users[1]?.name ?? firstUser;
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const headers = [
      'Title',
      'Description',
      'Machine',
      'Assignee',
      'Frequency',
      'StartDate',
      'AssetCode',
      'ActivityType',
      'GivenBy',
    ];
    const row1 = [
      'Monthly Inspection',
      'Routine monthly inspection of equipment',
      firstMachine,
      firstUser,
      'monthly',
      `${dd}/${mm}/${yyyy}`,
      machines[0]?.assetCode ?? '',
      'INSPECTION',
      '',
    ];
    const row2 = [
      'Weekly Cleaning',
      'Clean and lubricate moving parts',
      secondMachine,
      secondUser,
      'weekly',
      `${dd}/${mm}/${yyyy}`,
      machines[1]?.assetCode ?? '',
      'CLEANING',
      '',
    ];
    const csv = [headers.join(','), row1.join(','), row2.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_maintenance_tasks.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const resolveActivityTypeId = useCallback(
    async (rawType: string, cache: Map<string, string>) => {
      const normalized = rawType.replace(/_/g, ' ').trim().toLowerCase();
      const cached = cache.get(normalized);
      if (cached) return cached;

      const match = activityTypes.find((t) => t.name.trim().toLowerCase() === normalized);
      if (match) {
        cache.set(normalized, match.id);
        return match.id;
      }

      const title = rawType
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
      const created = await createActivityType.mutateAsync({ name: title });
      cache.set(normalized, created.id);
      return created.id;
    },
    [activityTypes, createActivityType]
  );

  const saveImportedTasks = async () => {
    if (!requireCompanySelected()) return;
    const toSave = previewTasks.filter((t) => selectedTaskIds.has(t._id));
    try {
      showToast(`Importing ${toSave.length} tasks…`, 'info');
      const activityTypeIdCache = new Map<string, string>();
      await Promise.all(
        toSave.map(async (t) => {
          const activityTypeId = await resolveActivityTypeId(t.activityType, activityTypeIdCache);
          return createPlan.mutateAsync({
            machineId: t.machineId,
            assignedToId: t.assignedToId,
            title: t.title,
            description: t.description,
            activityTypeId,
            frequency: t.frequency as Parameters<typeof createPlan.mutateAsync>[0]['frequency'],
            startDate: t.parsedDate,
            creationType: 'BULK',
          });
        })
      );
      showToast(`Imported ${toSave.length} tasks`, 'success');
      refetch();
      setShowPreviewModal(false);
      setPreviewTasks([]);
      setSelectedTaskIds(new Set());
    } catch {
      showToast('Import failed', 'warning');
    }
  };

  return (
    <div
      style={{
        fontFamily: T.font,
        background: T.bg,
        color: T.fg,
        width: '100%',
        padding: isMobile ? '14px 12px' : '24px 32px',
        borderRadius: 16,
      }}
    >
      {/* ── Page Header ── */}
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'flex-start',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 16,
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
            Schedule Maintenance & Jobs
          </h1>
          <p style={{ fontSize: 13, color: T.mutedFg, marginTop: 4 }}>
            {isAdmin ? 'All tasks across team' : 'Tasks assigned to you'} · {filtered.length} tasks
            shown
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
          <Btn
            variant="ghost"
            size="sm"
            onClick={() => {
              refetch();
            }}
          >
            {Ico.refresh(14)} Refresh
          </Btn>
          <Link to="/maintenance/assign-task">
            <Btn>{Ico.plus(15)} Add Task</Btn>
          </Link>
          <input
            type="file"
            ref={excelInputRef}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importFromExcel(f);
              e.target.value = '';
            }}
            accept=".xlsx,.xls,.csv"
            style={{ display: 'none' }}
          />
          <Btn
            variant="outline"
            onClick={() => setShowImportModal(true)}
            style={{ borderColor: T.success, color: T.success, background: T.successBg }}
          >
            {Ico.list(15)} Import from Excel
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
          label="All Tasks"
          value={stats.total}
          color={T.primary}
          bg={T.primaryBg}
          icon={'🔧'}
          active={statusFilter === 'All'}
          onClick={() => setStatusFilter('All')}
        />
        <StatCard
          label="Pending"
          value={stats.pending}
          color={T.warning}
          bg={T.warningBg}
          icon={'⏳'}
          active={statusFilter === 'PENDING'}
          onClick={() => setStatusFilter(statusFilter === 'PENDING' ? 'All' : 'PENDING')}
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          color={T.success}
          bg={T.successBg}
          icon={'✓'}
          active={statusFilter === 'COMPLETED'}
          onClick={() => setStatusFilter(statusFilter === 'COMPLETED' ? 'All' : 'COMPLETED')}
        />
        <StatCard
          label="Overdue"
          value={stats.overdue}
          color={T.danger}
          bg={T.dangerBg}
          icon={'⏰'}
          active={statusFilter === 'OVERDUE'}
          onClick={() => setStatusFilter(statusFilter === 'OVERDUE' ? 'All' : 'OVERDUE')}
        />
        <StatCard
          label="Upcoming"
          value={stats.upcoming}
          color={T.info}
          bg={T.infoBg}
          icon={'📅'}
          active={statusFilter === 'UPCOMING'}
          onClick={() => setStatusFilter(statusFilter === 'UPCOMING' ? 'All' : 'UPCOMING')}
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
          <div
            style={{
              flex: 1,
              minWidth: isMobile ? '100%' : 200,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 12,
                color: T.mutedFg,
                pointerEvents: 'none',
                display: 'flex',
              }}
            >
              {Ico.search(15)}
            </div>
            <TextInput
              placeholder="Search by task name, machine, asset code, assignee…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: T.mutedFg, display: 'flex' }}>{Ico.filter(14)}</span>
            <Dropdown
              value={statusFilter}
              onChange={(v) => setStatusFilter(v)}
              options={[
                { value: 'All', label: 'All Statuses' },
                { value: 'PENDING', label: 'Pending' },
                { value: 'PENDING_APPROVAL', label: 'Awaiting Approval' },
                { value: 'COMPLETION_REJECTED', label: 'Completion Rejected' },
                { value: 'ON_HOLD', label: 'On Hold' },
                { value: 'OVERDUE', label: 'Overdue' },
                { value: 'ON_LEAVE', label: 'On Leave (needs transfer)' },
                { value: 'UPCOMING', label: 'Upcoming' },
                { value: 'HISTORY', label: 'History' },
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'COMPLETED_LATE', label: 'Completed Late' },
                { value: 'MISSED', label: 'Missed' },
                { value: 'SKIPPED', label: 'Skipped' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ]}
              style={{ fontSize: 12 }}
            />
          </div>
          <Dropdown
            value={freqFilter}
            onChange={setFreqFilter}
            options={[
              { value: 'All Frequencies', label: 'All Frequencies' },
              ...Object.keys(PLAN_FREQUENCY_LABELS)
                .filter((f) => f !== 'RUNNING_HOURS' && f !== 'METER_BASED')
                .map((f) => ({
                  value: f,
                  label: PLAN_FREQUENCY_LABELS[f as PlanFrequency] || f,
                })),
            ]}
            style={{ fontSize: 12 }}
          />
          <Dropdown
            value={assigneeFilter}
            onChange={setAssigneeFilter}
            options={[
              { value: 'All', label: 'All Assignees' },
              ...users.map((u) => ({ value: u.id, label: u.name })),
            ]}
            style={{ fontSize: 12 }}
          />
          <Dropdown
            value={givenByFilter}
            onChange={setGivenByFilter}
            options={[
              { value: 'All', label: 'Given By: All' },
              ...users.map((u) => ({ value: u.id, label: u.name })),
            ]}
            style={{ fontSize: 12 }}
          />
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              fontWeight: 600,
              background: showAdvanced ? T.primaryBg : T.muted,
              border: `1px solid ${showAdvanced ? T.primary : T.border}`,
              borderRadius: 8,
              padding: '7px 12px',
              cursor: 'pointer',
              color: showAdvanced ? T.primary : T.mutedFg,
              transition: 'all .15s',
              fontFamily: 'inherit',
            }}
          >
            {showAdvanced ? Ico.chevUp(13) : Ico.chevDown(13)} Date
          </button>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
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
              {Ico.x(12)} Clear
            </button>
          )}
        </div>
        {showAdvanced && (
          <div
            style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'stretch' : 'center',
              gap: 12,
              marginTop: 12,
              paddingTop: 12,
              borderTop: `1px solid ${T.border}`,
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                width: isMobile ? '100%' : 'auto',
              }}
            >
              <span style={{ fontSize: 11, color: T.mutedFg, fontWeight: 600 }}>Due From</span>
              <TextInput
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={{ fontSize: 12, width: isMobile ? '100%' : 140 }}
              />
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                width: isMobile ? '100%' : 'auto',
              }}
            >
              <span style={{ fontSize: 11, color: T.mutedFg, fontWeight: 600 }}>Due To</span>
              <TextInput
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={{ fontSize: 12, width: isMobile ? '100%' : 140 }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Task Table ── */}
      <div
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 14,
          overflow: 'hidden',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile
                ? `190px${hasTenantColumn ? ' 130px' : ''} 120px 200px 200px 140px 140px 130px 140px 130px 120px 90px 130px`
                : `190px${hasTenantColumn ? ' 1fr' : ''} 120px 1.4fr 1.6fr 1fr 1fr 1fr 1fr 1fr 1fr 90px 1fr`,
              minWidth: hasTenantColumn ? 2070 : 1940,
              gap: 16,
              background: T.muted,
              borderBottom: `1px solid ${T.border}`,
              padding: '10px 20px',
            }}
          >
            {[
              'Actions',
              ...(hasTenantColumn ? ['Company'] : []),
              'Occurrence ID',
              'Task / Plan',
              'Description',
              'Machine',
              'Machine Part',
              'Given By',
              'Assignee',
              'Frequency',
              'Due Date',
              'Creation',
              'Status',
            ].map((h) => (
              <div
                key={h}
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '.07em',
                  color: T.mutedFg,
                  textTransform: 'uppercase' as const,
                  paddingLeft: h === 'Task / Plan' ? 16 : 0,
                }}
              >
                {h}
              </div>
            ))}
          </div>

          {isLoading && (
            <div
              style={{ padding: '48px 20px', textAlign: 'center', color: T.mutedFg, fontSize: 14 }}
            >
              Loading tasks…
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div style={{ padding: '64px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>
                {statusFilter === 'HISTORY' ? '🗂️' : '📋'}
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: T.fg, marginBottom: 6 }}>
                {hasActiveFilters
                  ? 'No tasks match your filters'
                  : isAdmin
                    ? 'No tasks yet'
                    : 'No tasks assigned to you'}
              </div>
              <div style={{ fontSize: 13, color: T.mutedFg }}>
                {isAdmin
                  ? 'Create a task using the "Add Task" button above.'
                  : 'Tasks assigned to you will appear here.'}
              </div>
            </div>
          )}

          {!isLoading &&
            filtered.map((wo, i) => {
              const sm = STATUS_META[wo.status] ?? STATUS_META.PENDING;
              const freq = wo.plan?.frequency;
              const fc = freq ? (FREQ_COLORS[freq] ?? FREQ_COLORS.ONE_TIME) : null;
              const overdue = isOverdue(wo);

              return (
                <div
                  key={wo.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile
                      ? `190px${hasTenantColumn ? ' 130px' : ''} 120px 200px 200px 140px 140px 130px 140px 130px 120px 90px 130px`
                      : `190px${hasTenantColumn ? ' 1fr' : ''} 120px 1.4fr 1.6fr 1fr 1fr 1fr 1fr 1fr 1fr 90px 1fr`,
                    minWidth: hasTenantColumn ? 2070 : 1940,
                    gap: 16,
                    padding: '14px 20px',
                    borderBottom: i < filtered.length - 1 ? `1px solid ${T.border}` : 'none',
                    background: overdue ? `color-mix(in oklch, ${T.danger} 4%, ${T.card})` : T.card,
                    transition: 'background .15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = `color-mix(in oklch, ${T.primary} 4%, ${T.card})`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = overdue
                      ? `color-mix(in oklch, ${T.danger} 4%, ${T.card})`
                      : T.card;
                  }}
                >
                  {/* Actions */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      flexShrink: 0,
                      paddingRight: 12,
                    }}
                  >
                    <button
                      type="button"
                      title="View details"
                      onClick={() => setViewOrder(wo)}
                      style={{
                        width: 32,
                        height: 32,
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: T.primaryBg,
                        color: T.primary,
                        border: `1px solid ${T.primary}`,
                        borderRadius: 7,
                        cursor: 'pointer',
                      }}
                    >
                      {Ico.eye(14)}
                    </button>
                    {(() => {
                      const isCompleted =
                        wo.status === 'COMPLETED' || wo.status === 'COMPLETED_LATE';
                      const isPendingApproval = wo.status === 'PENDING_APPROVAL';
                      // A work order still sitting at ON_LEAVE hasn't been transferred to
                      // anyone yet — the current assignee is the one on leave, so they
                      // can't be the one reporting progress on it. `isUpcoming` only ever
                      // returns true for PENDING/IN_PROGRESS, so without this it fell
                      // through every other lock check and stayed clickable.
                      const isOnLeave = wo.status === 'ON_LEAVE';
                      // The machine has an open breakdown (BreakdownService.report
                      // puts every active scheduled work order for it on hold) —
                      // nothing is actionable until every open breakdown on that
                      // machine is resolved, which restores this on its own.
                      // Backend rejects the update either way; this just keeps the
                      // button from inviting a click that's guaranteed to fail.
                      const isOnHold = wo.status === 'ON_HOLD';
                      const upcoming = isUpcoming(wo);
                      const isLocked =
                        isCompleted || isPendingApproval || isOnLeave || isOnHold || upcoming;
                      return (
                        <button
                          type="button"
                          title={
                            isCompleted
                              ? 'Task completed — cannot update'
                              : isPendingApproval
                                ? 'Awaiting admin approval — cannot update'
                                : isOnLeave
                                  ? 'Assignee is on leave — transfer this task in Leave Management before it can be updated'
                                  : isOnHold
                                    ? 'On hold due to a machine breakdown — resolve the breakdown before updating it'
                                    : upcoming
                                      ? 'Not due yet — cannot be processed until its due date'
                                      : 'Report update'
                          }
                          onClick={() => !isLocked && openUpdateModal(wo)}
                          disabled={isLocked}
                          style={{
                            width: 32,
                            height: 32,
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: isLocked ? T.muted : '#2563eb',
                            color: isLocked ? T.mutedFg : '#fff',
                            border: 'none',
                            borderRadius: 7,
                            cursor: isLocked ? 'not-allowed' : 'pointer',
                            opacity: isLocked ? 0.5 : 1,
                          }}
                        >
                          {Ico.check(14)}
                        </button>
                      );
                    })()}
                    {/* Editing a recurring plan's "Expected Completion Date" is really
                        just its original start date — the first time it was ever due,
                        not a deadline you'd move without also shifting every future
                        occurrence's schedule out from under it. Only ONE_TIME tasks
                        (a single, genuine deadline) are safe to edit here. */}
                    {isAdmin && wo.plan?.id && wo.plan?.frequency === 'ONE_TIME' && (
                      <button
                        type="button"
                        title="Edit Task"
                        onClick={() => setEditOrder(wo)}
                        style={{
                          width: 32,
                          height: 32,
                          flexShrink: 0,
                          borderRadius: 7,
                          border: `1px solid ${T.border}`,
                          background: T.muted,
                          color: T.mutedFg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
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
                        {Ico.edit(14)}
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        type="button"
                        title="Delete Task"
                        onClick={() => setDeleteOrder(wo)}
                        style={{
                          width: 32,
                          height: 32,
                          flexShrink: 0,
                          borderRadius: 7,
                          border: `1px solid ${T.border}`,
                          background: T.muted,
                          color: T.mutedFg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
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
                        {Ico.trash(14)}
                      </button>
                    )}
                  </div>

                  {hasTenantColumn && (
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {wo.tenant ? (
                        <Chip color={T.info} bg={T.infoBg}>
                          {wo.tenant.name}
                        </Chip>
                      ) : (
                        <span style={{ fontSize: 12, color: T.mutedFg }}>—</span>
                      )}
                    </div>
                  )}

                  {/* Occurrence ID */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: 11,
                      fontFamily: 'monospace',
                      color: T.mutedFg,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {wo.workOrderCode || `#${wo.id.slice(-6)}`}
                  </div>

                  {/* Task name */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 3,
                      justifyContent: 'center',
                      paddingLeft: 16,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.fg, lineHeight: 1.3 }}>
                      {wo.plan?.title ??
                        (wo.workOrderCode
                          ? `WO ${wo.workOrderCode}`
                          : `Work Order #${wo.id.slice(-6)}`)}
                    </div>
                    {wo.plan?.activityType && (
                      <div
                        style={{
                          fontSize: 10,
                          color: T.mutedFg,
                          fontWeight: 500,
                          textTransform: 'uppercase' as const,
                          letterSpacing: '.04em',
                        }}
                      >
                        {wo.plan.activityType.name}
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {wo.plan?.description ? (
                      <div
                        title={wo.plan.description}
                        style={{
                          fontSize: 12,
                          color: T.mutedFg,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '100%',
                        }}
                      >
                        {truncate(wo.plan.description, 60)}
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: T.mutedFg }}>—</span>
                    )}
                  </div>

                  {/* Machine */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      gap: 2,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 500, color: T.fg }}>
                      {wo.machine?.name ?? '—'}
                    </div>
                    {wo.machine?.assetCode && (
                      <div style={{ fontSize: 10, color: T.mutedFg, fontFamily: 'monospace' }}>
                        {wo.machine.assetCode}
                      </div>
                    )}
                  </div>

                  {/* Machine Part */}
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ fontSize: 13, color: T.fg }}>
                      {(wo.machinePart ?? wo.plan?.machinePart)?.name ?? '—'}
                    </div>
                  </div>

                  {/* Given By */}
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div
                      style={{
                        fontSize: 13,
                        color: T.fg,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {wo.plan?.createdBy?.name ?? '—'}
                    </div>
                  </div>

                  {/* Assignee */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    {wo.currentAssignee ? (
                      <>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            background: T.primaryBg,
                            color: T.primary,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 11,
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {wo.currentAssignee.name.charAt(0).toUpperCase()}
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            color: T.fg,
                            fontWeight: 500,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {wo.currentAssignee.name}
                        </div>
                      </>
                    ) : (
                      <span style={{ fontSize: 12, color: T.mutedFg }}>Unassigned</span>
                    )}
                  </div>

                  {/* Frequency */}
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {fc && freq ? (
                      <Chip color={fc.color} bg={fc.bg}>
                        {PLAN_FREQUENCY_LABELS[freq as PlanFrequency] || freq}
                      </Chip>
                    ) : (
                      <span style={{ fontSize: 12, color: T.mutedFg }}>—</span>
                    )}
                  </div>

                  {/* Due date */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      gap: 2,
                    }}
                  >
                    <div
                      style={{ fontSize: 13, fontWeight: 500, color: overdue ? T.danger : T.fg }}
                    >
                      {fmtDate(wo.actualDueDate)}
                    </div>
                    {overdue && (
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: T.danger,
                          textTransform: 'uppercase' as const,
                          letterSpacing: '.05em',
                        }}
                      >
                        Overdue
                      </div>
                    )}
                    {isUpcoming(wo) && (
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: T.info,
                          textTransform: 'uppercase' as const,
                          letterSpacing: '.05em',
                        }}
                      >
                        Upcoming
                      </div>
                    )}
                  </div>

                  {/* Creation */}
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {wo.plan?.creationType === 'BULK' ? (
                      <Chip color={T.info} bg={T.infoBg}>
                        Bulk
                      </Chip>
                    ) : (
                      <Chip color={T.mutedFg} bg={T.muted}>
                        Manual
                      </Chip>
                    )}
                  </div>

                  {/* Status */}
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Chip color={sm.color} bg={sm.bg}>
                      {sm.label}
                    </Chip>
                  </div>
                </div>
              );
            })}
        </div>

        {!isLoading && filtered.length > 0 && (
          <div
            style={{
              padding: '12px 20px',
              borderTop: `1px solid ${T.border}`,
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              justifyContent: 'space-between',
              alignItems: isMobile ? 'flex-start' : 'center',
              gap: isMobile ? 4 : 0,
            }}
          >
            <span style={{ fontSize: 12, color: T.mutedFg }}>
              Showing {filtered.length} of {woData?.pagination?.total ?? stats.total} tasks
              {hasActiveFilters ? ' (filtered)' : ''}
            </span>
            <PaginationBar
              page={page}
              totalPages={woData?.pagination?.totalPages ?? 1}
              onPageChange={setPage}
            />
            <span style={{ fontSize: 12, color: T.mutedFg }}>
              {isAdmin ? 'Admin view — all team tasks' : 'Your assigned tasks only'}
            </span>
          </div>
        )}
      </div>

      {/* ── View Detail Modal ── */}
      {viewOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            zIndex: 9500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isMobile ? 12 : 24,
          }}
          onClick={() => setViewOrder(null)}
        >
          <div
            style={{
              background: T.card,
              borderRadius: 16,
              width: '100%',
              maxWidth: 640,
              maxHeight: '88vh',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              fontFamily: T.font,
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const sm = STATUS_META[viewOrder.status] ?? STATUS_META.PENDING;
              const machinePart = viewOrder.machinePart ?? viewOrder.plan?.machinePart ?? null;
              return (
                <>
                  {/* Accent bar */}
                  <div style={{ height: 5, width: '100%', background: sm.color, flexShrink: 0 }} />

                  <div
                    style={{
                      padding: isMobile ? '18px 16px' : '24px 32px',
                      overflowY: 'auto',
                    }}
                  >
                    {/* Header */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: 12,
                        marginBottom: 20,
                      }}
                    >
                      <div
                        style={{ display: 'flex', gap: 14, alignItems: 'flex-start', minWidth: 0 }}
                      >
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            background: sm.bg,
                            color: sm.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {Ico.wrench(20)}
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
                            Work Order Details
                          </p>
                          <h2
                            style={{
                              fontSize: 18,
                              fontWeight: 700,
                              color: T.fg,
                              margin: 0,
                              lineHeight: 1.3,
                              wordBreak: 'break-word',
                            }}
                          >
                            {viewOrder.plan?.title ??
                              (viewOrder.workOrderCode
                                ? `WO ${viewOrder.workOrderCode}`
                                : `Work Order #${viewOrder.id.slice(-6)}`)}
                          </h2>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setViewOrder(null)}
                        style={{
                          background: T.muted,
                          border: `1px solid ${T.border}`,
                          borderRadius: 8,
                          width: 32,
                          height: 32,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: T.mutedFg,
                          flexShrink: 0,
                        }}
                      >
                        {Ico.x(14)}
                      </button>
                    </div>

                    {/* Status row */}
                    <div style={{ display: 'flex', gap: 10, marginBottom: 22, flexWrap: 'wrap' }}>
                      <Chip color={sm.color} bg={sm.bg}>
                        {sm.label}
                      </Chip>
                      {viewOrder.plan?.frequency &&
                        (() => {
                          const fc = FREQ_COLORS[viewOrder.plan.frequency] ?? FREQ_COLORS.ONE_TIME;
                          return (
                            <Chip color={fc.color} bg={fc.bg}>
                              {PLAN_FREQUENCY_LABELS[viewOrder.plan.frequency as PlanFrequency] ??
                                viewOrder.plan.frequency}
                            </Chip>
                          );
                        })()}
                      {viewOrder.plan?.creationType === 'BULK' ? (
                        <Chip color={T.info} bg={T.infoBg}>
                          Bulk Import
                        </Chip>
                      ) : (
                        <Chip color={T.mutedFg} bg={T.muted}>
                          Manual
                        </Chip>
                      )}
                      {viewOrder.slaBreach && (
                        <Chip color={T.danger} bg={T.dangerBg}>
                          SLA Breach
                        </Chip>
                      )}
                    </div>

                    {/* Grid details */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)',
                        gap: 10,
                        marginBottom: 18,
                      }}
                    >
                      {[
                        {
                          label: 'Occurrence ID',
                          value: viewOrder.workOrderCode || viewOrder.id,
                        },
                        {
                          label: 'Task / Plan ID',
                          value: viewOrder.plan?.planCode || viewOrder.plan?.id || '—',
                        },
                        {
                          label: 'Machine',
                          value: viewOrder.machine
                            ? `${viewOrder.machine.name}${viewOrder.machine.assetCode ? ` (${viewOrder.machine.assetCode})` : ''}`
                            : '—',
                        },
                        { label: 'Machine Part', value: machinePart?.name ?? '—' },
                        {
                          label: 'Assignee',
                          value: viewOrder.currentAssignee?.name ?? 'Unassigned',
                        },
                        { label: 'Given By', value: viewOrder.plan?.createdBy?.name ?? '—' },
                        { label: 'Due Date', value: fmtDate(viewOrder.actualDueDate) },
                        { label: 'Scheduled Date', value: fmtDate(viewOrder.scheduledDate) },
                        { label: 'Started At', value: fmtDate(viewOrder.startedAt) },
                        { label: 'Completed At', value: fmtDate(viewOrder.completedAt) },
                        { label: 'Completed By', value: viewOrder.completedBy?.name ?? '—' },
                        {
                          label: 'Activity Type',
                          value: viewOrder.plan?.activityType?.name ?? '—',
                        },
                        {
                          label: 'Time Taken',
                          value:
                            viewOrder.actualMinutesTaken != null
                              ? `${viewOrder.actualMinutesTaken} min`
                              : '—',
                        },
                        { label: 'Type', value: viewOrder.type ?? '—' },
                        {
                          label: 'Creation',
                          value: viewOrder.plan?.creationType === 'BULK' ? 'Bulk Import' : 'Manual',
                        },
                      ].map(({ label, value }) => (
                        <div
                          key={label}
                          style={{
                            background: T.muted,
                            borderRadius: 10,
                            padding: '9px 12px',
                          }}
                        >
                          <div
                            style={{
                              fontSize: 9.5,
                              fontWeight: 700,
                              letterSpacing: '.06em',
                              color: T.mutedFg,
                              textTransform: 'uppercase' as const,
                              marginBottom: 3,
                            }}
                          >
                            {label}
                          </div>
                          <div
                            style={{
                              fontSize: 13,
                              color: T.fg,
                              fontWeight: 600,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={value}
                          >
                            {value}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Attached Document */}
                    {viewOrder.plan?.documentUrl && (
                      <div style={{ marginBottom: 14 }}>
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: '.06em',
                            color: T.mutedFg,
                            textTransform: 'uppercase' as const,
                            marginBottom: 6,
                          }}
                        >
                          Attached Document
                        </div>
                        <a
                          href={viewOrder.plan.documentUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            background: T.muted,
                            border: `1px solid ${T.border}`,
                            borderRadius: 10,
                            padding: '10px 14px',
                            textDecoration: 'none',
                          }}
                        >
                          <span
                            style={{
                              color: T.primary,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              background: T.card,
                              flexShrink: 0,
                            }}
                          >
                            {Ico.fileText(15)}
                          </span>
                          <span
                            style={{
                              flex: 1,
                              fontSize: 13,
                              color: T.fg,
                              fontWeight: 500,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            View attached document
                          </span>
                          <span style={{ color: T.mutedFg, display: 'flex', flexShrink: 0 }}>
                            {Ico.download(14)}
                          </span>
                        </a>
                      </div>
                    )}

                    {viewOrder.plan?.description && (
                      <div style={{ marginBottom: 14 }}>
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: '.06em',
                            color: T.mutedFg,
                            textTransform: 'uppercase' as const,
                            marginBottom: 4,
                          }}
                        >
                          Description
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            color: T.fg,
                            lineHeight: 1.6,
                            background: T.muted,
                            borderRadius: 8,
                            padding: '10px 14px',
                          }}
                        >
                          {viewOrder.plan.description}
                        </div>
                      </div>
                    )}

                    {viewOrder.completionNote && (
                      <div style={{ marginBottom: 14 }}>
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: '.06em',
                            color: T.mutedFg,
                            textTransform: 'uppercase' as const,
                            marginBottom: 4,
                          }}
                        >
                          Notes
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            color: T.fg,
                            lineHeight: 1.6,
                            background: T.muted,
                            borderRadius: 8,
                            padding: '10px 14px',
                          }}
                        >
                          {viewOrder.completionNote}
                        </div>
                      </div>
                    )}

                    {/* Replacements if any stored in checklistResponses */}
                    {(() => {
                      const reps = viewOrderDetail?.data?.checklistResponses?.replacements ?? [];
                      if (!reps.length) return null;
                      return (
                        <div style={{ marginBottom: 14 }}>
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              letterSpacing: '.06em',
                              color: T.mutedFg,
                              textTransform: 'uppercase' as const,
                              marginBottom: 8,
                            }}
                          >
                            Replaced Items
                          </div>
                          <div style={{ overflowX: 'auto' }}>
                            <table
                              style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}
                            >
                              <thead>
                                <tr style={{ background: T.muted }}>
                                  {['Item Name', 'Qty', 'Cost'].map((h) => (
                                    <th
                                      key={h}
                                      style={{
                                        padding: '7px 10px',
                                        textAlign: 'left',
                                        fontWeight: 600,
                                        color: T.mutedFg,
                                      }}
                                    >
                                      {h}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {reps.map((r, idx) => (
                                  <tr
                                    key={`rep-${idx}`}
                                    style={{ borderBottom: `1px solid ${T.border}` }}
                                  >
                                    <td style={{ padding: '8px 10px', color: T.fg }}>{r.name}</td>
                                    <td style={{ padding: '8px 10px', color: T.fg }}>
                                      {r.quantity}
                                    </td>
                                    <td style={{ padding: '8px 10px', color: T.fg }}>₹{r.cost}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })()}

                    {viewOrder.skipReason && (
                      <div style={{ marginBottom: 14 }}>
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: '.06em',
                            color: T.danger,
                            textTransform: 'uppercase' as const,
                            marginBottom: 4,
                          }}
                        >
                          Skip Reason
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            color: T.fg,
                            background: T.dangerBg,
                            borderRadius: 8,
                            padding: '10px 14px',
                          }}
                        >
                          {viewOrder.skipReason}
                        </div>
                      </div>
                    )}

                    {viewOrder.cancelReason && (
                      <div style={{ marginBottom: 14 }}>
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: '.06em',
                            color: T.danger,
                            textTransform: 'uppercase' as const,
                            marginBottom: 4,
                          }}
                        >
                          Cancel / Hold Reason
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            color: T.fg,
                            background: T.dangerBg,
                            borderRadius: 8,
                            padding: '10px 14px',
                          }}
                        >
                          {viewOrder.cancelReason}
                        </div>
                      </div>
                    )}

                    {/* ── Approval details ── */}
                    {viewOrder.approvalRequest && (
                      <div style={{ marginBottom: 14 }}>
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: '.06em',
                            color: T.mutedFg,
                            textTransform: 'uppercase' as const,
                            marginBottom: 8,
                          }}
                        >
                          Completion & Approval
                        </div>
                        <div
                          style={{
                            background: T.muted,
                            borderRadius: 10,
                            padding: '12px 16px',
                            display: 'flex',
                            flexDirection: 'column' as const,
                            gap: 10,
                          }}
                        >
                          {/* Submission row */}
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                              gap: '8px 16px',
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  fontSize: 10,
                                  color: T.mutedFg,
                                  fontWeight: 600,
                                  marginBottom: 2,
                                }}
                              >
                                Submitted By
                              </div>
                              <div style={{ fontSize: 13, color: T.fg, fontWeight: 500 }}>
                                {viewOrder.approvalRequest.submittedBy?.name ??
                                  viewOrder.completedBy?.name ??
                                  '—'}
                              </div>
                            </div>
                            <div>
                              <div
                                style={{
                                  fontSize: 10,
                                  color: T.mutedFg,
                                  fontWeight: 600,
                                  marginBottom: 2,
                                }}
                              >
                                Completed At
                              </div>
                              <div style={{ fontSize: 13, color: T.fg, fontWeight: 500 }}>
                                {viewOrder.completedAt
                                  ? new Date(viewOrder.completedAt).toLocaleString('en-IN', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      hour12: true,
                                    })
                                  : '—'}
                              </div>
                            </div>
                          </div>

                          {/* Technician note */}
                          {viewOrder.approvalRequest.submissionNote && (
                            <div>
                              <div
                                style={{
                                  fontSize: 10,
                                  color: T.mutedFg,
                                  fontWeight: 600,
                                  marginBottom: 2,
                                }}
                              >
                                Technician Note
                              </div>
                              <div
                                style={{
                                  fontSize: 13,
                                  color: T.fg,
                                  background: T.card,
                                  borderRadius: 6,
                                  padding: '8px 10px',
                                }}
                              >
                                {viewOrder.approvalRequest.submissionNote}
                              </div>
                            </div>
                          )}

                          {/* Review row — only if reviewed */}
                          {viewOrder.approvalRequest.reviewedAt && (
                            <>
                              <div style={{ height: 1, background: T.border }} />
                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                                  gap: '8px 16px',
                                }}
                              >
                                <div>
                                  <div
                                    style={{
                                      fontSize: 10,
                                      color: T.mutedFg,
                                      fontWeight: 600,
                                      marginBottom: 2,
                                    }}
                                  >
                                    Reviewed By
                                  </div>
                                  <div style={{ fontSize: 13, color: T.fg, fontWeight: 500 }}>
                                    {viewOrder.approvalRequest.reviewedBy?.name ?? viewOrder.approvalRequest.reviewer?.name ?? '—'}
                                  </div>
                                </div>
                                <div>
                                  <div
                                    style={{
                                      fontSize: 10,
                                      color: T.mutedFg,
                                      fontWeight: 600,
                                      marginBottom: 2,
                                    }}
                                  >
                                    {viewOrder.approvalRequest.status === 'APPROVED'
                                      ? 'Approved At'
                                      : 'Rejected At'}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: 13,
                                      color:
                                        viewOrder.approvalRequest.status === 'APPROVED'
                                          ? T.success
                                          : T.danger,
                                      fontWeight: 500,
                                    }}
                                  >
                                    {new Date(viewOrder.approvalRequest.reviewedAt).toLocaleString(
                                      'en-IN',
                                      {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: true,
                                      }
                                    )}
                                  </div>
                                </div>
                              </div>
                              {/* Admin note */}
                              {viewOrder.approvalRequest.reviewNote && (
                                <div>
                                  <div
                                    style={{
                                      fontSize: 10,
                                      color: T.mutedFg,
                                      fontWeight: 600,
                                      marginBottom: 2,
                                    }}
                                  >
                                    Admin Note
                                  </div>
                                  <div
                                    style={{
                                      fontSize: 13,
                                      color: T.fg,
                                      background:
                                        viewOrder.approvalRequest.status === 'APPROVED'
                                          ? T.successBg
                                          : T.dangerBg,
                                      borderRadius: 6,
                                      padding: '8px 10px',
                                    }}
                                  >
                                    {viewOrder.approvalRequest.reviewNote}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ── Status History ── */}
                    {(() => {
                      const logs = viewOrderDetail?.data?.statusLogs;
                      if (!logs || logs.length === 0) return null;
                      const STATUS_LABEL: Record<string, string> = {
                        PENDING: 'Pending',
                        IN_PROGRESS: 'In Progress',
                        PENDING_APPROVAL: 'Awaiting Approval',
                        COMPLETION_REJECTED: 'Completion Rejected',
                        COMPLETED: 'Completed',
                        COMPLETED_LATE: 'Completed Late',
                        OVERDUE: 'Overdue',
                        ON_LEAVE: 'On Leave',
                        MISSED: 'Missed',
                        SKIPPED: 'Skipped',
                        CANCELLED: 'Cancelled',
                        ON_HOLD: 'On Hold',
                      };
                      return (
                        <div style={{ marginBottom: 14 }}>
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: T.mutedFg,
                              textTransform: 'uppercase' as const,
                              letterSpacing: '.06em',
                              marginBottom: 10,
                            }}
                          >
                            Status History
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                            {logs.map((log, idx) => {
                              const sm =
                                STATUS_META[log.toStatus as WorkOrderStatus] ?? STATUS_META.PENDING;
                              return (
                                <div
                                  key={log.id}
                                  style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}
                                >
                                  {/* Timeline line + dot */}
                                  <div
                                    style={{
                                      display: 'flex',
                                      flexDirection: 'column',
                                      alignItems: 'center',
                                      width: 20,
                                      flexShrink: 0,
                                    }}
                                  >
                                    <div
                                      style={{
                                        width: 10,
                                        height: 10,
                                        borderRadius: '50%',
                                        background: sm.color,
                                        border: `2px solid ${sm.color}`,
                                        flexShrink: 0,
                                        marginTop: 4,
                                      }}
                                    />
                                    {idx < logs.length - 1 && (
                                      <div
                                        style={{
                                          width: 2,
                                          flex: 1,
                                          background: T.border,
                                          minHeight: 20,
                                        }}
                                      />
                                    )}
                                  </div>
                                  <div
                                    style={{
                                      paddingBottom: idx < logs.length - 1 ? 14 : 0,
                                      flex: 1,
                                      minWidth: 0,
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        flexWrap: 'wrap' as const,
                                      }}
                                    >
                                      <span
                                        style={{
                                          fontSize: 12,
                                          fontWeight: 600,
                                          color: sm.color,
                                          background: sm.bg,
                                          borderRadius: 5,
                                          padding: '2px 8px',
                                        }}
                                      >
                                        {STATUS_LABEL[log.toStatus] ?? log.toStatus}
                                      </span>
                                      {log.sendMachine && (
                                        <span
                                          style={{
                                            fontSize: 11,
                                            fontWeight: 600,
                                            color: T.info,
                                            background: T.infoBg,
                                            borderRadius: 5,
                                            padding: '2px 8px',
                                            textTransform: 'capitalize' as const,
                                          }}
                                        >
                                          {log.sendMachine}
                                        </span>
                                      )}
                                    </div>
                                    <div style={{ fontSize: 11, color: T.mutedFg, marginTop: 2 }}>
                                      {log.changedBy?.name ?? 'System'} ·{' '}
                                      {new Date(log.createdAt).toLocaleString('en-IN', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: true,
                                      })}
                                    </div>
                                    {log.note && (
                                      <div
                                        style={{
                                          fontSize: 11,
                                          color: T.fg,
                                          marginTop: 3,
                                          background: T.muted,
                                          borderRadius: 5,
                                          padding: '4px 8px',
                                        }}
                                      >
                                        {log.note}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── Edit Task Modal ── */}
      {editOrder && (
        <EditTaskModal
          workOrder={editOrder}
          onClose={() => setEditOrder(null)}
          onSaved={() => {
            refetch();
            showToast('Task updated successfully', 'success');
          }}
        />
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteOrder && (
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
          onClick={() => !deleteWorkOrderMutation.isPending && setDeleteOrder(null)}
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
                {Ico.trash(18)}
              </div>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: T.fg, margin: '0 0 4px' }}>
                  Delete Task
                </h2>
                <p style={{ fontSize: 13, color: T.mutedFg, margin: 0, lineHeight: 1.5 }}>
                  Are you sure you want to delete{' '}
                  <strong style={{ color: T.fg }}>
                    {deleteOrder.plan?.title ??
                      (deleteOrder.workOrderCode
                        ? `WO ${deleteOrder.workOrderCode}`
                        : `Work Order #${deleteOrder.id.slice(-6)}`)}
                  </strong>
                  ? It will be removed from all views and excluded from cost calculations. This
                  cannot be undone from here.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Btn
                variant="outline"
                onClick={() => setDeleteOrder(null)}
                disabled={deleteWorkOrderMutation.isPending}
              >
                Cancel
              </Btn>
              <Btn
                onClick={handleDeleteConfirm}
                disabled={deleteWorkOrderMutation.isPending}
                style={{ background: T.danger, color: '#fff' }}
              >
                {deleteWorkOrderMutation.isPending ? 'Deleting…' : 'Delete Task'}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* ── Update / Report Modal ── */}
      {updateOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            zIndex: 9500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isMobile ? 12 : 24,
          }}
          onClick={() => setUpdateOrder(null)}
        >
          <div
            style={{
              background: T.card,
              borderRadius: 14,
              padding: isMobile ? '18px 16px' : '28px 32px',
              maxWidth: 560,
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
                alignItems: 'flex-start',
                marginBottom: 6,
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: 11,
                    color: T.mutedFg,
                    margin: '0 0 4px',
                    textTransform: 'uppercase' as const,
                    letterSpacing: '.06em',
                    fontWeight: 600,
                  }}
                >
                  Report Update
                </p>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: T.fg, margin: 0 }}>
                  {updateOrder.plan?.title ??
                    (updateOrder.workOrderCode
                      ? `WO ${updateOrder.workOrderCode}`
                      : `Work Order #${updateOrder.id.slice(-6)}`)}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setUpdateOrder(null)}
                style={{
                  background: T.muted,
                  border: `1px solid ${T.border}`,
                  borderRadius: 8,
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: T.mutedFg,
                }}
              >
                {Ico.x(14)}
              </button>
            </div>

            {/* Task info summary */}
            <div
              style={{
                background: T.muted,
                borderRadius: 10,
                padding: '12px 16px',
                marginBottom: 22,
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px 24px',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: 10,
                    color: T.mutedFg,
                    fontWeight: 600,
                    textTransform: 'uppercase' as const,
                    letterSpacing: '.05em',
                  }}
                >
                  Machine{' '}
                </span>
                <span style={{ fontSize: 12, color: T.fg, fontWeight: 500 }}>
                  {updateOrder.machine?.name ?? '—'}
                </span>
              </div>
              <div>
                <span
                  style={{
                    fontSize: 10,
                    color: T.mutedFg,
                    fontWeight: 600,
                    textTransform: 'uppercase' as const,
                    letterSpacing: '.05em',
                  }}
                >
                  Due{' '}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: isOverdue(updateOrder) ? T.danger : T.fg,
                    fontWeight: 500,
                  }}
                >
                  {fmtDate(updateOrder.actualDueDate)}
                </span>
              </div>
              <div>
                <span
                  style={{
                    fontSize: 10,
                    color: T.mutedFg,
                    fontWeight: 600,
                    textTransform: 'uppercase' as const,
                    letterSpacing: '.05em',
                  }}
                >
                  Current Status{' '}
                </span>
                {(() => {
                  const sm = STATUS_META[updateOrder.status] ?? STATUS_META.PENDING;
                  return (
                    <Chip color={sm.color} bg={sm.bg}>
                      {sm.label}
                    </Chip>
                  );
                })()}
              </div>
            </div>

            {/* Task Status field */}
            <div style={{ marginBottom: 18 }}>
              <label
                htmlFor="report-status"
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: T.fg,
                  marginBottom: 7,
                }}
              >
                Task Status *
              </label>
              <select
                id="report-status"
                value={reportStatus}
                onChange={(e) =>
                  setReportStatus(e.target.value as 'complete' | 'repair' | 'breakdown')
                }
                style={{
                  width: '100%',
                  background: T.muted,
                  border: `1px solid ${T.border}`,
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontSize: 13,
                  color: T.fg,
                  fontFamily: 'inherit',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="complete">Complete — Submit for admin approval</option>
                {isAdmin && <option value="repair">Task shift for repair</option>}
              </select>
            </div>

            {/* Is anything replaced — only shown when status is complete */}
            {reportStatus === 'complete' && (
              <div style={{ marginBottom: 18 }}>
                <label
                  htmlFor="is-replaced"
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    color: T.fg,
                    marginBottom: 7,
                  }}
                >
                  Is Anything Replaced?
                </label>
                <select
                  id="is-replaced"
                  value={isReplaced}
                  onChange={(e) => setIsReplaced(e.target.value as 'yes' | 'no')}
                  style={{
                    width: '100%',
                    background: T.muted,
                    border: `1px solid ${T.border}`,
                    borderRadius: 8,
                    padding: '10px 14px',
                    fontSize: 13,
                    color: T.fg,
                    fontFamily: 'inherit',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
            )}

            {/* Replacement items */}
            {reportStatus === 'complete' && isReplaced === 'yes' && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.fg, marginBottom: 10 }}>
                  Replacement Details
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {replacements.map((item, idx) => (
                    <div
                      key={`repl-${idx}`}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 80px 100px 32px',
                        gap: 8,
                        alignItems: 'center',
                        background: T.muted,
                        borderRadius: 8,
                        padding: '10px 12px',
                        border: `1px solid ${T.border}`,
                      }}
                    >
                      <div>
                        <label
                          htmlFor={`repl-name-${idx}`}
                          style={{
                            fontSize: 10,
                            color: T.mutedFg,
                            fontWeight: 600,
                            display: 'block',
                            marginBottom: 3,
                          }}
                        >
                          Item Name
                        </label>
                        <input
                          id={`repl-name-${idx}`}
                          type="text"
                          placeholder="e.g. Belt, Filter"
                          value={item.name}
                          onChange={(e) => {
                            const next = [...replacements];
                            next[idx] = { ...next[idx], name: e.target.value };
                            setReplacements(next);
                          }}
                          style={{
                            width: '100%',
                            background: T.card,
                            border: `1px solid ${T.border}`,
                            borderRadius: 6,
                            padding: '6px 10px',
                            fontSize: 12,
                            color: T.fg,
                            fontFamily: 'inherit',
                            outline: 'none',
                          }}
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={`repl-qty-${idx}`}
                          style={{
                            fontSize: 10,
                            color: T.mutedFg,
                            fontWeight: 600,
                            display: 'block',
                            marginBottom: 3,
                          }}
                        >
                          Qty
                        </label>
                        <input
                          id={`repl-qty-${idx}`}
                          type="number"
                          min={1}
                          value={item.quantity}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const next = [...replacements];
                            const parsed = parseInt(e.target.value, 10);
                            next[idx] = {
                              ...next[idx],
                              quantity: Number.isNaN(parsed) ? ('' as unknown as number) : parsed,
                            };
                            setReplacements(next);
                          }}
                          onBlur={(e) => {
                            const next = [...replacements];
                            const parsed = parseInt(e.target.value, 10);
                            next[idx] = {
                              ...next[idx],
                              quantity: Number.isNaN(parsed) || parsed < 1 ? 1 : parsed,
                            };
                            setReplacements(next);
                          }}
                          style={{
                            width: '100%',
                            background: T.card,
                            border: `1px solid ${T.border}`,
                            borderRadius: 6,
                            padding: '6px 10px',
                            fontSize: 12,
                            color: T.fg,
                            fontFamily: 'inherit',
                            outline: 'none',
                          }}
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={`repl-cost-${idx}`}
                          style={{
                            fontSize: 10,
                            color: T.mutedFg,
                            fontWeight: 600,
                            display: 'block',
                            marginBottom: 3,
                          }}
                        >
                          Cost (₹)
                        </label>
                        <input
                          id={`repl-cost-${idx}`}
                          type="number"
                          min={0}
                          value={item.cost}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const next = [...replacements];
                            const parsed = parseFloat(e.target.value);
                            next[idx] = {
                              ...next[idx],
                              cost: Number.isNaN(parsed) ? ('' as unknown as number) : parsed,
                            };
                            setReplacements(next);
                          }}
                          onBlur={(e) => {
                            const next = [...replacements];
                            const parsed = parseFloat(e.target.value);
                            next[idx] = {
                              ...next[idx],
                              cost: Number.isNaN(parsed) || parsed < 0 ? 0 : parsed,
                            };
                            setReplacements(next);
                          }}
                          style={{
                            width: '100%',
                            background: T.card,
                            border: `1px solid ${T.border}`,
                            borderRadius: 6,
                            padding: '6px 10px',
                            fontSize: 12,
                            color: T.fg,
                            fontFamily: 'inherit',
                            outline: 'none',
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setReplacements(replacements.filter((_, i) => i !== idx))}
                        disabled={replacements.length === 1}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 6,
                          border: `1px solid ${T.border}`,
                          background: 'transparent',
                          color: replacements.length === 1 ? T.mutedFg : T.danger,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: replacements.length === 1 ? 'not-allowed' : 'pointer',
                          opacity: replacements.length === 1 ? 0.4 : 1,
                          alignSelf: 'flex-end',
                        }}
                      >
                        {Ico.trash(13)}
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setReplacements([...replacements, { name: '', quantity: 1, cost: 0 }])
                  }
                  style={{
                    marginTop: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    color: T.primary,
                    background: T.primaryBg,
                    border: `1px dashed ${T.primary}`,
                    borderRadius: 8,
                    padding: '8px 14px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {Ico.plus(13)} Add More
                </button>
              </div>
            )}

            {/* Notes */}
            <div style={{ marginBottom: 24 }}>
              <label
                htmlFor="report-notes"
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: T.fg,
                  marginBottom: 7,
                }}
              >
                Notes
              </label>
              <textarea
                id="report-notes"
                value={reportNotes}
                onChange={(e) => setReportNotes(e.target.value)}
                placeholder="Add any observations, findings, or remarks…"
                rows={3}
                style={{
                  width: '100%',
                  background: T.muted,
                  border: `1px solid ${T.border}`,
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontSize: 13,
                  color: T.fg,
                  fontFamily: 'inherit',
                  outline: 'none',
                  resize: 'vertical' as const,
                  boxSizing: 'border-box' as const,
                }}
              />
            </div>

            {/* Footer buttons */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setUpdateOrder(null)}
                style={{
                  padding: '9px 20px',
                  borderRadius: 8,
                  border: `1px solid ${T.border}`,
                  background: 'transparent',
                  color: T.mutedFg,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReport}
                disabled={reportWorkOrderMutation.isPending}
                style={{
                  padding: '9px 24px',
                  borderRadius: 8,
                  border: 'none',
                  background: reportWorkOrderMutation.isPending ? T.muted : T.primary,
                  color: reportWorkOrderMutation.isPending ? T.mutedFg : T.primaryFg,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: reportWorkOrderMutation.isPending ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {reportWorkOrderMutation.isPending ? 'Saving…' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Import Preview Modal ── */}
      {showPreviewModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            zIndex: 9500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isMobile ? 12 : 24,
          }}
        >
          <div
            style={{
              background: T.card,
              borderRadius: 14,
              padding: isMobile ? '16px 14px' : '24px 28px',
              maxWidth: 960,
              width: '100%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 12px 48px rgba(0,0,0,0.22)',
              fontFamily: T.font,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginBottom: 16,
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: T.fg, margin: 0 }}>
                  Review Import
                </h2>
                <p style={{ fontSize: 12, color: T.mutedFg, margin: '4px 0 0' }}>
                  {selectedTaskIds.size} of {previewTasks.length} task
                  {previewTasks.length !== 1 ? 's' : ''} selected
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowPreviewModal(false);
                    setPreviewTasks([]);
                    setImportErrors([]);
                    setSelectedTaskIds(new Set());
                  }}
                  style={{
                    padding: '7px 16px',
                    borderRadius: 8,
                    border: `1px solid ${T.border}`,
                    background: 'transparent',
                    color: T.mutedFg,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveImportedTasks}
                  disabled={selectedTaskIds.size === 0}
                  style={{
                    padding: '7px 20px',
                    borderRadius: 8,
                    border: 'none',
                    background: selectedTaskIds.size === 0 ? T.muted : T.primary,
                    color: selectedTaskIds.size === 0 ? T.mutedFg : T.primaryFg,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: selectedTaskIds.size === 0 ? 'default' : 'pointer',
                  }}
                >
                  Save{selectedTaskIds.size > 0 ? ` (${selectedTaskIds.size})` : ''}
                </button>
              </div>
            </div>

            {importErrors.length > 0 && (
              <div
                style={{
                  background: T.dangerBg,
                  border: `1px solid color-mix(in oklch, ${T.danger} 30%, transparent)`,
                  borderRadius: 8,
                  padding: '10px 14px',
                  marginBottom: 12,
                  maxHeight: 120,
                  overflowY: 'auto',
                }}
              >
                <p style={{ fontSize: 12, fontWeight: 600, color: T.danger, margin: '0 0 6px' }}>
                  {importErrors.length} row{importErrors.length !== 1 ? 's' : ''} skipped:
                </p>
                {importErrors.map((err, idx) => (
                  <p key={`err-${idx}`} style={{ fontSize: 11, color: T.danger, margin: '2px 0' }}>
                    • {err}
                  </p>
                ))}
              </div>
            )}

            {previewTasks.length === 0 ? (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: T.mutedFg,
                  fontSize: 13,
                }}
              >
                No valid tasks found in file.
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: T.muted,
                    marginBottom: 12,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={
                      previewTasks.length > 0 && selectedTaskIds.size === previewTasks.length
                    }
                    onChange={(e) => {
                      if (e.target.checked)
                        setSelectedTaskIds(new Set(previewTasks.map((t) => t._id)));
                      else setSelectedTaskIds(new Set());
                    }}
                    style={{ width: 15, height: 15, cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.fg }}>Select All</span>
                </div>
                <div style={{ overflowY: 'auto', overflowX: 'auto', flex: 1 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: T.muted }}>
                        {[
                          '',
                          'Title',
                          'Machine',
                          'Assignee',
                          'Given By',
                          'Start Date',
                          'Frequency',
                          'Activity',
                        ].map((h) => (
                          <th
                            key={h}
                            style={{
                              padding: '9px 10px',
                              textAlign: 'left',
                              fontWeight: 600,
                              color: T.mutedFg,
                              position: 'sticky',
                              top: 0,
                              background: T.muted,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewTasks.map((t) => {
                        const sel = selectedTaskIds.has(t._id);
                        return (
                          <tr
                            key={t._id}
                            style={{
                              borderBottom: `1px solid ${T.border}`,
                              background: sel ? T.primaryBg : 'transparent',
                              cursor: 'pointer',
                            }}
                            onClick={() =>
                              setSelectedTaskIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(t._id)) next.delete(t._id);
                                else next.add(t._id);
                                return next;
                              })
                            }
                          >
                            <td style={{ padding: '10px 10px' }}>
                              <input
                                type="checkbox"
                                checked={sel}
                                onChange={() => {}}
                                style={{ width: 14, height: 14 }}
                              />
                            </td>
                            <td
                              style={{
                                padding: '10px 10px',
                                fontWeight: 500,
                                color: T.fg,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {t.title}
                            </td>
                            <td
                              style={{
                                padding: '10px 10px',
                                color: T.mutedFg,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {t.machine}
                            </td>
                            <td
                              style={{
                                padding: '10px 10px',
                                color: T.mutedFg,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {t.assignee}
                            </td>
                            <td
                              style={{
                                padding: '10px 10px',
                                color: T.mutedFg,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {t.givenBy ?? '—'}
                            </td>
                            <td
                              style={{
                                padding: '10px 10px',
                                color: T.mutedFg,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {t.startDate}
                            </td>
                            <td style={{ padding: '10px 10px' }}>
                              <span
                                style={{
                                  fontSize: 11,
                                  padding: '2px 8px',
                                  borderRadius: 12,
                                  background: T.primaryBg,
                                  color: T.primary,
                                  fontWeight: 600,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {t.frequency}
                              </span>
                            </td>
                            <td
                              style={{
                                padding: '10px 10px',
                                color: T.mutedFg,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {t.activityType}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Import Instructions Modal ── */}
      {showImportModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            zIndex: 9000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isMobile ? 12 : 0,
          }}
          onClick={() => setShowImportModal(false)}
        >
          <div
            style={{
              background: T.card,
              borderRadius: 14,
              padding: isMobile ? '18px 16px' : '28px 32px',
              maxWidth: 540,
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
              fontFamily: T.font,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              {Ico.list(18)}
              <h2 style={{ fontSize: 17, fontWeight: 700, color: T.fg, margin: 0 }}>
                Import Tasks from CSV / Excel
              </h2>
            </div>
            <p style={{ fontSize: 13, color: T.mutedFg, marginBottom: 18 }}>
              Upload a <strong>.csv</strong> or <strong>.xlsx</strong> file. Each row creates one
              maintenance task.
            </p>
            <div
              style={{
                background: T.primaryBg,
                border: `1px solid color-mix(in oklch, ${T.primary} 25%, transparent)`,
                borderRadius: 8,
                padding: '14px 16px',
                marginBottom: 18,
              }}
            >
              <p style={{ fontSize: 12, fontWeight: 600, color: T.primary, marginBottom: 10 }}>
                Required Columns
              </p>
              {(
                [
                  { col: 'Title', note: 'Task name' },
                  { col: 'Description', note: 'Detailed description' },
                  { col: 'Machine', note: 'Must match an existing machine name' },
                  { col: 'Assignee', note: 'Must match an existing user name' },
                  { col: 'StartDate', note: 'Format: dd/mm/yyyy' },
                  { col: 'Frequency', note: 'one time · daily · weekly · monthly' },
                ] as const
              ).map(({ col, note }) => (
                <div key={col} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  <span
                    style={{
                      minWidth: 110,
                      fontSize: 12,
                      fontWeight: 600,
                      color: T.fg,
                      background: T.primaryBg,
                      borderRadius: 4,
                      padding: '2px 8px',
                    }}
                  >
                    {col}
                  </span>
                  <span style={{ fontSize: 12, color: T.mutedFg }}>{note}</span>
                </div>
              ))}
              <p style={{ fontSize: 12, fontWeight: 600, color: T.fg, margin: '12px 0 8px' }}>
                Optional Columns
              </p>
              {(
                [
                  { col: 'AssetCode', note: 'Alternative machine identifier' },
                  { col: 'ActivityType', note: 'INSPECTION · REPAIR · CLEANING · OTHER' },
                  { col: 'GivenBy', note: 'Name of the person assigning this task' },
                ] as const
              ).map(({ col, note }) => (
                <div key={col} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  <span
                    style={{
                      minWidth: 110,
                      fontSize: 12,
                      fontWeight: 500,
                      color: T.fg,
                      background: T.muted,
                      borderRadius: 4,
                      padding: '2px 8px',
                    }}
                  >
                    {col}
                  </span>
                  <span style={{ fontSize: 12, color: T.mutedFg }}>{note}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: `1px solid ${T.border}`,
                  background: 'transparent',
                  color: T.mutedFg,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={downloadSampleCsv}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: `1px solid ${T.border}`,
                  background: T.muted,
                  color: T.fg,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {Ico.list(14)} Download Sample
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  excelInputRef.current?.click();
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: T.success,
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {Ico.list(14)} Import CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast key={toast.key} message={toast.msg} type={toast.type} onDone={clearToast} />}
    </div>
  );
}
