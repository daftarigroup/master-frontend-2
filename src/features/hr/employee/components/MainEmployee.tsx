'use client';

import {
  IconAlertCircle,
  IconBriefcase,
  IconBuilding,
  IconCalendar,
  IconClock,
  IconDroplet,
  IconHistory,
  IconId,
  IconLayersIntersect,
  IconLoader2,
  IconMail,
  IconMapPin,
  IconPhone,
  IconRefresh,
  IconSearch,
  IconUser,
  IconUserCheck,
  IconUserOff,
  IconUserPlus,
  IconUsers,
  IconUserX,
} from '@tabler/icons-react';
import type React from 'react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useProject } from '@/context/ProjectContext';
import { resolveActAsTenant } from '@/features/organization/utils/actAsTenant';
import { cn } from '@/lib/utils';
import { useAppSelector } from '@/store/hook';
import { selectUser } from '@/store/slice/userAccountData';
import {
  AssignToProjectModal,
} from '../../deployment/components/DeploymentModals';
import {
  useAssignToProject,
  useAssignmentEvents,
  useProjectAssignments,
} from '../../deployment/server/tanstackQuery/useDeploymentQueries';
import type { ProjectAssignment } from '../../deployment/types/types';
import { useDepartmentOptions } from '../../_shared/tanstackQuery/useDepartments';
import {
  useEmployeeById,
  useEmployeeStats,
  useEmployees,
  useLeavingEmployees,
  useUpdateEmployee,
} from '../server/tanstackQuery/useEmployeeQueries';
import type { Employee } from '../types/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; bg: string; dot: string; text: string }> = {
  active: { label: 'Active', bg: 'bg-success/10', dot: 'bg-success', text: 'text-success' },
  probation: { label: 'Probation', bg: 'bg-primary/10', dot: 'bg-primary', text: 'text-primary' },
  on_notice: { label: 'On Notice', bg: 'bg-warning/10', dot: 'bg-warning', text: 'text-warning' },
  exit_interview: {
    label: 'Exit Interview',
    bg: 'bg-warning/10',
    dot: 'bg-warning',
    text: 'text-warning',
  },
  left: {
    label: 'Left',
    bg: 'bg-muted',
    dot: 'bg-muted-foreground',
    text: 'text-muted-foreground',
  },
  completed: {
    label: 'Left',
    bg: 'bg-muted',
    dot: 'bg-muted-foreground',
    text: 'text-muted-foreground',
  },
};

// 'completed' renders as the same "Left" pill as 'left' (see STATUS_CFG above) —
// filtering and the Fire action must treat them as the same terminal state.
const isLeftStatus = (status: string) => status === 'left' || status === 'completed';

const isOnProbation = (emp: Employee): boolean => {
  if (emp.status !== 'active' || !emp.joiningDate) return false;
  const months = emp.joining?.probationMonths ?? emp.candidate?.joining?.probationMonths ?? 0;
  if (!months) return false;
  const end = new Date(emp.joiningDate);
  end.setMonth(end.getMonth() + months);
  return end > new Date();
};

const StatusPill = ({ status }: { status: string }) => {
  const cfg = STATUS_CFG[status] ?? {
    label: status,
    bg: 'bg-muted',
    dot: 'bg-muted-foreground',
    text: 'text-muted-foreground',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em]',
        cfg.bg,
        cfg.text
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  );
};

const initials = (name: string) => {
  const trimmed = name.trim();
  if (!trimmed) return '??';
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return (parts[0]?.slice(0, 2) ?? '??').toUpperCase();
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
};

// Shows only the last 4 digits — the employee list has no role restriction today
// (any authenticated user can open it), so the full Aadhaar number stays out of view.
const maskAadhaar = (value?: string | null) => {
  const digits = value?.replace(/\D/g, '');
  if (!digits) return null;
  return `•••• •••• ${digits.slice(-4)}`;
};

const fmtDate = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const DetailRow = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string | null;
}) => {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 break-all text-[13px] font-medium">{value}</p>
      </div>
    </div>
  );
};

const todayIso = () => new Date().toISOString().slice(0, 10);

const FireModal = ({
  emp,
  onClose,
  onConfirm,
  loading,
}: {
  emp: Employee;
  onClose: () => void;
  onConfirm: (lastWorkingDay: string, reason: string, terminationDate: string) => void;
  loading: boolean;
}) => {
  const [lwd, setLwd] = useState(todayIso());
  const [terminationDate, setTerminationDate] = useState(todayIso());
  const [reason, setReason] = useState('');

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <IconUserOff className="h-4.5 w-4.5" />
            </span>
            Terminate Employee
          </DialogTitle>
          <DialogDescription>{emp.name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-[12px] text-destructive">
            This will mark <span className="font-semibold">{emp.name}</span> as terminated. This
            action cannot be undone.
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fire-termination-date">Date of Termination</Label>
            <Input
              id="fire-termination-date"
              type="date"
              value={terminationDate}
              onChange={(e) => setTerminationDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fire-lwd">Last Working Day</Label>
            <Input id="fire-lwd" type="date" value={lwd} onChange={(e) => setLwd(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fire-reason">Reason</Label>
            <Textarea
              id="fire-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Performance issues, misconduct…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => onConfirm(lwd, reason, terminationDate)}
            disabled={loading || !lwd || !terminationDate || !reason.trim()}
          >
            {loading && <IconLoader2 className="h-3.5 w-3.5 animate-spin" />}
            Terminate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

const MainEmployee = () => {
  const user = useAppSelector(selectUser);
  const {
    data: activeEmployees = [],
    isLoading: loadingActive,
    isError: isErrorActive,
    refetch: refetchActive,
  } = useEmployees();
  const {
    data: leavingEmployees = [],
    isLoading: loadingLeaving,
    isError: isErrorLeaving,
    refetch: refetchLeaving,
  } = useLeavingEmployees();
  const {
    data: stats,
    isLoading: loadingStats,
    isError: isErrorStats,
    refetch: refetchStats,
  } = useEmployeeStats();
  const {
    data: allDepartments = [],
    isLoading: loadingDepartments,
    isError: isErrorDepartments,
    refetch: refetchDepartments,
  } = useDepartmentOptions();
  const updateMutation = useUpdateEmployee();
  const { availableProjects } = useProject();
  const { data: assignments = [], refetch: refetchAssignments } = useProjectAssignments();
  const { data: allEvents = [] } = useAssignmentEvents();
  const assignMutation = useAssignToProject();

  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');
  const [selected, setSelected] = useState<Employee | null>(null);
  const [fireTarget, setFireTarget] = useState<Employee | null>(null);
  const [assignTarget, setAssignTarget] = useState<Employee | null>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'deployment'>('info');

  const loadingList = loadingActive || loadingLeaving || loadingStats || loadingDepartments;
  const isError = isErrorActive || isErrorLeaving || isErrorStats || isErrorDepartments;
  const refetch = () => {
    refetchActive();
    refetchLeaving();
    refetchStats();
    refetchDepartments();
    refetchAssignments();
  };

  const employees = useMemo(() => {
    const seen = new Set<string>();
    return [...activeEmployees, ...leavingEmployees].filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });
  }, [activeEmployees, leavingEmployees]);

  const projectOptions = useMemo(() => {
    const list = availableProjects || [];
    const seen = new Set<string>();
    return list.filter((p) => {
      if (p.id === 'all' || seen.has(p.name)) return false;
      seen.add(p.name);
      return true;
    });
  }, [availableProjects]);

  const activeAssignmentMap = useMemo(() => {
    const map = new Map<string, ProjectAssignment>();
    assignments.forEach((a) => {
      if (a.status === 'active' || a.status === 'on_leave') {
        map.set(a.employeeId, a);
      }
    });
    return map;
  }, [assignments]);

  // The list response omits aadharNo — fetch the single-employee record (which
  // includes it) only while its detail dialog is actually open.
  const { data: selectedDetail } = useEmployeeById(selected?.id ?? '');

  const handleFire = async (lastWorkingDay: string, reason: string, terminationDate: string) => {
    if (!fireTarget) return;
    await updateMutation.mutateAsync({
      id: fireTarget.id,
      data: {
        status: 'on_notice',
        lastWorkingDay,
        terminationDate,
        separationType: 'fired',
        leavingReason: reason || undefined,
      },
      actAsTenantId: resolveActAsTenant(fireTarget.tenant, user?.tenantId),
    });
    setFireTarget(null);
  };

  const handleAssignConfirm = async (payload: {
    employeeId: string;
    projectId: number | string;
    projectName: string;
    roleOnProject: string;
    assignedDate: string;
    notes?: string;
  }) => {
    await assignMutation.mutateAsync({ payload });
    setAssignTarget(null);
  };

  const departments = useMemo(() => allDepartments.map((d) => d.name).sort(), [allDepartments]);

  const probationCount = useMemo(() => employees.filter(isOnProbation).length, [employees]);
  const hasMultiTenantRows = useMemo(() => employees.some((e) => e.tenant), [employees]);

  const deployedCount = useMemo(() => {
    const activeAssigns = assignments.filter((a) => a.status === 'active' || a.status === 'on_leave');
    return new Set(activeAssigns.map((a) => a.employeeId)).size;
  }, [assignments]);

  const benchCount = useMemo(() => {
    const activeEmps = employees.filter((e) => e.status !== 'left' && e.status !== 'completed').length;
    return Math.max(0, activeEmps - deployedCount);
  }, [employees, deployedCount]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    return employees.filter((e) => {
      const matchSearch =
        !term ||
        e.name.toLowerCase().includes(term) ||
        (e.email ?? '').toLowerCase().includes(term) ||
        (e.phone ?? '').includes(term) ||
        (e.empCode ?? e.employeeId ?? '').toLowerCase().includes(term) ||
        (e.designation ?? '').toLowerCase().includes(term);

      const matchDept = !deptFilter || e.department?.name === deptFilter;

      const matchStatus =
        !statusFilter ||
        (statusFilter === 'probation'
          ? isOnProbation(e)
          : statusFilter === 'left'
            ? isLeftStatus(e.status)
            : e.status === statusFilter);

      const assignment = activeAssignmentMap.get(e.employeeId) || activeAssignmentMap.get(e.id);
      const matchProject =
        projectFilter === 'all'
          ? true
          : projectFilter === 'bench'
            ? !assignment
            : assignment?.projectName.toLowerCase() === projectFilter.toLowerCase() ||
              String(assignment?.projectId) === String(projectFilter);

      return matchSearch && matchDept && matchStatus && matchProject;
    });
  }, [employees, search, deptFilter, statusFilter, projectFilter, activeAssignmentMap]);

  const statCards = [
    {
      label: 'Total',
      value: stats?.total ?? employees.length,
      Icon: IconUsers,
      tint: 'bg-primary/10 text-primary',
      vc: 'text-foreground',
    },
    {
      label: 'Active',
      value: stats?.active ?? 0,
      Icon: IconUserCheck,
      tint: 'bg-success/10 text-success',
      vc: 'text-success',
    },
    {
      label: 'Deployed',
      value: deployedCount,
      Icon: IconBriefcase,
      tint: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      vc: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'On Bench',
      value: benchCount,
      Icon: IconLayersIntersect,
      tint: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
      vc: 'text-purple-600 dark:text-purple-400',
    },
    {
      label: 'On Notice',
      value: stats?.onNotice ?? 0,
      Icon: IconUser,
      tint: 'bg-warning/10 text-warning',
      vc: 'text-warning',
    },
    {
      label: 'Left',
      value: stats?.left ?? 0,
      Icon: IconUserX,
      tint: 'bg-muted text-muted-foreground',
      vc: 'text-foreground',
    },
  ];

  if (loadingList) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <IconLoader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-[13px]">Loading employees…</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
          <IconAlertCircle className="h-7 w-7 text-destructive" />
          <p className="text-[13px] font-semibold text-destructive">Couldn't load employees</p>
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

  return (
    <div className="bg-background text-foreground grow">
      <div className="mx-auto max-w-350 space-y-5 px-4 pt-6 pb-10 sm:px-6 lg:px-8">
        {/* Page heading */}
        <div>
          <p className="mb-0.5 text-[12px] text-muted-foreground">Workforce</p>
          <h1 className="text-[22px] font-bold leading-tight tracking-[-0.03em]">Employees</h1>
        </div>

        {/* Hero banner */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <div className="flex flex-wrap items-center gap-4 bg-linear-to-br from-card to-card/50 px-5 py-5 sm:px-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/12 text-primary">
              <IconUsers className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-[18px] font-bold tracking-[-0.02em]">Employee Directory</h2>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                All employees processed through HRFMS onboarding
              </p>
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
          {statCards.map((s) => (
            <div
              key={s.label}
              className="group rounded-xl border border-border bg-card p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg sm:p-5"
            >
              <div
                className={cn(
                  'mb-3 inline-flex h-9 w-9 items-center justify-center rounded-[9px]',
                  s.tint
                )}
              >
                <s.Icon className="h-5.5 w-5.5" />
              </div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                {s.label}
              </p>
              <p
                className={cn(
                  'text-[28px] font-bold leading-none tracking-[-0.02em] tabular-nums',
                  s.vc
                )}
              >
                {s.value.toLocaleString('en-IN')}
              </p>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs sm:px-5">
          <div className="flex flex-col gap-2.5 md:flex-row md:items-center">
            <div className="relative flex-1">
              <IconSearch className="pointer-events-none absolute top-1/2 left-3.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name, employee ID, email, phone or designation…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-muted pl-10 pr-3 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
              />
            </div>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="h-10 cursor-pointer rounded-lg border border-border bg-muted px-3 pr-8 text-[13px] font-medium text-foreground outline-none transition-colors focus:border-primary md:min-w-40"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="h-10 cursor-pointer rounded-lg border border-border bg-muted px-3 pr-8 text-[13px] font-medium text-foreground outline-none transition-colors focus:border-primary md:min-w-44"
            >
              <option value="all">All Projects</option>
              <option value="bench">⚡ Bench (Unassigned)</option>
              {projectOptions.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 cursor-pointer rounded-lg border border-border bg-muted px-3 pr-8 text-[13px] font-medium text-foreground outline-none transition-colors focus:border-primary md:min-w-36"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="probation">Probation</option>
              <option value="on_notice">On Notice</option>
              <option value="exit_interview">Exit Interview</option>
              <option value="left">Left</option>
            </select>
          </div>
        </div>

        {/* Result count */}
        <div className="px-1 text-[12px] text-muted-foreground">
          Showing{' '}
          <span className="font-semibold text-foreground tabular-nums">{filtered.length}</span> of{' '}
          <span className="font-semibold text-foreground tabular-nums">{employees.length}</span>{' '}
          employee{employees.length === 1 ? '' : 's'}
        </div>

        {/* Table */}
        {filtered.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full min-w-225">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {[
                      'Action',
                      ...(hasMultiTenantRows ? ['Company'] : []),
                      'Employee',
                      'Employee ID',
                      'Department',
                      'Current Project',
                      'Designation',
                      'Joined',
                      'Status',
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((emp) => {
                    const isLeft = isLeftStatus(emp.status);
                    const currentAssign =
                      activeAssignmentMap.get(emp.employeeId) || activeAssignmentMap.get(emp.id);

                    return (
                      <tr
                        key={emp.id}
                        className="cursor-pointer transition-colors hover:bg-muted/40"
                        onClick={() => {
                          setSelected(emp);
                          setDetailTab('info');
                        }}
                      >
                        <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5">
                            {!isLeft ? (
                              <>
                                {!currentAssign && (
                                  <button
                                    type="button"
                                    onClick={() => setAssignTarget(emp)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2 py-1.5 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/20"
                                    title="Assign to construction project"
                                  >
                                    <IconUserPlus className="h-3 w-3" />
                                    Assign
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setFireTarget(emp)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-destructive/40 bg-destructive/8 px-2 py-1.5 text-[11px] font-semibold text-destructive transition-colors hover:bg-destructive/15"
                                  title="Initiate separation"
                                >
                                  <IconUserOff className="h-3 w-3" />
                                  Fire
                                </button>
                              </>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">—</span>
                            )}
                          </div>
                        </td>
                        {hasMultiTenantRows && (
                          <td className="px-5 py-3.5 text-[12px] text-muted-foreground">
                            {emp.tenant?.name ?? '—'}
                          </td>
                        )}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-[11px] font-bold text-primary">
                              {initials(emp.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-[13px] font-semibold">{emp.name}</p>
                              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                {emp.email ?? '—'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-[11px] font-semibold text-muted-foreground">
                          {emp.empCode ?? emp.employeeId ?? '—'}
                        </td>
                        <td className="px-5 py-3.5 text-[12px] text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <IconBuilding className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{emp.department?.name ?? '—'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-[12px]">
                          {currentAssign ? (
                            <div>
                              <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-600 dark:text-blue-400">
                                <IconBriefcase className="h-3 w-3" />
                                {currentAssign.projectName}
                              </span>
                              {currentAssign.roleOnProject && (
                                <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                                  {currentAssign.roleOnProject}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 px-2 py-0.5 text-[11px] font-medium text-purple-600 dark:text-purple-400">
                              <IconLayersIntersect className="h-3 w-3" /> Bench
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-[12px] text-muted-foreground">
                          {emp.designation ?? '—'}
                        </td>
                        <td className="px-5 py-3.5 text-[12px] text-muted-foreground">
                          {fmtDate(emp.joiningDate)}
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusPill status={emp.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <IconUsers className="h-6 w-6" />
            </div>
            <h3 className="text-[14px] font-semibold">No employees found</h3>
            <p className="mt-1 text-[12px] text-muted-foreground">
              {search || deptFilter || projectFilter !== 'all' || statusFilter
                ? 'Try adjusting your filters.'
                : 'Employees will appear here once candidates are onboarded through HRFMS.'}
            </p>
          </div>
        )}
      </div>

      {/* Detail modal */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                    <IconUsers className="h-5 w-5" />
                  </span>
                  Employee Details
                </DialogTitle>
                <DialogDescription>{selected.designation ?? 'Employee'}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Tab buttons */}
                <div className="flex border-b border-border">
                  <button
                    type="button"
                    onClick={() => setDetailTab('info')}
                    className={cn(
                      'flex items-center gap-2 border-b-2 px-4 py-2.5 text-[13px] font-semibold transition-colors',
                      detailTab === 'info'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <IconUser className="h-4 w-4" /> Profile Info
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailTab('deployment')}
                    className={cn(
                      'flex items-center gap-2 border-b-2 px-4 py-2.5 text-[13px] font-semibold transition-colors',
                      detailTab === 'deployment'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <IconBriefcase className="h-4 w-4" /> Project Deployment
                  </button>
                </div>

                {detailTab === 'info' ? (
                  <div className="space-y-5">
                    {/* Profile header */}
                    <div className="flex items-center gap-4 rounded-xl border border-border bg-muted/40 p-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/12 text-[18px] font-bold text-primary">
                        {initials(selected.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-[18px] font-bold tracking-[-0.02em]">
                          {selected.name}
                        </h3>
                        <p className="truncate text-[12px] text-muted-foreground">
                          {selected.email ?? '—'}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <StatusPill status={selected.status} />
                        </div>
                      </div>
                    </div>

                    {/* Details grid */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <DetailRow
                        icon={IconId}
                        label="Employee ID"
                        value={selected.empCode ?? selected.employeeId}
                      />
                      <DetailRow icon={IconMail} label="Email" value={selected.email} />
                      <DetailRow icon={IconPhone} label="Phone" value={selected.phone} />
                      <DetailRow
                        icon={IconBuilding}
                        label="Department"
                        value={selected.department?.name}
                      />
                      <DetailRow icon={IconUser} label="Designation" value={selected.designation} />
                      <DetailRow
                        icon={IconCalendar}
                        label="Joining Date"
                        value={fmtDate(selected.joiningDate)}
                      />
                      <DetailRow
                        icon={IconMapPin}
                        label="Work Location"
                        value={selected.workLocation}
                      />
                      <DetailRow icon={IconDroplet} label="Blood Group" value={selected.bloodGroup} />
                      <DetailRow icon={IconUser} label="Manager" value={selected.managerName} />
                      <DetailRow
                        icon={IconId}
                        label="Aadhaar Number"
                        value={maskAadhaar(selectedDetail?.joining?.aadharNo)}
                      />
                      {selected.lastWorkingDay && (
                        <DetailRow
                          icon={IconCalendar}
                          label="Last Working Day"
                          value={fmtDate(selected.lastWorkingDay)}
                        />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Active Assignment Card */}
                    {(() => {
                      const currentAssign =
                        activeAssignmentMap.get(selected.employeeId) ||
                        activeAssignmentMap.get(selected.id);

                      if (currentAssign) {
                        return (
                          <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                                  Active Deployment
                                </span>
                                <h4 className="mt-2 text-[16px] font-bold text-foreground">
                                  {currentAssign.projectName}
                                </h4>
                                <p className="text-[12px] text-muted-foreground">
                                  Role: {currentAssign.roleOnProject || selected.designation || 'Site Personnel'}
                                </p>
                              </div>
                              <span className="rounded-lg bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                                Deployed: {fmtDate(currentAssign.assignedDate)}
                              </span>
                            </div>
                            {currentAssign.reason && (
                              <p className="mt-3 text-[12px] italic text-muted-foreground border-t border-border/50 pt-2">
                                “{currentAssign.reason}”
                              </p>
                            )}
                          </div>
                        );
                      }

                      return (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
                          <IconLayersIntersect className="h-8 w-8 text-purple-500" />
                          <h4 className="mt-2 text-[14px] font-semibold text-foreground">Currently on Bench</h4>
                          <p className="mt-1 text-[12px] text-muted-foreground max-w-sm">
                            This employee is in the home department pool and ready to be assigned to a construction site/project.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setSelected(null);
                              setAssignTarget(selected);
                            }}
                            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[12px] font-semibold text-primary-foreground hover:opacity-90"
                          >
                            <IconUserPlus className="h-3.5 w-3.5" /> Deploy to Project
                          </button>
                        </div>
                      );
                    })()}

                    {/* Timeline History */}
                    <div>
                      <h4 className="flex items-center gap-2 text-[13px] font-semibold text-foreground mb-3">
                        <IconHistory className="h-4 w-4 text-primary" /> Assignment History
                      </h4>
                      {(() => {
                        const historyEvents = allEvents.filter(
                          (ev) =>
                            ev.employeeId === selected.employeeId ||
                            ev.employeeId === selected.id
                        );

                        if (historyEvents.length === 0) {
                          return (
                            <p className="rounded-lg border border-border/60 bg-muted/20 p-4 text-center text-[12px] text-muted-foreground">
                              No assignment history recorded yet.
                            </p>
                          );
                        }

                        return (
                          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                            {historyEvents.map((ev) => (
                              <div
                                key={ev.id}
                                className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card p-3 text-[12px]"
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase bg-muted text-foreground">
                                      {ev.eventType}
                                    </span>
                                    <span className="font-semibold">
                                      {ev.toProjectName || ev.fromProjectName || 'Project'}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground">
                                    {ev.notes || `Project action: ${ev.eventType}`}
                                  </p>
                                </div>
                                <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                                  {fmtDate(ev.timestamp)}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {fireTarget && (
        <FireModal
          emp={fireTarget}
          onClose={() => setFireTarget(null)}
          onConfirm={handleFire}
          loading={updateMutation.isPending}
        />
      )}

      {assignTarget && (
        <AssignToProjectModal
          employee={{
            id: assignTarget.id,
            employeeId: assignTarget.employeeId || assignTarget.empCode || assignTarget.id,
            name: assignTarget.name,
            designation: assignTarget.designation,
            department: assignTarget.department?.name,
          }}
          projects={projectOptions}
          onClose={() => setAssignTarget(null)}
          onConfirm={handleAssignConfirm}
          loading={assignMutation.isPending}
        />
      )}
    </div>
  );
};

export default MainEmployee;
