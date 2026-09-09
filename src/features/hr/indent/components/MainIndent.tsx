'use client';

import {
  IconAlertCircle,
  IconBriefcase,
  IconBuilding,
  IconCalendar,
  IconCheck,
  IconClipboardList,
  IconClock,
  IconLoader2,
  IconLock,
  IconLockOpen,
  IconPlus,
  IconQrcode,
  IconRefresh,
  IconRepeat,
  IconSearch,
  IconUserPlus,
  IconUsers,
  IconX,
} from '@tabler/icons-react';
import type React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useRequireCompanySelected } from '@/features/organization/hooks/useRequireCompanySelected';
import { resolveActAsTenant } from '@/features/organization/utils/actAsTenant';
import { useAppSelector } from '@/store/hook';
import { selectUser } from '@/store/slice/userAccountData';
import { useDepartmentOptions } from '../../_shared/tanstackQuery/useDepartments';
import type { CandidateFieldConfig } from '../../findEnquiry/components/AddEnquiryModal';
import AddEnquiryModal from '../../findEnquiry/components/AddEnquiryModal';
import { useIndents, useUpdateIndent } from '../server/tanstackQuery/useIndentQueries';
import type { Indent } from '../types/types';
import CreateIndentModal from './CreateIndentModal';
import QrCodeModal from './QrCodeModal';
import { ModalPortal } from '@/features/hr/_shared/components';

const FIELD_CONFIG_STORAGE_KEY = 'hr-candidate-field-config';

const FALLBACK_FIELD_CONFIG: CandidateFieldConfig = {
  dob: true,
  email: false,
  previousCompany: false,
  previousPosition: false,
  experience: false,
  maritalStatus: false,
  aadharNo: false,
  lastSalary: false,
  reasonForLeaving: false,
  currentAddress: false,
  photo: false,
  resume: false,
};

const STATUS_CFG: Record<string, { label: string; bg: string; text: string }> = {
  open: { label: 'Open', bg: 'bg-success/10', text: 'text-success' },
  in_progress: { label: 'In Progress', bg: 'bg-warning/10', text: 'text-warning' },
  closed: { label: 'Closed', bg: 'bg-muted', text: 'text-muted-foreground' },
  cancelled: { label: 'Cancelled', bg: 'bg-destructive/10', text: 'text-destructive' },
};

const PREFER_LABELS: Record<string, string> = {
  FRESHER: 'Fresher',
  EXPERIENCE: 'Experience',
  ANY: 'Any',
};

const GENDER_LABELS: Record<string, string> = {
  MALE: 'Male',
  FEMALE: 'Female',
  ANY: 'Any',
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

const daysUntil = (iso: string): number | null => {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / (1000 * 60 * 60 * 24));
};

const StatusPill = ({ status }: { status: string }) => {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.open!;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] ${cfg.bg} ${cfg.text}`}
    >
      {status === 'open' && <IconCheck className="h-2.5 w-2.5" strokeWidth={3} />}
      {cfg.label}
    </span>
  );
};

const TagChip = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
    {children}
  </span>
);

const MainIndent = () => {
  const requireCompanySelected = useRequireCompanySelected();
  const user = useAppSelector(selectUser);
  const { data: indents, isLoading, isError, refetch } = useIndents();
  const { data: departments = [] } = useDepartmentOptions();
  const updateIndent = useUpdateIndent();
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedIndent, setSelectedIndent] = useState<Indent | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [reindentSource, setReindentSource] = useState<Indent | null>(null);
  const [addCandidateIndent, setAddCandidateIndent] = useState<Indent | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [qrIndent, setQrIndent] = useState<Indent | null>(null);

  const handleCloseVacancy = useCallback(
    async (indent: Indent, e: React.MouseEvent) => {
      e.stopPropagation();
      setClosingId(indent.id);
      try {
        await updateIndent.mutateAsync({
          id: indent.id,
          data: { status: 'closed' },
          actAsTenantId: resolveActAsTenant(indent.tenant, user?.tenantId),
        });
      } finally {
        setClosingId(null);
      }
    },
    [updateIndent, user?.tenantId]
  );
  const [fieldConfig] = useState<CandidateFieldConfig>(() => {
    try {
      const stored = localStorage.getItem(FIELD_CONFIG_STORAGE_KEY);
      if (stored)
        return {
          ...FALLBACK_FIELD_CONFIG,
          ...(JSON.parse(stored) as Partial<CandidateFieldConfig>),
        };
    } catch (_e) {}
    return FALLBACK_FIELD_CONFIG;
  });

  const filteredIndents = useMemo(() => {
    if (!indents) return [];
    const term = searchTerm.toLowerCase().trim();
    return indents.filter((indent) => {
      const deptName = indent.department?.name ?? '';
      const matchesSearch =
        !term ||
        indent.title?.toLowerCase().includes(term) ||
        deptName.toLowerCase().includes(term) ||
        (indent.recordId ?? '').toLowerCase().includes(term);
      const matchesDepartment = !departmentFilter || indent.departmentId === departmentFilter;
      const matchesStatus = !statusFilter || indent.status === statusFilter;
      return matchesSearch && matchesDepartment && matchesStatus;
    });
  }, [indents, searchTerm, departmentFilter, statusFilter]);

  const stats = useMemo(() => {
    const list = indents ?? [];
    const open = list.filter((i) => i.status === 'open').length;
    const inProgress = list.filter((i) => i.status === 'in_progress').length;
    const totalPositions = list.reduce((acc, i) => acc + (i.noOfPost || 0), 0);
    const closingIn7 = list.filter((i) => {
      const d = daysUntil(i.completionDate);
      return d !== null && d >= 0 && d <= 7 && i.status !== 'closed' && i.status !== 'cancelled';
    }).length;
    return { total: list.length, open, inProgress, totalPositions, closingIn7 };
  }, [indents]);

  const openReindent = useCallback(
    (indent: Indent, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!requireCompanySelected()) return;
      setReindentSource(indent);
      setIsCreateModalOpen(true);
    },
    [requireCompanySelected]
  );

  const closeModal = useCallback(() => {
    setIsCreateModalOpen(false);
    setReindentSource(null);
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <IconLoader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-[13px]">Loading manpower indents…</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
          <IconAlertCircle className="h-7 w-7 text-destructive" />
          <p className="text-[13px] font-semibold text-destructive">Couldn't load indents</p>
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

  const statCards = [
    {
      label: 'Total Indents',
      value: stats.total,
      Icon: IconClipboardList,
      tint: 'bg-primary/10 text-primary',
      valueColor: 'text-foreground',
    },
    {
      label: 'Open',
      value: stats.open,
      Icon: IconLock,
      tint: 'bg-success/10 text-success',
      valueColor: 'text-success',
    },
    {
      label: 'In Progress',
      value: stats.inProgress,
      Icon: IconClock,
      tint: 'bg-warning/10 text-warning',
      valueColor: 'text-warning',
    },
    {
      label: 'Total Positions',
      value: stats.totalPositions,
      Icon: IconUsers,
      tint: 'bg-primary/10 text-primary',
      valueColor: 'text-primary',
    },
    {
      label: 'Closing in 7 days',
      value: stats.closingIn7,
      Icon: IconAlertCircle,
      tint: 'bg-destructive/10 text-destructive',
      valueColor: stats.closingIn7 > 0 ? 'text-destructive' : 'text-foreground',
    },
  ];

  return (
    <div className="bg-background text-foreground grow">
      <div className="mx-auto max-w-350 space-y-5 px-4 pt-6 pb-10 sm:px-6 lg:px-8">
        {/* Hero banner */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/12 text-primary">
                <IconBriefcase className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-[18px] font-bold tracking-[-0.02em]">Manpower Indents</h2>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  Track and manage recruitment requirements across departments
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!requireCompanySelected()) return;
                setIsCreateModalOpen(true);
              }}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <IconPlus className="h-4 w-4" strokeWidth={2.5} />
              Create Indent
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
          {statCards.map((s, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 shadow-xs sm:p-5">
              <div
                className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-[9px] ${s.tint}`}
              >
                <s.Icon className="h-[22px] w-[22px]" />
              </div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                {s.label}
              </p>
              <p
                className={`text-[28px] font-bold leading-none tracking-[-0.02em] tabular-nums ${s.valueColor}`}
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
                placeholder="Search by title, department, or ref…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-muted pl-10 pr-3 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
              />
            </div>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="h-10 cursor-pointer rounded-lg border border-border bg-muted px-3 pr-8 text-[13px] font-medium text-foreground outline-none transition-colors focus:border-primary md:min-w-40"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 cursor-pointer rounded-lg border border-border bg-muted px-3 pr-8 text-[13px] font-medium text-foreground outline-none transition-colors focus:border-primary md:min-w-32"
            >
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="closed">Closed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Result count */}
        <div className="px-1 text-[12px] text-muted-foreground">
          Showing{' '}
          <span className="font-semibold text-foreground tabular-nums">
            {filteredIndents.length}
          </span>{' '}
          of{' '}
          <span className="font-semibold text-foreground tabular-nums">{indents?.length ?? 0}</span>{' '}
          indents
        </div>

        {/* Table */}
        {filteredIndents.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <IconSearch className="h-6 w-6" />
            </div>
            <h3 className="text-[14px] font-semibold">No indents match your filters</h3>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Try adjusting your filters or create a new indent.
            </p>
            <button
              type="button"
              onClick={() => {
                if (!requireCompanySelected()) return;
                setIsCreateModalOpen(true);
              }}
              className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-[12px] font-semibold text-primary-foreground hover:opacity-90"
            >
              <IconPlus className="h-3.5 w-3.5" /> Create Indent
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-xs">
            <table className="w-full min-w-[1200px] text-[13px]">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                    Actions
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                    Ref
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                    Position
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                    Department
                  </th>
                  <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                    Posts
                  </th>
                  <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                    Applied
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                    Priority
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                    Job Type
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                    Deadline
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredIndents.map((indent) => {
                  const days = daysUntil(indent.completionDate);
                  const overdue = days !== null && days < 0;
                  return (
                    <tr
                      key={indent.id}
                      className={`cursor-pointer transition-colors hover:bg-muted/40 ${overdue ? 'border-l-2 border-l-destructive' : ''}`}
                      onClick={() => setSelectedIndent(indent)}
                    >
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => openReindent(indent, e)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/8 px-3 py-1.5 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/15"
                          >
                            <IconRepeat className="h-3.5 w-3.5" strokeWidth={2} />
                            Re-indent
                          </button>
                          {(indent.status === 'open' || indent.status === 'in_progress') && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAddCandidateIndent(indent);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-success/30 bg-success/8 px-3 py-1.5 text-[11px] font-semibold text-success transition-colors hover:bg-success/15"
                            >
                              <IconUserPlus className="h-3.5 w-3.5" strokeWidth={2} />
                              Add Candidate
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setQrIndent(indent);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted-foreground/10"
                          >
                            <IconQrcode className="h-3.5 w-3.5" strokeWidth={2} />
                            QR
                          </button>
                          {(indent.status === 'open' || indent.status === 'in_progress') && (
                            <button
                              type="button"
                              disabled={closingId === indent.id}
                              onClick={(e) => handleCloseVacancy(indent, e)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-muted-foreground/20 bg-muted px-3 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-destructive/30 hover:bg-destructive/8 hover:text-destructive disabled:pointer-events-none disabled:opacity-50"
                            >
                              {closingId === indent.id ? (
                                <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <IconLockOpen className="h-3.5 w-3.5" strokeWidth={2} />
                              )}
                              Close Vacancy
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <span className="font-mono text-[11px] font-semibold text-muted-foreground">
                          {indent.recordId ?? `#${indent.id.slice(0, 8)}`}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <p className="font-semibold text-foreground">{indent.title}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {PREFER_LABELS[indent.prefer] ?? indent.prefer}
                          {indent.experienceYears ? ` · ${indent.experienceYears}` : ''}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <IconBuilding className="h-3.5 w-3.5 shrink-0" />
                          <span>{indent.department?.name ?? '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="inline-flex items-center gap-1 text-muted-foreground">
                          <IconUsers className="h-3.5 w-3.5" />
                          <span className="font-semibold tabular-nums text-foreground">
                            {indent.noOfPost}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {(() => {
                          const applied = indent.candidates?.length ?? 0;
                          const posts = indent.noOfPost ?? 1;
                          const full = applied >= posts;
                          return (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold tabular-nums ${
                                full
                                  ? 'bg-success/10 text-success'
                                  : applied > 0
                                    ? 'bg-primary/10 text-primary'
                                    : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {applied}/{posts}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        {indent.priority ? (
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] ${
                              indent.priority === 'urgent'
                                ? 'bg-destructive/10 text-destructive'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {indent.priority}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        {indent.jobType && indent.jobType.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {indent.jobType.map((jt) => (
                              <span
                                key={jt}
                                className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                              >
                                {jt}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <div
                          className={`flex items-center gap-1.5 text-[12px] ${overdue ? 'font-semibold text-destructive' : 'text-muted-foreground'}`}
                        >
                          <IconCalendar className="h-3.5 w-3.5 shrink-0" />
                          {overdue
                            ? `${Math.abs(days!)}d overdue`
                            : formatDate(indent.completionDate)}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <StatusPill status={indent.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selectedIndent && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => setSelectedIndent(null)}
          >
          <div
            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-mono text-[11px] font-semibold text-muted-foreground">
                    {selectedIndent.recordId ?? `#${selectedIndent.id.slice(0, 8)}`}
                  </span>
                  <StatusPill status={selectedIndent.status} />
                  {selectedIndent.priority && (
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                        selectedIndent.priority === 'urgent'
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {selectedIndent.priority}
                    </span>
                  )}
                </div>
                <h2 className="text-[18px] font-bold leading-tight tracking-[-0.02em]">
                  {selectedIndent.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedIndent(null)}
                aria-label="Close"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-4 rounded-xl border border-border bg-muted/40 p-5 sm:grid-cols-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                    Department
                  </p>
                  <p className="mt-1 text-[13px] font-semibold">
                    {selectedIndent.department?.name ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                    Positions
                  </p>
                  <p className="mt-1 text-[13px] font-semibold tabular-nums">
                    {selectedIndent.noOfPost}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                    People Applied
                  </p>
                  <p className="mt-1 text-[13px] font-semibold tabular-nums text-primary">
                    {selectedIndent.candidates?.length ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                    People Selected
                  </p>
                  <p className="mt-1 text-[13px] font-semibold tabular-nums text-success">
                    {selectedIndent._count?.candidates ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                    Created
                  </p>
                  <p className="mt-1 text-[13px] font-semibold">
                    {formatDate(selectedIndent.createdAt)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                    Closes
                  </p>
                  <p className="mt-1 text-[13px] font-semibold">
                    {formatDate(selectedIndent.completionDate)}
                  </p>
                </div>
                {selectedIndent.budget != null && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                      Budget
                    </p>
                    <p className="mt-1 text-[13px] font-semibold tabular-nums">
                      ₹{selectedIndent.budget.toLocaleString('en-IN')}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <TagChip>{PREFER_LABELS[selectedIndent.prefer] ?? selectedIndent.prefer}</TagChip>
                <TagChip>
                  Gender · {GENDER_LABELS[selectedIndent.gender] ?? selectedIndent.gender}
                </TagChip>
                {selectedIndent.jobType?.map((jt) => (
                  <TagChip key={jt}>{jt}</TagChip>
                ))}
              </div>

              {selectedIndent.experienceYears && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-primary">
                    Required Experience
                  </p>
                  <p className="mt-1 text-[14px] font-semibold">{selectedIndent.experienceYears}</p>
                </div>
              )}

              {selectedIndent.socialsite &&
                selectedIndent.socialsite.length > 0 &&
                selectedIndent.socialsite.some((s) => s.trim()) && (
                  <div>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                      Target Platforms
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedIndent.socialsite
                        .filter((s) => s.trim())
                        .map((site, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-medium"
                          >
                            <IconCheck className="h-3 w-3 text-success" />
                            {site}
                          </span>
                        ))}
                    </div>
                  </div>
                )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setQrIndent(selectedIndent);
                  setSelectedIndent(null);
                }}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-muted px-4 text-[12px] font-semibold text-muted-foreground transition-colors hover:bg-muted-foreground/10"
              >
                <IconQrcode className="h-3.5 w-3.5" strokeWidth={2} />
                QR Code
              </button>
              <button
                type="button"
                onClick={(e) => {
                  setSelectedIndent(null);
                  openReindent(selectedIndent, e);
                }}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-primary/30 bg-primary/8 px-4 text-[12px] font-semibold text-primary transition-colors hover:bg-primary/15"
              >
                <IconRepeat className="h-3.5 w-3.5" strokeWidth={2} />
                Re-indent
              </button>
              {(selectedIndent.status === 'open' || selectedIndent.status === 'in_progress') && (
                <button
                  type="button"
                  onClick={() => {
                    const indent = selectedIndent;
                    setSelectedIndent(null);
                    setAddCandidateIndent(indent);
                  }}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-success/30 bg-success/8 px-4 text-[12px] font-semibold text-success transition-colors hover:bg-success/15"
                >
                  <IconUserPlus className="h-3.5 w-3.5" strokeWidth={2} />
                  Add Candidate
                </button>
              )}
              {(selectedIndent.status === 'open' || selectedIndent.status === 'in_progress') && (
                <button
                  type="button"
                  disabled={closingId === selectedIndent.id}
                  onClick={async (e) => {
                    const indent = selectedIndent;
                    setSelectedIndent(null);
                    await handleCloseVacancy(indent, e);
                  }}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/8 px-4 text-[12px] font-semibold text-destructive transition-colors hover:bg-destructive/15 disabled:opacity-50"
                >
                  {closingId === selectedIndent.id ? (
                    <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <IconLockOpen className="h-3.5 w-3.5" strokeWidth={2} />
                  )}
                  Close Vacancy
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedIndent(null)}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-muted px-4 text-[12px] font-semibold transition-colors hover:bg-muted-foreground/10"
              >
                Close
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Create / Re-indent Modal */}
      <CreateIndentModal
        isOpen={isCreateModalOpen}
        onClose={closeModal}
        prefillData={reindentSource}
      />

      {/* Add Candidate Modal */}
      <AddEnquiryModal
        isOpen={addCandidateIndent !== null}
        onClose={() => setAddCandidateIndent(null)}
        fieldConfig={fieldConfig}
        defaultIndentId={addCandidateIndent?.id}
      />

      {/* QR Code Modal */}
      {qrIndent && <QrCodeModal indent={qrIndent} onClose={() => setQrIndent(null)} />}
    </div>
  );
};

export default MainIndent;
