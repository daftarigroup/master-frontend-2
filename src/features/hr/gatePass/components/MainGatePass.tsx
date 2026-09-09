'use client';

import React, { useState } from 'react';
import {
  IconCheck,
  IconClock,
  IconDoorExit,
  IconPlus,
  IconSearch,
  IconPrinter,
  IconBuildingCommunity,
  IconMapPin,
  IconCalendar,
  IconUser,
  IconFilter,
} from '@tabler/icons-react';
import { IssueGatePassModal, type IssueGatePassFormData } from './IssueGatePassModal';
import { HrModal } from '@/features/hr/_shared/components';
import { api } from '@/lib/axios';
import { cn } from '@/lib/utils';

export interface GatePassItem {
  id: number | string;
  employee: string;
  employeeId?: string;
  empCode?: string;
  department?: string;
  type: 'Personal' | 'Official';
  placeToVisit?: string;
  reason: string;
  date: string;
  outTime: string;
  inTime: string;
  status: 'open' | 'out' | 'closed' | 'rejected' | 'pending';
  approvedBy: string;
  whatsappNo?: string;
}

const initialGatePasses: GatePassItem[] = [
  {
    id: 1,
    employee: 'John Smith',
    employeeId: 'EMP-001',
    empCode: 'EMP001',
    department: 'Engineering',
    type: 'Personal',
    placeToVisit: 'City Clinic',
    reason: 'Medical Emergency',
    date: '2026-09-07',
    outTime: '11:00 AM',
    inTime: '02:00 PM',
    status: 'open',
    approvedBy: 'Sarah Wilson',
  },
  {
    id: 2,
    employee: 'Rahul Verma',
    employeeId: 'EMP-002',
    empCode: 'EMP002',
    department: 'Engineering',
    type: 'Official',
    placeToVisit: 'Navi Mumbai Municipal Corp',
    reason: 'Client Meeting',
    date: '2026-09-07',
    outTime: '10:30 AM',
    inTime: '-',
    status: 'out',
    approvedBy: 'Amit Patel',
  },
  {
    id: 3,
    employee: 'Priya Sharma',
    employeeId: 'EMP-003',
    empCode: 'EMP003',
    department: 'Quality',
    type: 'Personal',
    placeToVisit: 'State Bank of India',
    reason: 'Bank Work',
    date: '2026-09-06',
    outTime: '03:00 PM',
    inTime: '04:30 PM',
    status: 'closed',
    approvedBy: 'Rajesh Kumar',
  },
  {
    id: 4,
    employee: 'Aakash Sharma',
    employeeId: 'EMP-004',
    empCode: 'EMP004',
    department: 'Engineering',
    type: 'Official',
    placeToVisit: 'Surewada Quarry & Batching Plant',
    reason: 'Inspection of aggregate dispatch',
    date: '2026-09-07',
    outTime: '10:15 AM',
    inTime: '-',
    status: 'pending',
    approvedBy: 'Vikram Joshi',
  },
];

const MainGatePass = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'out' | 'open' | 'closed' | 'pending'>('all');
  const [gatePasses, setGatePasses] = useState<GatePassItem[]>(initialGatePasses);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [selectedPassForDetail, setSelectedPassForDetail] = useState<GatePassItem | null>(null);

  // Dynamic metric calculations
  const currentlyOut = gatePasses.filter((p) => p.status === 'out').length;
  const issuedToday = gatePasses.filter((p) => p.status === 'open').length;
  const pendingRequests = gatePasses.filter((p) => p.status === 'pending').length;

  const handleIssuePass = async (formData: IssueGatePassFormData) => {
    const newPass: GatePassItem = {
      id: Date.now(),
      employee: formData.employeeName,
      employeeId: formData.employeeId,
      empCode: formData.empCode,
      department: formData.departmentName,
      type: formData.type,
      placeToVisit: formData.placeToVisit,
      reason: formData.reason,
      outTime: formData.outTime,
      inTime: formData.inTime,
      status: formData.status,
      approvedBy: formData.approvedBy,
      whatsappNo: formData.whatsappNo,
      date: new Date().toISOString().slice(0, 10),
    };

    try {
      await api.post('/hrfms/gatepass', formData);
    } catch (err) {
      console.warn('API post error, saved to local state:', err);
    }

    setGatePasses((prev) => [newPass, ...prev]);
  };

  const handleUpdateStatus = async (
    passId: number | string,
    newStatus: 'open' | 'out' | 'closed'
  ) => {
    try {
      await api.patch(`/hrfms/gatepass/${passId}/status`, { status: newStatus });
    } catch (err) {
      console.warn('Status patch error:', err);
    }

    setGatePasses((prev) =>
      prev.map((p) => (p.id === passId ? { ...p, status: newStatus } : p))
    );
    if (selectedPassForDetail && selectedPassForDetail.id === passId) {
      setSelectedPassForDetail((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  const filteredPasses = gatePasses.filter((pass) => {
    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'open' && pass.status !== 'open') return false;
      if (statusFilter === 'out' && pass.status !== 'out') return false;
      if (statusFilter === 'closed' && pass.status !== 'closed') return false;
      if (statusFilter === 'pending' && pass.status !== 'pending') return false;
    }

    // Search query
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      pass.employee.toLowerCase().includes(q) ||
      pass.reason.toLowerCase().includes(q) ||
      (pass.placeToVisit && pass.placeToVisit.toLowerCase().includes(q)) ||
      (pass.department && pass.department.toLowerCase().includes(q)) ||
      pass.approvedBy.toLowerCase().includes(q) ||
      pass.type.toLowerCase().includes(q)
    );
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      open: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
      out: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
      closed: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      pending: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300',
      rejected: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
    };
    const labels: Record<string, string> = {
      open: 'Issued',
      out: 'Currently Out',
      closed: 'Returned',
      pending: 'Pending',
      rejected: 'Rejected',
    };
    return (
      <span
        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[status] || 'bg-gray-100'}`}
      >
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-lg font-bold text-foreground sm:text-2xl">Gate Pass Management</h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Manage employee entry/exit passes, track site mobility & visitor logs
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsIssueModalOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95 sm:w-auto"
        >
          <IconPlus className="h-4 w-4" strokeWidth={2.5} />
          Issue Gate Pass
        </button>
      </div>

      {/* ── KPI Metric Cards ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[
          {
            title: 'Currently Out',
            value: currentlyOut,
            icon: IconDoorExit,
            color: 'text-amber-600',
            bg: 'bg-amber-50 dark:bg-amber-950/40',
            filter: 'out' as const,
          },
          {
            title: 'Issued Today',
            value: issuedToday,
            icon: IconCheck,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50 dark:bg-emerald-950/40',
            filter: 'open' as const,
          },
          {
            title: 'Pending Request',
            value: pendingRequests,
            icon: IconClock,
            color: 'text-blue-600',
            bg: 'bg-blue-50 dark:bg-blue-950/40',
            filter: 'pending' as const,
          },
        ].map((stat, index) => (
          <div
            key={index}
            onClick={() =>
              setStatusFilter((prev) => (prev === stat.filter ? 'all' : stat.filter))
            }
            className={cn(
              'flex cursor-pointer items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:shadow-md active:scale-98',
              statusFilter === stat.filter && 'ring-2 ring-primary border-primary'
            )}
          >
            <div className={`rounded-xl p-3 ${stat.bg}`}>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">{stat.title}</p>
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Table Card ── */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        {/* Table Filters & Search */}
        <div className="flex flex-col items-stretch justify-between gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground sm:text-base">
              Recent Gate Passes
            </h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground font-medium">
              {filteredPasses.length} total
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status quick tabs */}
            <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1 text-xs">
              <IconFilter className="h-3.5 w-3.5 text-muted-foreground ml-1" />
              {(
                [
                  { key: 'all', label: 'All' },
                  { key: 'out', label: 'Out' },
                  { key: 'open', label: 'Issued' },
                  { key: 'closed', label: 'Returned' },
                  { key: 'pending', label: 'Pending' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={cn(
                    'rounded-md px-2 py-1 text-xs font-semibold transition-colors',
                    statusFilter === tab.key
                      ? 'bg-card text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <IconSearch className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search employee, destination..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-border bg-muted/40 py-2 pr-4 pl-9 text-xs text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary focus:bg-background"
              />
            </div>
          </div>
        </div>

        {/* Gate Passes Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase">
              <tr>
                <th className="px-6 py-3 text-left whitespace-nowrap">Employee</th>
                <th className="px-6 py-3 text-left whitespace-nowrap">Type</th>
                <th className="px-6 py-3 text-left whitespace-nowrap">Purpose / Destination</th>
                <th className="px-6 py-3 text-center whitespace-nowrap">Out Time</th>
                <th className="px-6 py-3 text-center whitespace-nowrap">In Time</th>
                <th className="px-6 py-3 text-center whitespace-nowrap">Status</th>
                <th className="px-6 py-3 text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              {filteredPasses.length > 0 ? (
                filteredPasses.map((pass) => (
                  <tr key={pass.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                          {pass.employee
                            .split(' ')
                            .map((w) => w[0])
                            .slice(0, 2)
                            .join('')}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{pass.employee}</p>
                          <p className="text-[11px] text-muted-foreground">
                            Approved by: <span className="font-medium">{pass.approvedBy}</span>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold',
                          pass.type === 'Official'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                        )}
                      >
                        {pass.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <p className="font-medium text-foreground truncate">{pass.reason}</p>
                      {pass.placeToVisit && (
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                          <IconMapPin className="h-3 w-3 shrink-0" />
                          <span>{pass.placeToVisit}</span>
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap font-medium text-muted-foreground">
                      {pass.outTime}
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap font-medium text-muted-foreground">
                      {pass.inTime}
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      {getStatusBadge(pass.status)}
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        {pass.status === 'open' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(pass.id, 'out')}
                            className="rounded-lg bg-amber-500/10 px-2 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-500/20 dark:text-amber-300 transition-colors"
                          >
                            Mark Out
                          </button>
                        )}
                        {pass.status === 'out' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(pass.id, 'closed')}
                            className="rounded-lg bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300 transition-colors"
                          >
                            Mark Returned
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedPassForDetail(pass)}
                          className="rounded-lg border border-border px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-muted transition-colors"
                        >
                          View Slip
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    <IconDoorExit className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                    <p className="font-semibold text-foreground">No gate passes found</p>
                    <p className="text-xs mt-0.5">
                      {searchTerm ? 'Try adjusting your search query.' : 'Click "+ Issue Gate Pass" to create one.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 1. ISSUE GATE PASS MODAL ── */}
      <IssueGatePassModal
        open={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        onSubmit={handleIssuePass}
      />

      {/* ── 2. VIEW GATE PASS SLIP / DETAILS MODAL ── */}
      {selectedPassForDetail && (
        <HrModal
          open={!!selectedPassForDetail}
          onClose={() => setSelectedPassForDetail(null)}
          title={`Gate Pass #${selectedPassForDetail.id}`}
          description={`Issued on ${selectedPassForDetail.date} • ${selectedPassForDetail.type} Movement`}
          icon={IconDoorExit}
          size="md"
          footer={
            <div className="flex w-full items-center justify-between">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
              >
                <IconPrinter className="h-4 w-4" />
                Print Pass Slip
              </button>
              <button
                type="button"
                onClick={() => setSelectedPassForDetail(null)}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
              >
                Close
              </button>
            </div>
          }
        >
          <div className="space-y-4 py-1">
            {/* Pass Slip Card */}
            <div className="rounded-xl border-2 border-dashed border-border bg-muted/20 p-4 space-y-3">
              <div className="flex items-start justify-between border-b border-border pb-3">
                <div>
                  <p className="text-xs font-bold text-foreground tracking-wide uppercase">
                    Pooja Constructions
                  </p>
                  <p className="text-[11px] text-muted-foreground">Official Security Gate Pass</p>
                </div>
                <div>{getStatusBadge(selectedPassForDetail.status)}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[11px] text-muted-foreground block">Employee Name</span>
                  <span className="font-semibold text-foreground">
                    {selectedPassForDetail.employee}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Department / Code</span>
                  <span className="font-semibold text-foreground">
                    {selectedPassForDetail.department || 'Engineering'} (
                    {selectedPassForDetail.empCode || 'EMP001'})
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Movement Type</span>
                  <span className="font-semibold text-foreground">
                    {selectedPassForDetail.type} Work
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Approved By</span>
                  <span className="font-semibold text-foreground">
                    {selectedPassForDetail.approvedBy}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Out Time (Departure)</span>
                  <span className="font-bold text-amber-600">
                    {selectedPassForDetail.outTime}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Expected In Time</span>
                  <span className="font-bold text-foreground">
                    {selectedPassForDetail.inTime}
                  </span>
                </div>
              </div>

              <div className="border-t border-border pt-2 text-xs">
                <span className="text-[11px] text-muted-foreground block">Purpose / Reason</span>
                <p className="font-medium text-foreground mt-0.5">{selectedPassForDetail.reason}</p>
                {selectedPassForDetail.placeToVisit && (
                  <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                    <IconMapPin className="h-3.5 w-3.5 text-primary" />
                    <span>Destination: {selectedPassForDetail.placeToVisit}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Quick status transitions */}
            <div className="rounded-xl border border-border bg-card p-3 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Quick Status Update:</span>
              <div className="flex items-center gap-2">
                {selectedPassForDetail.status !== 'out' && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedPassForDetail.id, 'out')}
                    className="rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-500/20 transition-colors"
                  >
                    Mark as Out
                  </button>
                )}
                {selectedPassForDetail.status !== 'closed' && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedPassForDetail.id, 'closed')}
                    className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-500/20 transition-colors"
                  >
                    Mark as Returned
                  </button>
                )}
              </div>
            </div>
          </div>
        </HrModal>
      )}
    </div>
  );
};

export default MainGatePass;
