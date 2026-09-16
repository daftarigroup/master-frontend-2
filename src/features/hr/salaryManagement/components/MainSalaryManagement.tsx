'use client';

import {
  IconAlertTriangle,
  IconBriefcase,
  IconCalendar,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconCurrencyRupee,
  IconEdit,
  IconFilter,
  IconLoader2,
  IconLock,
  IconLockOpen,
  IconRefresh,
  IconSettings,
  IconUsers,
  IconX,
} from '@tabler/icons-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { type ReactNode, useState } from 'react';
import { toast } from 'sonner';
import { EditStructureModal } from '@/features/hr/mySalary/components/EditStructureModal';
import MainMySalary from '@/features/hr/mySalary/components/MainMySalary';
import { useGlobalStructure } from '@/features/hr/mySalary/server/tanstackQuery/useSalaryQueries';
import type { SalaryStructure } from '@/features/hr/mySalary/types/types';
import AllTransactionsTab from '@/features/hr/salaryManagement/components/AllTransactionsTab';
import { EmployeeStructureModal } from '@/features/hr/salaryManagement/components/EmployeeStructureModal';
import MainPayPolicy from '@/features/hr/salaryManagement/components/MainPayPolicy';
import { ModalPortal } from '../../_shared/components';
import { resolveActAsTenant } from '@/features/organization/utils/actAsTenant';
import { useAppSelector } from '@/store/hook';
import { selectUserRole } from '@/store/slice/permissionsSlice';
import { selectUser } from '@/store/slice/userAccountData';
import { Role } from '@/types/permissions';
import {
  useGeneratePayslip,
  useHoldSalary,
  useMarkPayslipPaid,
  usePayrollOverview,
} from '../server/tanstackQuery/useSalaryManagementQueries';
import type { PayrollEmployee } from '../types/types';

const T = {
  bg: 'var(--background)',
  fg: 'var(--foreground)',
  card: 'var(--card)',
  card2: 'color-mix(in oklch, var(--card) 90%, var(--foreground))',
  muted: 'var(--muted)',
  mutedFg: 'var(--muted-foreground)',
  border: 'var(--border)',
  primary: 'var(--primary)',
  primaryBg: 'color-mix(in oklch, var(--primary) 12%, transparent)',
  primaryFg: 'var(--primary-foreground, #fff)',
  success: 'var(--success)',
  successBg: 'color-mix(in oklch, var(--success) 14%, transparent)',
  warning: 'var(--warning)',
  warningBg: 'color-mix(in oklch, var(--warning) 14%, transparent)',
  danger: 'var(--danger)',
  dangerBg: 'color-mix(in oklch, var(--danger) 14%, transparent)',
  info: 'oklch(0.488 0.243 264.376)',
  infoBg: 'oklch(0.488 0.243 264.376 / 0.14)',
  font: "'DM Sans', system-ui, sans-serif" as string,
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        fontFamily: T.font,
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 11,
          background: `${color}22`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: T.mutedFg,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            margin: 0,
          }}
        >
          {label}
        </p>
        <p
          style={{
            fontSize: 'clamp(16px, 4vw, 22px)',
            fontWeight: 700,
            color: T.fg,
            margin: '1px 0 0',
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}
        >
          {value}
        </p>
        {sub && (
          <p
            style={{
              fontSize: 11,
              color: T.mutedFg,
              margin: '3px 0 0',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

function PayslipBadge({
  status,
  paidDate,
}: {
  status: 'generated' | 'paid' | null;
  paidDate?: string | null;
}) {
  if (!status)
    return (
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          padding: '3px 8px',
          borderRadius: 6,
          background: T.muted,
          color: T.mutedFg,
          border: `1px solid ${T.border}`,
        }}
      >
        Not Generated
      </span>
    );
  if (status === 'paid')
    return (
      <div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: '3px 8px',
            borderRadius: 6,
            background: T.successBg,
            color: T.success,
            border: `1px solid ${T.success}40`,
          }}
        >
          Paid
        </span>
        {paidDate && (
          <p style={{ fontSize: 10, color: T.mutedFg, margin: '3px 0 0' }}>
            on {new Date(paidDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
          </p>
        )}
      </div>
    );
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: '3px 8px',
        borderRadius: 6,
        background: T.infoBg,
        color: T.info,
        border: `1px solid ${T.info}40`,
      }}
    >
      Generated
    </span>
  );
}

// ── Hold Modal (single) ───────────────────────────────────────────────────────

function HoldModal({
  emp,
  onClose,
  onConfirm,
  loading,
}: {
  emp: PayrollEmployee;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState('');
  return (
    <ModalPortal>
      <div
        role="presentation"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 70,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        style={{
          background: T.card,
          borderRadius: 16,
          width: '100%',
          maxWidth: 440,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          fontFamily: T.font,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: T.warningBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: T.warning,
              }}
            >
              <IconAlertTriangle size={17} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: T.fg, margin: 0 }}>Hold Salary</p>
              <p style={{ fontSize: 11, color: T.mutedFg, margin: 0 }}>{emp.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              color: T.mutedFg,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconX size={16} />
          </button>
        </div>
        <div style={{ padding: 20 }}>
          <p style={{ fontSize: 13, color: T.mutedFg, margin: '0 0 14px' }}>
            This will prevent payslip generation for{' '}
            <strong style={{ color: T.fg }}>{emp.name}</strong> until the hold is released.
          </p>
          <label
            htmlFor="hold-reason"
            style={{
              display: 'block',
              fontSize: 11,
              fontWeight: 600,
              color: T.mutedFg,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: 6,
            }}
          >
            Reason (optional)
          </label>
          <textarea
            id="hold-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="e.g. Pending disciplinary action..."
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: 9,
              border: `1px solid ${T.border}`,
              background: T.muted,
              color: T.fg,
              fontSize: 13,
              fontFamily: T.font,
              resize: 'none',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '8px 18px',
                borderRadius: 8,
                border: `1px solid ${T.border}`,
                background: T.muted,
                color: T.fg,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: T.font,
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => onConfirm(reason)}
              style={{
                padding: '8px 20px',
                borderRadius: 8,
                border: 'none',
                background: T.warning,
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                opacity: loading ? 0.7 : 1,
                fontFamily: T.font,
              }}
            >
              {loading ? (
                <IconLoader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <IconLock size={14} />
              )}
              Hold Salary
            </button>
          </div>
        </div>
      </div>
    </div>
  </ModalPortal>
);
}

// ── Bulk Hold Modal ───────────────────────────────────────────────────────────

function BulkHoldModal({
  count,
  onClose,
  onConfirm,
  loading,
}: {
  count: number;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState('');
  return (
    <ModalPortal>
      <div
        role="presentation"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 70,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        style={{
          background: T.card,
          borderRadius: 16,
          width: '100%',
          maxWidth: 440,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          fontFamily: T.font,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: T.warningBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: T.warning,
              }}
            >
              <IconAlertTriangle size={17} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: T.fg, margin: 0 }}>
                Bulk Hold Salary
              </p>
              <p style={{ fontSize: 11, color: T.mutedFg, margin: 0 }}>
                {count} employee{count !== 1 ? 's' : ''} selected
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              color: T.mutedFg,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconX size={16} />
          </button>
        </div>
        <div style={{ padding: 20 }}>
          <p style={{ fontSize: 13, color: T.mutedFg, margin: '0 0 14px' }}>
            This will hold salary for{' '}
            <strong style={{ color: T.warning }}>
              {count} active employee{count !== 1 ? 's' : ''}
            </strong>{' '}
            (already held employees are skipped).
          </p>
          <label
            htmlFor="bulk-hold-reason"
            style={{
              display: 'block',
              fontSize: 11,
              fontWeight: 600,
              color: T.mutedFg,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: 6,
            }}
          >
            Reason (optional)
          </label>
          <textarea
            id="bulk-hold-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="e.g. Pending HR review..."
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: 9,
              border: `1px solid ${T.border}`,
              background: T.muted,
              color: T.fg,
              fontSize: 13,
              fontFamily: T.font,
              resize: 'none',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '8px 18px',
                borderRadius: 8,
                border: `1px solid ${T.border}`,
                background: T.muted,
                color: T.fg,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: T.font,
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => onConfirm(reason)}
              style={{
                padding: '8px 20px',
                borderRadius: 8,
                border: 'none',
                background: T.warning,
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                opacity: loading ? 0.7 : 1,
                fontFamily: T.font,
              }}
            >
              {loading ? (
                <IconLoader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <IconLock size={14} />
              )}
              Hold {count} Salary{count !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  </ModalPortal>
);
}

// ── Main Component ────────────────────────────────────────────────────────────

const TAB_TO_URL: Record<string, string> = {
  payroll: 'payroll',
  'pay-policy': 'pay-policy',
  'all-transactions': 'salary-records',
};

const URL_TO_TAB: Record<string, 'payroll' | 'pay-policy' | 'all-transactions'> = {
  payroll: 'payroll',
  'pay-policy': 'pay-policy',
  'salary-records': 'all-transactions',
};

export default function MainSalaryManagement() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const user = useAppSelector(selectUser);
  const role = useAppSelector(selectUserRole);
  const isAdmin = role === Role.ADMIN || role === Role.SUPERADMIN;

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [holdTarget, setHoldTarget] = useState<PayrollEmployee | null>(null);
  const [structureTarget, setStructureTarget] = useState<PayrollEmployee | null>(null);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterDesig, setFilterDesig] = useState('');
  const [filterHold, setFilterHold] = useState('');
  const [filterPayslip, setFilterPayslip] = useState('');
  const [editStructOpen, setEditStructOpen] = useState(false);
  const [liveStruct, setLiveStruct] = useState<SalaryStructure | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkHoldOpen, setBulkHoldOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'payroll' | 'pay-policy' | 'all-transactions'>(
    URL_TO_TAB[searchParams.get('tab') ?? ''] ?? 'payroll'
  );

  const switchTab = (tab: 'payroll' | 'pay-policy' | 'all-transactions') => {
    setActiveTab(tab);
    router.replace(`/hr/salary-management?tab=${TAB_TO_URL[tab]}`);
  };

  const { data: structureData } = useGlobalStructure();
  const displayStruct = liveStruct ?? structureData ?? null;

  const { data, isLoading, isError } = usePayrollOverview(month, year);
  const holdMutation = useHoldSalary();
  const generateMutation = useGeneratePayslip();
  const markPaidMutation = useMarkPayslipPaid();

  const employees = data?.employees ?? [];

  const uniqueDepts = [
    ...new Set(employees.map((e) => e.department?.name).filter(Boolean)),
  ] as string[];
  const uniqueDesigs = [
    ...new Set(employees.map((e) => e.designation).filter(Boolean)),
  ] as string[];
  const activeFilterCount = [filterDept, filterDesig, filterHold, filterPayslip].filter(
    Boolean
  ).length;

  const pendingEmployees = employees.filter((e) => e.payslip?.status !== 'paid');

  const filtered = pendingEmployees.filter((e) => {
    if (
      search &&
      !(
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.employeeId.toLowerCase().includes(search.toLowerCase()) ||
        (e.department?.name ?? '').toLowerCase().includes(search.toLowerCase())
      )
    )
      return false;
    if (filterDept && (e.department?.name ?? '') !== filterDept) return false;
    if (filterDesig && (e.designation ?? '') !== filterDesig) return false;
    if (filterHold === 'hold' && !e.salaryOnHold) return false;
    if (filterHold === 'active' && e.salaryOnHold) return false;
    if (filterPayslip === 'not_generated' && e.payslip) return false;
    if (filterPayslip === 'generated' && e.payslip?.status !== 'generated') return false;
    return true;
  });

  // Selection state derived values
  const selectedCount = selectedIds.size;
  const allSelected = filtered.length > 0 && filtered.every((e) => selectedIds.has(e.employeeId));
  const someSelected = selectedCount > 0 && !allSelected;
  const canBulkPay = (() => {
    const now = new Date();
    return filtered.filter((e) => {
      if (!selectedIds.has(e.employeeId) || e.payslip?.status !== 'generated') return false;
      const p = e.payslip;
      return (
        p.year < now.getFullYear() || (p.year === now.getFullYear() && p.month < now.getMonth() + 1)
      );
    }).length;
  })();
  const canBulkHold = filtered.filter(
    (e) => selectedIds.has(e.employeeId) && !e.salaryOnHold
  ).length;
  const canBulkRelease = filtered.filter(
    (e) => selectedIds.has(e.employeeId) && e.salaryOnHold
  ).length;

  const clearFilters = () => {
    setFilterDept('');
    setFilterDesig('');
    setFilterHold('');
    setFilterPayslip('');
    setSearch('');
  };

  // Stats — based on pending (not yet paid) employees only
  const totalPayroll = pendingEmployees.reduce(
    (s, e) => s + (e.payslip?.netPay ?? e.monthlySalary),
    0
  );
  const onHoldCount = pendingEmployees.filter((e) => e.salaryOnHold).length;
  const avgDays =
    pendingEmployees.length > 0
      ? (pendingEmployees.reduce((s, e) => s + e.daysPresent, 0) / pendingEmployees.length).toFixed(
          1
        )
      : '0';
  // Average working days across employees (excludes weekoffs + holidays per shift)
  const avgWorkingDays =
    pendingEmployees.length > 0
      ? Math.round(
          pendingEmployees.reduce((s, e) => s + e.workingDays, 0) / pendingEmployees.length
        )
      : (data?.workingDays ?? 26);

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  };

  const toggleSelect = (employeeId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(employeeId)) next.delete(employeeId);
      else next.add(employeeId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected || someSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((e) => e.employeeId)));
  };

  const handleHold = async (reason: string) => {
    if (!holdTarget) return;
    try {
      await holdMutation.mutateAsync({
        employeeId: holdTarget.employeeId,
        hold: true,
        reason,
        actAsTenantId: resolveActAsTenant(holdTarget.tenant, user?.tenantId),
      });
      toast.success(`Salary held for ${holdTarget.name}`);
      setHoldTarget(null);
    } catch {
      toast.error('Failed to hold salary');
    }
  };

  const handleRelease = async (emp: PayrollEmployee) => {
    try {
      await holdMutation.mutateAsync({
        employeeId: emp.employeeId,
        hold: false,
        actAsTenantId: resolveActAsTenant(emp.tenant, user?.tenantId),
      });
      toast.success(`Salary hold released for ${emp.name}`);
    } catch {
      toast.error('Failed to release hold');
    }
  };

  const handleGenerate = async (emp: PayrollEmployee) => {
    try {
      await generateMutation.mutateAsync({
        employeeId: emp.employeeId,
        month,
        year,
        actAsTenantId: resolveActAsTenant(emp.tenant, user?.tenantId),
      });
      toast.success(`Payslip generated for ${emp.name}`);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Failed to generate payslip');
    }
  };

  const handleMarkPaid = async (emp: PayrollEmployee) => {
    if (!emp.payslip) return;
    try {
      await markPaidMutation.mutateAsync({
        payslipId: emp.payslip.id,
        actAsTenantId: resolveActAsTenant(emp.tenant, user?.tenantId),
      });
      toast.success(`Payslip marked as paid for ${emp.name}`);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Failed to mark as paid');
    }
  };

  const handleBulkMarkPaid = async () => {
    const now = new Date();
    const targets = filtered.filter((e) => {
      if (!selectedIds.has(e.employeeId) || e.payslip?.status !== 'generated') return false;
      const p = e.payslip;
      return (
        p.year < now.getFullYear() || (p.year === now.getFullYear() && p.month < now.getMonth() + 1)
      );
    });
    if (!targets.length) {
      toast.error('No payslips eligible for payment — month must have ended');
      return;
    }
    setBulkLoading(true);
    const results = await Promise.allSettled(
      targets.map((e) => {
        if (!e.payslip) return Promise.resolve();
        return markPaidMutation.mutateAsync({
          payslipId: e.payslip.id,
          actAsTenantId: resolveActAsTenant(e.tenant, user?.tenantId),
        });
      })
    );
    setBulkLoading(false);
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected');
    if (ok > 0) toast.success(`${ok} / ${targets.length} payslips marked as paid`);
    if (failed.length > 0) {
      const firstMsg = (failed[0] as PromiseRejectedResult).reason as {
        response?: { data?: { message?: string } };
      };
      toast.error(firstMsg?.response?.data?.message ?? `${failed.length} payslip(s) failed`);
    }
    setSelectedIds(new Set());
  };

  const handleBulkHold = async (reason: string) => {
    const targets = filtered.filter((e) => selectedIds.has(e.employeeId) && !e.salaryOnHold);
    if (!targets.length) {
      toast.error('No active employees in selection');
      setBulkHoldOpen(false);
      return;
    }
    setBulkLoading(true);
    const results = await Promise.allSettled(
      targets.map((e) =>
        holdMutation.mutateAsync({
          employeeId: e.employeeId,
          hold: true,
          reason,
          actAsTenantId: resolveActAsTenant(e.tenant, user?.tenantId),
        })
      )
    );
    setBulkLoading(false);
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    toast.success(`${ok} salary hold${ok !== 1 ? 's' : ''} applied`);
    setSelectedIds(new Set());
    setBulkHoldOpen(false);
  };

  const handleBulkRelease = async () => {
    const targets = filtered.filter((e) => selectedIds.has(e.employeeId) && e.salaryOnHold);
    if (!targets.length) {
      toast.error('No held employees in selection');
      return;
    }
    setBulkLoading(true);
    const results = await Promise.allSettled(
      targets.map((e) =>
        holdMutation.mutateAsync({
          employeeId: e.employeeId,
          hold: false,
          actAsTenantId: resolveActAsTenant(e.tenant, user?.tenantId),
        })
      )
    );
    setBulkLoading(false);
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    toast.success(`${ok} hold${ok !== 1 ? 's' : ''} released`);
    setSelectedIds(new Set());
  };

  const handleBulkRegen = async () => {
    const targets = filtered.filter(
      (e) => selectedIds.has(e.employeeId) && !e.salaryOnHold && e.monthlySalary > 0
    );
    if (!targets.length) {
      toast.error('No eligible employees in selection (check salary is set and not on hold)');
      return;
    }
    setBulkLoading(true);
    const results = await Promise.allSettled(
      targets.map((e) =>
        generateMutation.mutateAsync({
          employeeId: e.employeeId,
          month,
          year,
          actAsTenantId: resolveActAsTenant(e.tenant, user?.tenantId),
        })
      )
    );
    setBulkLoading(false);
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (ok > 0)
      toast.success(
        `${ok} payslip${ok !== 1 ? 's' : ''} regenerated for ${MONTHS[month - 1]} ${year}`
      );
    if (failed > 0) toast.error(`${failed} payslip${failed !== 1 ? 's' : ''} failed`);
    setSelectedIds(new Set());
  };

  if (!isAdmin) return <MainMySalary />;

  return (
    <div
      style={{
        fontFamily: T.font,
        color: T.fg,
        minHeight: '100vh',
        background: T.bg,
      }}
    >
      <div style={{ padding: 'clamp(16px, 4vw, 24px) clamp(14px, 4vw, 28px) 0' }}>
        {/* Header */}
        <div style={{ marginBottom: 16 }}>
          <h1
            style={{
              fontSize: 'clamp(18px, 5vw, 22px)',
              fontWeight: 700,
              margin: 0,
              color: T.fg,
            }}
          >
            Salary
          </h1>
          <p style={{ fontSize: 'clamp(12px, 3vw, 13px)', color: T.mutedFg, margin: '4px 0 0' }}>
            Manage payroll, view days worked and hold salaries
          </p>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: 2,
            marginBottom: 20,
            borderBottom: `1px solid ${T.border}`,
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {(['payroll', 'all-transactions', 'pay-policy'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => switchTab(tab)}
              style={{
                padding: '8px 18px',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: T.font,
                border: 'none',
                cursor: 'pointer',
                background: 'transparent',
                color: activeTab === tab ? T.primary : T.mutedFg,
                borderBottom:
                  activeTab === tab ? `2px solid ${T.primary}` : '2px solid transparent',
                marginBottom: -1,
                transition: 'color 0.15s',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {tab === 'payroll'
                ? 'Payroll'
                : tab === 'all-transactions'
                  ? 'Salary Records'
                  : 'Pay Policy'}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'payroll' && (
        <div style={{ padding: '0 clamp(14px, 4vw, 28px) 24px' }}>
          {/* Payroll toolbar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
              marginBottom: 24,
            }}
          >
            <button
              type="button"
              onClick={() => setEditStructOpen(true)}
              style={{
                height: 36,
                padding: '0 14px',
                borderRadius: 9,
                border: `1px solid ${T.primary}40`,
                background: T.primaryBg,
                color: T.primary,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontFamily: T.font,
              }}
            >
              <IconEdit size={14} />
              Edit Salary Structure
              {displayStruct && (
                <span style={{ fontSize: 10, fontWeight: 500, color: T.mutedFg }}>
                  (Basic {displayStruct.basicPercent}%)
                </span>
              )}
            </button>

            {(() => {
              const today = new Date();
              const isAtPresent = year === today.getFullYear() && month === today.getMonth() + 1;
              const isFuture =
                year > today.getFullYear() ||
                (year === today.getFullYear() && month > today.getMonth() + 1);
              const currentYear = today.getFullYear();
              const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);
              return (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: T.card,
                    border: `1px solid ${T.border}`,
                    borderRadius: 10,
                    padding: '5px 8px',
                  }}
                >
                  <IconCalendar size={14} color={T.primary} style={{ flexShrink: 0 }} />
                  <button
                    type="button"
                    onClick={prevMonth}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 6,
                      border: 'none',
                      background: T.muted,
                      color: T.fg,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <IconChevronLeft size={13} />
                  </button>
                  <select
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                    style={{
                      height: 26,
                      padding: '0 6px',
                      borderRadius: 6,
                      border: `1px solid ${T.border}`,
                      background: T.muted,
                      color: T.fg,
                      fontSize: 12,
                      fontWeight: 600,
                      fontFamily: T.font,
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {MONTHS.map((m, i) => {
                      const optYear = year;
                      const isFutureOpt =
                        optYear > today.getFullYear() ||
                        (optYear === today.getFullYear() && i + 1 > today.getMonth() + 1);
                      return (
                        <option key={m} value={i + 1} disabled={isFutureOpt}>
                          {m}
                        </option>
                      );
                    })}
                  </select>
                  <select
                    value={year}
                    onChange={(e) => {
                      const y = Number(e.target.value);
                      setYear(y);
                      if (y === today.getFullYear() && month > today.getMonth() + 1) {
                        setMonth(today.getMonth() + 1);
                      }
                    }}
                    style={{
                      height: 26,
                      padding: '0 6px',
                      borderRadius: 6,
                      border: `1px solid ${T.border}`,
                      background: T.muted,
                      color: T.fg,
                      fontSize: 12,
                      fontWeight: 600,
                      fontFamily: T.font,
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={nextMonth}
                    disabled={isAtPresent || isFuture}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 6,
                      border: 'none',
                      background: T.muted,
                      color: isAtPresent || isFuture ? T.mutedFg : T.fg,
                      cursor: isAtPresent || isFuture ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      opacity: isAtPresent || isFuture ? 0.4 : 1,
                    }}
                  >
                    <IconChevronRight size={13} />
                  </button>
                </div>
              );
            })()}
          </div>

          {/* Stat cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 14,
              marginBottom: 24,
            }}
          >
            <StatCard
              icon={<IconUsers size={20} />}
              label="Pending Payment"
              value={pendingEmployees.length}
              sub={`${employees.length} total employees`}
              color={T.primary}
            />
            <StatCard
              icon={<IconCurrencyRupee size={20} />}
              label="Payroll to Disburse"
              value={fmt(totalPayroll)}
              sub="pending in-hand salary"
              color={T.success}
            />
            <StatCard
              icon={<IconLock size={20} />}
              label="Salary On Hold"
              value={onHoldCount}
              color={T.warning}
            />
            <StatCard
              icon={<IconBriefcase size={20} />}
              label="Avg Days Present"
              value={`${avgDays} / ${avgWorkingDays}`}
              color={T.info}
            />
          </div>

          {/* Table card */}
          <div
            style={{
              background: T.card,
              border: `1px solid ${T.border}`,
              borderRadius: 16,
              overflow: 'hidden',
            }}
          >
            {/* Toolbar */}
            <div
              style={{
                padding: '14px 20px',
                borderBottom: `1px solid ${T.border}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {/* Row 1: count + search + clear */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>
                    {filtered.length} Employee{filtered.length !== 1 ? 's' : ''}
                  </p>
                  {activeFilterCount > 0 && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: 20,
                        background: T.primaryBg,
                        color: T.primary,
                        border: `1px solid ${T.primary}30`,
                      }}
                    >
                      {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="text"
                    placeholder="Search name, ID, department…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{
                      height: 34,
                      padding: '0 12px',
                      borderRadius: 8,
                      border: `1px solid ${T.border}`,
                      background: T.muted,
                      color: T.fg,
                      fontSize: 13,
                      fontFamily: T.font,
                      outline: 'none',
                      width: '100%',
                      maxWidth: 220,
                      minWidth: 160,
                    }}
                  />
                  {(activeFilterCount > 0 || search) && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      style={{
                        height: 34,
                        padding: '0 12px',
                        borderRadius: 8,
                        border: `1px solid ${T.border}`,
                        background: T.muted,
                        color: T.mutedFg,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        fontFamily: T.font,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <IconX size={13} /> Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Row 2: filter dropdowns */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: T.mutedFg }}>
                  <IconFilter size={13} />
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Filter:
                  </span>
                </div>
                <select
                  value={filterDept}
                  onChange={(e) => setFilterDept(e.target.value)}
                  style={{
                    height: 32,
                    padding: '0 10px',
                    borderRadius: 8,
                    border: `1px solid ${filterDept ? T.primary : T.border}`,
                    background: filterDept ? T.primaryBg : T.muted,
                    color: filterDept ? T.primary : T.mutedFg,
                    fontSize: 12,
                    fontFamily: T.font,
                    outline: 'none',
                    cursor: 'pointer',
                    fontWeight: filterDept ? 600 : 400,
                  }}
                >
                  <option value="">All Departments</option>
                  {uniqueDepts.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <select
                  value={filterDesig}
                  onChange={(e) => setFilterDesig(e.target.value)}
                  style={{
                    height: 32,
                    padding: '0 10px',
                    borderRadius: 8,
                    border: `1px solid ${filterDesig ? T.primary : T.border}`,
                    background: filterDesig ? T.primaryBg : T.muted,
                    color: filterDesig ? T.primary : T.mutedFg,
                    fontSize: 12,
                    fontFamily: T.font,
                    outline: 'none',
                    cursor: 'pointer',
                    fontWeight: filterDesig ? 600 : 400,
                  }}
                >
                  <option value="">All Designations</option>
                  {uniqueDesigs.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <select
                  value={filterHold}
                  onChange={(e) => setFilterHold(e.target.value)}
                  style={{
                    height: 32,
                    padding: '0 10px',
                    borderRadius: 8,
                    border: `1px solid ${filterHold ? T.warning : T.border}`,
                    background: filterHold ? T.warningBg : T.muted,
                    color: filterHold ? T.warning : T.mutedFg,
                    fontSize: 12,
                    fontFamily: T.font,
                    outline: 'none',
                    cursor: 'pointer',
                    fontWeight: filterHold ? 600 : 400,
                  }}
                >
                  <option value="">Hold: All</option>
                  <option value="hold">On Hold</option>
                  <option value="active">Active</option>
                </select>
                <select
                  value={filterPayslip}
                  onChange={(e) => setFilterPayslip(e.target.value)}
                  style={{
                    height: 32,
                    padding: '0 10px',
                    borderRadius: 8,
                    border: `1px solid ${filterPayslip ? T.info : T.border}`,
                    background: filterPayslip ? T.infoBg : T.muted,
                    color: filterPayslip ? T.info : T.mutedFg,
                    fontSize: 12,
                    fontFamily: T.font,
                    outline: 'none',
                    cursor: 'pointer',
                    fontWeight: filterPayslip ? 600 : 400,
                  }}
                >
                  <option value="">Payslip: All Pending</option>
                  <option value="not_generated">Not Generated</option>
                  <option value="generated">Generated</option>
                </select>
              </div>

              {/* Row 3: Bulk action bar (visible only when rows selected) */}
              {selectedCount > 0 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flexWrap: 'wrap',
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: T.primaryBg,
                    border: `1px solid ${T.primary}30`,
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 700, color: T.primary }}>
                    {selectedCount} selected
                  </span>
                  <div
                    style={{
                      width: 1,
                      height: 16,
                      background: `${T.primary}40`,
                      margin: '0 4px',
                    }}
                  />
                  {canBulkPay > 0 && (
                    <button
                      type="button"
                      disabled={bulkLoading}
                      onClick={handleBulkMarkPaid}
                      style={{
                        height: 30,
                        padding: '0 12px',
                        borderRadius: 7,
                        border: `1px solid ${T.success}50`,
                        background: T.successBg,
                        color: T.success,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: bulkLoading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        fontFamily: T.font,
                        opacity: bulkLoading ? 0.6 : 1,
                      }}
                    >
                      <IconCheck size={13} />
                      Mark Paid ({canBulkPay})
                    </button>
                  )}
                  {canBulkHold > 0 && (
                    <button
                      type="button"
                      disabled={bulkLoading}
                      onClick={() => setBulkHoldOpen(true)}
                      style={{
                        height: 30,
                        padding: '0 12px',
                        borderRadius: 7,
                        border: `1px solid ${T.warning}50`,
                        background: T.warningBg,
                        color: T.warning,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: bulkLoading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        fontFamily: T.font,
                        opacity: bulkLoading ? 0.6 : 1,
                      }}
                    >
                      <IconLock size={13} />
                      Hold ({canBulkHold})
                    </button>
                  )}
                  {canBulkRelease > 0 && (
                    <button
                      type="button"
                      disabled={bulkLoading}
                      onClick={handleBulkRelease}
                      style={{
                        height: 30,
                        padding: '0 12px',
                        borderRadius: 7,
                        border: `1px solid ${T.success}50`,
                        background: T.successBg,
                        color: T.success,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: bulkLoading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        fontFamily: T.font,
                        opacity: bulkLoading ? 0.6 : 1,
                      }}
                    >
                      <IconLockOpen size={13} />
                      Release ({canBulkRelease})
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={bulkLoading}
                    onClick={handleBulkRegen}
                    style={{
                      height: 30,
                      padding: '0 12px',
                      borderRadius: 7,
                      border: `1px solid ${T.info}50`,
                      background: T.infoBg,
                      color: T.info,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: bulkLoading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      fontFamily: T.font,
                      opacity: bulkLoading ? 0.6 : 1,
                    }}
                  >
                    <IconRefresh size={13} />
                    Regen ({selectedCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedIds(new Set())}
                    style={{
                      height: 30,
                      padding: '0 10px',
                      borderRadius: 7,
                      border: `1px solid ${T.border}`,
                      background: 'transparent',
                      color: T.mutedFg,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontFamily: T.font,
                      marginLeft: 'auto',
                    }}
                  >
                    <IconX size={12} /> Clear
                  </button>
                </div>
              )}
            </div>

            {/* Loading / error */}
            {isLoading && (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: T.mutedFg }}>
                <IconLoader2
                  size={28}
                  style={{
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 8px',
                    display: 'block',
                  }}
                />
                <p style={{ fontSize: 13, margin: 0 }}>Loading payroll data…</p>
              </div>
            )}
            {isError && (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: T.danger }}>
                <p style={{ fontSize: 13, margin: 0 }}>Failed to load payroll data.</p>
              </div>
            )}

            {/* Table */}
            {!isLoading && !isError && (
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: 12,
                    fontFamily: T.font,
                  }}
                >
                  <thead>
                    {/* Row 1 — group labels */}
                    <tr style={{ borderBottom: `1px solid ${T.border}40` }}>
                      {/* sticky: checkbox + actions */}
                      <th
                        colSpan={2}
                        style={{
                          padding: '5px 12px',
                          background: 'color-mix(in oklch, var(--card) 94%, var(--foreground))',
                          position: 'sticky',
                          left: 0,
                          zIndex: 4,
                          borderRight: `1px solid ${T.border}`,
                        }}
                      />
                      {/* Employee Info */}
                      <th
                        colSpan={6}
                        style={{
                          padding: '5px 12px',
                          fontSize: 9,
                          fontWeight: 700,
                          textTransform: 'uppercase' as const,
                          letterSpacing: '0.07em',
                          color: T.primary,
                          background: T.primaryBg,
                          borderRight: `1px solid ${T.border}`,
                          textAlign: 'center' as const,
                        }}
                      >
                        Employee Info
                      </th>
                      {/* Bank Details */}
                      <th
                        colSpan={5}
                        style={{
                          padding: '5px 12px',
                          fontSize: 9,
                          fontWeight: 700,
                          textTransform: 'uppercase' as const,
                          letterSpacing: '0.07em',
                          color: T.info,
                          background: T.infoBg,
                          borderRight: `1px solid ${T.border}`,
                          textAlign: 'center' as const,
                        }}
                      >
                        Bank Details
                      </th>
                      {/* Attendance */}
                      <th
                        colSpan={4}
                        style={{
                          padding: '5px 12px',
                          fontSize: 9,
                          fontWeight: 700,
                          textTransform: 'uppercase' as const,
                          letterSpacing: '0.07em',
                          color: 'oklch(0.55 0.2 240)',
                          background: 'oklch(0.55 0.2 240 / 0.12)',
                          borderRight: `1px solid ${T.border}`,
                          textAlign: 'center' as const,
                        }}
                      >
                        Attendance
                      </th>
                      {/* Earnings */}
                      <th
                        colSpan={8}
                        style={{
                          padding: '5px 12px',
                          fontSize: 9,
                          fontWeight: 700,
                          textTransform: 'uppercase' as const,
                          letterSpacing: '0.07em',
                          color: T.success,
                          background: T.successBg,
                          borderRight: `1px solid ${T.border}`,
                          textAlign: 'center' as const,
                        }}
                      >
                        Earnings
                      </th>
                      {/* Deductions */}
                      <th
                        colSpan={5}
                        style={{
                          padding: '5px 12px',
                          fontSize: 9,
                          fontWeight: 700,
                          textTransform: 'uppercase' as const,
                          letterSpacing: '0.07em',
                          color: T.danger,
                          background: T.dangerBg,
                          borderRight: `1px solid ${T.border}`,
                          textAlign: 'center' as const,
                        }}
                      >
                        Deductions
                      </th>
                      {/* Payroll */}
                      <th
                        colSpan={3}
                        style={{
                          padding: '5px 12px',
                          fontSize: 9,
                          fontWeight: 700,
                          textTransform: 'uppercase' as const,
                          letterSpacing: '0.07em',
                          color: T.success,
                          background: `color-mix(in oklch, ${T.successBg} 60%, transparent)`,
                          borderRight: `1px solid ${T.border}`,
                          textAlign: 'center' as const,
                        }}
                      >
                        Payroll
                      </th>
                      {/* Hold */}
                      <th
                        colSpan={1}
                        style={{
                          padding: '5px 12px',
                          fontSize: 9,
                          fontWeight: 700,
                          textTransform: 'uppercase' as const,
                          letterSpacing: '0.07em',
                          color: T.warning,
                          background: T.warningBg,
                          textAlign: 'center' as const,
                        }}
                      >
                        Hold
                      </th>
                    </tr>
                    {/* Row 2 — column names */}
                    <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                      {/* Checkbox — sticky */}
                      <th
                        style={{
                          padding: '8px 10px 8px 12px',
                          background: 'color-mix(in oklch, var(--card) 97%, var(--foreground))',
                          position: 'sticky',
                          left: 0,
                          zIndex: 4,
                          width: 36,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = someSelected;
                          }}
                          onChange={toggleSelectAll}
                          style={{
                            cursor: 'pointer',
                            width: 14,
                            height: 14,
                            accentColor: T.primary,
                          }}
                        />
                      </th>
                      {/* Actions — sticky */}
                      <th
                        style={{
                          padding: '8px 12px',
                          textAlign: 'left' as const,
                          fontSize: 10,
                          fontWeight: 700,
                          color: T.mutedFg,
                          textTransform: 'uppercase' as const,
                          letterSpacing: '0.04em',
                          whiteSpace: 'nowrap',
                          background: 'color-mix(in oklch, var(--card) 97%, var(--foreground))',
                          position: 'sticky',
                          left: 36,
                          zIndex: 4,
                          borderRight: `1px solid ${T.border}`,
                        }}
                      >
                        Actions
                      </th>
                      {/* Employee Info group */}
                      {['Emp Code', 'Employee Name', 'Company', 'Location', 'Designation'].map(
                        (h, i) => (
                          <th
                            key={h}
                            style={{
                              padding: '8px 12px',
                              textAlign: 'left' as const,
                              fontSize: 10,
                              fontWeight: 700,
                              color: T.primary,
                              textTransform: 'uppercase' as const,
                              letterSpacing: '0.04em',
                              whiteSpace: 'nowrap',
                              background: `color-mix(in oklch, ${T.primaryBg} 35%, var(--card))`,
                              borderRight: i === 4 ? `1px solid ${T.border}` : undefined,
                            }}
                          >
                            {h}
                          </th>
                        )
                      )}
                      {/* Bank Details group */}
                      {['Bank Name', 'Account No.', 'IFSC Code', 'UAN', 'Insurance Id', 'Mode'].map(
                        (h, i) => (
                          <th
                            key={h}
                            style={{
                              padding: '8px 12px',
                              textAlign: 'left' as const,
                              fontSize: 10,
                              fontWeight: 700,
                              color: T.info,
                              textTransform: 'uppercase' as const,
                              letterSpacing: '0.04em',
                              whiteSpace: 'nowrap',
                              background: `color-mix(in oklch, ${T.infoBg} 35%, var(--card))`,
                              borderRight: i === 5 ? `1px solid ${T.border}` : undefined,
                            }}
                          >
                            {h}
                          </th>
                        )
                      )}
                      {/* Attendance group */}
                      {(
                        [
                          'Working Days Present',
                          'Weekend Worked',
                          'Holiday Worked',
                          'OT Hours',
                        ] as const
                      ).map((h, i) => (
                        <th
                          key={h}
                          style={{
                            padding: '8px 12px',
                            textAlign: 'left' as const,
                            fontSize: 10,
                            fontWeight: 700,
                            color: 'oklch(0.55 0.2 240)',
                            textTransform: 'uppercase' as const,
                            letterSpacing: '0.04em',
                            whiteSpace: 'nowrap',
                            background: 'oklch(0.55 0.2 240 / 0.07)',
                            borderRight: i === 3 ? `1px solid ${T.border}` : undefined,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                      {/* Earnings group */}
                      {(
                        [
                          'Basic',
                          'HRA',
                          'Conveyance',
                          'Medical Allow.',
                          'Special Allow.',
                          'OT Pay',
                          'Weekend Pay',
                          'Holiday Pay',
                        ] as const
                      ).map((h, i) => (
                        <th
                          key={h}
                          style={{
                            padding: '8px 12px',
                            textAlign: 'right' as const,
                            fontSize: 10,
                            fontWeight: 700,
                            color: T.success,
                            textTransform: 'uppercase' as const,
                            letterSpacing: '0.04em',
                            whiteSpace: 'nowrap',
                            background: `color-mix(in oklch, ${T.successBg} 35%, var(--card))`,
                            borderRight: i === 7 ? `1px solid ${T.border}` : undefined,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                      {/* Deductions group */}
                      {["Emp'ee PF", "Emp'er PF", "Emp'ee ESIC", "Emp'er ESIC", 'Loan Deduct.'].map(
                        (h, i) => (
                          <th
                            key={h}
                            style={{
                              padding: '8px 12px',
                              textAlign: 'right' as const,
                              fontSize: 10,
                              fontWeight: 700,
                              color: T.danger,
                              textTransform: 'uppercase' as const,
                              letterSpacing: '0.04em',
                              whiteSpace: 'nowrap',
                              background: `color-mix(in oklch, ${T.dangerBg} 35%, var(--card))`,
                              borderRight: i === 4 ? `1px solid ${T.border}` : undefined,
                            }}
                          >
                            {h}
                          </th>
                        )
                      )}
                      {/* Payroll group */}
                      {['Monthly CTC', 'In-Hand Salary', 'Payslip'].map((h, i) => (
                        <th
                          key={h}
                          style={{
                            padding: '8px 12px',
                            textAlign: i < 2 ? ('right' as const) : ('left' as const),
                            fontSize: 10,
                            fontWeight: 700,
                            color: T.success,
                            textTransform: 'uppercase' as const,
                            letterSpacing: '0.04em',
                            whiteSpace: 'nowrap',
                            background: `color-mix(in oklch, ${T.successBg} 25%, var(--card))`,
                            borderRight: i === 2 ? `1px solid ${T.border}` : undefined,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                      {/* Hold group */}
                      <th
                        style={{
                          padding: '8px 12px',
                          textAlign: 'left' as const,
                          fontSize: 10,
                          fontWeight: 700,
                          color: T.warning,
                          textTransform: 'uppercase' as const,
                          letterSpacing: '0.04em',
                          whiteSpace: 'nowrap',
                          background: `color-mix(in oklch, ${T.warningBg} 35%, var(--card))`,
                        }}
                      >
                        Hold
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 && (
                      <tr>
                        <td
                          colSpan={38}
                          style={{
                            padding: '48px 20px',
                            textAlign: 'center',
                            color: T.mutedFg,
                            fontSize: 13,
                          }}
                        >
                          No employees found
                        </td>
                      </tr>
                    )}
                    {filtered.map((emp) => {
                      const isSelected = selectedIds.has(emp.employeeId);
                      const isGenerating =
                        generateMutation.isPending &&
                        generateMutation.variables?.employeeId === emp.employeeId;
                      const isMarkingPaid =
                        markPaidMutation.isPending &&
                        markPaidMutation.variables?.payslipId === emp.payslip?.id;
                      const isToggling =
                        holdMutation.isPending &&
                        holdMutation.variables?.employeeId === emp.employeeId;
                      const netPay = emp.payslip?.netPay ?? null;
                      const bd = emp.salaryBreakdown;
                      const isPreview = bd?.isPreview ?? false;
                      const earnColor = isPreview
                        ? `color-mix(in oklch, ${T.success} 50%, ${T.mutedFg})`
                        : T.success;
                      const dedColor = isPreview
                        ? `color-mix(in oklch, ${T.danger} 50%, ${T.mutedFg})`
                        : T.danger;

                      const fmtVal = (v: number | undefined) =>
                        v != null && v > 0
                          ? (isPreview ? '~' : '') +
                            new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(v)
                          : '—';

                      const rowBg = isSelected
                        ? `color-mix(in oklch, ${T.primary} 6%, transparent)`
                        : emp.salaryOnHold
                          ? T.warningBg
                          : 'transparent';

                      const stickyBg = isSelected
                        ? `color-mix(in oklch, ${T.primary} 6%, var(--card))`
                        : emp.salaryOnHold
                          ? `color-mix(in oklch, ${T.warning} 8%, var(--card))`
                          : T.card;

                      return (
                        <tr
                          key={emp.id}
                          style={{
                            borderBottom: `1px solid ${T.border}`,
                            background: rowBg,
                            transition: 'background 0.15s',
                          }}
                        >
                          {/* Checkbox — sticky */}
                          <td
                            style={{
                              padding: '10px 10px 10px 12px',
                              position: 'sticky',
                              left: 0,
                              zIndex: 2,
                              background: stickyBg,
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                toggleSelect(emp.employeeId);
                              }}
                              style={{
                                cursor: 'pointer',
                                width: 14,
                                height: 14,
                                accentColor: T.primary,
                              }}
                            />
                          </td>

                          {/* Actions — sticky */}
                          <td
                            style={{
                              padding: '10px 12px',
                              position: 'sticky',
                              left: 36,
                              zIndex: 2,
                              background: stickyBg,
                              borderRight: `1px solid ${T.border}`,
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 5,
                                flexWrap: 'nowrap',
                              }}
                            >
                              {/* Generate / Regenerate / Recalculate / Pay Remaining */}
                              {!emp.salaryOnHold &&
                                (() => {
                                  const isPaid = emp.payslip?.status === 'paid';
                                  if (!isPaid) {
                                    return (
                                      <button
                                        type="button"
                                        disabled={isGenerating || emp.monthlySalary === 0}
                                        onClick={() => handleGenerate(emp)}
                                        title={
                                          emp.monthlySalary === 0
                                            ? 'No CTC set'
                                            : emp.payslip
                                              ? 'Regenerate payslip'
                                              : 'Generate payslip'
                                        }
                                        style={{
                                          height: 26,
                                          padding: '0 8px',
                                          borderRadius: 6,
                                          border: `1px solid ${T.primary}40`,
                                          background: T.primaryBg,
                                          color: T.primary,
                                          fontSize: 11,
                                          fontWeight: 600,
                                          cursor:
                                            emp.monthlySalary === 0 ? 'not-allowed' : 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 4,
                                          opacity: emp.monthlySalary === 0 ? 0.5 : 1,
                                          whiteSpace: 'nowrap',
                                          fontFamily: T.font,
                                        }}
                                      >
                                        {isGenerating ? (
                                          <IconLoader2
                                            size={11}
                                            style={{ animation: 'spin 1s linear infinite' }}
                                          />
                                        ) : (
                                          <IconCurrencyRupee size={11} />
                                        )}
                                        {emp.payslip ? 'Regen' : 'Generate'}
                                      </button>
                                    );
                                  }
                                  // Paid payslip — always allow regen (mid-month pay workflow)
                                  return (
                                    <button
                                      type="button"
                                      disabled={isGenerating || emp.monthlySalary === 0}
                                      onClick={() => handleGenerate(emp)}
                                      title="Recalculate full period — will reset to Unpaid"
                                      style={{
                                        height: 26,
                                        padding: '0 8px',
                                        borderRadius: 6,
                                        border: `1px solid ${T.warning}40`,
                                        background: T.warningBg,
                                        color: T.warning,
                                        fontSize: 11,
                                        fontWeight: 600,
                                        cursor: emp.monthlySalary === 0 ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        opacity: emp.monthlySalary === 0 ? 0.5 : 1,
                                        whiteSpace: 'nowrap',
                                        fontFamily: T.font,
                                      }}
                                    >
                                      {isGenerating ? (
                                        <IconLoader2
                                          size={11}
                                          style={{ animation: 'spin 1s linear infinite' }}
                                        />
                                      ) : (
                                        <IconCurrencyRupee size={11} />
                                      )}
                                      Regen
                                    </button>
                                  );
                                })()}
                              {/* Mark Paid */}
                              {emp.payslip?.status === 'generated' &&
                                (() => {
                                  const now = new Date();
                                  const p = emp.payslip;
                                  const canPay =
                                    p.year < now.getFullYear() ||
                                    (p.year === now.getFullYear() && p.month < now.getMonth() + 1);
                                  const isDisabled = isMarkingPaid || !canPay;
                                  return (
                                    <span
                                      title={
                                        !canPay
                                          ? 'Payment can only be done after the month ends'
                                          : undefined
                                      }
                                      style={{ display: 'inline-flex' }}
                                    >
                                      <button
                                        type="button"
                                        disabled={isDisabled}
                                        onClick={() => handleMarkPaid(emp)}
                                        style={{
                                          height: 26,
                                          padding: '0 8px',
                                          borderRadius: 6,
                                          border: `1px solid ${canPay ? T.success : T.muted}40`,
                                          background: canPay ? T.successBg : T.muted,
                                          color: canPay ? T.success : T.mutedFg,
                                          fontSize: 11,
                                          fontWeight: 600,
                                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 4,
                                          whiteSpace: 'nowrap',
                                          fontFamily: T.font,
                                          opacity: isDisabled ? 0.6 : 1,
                                        }}
                                      >
                                        {isMarkingPaid ? (
                                          <IconLoader2
                                            size={11}
                                            style={{ animation: 'spin 1s linear infinite' }}
                                          />
                                        ) : (
                                          <IconCheck size={11} />
                                        )}
                                        Mark Paid
                                      </button>
                                    </span>
                                  );
                                })()}
                              {/* Hold / Release */}
                              {emp.salaryOnHold ? (
                                <button
                                  type="button"
                                  disabled={isToggling}
                                  onClick={() => handleRelease(emp)}
                                  style={{
                                    height: 26,
                                    padding: '0 8px',
                                    borderRadius: 6,
                                    border: `1px solid ${T.success}40`,
                                    background: T.successBg,
                                    color: T.success,
                                    fontSize: 11,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    whiteSpace: 'nowrap',
                                    fontFamily: T.font,
                                  }}
                                >
                                  {isToggling ? (
                                    <IconLoader2
                                      size={11}
                                      style={{ animation: 'spin 1s linear infinite' }}
                                    />
                                  ) : (
                                    <IconLockOpen size={11} />
                                  )}
                                  Release
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isToggling}
                                  onClick={() => setHoldTarget(emp)}
                                  style={{
                                    height: 26,
                                    padding: '0 8px',
                                    borderRadius: 6,
                                    border: `1px solid ${T.warning}40`,
                                    background: T.warningBg,
                                    color: T.warning,
                                    fontSize: 11,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    whiteSpace: 'nowrap',
                                    fontFamily: T.font,
                                  }}
                                >
                                  <IconLock size={11} /> Hold
                                </button>
                              )}
                              {/* Set Structure */}
                              <button
                                type="button"
                                onClick={() => setStructureTarget(emp)}
                                title="Set salary structure for this employee"
                                style={{
                                  height: 26,
                                  padding: '0 8px',
                                  borderRadius: 6,
                                  border: `1px solid color-mix(in oklch, var(--chart-5) 50%, transparent)`,
                                  background: `color-mix(in oklch, var(--chart-5) 12%, transparent)`,
                                  color: 'var(--chart-5)',
                                  fontSize: 11,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  whiteSpace: 'nowrap',
                                  fontFamily: T.font,
                                }}
                              >
                                <IconSettings size={11} /> Structure
                              </button>
                            </div>
                          </td>

                          {/* Emp Code */}
                          <td
                            style={{
                              padding: '10px 12px',
                              whiteSpace: 'nowrap',
                              background: `color-mix(in oklch, ${T.primaryBg} 12%, transparent)`,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 11,
                                fontFamily: 'monospace',
                                color: T.primary,
                                fontWeight: 600,
                              }}
                            >
                              {emp.empCode || emp.employeeId}
                            </span>
                          </td>

                          {/* Employee Name */}
                          <td
                            style={{
                              padding: '10px 12px',
                              whiteSpace: 'nowrap',
                              background: `color-mix(in oklch, ${T.primaryBg} 12%, transparent)`,
                            }}
                          >
                            <span style={{ fontWeight: 600, color: T.fg }}>{emp.name}</span>
                          </td>

                          {/* Company */}
                          <td
                            style={{
                              padding: '10px 12px',
                              whiteSpace: 'nowrap',
                              color: emp.company ? T.fg : T.mutedFg,
                              background: `color-mix(in oklch, ${T.primaryBg} 12%, transparent)`,
                            }}
                          >
                            {emp.company ?? '—'}
                          </td>

                          {/* Location */}
                          <td
                            style={{
                              padding: '10px 12px',
                              whiteSpace: 'nowrap',
                              color: emp.location ? T.fg : T.mutedFg,
                              background: `color-mix(in oklch, ${T.primaryBg} 12%, transparent)`,
                            }}
                          >
                            {emp.location ?? '—'}
                          </td>

                          {/* Designation */}
                          <td
                            style={{
                              padding: '10px 12px',
                              whiteSpace: 'nowrap',
                              color: emp.designation ? T.fg : T.mutedFg,
                              background: `color-mix(in oklch, ${T.primaryBg} 12%, transparent)`,
                              borderRight: `1px solid ${T.border}`,
                            }}
                          >
                            {emp.designation ?? '—'}
                          </td>

                          {/* Bank Name */}
                          <td
                            style={{
                              padding: '10px 12px',
                              whiteSpace: 'nowrap',
                              color: emp.bankName ? T.fg : T.mutedFg,
                              background: `color-mix(in oklch, ${T.infoBg} 12%, transparent)`,
                            }}
                          >
                            {emp.bankName ?? '—'}
                          </td>

                          {/* Account No. */}
                          <td
                            style={{
                              padding: '10px 12px',
                              whiteSpace: 'nowrap',
                              color: emp.bankAccount ? T.fg : T.mutedFg,
                              fontFamily: emp.bankAccount ? 'monospace' : undefined,
                              background: `color-mix(in oklch, ${T.infoBg} 12%, transparent)`,
                            }}
                          >
                            {emp.bankAccount ?? '—'}
                          </td>

                          {/* IFSC Code */}
                          <td
                            style={{
                              padding: '10px 12px',
                              whiteSpace: 'nowrap',
                              color: emp.ifscCode ? T.fg : T.mutedFg,
                              fontFamily: emp.ifscCode ? 'monospace' : undefined,
                              background: `color-mix(in oklch, ${T.infoBg} 12%, transparent)`,
                            }}
                          >
                            {emp.ifscCode ?? '—'}
                          </td>

                          {/* UAN */}
                          <td
                            style={{
                              padding: '10px 12px',
                              whiteSpace: 'nowrap',
                              color: emp.uan ? T.fg : T.mutedFg,
                              fontFamily: emp.uan ? 'monospace' : undefined,
                              background: `color-mix(in oklch, ${T.infoBg} 12%, transparent)`,
                            }}
                          >
                            {emp.uan ?? '—'}
                          </td>

                          {/* Insurance Id */}
                          <td
                            style={{
                              padding: '10px 12px',
                              whiteSpace: 'nowrap',
                              color: emp.insuranceId ? T.fg : T.mutedFg,
                              fontFamily: emp.insuranceId ? 'monospace' : undefined,
                              background: `color-mix(in oklch, ${T.infoBg} 12%, transparent)`,
                            }}
                          >
                            {emp.insuranceId ?? '—'}
                          </td>

                          {/* Mode */}
                          <td
                            style={{
                              padding: '10px 12px',
                              whiteSpace: 'nowrap',
                              color: emp.mode ? T.fg : T.mutedFg,
                              background: `color-mix(in oklch, ${T.infoBg} 12%, transparent)`,
                              borderRight: `1px solid ${T.border}`,
                            }}
                          >
                            {emp.mode ?? '—'}
                          </td>

                          {/* Days Present */}
                          <td
                            style={{
                              padding: '10px 12px',
                              whiteSpace: 'nowrap',
                              background: 'oklch(0.55 0.2 240 / 0.05)',
                            }}
                          >
                            <span
                              style={{
                                fontWeight: 700,
                                color: 'oklch(0.55 0.2 240)',
                                fontSize: 13,
                              }}
                            >
                              {emp.daysPresent}
                            </span>
                            <span style={{ fontSize: 11, color: T.mutedFg }}>
                              {' '}
                              / {emp.workingDays}
                            </span>
                          </td>
                          {/* Weekend Works */}
                          <td
                            style={{
                              padding: '10px 12px',
                              whiteSpace: 'nowrap',
                              background: 'oklch(0.55 0.2 240 / 0.05)',
                            }}
                          >
                            {emp.weekendWorkDays > 0 ? (
                              <span style={{ fontWeight: 700, color: T.info }}>
                                {emp.weekendWorkDays}d
                              </span>
                            ) : (
                              <span style={{ color: T.mutedFg }}>—</span>
                            )}
                          </td>
                          {/* Holiday Works */}
                          <td
                            style={{
                              padding: '10px 12px',
                              whiteSpace: 'nowrap',
                              background: 'oklch(0.55 0.2 240 / 0.05)',
                            }}
                          >
                            {emp.holidayWorkDays > 0 ? (
                              <span style={{ fontWeight: 700, color: T.warning }}>
                                {emp.holidayWorkDays}d
                              </span>
                            ) : (
                              <span style={{ color: T.mutedFg }}>—</span>
                            )}
                          </td>
                          {/* OT Hours */}
                          <td
                            style={{
                              padding: '10px 12px',
                              whiteSpace: 'nowrap',
                              background: 'oklch(0.55 0.2 240 / 0.05)',
                              borderRight: `1px solid ${T.border}`,
                            }}
                          >
                            {emp.overtimeHours > 0 ? (
                              <span style={{ fontWeight: 700, color: T.danger }}>
                                {emp.overtimeHours}h
                              </span>
                            ) : (
                              <span style={{ color: T.mutedFg }}>—</span>
                            )}
                          </td>

                          {/* Basic */}
                          <td
                            style={{
                              padding: '10px 12px',
                              textAlign: 'right',
                              whiteSpace: 'nowrap',
                              color: earnColor,
                              fontWeight: 600,
                              background: `color-mix(in oklch, ${T.successBg} 12%, transparent)`,
                            }}
                          >
                            {bd ? fmtVal(bd.basic) : '—'}
                            {isPreview && bd?.basic ? (
                              <span
                                style={{
                                  fontSize: 9,
                                  color: T.mutedFg,
                                  display: 'block',
                                  fontWeight: 400,
                                }}
                              >
                                preview
                              </span>
                            ) : null}
                          </td>

                          {/* HRA */}
                          <td
                            style={{
                              padding: '10px 12px',
                              textAlign: 'right',
                              whiteSpace: 'nowrap',
                              color: earnColor,
                              fontWeight: 600,
                              background: `color-mix(in oklch, ${T.successBg} 12%, transparent)`,
                            }}
                          >
                            {bd ? fmtVal(bd.hra) : '—'}
                          </td>

                          {/* Conveyance */}
                          <td
                            style={{
                              padding: '10px 12px',
                              textAlign: 'right',
                              whiteSpace: 'nowrap',
                              color: earnColor,
                              fontWeight: 600,
                              background: `color-mix(in oklch, ${T.successBg} 12%, transparent)`,
                            }}
                          >
                            {bd ? fmtVal(bd.conveyance) : '—'}
                          </td>

                          {/* Medical Allowance */}
                          <td
                            style={{
                              padding: '10px 12px',
                              textAlign: 'right',
                              whiteSpace: 'nowrap',
                              color: earnColor,
                              fontWeight: 600,
                              background: `color-mix(in oklch, ${T.successBg} 12%, transparent)`,
                            }}
                          >
                            {bd ? fmtVal(bd.medicalAllowance) : '—'}
                          </td>

                          {/* Special Allowance */}
                          <td
                            style={{
                              padding: '10px 12px',
                              textAlign: 'right',
                              whiteSpace: 'nowrap',
                              color: earnColor,
                              fontWeight: 600,
                              background: `color-mix(in oklch, ${T.successBg} 12%, transparent)`,
                            }}
                          >
                            {bd ? fmtVal(bd.specialAllowance) : '—'}
                          </td>
                          {/* OT Pay */}
                          <td
                            style={{
                              padding: '10px 12px',
                              textAlign: 'right',
                              whiteSpace: 'nowrap',
                              color: emp.payslip?.otPay ? T.danger : T.mutedFg,
                              fontWeight: 600,
                              background: `color-mix(in oklch, ${T.successBg} 12%, transparent)`,
                            }}
                          >
                            {emp.payslip?.otPay ? fmt(emp.payslip.otPay) : '—'}
                          </td>
                          {/* Weekend Pay */}
                          <td
                            style={{
                              padding: '10px 12px',
                              textAlign: 'right',
                              whiteSpace: 'nowrap',
                              color: emp.payslip?.weekendPay ? T.info : T.mutedFg,
                              fontWeight: 600,
                              background: `color-mix(in oklch, ${T.successBg} 12%, transparent)`,
                            }}
                          >
                            {emp.payslip?.weekendPay ? fmt(emp.payslip.weekendPay) : '—'}
                          </td>
                          {/* Holiday Pay */}
                          <td
                            style={{
                              padding: '10px 12px',
                              textAlign: 'right',
                              whiteSpace: 'nowrap',
                              color: emp.payslip?.holidayPay ? T.warning : T.mutedFg,
                              fontWeight: 600,
                              background: `color-mix(in oklch, ${T.successBg} 12%, transparent)`,
                              borderRight: `1px solid ${T.border}`,
                            }}
                          >
                            {emp.payslip?.holidayPay ? fmt(emp.payslip.holidayPay) : '—'}
                          </td>

                          {/* Emp'ee PF */}
                          <td
                            style={{
                              padding: '10px 12px',
                              textAlign: 'right',
                              whiteSpace: 'nowrap',
                              color: dedColor,
                              fontWeight: 600,
                              background: `color-mix(in oklch, ${T.dangerBg} 12%, transparent)`,
                            }}
                          >
                            {bd ? fmtVal(bd.empPF) : '—'}
                          </td>

                          {/* Emp'er PF */}
                          <td
                            style={{
                              padding: '10px 12px',
                              textAlign: 'right',
                              whiteSpace: 'nowrap',
                              color: dedColor,
                              fontWeight: 600,
                              background: `color-mix(in oklch, ${T.dangerBg} 12%, transparent)`,
                            }}
                          >
                            {bd ? fmtVal(bd.erPF) : '—'}
                          </td>

                          {/* Emp'ee ESIC */}
                          <td
                            style={{
                              padding: '10px 12px',
                              textAlign: 'right',
                              whiteSpace: 'nowrap',
                              color: dedColor,
                              fontWeight: 600,
                              background: `color-mix(in oklch, ${T.dangerBg} 12%, transparent)`,
                            }}
                          >
                            {bd ? fmtVal(bd.empESIC) : '—'}
                          </td>

                          {/* Emp'er ESIC */}
                          <td
                            style={{
                              padding: '10px 12px',
                              textAlign: 'right',
                              whiteSpace: 'nowrap',
                              color: dedColor,
                              fontWeight: 600,
                              background: `color-mix(in oklch, ${T.dangerBg} 12%, transparent)`,
                            }}
                          >
                            {bd ? fmtVal(bd.erESIC) : '—'}
                          </td>

                          {/* Loan Deduct. */}
                          {(() => {
                            const loanTotal = (emp.payslip?.deductionBreakdown ?? [])
                              .filter((d) => d.id.startsWith('loan_'))
                              .reduce((s, d) => s + d.amount, 0);
                            return (
                              <td
                                style={{
                                  padding: '10px 12px',
                                  textAlign: 'right',
                                  whiteSpace: 'nowrap',
                                  color: loanTotal > 0 ? T.danger : T.mutedFg,
                                  fontWeight: loanTotal > 0 ? 700 : 400,
                                  background: `color-mix(in oklch, ${T.dangerBg} 12%, transparent)`,
                                  borderRight: `1px solid ${T.border}`,
                                }}
                              >
                                {loanTotal > 0
                                  ? `−${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(loanTotal)}`
                                  : '—'}
                              </td>
                            );
                          })()}

                          {/* Monthly CTC */}
                          <td
                            style={{
                              padding: '10px 12px',
                              textAlign: 'right',
                              whiteSpace: 'nowrap',
                              fontWeight: 600,
                              color: emp.monthlySalary > 0 ? T.primary : T.mutedFg,
                              background: `color-mix(in oklch, ${T.successBg} 8%, transparent)`,
                            }}
                          >
                            {emp.monthlySalary > 0 ? fmt(emp.monthlySalary) : '—'}
                          </td>

                          {/* Net Pay */}
                          <td
                            style={{
                              padding: '10px 12px',
                              textAlign: 'right',
                              whiteSpace: 'nowrap',
                              fontWeight: 700,
                              color:
                                netPay !== null
                                  ? T.success
                                  : bd?.grossEarnings
                                    ? `color-mix(in oklch, ${T.success} 50%, ${T.mutedFg})`
                                    : T.mutedFg,
                              background: `color-mix(in oklch, ${T.successBg} 8%, transparent)`,
                            }}
                          >
                            {netPay !== null
                              ? fmt(netPay)
                              : bd?.grossEarnings
                                ? `~${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(bd.grossEarnings - bd.empPF - bd.empESIC)}`
                                : '—'}
                          </td>

                          {/* Payslip Status */}
                          <td
                            style={{
                              padding: '10px 12px',
                              background: `color-mix(in oklch, ${T.successBg} 8%, transparent)`,
                              borderRight: `1px solid ${T.border}`,
                            }}
                          >
                            <PayslipBadge
                              status={emp.payslip?.status ?? null}
                              paidDate={emp.payslip?.paidDate}
                            />
                          </td>

                          {/* Hold Status */}
                          <td
                            style={{
                              padding: '10px 12px',
                              background: emp.salaryOnHold
                                ? `color-mix(in oklch, ${T.warningBg} 40%, transparent)`
                                : `color-mix(in oklch, ${T.warningBg} 10%, transparent)`,
                            }}
                          >
                            {emp.salaryOnHold ? (
                              <div>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    fontSize: 11,
                                    fontWeight: 600,
                                    padding: '2px 7px',
                                    borderRadius: 5,
                                    background: T.warningBg,
                                    color: T.warning,
                                    border: `1px solid ${T.warning}40`,
                                  }}
                                >
                                  <IconLock size={10} /> On Hold
                                </span>
                                {emp.salaryHoldReason && (
                                  <p
                                    style={{
                                      fontSize: 10,
                                      color: T.mutedFg,
                                      margin: '2px 0 0',
                                      maxWidth: 120,
                                      whiteSpace: 'normal',
                                    }}
                                  >
                                    {emp.salaryHoldReason}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span style={{ fontSize: 11, color: T.success, fontWeight: 600 }}>
                                Active
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Single hold modal */}
          {holdTarget && (
            <HoldModal
              emp={holdTarget}
              onClose={() => setHoldTarget(null)}
              onConfirm={handleHold}
              loading={holdMutation.isPending}
            />
          )}

          {/* Bulk hold modal */}
          {bulkHoldOpen && (
            <BulkHoldModal
              count={canBulkHold}
              onClose={() => setBulkHoldOpen(false)}
              onConfirm={handleBulkHold}
              loading={bulkLoading}
            />
          )}

          {/* Edit Salary Structure modal */}
          {editStructOpen && (
            <EditStructureModal
              existing={displayStruct}
              onClose={() => setEditStructOpen(false)}
              onSaved={(s) => setLiveStruct(s)}
            />
          )}

          {/* Employee-specific Salary Structure modal */}
          {structureTarget && (
            <EmployeeStructureModal
              employeeId={structureTarget.employeeId}
              employeeName={structureTarget.name}
              tenant={structureTarget.tenant}
              onClose={() => setStructureTarget(null)}
            />
          )}
        </div>
      )}
      {activeTab === 'all-transactions' && <AllTransactionsTab />}
      {activeTab === 'pay-policy' && <MainPayPolicy />}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
