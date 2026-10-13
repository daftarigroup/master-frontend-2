'use client';

import {
  AlertOctagon,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  Filter,
  Loader2,
  Plus,
  User,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { useProject } from '@/context/ProjectContext';
import { filterByFirmAccess } from '@/lib/firmAccess';
import { toFirmParam } from '../../shared/lib/common';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ResolveBreakdownForm } from './ResolveBreakdownForm';
import { CompanySelectField } from '@/features/organization/components/CompanySelectField';
import { useCompanyPinForCreate } from '@/features/organization/hooks/useCompanyPinForCreate';
import { usePagination } from '@/hooks/usePagination';
import { useAppSelector } from '@/store/hook';
import { selectOrgViewMode } from '@/store/slice/userAccountData';
import {
  useAvailableTechnicians,
  useBreakdownMachines,
  useBreakdowns,
  useCreateBreakdown,
} from '../server/tanstackQuery/useBreakdownQueries';
import type {
  BreakdownReport,
  BreakdownSeverity,
  DisplaySeverity,
  DisplayStatus,
} from '../types/types';

const DEFAULT_FAILURE_TYPES = [
  'Electrical',
  'Mechanical',
  'Software',
  'Operator Error',
  'Hydraulic',
  'Pneumatic',
  'Other',
];

const CUSTOM_FAILURE_TYPES_KEY = 'mp-breakdown-custom-failure-types';

const loadCustomFailureTypes = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_FAILURE_TYPES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
};

const saveCustomFailureTypes = (types: string[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CUSTOM_FAILURE_TYPES_KEY, JSON.stringify(types));
};

const SEVERITY_OPTIONS: { label: DisplaySeverity; value: BreakdownSeverity }[] = [
  { label: 'Critical', value: 'CRITICAL' },
  { label: 'Major', value: 'HIGH' },
  { label: 'Minor', value: 'MEDIUM' },
];

const toDisplaySeverity = (s: BreakdownSeverity): DisplaySeverity => {
  if (s === 'CRITICAL') return 'Critical';
  if (s === 'HIGH') return 'Major';
  return 'Minor';
};

// Status is fully automatic — derived from the linked repair work order state:
// PENDING / IN_PROGRESS  → Open / In Progress
// PENDING_APPROVAL       → Completed (assigned person submitted, awaiting admin approval)
// COMPLETED / COMPLETED_LATE / admin-direct-close → Closed
const toDisplayStatus = (
  isResolved: boolean,
  woStatus: string | null,
  status?: string | null
): DisplayStatus => {
  if (woStatus === 'COMPLETED' || woStatus === 'COMPLETED_LATE' || status === 'CLOSED')
    return 'Closed';
  if (woStatus === 'PENDING_APPROVAL') return 'Completed';
  if (isResolved || status === 'RESOLVED') return 'Resolved';
  if (woStatus === 'IN_PROGRESS' || status === 'IN_PROGRESS') return 'In Progress';
  return 'Open';
};

const formatWorkOrderDisplay = (code?: string | null, id?: string | null): string => {
  if (code && code.trim()) return code.trim();
  if (!id || !id.trim()) return 'None';
  const trimmed = id.trim();
  if (trimmed.startsWith('WO-') || trimmed.startsWith('WO ')) return trimmed;
  return `WO-${trimmed.slice(-6).toUpperCase()}`;
};

const severityColor = (s: DisplaySeverity) =>
  ({
    Critical:
      'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800',
    Major:
      'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-400 dark:border-orange-800',
    Minor:
      'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-400 dark:border-yellow-800',
  })[s] ?? 'bg-gray-100 text-gray-700';

const statusVariant = (s: DisplayStatus) =>
  ({
    Open: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800',
    'In Progress':
      'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/40 dark:text-sky-400 dark:border-sky-800',
    Completed:
      'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-800',
    Resolved:
      'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-400 dark:border-green-800',
    Closed:
      'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600',
  })[s] ?? 'bg-gray-100 text-gray-600 border-gray-200';

const initialForm = {
  machineId: '',
  failureType: '',
  description: '',
  severity: '' as BreakdownSeverity | '',
  estimatedDowntimeHours: '',
  assignToUserId: '',
  remarks: '',
};

export default function BreakdownLogPage() {
  const [searchParams] = useSearchParams();
  const firmIdParam = searchParams.get('firmId') || searchParams.get('projectId');
  const firmNameParam = searchParams.get('firmName') || searchParams.get('projectName');
  const machineIdParam = searchParams.get('machineId');
  const machineNameParam = searchParams.get('machineName');
  const assetIdParam = searchParams.get('assetId');
  const assetNameParam = searchParams.get('assetName');

  const orgViewMode = useAppSelector(selectOrgViewMode);
  const { pinnedCompany, selectCompany, reset: resetPinnedCompany } = useCompanyPinForCreate();
  const [form, setForm] = useState(() => ({
    ...initialForm,
    machineId: searchParams.get('machineId') || '',
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showForm, setShowForm] = useState(false);
  const [filterMachine, setFilterMachine] = useState('all');
  const [filterFirm, setFilterFirm] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const { selectedProject, effectivePermittedFirms } = useProject();
  const projectFirmId = toFirmParam(selectedProject);
  const activeFirmId = filterFirm !== 'all' ? filterFirm : projectFirmId;

  const { data: firmsResponse } = useQuery({
    queryKey: ['breakdown', 'firms', 'list'],
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

  const [selectedBd, setSelectedBd] = useState<BreakdownReport | null>(null);
  const [toast, setToast] = useState('');
  const [customFailureTypes, setCustomFailureTypes] = useState<string[]>(loadCustomFailureTypes);
  const [showAddFailureType, setShowAddFailureType] = useState(false);
  const [newFailureType, setNewFailureType] = useState('');

  const { page, limit, setPage } = usePagination(20);
  // A page number from the old machine filter isn't meaningful for a new one.
  useEffect(() => {
    setPage(1);
  }, [setPage]);

  const { data: bdData, isLoading } = useBreakdowns({
    machineId: filterMachine !== 'all' ? filterMachine : undefined,
    firmId: activeFirmId,
    page,
    limit,
  });
  // Separate lightweight query just to read the real unresolved total (computed
  // over the full matching set server-side), independent of the current page.
  const { data: openBdData } = useBreakdowns({
    machineId: filterMachine !== 'all' ? filterMachine : undefined,
    firmId: activeFirmId,
    isResolved: false,
    limit: 1,
  });
  const { data: machines, isLoading: machinesLoading } = useBreakdownMachines(pinnedCompany?.id || activeFirmId);
  const { data: users, isLoading: usersLoading } = useAvailableTechnicians(pinnedCompany?.id || activeFirmId);
  const createMutation = useCreateBreakdown();

  useEffect(() => {
    if (!showForm && !firmIdParam && !firmNameParam) {
      resetPinnedCompany();
    }
  }, [showForm, resetPinnedCompany, firmIdParam, firmNameParam]);

  // Handle URL query params to open breakdown form and pre-fill project & machine
  useEffect(() => {
    const isNew = searchParams.get('new') === 'true' || searchParams.get('report') === 'true';
    if (isNew) {
      setShowForm(true);
      if (firmIdParam) {
        selectCompany({ id: firmIdParam, name: firmNameParam || `Project ${firmIdParam}` });
      }
    }
  }, [searchParams, firmIdParam, firmNameParam, selectCompany]);

  // When firms list loads, ensure project/company is pinned to matching firm
  useEffect(() => {
    if (firmIdParam || firmNameParam) {
      const matched = firms.find(
        (f) =>
          (firmIdParam && String(f.id) === String(firmIdParam)) ||
          (firmNameParam && f.name.toLowerCase() === firmNameParam.toLowerCase())
      );
      if (matched && (!pinnedCompany || String(pinnedCompany.id) !== String(matched.id))) {
        selectCompany({ id: String(matched.id), name: matched.name });
      }
    }
  }, [firms, firmIdParam, firmNameParam, pinnedCompany, selectCompany]);

  useEffect(() => {
    if (machineIdParam) {
      setForm((prev) => (prev.machineId === machineIdParam ? prev : { ...prev, machineId: machineIdParam }));
    }
    if ((machineIdParam || machineNameParam || assetIdParam || assetNameParam) && machines && machines.length > 0) {
      const normMachineName = machineNameParam ? machineNameParam.trim().toLowerCase() : '';
      const normAssetName = assetNameParam ? assetNameParam.trim().toLowerCase() : '';
      const matched = machines.find((m) => {
        const mId = String(m.id);
        const mCode = (m.assetCode || '').toLowerCase();
        const mName = (m.name || '').toLowerCase();
        return (
          (machineIdParam && mId === machineIdParam) ||
          (assetIdParam && (mId === assetIdParam || mCode === assetIdParam.toLowerCase() || (m as any).assetId === assetIdParam)) ||
          (normMachineName && (mName === normMachineName || mCode === normMachineName)) ||
          (normAssetName && (mName === normAssetName || mCode === normAssetName || mName.includes(normAssetName) || normAssetName.includes(mName)))
        );
      });
      if (matched) {
        setForm((prev) => (prev.machineId === matched.id ? prev : { ...prev, machineId: matched.id }));
        if (matched.firmId && (!pinnedCompany || String(pinnedCompany.id) !== String(matched.firmId))) {
          const matchingFirm = firms.find((f) => String(f.id) === String(matched.firmId));
          selectCompany({
            id: String(matched.firmId),
            name: matchingFirm?.name || matched.firmName || (matched.firm as any)?.name || `Project ${matched.firmId}`,
          });
        }
      }
    }
  }, [machineIdParam, machineNameParam, assetIdParam, assetNameParam, machines, firms, pinnedCompany, selectCompany]);

  const allBreakdowns = bdData?.data ?? [];
  const total = bdData?.pagination?.total ?? 0;
  const totalPages = bdData?.pagination?.totalPages ?? 1;

  const failureTypes = useMemo(() => {
    const reported = allBreakdowns
      .map((b) => b.failureType)
      .filter((ft): ft is string => Boolean(ft));
    return Array.from(new Set([...DEFAULT_FAILURE_TYPES, ...customFailureTypes, ...reported]));
  }, [allBreakdowns, customFailureTypes]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.machineId) errs.machineId = 'Select a machine';
    if (!form.failureType) errs.failureType = 'Select failure type';
    if (!form.description.trim()) errs.description = 'Description is required';
    if (
      !form.estimatedDowntimeHours ||
      Number.isNaN(Number(form.estimatedDowntimeHours)) ||
      Number(form.estimatedDowntimeHours) < 0
    )
      errs.estimatedDowntimeHours = 'Enter valid downtime hours';
    if (!form.severity) errs.severity = 'Select severity';
    return errs;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    createMutation.mutate(
      {
        dto: {
          machineId: form.machineId,
          failureType: form.failureType,
          description: form.description.trim(),
          severity: form.severity as BreakdownSeverity,
          estimatedDowntimeHours: Number(form.estimatedDowntimeHours),
          remarks: form.remarks.trim() || undefined,
          assignToUserId: form.assignToUserId || undefined,
        },
        actAsTenantId: pinnedCompany?.id,
      },
      {
        onSuccess: () => {
          showToast('Breakdown logged successfully!');
          setForm(initialForm);
          setShowForm(false);
        },
        onError: () => showToast('Failed to log breakdown. Please try again.'),
      }
    );
  };

  const handleAddFailureType = () => {
    const trimmed = newFailureType.trim();
    if (!trimmed) return;
    if (!failureTypes.some((ft) => ft.toLowerCase() === trimmed.toLowerCase())) {
      const updated = [...customFailureTypes, trimmed];
      setCustomFailureTypes(updated);
      saveCustomFailureTypes(updated);
    }
    setForm((f) => ({ ...f, failureType: trimmed }));
    setNewFailureType('');
    setShowAddFailureType(false);
  };

  // machineId is already applied server-side (see useBreakdowns params above) —
  // filterStatus stays client-side, since it's a derived Open/In-Progress/Resolved
  // bucket combining isResolved + workOrderStatus, not a single backend field.
  const filteredBreakdowns = useMemo(() => {
    return allBreakdowns
      .filter((b) => {
        const m = machines?.find((mach) => mach.id === b.machineId);
        // Scoped to permitted project/firms
        if (!filterByFirmAccess([m || b], effectivePermittedFirms).length) return false;

        if (filterFirm !== 'all') {
          const firmMatch =
            String(m?.firmId) === filterFirm ||
            m?.firmName === filterFirm ||
            m?.firm?.name === filterFirm;
          if (!firmMatch) return false;
        }
        if (filterStatus === 'all') return true;
        const ds = toDisplayStatus(b.isResolved, b.workOrderStatus, b.status);
        return ds === filterStatus;
      })
      .sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());
  }, [allBreakdowns, filterStatus, filterFirm, machines, effectivePermittedFirms]);

  const totalDowntime = filteredBreakdowns.reduce(
    (s, b) =>
      s +
      (b.actualDowntimeMinutes != null
        ? b.actualDowntimeMinutes / 60
        : (b.estimatedDowntimeHours ?? 0)),
    0
  );
  // Real total, computed server-side over the full matching set — not just
  // whichever unresolved rows happen to be on the current page.
  const openCount = openBdData?.pagination?.total ?? 0;

  const inputCls = (field: string) =>
    `w-full px-4 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 transition-all ${
      errors[field]
        ? 'border-red-400 bg-red-50 dark:bg-red-900/20 dark:border-red-700 focus:ring-red-200'
        : 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 hover:bg-white dark:hover:bg-gray-700 focus:bg-white dark:focus:bg-gray-700 dark:text-gray-200 focus:ring-red-100'
    }`;

  return (
    <div className="space-y-6 w-full">
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg bg-green-500 text-white font-semibold text-sm">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700/50">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3 tracking-tight">
            <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg shadow-sm shadow-red-50">
              <AlertOctagon size={24} className="text-red-600" />
            </div>
            Breakdown Log
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 ml-11">
            Failure Analysis & Downtime
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowForm(true);
          }}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all text-sm font-semibold shadow-sm hover:shadow active:scale-95 tracking-wide w-full sm:w-auto"
        >
          <Plus size={18} />
          Report Breakdown
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(
          [
            {
              label: 'Open Breakdowns',
              val: isLoading ? '…' : openCount,
              sub: 'Needs attention',
              Icon: AlertOctagon,
            },
            {
              label: 'Total Events',
              val: isLoading ? '…' : total,
              sub: 'Lifetime count',
              Icon: FileText,
            },
            {
              label: 'Lost Time',
              val: isLoading ? '…' : `${totalDowntime.toFixed(0)}h`,
              sub: 'Filtered data',
              Icon: Clock,
            },
          ] as {
            label: string;
            val: string | number;
            sub: string;
            Icon: React.ComponentType<{ size?: number; className?: string }>;
          }[]
        ).map((card) => (
          <div
            key={card.label}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700/50 p-5 hover:shadow-xl transition-all hover:-translate-y-1"
          >
            <div className="flex items-center justify-between mb-3 text-muted-foreground">
              <p className="text-xs font-semibold uppercase tracking-wider">{card.label}</p>
              <card.Icon size={16} />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{card.val}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {card.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Modal Form */}
      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) {
            setErrors({});
            resetPinnedCompany();
          }
        }}
      >
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0">
          <DialogHeader className="p-6 border-b border-border text-left">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 shrink-0">
                <AlertOctagon size={22} />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-foreground">
                  Report Machine Breakdown
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Log equipment failure, downtime, and assign technician for resolution
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {orgViewMode === 'all' && (
              <div className="p-3.5 border border-border rounded-xl bg-muted/30">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                  Company / Project Scope
                </label>
                <CompanySelectField
                  value={pinnedCompany?.id}
                  defaultValue={firmIdParam || undefined}
                  onSelect={selectCompany}
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Machine */}
              <div className="space-y-1.5">
                <label
                  className="text-xs font-semibold text-foreground ml-1"
                  htmlFor="bd-machine"
                >
                  Machine *
                </label>
                <select
                  id="bd-machine"
                  className={inputCls('machineId')}
                  value={form.machineId}
                  onChange={(e) => setForm({ ...form, machineId: e.target.value })}
                  disabled={machinesLoading}
                >
                  <option value="">{machinesLoading ? 'Loading…' : 'Select Machine...'}</option>
                  {form.machineId && !(machines ?? []).some((m) => m.id === form.machineId) && (
                    <option value={form.machineId}>
                      {machineNameParam || assetNameParam || 'Selected Machine'}
                    </option>
                  )}
                  {(machines ?? []).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.assetCode})
                    </option>
                  ))}
                </select>
                {errors.machineId && (
                  <p className="text-xs text-red-500 mt-1 ml-1">{errors.machineId}</p>
                )}
              </div>

              {/* Failure Time */}
              <div className="space-y-1.5">
                <label
                  className="text-xs font-semibold text-foreground ml-1"
                  htmlFor="bd-date"
                >
                  Failure Time
                </label>
                <div className="relative group">
                  <Calendar
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    id="bd-date"
                    type="datetime-local"
                    className={`pl-10 ${inputCls('date')}`}
                    defaultValue={new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
                      .toISOString()
                      .slice(0, 16)}
                    max={new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
                      .toISOString()
                      .slice(0, 16)}
                  />
                </div>
              </div>

              {/* Failure Type */}
              <div className="space-y-1.5">
                <label
                  className="text-xs font-semibold text-foreground ml-1"
                  htmlFor="bd-failure"
                >
                  Failure Type *
                </label>
                {showAddFailureType ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="New failure type name"
                      className={inputCls('newFailureType')}
                      value={newFailureType}
                      onChange={(e) => setNewFailureType(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddFailureType();
                        }
                        if (e.key === 'Escape') {
                          setShowAddFailureType(false);
                          setNewFailureType('');
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddFailureType}
                      className="shrink-0 p-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all"
                      title="Add failure type"
                    >
                      <Plus size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddFailureType(false);
                        setNewFailureType('');
                      }}
                      className="shrink-0 p-2 text-muted-foreground hover:text-foreground rounded-xl"
                      title="Cancel"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <select
                      id="bd-failure"
                      className={inputCls('failureType')}
                      value={form.failureType}
                      onChange={(e) => setForm({ ...form, failureType: e.target.value })}
                    >
                      <option value="">Select failure type...</option>
                      {failureTypes.map((ft) => (
                        <option key={ft} value={ft}>
                          {ft}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowAddFailureType(true)}
                      className="shrink-0 p-2 text-red-600 border border-red-200 dark:border-red-800 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                      title="Add new failure type"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                )}
                {errors.failureType && (
                  <p className="text-xs text-red-500 mt-1 ml-1">{errors.failureType}</p>
                )}
              </div>

              {/* Severity */}
              <div className="space-y-1.5">
                <label
                  className="text-xs font-semibold text-foreground ml-1"
                  htmlFor="bd-severity"
                >
                  Severity *
                </label>
                <select
                  id="bd-severity"
                  className={inputCls('severity')}
                  value={form.severity}
                  onChange={(e) =>
                    setForm({ ...form, severity: e.target.value as BreakdownSeverity })
                  }
                >
                  <option value="">Select severity...</option>
                  {SEVERITY_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                {errors.severity && (
                  <p className="text-xs text-red-500 mt-1 ml-1">{errors.severity}</p>
                )}
              </div>

              {/* Downtime Hours */}
              <div className="space-y-1.5">
                <label
                  className="text-xs font-semibold text-foreground ml-1"
                  htmlFor="bd-downtime"
                >
                  Downtime Hours *
                </label>
                <div className="relative group">
                  <Clock
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    id="bd-downtime"
                    type="number"
                    min={0}
                    step={0.5}
                    placeholder="e.g. 4.5"
                    className={`pl-10 ${inputCls('estimatedDowntimeHours')}`}
                    value={form.estimatedDowntimeHours}
                    onChange={(e) =>
                      setForm({ ...form, estimatedDowntimeHours: e.target.value })
                    }
                  />
                </div>
                {errors.estimatedDowntimeHours && (
                  <p className="text-xs text-red-500 mt-1 ml-1">
                    {errors.estimatedDowntimeHours}
                  </p>
                )}
              </div>

              {/* Technician */}
              <div className="space-y-1.5">
                <label
                  className="text-xs font-semibold text-foreground ml-1"
                  htmlFor="bd-tech"
                >
                  Assign Technician
                </label>
                <div className="relative group">
                  <User
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <select
                    id="bd-tech"
                    className={`pl-10 ${inputCls('assignToUserId')}`}
                    value={form.assignToUserId}
                    onChange={(e) => setForm({ ...form, assignToUserId: e.target.value })}
                    disabled={usersLoading}
                  >
                    <option value="">{usersLoading ? 'Loading…' : 'Unassigned'}</option>
                    {(users ?? []).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="md:col-span-2 lg:col-span-3 space-y-1.5">
                <label
                  className="text-xs font-semibold text-foreground ml-1"
                  htmlFor="bd-description"
                >
                  Description & Root Cause *
                </label>
                <textarea
                  id="bd-description"
                  rows={3}
                  placeholder="Describe the problem, cause, and any initial actions taken..."
                  className={inputCls('description')}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
                {errors.description && (
                  <p className="text-xs text-red-500 mt-1 ml-1">{errors.description}</p>
                )}
              </div>

              {/* Remarks */}
              <div className="md:col-span-2 lg:col-span-3 space-y-1.5">
                <label
                  className="text-xs font-semibold text-foreground ml-1"
                  htmlFor="bd-remarks"
                >
                  Remarks
                </label>
                <textarea
                  id="bd-remarks"
                  rows={2}
                  placeholder="Any additional notes or observations..."
                  className={inputCls('remarks')}
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter className="flex justify-end gap-3 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setErrors({});
                }}
                className="px-5 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-6 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 shadow-sm transition-all active:scale-95 disabled:opacity-60 flex items-center gap-2 text-sm font-semibold tracking-wide"
              >
                {createMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                Log Breakdown Event
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={!!selectedBd} onOpenChange={(open) => !open && setSelectedBd(null)}>
        {selectedBd &&
          (() => {
            const displaySev = toDisplaySeverity(selectedBd.severity);
            const displayStatus = toDisplayStatus(
              selectedBd.isResolved,
              selectedBd.workOrderStatus,
              selectedBd.status
            );
            const dtHours =
              selectedBd.actualDowntimeMinutes != null
                ? selectedBd.actualDowntimeMinutes / 60
                : (selectedBd.estimatedDowntimeHours ?? 0);
            return (
              <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto p-0 gap-0">
                <DialogHeader className="p-6 border-b border-border text-left">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 shrink-0">
                      <AlertOctagon size={20} />
                    </div>
                    <div>
                      <DialogTitle className="text-lg font-semibold text-foreground leading-snug">
                        {selectedBd.machineName}
                      </DialogTitle>
                      <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                        {selectedBd.breakdownNumber ? `${selectedBd.breakdownNumber} · ` : ''}
                        {selectedBd.assetCode} · {new Date(selectedBd.reportedAt).toLocaleString('en-IN')}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                <div className="p-6 space-y-5">
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-md text-xs font-medium border ${severityColor(displaySev)}`}
                    >
                      {displaySev}
                    </span>
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-md text-xs font-medium border ${statusVariant(displayStatus)}`}
                    >
                      {displayStatus}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-muted/40 rounded-xl p-4 min-w-0 border border-border/50">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Project (Firm)
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {machines?.find((m) => m.id === selectedBd.machineId)?.firm?.name ??
                          machines?.find((m) => m.id === selectedBd.machineId)?.firmName ??
                          '—'}
                      </p>
                    </div>
                    <div className="bg-muted/40 rounded-xl p-4 min-w-0 border border-border/50">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Failure Type
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {selectedBd.failureType ?? '—'}
                      </p>
                    </div>
                    <div className="bg-muted/40 rounded-xl p-4 border border-border/50">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Clock size={12} />
                        Downtime
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {dtHours.toFixed(1)}h
                      </p>
                    </div>
                    <div className="bg-muted/40 rounded-xl p-4 border border-border/50">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                        <User size={12} />
                        Assignee
                      </p>
                      <p className="text-sm font-medium text-foreground truncate">
                        {selectedBd.assigneeName ?? selectedBd.reportedByName}
                      </p>
                    </div>
                    <div className="bg-muted/40 rounded-xl p-4 border border-border/50">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Reported By
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {selectedBd.reportedByName}
                      </p>
                    </div>
                    {selectedBd.resolvedAt && (
                      <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 sm:col-span-2">
                        <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider mb-1">
                          Resolved At
                        </p>
                        <p className="text-sm font-medium text-green-700 dark:text-green-300">
                          {new Date(selectedBd.resolvedAt).toLocaleString('en-IN')}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="bg-muted/40 rounded-xl p-4 border border-border/50">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                      <FileText size={12} />
                      Description / Root Cause
                    </p>
                    <p className="text-sm text-foreground leading-relaxed">
                      {selectedBd.description}
                    </p>
                  </div>
                  {(selectedBd.rootCause || selectedBd.correctiveAction) && (
                    <div className="space-y-3">
                      {selectedBd.rootCause && (
                        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
                          <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-1">
                            Root Cause
                          </p>
                          <p className="text-sm text-foreground leading-relaxed">
                            {selectedBd.rootCause}
                          </p>
                        </div>
                      )}
                      {selectedBd.correctiveAction && (
                        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                          <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider mb-1">
                            Corrective Action
                          </p>
                          <p className="text-sm text-foreground leading-relaxed">
                            {selectedBd.correctiveAction}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  {selectedBd.remarks && (
                    <div className="bg-muted/40 rounded-xl p-4 border border-border/50">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Remarks
                      </p>
                      <p className="text-sm text-foreground leading-relaxed">
                        {selectedBd.remarks}
                      </p>
                    </div>
                  )}
                  {!selectedBd.isResolved && (
                    <ResolveBreakdownForm breakdownId={selectedBd.id} onResolved={() => setSelectedBd(null)} />
                  )}
                  <div className="border-t border-border pt-4 text-xs text-muted-foreground font-medium flex items-center justify-between">
                    <span>
                      Work Order:{' '}
                      <span className="font-mono text-foreground font-semibold">
                        {formatWorkOrderDisplay(selectedBd.workOrderCode, selectedBd.workOrderId)}
                      </span>
                    </span>
                    <p className="text-xs">
                      {selectedBd.isResolved ? (
                        <span className="text-green-600 font-semibold">Resolved</span>
                      ) : (
                        <span className="text-red-500 font-semibold">Unresolved</span>
                      )}
                    </p>
                  </div>
                </div>
              </DialogContent>
            );
          })()}
      </Dialog>

      {/* Records Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700/50 overflow-hidden flex flex-col">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-5 border-b bg-white dark:bg-gray-900 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 tracking-tight">
              Breakdown Records
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Historical trail of system failures
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative group w-full sm:w-auto">
              <Filter
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <select
                className="text-sm font-medium border border-gray-200 dark:border-gray-700 rounded-xl pl-10 pr-4 py-2 bg-gray-50/50 dark:bg-gray-800 dark:text-gray-200 appearance-none w-full sm:min-w-[160px] focus:outline-none focus:ring-4 focus:ring-sky-500/10 transition-all"
                value={filterMachine}
                onChange={(e) => setFilterMachine(e.target.value)}
              >
                <option value="all">All Machines</option>
                {(machines ?? []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <select
              className="text-sm font-medium border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 bg-gray-50/50 dark:bg-gray-800 dark:text-gray-200 w-full sm:min-w-[160px] focus:outline-none focus:ring-4 focus:ring-sky-500/10 transition-all text-gray-700"
              value={filterFirm}
              onChange={(e) => setFilterFirm(e.target.value)}
            >
              <option value="all">All Projects (Firms)</option>
              {firms.map((f) => (
                <option key={f.id} value={String(f.id)}>
                  {f.name}
                </option>
              ))}
            </select>
            <select
              className="text-sm font-medium border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 bg-gray-50/50 dark:bg-gray-800 dark:text-gray-200 w-full sm:min-w-[140px] focus:outline-none focus:ring-4 focus:ring-sky-500/10 transition-all text-gray-700"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-auto">
          <table className="w-full border-separate border-spacing-0">
            <thead className="sticky top-0 z-10 bg-gray-50/95 dark:bg-gray-800/95 backdrop-blur-sm">
              <tr>
                {[
                  'Date',
                  'Machine',
                  'Project (Firm)',
                  'Failure Type',
                  'Severity',
                  'Downtime',
                  'Assignee',
                  'Status',
                  ...(filteredBreakdowns.some((bd) => bd.tenant) ? ['Company'] : []),
                  'Actions',
                ].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={filteredBreakdowns.some((bd) => bd.tenant) ? 10 : 9}
                    className="px-6 py-20 text-center"
                  >
                    <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                      <Loader2 size={32} className="mb-3 animate-spin text-red-400" />
                      <p className="text-sm font-medium text-muted-foreground">Loading…</p>
                    </div>
                  </td>
                </tr>
              ) : filteredBreakdowns.length === 0 ? (
                <tr>
                  <td
                    colSpan={filteredBreakdowns.some((bd) => bd.tenant) ? 10 : 9}
                    className="px-6 py-20 text-center"
                  >
                    <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                      <AlertOctagon size={48} className="mb-4 opacity-10" />
                      <p className="text-sm font-semibold text-muted-foreground">
                        No downtime records found
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">Try relaxing your filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBreakdowns.map((bd) => {
                  const displaySev = toDisplaySeverity(bd.severity);
                  const displayStatus = toDisplayStatus(
                    bd.isResolved,
                    bd.workOrderStatus,
                    bd.status
                  );
                  const dtHours =
                    bd.actualDowntimeMinutes != null
                      ? bd.actualDowntimeMinutes / 60
                      : (bd.estimatedDowntimeHours ?? 0);
                  return (
                    <tr
                      key={bd.id}
                      className="group hover:bg-sky-50/30 dark:hover:bg-sky-900/10 transition-colors"
                    >
                      <td className="px-6 py-4 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap font-normal">
                        {new Date(bd.reportedAt).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span>{bd.machineName}</span>
                          {bd.breakdownNumber && (
                            <span className="text-[11px] font-mono text-muted-foreground font-normal">
                              {bd.breakdownNumber}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {machines?.find((m) => m.id === bd.machineId)?.firm?.name ??
                          machines?.find((m) => m.id === bd.machineId)?.firmName ??
                          '—'}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-600 dark:text-gray-400">
                        {bd.failureType ?? '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-md text-xs font-medium border ${severityColor(displaySev)}`}
                        >
                          {displaySev}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-gray-700 dark:text-gray-300">
                        {dtHours.toFixed(1)}h
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-600 dark:text-gray-400 font-normal whitespace-nowrap">
                        {bd.assigneeName ?? bd.reportedByName}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${statusVariant(displayStatus)}`}
                        >
                          {displayStatus}
                        </span>
                      </td>
                      {filteredBreakdowns.some((r) => r.tenant) && (
                        <td className="px-6 py-4 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {bd.tenant?.name ?? '—'}
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => setSelectedBd(bd)}
                          className="p-2 text-violet-600 hover:bg-violet-50 rounded-lg transition-all"
                          title="View details"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden overflow-auto p-4 space-y-4 bg-gray-50/50 dark:bg-gray-800/30">
          {isLoading ? (
            <div className="px-6 py-12 text-center bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
              <Loader2 size={32} className="mx-auto mb-3 animate-spin text-red-400" />
            </div>
          ) : filteredBreakdowns.length === 0 ? (
            <div className="px-6 py-12 text-center bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
              <AlertOctagon size={48} className="mx-auto mb-4 text-gray-200" />
              <p className="text-sm font-semibold text-muted-foreground">
                No downtime records found
              </p>
            </div>
          ) : (
            filteredBreakdowns.map((bd) => {
              const displaySev = toDisplaySeverity(bd.severity);
              const displayStatus = toDisplayStatus(bd.isResolved, bd.workOrderStatus, bd.status);
              const dtHours =
                bd.actualDowntimeMinutes != null
                  ? bd.actualDowntimeMinutes / 60
                  : (bd.estimatedDowntimeHours ?? 0);
              return (
                <div
                  key={bd.id}
                  className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700/50 space-y-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                        {bd.machineName}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(bd.reportedAt).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium border ${severityColor(displaySev)}`}
                    >
                      {displaySev}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50 dark:border-gray-700/50">
                    <div>
                      <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">
                        Project (Firm)
                      </p>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                        {machines?.find((m) => m.id === bd.machineId)?.firm?.name ??
                          machines?.find((m) => m.id === bd.machineId)?.firmName ??
                          '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">
                        Failure Type
                      </p>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        {bd.failureType ?? '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">
                        Downtime
                      </p>
                      <p className="text-xs font-medium text-gray-900 dark:text-gray-100">
                        {dtHours.toFixed(1)}h
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">
                        Assignee
                      </p>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                        {bd.assigneeName ?? bd.reportedByName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-gray-700/50">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${statusVariant(displayStatus)}`}
                    >
                      {displayStatus}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedBd(bd)}
                      className="p-2 text-violet-600 bg-violet-50 dark:bg-violet-900/20 rounded-xl hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-all font-medium text-xs flex items-center gap-1.5 px-3"
                    >
                      <Eye size={14} /> View
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-4 border-t bg-gray-50 dark:bg-gray-800 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            System Generated Audit Trail
          </div>
          <div>
            {filteredBreakdowns.length} of {total} Reports Displayed
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2 normal-case tracking-normal">
              <button
                type="button"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-1.5 text-gray-400 hover:text-sky-600 rounded-lg disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-medium text-muted-foreground tabular-nums">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-1.5 text-gray-400 hover:text-sky-600 rounded-lg disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
