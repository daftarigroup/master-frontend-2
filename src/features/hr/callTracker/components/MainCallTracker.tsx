'use client';

import {
  IconAlertCircle,
  IconArrowRight,
  IconCheck,
  IconChevronDown,
  IconClock,
  IconFileDescription,
  IconLoader2,
  IconPhone,
  IconSearch,
  IconUsers,
  IconX,
} from '@tabler/icons-react';
import type React from 'react';
import { useMemo, useState } from 'react';
import {
  useCandidateHistory,
  useLogCandidateCall,
} from '../../findEnquiry/server/tanstackQuery/useCandidateQueries';
import type { Candidate } from '../../findEnquiry/types/types';

const STATUS_CONFIG: Record<
  string,
  { bg: string; text: string; label: string; icon: React.ReactNode }
> = {
  pending: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    label: 'Pending',
    icon: <IconClock className="h-3 w-3" />,
  },
  shortlisted: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    label: 'Shortlisted',
    icon: <IconAlertCircle className="h-3 w-3" />,
  },
  interviewed: {
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    label: 'Interviewed',
    icon: <IconClock className="h-3 w-3" />,
  },
  selected: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    label: 'Selected',
    icon: <IconCheck className="h-3 w-3" />,
  },
  rejected: {
    bg: 'bg-rose-100',
    text: 'text-rose-700',
    label: 'Rejected',
    icon: <IconX className="h-3 w-3" />,
  },
};

const NEXT_STATUSES: Record<string, string[]> = {
  pending: ['shortlisted', 'rejected'],
  shortlisted: ['interviewed', 'rejected'],
  interviewed: ['selected', 'rejected'],
  selected: [],
  rejected: [],
};

const getStatusBadge = (status: string) => {
  const s = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${s.bg} ${s.text}`}
    >
      {s.icon}
      {s.label}
    </span>
  );
};

const ActionCell: React.FC<{ candidate: Candidate }> = ({ candidate }) => {
  const logCall = useLogCandidateCall();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(candidate.notes ?? '');
  const nexts = NEXT_STATUSES[candidate.status] ?? [];

  if (candidate.status === 'selected') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
        <IconArrowRight className="h-3 w-3" />
        Move to Joining
      </span>
    );
  }

  if (candidate.status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-500">
        <IconX className="h-3 w-3" />
        Closed
      </span>
    );
  }

  const handle = async (status: string) => {
    await logCall.mutateAsync({ id: candidate.id, payload: { status, notes } });
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-xs hover:border-blue-300 hover:bg-blue-50 transition-all"
      >
        Update Status
        <IconChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-9 z-30 w-60 rounded-xl border border-gray-100 bg-white p-4 shadow-xl">
          <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-gray-400">
            Move to
          </p>
          <div className="mb-3 flex flex-wrap gap-2">
            {nexts.map((s) => {
              const cfg = STATUS_CONFIG[s];
              return (
                <button
                  key={s}
                  type="button"
                  disabled={logCall.isPending}
                  onClick={() => handle(s)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all disabled:opacity-60 hover:opacity-80 ${cfg?.bg ?? 'bg-gray-100'} ${cfg?.text ?? 'text-gray-700'}`}
                >
                  {cfg?.label ?? s}
                </button>
              );
            })}
          </div>
          <textarea
            rows={2}
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-1.5 text-xs outline-hidden focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-2 w-full rounded-lg py-1 text-xs text-gray-400 hover:text-gray-600"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

const MainCallTracker = () => {
  const { data: candidates, isLoading, isError } = useCandidateHistory();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = useMemo(() => {
    if (!candidates) return [];
    const term = searchTerm.toLowerCase();
    return candidates.filter((c) => {
      const matchesSearch =
        c.candidateName.toLowerCase().includes(term) ||
        c.phoneNo.toLowerCase().includes(term) ||
        c.candidateEnquiryNo.toLowerCase().includes(term);
      const matchesStatus = !statusFilter || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [candidates, searchTerm, statusFilter]);

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <IconLoader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 font-medium text-gray-600">Loading candidates...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="max-w-md rounded-xl border border-rose-100 bg-rose-50 p-8 text-center">
          <IconFileDescription className="mx-auto mb-4 h-12 w-12 text-rose-400" />
          <h3 className="text-lg font-bold text-rose-900">Connection Failed</h3>
          <p className="mt-2 text-sm text-rose-700">
            Could not load candidate data. Please check if your backend is running.
          </p>
        </div>
      </div>
    );
  }

  const all = candidates ?? [];
  const interviewedCount = all.filter((c) => c.status === 'interviewed').length;
  const shortlistedCount = all.filter((c) => c.status === 'shortlisted').length;
  const selectedCount = all.filter((c) => c.status === 'selected').length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">Call Tracker</h1>
        <p className="mt-1 text-xs font-medium text-gray-500 sm:text-sm">
          Track candidate progress and update interview status
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          {
            title: 'Total Candidates',
            value: all.length,
            Icon: IconUsers,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
          },
          {
            title: 'Shortlisted',
            value: shortlistedCount,
            Icon: IconPhone,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
          },
          {
            title: 'Interviewed',
            value: interviewedCount,
            Icon: IconClock,
            color: 'text-purple-600',
            bg: 'bg-purple-50',
          },
          {
            title: 'Selected',
            value: selectedCount,
            Icon: IconCheck,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
          },
        ].map((stat) => (
          <div
            key={stat.title}
            className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-5 shadow-xs hover:shadow-md transition-all"
          >
            <div className={`rounded-xl p-3 ${stat.bg}`}>
              <stat.Icon className={`h-6 w-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                {stat.title}
              </p>
              <p className="text-2xl font-black text-gray-800">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <IconSearch className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, phone, or enquiry no..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-gray-200 py-3 pl-12 pr-4 outline-hidden focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all placeholder:text-gray-400"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-700 outline-hidden focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all appearance-none cursor-pointer"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="interviewed">Interviewed</option>
            <option value="selected">Selected</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {filtered.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold whitespace-nowrap uppercase tracking-wider text-gray-500">
                    Candidate
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold whitespace-nowrap uppercase tracking-wider text-gray-500">
                    Applied For
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold whitespace-nowrap uppercase tracking-wider text-gray-500">
                    Phone
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold whitespace-nowrap uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold whitespace-nowrap uppercase tracking-wider text-gray-500">
                    Notes
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold whitespace-nowrap uppercase tracking-wider text-gray-500">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((candidate) => (
                  <tr key={candidate.id} className="hover:bg-gray-50/70 transition-colors">
                    {/* Candidate — name + ENQ ref as sub-text */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white">
                          {candidate.candidateName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{candidate.candidateName}</p>
                          <p className="text-[10px] font-medium text-gray-400 tracking-wide">
                            {candidate.candidateEnquiryNo}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-gray-700">
                      {candidate.indent?.title ?? '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <IconPhone className="h-4 w-4 text-gray-400" />
                        {candidate.phoneNo}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(candidate.status)}
                    </td>
                    <td className="max-w-[160px] px-6 py-4">
                      <p className="truncate text-sm text-gray-500">{candidate.notes ?? '—'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <ActionCell candidate={candidate} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 py-16 text-center">
          <IconFileDescription className="mb-4 h-16 w-16 text-gray-200" />
          <h3 className="text-xl font-bold text-gray-600">No Candidates Found</h3>
          <p className="mt-1 text-sm font-medium text-gray-400">
            {searchTerm || statusFilter
              ? 'Try adjusting your filters.'
              : 'No candidate enquiries submitted yet.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default MainCallTracker;
