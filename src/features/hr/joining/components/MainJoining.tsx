'use client';

import {
  IconAlertCircle,
  IconArrowRight,
  IconBell,
  IconBriefcase,
  IconCalendar,
  IconCheck,
  IconChevronDown,
  IconClipboardCheck,
  IconLoader2,
  IconRefresh,
  IconSearch,
  IconUserCheck,
  IconUserPlus,
  IconUsers,
  IconWorld,
  IconX,
} from '@tabler/icons-react';
import type React from 'react';
import { useMemo, useState } from 'react';
import UserAvatar from '@/components/ui/UserAvatar';
import { resolveActAsTenant } from '@/features/organization/utils/actAsTenant';
import { useAppSelector } from '@/store/hook';
import { selectUser } from '@/store/slice/userAccountData';
import { useCandidateHistory } from '../../findEnquiry/server/tanstackQuery/useCandidateQueries';
import {
  useInitiateJoining,
  useJoinings,
  useUpdateJoining,
} from '../server/tanstackQuery/useJoiningQueries';
import type { Joining } from '../types/types';
import { ModalPortal } from '@/features/hr/_shared/components';

const STATUS_CFG: Record<string, { label: string; bg: string; text: string }> = {
  pending: {
    label: 'PAUSED',
    bg: 'bg-muted',
    text: 'text-muted-foreground',
  },
  initiated: {
    label: 'INITIATED',
    bg: 'bg-primary/10',
    text: 'text-primary',
  },
  documents_verified: {
    label: 'DOCS VERIFIED',
    bg: 'bg-warning/10',
    text: 'text-warning',
  },
  joined: {
    label: 'JOINED',
    bg: 'bg-success/10',
    text: 'text-success',
  },
};

const NEXT_JOINING_STATUSES: Record<string, string[]> = {
  pending: ['initiated'],
  initiated: ['documents_verified'],
  documents_verified: ['joined'],
  joined: [],
};

const StatusPill = ({ status }: { status: string }) => {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.initiated!;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] ${cfg.bg} ${cfg.text}`}
    >
      {cfg.label}
    </span>
  );
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const JoiningStatusUpdate: React.FC<{ joining: Joining }> = ({ joining }) => {
  const user = useAppSelector(selectUser);
  const update = useUpdateJoining();
  const actAsTenantId = resolveActAsTenant(joining.tenant, user?.tenantId);
  const [open, setOpen] = useState(false);
  const nexts = NEXT_JOINING_STATUSES[joining.status] ?? [];
  const canPause = joining.status === 'initiated' || joining.status === 'documents_verified';

  if (joining.status === 'joined') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success">
        <IconCheck className="h-3 w-3" strokeWidth={3} />
        Onboarded
      </span>
    );
  }

  if (joining.status === 'pending') {
    return (
      <button
        type="button"
        disabled={update.isPending}
        onClick={() =>
          update.mutateAsync({ id: joining.id, data: { status: 'initiated' }, actAsTenantId })
        }
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 text-[11px] font-semibold text-primary transition-opacity hover:opacity-80 disabled:opacity-60"
      >
        <IconArrowRight className="h-3 w-3" />
        Resume
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted px-3 text-[11px] font-semibold text-foreground transition-colors hover:bg-muted-foreground/10"
        >
          Update
          <IconChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
            <div className="absolute left-0 top-9 z-50 w-56 overflow-hidden rounded-xl border border-border bg-card p-3 shadow-2xl">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                Move to
              </p>
              <div className="flex flex-wrap gap-1.5">
                {nexts.map((s) => {
                  const cfg = STATUS_CFG[s];
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={update.isPending}
                      onClick={async () => {
                        await update.mutateAsync({
                          id: joining.id,
                          data: { status: s },
                          actAsTenantId,
                        });
                        setOpen(false);
                      }}
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.04em] transition-opacity hover:opacity-80 disabled:opacity-50 ${cfg?.bg ?? 'bg-muted'} ${cfg?.text ?? 'text-muted-foreground'}`}
                    >
                      {cfg?.label ?? s}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-2 w-full rounded-md py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
      {canPause && (
        <button
          type="button"
          disabled={update.isPending}
          onClick={() =>
            update.mutateAsync({ id: joining.id, data: { status: 'pending' }, actAsTenantId })
          }
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted px-3 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-destructive disabled:opacity-60"
        >
          <IconX className="h-3 w-3" />
          Pause
        </button>
      )}
    </div>
  );
};

const InitiateJoiningModal: React.FC<{
  candidateId: number;
  candidateName: string;
  candidateTenant?: { id: string; name: string } | null;
  onClose: () => void;
}> = ({ candidateId, candidateName, candidateTenant, onClose }) => {
  const user = useAppSelector(selectUser);
  const initiate = useInitiateJoining();
  const [joiningDate, setJoiningDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!joiningDate) {
      setError('Please select a joining date.');
      return;
    }
    try {
      await initiate.mutateAsync({
        payload: {
          candidateId,
          joiningDate: new Date(joiningDate).toISOString(),
          status: 'initiated',
        },
        actAsTenantId: resolveActAsTenant(candidateTenant, user?.tenantId),
      });
      onClose();
    } catch (err) {
      console.error('Failed to initiate joining:', err);
      setError('Failed to initiate joining. Please try again.');
    }
  };

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      >
      <div
        className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="initiate-joining-title"
      >
        <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <IconUserPlus className="h-5 w-5" />
            </div>
            <div>
              <h3
                id="initiate-joining-title"
                className="text-[16px] font-bold leading-tight tracking-[-0.01em]"
              >
                Initiate Joining
              </h3>
              <p className="mt-0.5 text-[12px] text-muted-foreground">{candidateName}</p>
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
        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-[12px] text-destructive"
            >
              <IconAlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
              Expected Joining Date
            </label>
            <input
              required
              type="date"
              value={joiningDate}
              onChange={(e) => setJoiningDate(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-muted px-3 text-[13px] text-foreground outline-none transition-colors focus:border-primary"
            />
          </div>
        </form>
        <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-muted px-4 text-[12px] font-semibold transition-colors hover:bg-muted-foreground/10"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e as unknown as React.FormEvent)}
            disabled={initiate.isPending}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-[12px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {initiate.isPending ? (
              <>
                <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
                Initiating…
              </>
            ) : (
              <>
                <IconCheck className="h-3.5 w-3.5" strokeWidth={2.5} />
                Initiate
              </>
            )}
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};

const MainJoining = () => {
  const { data: candidates, isLoading: loadingCandidates } = useCandidateHistory();
  const { data: joinings, isLoading: loadingJoinings, isError, refetch } = useJoinings();
  const [searchTerm, setSearchTerm] = useState('');
  const [initiateFor, setInitiateFor] = useState<{
    id: number;
    name: string;
    tenant?: { id: string; name: string } | null;
  } | null>(null);

  const isLoading = loadingCandidates || loadingJoinings;

  const joiningCandidateIds = useMemo(
    () => new Set((joinings ?? []).map((j) => j.candidateId)),
    [joinings]
  );

  const selectedCandidates = useMemo(() => {
    if (!candidates) return [];
    const term = searchTerm.toLowerCase().trim();
    return candidates.filter(
      (c) =>
        c.status === 'selected' &&
        !joiningCandidateIds.has(c.id) &&
        (!term ||
          c.candidateName.toLowerCase().includes(term) ||
          c.phoneNo.toLowerCase().includes(term) ||
          (c.candidateEnquiryNo ?? '').toLowerCase().includes(term))
    );
  }, [candidates, joiningCandidateIds, searchTerm]);

  const filteredJoinings = useMemo(() => {
    if (!joinings) return [];
    const term = searchTerm.toLowerCase().trim();
    return joinings.filter(
      (j) =>
        !term ||
        (j.candidate?.candidateName ?? '').toLowerCase().includes(term) ||
        (j.candidate?.candidateEnquiryNo ?? '').toLowerCase().includes(term)
    );
  }, [joinings, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <IconLoader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-[13px]">Loading joining data…</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
          <IconAlertCircle className="h-7 w-7 text-destructive" />
          <p className="text-[13px] font-semibold text-destructive">Couldn't load joining data</p>
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

  const allJoinings = joinings ?? [];

  const statCards = [
    {
      label: 'Awaiting',
      value: selectedCandidates.length,
      Icon: IconUsers,
      tint: 'bg-warning/10 text-warning',
      valueColor: 'text-warning',
    },
    {
      label: 'Initiated',
      value: allJoinings.filter((j) => j.status === 'initiated').length,
      Icon: IconUserPlus,
      tint: 'bg-primary/10 text-primary',
      valueColor: 'text-primary',
    },
    {
      label: 'Docs Verified',
      value: allJoinings.filter((j) => j.status === 'documents_verified').length,
      Icon: IconClipboardCheck,
      tint: 'bg-warning/10 text-warning',
      valueColor: 'text-foreground',
    },
    {
      label: 'Joined',
      value: allJoinings.filter((j) => j.status === 'joined').length,
      Icon: IconUserCheck,
      tint: 'bg-success/10 text-success',
      valueColor: 'text-success',
    },
    {
      label: 'Total Pipeline',
      value: allJoinings.length,
      Icon: IconBriefcase,
      tint: 'bg-primary/10 text-primary',
      valueColor: 'text-foreground',
    },
  ];

  return (
    <div className="bg-background text-foreground grow">
      <div className="mx-auto max-w-350 space-y-5 px-4 pt-6 pb-10 sm:px-6 lg:px-8">
        {/* Top header bar */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="mb-0.5 text-[12px] text-muted-foreground">Recruitment</p>
            <h1 className="text-[18px] font-bold leading-tight tracking-[-0.03em] sm:text-[22px]">
              Joining Management
            </h1>
          </div>
        </div>

        {/* Hero banner */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-linear-to-br from-card to-card/50 px-5 py-5 sm:px-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/12 text-primary">
                <IconUserPlus className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-[18px] font-bold tracking-[-0.02em]">Onboarding Pipeline</h2>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  Manage selected candidates and track their joining progress
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
          {statCards.map((s, i) => (
            <div
              key={i}
              className="group rounded-xl border border-border bg-card p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg sm:p-5"
            >
              <div
                className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-[9px] ${s.tint}`}
              >
                <s.Icon className="h-5.5 w-5.5" />
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

        {/* Search */}
        <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs sm:px-5">
          <div className="relative">
            <IconSearch className="pointer-events-none absolute top-1/2 left-3.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by candidate name or enquiry number…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-muted pl-10 pr-3 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
            />
          </div>
        </div>

        {/* Awaiting joining section */}
        {selectedCandidates.length > 0 && (
          <section className="overflow-hidden rounded-xl border border-warning/30 bg-card shadow-xs">
            <div className="border-b border-warning/30 bg-warning/5 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10 text-warning">
                  <IconAlertCircle className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-[14px] font-semibold">Awaiting Joining Initiation</h2>
                    <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-bold text-warning">
                      {selectedCandidates.length}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    These candidates passed the interview. Click "Initiate Joining" to begin
                    onboarding.
                  </p>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-180">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="whitespace-nowrap px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                      Candidate
                    </th>
                    <th className="whitespace-nowrap px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                      Applied For
                    </th>
                    <th className="whitespace-nowrap px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                      Phone
                    </th>
                    <th className="whitespace-nowrap px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {selectedCandidates.map((c) => (
                    <tr key={c.id} className="transition-colors hover:bg-muted/40">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            name={c.candidateName}
                            avatarUrl={(c as any).avatarUrl ?? null}
                            size={36}
                          />
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-semibold">{c.candidateName}</p>
                            <p className="mt-0.5 truncate font-mono text-[10px] font-semibold text-muted-foreground">
                              {c.candidateEnquiryNo}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-[12px] text-foreground">
                        <div className="flex items-center gap-1.5">
                          <IconBriefcase className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="truncate">{c.indent?.title ?? '—'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-[12px] text-muted-foreground">{c.phoneNo}</td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setInitiateFor({
                              id: c.id,
                              name: c.candidateName,
                              tenant: c.tenant,
                            })
                          }
                          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-[11px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                        >
                          <IconUserPlus className="h-3 w-3" />
                          Initiate Joining
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Joining Pipeline section */}
        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <div className="border-b border-border px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <IconBriefcase className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-[14px] font-semibold">Joining Pipeline</h2>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                    {filteredJoinings.length}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Track onboarding progress for each candidate
                </p>
              </div>
            </div>
          </div>
          {filteredJoinings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-200">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="whitespace-nowrap px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                      Candidate
                    </th>
                    <th className="whitespace-nowrap px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                      Position
                    </th>
                    <th className="whitespace-nowrap px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                      Joining Date
                    </th>
                    <th className="whitespace-nowrap px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                      Status
                    </th>
                    <th className="whitespace-nowrap px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredJoinings.map((joining) => (
                    <tr key={joining.id} className="transition-colors hover:bg-muted/40">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            name={joining.candidate?.candidateName ?? '?'}
                            avatarUrl={(joining.candidate as any)?.avatarUrl ?? null}
                            size={36}
                          />
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-semibold">
                              {joining.candidate?.candidateName ?? '—'}
                            </p>
                            <p className="mt-0.5 truncate font-mono text-[10px] font-semibold text-muted-foreground">
                              {joining.candidate?.candidateEnquiryNo ?? '—'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-[12px] text-foreground">
                        <div className="flex items-center gap-1.5">
                          <IconBriefcase className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="truncate">
                            {joining.candidate?.indent?.title ?? '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                          <IconCalendar className="h-3.5 w-3.5" />
                          {formatDate(joining.joiningDate)}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusPill status={joining.status} />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <JoiningStatusUpdate joining={joining} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <IconUserPlus className="h-6 w-6" />
              </div>
              <p className="text-[14px] font-semibold">No joinings initiated yet</p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Select a candidate above to begin the joining process.
              </p>
            </div>
          )}
        </section>

        {initiateFor && (
          <InitiateJoiningModal
            candidateId={initiateFor.id}
            candidateName={initiateFor.name}
            candidateTenant={initiateFor.tenant}
            onClose={() => setInitiateFor(null)}
          />
        )}
      </div>
    </div>
  );
};

export default MainJoining;
