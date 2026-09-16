'use client';

import {
  AlertCircle,
  ArrowRight,
  Banknote,
  Briefcase,
  CalendarDays,
  Coins,
  CreditCard,
  FileText,
  Loader2,
  TrendingUp,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import type React from 'react';
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useProjectAssignments } from '@/features/hr/deployment/server/tanstackQuery/useDeploymentQueries';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import UserAvatar from '@/components/ui/UserAvatar';
import GeneratePayslipModal from '@/features/hr/mySalary/components/GeneratePayslipModal';
import { useGlobalStructure } from '@/features/hr/mySalary/server/tanstackQuery/useSalaryQueries';
import { useHrDashboardV3 } from '../server/tanstackQuery/useDashboardQueries';
import type { V3HrDeptSalary, V3HrSalaryEmployee } from '../types/types';
import { ModalPortal } from '@/features/hr/_shared/components';

const initials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || parts[0] === '') return '?';
  if (parts.length === 1) return (parts[0]?.[0] ?? '?').toUpperCase();
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
};

const HoverRow = ({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | undefined;
  accent?: string;
}) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-[10px] text-muted-foreground">{label}</span>
    <span className={`text-[12px] font-bold tabular-nums ${accent ?? 'text-foreground'}`}>
      {(value ?? 0).toLocaleString('en-IN')}
    </span>
  </div>
);

const STATUS_TONES: Record<string, string> = {
  approved: 'border-success/40 bg-success/10 text-success',
  pending: 'border-warning/40 bg-warning/10 text-warning',
  rejected: 'border-destructive/40 bg-destructive/10 text-destructive',
  cancelled: 'border-border bg-muted text-muted-foreground',
  selected: 'border-success/40 bg-success/10 text-success',
  shortlisted: 'border-primary/30 bg-primary/10 text-primary',
  interview_scheduled: 'border-primary/30 bg-primary/10 text-primary',
  interview_completed: 'border-primary/30 bg-primary/10 text-primary',
  applied: 'border-border bg-muted text-muted-foreground',
  offer_sent: 'border-warning/40 bg-warning/10 text-warning',
  offer_accepted: 'border-success/40 bg-success/10 text-success',
  offer_declined: 'border-destructive/40 bg-destructive/10 text-destructive',
  joined: 'border-success/40 bg-success/10 text-success',
  notice_period: 'border-warning/40 bg-warning/10 text-warning',
  on_notice: 'border-warning/40 bg-warning/10 text-warning',
  last_day: 'border-destructive/40 bg-destructive/10 text-destructive',
  pending_clearance: 'border-warning/40 bg-warning/10 text-warning',
};

const statusTone = (s: string) =>
  STATUS_TONES[String(s).toLowerCase()] ?? 'border-border bg-muted text-muted-foreground';

const formatDate = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: '2-digit' });
};

const COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#F43F5E',
  '#84CC16',
];

const fmtSalary = (n: number) => (n === 0 ? '—' : `₹${n.toLocaleString('en-IN')}`);

const MainDashboard = () => {
  const { data, isLoading, isError, refetch } = useHrDashboardV3();
  const { data: salaryStruct } = useGlobalStructure();
  const [activeCardIdx, setActiveCardIdx] = useState<number | null>(null);
  const [salaryDept, setSalaryDept] = useState<V3HrDeptSalary | null>(null);
  const [generateEmp, setGenerateEmp] = useState<V3HrSalaryEmployee | null>(null);
  const [showAllJoinings, setShowAllJoinings] = useState(false);
  const { data: assignments = [] } = useProjectAssignments();
  const [showAllCandidates, setShowAllCandidates] = useState(false);

  const activeAssignments = useMemo(
    () => assignments.filter((a) => a.status === 'active' || a.status === 'on_leave'),
    [assignments]
  );
  const deployedCount = activeAssignments.length;
  const benchCount = Math.max(0, (data?.kpi?.totalActiveEmployees ?? 0) - deployedCount);

  const projectDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    activeAssignments.forEach((a) => {
      counts.set(a.projectName, (counts.get(a.projectName) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
  }, [activeAssignments]);

  if (isLoading && !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-[13px]">Loading HR dashboard…</p>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
          <AlertCircle className="h-7 w-7 text-destructive" />
          <p className="text-[13px] font-semibold text-destructive">Couldn't load HR dashboard</p>
          <p className="text-[11px] text-muted-foreground">
            The backend could not be reached. Check your connection and try again.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-4 text-[12px] font-semibold text-primary-foreground hover:opacity-90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const {
    kpi,
    hiringFunnel,
    monthlyHiring,
    departmentDist,
    designationDist,
    leaveTypeDist,
    openVacancies,
    recentCandidates,
    recentJoinings,
    activeEmployees,
    recruitmentByDesignation,
    salarySummary,
    advanceSummary,
  } = data;

  const backendBase = ((import.meta.env?.VITE_API_URL as string) ?? '').replace(/\/api\/?$/, '');
  const photoUrl = (path: string | null): string | null => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${backendBase}/${path.replace(/^\//, '')}`;
  };

  const kpiCards: Array<{
    label: string;
    value: number;
    sub: React.ReactNode;
    icon: React.ReactNode;
    tint: string;
    borderTint: string;
    valueTint?: string;
    hoverContent?: React.ReactNode;
  }> = [
    {
      label: 'Active Employees',
      value: kpi.totalActiveEmployees,
      sub: `${kpi.newJoiningThisMonth} new this month`,
      icon: <Users className="h-5 w-5" />,
      tint: 'bg-primary/10 text-primary',
      borderTint: 'hover:border-primary/30',
      hoverContent: (
        <div className="space-y-1.5">
          <HoverRow label="New this month" value={kpi.newJoiningThisMonth} accent="text-success" />
          <HoverRow
            label="Exited this month"
            value={kpi.exitedThisMonth}
            accent="text-destructive"
          />
          <HoverRow
            label="On leave today"
            value={kpi.employeesOnLeaveToday}
            accent="text-warning"
          />
          <HoverRow label="In notice period" value={kpi.inNoticePeriod} accent="text-warning" />
        </div>
      ),
    },
    {
      label: 'Open Vacancies',
      value: kpi.openVacancies,
      sub: `${kpi.totalOpenSeats} open seats`,
      icon: <Briefcase className="h-5 w-5" />,
      tint: 'bg-primary/10 text-primary',
      borderTint: 'hover:border-primary/30',
      hoverContent: (
        <div className="space-y-1.5">
          <HoverRow label="Total open seats" value={kpi.totalOpenSeats} accent="text-primary" />
          {openVacancies.slice(0, 2).map((v) => (
            <div key={v.id} className="space-y-0.5">
              <div className="my-1.5 border-t border-border/60" />
              <p className="truncate text-[10px] font-medium text-foreground">{v.title}</p>
              <p className="text-[9px] text-muted-foreground">
                {v.remainingSeats} seats · {v.department}
              </p>
            </div>
          ))}
        </div>
      ),
    },
    {
      label: 'Total Applications',
      value: kpi.totalApplications,
      sub: (
        <span className="flex items-center gap-1 text-success">
          <TrendingUp className="h-3 w-3" /> {kpi.selectedCandidates} selected
        </span>
      ),
      icon: <FileText className="h-5 w-5" />,
      tint: 'bg-success/10 text-success',
      borderTint: 'hover:border-success/30',
    },
    {
      label: 'Pending Joining',
      value: kpi.pendingJoining,
      sub: 'Documents/onboarding',
      icon: <UserPlus className="h-5 w-5" />,
      tint: 'bg-primary/10 text-primary',
      borderTint: 'hover:border-primary/30',
      hoverContent: (
        <div className="space-y-1.5">
          {recentJoinings.length === 0 ? (
            <p className="text-[10px] text-muted-foreground">No recent joinings</p>
          ) : (
            recentJoinings.slice(0, 3).map((j, idx) => (
              <div key={j.id}>
                {idx > 0 && <div className="my-1.5 border-t border-border/60" />}
                <p className="truncate text-[10px] font-medium text-foreground">{j.employeeName}</p>
                <p className="text-[9px] text-muted-foreground">
                  {j.designation} · {formatDate(j.joiningDate)}
                </p>
              </div>
            ))
          )}
        </div>
      ),
    },
    {
      label: 'Total Salary',
      value: salarySummary.totalMonthly,
      sub: 'Monthly payroll',
      icon: <Banknote className="h-5 w-5" />,
      tint: 'bg-success/10 text-success',
      borderTint: 'hover:border-success/30',
      valueTint: 'text-success',
    },
    {
      label: 'Salary Hold',
      value: advanceSummary.holdCount,
      sub: 'Active deductions',
      icon: <CreditCard className="h-5 w-5" />,
      tint: 'bg-warning/10 text-warning',
      borderTint: 'hover:border-warning/30',
    },
    {
      label: 'Employee Loan',
      value: advanceSummary.loanCount,
      sub: 'Pending & approved',
      icon: <Coins className="h-5 w-5" />,
      tint: 'bg-primary/10 text-primary',
      borderTint: 'hover:border-primary/30',
    },
  ];

  return (
    <div className="bg-background text-foreground grow">
      <main className="mx-auto max-w-350 space-y-6 px-4 pt-6 pb-10 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4 shadow-xs sm:px-6 sm:py-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[11px] bg-primary/12 text-primary">
            <Users className="h-5 w-5" />
          </div>
          <div className="min-w-60 flex-1">
            <h1 className="text-[20px] font-bold leading-tight tracking-[-0.02em]">HR Dashboard</h1>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              Workforce, hiring pipeline, and leave overview
            </p>
          </div>
          <span className="hidden text-[11px] text-muted-foreground sm:inline">
            {new Date().toLocaleDateString(undefined, {
              weekday: 'short',
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
          {kpiCards.map((k, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveCardIdx(i)}
              className={`group relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-xs transition-all duration-200 hover:shadow-lg cursor-pointer text-left ${k.borderTint}`}
            >
              <div className={`mb-3 inline-flex rounded-xl p-2.5 ${k.tint}`}>{k.icon}</div>
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {k.label}
              </p>
              <p
                className={`text-xl font-bold tabular-nums sm:text-2xl ${k.valueTint ?? 'text-foreground'}`}
              >
                {k.value.toLocaleString('en-IN')}
              </p>
              {k.sub && <div className="mt-1.5 text-[10px] text-muted-foreground">{k.sub}</div>}
            </button>
          ))}
        </div>

        {/* Project Manpower Deployment Section */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-500/10 p-2.5 text-blue-600 dark:text-blue-400">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-[15px] font-bold">Project Manpower Deployment</h2>
                <p className="text-[12px] text-muted-foreground">
                  Dual-scoped workforce distribution across construction sites vs home bench
                </p>
              </div>
            </div>
            <Link
              to="/hr/deployment"
              className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-[12px] font-semibold text-primary transition-colors hover:bg-primary/20"
            >
              Open Deployment Console <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Site Deployed
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-[26px] font-bold text-blue-600 dark:text-blue-400">
                    {deployedCount}
                  </span>
                  <span className="text-[12px] text-muted-foreground">personnel on sites</span>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Home Org Bench
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-[26px] font-bold text-purple-600 dark:text-purple-400">
                    {benchCount}
                  </span>
                  <span className="text-[12px] text-muted-foreground">available for allocation</span>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Active Projects
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-[26px] font-bold text-foreground">
                    {projectDistribution.length}
                  </span>
                  <span className="text-[12px] text-muted-foreground">sites receiving manpower</span>
                </div>
              </div>
            </div>

            {projectDistribution.length > 0 && (
              <div className="mt-4 border-t border-border pt-4">
                <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Deployment by Construction Project
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {projectDistribution.map((p) => (
                    <div
                      key={p.name}
                      className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3"
                    >
                      <div>
                        <p className="text-[13px] font-semibold text-foreground">{p.name}</p>
                        <p className="text-[11px] text-muted-foreground">{p.count} deployed</p>
                      </div>
                      <span className="rounded-md bg-primary/10 px-2 py-1 text-[11px] font-bold text-primary tabular-nums">
                        {Math.round((p.count / (deployedCount || 1)) * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recruitment Pipeline + Monthly Hiring Trend */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Hiring Funnel — per-vacancy table */}
          <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary/10 p-2 text-primary">
                  <Briefcase className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h2 className="text-[14px] font-semibold">Recruitment Pipeline</h2>
                  <p className="text-[11px] text-muted-foreground">
                    Application breakdown by position
                  </p>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              {recruitmentByDesignation.length === 0 ? (
                <div className="py-10 text-center">
                  <FileText className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                  <p className="text-[13px] font-medium">No hiring activity yet</p>
                </div>
              ) : (
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">
                        Designation
                      </th>
                      <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">
                        Applied
                      </th>
                      <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">
                        Ongoing
                      </th>
                      <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">
                        Joining
                      </th>
                      <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">
                        Reject
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recruitmentByDesignation.map((row) => {
                      const base = row.applied || 1;
                      const ongoingPct = Math.round((row.ongoing / base) * 100);
                      const joiningPct = Math.round((row.joining / base) * 100);
                      const rejectedPct = Math.round((row.rejected / base) * 100);
                      return (
                        <tr key={row.designation} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground max-w-[140px] truncate">
                            {row.designation}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className="font-bold tabular-nums text-foreground">
                              {row.applied}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            {row.ongoing > 0 ? (
                              <span className="inline-flex flex-col items-center gap-0.5">
                                <span className="font-semibold tabular-nums text-primary">
                                  {row.ongoing}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {ongoingPct}%
                                </span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center">
                            {row.joining > 0 ? (
                              <span className="inline-flex flex-col items-center gap-0.5">
                                <span className="font-semibold tabular-nums text-success">
                                  {row.joining}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {joiningPct}%
                                </span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center">
                            {row.rejected > 0 ? (
                              <span className="inline-flex flex-col items-center gap-0.5">
                                <span className="font-semibold tabular-nums text-destructive">
                                  {row.rejected}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {rejectedPct}%
                                </span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Hiring vs Attrition */}
          <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-success/10 p-2.5 text-success">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-[14px] font-semibold leading-tight">Hiring vs Attrition</h2>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">Last 6 months trend</p>
                </div>
              </div>
              <div className="hidden items-center gap-3 sm:flex">
                <span className="flex items-center gap-1 text-[10px] font-medium text-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" /> Hired
                </span>
                <span className="flex items-center gap-1 text-[10px] font-medium text-destructive">
                  <span className="h-1.5 w-1.5 rounded-full bg-destructive" /> Left
                </span>
              </div>
            </div>
            <div className="h-72 p-4 sm:p-6">
              {monthlyHiring.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <FileText className="mb-2 h-6 w-6 text-muted-foreground" />
                  <p className="text-[13px] font-medium">No data</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyHiring} barGap={6}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      className="stroke-border"
                    />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: 'currentColor', fontSize: 11 }}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: 'currentColor', fontSize: 11 }}
                      className="text-muted-foreground"
                      allowDecimals={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'var(--muted)' }}
                      contentStyle={{
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--card)',
                        color: 'var(--foreground)',
                        fontSize: 12,
                      }}
                    />
                    <Bar
                      dataKey="hired"
                      name="Hired"
                      fill="var(--success)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={28}
                    />
                    <Bar
                      dataKey="left"
                      name="Left"
                      fill="var(--destructive)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={28}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Salary Overview + Open Vacancies */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-success/10 p-2 text-success">
                  <Banknote className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h2 className="text-[14px] font-semibold">Salary Overview</h2>
                  <p className="text-[11px] text-muted-foreground">Monthly payroll by department</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-muted-foreground">Total Monthly</p>
                <p className="text-[18px] font-bold tabular-nums text-success">
                  {fmtSalary(salarySummary.totalMonthly)}
                </p>
              </div>
            </div>
            {salarySummary.byDepartment.length === 0 ? (
              <div className="py-10 text-center">
                <Banknote className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                <p className="text-[13px] font-medium">No salary data</p>
                <p className="text-[11px] text-muted-foreground">
                  Salary is pulled from joining records
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="whitespace-nowrap px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Department
                      </th>
                      <th className="whitespace-nowrap px-4 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Employees
                      </th>
                      <th className="whitespace-nowrap px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Total Salary
                      </th>
                      <th className="whitespace-nowrap px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Avg Salary
                      </th>
                      <th className="whitespace-nowrap px-5 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Share
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {salarySummary.byDepartment.map((dept, i) => {
                      const sharePct =
                        salarySummary.totalMonthly > 0
                          ? Math.round((dept.total / salarySummary.totalMonthly) * 100)
                          : 0;
                      const avgSalary =
                        dept.employees.length > 0
                          ? Math.round(dept.total / dept.employees.length)
                          : 0;
                      return (
                        <tr
                          key={dept.department}
                          className="cursor-pointer transition-colors hover:bg-muted/30"
                          onClick={() => setSalaryDept(dept)}
                        >
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <span
                                className="h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: COLORS[i % COLORS.length] }}
                              />
                              <span className="font-medium text-foreground">{dept.department}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center tabular-nums text-muted-foreground">
                            {dept.employees.length}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                            {fmtSalary(dept.total)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                            {fmtSalary(avgSalary)}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${sharePct}%`,
                                    backgroundColor: COLORS[i % COLORS.length],
                                  }}
                                />
                              </div>
                              <span className="w-8 text-right text-[10px] tabular-nums text-muted-foreground">
                                {sharePct}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Department Salary Modal */}
          {/* Generate Payslip Modal */}
          {generateEmp && (
            <GeneratePayslipModal
              employeeId={generateEmp.id}
              employeeName={generateEmp.name}
              email={generateEmp.email}
              joiningDate={generateEmp.joiningDate ?? undefined}
              designation={generateEmp.designation}
              department={salaryDept?.department}
              companyName={salaryStruct?.company ?? undefined}
              struct={salaryStruct ?? null}
              tenant={generateEmp.tenant}
              onClose={() => setGenerateEmp(null)}
            />
          )}

          {salaryDept && (
            <ModalPortal>
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                onClick={(e) => {
                  if (e.target === e.currentTarget) setSalaryDept(null);
                }}
              >
              <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
                {/* Modal header */}
                <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
                      Department
                    </p>
                    <h3 className="truncate text-[15px] font-bold">{salaryDept.department}</h3>
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground">Total</p>
                      <p className="text-[16px] font-bold tabular-nums text-success">
                        {fmtSalary(salaryDept.total)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSalaryDept(null)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {/* Employee list */}
                <ul className="max-h-[60vh] divide-y divide-border overflow-y-auto">
                  {salaryDept.employees.length === 0 ? (
                    <li className="py-10 text-center text-[13px] text-muted-foreground">
                      No employees
                    </li>
                  ) : (
                    [...salaryDept.employees]
                      .sort((a, b) => b.salary - a.salary)
                      .map((emp) => (
                        <li key={emp.id} className="flex items-center gap-3 px-5 py-3.5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                            {initials(emp.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-semibold">{emp.name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {emp.designation || '—'}
                            </p>
                          </div>
                          <p className="shrink-0 text-[13px] font-bold tabular-nums text-foreground">
                            {fmtSalary(emp.salary)}
                          </p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setGenerateEmp(emp);
                            }}
                            className="ml-2 shrink-0 rounded-lg border border-primary/30 bg-primary/8 px-2.5 py-1 text-[10px] font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                          >
                            Slip
                          </button>
                        </li>
                      ))
                  )}
                </ul>
                {/* Footer summary */}
                <div className="flex items-center justify-between border-t border-border bg-muted/30 px-5 py-3">
                  <span className="text-[11px] text-muted-foreground">
                    {salaryDept.employees.length} employees
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Avg:{' '}
                    <span className="font-semibold text-foreground">
                      {fmtSalary(
                        salaryDept.employees.length > 0
                          ? Math.round(salaryDept.total / salaryDept.employees.length)
                          : 0
                      )}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </ModalPortal>
        )}

          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary/10 p-2 text-primary">
                  <Briefcase className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h2 className="text-[14px] font-semibold">Open Vacancies</h2>
                  <p className="text-[11px] text-muted-foreground">
                    {openVacancies.length} active posts
                  </p>
                </div>
              </div>
            </div>
            <ul className="max-h-130 divide-y divide-border overflow-y-auto">
              {openVacancies.length === 0 && (
                <li className="px-5 py-10 text-center">
                  <Briefcase className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                  <p className="text-[13px] font-medium">No open vacancies</p>
                </li>
              )}
              {openVacancies.map((v) => (
                <li
                  key={v.id}
                  className="cursor-pointer px-5 py-3.5 transition-colors hover:bg-muted/40"
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <p className="truncate text-[13px] font-semibold">{v.title}</p>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${statusTone(v.status)}`}
                    >
                      {v.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{v.department}</p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>
                      <span className="font-semibold tabular-nums text-foreground">
                        {v.filledSeats}/{v.totalSeats}
                      </span>{' '}
                      filled
                    </span>
                    {v.deadline && (
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" /> {formatDate(v.deadline)}
                      </span>
                    )}
                  </div>
                  {v.totalSeats > 0 && (
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.min(100, (v.filledSeats / v.totalSeats) * 100)}%` }}
                      />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Department + Leave Types charts */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary/10 p-2 text-primary">
                  <Users className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h2 className="text-[14px] font-semibold">Department</h2>
                  <p className="text-[11px] text-muted-foreground">Headcount distribution</p>
                </div>
              </div>
            </div>
            <div className="h-72 p-4 sm:p-6">
              {departmentDist.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <FileText className="mb-2 h-6 w-6 text-muted-foreground" />
                  <p className="text-[13px] font-medium">No data</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentDist} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={true}
                      vertical={false}
                      className="stroke-border"
                    />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="department"
                      type="category"
                      tick={{ fill: 'currentColor', fontSize: 11 }}
                      className="text-muted-foreground"
                      width={90}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'var(--muted)' }}
                      contentStyle={{
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--card)',
                        color: 'var(--foreground)',
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="employees" radius={[0, 4, 4, 0]} barSize={20}>
                      {departmentDist.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary/10 p-2 text-primary">
                  <FileText className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h2 className="text-[14px] font-semibold">Leave Types</h2>
                  <p className="text-[11px] text-muted-foreground">Most-used categories</p>
                </div>
              </div>
            </div>
            <div className="space-y-3 p-5 sm:p-6">
              {leaveTypeDist.length === 0 ? (
                <div className="py-8 text-center">
                  <FileText className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                  <p className="text-[13px] font-medium">No data</p>
                </div>
              ) : (
                (() => {
                  const total = leaveTypeDist.reduce((s, t) => s + t.count, 0) || 1;
                  return leaveTypeDist.map((t, i) => {
                    const pct = Math.round((t.count / total) * 100);
                    return (
                      <div key={t.type}>
                        <div className="mb-1 flex items-center justify-between text-[12px]">
                          <span className="font-medium">{t.type}</span>
                          <span className="text-muted-foreground">
                            <span className="font-semibold tabular-nums text-foreground">
                              {t.count}
                            </span>{' '}
                            · {pct}%
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                          />
                        </div>
                      </div>
                    );
                  });
                })()
              )}
            </div>
          </div>
        </div>

        {/* Recent Joinings + Recent Candidates */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-success/10 p-2 text-success">
                  <UserPlus className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h2 className="text-[14px] font-semibold">Recent Joinings</h2>
                  <p className="text-[11px] text-muted-foreground">Latest hires</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAllJoinings(true)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
              >
                View all <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            <ul className="divide-y divide-border">
              {recentJoinings.length === 0 && (
                <li className="px-5 py-10 text-center">
                  <UserPlus className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                  <p className="text-[13px] font-medium">No recent joinings</p>
                </li>
              )}
              {recentJoinings.slice(0, 10).map((j) => (
                <li key={j.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/40">
                  <UserAvatar
                    name={j.employeeName}
                    avatarUrl={(j as any).avatarUrl ?? null}
                    size={36}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[13px] font-semibold">{j.employeeName}</p>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${statusTone(j.status)}`}
                      >
                        {j.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {j.designation} · {j.department}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {formatDate(j.joiningDate)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary/10 p-2 text-primary">
                  <FileText className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h2 className="text-[14px] font-semibold">Recent Applications</h2>
                  <p className="text-[11px] text-muted-foreground">Latest candidates</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAllCandidates(true)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
              >
                View all <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            <ul className="divide-y divide-border">
              {recentCandidates.length === 0 && (
                <li className="px-5 py-10 text-center">
                  <FileText className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                  <p className="text-[13px] font-medium">No applications yet</p>
                </li>
              )}
              {recentCandidates.slice(0, 10).map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/40">
                  <UserAvatar name={c.name} avatarUrl={(c as any).avatarUrl ?? null} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[13px] font-semibold">{c.name}</p>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${statusTone(c.status)}`}
                      >
                        {String(c.status).replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{c.vacancyTitle}</p>
                  </div>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {formatDate(c.appliedDate)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>

      {/* All Joinings Modal */}
      {showAllJoinings && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={() => setShowAllJoinings(false)}
          >
          <div
            className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-success/10 p-2.5 text-success">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold">All Joinings</h2>
                  <p className="text-[12px] text-muted-foreground">
                    {recentJoinings.length} total records
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAllJoinings(false)}
                className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-x-auto overflow-y-auto">
              {recentJoinings.length === 0 ? (
                <div className="py-16 text-center">
                  <UserPlus className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                  <p className="text-[13px] font-medium text-muted-foreground">No joinings found</p>
                </div>
              ) : (
                <table className="w-full text-[12px]">
                  <thead className="sticky top-0 z-10 bg-card">
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Employee
                      </th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Department
                      </th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Designation
                      </th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Joining Date
                      </th>
                      <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentJoinings.map((j) => (
                      <tr key={j.id} className="transition-colors hover:bg-muted/30">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <UserAvatar
                              name={j.employeeName}
                              avatarUrl={(j as any).avatarUrl ?? null}
                              size={32}
                            />
                            <span className="max-w-[130px] truncate font-semibold text-foreground">
                              {j.employeeName}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{j.department || '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{j.designation || '—'}</td>
                        <td className="px-4 py-3 tabular-nums text-muted-foreground">
                          {formatDate(j.joiningDate)}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${statusTone(j.status)}`}
                          >
                            {j.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="border-t border-border bg-muted/30 px-6 py-3">
              <p className="text-[11px] text-muted-foreground">
                {recentJoinings.length} records total
              </p>
            </div>
          </div>
        </div>
      </ModalPortal>
    )}

      {/* All Candidates Modal */}
      {showAllCandidates && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={() => setShowAllCandidates(false)}
          >
          <div
            className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold">All Applications</h2>
                  <p className="text-[12px] text-muted-foreground">
                    {recentCandidates.length} total records
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAllCandidates(false)}
                className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-x-auto overflow-y-auto">
              {recentCandidates.length === 0 ? (
                <div className="py-16 text-center">
                  <FileText className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                  <p className="text-[13px] font-medium text-muted-foreground">
                    No applications found
                  </p>
                </div>
              ) : (
                <table className="w-full text-[12px]">
                  <thead className="sticky top-0 z-10 bg-card">
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Candidate
                      </th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Position
                      </th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Applied
                      </th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Final Result
                      </th>
                      <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentCandidates.map((c) => (
                      <tr key={c.id} className="transition-colors hover:bg-muted/30">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <UserAvatar
                              name={c.name}
                              avatarUrl={(c as any).avatarUrl ?? null}
                              size={32}
                            />
                            <span className="max-w-[130px] truncate font-semibold text-foreground">
                              {c.name}
                            </span>
                          </div>
                        </td>
                        <td className="max-w-[120px] truncate px-4 py-3 text-muted-foreground">
                          {c.vacancyTitle || '—'}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-muted-foreground">
                          {formatDate(c.appliedDate)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {c.finalResult ? (
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${statusTone(c.finalResult)}`}
                            >
                              {String(c.finalResult).replace(/_/g, ' ')}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${statusTone(c.status)}`}
                          >
                            {String(c.status).replace(/_/g, ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="border-t border-border bg-muted/30 px-6 py-3">
              <p className="text-[11px] text-muted-foreground">
                {recentCandidates.length} records total
              </p>
            </div>
          </div>
        </div>
      </ModalPortal>
    )}

      {/* KPI Detail Modal */}
      {activeCardIdx !== null && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={() => setActiveCardIdx(null)}
          >
          <div
            className="relative max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div className="flex items-center gap-3">
                <div className={`rounded-xl p-2.5 ${kpiCards[activeCardIdx].tint}`}>
                  {kpiCards[activeCardIdx].icon}
                </div>
                <div>
                  <h2 className="text-[15px] font-bold">{kpiCards[activeCardIdx].label}</h2>
                  <p
                    className={`text-[18px] font-bold tabular-nums sm:text-[22px] ${kpiCards[activeCardIdx].valueTint ?? 'text-foreground'}`}
                  >
                    {kpiCards[activeCardIdx].value.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveCardIdx(null)}
                className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto max-h-[calc(85vh-80px)]">
              {/* Card 0: Active Employees */}
              {activeCardIdx === 0 && (
                <div className="p-5 space-y-3">
                  <p className="text-[12px] text-muted-foreground">
                    {kpi.newJoiningThisMonth} new hires this month
                  </p>
                  <ul className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                    {activeEmployees.length === 0 ? (
                      <li className="px-4 py-8 text-center text-[13px] text-muted-foreground">
                        No active employees
                      </li>
                    ) : (
                      activeEmployees.map((e) => {
                        const url = photoUrl(e.photo);
                        return (
                          <li key={e.id} className="flex items-center gap-3 px-4 py-3.5">
                            {url ? (
                              <img
                                src={url}
                                alt={e.name}
                                className="h-10 w-10 shrink-0 rounded-full object-cover border border-border"
                              />
                            ) : (
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                                {initials(e.name)}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13px] font-semibold">{e.name}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {[e.designation, e.department].filter(Boolean).join(' · ')}
                              </p>
                            </div>
                            <span className="shrink-0 text-[11px] text-muted-foreground">
                              {formatDate(e.joiningDate)}
                            </span>
                          </li>
                        );
                      })
                    )}
                  </ul>
                </div>
              )}

              {/* Card 1: Open Vacancies */}
              {activeCardIdx === 1 && (
                <div className="p-5 space-y-3">
                  <p className="text-[12px] text-muted-foreground">
                    {kpi.totalOpenSeats} total open seats across {openVacancies.length} postings
                  </p>
                  <ul className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                    {openVacancies.length === 0 ? (
                      <li className="px-4 py-8 text-center text-[13px] text-muted-foreground">
                        No open vacancies
                      </li>
                    ) : (
                      openVacancies.map((v) => (
                        <li key={v.id} className="px-4 py-3.5">
                          <div className="mb-1 flex items-start justify-between gap-2">
                            <p className="truncate text-[13px] font-semibold">{v.title}</p>
                            <span
                              className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${statusTone(v.status)}`}
                            >
                              {v.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">{v.department}</p>
                          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>
                              <span className="font-semibold tabular-nums text-foreground">
                                {v.filledSeats}/{v.totalSeats}
                              </span>{' '}
                              filled ·{' '}
                              <span className="font-semibold text-foreground">
                                {v.applicantCount}
                              </span>{' '}
                              applicants
                            </span>
                            {v.deadline && (
                              <span className="flex items-center gap-1">
                                <CalendarDays className="h-3 w-3" />
                                {formatDate(v.deadline)}
                              </span>
                            )}
                          </div>
                          {v.totalSeats > 0 && (
                            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{
                                  width: `${Math.min(100, (v.filledSeats / v.totalSeats) * 100)}%`,
                                }}
                              />
                            </div>
                          )}
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              )}

              {/* Card 2: Total Applications */}
              {activeCardIdx === 2 && (
                <div className="p-5 space-y-4">
                  <p className="text-[12px] text-muted-foreground">
                    {kpi.selectedCandidates} selected out of {kpi.totalApplications} total
                    applications
                  </p>
                  <div>
                    <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Hiring Funnel
                    </h3>
                    <ul className="space-y-2">
                      {hiringFunnel.map((f, i) => {
                        const pct = Math.round((f.count / (hiringFunnel[0]?.count || 1)) * 100);
                        return (
                          <li key={f.stage}>
                            <div className="mb-1 flex items-center justify-between text-[12px]">
                              <span className="font-medium">{f.stage}</span>
                              <span className="text-muted-foreground">
                                <span className="font-semibold text-foreground">{f.count}</span> ·{' '}
                                {pct}%
                              </span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: COLORS[i % COLORS.length],
                                }}
                              />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <div>
                    <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Recent Applications
                    </h3>
                    <ul className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                      {recentCandidates.length === 0 ? (
                        <li className="px-4 py-6 text-center text-[13px] text-muted-foreground">
                          No applications
                        </li>
                      ) : (
                        recentCandidates.map((c) => (
                          <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                              {initials(c.name)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13px] font-semibold">{c.name}</p>
                              <p className="text-[11px] text-muted-foreground">{c.vacancyTitle}</p>
                            </div>
                            <span
                              className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${statusTone(c.status)}`}
                            >
                              {String(c.status).replace(/_/g, ' ')}
                            </span>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                </div>
              )}

              {/* Card 3: Pending Joining */}
              {activeCardIdx === 3 &&
                (() => {
                  const pendingList = recentJoinings.filter((j) =>
                    ['pending', 'initiated'].includes(String(j.status).toLowerCase())
                  );
                  return (
                    <div className="p-5 space-y-3">
                      <p className="text-[12px] text-muted-foreground">
                        {pendingList.length} candidates with documents/onboarding pending
                      </p>
                      <ul className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                        {pendingList.length === 0 ? (
                          <li className="px-4 py-8 text-center text-[13px] text-muted-foreground">
                            No pending joinings
                          </li>
                        ) : (
                          pendingList.map((j) => (
                            <li key={j.id} className="flex items-center gap-3 px-4 py-3.5">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                                {initials(j.employeeName)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="truncate text-[13px] font-semibold">
                                    {j.employeeName}
                                  </p>
                                  <span
                                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${statusTone(j.status)}`}
                                  >
                                    {j.status}
                                  </span>
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                  {[j.designation, j.department]
                                    .filter((v) => v && v !== '—')
                                    .join(' · ')}
                                </p>
                              </div>
                              <span className="shrink-0 text-[10px] text-muted-foreground">
                                {formatDate(j.joiningDate)}
                              </span>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  );
                })()}

              {/* Card 4: Total Salary */}
              {activeCardIdx === 4 &&
                (() => {
                  const allEmployees = salarySummary.byDepartment
                    .flatMap((dept) =>
                      dept.employees.map((emp) => ({ ...emp, department: dept.department }))
                    )
                    .sort((a, b) => b.salary - a.salary);
                  return (
                    <div className="p-5 space-y-3">
                      <p className="text-[12px] text-muted-foreground">
                        Monthly payroll across {allEmployees.length} employees
                      </p>
                      <div className="overflow-x-auto rounded-xl border border-border">
                        <table className="w-full text-[12px]">
                          <thead>
                            <tr className="border-b border-border bg-muted/40">
                              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Employee
                              </th>
                              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Department
                              </th>
                              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Designation
                              </th>
                              <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Salary
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {allEmployees.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={4}
                                  className="px-4 py-8 text-center text-[13px] text-muted-foreground"
                                >
                                  No salary data
                                </td>
                              </tr>
                            ) : (
                              allEmployees.map((emp) => (
                                <tr key={emp.id} className="transition-colors hover:bg-muted/30">
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2.5">
                                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success/10 text-[9px] font-bold text-success">
                                        {initials(emp.name)}
                                      </div>
                                      <span className="max-w-[120px] truncate font-medium text-foreground">
                                        {emp.name}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-muted-foreground">
                                    {emp.department || '—'}
                                  </td>
                                  <td className="px-4 py-3 text-muted-foreground">
                                    {emp.designation || '—'}
                                  </td>
                                  <td className="px-4 py-3 text-right font-bold tabular-nums text-success">
                                    {fmtSalary(emp.salary)}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                          {allEmployees.length > 0 && (
                            <tfoot>
                              <tr className="border-t border-border bg-muted/30">
                                <td
                                  colSpan={3}
                                  className="px-4 py-3 text-[11px] font-semibold text-muted-foreground"
                                >
                                  {allEmployees.length} employees
                                </td>
                                <td className="px-4 py-3 text-right text-[13px] font-bold tabular-nums text-success">
                                  {fmtSalary(salarySummary.totalMonthly)}
                                </td>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>
                    </div>
                  );
                })()}

              {/* Card 5: Salary Hold */}
              {activeCardIdx === 5 && (
                <div className="p-5 space-y-3">
                  <p className="text-[12px] text-muted-foreground">
                    {advanceSummary.holdCount} employees with active advance deductions running
                  </p>
                  <ul className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                    {advanceSummary.holdEmployees.length === 0 ? (
                      <li className="px-4 py-8 text-center text-[13px] text-muted-foreground">
                        No salary holds active
                      </li>
                    ) : (
                      advanceSummary.holdEmployees.map((e) => (
                        <li key={e.id} className="flex items-center gap-3 px-4 py-3.5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning/10 text-[10px] font-bold text-warning">
                            {initials(e.employeeName)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-semibold">{e.employeeName}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {e.department} · ID: {e.employeeId}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-[13px] font-bold tabular-nums text-warning">
                              {fmtSalary(e.requestAmount)}
                            </p>
                            <p className="text-[10px] text-muted-foreground">advance amount</p>
                          </div>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              )}

              {/* Card 6: Employee Loan */}
              {activeCardIdx === 6 && (
                <div className="p-5 space-y-3">
                  <p className="text-[12px] text-muted-foreground">
                    {advanceSummary.loanCount} advance requests pending or approved
                  </p>
                  <ul className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                    {advanceSummary.loanRequests.length === 0 ? (
                      <li className="px-4 py-8 text-center text-[13px] text-muted-foreground">
                        No active advance requests
                      </li>
                    ) : (
                      advanceSummary.loanRequests.map((r) => (
                        <li key={r.id} className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                              {initials(r.employeeName)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="truncate text-[13px] font-semibold">
                                  {r.employeeName}
                                </p>
                                <span
                                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${statusTone(r.status)}`}
                                >
                                  {r.status}
                                </span>
                              </div>
                              <p className="text-[11px] text-muted-foreground">{r.department}</p>
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-4 pl-12 text-[11px] text-muted-foreground">
                            <span>
                              Amount:{' '}
                              <span className="font-semibold text-foreground">
                                {fmtSalary(r.requestAmount)}
                              </span>
                            </span>
                            {r.monthlyDeduction > 0 && (
                              <span>
                                Monthly:{' '}
                                <span className="font-semibold text-foreground">
                                  {fmtSalary(r.monthlyDeduction)}
                                </span>
                              </span>
                            )}
                            {r.noOfMonths > 0 && (
                              <span>
                                Months:{' '}
                                <span className="font-semibold text-foreground">
                                  {r.noOfMonths}
                                </span>
                              </span>
                            )}
                            <span>{formatDate(r.requestDate)}</span>
                          </div>
                          {r.reason && (
                            <p className="mt-1 pl-12 text-[11px] italic text-muted-foreground">
                              {r.reason}
                            </p>
                          )}
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </ModalPortal>
    )}
    </div>
  );
};

export default MainDashboard;
