'use client';

import {
  AlertCircle,
  CheckCircle2,
  Circle,
  ClipboardList,
  FileText,
  Loader2,
  LogOut,
  Plus,
  Search,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ModalPortal } from '../../_shared/components';
import { resolveActAsTenant } from '@/features/organization/utils/actAsTenant';
import { useAppSelector } from '@/store/hook';
import { selectUser } from '@/store/slice/userAccountData';
import type { LeavingEmployee, ProcessExitPayload } from '../server/api/afterLeavingApi';
import {
  useActiveEmployees,
  useDeactivateUserAccount,
  useLeavingEmployees,
  useProcessExit,
  useRecordResignation,
  useSettleLoan,
} from '../server/tanstackQuery/useAfterLeavingQueries';

// ── Constants ────────────────────────────────────────────────────────────────

const ASSET_ITEMS = [
  { key: 'laptop', label: 'Laptop' },
  { key: 'mobile', label: 'Mobile Phone' },
  { key: 'sim', label: 'SIM Card' },
  { key: 'id_card', label: 'ID Card' },
  { key: 'access_card', label: 'Access Card' },
  { key: 'locker_key', label: 'Locker Key' },
  { key: 'parking_card', label: 'Parking Card' },
  { key: 'charger', label: 'Charger' },
  { key: 'documents', label: 'Documents' },
  { key: 'uniform', label: 'Uniform' },
  { key: 'credit_card', label: 'Credit Card' },
  { key: 'other', label: 'Other' },
] as const;

const STATUS_LABEL: Record<string, string> = {
  on_notice: 'On Notice',
  exit_interview: 'Exit Interview',
  left: 'Left',
  completed: 'Completed',
};

const STATUS_CLASS: Record<string, string> = {
  on_notice: 'bg-warning/10 text-warning border-warning/30',
  exit_interview: 'bg-primary/10 text-primary border-primary/30',
  left: 'bg-destructive/10 text-destructive border-destructive/30',
  completed: 'bg-success/10 text-success border-success/30',
};

const EXIT_STATUSES = ['on_notice', 'exit_interview', 'left', 'completed'];

const LEAVING_REASONS = [
  'Better Opportunity',
  'Personal Reasons',
  'Relocation',
  'Health Issues',
  'Higher Education',
  'Starting Own Business',
  'Work-Life Balance',
  'Other',
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0]?.slice(0, 2) ?? '??').toUpperCase();
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
};

const fmt = (iso: string | null | undefined) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const fmtDt = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
};

function DelayBadge({ delayMinutes }: { delayMinutes: number | null | undefined }) {
  if (delayMinutes == null) return <span className="text-[11px] text-muted-foreground">—</span>;
  if (delayMinutes === 0) {
    return (
      <span className="inline-flex items-center rounded-full border border-success/30 bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">
        On time
      </span>
    );
  }
  const d = Math.floor(delayMinutes / 1440);
  const h = Math.floor((delayMinutes % 1440) / 60);
  const m = delayMinutes % 60;
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || parts.length === 0) parts.push(`${m}m`);
  return (
    <span
      className="inline-flex items-center whitespace-nowrap rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive"
      title={`Processed ${parts.join(' ')} late vs planned`}
    >
      +{parts.join(' ')}
    </span>
  );
}

const assetProgress = (emp: LeavingEmployee) => {
  const saved = emp.exitChecklist;
  if (!saved || Object.keys(saved).length === 0) return { returned: 0, total: ASSET_ITEMS.length };
  // Count tracked assets (exclude _label keys)
  const tracked = Object.keys(saved).filter((k) => !k.endsWith('_label'));
  const returned = tracked.filter((k) => saved[k] === true).length;
  return { returned, total: tracked.length };
};

// ── Resign Form Modal ─────────────────────────────────────────────────────────

interface ResignFormProps {
  leavingIds: Set<number>;
  onClose: () => void;
}

const ResignFormModal: React.FC<ResignFormProps> = ({ leavingIds, onClose }) => {
  const user = useAppSelector(selectUser);
  const { data: activeEmployees = [], isLoading: loadingEmps } = useActiveEmployees();
  const { mutate: submit, isPending } = useRecordResignation();

  const [form, setForm] = useState({
    employeeId: '',
    resignationDate: '',
    lastWorkingDay: '',
    leavingReason: '',
    otherReason: '',
  });

  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  // Exclude employees already in the leaving workflow
  const eligibleEmployees = activeEmployees.filter((e) => !leavingIds.has(e.id));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employeeId || !form.resignationDate || !form.lastWorkingDay) {
      toast.error('Employee, Resignation Date and Last Working Day are required');
      return;
    }
    const finalReason =
      form.leavingReason === 'Other'
        ? form.otherReason.trim() || 'Other'
        : form.leavingReason || undefined;
    const selectedEmployee = eligibleEmployees.find((e) => String(e.id) === form.employeeId);

    submit(
      {
        payload: {
          employeeId: parseInt(form.employeeId, 10),
          resignationDate: form.resignationDate,
          lastWorkingDay: form.lastWorkingDay,
          leavingReason: finalReason,
        },
        actAsTenantId: resolveActAsTenant(selectedEmployee?.tenant, user?.tenantId),
      },
      {
        onSuccess: () => {
          toast.success('Resignation recorded');
          onClose();
        },
        onError: (err) => {
          const msg = (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message;
          toast.error(msg ?? 'Failed to record resignation');
        },
      }
    );
  };

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-[15px] font-semibold">Record Resignation</h2>
            <p className="text-[12px] text-muted-foreground">Mark an employee as resigning</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted text-[16px]"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {/* Employee */}
          <div className="space-y-1.5">
            <label htmlFor="resign-emp" className="text-[12px] font-medium">
              Employee <span className="text-destructive">*</span>
            </label>
            <select
              id="resign-emp"
              value={form.employeeId}
              onChange={(e) => set('employeeId', e.target.value)}
              required
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">— Select employee —</option>
              {loadingEmps && <option disabled>Loading…</option>}
              {eligibleEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                  {emp.designation ? ` · ${emp.designation}` : ''}
                </option>
              ))}
            </select>
            {!loadingEmps && eligibleEmployees.length === 0 && (
              <p className="text-[11px] text-muted-foreground">
                No eligible active employees found.
              </p>
            )}
          </div>

          {/* Resignation date */}
          <div className="space-y-1.5">
            <label htmlFor="resign-date" className="text-[12px] font-medium">
              Resignation Date <span className="text-destructive">*</span>
            </label>
            <input
              id="resign-date"
              type="date"
              value={form.resignationDate}
              onChange={(e) => set('resignationDate', e.target.value)}
              required
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Last working day */}
          <div className="space-y-1.5">
            <label htmlFor="resign-lwd" className="text-[12px] font-medium">
              Last Working Day <span className="text-destructive">*</span>
            </label>
            <input
              id="resign-lwd"
              type="date"
              value={form.lastWorkingDay}
              onChange={(e) => set('lastWorkingDay', e.target.value)}
              required
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <label htmlFor="resign-reason" className="text-[12px] font-medium">
              Reason for Leaving
            </label>
            <select
              id="resign-reason"
              value={form.leavingReason}
              onChange={(e) => set('leavingReason', e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">— Optional —</option>
              {LEAVING_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Other reason text box */}
          {form.leavingReason === 'Other' && (
            <div className="space-y-1.5">
              <label htmlFor="resign-other" className="text-[12px] font-medium">
                Please specify
              </label>
              <textarea
                id="resign-other"
                rows={3}
                placeholder="Describe the reason…"
                value={form.otherReason}
                onChange={(e) => set('otherReason', e.target.value)}
                className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Record Resignation'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  </ModalPortal>
);
};

// ── Process Exit Modal ────────────────────────────────────────────────────────

interface ProcessExitProps {
  emp: LeavingEmployee;
  onClose: () => void;
}

interface DynAsset {
  key: string;
  label: string;
  checked: boolean;
}

const buildInitialAssets = (emp: LeavingEmployee): DynAsset[] => {
  const saved = emp.exitChecklist;
  if (saved && Object.keys(saved).length > 0) {
    // Reconstruct from saved: default items present in saved + custom_ items
    const defaults: DynAsset[] = ASSET_ITEMS.filter(({ key }) => key in saved).map(
      ({ key, label }) => ({ key, label, checked: saved[key] === true })
    );
    const customs: DynAsset[] = Object.keys(saved)
      .filter((k) => k.startsWith('custom_') && !k.endsWith('_label'))
      .map((key) => ({
        key,
        label: typeof saved[`${key}_label`] === 'string' ? (saved[`${key}_label`] as string) : key,
        checked: saved[key] === true,
      }));
    return [...defaults, ...customs];
  }
  return ASSET_ITEMS.map(({ key, label }) => ({ key, label, checked: false }));
};

const ProcessExitModal: React.FC<ProcessExitProps> = ({ emp, onClose }) => {
  const user = useAppSelector(selectUser);
  const actAsTenantId = resolveActAsTenant(emp.tenant, user?.tenantId);
  const { mutate: save, isPending } = useProcessExit();
  const { mutate: deactivate, isPending: deactivating } = useDeactivateUserAccount();
  const { mutate: settle, isPending: settling } = useSettleLoan();

  // Track loans settled within this modal session (optimistic local state)
  const [settledLoanIds, setSettledLoanIds] = useState<Set<string>>(new Set());

  // Compute loan summary, excluding loans settled this session
  const loanSummary = useMemo(() => {
    const loans = (emp.loans ?? []).filter((l) => !settledLoanIds.has(l.id));
    const totalDisbursed = loans.reduce((s, l) => s + l.amount, 0);
    const totalOutstanding = loans.reduce((s, l) => s + l.outstandingBalance, 0);
    return {
      loans,
      hasLoans: (emp.loans ?? []).length > 0,
      totalDisbursed,
      totalOutstanding,
      totalCollected: totalDisbursed - totalOutstanding,
      isFullySettled: loans.length === 0 || totalOutstanding === 0,
    };
  }, [emp.loans, settledLoanIds]);

  // Track current user account active state locally (may change after deactivate)
  const [userIsActive, setUserIsActive] = useState(emp.userAccount?.isActive ?? null);

  const [status, setStatus] = useState(emp.status);
  const [assets, setAssets] = useState<DynAsset[]>(() => buildInitialAssets(emp));
  const [newAssetLabel, setNewAssetLabel] = useState('');
  const [expLetter, setExpLetter] = useState(Boolean(emp.experienceLetterIssued));

  const toggleAsset = (key: string) =>
    setAssets((prev) => prev.map((a) => (a.key === key ? { ...a, checked: !a.checked } : a)));

  const removeAsset = (key: string) => setAssets((prev) => prev.filter((a) => a.key !== key));

  const addCustomAsset = () => {
    const label = newAssetLabel.trim();
    if (!label) return;
    const key = `custom_${Date.now()}`;
    setAssets((prev) => [...prev, { key, label, checked: false }]);
    setNewAssetLabel('');
  };

  const assetsReturned = assets.filter((a) => a.checked).length;

  const advanceBlocksSave =
    (status === 'left' || status === 'completed') &&
    loanSummary.hasLoans &&
    !loanSummary.isFullySettled;

  // processExit already deactivates the linked login account server-side the
  // moment status lands on 'left'/'completed' — this just makes sure the
  // admin isn't surprised by that happening silently.
  const willAutoDeactivate = (status === 'left' || status === 'completed') && userIsActive === true;

  const [confirmingDeactivate, setConfirmingDeactivate] = useState(false);

  const handleSave = () => {
    if (advanceBlocksSave) {
      toast.error(
        `Cannot mark as "${STATUS_LABEL[status]}" — ₹${loanSummary.totalOutstanding.toLocaleString('en-IN')} advance is still outstanding`
      );
      return;
    }

    if (willAutoDeactivate && !confirmingDeactivate) {
      setConfirmingDeactivate(true);
      return;
    }

    const exitChecklist: Record<string, unknown> = {};
    assets.forEach(({ key, label, checked }) => {
      exitChecklist[key] = checked;
      if (key.startsWith('custom_')) exitChecklist[`${key}_label`] = label;
    });

    const payload: ProcessExitPayload = {
      status,
      exitChecklist,
      experienceLetterIssued: expLetter,
    };
    save(
      { id: emp.id, payload, actAsTenantId },
      {
        onSuccess: () => {
          toast.success('Exit processed');
          onClose();
        },
        onError: (err) => {
          const msg = (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message;
          toast.error(msg ?? 'Failed to process exit');
        },
      }
    );
  };

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground">
              {initials(emp.name)}
            </div>
            <div>
              <p className="text-[14px] font-semibold">{emp.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {emp.designation ?? '—'} · {emp.department?.name ?? '—'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted text-[16px]"
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 divide-y divide-border">
          {/* Section 1: Exit Status */}
          <div className="px-6 py-5 space-y-3">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
              Exit Status
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {EXIT_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`rounded-xl border px-3 py-2 text-[12px] font-medium transition-colors ${
                    status === s
                      ? (STATUS_CLASS[s] ?? 'bg-primary/10 text-primary border-primary/30')
                      : 'border-border bg-background text-muted-foreground hover:bg-muted/40'
                  }`}
                >
                  {STATUS_LABEL[s] ?? s}
                </button>
              ))}
            </div>
            {advanceBlocksSave && (
              <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                <p className="text-[12px] text-destructive">
                  Cannot save as &quot;{STATUS_LABEL[status]}&quot; — ₹
                  {loanSummary.totalOutstanding.toLocaleString('en-IN')} advance is still
                  outstanding. Clear the balance first.
                </p>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground">
              {emp.separationType && (
                <span
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
                    emp.separationType === 'fired'
                      ? 'border-destructive/30 bg-destructive/10 text-destructive'
                      : 'border-warning/30 bg-warning/10 text-warning'
                  }`}
                >
                  {emp.separationType === 'fired' ? '🔴 Fired' : '🟡 Resigned'}
                </span>
              )}
              {emp.separationType === 'fired' && emp.terminationDate && (
                <span>
                  Terminated:{' '}
                  <span className="font-medium text-foreground">{fmt(emp.terminationDate)}</span>
                </span>
              )}
              {emp.separationType === 'resigned' && emp.resignationDate && (
                <span>
                  Resigned:{' '}
                  <span className="font-medium text-foreground">{fmt(emp.resignationDate)}</span>
                </span>
              )}
              <span>
                Last Day:{' '}
                <span className="font-medium text-foreground">{fmt(emp.lastWorkingDay)}</span>
              </span>
              {emp.leavingReason && (
                <span>
                  Reason: <span className="font-medium text-foreground">{emp.leavingReason}</span>
                </span>
              )}
            </div>
          </div>

          {/* Section 2: Asset Return */}
          <div className="px-6 py-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                Asset Return
              </p>
              <span
                className={`text-[12px] font-semibold ${assetsReturned === assets.length ? 'text-success' : 'text-warning'}`}
              >
                {assetsReturned}/{assets.length} returned
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {assets.map((asset) => (
                <div
                  key={asset.key}
                  className={`group relative flex items-center gap-2 rounded-xl border px-3 py-2.5 text-[13px] transition-colors ${
                    asset.checked
                      ? 'border-success/40 bg-success/10 text-success'
                      : 'border-border bg-background text-foreground'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleAsset(asset.key)}
                    className="flex flex-1 items-center gap-2 text-left"
                  >
                    {asset.checked ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate">{asset.label}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeAsset(asset.key)}
                    title="Remove this asset"
                    className="ml-auto shrink-0 rounded p-0.5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add custom asset */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add custom asset…"
                value={newAssetLabel}
                onChange={(e) => setNewAssetLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomAsset();
                  }
                }}
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addCustomAsset}
                disabled={!newAssetLabel.trim()}
                className="gap-1 shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </div>
          </div>

          {/* Section 3: Advance Payment */}
          <div className="px-6 py-5 space-y-3">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
              Advance Payment
            </p>

            {!loanSummary.hasLoans ? (
              <p className="text-[13px] text-muted-foreground">
                No active advance loans on record for this employee.
              </p>
            ) : (
              <div className="space-y-2">
                {/* Summary row */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl border border-border bg-background px-2 py-2.5">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Total Disbursed</p>
                    <p className="text-[13px] font-bold tabular-nums">
                      ₹{loanSummary.totalDisbursed.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="rounded-xl border border-success/40 bg-background px-2 py-2.5">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Recovered</p>
                    <p className="text-[13px] font-bold tabular-nums text-success">
                      ₹{loanSummary.totalCollected.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div
                    className={`rounded-xl border bg-background px-2 py-2.5 ${loanSummary.isFullySettled ? 'border-success/40' : 'border-warning/40'}`}
                  >
                    <p className="text-[10px] text-muted-foreground mb-0.5">Outstanding</p>
                    <p
                      className={`text-[13px] font-bold tabular-nums ${loanSummary.isFullySettled ? 'text-success' : 'text-warning'}`}
                    >
                      ₹{loanSummary.totalOutstanding.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                {/* Per-loan cards */}
                <div className="space-y-2 pt-1">
                  {/* Settled-in-session loans (greyed out) */}
                  {(emp.loans ?? [])
                    .filter((l) => settledLoanIds.has(l.id))
                    .map((loan) => (
                      <div
                        key={loan.id}
                        className="flex items-center justify-between rounded-xl border border-success/30 bg-success/5 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-success truncate">
                            {loan.purpose ?? 'Advance Loan'}
                          </p>
                          <p className="text-[11px] text-success/70">
                            ₹{loan.amount.toLocaleString('en-IN')} — fully recovered
                          </p>
                        </div>
                        <span className="text-[11px] font-semibold text-success shrink-0 ml-3">
                          ✓ Paid
                        </span>
                      </div>
                    ))}

                  {/* Active loans */}
                  {loanSummary.loans.map((loan) => (
                    <div
                      key={loan.id}
                      className="flex items-center justify-between rounded-xl border border-warning/30 bg-warning/5 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium truncate">
                          {loan.purpose ?? 'Advance Loan'}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          ₹{loan.outstandingBalance.toLocaleString('en-IN')} outstanding of ₹
                          {loan.amount.toLocaleString('en-IN')}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={settling}
                        onClick={() => {
                          settle(
                            { loanId: loan.id, actAsTenantId },
                            {
                              onSuccess: () => {
                                setSettledLoanIds((prev) => new Set([...prev, loan.id]));
                                toast.success('Loan marked as paid');
                              },
                              onError: () => toast.error('Failed to mark loan as paid'),
                            }
                          );
                        }}
                        className="shrink-0 ml-3 text-[11px] border-warning/40 text-warning hover:bg-warning/10"
                      >
                        {settling ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Mark Paid'}
                      </Button>
                    </div>
                  ))}
                </div>

                {loanSummary.isFullySettled ? (
                  <p className="text-[12px] font-medium text-success flex items-center gap-1.5 pt-1">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    All advance payments have been recovered — employee is clear
                  </p>
                ) : (
                  <p className="text-[12px] font-medium text-warning flex items-center gap-1.5 pt-1">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />₹
                    {loanSummary.totalOutstanding.toLocaleString('en-IN')} must be paid before
                    marking as &quot;Left&quot; or &quot;Completed&quot;
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Section 4: Documents */}
          <div className="px-6 py-5 space-y-3">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
              Documents
            </p>
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={expLetter}
                onChange={(e) => setExpLetter(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              <span className="text-[13px]">
                Experience letter to be issued to employee
                {expLetter && (
                  <span className="ml-2 text-[11px] font-medium text-success">
                    ✓ Will be issued
                  </span>
                )}
              </span>
            </label>
          </div>

          {/* Section 5: User Account */}
          <div className="px-6 py-5 space-y-3">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
              System Access
            </p>
            {emp.userAccount === null ? (
              <p className="text-[13px] text-muted-foreground">
                No linked system account found for{' '}
                <span className="font-medium text-foreground">{emp.email ?? 'this employee'}</span>.
                They cannot log in.
              </p>
            ) : (
              <div className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
                <div>
                  <p className="text-[13px] font-medium">
                    {emp.email}
                    <span
                      className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        userIsActive
                          ? 'bg-success/10 text-success'
                          : 'bg-destructive/10 text-destructive'
                      }`}
                    >
                      {userIsActive ? 'Account Active' : 'Account Deactivated'}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {userIsActive
                      ? 'Employee can still log in to the system'
                      : 'Login access has been revoked'}
                  </p>
                </div>
                {userIsActive ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={deactivating}
                    onClick={() => {
                      deactivate(
                        { id: emp.id, actAsTenantId },
                        {
                          onSuccess: () => {
                            setUserIsActive(false);
                            toast.success('Account deactivated — employee can no longer log in');
                          },
                          onError: () => toast.error('Failed to deactivate account'),
                        }
                      );
                    }}
                  >
                    {deactivating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      'Deactivate Account'
                    )}
                  </Button>
                ) : (
                  <span className="text-[11px] text-success font-medium">✓ Access revoked</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-6 py-4 shrink-0">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span>
              {assetsReturned}/{assets.length} assets
            </span>
            {loanSummary.hasLoans && (
              <span className={loanSummary.isFullySettled ? 'text-success' : 'text-warning'}>
                {loanSummary.isFullySettled
                  ? 'Advance settled'
                  : `₹${loanSummary.totalOutstanding.toLocaleString('en-IN')} outstanding`}
              </span>
            )}
            {expLetter && <span className="text-primary">Exp. letter ✓</span>}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isPending || advanceBlocksSave}
              onClick={handleSave}
              title={
                advanceBlocksSave
                  ? `Outstanding advance of ₹${loanSummary.totalOutstanding.toLocaleString('en-IN')} must be cleared first`
                  : undefined
              }
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save & Approve'}
            </Button>
          </div>
        </div>
      </div>

      {confirmingDeactivate && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <h3 className="text-[14px] font-bold text-foreground">Deactivate login account?</h3>
            <p className="mt-2 text-[12px] text-muted-foreground">
              Marking {emp.name} as &quot;{STATUS_LABEL[status]}&quot; will automatically deactivate
              their login account, since it isn&apos;t deactivated yet. Any of their still-pending
              tasks will be flagged for reassignment. This can be reversed later by reactivating the
              account.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setConfirmingDeactivate(false)}
              >
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={handleSave}>
                Save & Deactivate
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  </ModalPortal>
);
};

// ── Main Component ────────────────────────────────────────────────────────────

export const MainAfterLeavingWork = () => {
  const { data: employees = [], isLoading, isError, refetch } = useLeavingEmployees();
  const [showResignForm, setShowResignForm] = useState(false);
  const [processEmp, setProcessEmp] = useState<LeavingEmployee | null>(null);
  const [searchName, setSearchName] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  const departments = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const emp of employees) {
      const name = emp.department?.name;
      if (name && !seen.has(name)) {
        seen.add(name);
        list.push(name);
      }
    }
    return list.sort();
  }, [employees]);

  const filtered = useMemo(() => {
    const term = searchName.toLowerCase().trim();
    return employees.filter((emp) => {
      const matchName = !term || emp.name.toLowerCase().includes(term);
      const matchStatus = !statusFilter || emp.status === statusFilter;
      const matchDept = !deptFilter || emp.department?.name === deptFilter;
      return matchName && matchStatus && matchDept;
    });
  }, [employees, searchName, statusFilter, deptFilter]);

  const hasFilters = searchName || statusFilter || deptFilter;

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
          <AlertCircle className="h-7 w-7 text-destructive" />
          <p className="text-[13px] font-semibold text-destructive">Failed to load</p>
          <Button type="button" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const completed = employees.filter((e) => e.status === 'completed').length;
  const onNotice = employees.filter((e) => e.status === 'on_notice').length;
  const exitInterview = employees.filter((e) => e.status === 'exit_interview').length;

  return (
    <div className="bg-background text-foreground grow">
      <main className="mx-auto max-w-350 space-y-6 px-4 pt-6 pb-10 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card px-5 py-4 shadow-xs sm:flex-row sm:items-center sm:px-6 sm:py-5">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[11px] bg-primary/12 text-primary">
              <LogOut className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-[17px] font-bold leading-tight tracking-[-0.02em] sm:text-[20px]">
                After Leaving Work
              </h1>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                Manage asset returns, advance payments, and exit formalities
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => setShowResignForm(true)}
            className="w-full gap-2 sm:w-auto sm:shrink-0"
          >
            <Plus className="h-4 w-4" />
            Record Resignation
          </Button>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            {
              label: 'Total Leaving',
              value: employees.length,
              icon: <UserCheck className="h-4 w-4" />,
              color: 'text-primary bg-primary/10',
            },
            {
              label: 'On Notice',
              value: onNotice,
              icon: <ClipboardList className="h-4 w-4" />,
              color: 'text-warning bg-warning/10',
            },
            {
              label: 'Exit Interview',
              value: exitInterview,
              icon: <FileText className="h-4 w-4" />,
              color: 'text-blue-500 bg-blue-500/10',
            },
            {
              label: 'Completed',
              value: completed,
              icon: <CheckCircle2 className="h-4 w-4" />,
              color: 'text-success bg-success/10',
            },
          ].map((k) => (
            <div key={k.label} className="rounded-2xl border border-border bg-card p-4 shadow-xs">
              <div className={`mb-2 inline-flex rounded-xl p-2 ${k.color}`}>{k.icon}</div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {k.label}
              </p>
              <p className="text-2xl font-bold tabular-nums">{k.value}</p>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="rounded-2xl border border-border bg-card px-5 py-4 shadow-xs">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by employee name…"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 cursor-pointer rounded-xl border border-border bg-background px-3 pr-8 text-[13px] text-foreground outline-none transition-colors focus:border-primary sm:min-w-40"
            >
              <option value="">All Statuses</option>
              {EXIT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s] ?? s}
                </option>
              ))}
            </select>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="h-10 cursor-pointer rounded-xl border border-border bg-background px-3 pr-8 text-[13px] text-foreground outline-none transition-colors focus:border-primary sm:min-w-40"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearchName('');
                  setStatusFilter('');
                  setDeptFilter('');
                }}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border bg-muted px-3 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted-foreground/10 whitespace-nowrap"
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-border bg-card shadow-xs">
          <div className="border-b border-border px-5 py-4 flex items-center justify-between rounded-t-2xl overflow-hidden">
            <h2 className="text-[14px] font-semibold">Departure Records</h2>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
              {hasFilters ? `${filtered.length} of ${employees.length}` : `${employees.length}`}{' '}
              record{employees.length !== 1 ? 's' : ''}
            </span>
          </div>

          {employees.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <CheckCircle2 className="h-8 w-8 text-success" />
              <p className="text-[14px] font-semibold">No departing employees</p>
              <p className="text-[12px] text-muted-foreground">
                Use the button above to record a resignation.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <Search className="h-8 w-8 text-muted-foreground" />
              <p className="text-[14px] font-semibold">No records match your filters</p>
              <p className="text-[12px] text-muted-foreground">
                Try adjusting the search or filters above.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-b-2xl">
              <table className="w-full min-w-[1100px] text-[13px]">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Action
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Employee
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Department
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Status
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Separation
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Last Day
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Assets
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Advance
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Exp. Letter
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Reason
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Planned At
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Processed At
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Delay
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((emp) => {
                    const { returned, total } = assetProgress(emp);
                    const allAssets = returned === total;
                    return (
                      <tr key={emp.id} className="transition-colors hover:bg-muted/30">
                        {/* Action */}
                        <td className="whitespace-nowrap px-4 py-3">
                          <Button
                            type="button"
                            size="sm"
                            variant={emp.status === 'completed' ? 'outline' : 'default'}
                            onClick={() => setProcessEmp(emp)}
                            className="whitespace-nowrap text-[11px]"
                          >
                            {emp.status === 'completed' ? 'View / Edit' : 'Process Exit'}
                          </Button>
                        </td>

                        {/* Employee */}
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                              {initials(emp.name)}
                            </div>
                            <div>
                              <p className="font-semibold leading-tight">{emp.name}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {emp.designation ?? '—'}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Department */}
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {emp.department?.name ?? '—'}
                        </td>

                        {/* Status */}
                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase ${STATUS_CLASS[emp.status] ?? 'border-border bg-muted text-muted-foreground'}`}
                          >
                            {STATUS_LABEL[emp.status] ?? emp.status}
                          </span>
                        </td>

                        {/* Separation */}
                        <td className="whitespace-nowrap px-4 py-3">
                          {emp.separationType ? (
                            <div className="flex flex-col gap-0.5">
                              <span
                                className={`inline-flex w-fit rounded border px-1.5 py-0.5 text-[10px] font-semibold ${
                                  emp.separationType === 'fired'
                                    ? 'border-destructive/30 bg-destructive/10 text-destructive'
                                    : 'border-warning/30 bg-warning/10 text-warning'
                                }`}
                              >
                                {emp.separationType === 'fired' ? 'Fired' : 'Resigned'}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                {emp.separationType === 'fired'
                                  ? fmt(emp.terminationDate)
                                  : fmt(emp.resignationDate)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>

                        {/* Last Day */}
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {fmt(emp.lastWorkingDay)}
                        </td>

                        {/* Assets */}
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                              <div
                                className={`h-full rounded-full ${allAssets ? 'bg-success' : 'bg-primary'}`}
                                style={{ width: `${(returned / total) * 100}%` }}
                              />
                            </div>
                            <span
                              className={`text-[11px] font-medium ${allAssets ? 'text-success' : 'text-muted-foreground'}`}
                            >
                              {returned}/{total}
                            </span>
                          </div>
                        </td>

                        {/* Advance */}
                        <td className="whitespace-nowrap px-4 py-3">
                          {!emp.advancePaymentTaken ? (
                            <span className="text-[11px] text-muted-foreground">N/A</span>
                          ) : emp.advancePaymentSettled ? (
                            <span className="text-[11px] font-medium text-success">Settled</span>
                          ) : (
                            <span className="text-[11px] font-medium text-warning">
                              Pending
                              {emp.advancePaymentAmount
                                ? ` ₹${emp.advancePaymentAmount.toLocaleString('en-IN')}`
                                : ''}
                            </span>
                          )}
                        </td>

                        {/* Exp. Letter */}
                        <td className="whitespace-nowrap px-4 py-3">
                          {emp.experienceLetterIssued ? (
                            <span className="text-[11px] font-medium text-success">✓ Yes</span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">—</span>
                          )}
                        </td>

                        {/* Reason */}
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {emp.leavingReason ?? '—'}
                        </td>

                        {/* Planned At */}
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {emp.exitProcessedAt ? (
                            fmtDt(emp.exitTatPlannedAt)
                          ) : emp.yourProjectedExitPlannedAt ? (
                            <>
                              {fmtDt(emp.yourProjectedExitPlannedAt)}
                              <span className="ml-1 text-[10px] text-muted-foreground/70">
                                (estimate)
                              </span>
                            </>
                          ) : (
                            '—'
                          )}
                        </td>

                        {/* Processed At */}
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {fmtDt(emp.exitProcessedAt)}
                          {emp.exitProcessedAt && emp.exitProcessedBy?.name && (
                            <div className="text-[10px] text-muted-foreground/70">
                              by {emp.exitProcessedBy.name}
                            </div>
                          )}
                        </td>

                        {/* Delay */}
                        <td className="whitespace-nowrap px-4 py-3">
                          <DelayBadge delayMinutes={emp.exitTatDelayMinutes} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {showResignForm && (
        <ResignFormModal
          leavingIds={new Set(employees.map((e) => e.id))}
          onClose={() => setShowResignForm(false)}
        />
      )}
      {processEmp && <ProcessExitModal emp={processEmp} onClose={() => setProcessEmp(null)} />}
    </div>
  );
};

export default MainAfterLeavingWork;
