'use client';

import React, { useState } from 'react';
import {
  IconDoorExit,
  IconCheck,
  IconAlertCircle,
  IconUser,
  IconBuildingCommunity,
  IconMapPin,
  IconClock,
  IconNotes,
  IconPhone,
  IconShieldCheck,
} from '@tabler/icons-react';
import { HrModal } from '@/features/hr/_shared/components';
import { useEmployees } from '@/features/hr/employee/server/tanstackQuery/useEmployeeQueries';
import { cn } from '@/lib/utils';

export interface IssueGatePassFormData {
  employeeId: string;
  employeeName: string;
  empCode: string;
  departmentName: string;
  type: 'Official' | 'Personal';
  placeToVisit: string;
  reason: string;
  outTime: string;
  inTime: string;
  approvedBy: string;
  whatsappNo: string;
  status: 'open' | 'out';
}

interface IssueGatePassModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: IssueGatePassFormData) => Promise<void> | void;
}

const defaultEmployees = [
  { employeeId: 'EMP-001', name: 'John Smith', empCode: 'EMP001', department: 'Engineering' },
  { employeeId: 'EMP-002', name: 'Rahul Verma', empCode: 'EMP002', department: 'Engineering' },
  { employeeId: 'EMP-003', name: 'Priya Sharma', empCode: 'EMP003', department: 'Quality' },
  { employeeId: 'EMP-004', name: 'Aakash Sharma', empCode: 'EMP004', department: 'Engineering' },
  { employeeId: 'EMP-005', name: 'Rohan Deshmukh', empCode: 'EMP005', department: 'Quality' },
  { employeeId: 'EMP-006', name: 'Kavita Nair', empCode: 'EMP006', department: 'Finance & Accounts' },
];

export const IssueGatePassModal: React.FC<IssueGatePassModalProps> = ({
  open,
  onClose,
  onSubmit,
}) => {
  const { data: apiEmployees = [] } = useEmployees();

  // Combine API employees or defaults
  const employeeOptions =
    Array.isArray(apiEmployees) && apiEmployees.length > 0
      ? apiEmployees.map((e: any) => ({
          employeeId: e.employeeId || `EMP-${e.id}`,
          name: e.name,
          empCode: e.empCode || e.employeeId || `EMP00${e.id}`,
          department:
            typeof e.department === 'string'
              ? e.department
              : e.department?.name || e.departmentName || 'General',
          phone: e.phone || '',
        }))
      : defaultEmployees;

  // Form states
  const [selectedEmpId, setSelectedEmpId] = useState(employeeOptions[0]?.employeeId || 'EMP-001');
  const [type, setType] = useState<'Official' | 'Personal'>('Official');
  const [placeToVisit, setPlaceToVisit] = useState('');
  const [reason, setReason] = useState('');
  const [outTime, setOutTime] = useState('11:00 AM');
  const [inTime, setInTime] = useState('02:00 PM');
  const [approvedBy, setApprovedBy] = useState('Sarah Wilson');
  const [whatsappNo, setWhatsappNo] = useState('');
  const [initialStatus, setInitialStatus] = useState<'open' | 'out'>('open');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Selected employee metadata
  const currentEmp = employeeOptions.find((e) => e.employeeId === selectedEmpId) || employeeOptions[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!placeToVisit.trim()) {
      setErrorMsg('Please specify the destination / place to visit.');
      return;
    }
    if (!reason.trim()) {
      setErrorMsg('Please provide a purpose or reason for the gate pass.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');

      const passData: IssueGatePassFormData = {
        employeeId: currentEmp.employeeId,
        employeeName: currentEmp.name,
        empCode: currentEmp.empCode,
        departmentName: currentEmp.department,
        type,
        placeToVisit: placeToVisit.trim(),
        reason: reason.trim(),
        outTime: outTime.trim() || '11:00 AM',
        inTime: inTime.trim() || '-',
        approvedBy: approvedBy.trim() || 'Admin',
        whatsappNo: whatsappNo.trim(),
        status: initialStatus,
      };

      await onSubmit(passData);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to issue gate pass.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <HrModal
      open={open}
      onClose={onClose}
      title="Issue Gate Pass"
      description="Create and approve an employee entry/exit gate pass for official or personal movement."
      icon={IconDoorExit}
      iconTone="primary"
      size="lg"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-60"
          >
            <IconCheck className="h-4 w-4" />
            {submitting ? 'Issuing Pass...' : 'Issue Gate Pass'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-1">
        {errorMsg && (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive font-medium">
            <IconAlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. Employee Selection & Metadata */}
        <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <IconUser className="h-4 w-4 text-primary" />
            <span>Employee Information</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">
                Select Employee <span className="text-destructive">*</span>
              </label>
              <select
                value={selectedEmpId}
                onChange={(e) => {
                  setSelectedEmpId(e.target.value);
                  setErrorMsg('');
                }}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              >
                {employeeOptions.map((emp) => (
                  <option key={emp.employeeId} value={emp.employeeId}>
                    {emp.name} ({emp.empCode}) — {emp.department}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
              <IconBuildingCommunity className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="text-xs min-w-0">
                <p className="font-semibold text-foreground truncate">{currentEmp?.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  Dept: <span className="font-medium text-foreground">{currentEmp?.department}</span> •{' '}
                  Code: <span className="font-medium text-foreground">{currentEmp?.empCode}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Gate Pass Type (Official / Personal) */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-foreground">
            Movement Type <span className="text-destructive">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setType('Official')}
              className={cn(
                'flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition-all',
                type === 'Official'
                  ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 ring-2 ring-blue-600/20'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted/40'
              )}
            >
              <IconBuildingCommunity className="h-4 w-4" />
              Official Duty
            </button>

            <button
              type="button"
              onClick={() => setType('Personal')}
              className={cn(
                'flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition-all',
                type === 'Personal'
                  ? 'border-purple-600 bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 ring-2 ring-purple-600/20'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted/40'
              )}
            >
              <IconUser className="h-4 w-4" />
              Personal Reason
            </button>
          </div>
        </div>

        {/* 3. Place to Visit & Purpose */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-foreground">
              Destination / Place to Visit <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <IconMapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder={type === 'Official' ? 'e.g. Surewada Batching Plant' : 'e.g. City Clinic'}
                value={placeToVisit}
                onChange={(e) => {
                  setPlaceToVisit(e.target.value);
                  setErrorMsg('');
                }}
                className="w-full rounded-xl border border-border bg-card pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-foreground">
              Purpose / Reason <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <IconNotes className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder={type === 'Official' ? 'e.g. Client inspection meeting' : 'e.g. Medical emergency'}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setErrorMsg('');
                }}
                className="w-full rounded-xl border border-border bg-card pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* 4. Timings: Out Time & In Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-foreground">
              Departure (Out Time) <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <IconClock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="11:00 AM"
                value={outTime}
                onChange={(e) => setOutTime(e.target.value)}
                className="w-full rounded-xl border border-border bg-card pl-9 pr-3 py-2 text-xs text-foreground outline-none transition-colors focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-foreground">
              Expected Return (In Time)
            </label>
            <div className="relative">
              <IconClock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="02:00 PM (or '-' if end of day)"
                value={inTime}
                onChange={(e) => setInTime(e.target.value)}
                className="w-full rounded-xl border border-border bg-card pl-9 pr-3 py-2 text-xs text-foreground outline-none transition-colors focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* 5. Approver & WhatsApp Contact */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-foreground">
              Approved By (HOD / Manager) <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <IconShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="e.g. Sarah Wilson"
                value={approvedBy}
                onChange={(e) => setApprovedBy(e.target.value)}
                className="w-full rounded-xl border border-border bg-card pl-9 pr-3 py-2 text-xs text-foreground outline-none transition-colors focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-foreground">
              WhatsApp / Contact No. (Optional)
            </label>
            <div className="relative">
              <IconPhone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="+91 98765 43210"
                value={whatsappNo}
                onChange={(e) => setWhatsappNo(e.target.value)}
                className="w-full rounded-xl border border-border bg-card pl-9 pr-3 py-2 text-xs text-foreground outline-none transition-colors focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* 6. Initial Status */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-foreground">Initial Status</label>
          <div className="flex items-center gap-4 text-xs">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-foreground">
              <input
                type="radio"
                name="initialStatus"
                value="open"
                checked={initialStatus === 'open'}
                onChange={() => setInitialStatus('open')}
                className="text-blue-600 focus:ring-blue-600"
              />
              <span>Issued (Ready at Security Desk)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-medium text-foreground">
              <input
                type="radio"
                name="initialStatus"
                value="out"
                checked={initialStatus === 'out'}
                onChange={() => setInitialStatus('out')}
                className="text-amber-600 focus:ring-amber-600"
              />
              <span>Currently Out (Departed Site)</span>
            </label>
          </div>
        </div>
      </form>
    </HrModal>
  );
};

export default IssueGatePassModal;
