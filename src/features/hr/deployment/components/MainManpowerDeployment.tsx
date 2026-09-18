'use client';

import React, { useMemo, useState } from 'react';
import {
  IconAlertCircle,
  IconArrowRight,
  IconBriefcase,
  IconBuilding,
  IconCalendar,
  IconCheck,
  IconClock,
  IconFilter,
  IconHistory,
  IconLayersIntersect,
  IconLoader2,
  IconMapPin,
  IconRefresh,
  IconSearch,
  IconUserCheck,
  IconUserMinus,
  IconUserPlus,
  IconUsers,
  IconUserX,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { useProject } from '@/context/ProjectContext';
import { cn } from '@/lib/utils';
import { useDepartmentOptions } from '../../_shared/tanstackQuery/useDepartments';
import { useEmployees } from '../../employee/server/tanstackQuery/useEmployeeQueries';
import type { Employee } from '../../employee/types/types';
import {
  useAssignToProject,
  useAssignmentEvents,
  useProjectAssignments,
  usePutOnProjectLeave,
  useRemoveFromProject,
  useResumeProjectAssignment,
  useShiftProjectAssignment,
} from '../server/tanstackQuery/useDeploymentQueries';
import type {
  ProjectAssignment,
  ProjectAssignmentEvent,
} from '../types/types';
import {
  AssignToProjectModal,
  ProjectLeaveModal,
  RemoveFromProjectModal,
  ShiftProjectModal,
} from './DeploymentModals';

const fmtDate = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtDateTime = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
};

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return (parts[0]?.slice(0, 2) ?? '??').toUpperCase();
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
};

export const MainManpowerDeployment: React.FC = () => {
  const { selectedProject, selectProject, availableProjects } = useProject();
  const { data: employees = [], isLoading: loadingEmployees, refetch: refetchEmployees } = useEmployees();
  const { data: assignments = [], isLoading: loadingAssignments, refetch: refetchAssignments } = useProjectAssignments();
  const { data: events = [], isLoading: loadingEvents, refetch: refetchEvents } = useAssignmentEvents();
  const { data: allDepartments = [] } = useDepartmentOptions();

  // Mutations
  const assignMutation = useAssignToProject();
  const shiftMutation = useShiftProjectAssignment();
  const removeMutation = useRemoveFromProject();
  const leaveMutation = usePutOnProjectLeave();
  const resumeMutation = useResumeProjectAssignment();

  // Active view tab: 'roster' | 'bench' | 'events'
  const [activeTab, setActiveTab] = useState<'roster' | 'bench' | 'events'>('roster');

  // Filters
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal states
  const [assignTarget, setAssignTarget] = useState<Employee | null>(null);
  const [shiftTarget, setShiftTarget] = useState<ProjectAssignment | null>(null);
  const [removeTarget, setRemoveTarget] = useState<ProjectAssignment | null>(null);
  const [leaveTarget, setLeaveTarget] = useState<ProjectAssignment | null>(null);

  const projects = useMemo(() => {
    const list = availableProjects || [];
    const seen = new Set<string>();
    return list.filter((p) => {
      if (p.id === 'all' || seen.has(p.name)) return false;
      seen.add(p.name);
      return true;
    });
  }, [availableProjects]);

  // Active assignment map by employeeId
  const activeAssignmentMap = useMemo(() => {
    const map = new Map<string, ProjectAssignment>();
    assignments.forEach((a) => {
      if (a.status === 'active' || a.status === 'on_leave') {
        map.set(a.employeeId, a);
      }
    });
    return map;
  }, [assignments]);

  // Current project filter (from global selector or fallback)
  const currentProjectName = selectedProject?.id !== 'all' && selectedProject?.name ? selectedProject.name : 'all';

  // Roster assignments
  const rosterAssignments = useMemo(() => {
    return assignments.filter((a) => {
      if (a.status !== 'active' && a.status !== 'on_leave') return false;

      // Project filter
      if (currentProjectName !== 'all') {
        const matchName = a.projectName.trim().toLowerCase() === currentProjectName.trim().toLowerCase();
        const matchId = String(a.projectId) === String(selectedProject?.id);
        if (!matchName && !matchId) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;

      // Department filter
      if (deptFilter && a.employee?.departmentName !== deptFilter) return false;

      // Search
      if (search.trim()) {
        const term = search.toLowerCase();
        const nameMatch = (a.employee?.name || '').toLowerCase().includes(term);
        const codeMatch = (a.employee?.empCode || a.employeeId).toLowerCase().includes(term);
        const roleMatch = a.roleOnProject.toLowerCase().includes(term);
        const projMatch = a.projectName.toLowerCase().includes(term);
        if (!nameMatch && !codeMatch && !roleMatch && !projMatch) return false;
      }

      return true;
    });
  }, [assignments, currentProjectName, selectedProject, statusFilter, deptFilter, search]);

  // Bench pool (Active employees with no active project assignment)
  const benchEmployees = useMemo(() => {
    return employees.filter((e) => {
      if (e.status === 'left' || e.status === 'completed') return false;
      const hasActive = activeAssignmentMap.has(e.employeeId) || activeAssignmentMap.has(e.id);
      if (hasActive) return false;

      if (deptFilter && e.department?.name !== deptFilter) return false;

      if (search.trim()) {
        const term = search.toLowerCase();
        const nameMatch = e.name.toLowerCase().includes(term);
        const codeMatch = (e.empCode || e.employeeId).toLowerCase().includes(term);
        const desigMatch = (e.designation || '').toLowerCase().includes(term);
        if (!nameMatch && !codeMatch && !desigMatch) return false;
      }

      return true;
    });
  }, [employees, activeAssignmentMap, deptFilter, search]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      if (currentProjectName !== 'all') {
        const matchFrom = evt.fromProjectName?.toLowerCase() === currentProjectName.toLowerCase();
        const matchTo = evt.toProjectName?.toLowerCase() === currentProjectName.toLowerCase();
        if (!matchFrom && !matchTo) return false;
      }

      if (search.trim()) {
        const term = search.toLowerCase();
        const emp = employees.find(
          (e) => e.employeeId === evt.employeeId || e.empCode === evt.employeeId || String(e.id) === evt.employeeId
        );
        const empMatch = (emp?.name || evt.employeeName || '').toLowerCase().includes(term);
        const codeMatch = (emp?.empCode || evt.empCode || (!evt.employeeId.startsWith('cmu') ? evt.employeeId : '')).toLowerCase().includes(term);
        const notesMatch = (evt.notes || '').toLowerCase().includes(term);
        const toMatch = (evt.toProjectName || '').toLowerCase().includes(term);
        if (!empMatch && !codeMatch && !notesMatch && !toMatch) return false;
      }

      return true;
    });
  }, [events, currentProjectName, search, employees]);

  // Overall statistics
  const stats = useMemo(() => {
    const totalActiveEmp = employees.filter((e) => e.status !== 'left' && e.status !== 'completed').length;
    const deployed = new Set(
      assignments.filter((a) => a.status === 'active' || a.status === 'on_leave').map((a) => a.employeeId)
    ).size;
    const onLeave = assignments.filter((a) => a.status === 'on_leave').length;
    const onBench = Math.max(0, totalActiveEmp - deployed);

    return {
      totalActiveEmp,
      deployed,
      onLeave,
      onBench,
    };
  }, [employees, assignments]);

  const isLoading = loadingEmployees || loadingAssignments;

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

  const handleShiftConfirm = async (payload: {
    targetProjectId: number | string;
    targetProjectName: string;
    newRoleOnProject?: string;
    effectiveDate?: string;
    reason?: string;
  }) => {
    if (!shiftTarget) return;
    await shiftMutation.mutateAsync({
      assignmentId: shiftTarget.id,
      payload,
    });
    setShiftTarget(null);
  };

  const handleRemoveConfirm = async (payload: { effectiveDate?: string; reason: string }) => {
    if (!removeTarget) return;
    await removeMutation.mutateAsync({
      assignmentId: removeTarget.id,
      payload,
    });
    setRemoveTarget(null);
  };

  const handleLeaveConfirm = async (payload: { effectiveDate?: string; reason: string }) => {
    if (!leaveTarget) return;
    await leaveMutation.mutateAsync({
      assignmentId: leaveTarget.id,
      payload,
    });
    setLeaveTarget(null);
  };

  const handleResume = async (assignment: ProjectAssignment) => {
    await resumeMutation.mutateAsync({
      assignmentId: assignment.id,
      payload: {
        effectiveDate: new Date().toISOString().slice(0, 10),
        notes: 'Resumed duty on site',
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <IconLoader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-[13px]">Loading manpower deployment data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background text-foreground grow">
      <div className="mx-auto max-w-350 space-y-5 px-4 pt-6 pb-12 sm:px-6 lg:px-8">
        {/* Page Heading & Scope Badge */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[12px] font-medium text-muted-foreground">Workforce Operations</p>
              <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                <IconBuilding className="h-3 w-3" />
                {currentProjectName === 'all' ? 'All Projects' : currentProjectName}
              </span>
            </div>
            <h1 className="mt-0.5 text-[22px] font-bold leading-tight tracking-[-0.03em]">
              Manpower Deployment & Site Allocation
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchEmployees();
                refetchAssignments();
                refetchEvents();
              }}
              className="h-9 gap-1.5 text-[12px]"
            >
              <IconRefresh className="h-3.5 w-3.5" /> Refresh
            </Button>
          </div>
        </div>

        {/* Hero Scope Card with Project Quick-Switch */}
        <div className="overflow-hidden rounded-xl border border-border bg-card p-4 shadow-xs sm:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                <IconBriefcase className="h-5.5 w-5.5" />
              </div>
              <div>
                <h2 className="text-[15px] font-bold tracking-tight">Active Project Scope</h2>
                <p className="text-[12px] text-muted-foreground">
                  Select a site to inspect deployed workforce or choose Consolidated for organization-wide overview.
                </p>
              </div>
            </div>

            {/* Project Switcher Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => selectProject({ id: 'all', name: 'All Projects' })}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all',
                  currentProjectName === 'all'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                )}
              >
                <IconLayersIntersect className="h-3.5 w-3.5" />
                All Projects
              </button>
              {projects.map((p) => {
                const isSelected = currentProjectName.toLowerCase() === p.name.toLowerCase();
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectProject({ id: p.id as any, name: p.name })}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all',
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                    )}
                  >
                    <IconBuilding className="h-3.5 w-3.5" />
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Total Deployed
              </p>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <IconUsers className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-2 text-[26px] font-bold leading-none tabular-nums text-foreground">
              {stats.deployed}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">Active on construction sites</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Active on Site
              </p>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <IconUserCheck className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-2 text-[26px] font-bold leading-none tabular-nums text-emerald-600 dark:text-emerald-400">
              {stats.deployed - stats.onLeave}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">Available for daily shifts</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                On Project Leave
              </p>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <IconClock className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-2 text-[26px] font-bold leading-none tabular-nums text-amber-600 dark:text-amber-400">
              {stats.onLeave}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">Temporarily off-site</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Available on Bench
              </p>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <IconLayersIntersect className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-2 text-[26px] font-bold leading-none tabular-nums text-purple-600 dark:text-purple-400">
              {stats.onBench}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">Ready for new deployment</p>
          </div>
        </div>

        {/* View Tabs & Filter Bar */}
        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3">
            {/* View Tabs */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTab('roster')}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-bold transition-all',
                  activeTab === 'roster'
                    ? 'bg-card border border-border text-foreground shadow-xs'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <IconUsers className="h-4 w-4 text-blue-500" />
                Site Roster
                <span className="ml-1 rounded-full bg-blue-500/10 px-2 py-0.2 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                  {rosterAssignments.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('bench')}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-bold transition-all',
                  activeTab === 'bench'
                    ? 'bg-card border border-border text-foreground shadow-xs'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <IconLayersIntersect className="h-4 w-4 text-purple-500" />
                Bench Pool
                <span className="ml-1 rounded-full bg-purple-500/10 px-2 py-0.2 text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                  {benchEmployees.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('events')}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-bold transition-all',
                  activeTab === 'events'
                    ? 'bg-card border border-border text-foreground shadow-xs'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <IconHistory className="h-4 w-4 text-amber-500" />
                Audit Trail
                <span className="ml-1 rounded-full bg-amber-500/10 px-2 py-0.2 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                  {filteredEvents.length}
                </span>
              </button>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-56">
                <IconSearch className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search name, ID, role…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-muted pl-8.5 pr-3 text-[12px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
                />
              </div>

              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="h-9 cursor-pointer rounded-lg border border-border bg-muted px-2.5 text-[12px] font-medium text-foreground outline-none transition-colors focus:border-primary"
              >
                <option value="">All Departments</option>
                {allDepartments.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>

              {activeTab === 'roster' && (
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-9 cursor-pointer rounded-lg border border-border bg-muted px-2.5 text-[12px] font-medium text-foreground outline-none transition-colors focus:border-primary"
                >
                  <option value="all">All Deployment Status</option>
                  <option value="active">Active on Site</option>
                  <option value="on_leave">On Project Leave</option>
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Tab 1: Project Roster */}
        {activeTab === 'roster' && (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            {rosterAssignments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-230">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <th className="px-5 py-3">Employee</th>
                      <th className="px-4 py-3">Home Dept</th>
                      <th className="px-4 py-3">Assigned Project</th>
                      <th className="px-4 py-3">Site Role</th>
                      <th className="px-4 py-3">Deployed On</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rosterAssignments.map((a) => (
                      <tr key={a.id} className="transition-colors hover:bg-muted/30">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                              {initials(a.employee?.name || a.employee?.empCode || 'EM')}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-[13px] font-semibold text-foreground">
                                {a.employee?.name || a.employee?.empCode || 'Employee'}
                              </p>
                              <p className="truncate font-mono text-[11px] text-muted-foreground">
                                {a.employee?.empCode || (!a.employeeId.startsWith('cmu') ? a.employeeId : '—')}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-[12px] font-medium text-foreground">
                          {a.employee?.departmentName || 'General'}
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 dark:border-blue-800/60 bg-blue-50/60 dark:bg-blue-950/30 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:text-blue-300">
                            <IconBuilding className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                            {a.projectName}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-[12px] font-medium text-foreground">
                          {a.roleOnProject}
                        </td>

                        <td className="px-4 py-3.5 text-[12px] text-muted-foreground tabular-nums">
                          {fmtDate(a.assignedDate)}
                        </td>

                        <td className="px-4 py-3.5">
                          {a.status === 'active' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                              On Leave
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {a.status === 'active' ? (
                              <button
                                type="button"
                                onClick={() => setLeaveTarget(a)}
                                title="Put on project leave"
                                className="rounded-md border border-border bg-muted/60 px-2 py-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:bg-muted"
                              >
                                Leave
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleResume(a)}
                                title="Resume active site duty"
                                className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                              >
                                Resume
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setShiftTarget(a)}
                              title="Shift to another project"
                              className="rounded-md border border-border bg-muted/60 px-2 py-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-muted"
                            >
                              Shift
                            </button>

                            <button
                              type="button"
                              onClick={() => setRemoveTarget(a)}
                              title="Release back to bench"
                              className="rounded-md border border-border bg-muted/60 px-2 py-1 text-[11px] font-semibold text-destructive hover:bg-destructive/10"
                            >
                              Release
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <IconUsers className="h-6 w-6" />
                </div>
                <h3 className="text-[14px] font-semibold">No personnel deployed</h3>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  No active assignments found matching the selected project and filters.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Bench Pool */}
        {activeTab === 'bench' && (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            {benchEmployees.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-210">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <th className="px-5 py-3">Employee</th>
                      <th className="px-4 py-3">Home Department</th>
                      <th className="px-4 py-3">Designation</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3">Joining Date</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {benchEmployees.map((e) => (
                      <tr key={e.id} className="transition-colors hover:bg-muted/30">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-500/10 text-[11px] font-bold text-purple-600 dark:text-purple-400">
                              {initials(e.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-[13px] font-semibold text-foreground">{e.name}</p>
                              <p className="truncate font-mono text-[11px] text-muted-foreground">
                                {e.empCode || (!e.employeeId.startsWith('cmu') ? e.employeeId : '—')}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-[12px] font-medium text-foreground">
                          {e.department?.name || 'General'}
                        </td>

                        <td className="px-4 py-3.5 text-[12px] text-muted-foreground">
                          {e.designation || 'Staff'}
                        </td>

                        <td className="px-4 py-3.5 text-[12px] text-muted-foreground font-mono">
                          {e.phone || '—'}
                        </td>

                        <td className="px-4 py-3.5 text-[12px] text-muted-foreground tabular-nums">
                          {fmtDate(e.joiningDate)}
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                            Available on Bench
                          </span>
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          <Button
                            size="sm"
                            onClick={() => setAssignTarget(e)}
                            className="h-8 gap-1.5 text-[11px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
                          >
                            <IconUserPlus className="h-3.5 w-3.5" />
                            Deploy to Project
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <IconCheck className="h-6 w-6 text-emerald-500" />
                </div>
                <h3 className="text-[14px] font-semibold">Bench is currently empty</h3>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  All active department employees are deployed to project sites.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Deployment Event Stream / Audit History */}
        {activeTab === 'events' && (
          <div className="space-y-3">
            {filteredEvents.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
                <div className="divide-y divide-border">
                  {filteredEvents.map((evt) => {
                    const emp = employees.find(
                      (e) => e.employeeId === evt.employeeId || e.empCode === evt.employeeId || String(e.id) === evt.employeeId
                    );
                    const displayName = emp?.name || evt.employeeName || (!evt.employeeId.startsWith('cmu') ? evt.employeeId : 'Employee');
                    const displayCode = emp?.empCode || evt.empCode || (!evt.employeeId.startsWith('cmu') ? evt.employeeId : null);
                    const isShift = evt.eventType === 'shifted';
                    const isAssign = evt.eventType === 'assigned';
                    const isRemove = evt.eventType === 'removed';
                    const isLeave = evt.eventType === 'put_on_leave';
                    const isResume = evt.eventType === 'resumed';

                    return (
                      <div key={evt.id} className="flex items-start gap-4 p-4 transition-colors hover:bg-muted/20">
                        <div
                          className={cn(
                            'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                            isAssign && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                            isShift && 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
                            isRemove && 'bg-destructive/10 text-destructive',
                            isLeave && 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                            isResume && 'bg-teal-500/10 text-teal-600 dark:text-teal-400'
                          )}
                        >
                          {isAssign && <IconUserPlus className="h-4.5 w-4.5" />}
                          {isShift && <IconArrowRight className="h-4.5 w-4.5" />}
                          {isRemove && <IconUserMinus className="h-4.5 w-4.5" />}
                          {isLeave && <IconClock className="h-4.5 w-4.5" />}
                          {isResume && <IconCheck className="h-4.5 w-4.5" />}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-[13px] font-semibold text-foreground">
                              {displayName}
                              {displayCode && (
                                <span className="ml-2 font-mono text-[11px] font-normal text-muted-foreground">
                                  ({displayCode})
                                </span>
                              )}
                            </p>
                            <span className="text-[11px] text-muted-foreground tabular-nums">
                              {fmtDateTime(evt.timestamp)}
                            </span>
                          </div>

                          <p className="mt-1 text-[12px] text-foreground">
                            {isAssign && (
                              <span>
                                Deployed from bench to{' '}
                                <span className="font-semibold text-blue-600 dark:text-blue-400">
                                  {evt.toProjectName}
                                </span>
                              </span>
                            )}
                            {isShift && (
                              <span>
                                Transferred from{' '}
                                <span className="font-medium text-muted-foreground">
                                  {evt.fromProjectName}
                                </span>{' '}
                                ➔{' '}
                                <span className="font-semibold text-blue-600 dark:text-blue-400">
                                  {evt.toProjectName}
                                </span>
                              </span>
                            )}
                            {isRemove && (
                              <span>
                                Removed from{' '}
                                <span className="font-medium text-muted-foreground">
                                  {evt.fromProjectName}
                                </span>{' '}
                                and returned to bench pool
                              </span>
                            )}
                            {isLeave && (
                              <span>
                                Placed on project leave for site{' '}
                                <span className="font-semibold text-amber-600 dark:text-amber-400">
                                  {evt.toProjectName}
                                </span>
                              </span>
                            )}
                            {isResume && (
                              <span>
                                Resumed active duty at{' '}
                                <span className="font-semibold text-teal-600 dark:text-teal-400">
                                  {evt.toProjectName}
                                </span>
                              </span>
                            )}
                          </p>

                          {evt.notes && (
                            <p className="mt-1 text-[11px] italic text-muted-foreground">
                              &ldquo;{evt.notes}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-16 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <IconHistory className="h-6 w-6" />
                </div>
                <h3 className="text-[14px] font-semibold">No audit events logged</h3>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  Deployment actions and site transfers will be recorded here automatically.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {assignTarget && (
        <AssignToProjectModal
          employee={assignTarget}
          projects={projects}
          onClose={() => setAssignTarget(null)}
          onConfirm={handleAssignConfirm}
          loading={assignMutation.isPending}
        />
      )}

      {shiftTarget && (
        <ShiftProjectModal
          assignment={shiftTarget}
          projects={projects}
          onClose={() => setShiftTarget(null)}
          onConfirm={handleShiftConfirm}
          loading={shiftMutation.isPending}
        />
      )}

      {removeTarget && (
        <RemoveFromProjectModal
          assignment={removeTarget}
          onClose={() => setRemoveTarget(null)}
          onConfirm={handleRemoveConfirm}
          loading={removeMutation.isPending}
        />
      )}

      {leaveTarget && (
        <ProjectLeaveModal
          assignment={leaveTarget}
          onClose={() => setLeaveTarget(null)}
          onConfirm={handleLeaveConfirm}
          loading={leaveMutation.isPending}
        />
      )}
    </div>
  );
};

export default MainManpowerDeployment;
