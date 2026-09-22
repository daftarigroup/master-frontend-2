'use client';

import {
  IconAlertCircle,
  IconArchive,
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconDeviceFloppy,
  IconEdit,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlus,
  IconRefresh,
  IconSearch,
} from '@tabler/icons-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRequireCompanySelected } from '@/features/organization/hooks/useRequireCompanySelected';
import { usePagination } from '@/hooks/usePagination';
import { useAppSelector } from '@/store/hook';
import { selectUser } from '@/store/slice/userAccountData';
import { usePlansFilter } from '../hooks/usePlans';
import {
  useArchivePlan,
  useCreatePlan,
  usePausePlan,
  usePlans,
  useResumePlan,
  useUpdatePlan,
} from '../server/tanstackQuery/usePlansQueries';
import type {
  CreatePlanDto,
  MaintenancePlan,
  PlanFrequency,
  PlanStatus,
  UpdatePlanDto,
} from '../types/types';
import { PLAN_FREQUENCY_LABELS, PLAN_STATUS_LABELS } from '../types/types';

const FREQUENCIES = Object.keys(PLAN_FREQUENCY_LABELS) as PlanFrequency[];
const STATUSES = Object.keys(PLAN_STATUS_LABELS) as PlanStatus[];

const _FIELD_CLASS =
  'border-border bg-card text-foreground placeholder:text-muted-foreground focus:ring-ring h-10 w-full rounded-xl border px-3 text-sm focus:ring-2 focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-50';

const FREQUENCY_COLORS: Partial<Record<PlanFrequency, string>> = {
  DAILY: 'bg-blue-500/10 text-blue-600',
  WEEKLY: 'bg-purple-500/10 text-purple-600',
  FORTNIGHTLY: 'bg-violet-500/10 text-violet-600',
  ALTERNATE_DAYS: 'bg-indigo-500/10 text-indigo-600',
  MONTHLY: 'bg-amber-500/10 text-amber-600',
  QUARTERLY: 'bg-green-500/10 text-green-600',
  HALF_YEARLY: 'bg-teal-500/10 text-teal-600',
  YEARLY: 'bg-red-500/10 text-red-600',
  IN_FIRST_WEEK: 'bg-pink-500/10 text-pink-600',
  IN_SECOND_WEEK: 'bg-pink-500/10 text-pink-600',
  IN_THIRD_WEEK: 'bg-pink-500/10 text-pink-600',
  IN_FOURTH_WEEK: 'bg-pink-500/10 text-pink-600',
  ONE_TIME: 'bg-gray-500/10 text-gray-600',
  RUNNING_HOURS: 'bg-orange-500/10 text-orange-600',
  METER_BASED: 'bg-cyan-500/10 text-cyan-600',
};

const STATUS_STYLES: Record<PlanStatus, string> = {
  ACTIVE: 'bg-green-500/10 text-green-600 border-green-500/20',
  DRAFT: 'bg-muted text-muted-foreground border-border',
  PAUSED: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  ARCHIVED: 'bg-destructive/10 text-destructive border-destructive/20 line-through opacity-60',
};

function StatusBadge({ status }: { status: PlanStatus }) {
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {PLAN_STATUS_LABELS[status]}
    </span>
  );
}

const emptyForm: CreatePlanDto = {
  machineId: '',
  assignedToId: '',
  title: '',
  planCode: '',
  activityTypeId: '',
  frequency: 'MONTHLY',
  startDate: '',
  endDate: '',
  description: '',
  priority: 2,
  estimatedMinutes: 60,
  onHoliday: 'SKIP',
};

export default function MaintenancePlans() {
  const requireCompanySelected = useRequireCompanySelected();
  const navigate = useNavigate();
  const router = { push: (p: string) => navigate(p) };
  const currentUser = useAppSelector(selectUser);
  const isAdmin =
    (currentUser as { role?: string } | null)?.role === 'ADMIN' ||
    (currentUser as { role?: string } | null)?.role === 'SUPERADMIN';
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreatePlanDto>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    searchTerm,
    setSearchTerm,
    filterFrequency,
    setFilterFrequency,
    filterStatus,
    setFilterStatus,
  } = usePlansFilter();

  const { page, limit, setPage } = usePagination(20);
  // A page number from the old search/filter combo isn't meaningful for a new one.
  useEffect(() => {
    setPage(1);
  }, [setPage]);

  const { data, isLoading, isError, refetch } = usePlans({
    page,
    limit,
    search: searchTerm.trim() || undefined,
    frequency: filterFrequency !== 'ALL' ? filterFrequency : undefined,
    status: filterStatus !== 'ALL' ? filterStatus : undefined,
  });
  // Stat cards show the true tenant-wide breakdown by status, independent of the
  // current page/search/frequency/status filters — each is a lightweight
  // limit:1 query, only the server-computed total is read.
  const { data: totalData } = usePlans({ limit: 1 });
  const { data: activeData } = usePlans({ status: 'ACTIVE', limit: 1 });
  const { data: pausedData } = usePlans({ status: 'PAUSED', limit: 1 });
  const { data: draftData } = usePlans({ status: 'DRAFT', limit: 1 });
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const pausePlan = usePausePlan();
  const resumePlan = useResumePlan();
  const archivePlan = useArchivePlan();

  const total = data?.pagination?.total ?? 0;
  const totalPages = data?.pagination?.totalPages ?? 1;
  // search/frequency/status are already applied server-side (see usePlans params above).
  const filteredPlans = data?.data ?? [];

  const isPending =
    createPlan.isPending ||
    updatePlan.isPending ||
    pausePlan.isPending ||
    resumePlan.isPending ||
    archivePlan.isPending;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!requireCompanySelected()) return;

    if (!formData.machineId.trim()) {
      setFormError('Machine ID is required');
      return;
    }
    if (!formData.assignedToId.trim()) {
      setFormError('Assigned technician ID is required');
      return;
    }
    if (!formData.title.trim()) {
      setFormError('Plan title is required');
      return;
    }
    if (!formData.startDate) {
      setFormError('Start date is required');
      return;
    }

    try {
      if (editingId) {
        const updatePayload: UpdatePlanDto = {
          title: formData.title,
          description: formData.description || undefined,
          activityTypeId: formData.activityTypeId,
          assignedToId: formData.assignedToId,
          priority: formData.priority,
          estimatedMinutes: formData.estimatedMinutes,
          onHoliday: formData.onHoliday,
          endDate: formData.endDate || undefined,
          editScope: 'FUTURE',
        };
        await updatePlan.mutateAsync({ id: editingId, data: updatePayload });
      } else {
        await createPlan.mutateAsync({
          ...formData,
          planCode: formData.planCode?.trim() || undefined,
          endDate: formData.endDate || undefined,
          description: formData.description || undefined,
        });
      }
      setShowForm(false);
      setEditingId(null);
      setFormData(emptyForm);
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Failed to save plan');
    }
  };

  const handleEdit = (plan: MaintenancePlan) => {
    if (!requireCompanySelected()) return;
    setFormData({
      machineId: plan.machineId,
      assignedToId: plan.assignedToId,
      title: plan.title,
      planCode: plan.planCode ?? '',
      description: plan.description ?? '',
      activityTypeId: plan.activityType?.id ?? '',
      frequency: plan.frequency,
      startDate: plan.startDate?.slice(0, 10) ?? '',
      endDate: plan.endDate?.slice(0, 10) ?? '',
      priority: plan.priority,
      estimatedMinutes: plan.estimatedMinutes,
      onHoliday: plan.onHoliday,
    });
    setEditingId(plan.id);
    setFormError(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <style>{`
        @keyframes plan-in { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl shadow-lg border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3 tracking-tight">
            <div className="p-2 bg-sky-100 rounded-lg shadow-sm shadow-sky-50">
              <IconCalendar size={24} className="text-sky-600" />
            </div>
            Maintenance Plans
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 ml-11">
            Strategic Asset Scheduling
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm active:scale-95"
          >
            <IconRefresh size={18} className={`text-gray-500 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => router.push('/maintenance/assign-task')}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl transition-all text-sm font-semibold shadow-sm hover:shadow active:scale-95 tracking-wide bg-sky-600 text-white"
          >
            <IconPlus size={18} />
            New Plan
          </button>
        </div>
      </div>

      {/* Stats Row */}
      {!isLoading && total > 0 && !showForm && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: 'Total Plans',
              value: totalData?.pagination?.total ?? 0,
              icon: <IconArchive size={18} />,
              color: 'bg-blue-100 text-blue-600',
            },
            {
              label: 'Active',
              value: activeData?.pagination?.total ?? 0,
              icon: <IconPlayerPlay size={18} />,
              color: 'bg-green-100 text-green-600',
            },
            {
              label: 'Paused',
              value: pausedData?.pagination?.total ?? 0,
              icon: <IconPlayerPause size={18} />,
              color: 'bg-amber-100 text-amber-600',
            },
            {
              label: 'Drafts',
              value: draftData?.pagination?.total ?? 0,
              icon: <IconEdit size={18} />,
              color: 'bg-gray-100 text-gray-600',
            },
          ].map((s, idx) => (
            <div
              key={idx}
              className="p-5 bg-white rounded-2xl shadow-lg border border-gray-100 flex items-center hover:shadow-xl transition-all hover:-translate-y-1"
            >
              <div className={`p-2.5 rounded-full mr-4 shadow-sm ${s.color}`}>{s.icon}</div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {s.label}
                </p>
                <h3 className="text-xl font-bold text-gray-900 tracking-tight">{s.value}</h3>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="mb-8 animate-cl-row-in">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">            <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
              <h2 className="text-lg font-semibold text-gray-900 tracking-tight">
                {editingId ? 'Modify Strategic Plan' : 'Establish New Schedule'}
              </h2>
              <div className="p-2 bg-sky-100 rounded-lg">
                <IconDeviceFloppy size={18} className="text-sky-600" />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-8">
              {formError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-xs font-semibold animate-shake">
                  <IconAlertCircle size={16} /> {formError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                    Machine Asset
                  </label>
                  <select
                    name="machineId"
                    value={formData.machineId}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 bg-gray-50/50 focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/50 transition-all font-medium text-gray-700 shadow-sm"
                    disabled={isPending}
                  >
                    <option value="">Select Target Machine</option>
                    <option value="MAC-1">Machine #1</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                    Technician
                  </label>
                  <select
                    name="assignedToId"
                    value={formData.assignedToId}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 bg-gray-50/50 focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/50 transition-all font-medium text-gray-700 shadow-sm"
                    disabled={isPending}
                  >
                    <option value="">Select Primary Assignee</option>
                    <option value="TECH-1">Lead Technician</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                    Plan Title
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="Strategic Title"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 bg-gray-50/50 focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/50 transition-all font-medium text-gray-700 shadow-sm"
                    disabled={isPending}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                    Plan ID{' '}
                    <span className="normal-case font-normal text-muted-foreground">(optional)</span>
                  </label>
                  <input
                    type="text"
                    name="planCode"
                    value={formData.planCode ?? ''}
                    onChange={handleChange}
                    placeholder="Leave blank to auto-generate (e.g. MP007)"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 bg-gray-50/50 focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/50 transition-all font-medium text-gray-700 shadow-sm disabled:opacity-60"
                    disabled={isPending || !!editingId}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                    Frequency
                  </label>
                  <select
                    name="frequency"
                    value={formData.frequency}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 bg-gray-50/50 focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/50 transition-all font-medium text-gray-700 shadow-sm"
                    disabled={isPending}
                  >
                    {FREQUENCIES.map((f) => (
                      <option key={f} value={f}>
                        {PLAN_FREQUENCY_LABELS[f]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                    Start Date
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 bg-gray-50/50 focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/50 transition-all font-medium text-gray-700 shadow-sm"
                    disabled={isPending}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                    Priority Level
                  </label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 bg-gray-50/50 focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/50 transition-all font-medium text-gray-700 shadow-sm"
                    disabled={isPending}
                  >
                    <option value={1}>P1 — Critical</option>
                    <option value={2}>P2 — High Impact</option>
                    <option value={3}>P3 — Standard</option>
                    <option value={4}>P4 — Auxiliary</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-4 border-t border-gray-100 pt-8">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center gap-2 px-6 py-2.5 bg-sky-600 text-white rounded-xl text-sm font-semibold tracking-wide hover:bg-sky-700 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                >
                  {isPending ? (
                    <IconRefresh size={16} className="animate-spin" />
                  ) : (
                    <IconDeviceFloppy size={16} />
                  )}
                  {editingId ? 'Commit Changes' : 'Initialize Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
        <div className="relative flex-1 group">
          <IconSearch
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-sky-500 transition-colors"
          />
          <input
            type="text"
            placeholder="Search by plan title, machine or technician..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl pl-11 pr-4 py-2.5 bg-gray-50/50 w-full focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/50 focus:bg-white transition-all font-bold text-gray-700 shadow-sm"
          />
        </div>
        <select
          value={filterFrequency}
          onChange={(e) => setFilterFrequency(e.target.value as any)}
          className="text-sm border border-gray-200 rounded-xl px-4 py-2.5 bg-gray-50/50 focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/50 transition-all font-bold text-gray-700 shadow-sm min-w-[160px]"
        >
          <option value="All">All Frequencies</option>
          {FREQUENCIES.map((f) => (
            <option key={f} value={f}>
              {PLAN_FREQUENCY_LABELS[f]}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="text-sm border border-gray-200 rounded-xl px-4 py-2.5 bg-gray-50/50 focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/50 transition-all font-bold text-gray-700 shadow-sm min-w-[160px]"
        >
          <option value="All">All Status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {PLAN_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {/* Grid of Plans */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-gray-100 animate-pulse" />
          ))
        ) : filteredPlans.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-2xl border border-dashed border-gray-200">
            <IconCalendar size={48} className="mx-auto text-gray-200 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 tracking-tight">
              No Maintenance Plans
            </h3>
            <p className="text-muted-foreground text-xs mt-1">
              No maintenance plans found matching your criteria
            </p>
          </div>
        ) : (
          filteredPlans.map((plan, i) => (
            <div
              key={plan.id}
              className="group bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              style={{ animation: `cl-row-in 0.3s ease ${Math.min(i, 8) * 50}ms both` }}
            >
              <div className="flex items-start justify-between gap-4 mb-6">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-base font-semibold text-gray-900 tracking-tight truncate group-hover:text-sky-600 transition-colors">
                      {plan.title}
                    </h3>
                    <StatusBadge status={plan.status} />
                  </div>
                  <p className="text-xs text-muted-foreground italic">
                    {plan.activityType?.name ?? '—'}
                    {plan.planCode && (
                      <span className="ml-2 font-mono normal-case not-italic text-gray-500">
                        {plan.planCode}
                      </span>
                    )}
                  </p>
                </div>
                <div
                  className={`p-3 rounded-xl shadow-sm ${FREQUENCY_COLORS[plan.frequency] || 'bg-gray-100 text-gray-500'}`}
                >
                  <p className="text-[10px] font-semibold uppercase leading-none text-center">
                    Freq
                  </p>
                  <p className="text-xs font-bold uppercase text-center mt-1">
                    {PLAN_FREQUENCY_LABELS[plan.frequency]?.charAt(0)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-3 bg-gray-50/50 rounded-xl border border-gray-100">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Target Machine
                  </p>
                  <p className="text-xs font-medium text-gray-700 truncate">
                    {plan.machine?.name || 'Unlinked'}
                  </p>
                  <p className="text-[11px] font-mono text-muted-foreground mt-0.5 truncate">
                    {plan.machine?.assetCode || 'NO_ASSET'}
                  </p>
                </div>
                <div className="p-3 bg-gray-50/50 rounded-xl border border-gray-100">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Primary Assignee
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-sky-100 flex items-center justify-center text-[10px] font-semibold text-sky-600 border border-sky-200">
                      {plan.assignedTo?.name?.charAt(0) || '?'}
                    </div>
                    <span className="text-xs font-medium text-gray-700 truncate">
                      {plan.assignedTo?.name || 'Unassigned'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-y-2 border-t border-gray-50 pt-5">
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-muted-foreground font-normal">
                  <span className="flex items-center gap-1.5 uppercase tracking-wider font-medium">
                    <IconCalendar size={14} className="text-sky-500/50" />
                    {new Date(plan.startDate).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-gray-200" />
                  <span className="flex items-center gap-1.5 uppercase tracking-wider font-medium">
                    {plan._count?.workOrders || 0} Assignments
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <button
                      onClick={() => handleEdit(plan)}
                      className="p-2 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all"
                      title="Edit Strategic Plan"
                    >
                      <IconEdit size={16} />
                    </button>
                  )}
                  {plan.status === 'ACTIVE' ? (
                    <button
                      onClick={() => {
                        if (!requireCompanySelected()) return;
                        pausePlan.mutate({ id: plan.id });
                      }}
                      className="p-2 text-amber-400 hover:bg-amber-50 rounded-lg transition-all"
                      title="Suspend Schedule"
                    >
                      <IconPlayerPause size={16} />
                    </button>
                  ) : plan.status === 'PAUSED' ? (
                    <button
                      onClick={() => {
                        if (!requireCompanySelected()) return;
                        resumePlan.mutate(plan.id);
                      }}
                      className="p-2 text-green-400 hover:bg-green-50 rounded-lg transition-all"
                      title="Resume Schedule"
                    >
                      <IconPlayerPlay size={16} />
                    </button>
                  ) : null}
                  <button
                    onClick={() => {
                      if (!requireCompanySelected()) return;
                      if (confirm('Permanently archive this strategic plan?'))
                        archivePlan.mutate(plan.id);
                    }}
                    className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    title="Archive Plan"
                  >
                    <IconArchive size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>
            Showing {filteredPlans.length} of {total} plans
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-2 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all disabled:opacity-30"
            >
              <IconChevronLeft size={18} />
            </button>
            <span className="tabular-nums font-medium">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="p-2 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all disabled:opacity-30"
            >
              <IconChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
