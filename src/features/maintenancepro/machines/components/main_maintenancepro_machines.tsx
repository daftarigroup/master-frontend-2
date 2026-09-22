'use client';

import { useQuery } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Factory,
  FileText,
  MoreVertical,
  PauseCircle,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  Wrench,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { usePagination } from '@/hooks/usePagination';
import { api } from '@/lib/axios';
import { useMachines } from '../server/tanstackQuery/useMachinesQueries';
import type { Machine, MachineStatus } from '../types/types';
import { MACHINE_STATUS_LABELS } from '../types/types';

const STATUS_COLORS: Record<MachineStatus, { color: string; bg: string; dot: string }> = {
  OPERATIONAL: {
    color: 'text-green-800 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-900/40',
    dot: 'bg-green-500',
  },
  UNDER_MAINTENANCE: {
    color: 'text-blue-800 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/40',
    dot: 'bg-blue-500',
  },
  BREAKDOWN: {
    color: 'text-amber-800 dark:text-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-900/40',
    dot: 'bg-red-500',
  },
  IDLE: {
    color: 'text-gray-800 dark:text-gray-300',
    bg: 'bg-gray-100 dark:bg-gray-700',
    dot: 'bg-gray-400',
  },
  DECOMMISSIONED: {
    color: 'text-slate-800 dark:text-slate-300',
    bg: 'bg-slate-100 dark:bg-slate-700',
    dot: 'bg-slate-400',
  },
};

function getHealthScore(status: MachineStatus, breakdownCount: number): number {
  const base: Record<MachineStatus, number> = {
    OPERATIONAL: 90,
    UNDER_MAINTENANCE: 65,
    BREAKDOWN: 30,
    IDLE: 75,
    DECOMMISSIONED: 10,
  };
  return Math.max(5, base[status] - Math.min(breakdownCount * 3, 30));
}

function getHealthColor(score: number): string {
  if (score >= 85) return 'bg-green-500';
  if (score >= 65) return 'bg-blue-500';
  if (score >= 45) return 'bg-amber-500';
  return 'bg-red-500';
}

function StatusBadge({ status }: { status: MachineStatus }) {
  const c = STATUS_COLORS[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.color}`}
    >
      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
      {MACHINE_STATUS_LABELS[status]}
    </span>
  );
}

type SortColumn = 'name' | 'department' | 'firm' | 'status' | 'repairCount' | 'health';

export default function MachinesList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [ownershipFilter, setOwnershipFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [firmFilter, setFirmFilter] = useState('all');
  const [sortColumn, setSortColumn] = useState<SortColumn>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [qrModalMachine, setQrModalMachine] = useState<Machine | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const { page: currentPage, limit: ITEMS_PER_PAGE, setPage: setCurrentPage } = usePagination(10);

  const {
    data: machinesResponse,
    isLoading,
    refetch,
  } = useMachines({
    page: currentPage,
    limit: ITEMS_PER_PAGE,
    search: searchTerm.trim() || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    departmentId: departmentFilter !== 'all' ? departmentFilter : undefined,
    firmId: firmFilter !== 'all' ? firmFilter : undefined,
  });
  const machines: Machine[] = useMemo(() => machinesResponse?.data ?? [], [machinesResponse?.data]);
  const total = machinesResponse?.pagination?.total ?? 0;
  const totalPages = machinesResponse?.pagination?.totalPages ?? 1;

  const stats = useMemo(() => {
    const totalCount = total || machines.length;
    const inUse = machines.filter((m) => m.status === 'OPERATIONAL').length;
    const underMaint = machines.filter(
      (m) => m.status === 'UNDER_MAINTENANCE' || m.status === 'BREAKDOWN'
    ).length;
    const idle = machines.filter((m) => m.status === 'IDLE').length;
    return {
      total: totalCount,
      inUse,
      underMaint,
      idle,
    };
  }, [machines, total]);

  // Tenant-wide department list (not derived from the current page of machines),
  // so the filter dropdown always shows every department regardless of pagination.
  const { data: departmentsResponse } = useQuery({
    queryKey: ['maintenancepro', 'departments', 'list'],
    queryFn: () => api.get('/maintenance/departments', { params: { limit: 100 } }),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
  const departments: { id: string; name: string }[] = departmentsResponse?.data?.data ?? [];

  // Tenant-wide firm/project list
  const { data: firmsResponse } = useQuery({
    queryKey: ['maintenancepro', 'firms', 'list'],
    queryFn: () => api.get('/maintenance/firms'),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
  const firms: { id: string; name: string }[] = firmsResponse?.data?.data ?? [];

  const handleSort = (col: SortColumn) => {
    if (sortColumn === col) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
  };

  // Filter client-side for category & ownership, and sort
  const filteredMachines = useMemo(() => {
    return [...machines]
      .filter((m) => {
        if (categoryFilter !== 'all' && m.category !== categoryFilter) return false;
        if (ownershipFilter !== 'all') {
          const isHired =
            m.ownershipType === 'RENTED' ||
            m.ownershipType === 'HIRED' ||
            (!m.firm && !!m.supplier);
          if (ownershipFilter === 'HIRED' && !isHired) return false;
          if (ownershipFilter === 'OWNED' && isHired) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let aVal: string | number = '';
        let bVal: string | number = '';
        if (sortColumn === 'name') {
          aVal = a.name;
          bVal = b.name;
        } else if (sortColumn === 'department') {
          aVal = a.department?.name ?? '';
          bVal = b.department?.name ?? '';
        } else if (sortColumn === 'firm') {
          aVal = a.firm?.name ?? a.firmName ?? '';
          bVal = b.firm?.name ?? b.firmName ?? '';
        } else if (sortColumn === 'status') {
          aVal = a.status;
          bVal = b.status;
        } else if (sortColumn === 'repairCount') {
          aVal = a._count?.breakdownReports ?? 0;
          bVal = b._count?.breakdownReports ?? 0;
        } else if (sortColumn === 'health') {
          aVal = getHealthScore(a.status, a._count?.breakdownReports ?? 0);
          bVal = getHealthScore(b.status, b._count?.breakdownReports ?? 0);
        }
        if (typeof aVal === 'string')
          return sortDirection === 'asc'
            ? aVal.localeCompare(bVal as string)
            : (bVal as string).localeCompare(aVal);
        return sortDirection === 'asc'
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number);
      });
  }, [machines, categoryFilter, ownershipFilter, sortColumn, sortDirection]);

  const paginatedMachines = filteredMachines;

  function SortIcon({ col }: { col: SortColumn }) {
    if (sortColumn !== col) return null;
    return sortDirection === 'asc' ? (
      <ArrowUp size={12} className="ml-1 inline" />
    ) : (
      <ArrowDown size={12} className="ml-1 inline" />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            Machines
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Equipment Master List
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => refetch()}
            className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm active:scale-95 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700"
          >
            <RefreshCw size={18} className={`text-gray-500 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to="/maintenance/machines/new"
            className="inline-flex items-center px-5 py-2.5 text-sm font-semibold text-primary-foreground bg-primary rounded-xl shadow-sm hover:shadow transition-all active:scale-95 tracking-wide gap-2"
          >
            <Plus size={18} />
            Add Machine
          </Link>
        </div>
      </div>

      {/* 4-Stat Summary Strip (Image 4 Style) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-900 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center flex-shrink-0">
            <Factory size={20} />
          </div>
          <div>
            <div className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-none">
              {stats.total}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">Total</div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 leading-none">
              {stats.inUse}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">In Use</div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center flex-shrink-0">
            <Wrench size={20} />
          </div>
          <div>
            <div className="text-xl font-bold text-orange-600 dark:text-orange-400 leading-none">
              {stats.underMaint}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">Under Maint.</div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center flex-shrink-0">
            <PauseCircle size={20} />
          </div>
          <div>
            <div className="text-xl font-bold text-rose-500 dark:text-rose-400 leading-none">
              {stats.idle}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">Idle</div>
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col p-4 sm:p-5 space-y-3 bg-white rounded-2xl shadow-sm border border-gray-100 lg:space-y-0 dark:bg-gray-900 dark:border-gray-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 group">
            <input
              type="text"
              placeholder="Search equipment by name, code, or model..."
              className="py-2.5 pr-4 pl-10 w-full rounded-xl border border-gray-200 bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:bg-white transition-all text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:focus:bg-gray-750"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 text-gray-400 -translate-y-1/2 group-focus-within:text-sky-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
            <select
              className="px-3 py-2 rounded-xl border border-gray-200 bg-gray-50/50 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20 font-semibold dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">Category: All</option>
              <option value="PRODUCTION">Production</option>
              <option value="MATERIAL_HANDLING">Material Handling</option>
              <option value="UTILITY">Utility</option>
              <option value="HVAC">HVAC</option>
              <option value="ELECTRICAL">Electrical</option>
              <option value="FACILITY">Facility</option>
            </select>

            <select
              className="px-3 py-2 rounded-xl border border-gray-200 bg-gray-50/50 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20 font-semibold dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              value={ownershipFilter}
              onChange={(e) => setOwnershipFilter(e.target.value)}
            >
              <option value="all">Ownership: All</option>
              <option value="OWNED">Owned</option>
              <option value="HIRED">Hired / Rented</option>
            </select>

            <select
              className="px-3 py-2 rounded-xl border border-gray-200 bg-gray-50/50 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20 font-semibold dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">Status: All</option>
              <option value="OPERATIONAL">In Use / Operational</option>
              <option value="UNDER_MAINTENANCE">Under Maintenance</option>
              <option value="BREAKDOWN">Breakdown</option>
              <option value="IDLE">Idle</option>
              <option value="DECOMMISSIONED">Decommissioned</option>
            </select>

            <select
              className="px-3 py-2 rounded-xl border border-gray-200 bg-gray-50/50 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20 font-semibold dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 hidden sm:block"
              value={departmentFilter}
              onChange={(e) => {
                setDepartmentFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Depts</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            {firms.length > 0 && (
              <select
                className="px-3 py-2 rounded-xl border border-gray-200 bg-gray-50/50 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20 font-semibold dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 hidden lg:block"
                value={firmFilter}
                onChange={(e) => {
                  setFirmFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">All Projects</option>
                {firms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-1 font-medium">
          <span>{filteredMachines.length} equipment found</span>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-hidden bg-white rounded-2xl shadow-lg border border-gray-100 dark:bg-gray-900 dark:border-gray-700/50">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                  Actions
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                  Image
                </th>
                <th
                  className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase cursor-pointer hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  onClick={() => handleSort('name')}
                >
                  Machine Name <SortIcon col="name" />
                </th>
                <th
                  className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase cursor-pointer hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  onClick={() => handleSort('department')}
                >
                  Department <SortIcon col="department" />
                </th>
                <th
                  className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase cursor-pointer hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  onClick={() => handleSort('firm')}
                >
                  Project (Firm) <SortIcon col="firm" />
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                  Part Names
                </th>
                <th
                  className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase cursor-pointer hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  onClick={() => handleSort('status')}
                >
                  Status <SortIcon col="status" />
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                  Task Assignment
                </th>
                <th
                  className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase cursor-pointer hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  onClick={() => handleSort('repairCount')}
                >
                  Repair Count <SortIcon col="repairCount" />
                </th>
                <th
                  className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase cursor-pointer hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  onClick={() => handleSort('health')}
                >
                  Health <SortIcon col="health" />
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`sk-${i}`}>
                    {Array.from({ length: 10 }).map((__, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-8 rounded-lg bg-gray-100 animate-pulse dark:bg-gray-700" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginatedMachines.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3 text-gray-400 dark:text-gray-500">
                      <Factory size={40} className="opacity-20" />
                      <p className="text-sm font-semibold text-muted-foreground">
                        No machines found
                      </p>
                      <p className="text-xs text-muted-foreground">Try adjusting your filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedMachines.map((machine) => {
                  const repairCount = machine._count?.breakdownReports ?? 0;
                  const health = getHealthScore(machine.status, repairCount);
                  const healthColor = getHealthColor(health);
                  const assigned = (machine.assignments?.length ?? 0) > 0;
                  const partNames = machine.parts?.map((p) => p.name) ?? [];

                  return (
                    <tr
                      key={machine.id}
                      className="hover:bg-gray-50 transition-colors dark:hover:bg-gray-800/50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/maintenance/machines/${machine.id}`}
                            className="p-1.5 text-sky-600 rounded-lg hover:text-sky-900 hover:bg-sky-50 transition-colors"
                            title="View Details"
                          >
                            <FileText size={18} />
                          </Link>
                          <Link
                            to={`/maintenance/machines/${machine.id}/parts`}
                            className="p-1.5 text-amber-600 rounded-lg hover:text-amber-900 hover:bg-amber-50 transition-colors"
                            title="Parts & Work Orders"
                          >
                            <Wrench size={18} />
                          </Link>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {machine.imageUrl ? (
                          <img
                            src={machine.imageUrl}
                            alt={machine.name}
                            className="w-16 h-16 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center dark:bg-gray-700 dark:border-gray-600">
                            <Factory size={24} className="text-gray-300" />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {machine.name}
                        </div>
                        <div className="text-xs text-gray-500 font-mono mt-0.5 dark:text-gray-400">
                          {machine.assetCode}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {machine.department?.name ?? '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {machine.firm?.name ?? machine.firmName ?? '—'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {partNames.length > 0 ? (
                            partNames.map((name, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-400"
                              >
                                {name}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={machine.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {assigned ? (
                          <div>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400">
                              Assigned
                            </span>
                            {machine.assignments?.[0] && (
                              <div className="text-[11px] text-gray-500 mt-0.5 font-medium dark:text-gray-400">
                                {machine.assignments[0].user.name}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium dark:text-gray-400">
                        {repairCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${healthColor}`}
                          />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {health}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {paginatedMachines.length > 0 && (
          <div className="px-6 py-4 border-t bg-gray-50/50 flex flex-wrap items-center justify-between gap-4 dark:bg-gray-800/50">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider dark:text-gray-500">
              Showing{' '}
              <span className="text-gray-900 dark:text-gray-100">
                {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
                {Math.min(currentPage * ITEMS_PER_PAGE, total)}
              </span>{' '}
              of <span className="text-gray-900 dark:text-gray-100">{total}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all disabled:opacity-30"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="flex items-center gap-1 px-4 py-1.5 bg-white border border-gray-100 rounded-xl shadow-sm text-xs font-medium tabular-nums dark:bg-gray-800 dark:border-gray-700">
                <span className="text-sky-600 font-semibold">{currentPage}</span>
                <span className="text-gray-300 dark:text-gray-600">/</span>
                <span className="text-gray-600 dark:text-gray-400">{totalPages}</span>
              </div>
              <button
                type="button"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-2 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all disabled:opacity-30"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="block md:hidden space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="p-4 bg-white rounded-2xl shadow-lg border border-gray-100 animate-pulse dark:bg-gray-900 dark:border-gray-700/50"
            >
              <div className="h-20 bg-gray-100 rounded-lg dark:bg-gray-700" />
            </div>
          ))
        ) : filteredMachines.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl shadow-lg border border-gray-100 dark:bg-gray-900 dark:border-gray-700/50">
            <Factory size={36} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-500 text-sm font-bold dark:text-gray-400">No machines found</p>
          </div>
        ) : (
          paginatedMachines.map((machine) => {
            const repairCount = machine._count?.breakdownReports ?? 0;
            const health = getHealthScore(machine.status, repairCount);
            const isHired =
              machine.ownershipType === 'RENTED' ||
              machine.ownershipType === 'HIRED' ||
              (!machine.firm && !!machine.supplier);
            const vendorName = machine.supplier || machine.firmName;
            const siteName = machine.firm?.name || machine.firmName || machine.location || 'Main Site';
            const categoryName = machine.category ? machine.category.replace(/_/g, ' ') : 'Equipment';

            return (
              <div
                key={machine.id}
                className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100 dark:bg-gray-900 dark:border-gray-800 transition-all hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  {/* Left Thumbnail */}
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 flex-shrink-0 flex items-center justify-center">
                    {machine.imageUrl ? (
                      <img
                        src={machine.imageUrl}
                        alt={machine.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Factory size={28} className="text-gray-300 dark:text-gray-600" />
                    )}
                  </div>

                  {/* Center Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-1">
                          {machine.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-xs font-semibold text-sky-600 dark:text-sky-400 font-mono">
                            {machine.assetCode}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 capitalize">
                            {categoryName.toLowerCase()}
                          </span>
                        </div>
                      </div>

                      {/* Right side: 3-dot dropdown menu */}
                      <div className="relative flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => setActiveMenuId(activeMenuId === machine.id ? null : machine.id)}
                          className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          <MoreVertical size={16} />
                        </button>
                        {activeMenuId === machine.id && (
                          <div className="absolute right-0 top-7 w-44 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-1.5 z-20 text-xs">
                            <Link
                              to={`/maintenance/machines/${machine.id}`}
                              className="flex items-center gap-2 px-3 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                              onClick={() => setActiveMenuId(null)}
                            >
                              <FileText size={14} className="text-sky-600" /> View Details
                            </Link>
                            <Link
                              to={`/maintenance/daily-logs?machineId=${machine.id}`}
                              className="flex items-center gap-2 px-3 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                              onClick={() => setActiveMenuId(null)}
                            >
                              <Calendar size={14} className="text-emerald-600" /> Daily Work Log
                            </Link>
                            <Link
                              to={`/maintenance/machines/${machine.id}/parts`}
                              className="flex items-center gap-2 px-3 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                              onClick={() => setActiveMenuId(null)}
                            >
                              <Wrench size={14} className="text-amber-600" /> Parts & Repairs
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 space-y-0.5 text-xs text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-400 text-[11px]">Ownership:</span>
                        {isHired ? (
                          <span className="text-amber-600 dark:text-amber-400 font-semibold text-[11px]">
                            Hired
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                            Owned
                          </span>
                        )}
                      </div>
                      {isHired && vendorName && (
                        <div className="flex items-center gap-1 text-[11px]">
                          <span className="text-gray-400">Vendor:</span>
                          <span className="text-gray-700 dark:text-gray-300 font-medium truncate">
                            {vendorName}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-[11px]">
                        <span className="text-gray-400">Site:</span>
                        <span className="text-gray-700 dark:text-gray-300 font-medium truncate">
                          {siteName}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Row: Status, Utilization & Scan */}
                    <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge status={machine.status} />
                        <div className="text-[11px]">
                          <span className="text-gray-400 mr-1">Util.</span>
                          <span
                            className={`font-bold ${
                              health >= 65
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : health >= 45
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {health}%
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setQrModalMachine(machine)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-2xs"
                      >
                        <QrCode size={13} className="text-gray-500" />
                        <span>Scan</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-2 text-gray-400 hover:text-sky-600 rounded-xl disabled:opacity-30"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-xs font-medium text-muted-foreground tabular-nums">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="p-2 text-gray-400 hover:text-sky-600 rounded-xl disabled:opacity-30"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>

      {/* QR Code Dialog Modal */}
      {qrModalMachine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-800 text-center relative">
            <button
              type="button"
              onClick={() => setQrModalMachine(null)}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg"
            >
              <X size={18} />
            </button>
            <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 mx-auto flex items-center justify-center mb-3">
              <QrCode size={24} />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
              {qrModalMachine.name}
            </h3>
            <p className="text-xs text-sky-600 dark:text-sky-400 font-mono font-semibold mt-0.5">
              {qrModalMachine.assetCode}
            </p>

            <div className="p-4 bg-white rounded-xl border border-gray-200 inline-block my-4 shadow-inner">
              <QRCodeSVG
                value={qrModalMachine.qrCode || `${window.location.origin}/maintenance/machines/${qrModalMachine.id}`}
                size={160}
                level="H"
              />
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Scan this QR code from any mobile device to view equipment specifications, work logs, or report a breakdown.
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setQrModalMachine(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Close
              </button>
              <Link
                to={`/maintenance/machines/${qrModalMachine.id}`}
                className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold text-center hover:opacity-95"
                onClick={() => setQrModalMachine(null)}
              >
                View Machine
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
