'use client';

import {
  IconAlertTriangle,
  IconBriefcase,
  IconCheck,
  IconClock,
  IconDownload,
  IconFilter,
  IconLoader2,
  IconPlus,
  IconSearch,
  IconSettings,
  IconTrash,
  IconUpload,
  IconUserPlus,
  IconUsers,
  IconX,
} from '@tabler/icons-react';
import type React from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ModalPortal } from '../../_shared/components';
import { Sliders, ListChecks } from 'lucide-react';
import { useRequireCompanySelected } from '@/features/organization/hooks/useRequireCompanySelected';
import { resolveActAsTenant } from '@/features/organization/utils/actAsTenant';
import { cn } from '@/lib/utils';
import { useAppSelector } from '@/store/hook';
import { selectUser } from '@/store/slice/userAccountData';
import { useDepartmentOptions } from '../../_shared/tanstackQuery/useDepartments';
import type {
  AccountLinkFieldDiff,
  BulkImportResult,
  BulkImportRow,
  ChecklistConfig,
  EmployeePayload,
} from '../../employee/server/api/employeeApi';
import {
  useBulkImportEmployees,
  useChecklistConfig,
  useCreateEmployee,
  useOnboardingList,
  useSaveChecklistConfig,
  useUpdateOnboarding,
} from '../../employee/server/tanstackQuery/useEmployeeQueries';
import type { CustomChecklistItem, OnboardingEmployee } from '../../employee/types/types';

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
  font: "'DM Sans', system-ui, sans-serif" as React.CSSProperties['fontFamily'],
};

// All possible standard items — global settings toggle these on/off
const ALL_STANDARD_ITEMS: { key: string; label: string }[] = [
  { key: 'salarySlipChecked', label: 'Check Salary Slip & Resume Copy' },
  { key: 'offerLetterReceived', label: 'Offer Letter Received' },
  { key: 'joiningLetterIssued', label: 'Joining Letter Issued' },
  { key: 'welcomeMeeting', label: 'Welcome Meeting' },
  { key: 'biometricAccess', label: 'Biometric Access' },
  { key: 'idCardIssued', label: 'ID Card Issued' },
  { key: 'companyDirectory', label: 'Company Directory' },
];

// Dynamic items (issuances) — driven by joining form flags
const ISSUANCE_MAP: {
  joiningKey: keyof NonNullable<NonNullable<OnboardingEmployee['candidate']>['joining']>;
  key: string;
  label: string;
}[] = [
  { joiningKey: 'emailToBeIssued', key: 'officialEmailIssued', label: 'Official Email ID Issued' },
  { joiningKey: 'mobileToBeIssued', key: 'mobileIssued', label: 'Mobile Device Issued' },
  { joiningKey: 'laptopToBeIssued', key: 'laptopAssigned', label: 'Laptop / Assets Assigned' },
  { joiningKey: 'pfEligible', key: 'pfRegistered', label: 'PF Registration' },
  { joiningKey: 'esicEligible', key: 'esicRegistered', label: 'ESIC Registration' },
];

function getIssuanceItems(emp: OnboardingEmployee): { key: string; label: string }[] {
  const joining = emp.joining ?? emp.candidate?.joining;
  if (!joining) return [];
  return ISSUANCE_MAP.filter((d) => joining[d.joiningKey]).map((d) => ({
    key: d.key,
    label: d.label,
  }));
}

function getEffectiveStandardItems(
  disabledKeys: string[] = [],
  globalCustomItems: { key: string; label: string }[] = []
): { key: string; label: string }[] {
  const safeDisabled = Array.isArray(disabledKeys) ? disabledKeys : [];
  const safeCustom = Array.isArray(globalCustomItems) ? globalCustomItems : [];
  const base = ALL_STANDARD_ITEMS.filter((i) => !safeDisabled.includes(i.key));
  return [...base, ...safeCustom];
}

function fmtDt(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function DelayBadge({ delayMinutes }: { delayMinutes: number | null | undefined }) {
  if (delayMinutes == null) {
    return <span style={{ fontSize: 11, color: T.mutedFg }}>—</span>;
  }
  if (delayMinutes === 0) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          borderRadius: 999,
          border: `1px solid ${T.success}`,
          background: T.successBg,
          color: T.success,
          padding: '2px 8px',
          fontSize: 10,
          fontWeight: 700,
        }}
      >
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
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 999,
        border: `1px solid ${T.danger}`,
        background: T.dangerBg,
        color: T.danger,
        padding: '2px 8px',
        fontSize: 10,
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
      title={`Processed ${parts.join(' ')} late vs planned`}
    >
      +{parts.join(' ')}
    </span>
  );
}

function getChecklistProgress(
  emp: OnboardingEmployee,
  disabledKeys: string[] = [],
  globalCustomItems: { key: string; label: string }[] = []
): { done: number; total: number } {
  const standard = getEffectiveStandardItems(disabledKeys, globalCustomItems);
  const issuances = getIssuanceItems(emp);
  const custom = Array.isArray(emp?.customChecklistItems) ? emp.customChecklistItems : [];
  const all = [...standard, ...issuances, ...custom];
  const checklist = emp?.onboardingChecklist ?? {};
  const done = all.filter((i) => checklist[i.key]).length;
  return { done, total: all.length };
}

type FilterStatus = 'all' | 'pending' | 'partial' | 'done';

const FILTER_OPTIONS: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Not Started' },
  { value: 'partial', label: 'In Progress' },
  { value: 'done', label: 'Completed' },
];

// ── Shared sub-components ────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: T.mutedFg,
        margin: '0 0 8px',
      }}
    >
      {children}
    </p>
  );
}

function CheckRow({
  id,
  label,
  checked,
  onToggle,
  onDelete,
}: {
  id: string;
  label: string;
  checked: boolean;
  onToggle: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 12px',
        borderRadius: 8,
        border: `1.5px solid ${checked ? T.success : T.border}`,
        background: checked ? T.successBg : 'transparent',
        transition: 'all 0.15s',
      }}
    >
      <label
        htmlFor={id}
        style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, cursor: 'pointer' }}
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          style={{
            width: 16,
            height: 16,
            accentColor: T.success,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 13,
            color: checked ? T.success : T.fg,
            fontWeight: checked ? 600 : 400,
          }}
        >
          {label}
        </span>
        {checked && (
          <IconCheck size={13} style={{ color: T.success, marginLeft: 'auto' }} strokeWidth={2.5} />
        )}
      </label>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          title="Remove"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 26,
            height: 26,
            borderRadius: 6,
            border: `1px solid ${T.border}`,
            background: T.dangerBg,
            color: T.danger,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <IconTrash size={13} />
        </button>
      )}
    </div>
  );
}

function AddItemRow({
  onAdd,
  placeholder,
}: {
  onAdd: (label: string) => void;
  placeholder?: string;
}) {
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);

  const commit = () => {
    const label = value.trim();
    if (!label) return;
    onAdd(label);
    setValue('');
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '5px 12px',
          borderRadius: 7,
          border: `1.5px dashed ${T.border}`,
          background: 'transparent',
          color: T.mutedFg,
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: T.font,
        }}
      >
        <IconPlus size={12} strokeWidth={2.5} /> Add Item
      </button>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        padding: '8px 10px',
        borderRadius: 8,
        border: `1.5px dashed ${T.primary}`,
        background: T.primaryBg,
      }}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') {
            setOpen(false);
            setValue('');
          }
        }}
        placeholder={placeholder ?? 'Item label…'}
        style={{
          flex: 1,
          height: 32,
          padding: '0 10px',
          borderRadius: 6,
          border: `1px solid ${T.border}`,
          background: T.card,
          color: T.fg,
          fontSize: 13,
          outline: 'none',
          fontFamily: T.font,
        }}
      />
      <button
        type="button"
        onClick={commit}
        style={{
          height: 32,
          padding: '0 14px',
          borderRadius: 6,
          border: 'none',
          background: T.primary,
          color: T.primaryFg,
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: T.font,
        }}
      >
        Add
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setValue('');
        }}
        style={{
          height: 32,
          width: 32,
          borderRadius: 6,
          border: `1px solid ${T.border}`,
          background: T.muted,
          color: T.mutedFg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
        aria-label="Cancel"
      >
        <IconX size={14} />
      </button>
    </div>
  );
}

// ── Global Checklist Settings Modal ─────────────────────────────────────────

function ChecklistSettingsModal({
  config,
  onClose,
  onSave,
  saving,
}: {
  config: ChecklistConfig;
  onClose: () => void;
  onSave: (cfg: ChecklistConfig) => void;
  saving: boolean;
}) {
  const [disabled, setDisabled] = useState<string[]>(() =>
    Array.isArray(config?.disabledStandardKeys) ? config.disabledStandardKeys : []
  );
  const [globalCustom, setGlobalCustom] = useState<{ key: string; label: string }[]>(() =>
    Array.isArray(config?.globalCustomItems) ? config.globalCustomItems : []
  );

  const toggleStandard = (key: string) => {
    setDisabled((prev) => {
      const arr = Array.isArray(prev) ? prev : [];
      return arr.includes(key) ? arr.filter((k) => k !== key) : [...arr, key];
    });
  };

  const addGlobalCustom = (label: string) => {
    setGlobalCustom((prev) => [...prev, { key: `gcustom_${Date.now()}`, label }]);
  };

  const deleteGlobalCustom = (key: string) => {
    setGlobalCustom((prev) => prev.filter((i) => i.key !== key));
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] sm:max-w-xl max-h-[92vh] flex flex-col p-4 sm:p-6 rounded-2xl overflow-hidden shadow-2xl border bg-card">
        {/* Header */}
        <DialogHeader className="space-y-1 text-left pr-6 shrink-0 mb-3">
          <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2 text-primary border-b pb-2.5 mb-1">
            <Sliders className="size-5 sm:size-6 text-primary shrink-0" />
            <span>Checklist Settings</span>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-normal">
            Configure global standard items — applies to all employees
          </DialogDescription>
        </DialogHeader>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 2px' }}>
          {/* Standard items toggles */}
          <SectionLabel>Standard Items (toggle to include / exclude)</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 20 }}>
            {ALL_STANDARD_ITEMS.map((item) => {
              const enabled = !disabled.includes(item.key);
              return (
                <label
                  key={item.key}
                  htmlFor={`settings-${item.key}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: `1.5px solid ${enabled ? T.primary : T.border}`,
                    background: enabled ? T.primaryBg : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <input
                    id={`settings-${item.key}`}
                    type="checkbox"
                    checked={enabled}
                    onChange={() => toggleStandard(item.key)}
                    style={{
                      width: 16,
                      height: 16,
                      accentColor: T.primary,
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 13,
                      color: enabled ? T.primary : T.mutedFg,
                      fontWeight: enabled ? 600 : 400,
                      flex: 1,
                    }}
                  >
                    {item.label}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: enabled ? T.primary : T.mutedFg,
                    }}
                  >
                    {enabled ? 'Included' : 'Excluded'}
                  </span>
                </label>
              );
            })}
          </div>

          {/* Global custom items */}
          <SectionLabel>Global Custom Items (added to all employees)</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
            {globalCustom.length === 0 && (
              <p style={{ fontSize: 12, color: T.mutedFg, fontStyle: 'italic', margin: '0 0 4px' }}>
                No global custom items yet.
              </p>
            )}
            {globalCustom.map((item) => (
              <div
                key={item.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: `1.5px solid ${T.border}`,
                  background: T.muted,
                }}
              >
                <span style={{ flex: 1, fontSize: 13, color: T.fg }}>{item.label}</span>
                <button
                  type="button"
                  onClick={() => deleteGlobalCustom(item.key)}
                  title="Remove"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 26,
                    height: 26,
                    borderRadius: 6,
                    border: `1px solid ${T.border}`,
                    background: T.dangerBg,
                    color: T.danger,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <IconTrash size={13} />
                </button>
              </div>
            ))}
            <AddItemRow
              onAdd={addGlobalCustom}
              placeholder="e.g. Setup workstation, HR orientation…"
            />
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="flex flex-row items-center justify-end gap-2 pt-4 border-t mt-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
          >
            Close
          </Button>
          <Button
            type="button"
            onClick={() =>
              onSave({ disabledStandardKeys: disabled, globalCustomItems: globalCustom })
            }
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm"
          >
            {saving ? (
              <>
                <IconLoader2 size={14} className="animate-spin mr-1.5" /> Saving…
              </>
            ) : (
              <>
                <IconCheck size={14} strokeWidth={2.5} className="mr-1.5" /> Update
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Checklist Modal ──────────────────────────────────────────────────────────

function ChecklistModal({
  emp,
  config,
  onClose,
  onSave,
  saving,
}: {
  emp: OnboardingEmployee;
  config: ChecklistConfig;
  onClose: () => void;
  onSave: (checklist: Record<string, boolean>, customItems: CustomChecklistItem[]) => void;
  saving: boolean;
}) {
  const standardItems = useMemo(
    () =>
      getEffectiveStandardItems(
        config?.disabledStandardKeys ?? [],
        config?.globalCustomItems ?? []
      ),
    [config]
  );
  const issuanceItems = useMemo(() => getIssuanceItems(emp), [emp]);

  const [customItems, setCustomItems] = useState<CustomChecklistItem[]>(
    () => emp.customChecklistItems ?? []
  );

  const allItems = useMemo(
    () => [...standardItems, ...issuanceItems, ...customItems],
    [standardItems, issuanceItems, customItems]
  );

  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    const saved = emp.onboardingChecklist ?? {};
    const init: Record<string, boolean> = {};
    for (const item of allItems) {
      init[item.key] = saved[item.key] ?? false;
    }
    return init;
  });

  const toggle = (key: string) => setChecked((prev) => ({ ...prev, [key]: !prev[key] }));

  const addCustomItem = (label: string) => {
    const key = `custom_${Date.now()}`;
    setCustomItems((prev) => [...prev, { key, label, required: false }]);
    setChecked((prev) => ({ ...prev, [key]: false }));
  };
  const deleteCustomItem = (key: string) => {
    setCustomItems((prev) => prev.filter((i) => i.key !== key));
    setChecked((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const doneCount =
    allItems.filter((i) => checked[i.key]).length +
    customItems.filter((i) => checked[i.key] && !allItems.find((a) => a.key === i.key)).length;
  const total = allItems.length;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] sm:max-w-xl max-h-[92vh] flex flex-col p-4 sm:p-6 rounded-2xl overflow-hidden shadow-2xl border bg-card">
        {/* Header */}
        <DialogHeader className="space-y-1 text-left pr-6 shrink-0 mb-3">
          <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2 text-primary border-b pb-2.5 mb-1">
            <ListChecks className="size-5 sm:size-6 text-primary shrink-0" />
            <span>After Joining Work Checklist</span>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-normal">
            {doneCount}/{total} items completed · {emp.name}
          </DialogDescription>
        </DialogHeader>

        {/* Employee Summary Strip */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: 10,
            padding: '10px 14px',
            borderRadius: 10,
            background: T.muted,
            border: `1px solid ${T.border}`,
            marginBottom: 10,
          }}
        >
          <div>
            <p
              style={{
                fontSize: 10,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: T.mutedFg,
                marginBottom: 4,
              }}
            >
              Employee
            </p>
            <p style={{ fontSize: 13, fontWeight: 700, color: T.fg }}>{emp.name}</p>
          </div>
          <div>
            <p
              style={{
                fontSize: 10,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: T.mutedFg,
                marginBottom: 4,
              }}
            >
              Designation
            </p>
            <p style={{ fontSize: 13, fontWeight: 600, color: T.fg }}>
              {emp.designation ?? '—'}
            </p>
          </div>
          <div>
            <p
              style={{
                fontSize: 10,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: T.mutedFg,
                marginBottom: 4,
              }}
            >
              Department
            </p>
            <p style={{ fontSize: 13, fontWeight: 600, color: T.fg }}>
              {emp.department?.name ?? '—'}
            </p>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 4px 8px' }}>
          {/* Standard Items */}
          <SectionLabel>Standard Items</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 18 }}>
            {standardItems.map((item) => (
              <CheckRow
                key={item.key}
                id={`chk-${item.key}`}
                label={item.label}
                checked={checked[item.key] ?? false}
                onToggle={() => toggle(item.key)}
              />
            ))}
          </div>

          {/* Issuances Requested */}
          {issuanceItems.length > 0 && (
            <>
              <SectionLabel>Issuances Requested</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 18 }}>
                {issuanceItems.map((item) => (
                  <CheckRow
                    key={item.key}
                    id={`chk-${item.key}`}
                    label={item.label}
                    checked={checked[item.key] ?? false}
                    onToggle={() => toggle(item.key)}
                  />
                ))}
              </div>
            </>
          )}

          {/* Custom Checklist Items */}
          <SectionLabel>Custom Items</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
            {customItems.length === 0 && (
              <p style={{ fontSize: 12, color: T.mutedFg, fontStyle: 'italic', margin: '0 0 6px' }}>
                No custom checklist items for this employee.
              </p>
            )}
            {customItems.map((item) => (
              <CheckRow
                key={item.key}
                id={`chk-${item.key}`}
                label={item.label}
                checked={checked[item.key] ?? false}
                onToggle={() => toggle(item.key)}
                onDelete={() => deleteCustomItem(item.key)}
              />
            ))}
            <AddItemRow
              onAdd={addCustomItem}
              placeholder="e.g. Issue access card, Setup workstation…"
            />
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="flex flex-row items-center justify-between gap-4 pt-4 border-t mt-3 shrink-0">
          <div style={{ flex: 1, marginRight: 8 }}>
            <div style={{ height: 6, borderRadius: 3, background: T.border, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${total > 0 ? (doneCount / total) * 100 : 0}%`,
                  background: doneCount === total ? T.success : T.primary,
                  borderRadius: 3,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={() => onSave(checked, customItems)}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm"
            >
              {saving ? (
                <>
                  <IconLoader2 size={14} className="animate-spin mr-1.5" /> Saving…
                </>
              ) : (
                <>
                  <IconCheck size={14} strokeWidth={2.5} className="mr-1.5" /> Save
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Direct Joining Modal ─────────────────────────────────────────────────────

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship'];
const ATTENDANCE_MODES = ['Office / On-site', 'Remote / WFH', 'Hybrid', 'Field'];
const PAYMENT_MODES = ['Bank Transfer', 'NEFT', 'RTGS', 'IMPS', 'Cheque', 'Cash'];

function SectionTitle({ children, first }: { children: React.ReactNode; first?: boolean }) {
  return (
    <p
      style={{
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: T.primary,
        margin: first ? '0 0 12px' : '6px 0 12px',
      }}
    >
      {children}
    </p>
  );
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      style={{
        display: 'block',
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: T.mutedFg,
        marginBottom: 5,
      }}
    >
      {children}
    </label>
  );
}

function StyledInput({
  id,
  type = 'text',
  value,
  onChange,
  placeholder,
  required,
}: {
  id: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      style={{
        width: '100%',
        height: 36,
        padding: '0 10px',
        borderRadius: 8,
        border: `1px solid ${T.border}`,
        background: T.muted,
        color: T.fg,
        fontSize: 13,
        outline: 'none',
        boxSizing: 'border-box',
        fontFamily: T.font,
      }}
    />
  );
}

function StyledSelect({
  id,
  value,
  onChange,
  children,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%',
        height: 36,
        padding: '0 10px',
        borderRadius: 8,
        border: `1px solid ${T.border}`,
        background: T.muted,
        color: value ? T.fg : T.mutedFg,
        fontSize: 13,
        outline: 'none',
        cursor: 'pointer',
        boxSizing: 'border-box',
        fontFamily: T.font,
      }}
    >
      {children}
    </select>
  );
}

function DirectJoiningModal({ onClose }: { onClose: () => void }) {
  const requireCompanySelected = useRequireCompanySelected();
  const createMutation = useCreateEmployee();
  const { data: departments = [] } = useDepartmentOptions();

  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    name: '',
    // Optional human-readable "EMP001"-style ID; left blank, the backend
    // auto-generates the next one for this tenant.
    empCode: '',
    phone: '',
    email: '',
    designation: '',
    departmentId: '',
    joiningDate: today,
    workLocation: '',
    managerName: '',
    bloodGroup: '',
    bankAccount: '',
    ifscCode: '',
    // Personal
    fatherName: '',
    highestQualification: '',
    aadharNo: '',
    // Address
    currentAddress: '',
    aadharAddress: '',
    // Job details
    employmentType: 'Full-time',
    companyName: '',
    joiningPlace: '',
    attendanceMode: '',
    // Compensation
    offeredCTC: '',
    monthlySalary: '',
    probationMonths: '3',
    // Bank
    bankBranchName: '',
    paymentMode: '',
    // Emergency contact
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
    // Issuances / eligibility ('yes' | 'no' | '')
    emailToBeIssued: '',
    mobileToBeIssued: '',
    laptopToBeIssued: '',
    pfEligible: '',
    esicEligible: '',
    pastPfNo: '',
    esicNo: '',
  });
  const [error, setError] = useState('');
  // Set when the backend reports ACCOUNT_DATA_MISMATCH — a pre-existing,
  // unlinked login account matches this phone number but its name/email/
  // department disagree with what was just entered. `pendingPayloadRef`
  // holds the exact payload that was rejected so "Confirm & Link" can
  // resubmit it unchanged with confirmAccountLinkOverwrite: true.
  const [accountMismatch, setAccountMismatch] = useState<AccountLinkFieldDiff[] | null>(null);
  const pendingPayloadRef = useRef<EmployeePayload | null>(null);

  const set = (field: string) => (v: string) => setForm((prev) => ({ ...prev, [field]: v }));

  const parseYesNo = (v: string): boolean | undefined =>
    v === 'yes' ? true : v === 'no' ? false : undefined;

  const submitPayload = async (payload: EmployeePayload) => {
    try {
      await createMutation.mutateAsync({ data: payload });
      toast.success('Employee added and ready for onboarding.');
      setAccountMismatch(null);
      pendingPayloadRef.current = null;
      onClose();
    } catch (err) {
      const errors = (
        err as {
          response?: {
            data?: { errors?: { conflict?: string; diffs?: AccountLinkFieldDiff[] }[] };
          };
        }
      )?.response?.data?.errors;
      const mismatch = errors?.find((e) => e.conflict === 'ACCOUNT_DATA_MISMATCH');
      if (mismatch?.diffs) {
        pendingPayloadRef.current = payload;
        setAccountMismatch(mismatch.diffs);
        return;
      }
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Failed to create employee. Please try again.');
    }
  };

  const handleConfirmAccountLink = () => {
    if (!pendingPayloadRef.current) return;
    submitPayload({ ...pendingPayloadRef.current, confirmAccountLinkOverwrite: true });
  };

  const handleCancelAccountLink = () => {
    setAccountMismatch(null);
    pendingPayloadRef.current = null;
  };

  const handleSubmit = async () => {
    if (!requireCompanySelected()) return;
    if (!form.name.trim()) {
      setError('Employee name is required.');
      return;
    }
    setError('');
    const payload: EmployeePayload = { name: form.name.trim() };
    if (form.empCode.trim()) payload.empCode = form.empCode.trim();
    if (form.phone) payload.phone = form.phone;
    if (form.email) payload.email = form.email;
    if (form.designation) payload.designation = form.designation;
    if (form.departmentId) payload.departmentId = form.departmentId;
    if (form.joiningDate) payload.joiningDate = form.joiningDate;
    if (form.workLocation) payload.workLocation = form.workLocation;
    if (form.managerName) payload.managerName = form.managerName;
    if (form.bloodGroup) payload.bloodGroup = form.bloodGroup;
    if (form.bankAccount) payload.bankAccount = form.bankAccount;
    if (form.ifscCode) payload.ifscCode = form.ifscCode;
    if (form.fatherName) payload.fatherName = form.fatherName;
    if (form.highestQualification) payload.highestQualification = form.highestQualification;
    if (form.aadharNo) payload.aadharNo = form.aadharNo;
    if (form.currentAddress) payload.currentAddress = form.currentAddress;
    if (form.aadharAddress) payload.aadharAddress = form.aadharAddress;
    if (form.employmentType) payload.employmentType = form.employmentType;
    if (form.companyName) payload.companyName = form.companyName;
    if (form.joiningPlace) payload.joiningPlace = form.joiningPlace;
    if (form.attendanceMode) payload.attendanceMode = form.attendanceMode;
    if (form.offeredCTC) payload.offeredCTC = form.offeredCTC;
    if (form.monthlySalary) payload.monthlySalary = Number(form.monthlySalary);
    if (form.probationMonths) payload.probationMonths = Number(form.probationMonths);
    if (form.bankBranchName) payload.bankBranchName = form.bankBranchName;
    if (form.paymentMode) payload.paymentMode = form.paymentMode;
    if (form.emergencyContactName) payload.emergencyContactName = form.emergencyContactName;
    if (form.emergencyContactPhone) payload.emergencyContactPhone = form.emergencyContactPhone;
    if (form.emergencyContactRelation)
      payload.emergencyContactRelation = form.emergencyContactRelation;
    const emailToBeIssued = parseYesNo(form.emailToBeIssued);
    if (emailToBeIssued !== undefined) payload.emailToBeIssued = emailToBeIssued;
    const mobileToBeIssued = parseYesNo(form.mobileToBeIssued);
    if (mobileToBeIssued !== undefined) payload.mobileToBeIssued = mobileToBeIssued;
    const laptopToBeIssued = parseYesNo(form.laptopToBeIssued);
    if (laptopToBeIssued !== undefined) payload.laptopToBeIssued = laptopToBeIssued;
    const pfEligible = parseYesNo(form.pfEligible);
    if (pfEligible !== undefined) payload.pfEligible = pfEligible;
    const esicEligible = parseYesNo(form.esicEligible);
    if (esicEligible !== undefined) payload.esicEligible = esicEligible;
    if (form.pastPfNo) payload.pastPfNo = form.pastPfNo;
    if (form.esicNo) payload.esicNo = form.esicNo;
    await submitPayload(payload);
  };

  const saving = createMutation.isPending;

  return (
    <>
      {accountMismatch && (
        <AccountLinkMismatchModal
          diffs={accountMismatch}
          isSaving={saving}
          onConfirm={handleConfirmAccountLink}
          onCancel={handleCancelAccountLink}
        />
      )}
      <ModalPortal>
        {/* biome-ignore lint/a11y/noStaticElementInteractions: modal backdrop dismiss */}
        <div
        role="presentation"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(4px)',
          padding: 16,
        }}
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="direct-joining-title"
          style={{
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: 16,
            width: '100%',
            maxWidth: 600,
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            fontFamily: T.font,
          }}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '18px 20px 14px',
              borderBottom: `1px solid ${T.border}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  background: T.primaryBg,
                  border: `1px solid color-mix(in oklch, var(--primary) 25%, transparent)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: T.primary,
                  flexShrink: 0,
                }}
              >
                <IconUserPlus size={16} strokeWidth={2} />
              </div>
              <div>
                <h2
                  id="direct-joining-title"
                  style={{ fontSize: 16, fontWeight: 700, color: T.fg, margin: 0 }}
                >
                  Direct Employee Joining
                </h2>
                <p style={{ fontSize: 12, color: T.mutedFg, margin: 0 }}>
                  Add an employee directly without the candidate pipeline
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: 8,
                border: 'none',
                background: T.muted,
                color: T.mutedFg,
                cursor: 'pointer',
              }}
              aria-label="Close"
            >
              <IconX size={16} />
            </button>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
            {/* Section: Basic Info */}
            <SectionTitle first>Basic Information</SectionTitle>

            {/* Name — full width */}
            <div style={{ marginBottom: 14 }}>
              <FieldLabel htmlFor="dj-name">
                Full Name <span style={{ color: T.danger }}>*</span>
              </FieldLabel>
              <StyledInput
                id="dj-name"
                value={form.name}
                onChange={set('name')}
                placeholder="e.g. Ravi Kumar"
                required
              />
            </div>

            {/* 2-col grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '14px 16px',
                marginBottom: 14,
              }}
            >
              <div>
                <FieldLabel htmlFor="dj-empcode">Employee ID</FieldLabel>
                <StyledInput
                  id="dj-empcode"
                  value={form.empCode}
                  onChange={set('empCode')}
                  placeholder="Leave blank to auto-generate"
                />
              </div>
              <div>
                <FieldLabel htmlFor="dj-phone">Phone</FieldLabel>
                <StyledInput
                  id="dj-phone"
                  type="tel"
                  value={form.phone}
                  onChange={set('phone')}
                  placeholder="10-digit mobile"
                />
              </div>
              <div>
                <FieldLabel htmlFor="dj-email">Email</FieldLabel>
                <StyledInput
                  id="dj-email"
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  placeholder="employee@company.com"
                />
              </div>
              <div>
                <FieldLabel htmlFor="dj-designation">Designation</FieldLabel>
                <StyledInput
                  id="dj-designation"
                  value={form.designation}
                  onChange={set('designation')}
                  placeholder="e.g. Senior Engineer"
                />
              </div>
              <div>
                <FieldLabel htmlFor="dj-dept">Department</FieldLabel>
                <StyledSelect id="dj-dept" value={form.departmentId} onChange={set('departmentId')}>
                  <option value="">Select department…</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </StyledSelect>
              </div>
            </div>

            {/* Section: Personal Information */}
            <SectionTitle>Personal Information</SectionTitle>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '14px 16px',
                marginBottom: 14,
              }}
            >
              <div>
                <FieldLabel htmlFor="dj-father-name">Father Name</FieldLabel>
                <StyledInput
                  id="dj-father-name"
                  value={form.fatherName}
                  onChange={set('fatherName')}
                  placeholder="Father's full name"
                />
              </div>
              <div>
                <FieldLabel htmlFor="dj-qualification">Highest Qualification</FieldLabel>
                <StyledInput
                  id="dj-qualification"
                  value={form.highestQualification}
                  onChange={set('highestQualification')}
                  placeholder="e.g. B.Tech, MBA"
                />
              </div>
              <div>
                <FieldLabel htmlFor="dj-aadhar-no">Aadhar No.</FieldLabel>
                <StyledInput
                  id="dj-aadhar-no"
                  value={form.aadharNo}
                  onChange={set('aadharNo')}
                  placeholder="12-digit Aadhar number"
                />
              </div>
            </div>

            {/* Section: Address Details */}
            <SectionTitle>Address Details</SectionTitle>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '14px 16px',
                marginBottom: 14,
              }}
            >
              <div>
                <FieldLabel htmlFor="dj-current-address">Current Address</FieldLabel>
                <StyledInput
                  id="dj-current-address"
                  value={form.currentAddress}
                  onChange={set('currentAddress')}
                  placeholder="Current residential address"
                />
              </div>
              <div>
                <FieldLabel htmlFor="dj-aadhar-address">Address as per Aadhar</FieldLabel>
                <StyledInput
                  id="dj-aadhar-address"
                  value={form.aadharAddress}
                  onChange={set('aadharAddress')}
                  placeholder="Address as printed on Aadhar card"
                />
              </div>
            </div>

            {/* Section: Job Details */}
            <SectionTitle>Job Details</SectionTitle>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '14px 16px',
                marginBottom: 14,
              }}
            >
              <div>
                <FieldLabel htmlFor="dj-joining-date">Joining Date</FieldLabel>
                <StyledInput
                  id="dj-joining-date"
                  type="date"
                  value={form.joiningDate}
                  onChange={set('joiningDate')}
                />
              </div>
              <div>
                <FieldLabel htmlFor="dj-employment-type">Employment Type</FieldLabel>
                <StyledSelect
                  id="dj-employment-type"
                  value={form.employmentType}
                  onChange={set('employmentType')}
                >
                  {EMPLOYMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </StyledSelect>
              </div>
              <div>
                <FieldLabel htmlFor="dj-work-location">Work Location</FieldLabel>
                <StyledInput
                  id="dj-work-location"
                  value={form.workLocation}
                  onChange={set('workLocation')}
                  placeholder="e.g. Mumbai HO"
                />
              </div>
              <div>
                <FieldLabel htmlFor="dj-manager">Reporting Manager</FieldLabel>
                <StyledInput
                  id="dj-manager"
                  value={form.managerName}
                  onChange={set('managerName')}
                  placeholder="Manager's name"
                />
              </div>
              <div>
                <FieldLabel htmlFor="dj-blood">Blood Group</FieldLabel>
                <StyledSelect id="dj-blood" value={form.bloodGroup} onChange={set('bloodGroup')}>
                  <option value="">Select…</option>
                  {BLOOD_GROUPS.map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </StyledSelect>
              </div>
              <div>
                <FieldLabel htmlFor="dj-company-name">Joining Company Name</FieldLabel>
                <StyledInput
                  id="dj-company-name"
                  value={form.companyName}
                  onChange={set('companyName')}
                  placeholder="Name of the company"
                />
              </div>
              <div>
                <FieldLabel htmlFor="dj-joining-place">Joining Place</FieldLabel>
                <StyledInput
                  id="dj-joining-place"
                  value={form.joiningPlace}
                  onChange={set('joiningPlace')}
                  placeholder="Branch / office where joining"
                />
              </div>
              <div>
                <FieldLabel htmlFor="dj-attendance-mode">Mode of Attendance</FieldLabel>
                <StyledSelect
                  id="dj-attendance-mode"
                  value={form.attendanceMode}
                  onChange={set('attendanceMode')}
                >
                  <option value="">Select mode…</option>
                  {ATTENDANCE_MODES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </StyledSelect>
              </div>
            </div>

            {/* Section: Compensation */}
            <SectionTitle>Compensation</SectionTitle>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '14px 16px',
                marginBottom: 14,
              }}
            >
              <div>
                <FieldLabel htmlFor="dj-offered-ctc">Offered CTC / Annual</FieldLabel>
                <StyledInput
                  id="dj-offered-ctc"
                  value={form.offeredCTC}
                  onChange={set('offeredCTC')}
                  placeholder="e.g. ₹6,00,000 p.a."
                />
              </div>
              <div>
                <FieldLabel htmlFor="dj-monthly-salary">Monthly Salary (₹)</FieldLabel>
                <StyledInput
                  id="dj-monthly-salary"
                  type="number"
                  value={form.monthlySalary}
                  onChange={set('monthlySalary')}
                  placeholder="e.g. 50000"
                />
              </div>
              <div>
                <FieldLabel htmlFor="dj-probation">Probation (months)</FieldLabel>
                <StyledInput
                  id="dj-probation"
                  type="number"
                  value={form.probationMonths}
                  onChange={set('probationMonths')}
                />
              </div>
            </div>

            {/* Section: Banking */}
            <SectionTitle>Bank Details</SectionTitle>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '14px 16px',
                marginBottom: 14,
              }}
            >
              <div>
                <FieldLabel htmlFor="dj-bank">Account Number</FieldLabel>
                <StyledInput
                  id="dj-bank"
                  value={form.bankAccount}
                  onChange={set('bankAccount')}
                  placeholder="Bank account no."
                />
              </div>
              <div>
                <FieldLabel htmlFor="dj-branch">Branch Name</FieldLabel>
                <StyledInput
                  id="dj-branch"
                  value={form.bankBranchName}
                  onChange={set('bankBranchName')}
                  placeholder="e.g. Andheri East Branch"
                />
              </div>
              <div>
                <FieldLabel htmlFor="dj-ifsc">IFSC Code</FieldLabel>
                <StyledInput
                  id="dj-ifsc"
                  value={form.ifscCode}
                  onChange={set('ifscCode')}
                  placeholder="e.g. SBIN0001234"
                />
              </div>
              <div>
                <FieldLabel htmlFor="dj-payment-mode">Payment Mode</FieldLabel>
                <StyledSelect
                  id="dj-payment-mode"
                  value={form.paymentMode}
                  onChange={set('paymentMode')}
                >
                  <option value="">Select mode…</option>
                  {PAYMENT_MODES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </StyledSelect>
              </div>
            </div>

            {/* Section: Emergency Contact */}
            <SectionTitle>Emergency Contact</SectionTitle>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '14px 16px',
                marginBottom: 14,
              }}
            >
              <div>
                <FieldLabel htmlFor="dj-emg-name">Contact Name</FieldLabel>
                <StyledInput
                  id="dj-emg-name"
                  value={form.emergencyContactName}
                  onChange={set('emergencyContactName')}
                  placeholder="Full name"
                />
              </div>
              <div>
                <FieldLabel htmlFor="dj-emg-phone">Contact Phone</FieldLabel>
                <StyledInput
                  id="dj-emg-phone"
                  value={form.emergencyContactPhone}
                  onChange={set('emergencyContactPhone')}
                  placeholder="+91 XXXXXXXXXX"
                />
              </div>
              <div>
                <FieldLabel htmlFor="dj-emg-relation">Relationship</FieldLabel>
                <StyledInput
                  id="dj-emg-relation"
                  value={form.emergencyContactRelation}
                  onChange={set('emergencyContactRelation')}
                  placeholder="e.g. Father, Spouse"
                />
              </div>
            </div>

            {/* Section: Issuances */}
            <SectionTitle>Issuances</SectionTitle>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '14px 16px',
                marginBottom: 14,
              }}
            >
              <div>
                <FieldLabel htmlFor="dj-email-issued">Email ID to be Issued</FieldLabel>
                <StyledSelect
                  id="dj-email-issued"
                  value={form.emailToBeIssued}
                  onChange={set('emailToBeIssued')}
                >
                  <option value="">Select…</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </StyledSelect>
              </div>
              <div>
                <FieldLabel htmlFor="dj-mobile-issued">Mobile to be Issued</FieldLabel>
                <StyledSelect
                  id="dj-mobile-issued"
                  value={form.mobileToBeIssued}
                  onChange={set('mobileToBeIssued')}
                >
                  <option value="">Select…</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </StyledSelect>
              </div>
              <div>
                <FieldLabel htmlFor="dj-laptop-issued">Laptop to be Issued</FieldLabel>
                <StyledSelect
                  id="dj-laptop-issued"
                  value={form.laptopToBeIssued}
                  onChange={set('laptopToBeIssued')}
                >
                  <option value="">Select…</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </StyledSelect>
              </div>
            </div>

            {/* Section: PF / ESIC */}
            <SectionTitle>PF / ESIC</SectionTitle>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '14px 16px',
              }}
            >
              <div>
                <FieldLabel htmlFor="dj-pf-eligible">PF Eligible</FieldLabel>
                <StyledSelect
                  id="dj-pf-eligible"
                  value={form.pfEligible}
                  onChange={set('pfEligible')}
                >
                  <option value="">Select…</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </StyledSelect>
              </div>
              <div>
                <FieldLabel htmlFor="dj-past-pf">Past PF No. (if any)</FieldLabel>
                <StyledInput
                  id="dj-past-pf"
                  value={form.pastPfNo}
                  onChange={set('pastPfNo')}
                  placeholder="Previous PF number"
                />
              </div>
              <div>
                <FieldLabel htmlFor="dj-esic-eligible">ESIC Eligible</FieldLabel>
                <StyledSelect
                  id="dj-esic-eligible"
                  value={form.esicEligible}
                  onChange={set('esicEligible')}
                >
                  <option value="">Select…</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </StyledSelect>
              </div>
              <div>
                <FieldLabel htmlFor="dj-esic-no">ESIC No. (if any)</FieldLabel>
                <StyledInput
                  id="dj-esic-no"
                  value={form.esicNo}
                  onChange={set('esicNo')}
                  placeholder="ESIC number"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 20px',
              borderTop: `1px solid ${T.border}`,
              gap: 10,
            }}
          >
            <div style={{ flex: 1 }}>
              {error && <p style={{ fontSize: 12, color: T.danger, margin: 0 }}>{error}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                height: 36,
                padding: '0 16px',
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
              onClick={handleSubmit}
              disabled={saving}
              style={{
                height: 36,
                padding: '0 20px',
                borderRadius: 8,
                border: 'none',
                background: T.primary,
                color: T.primaryFg,
                fontSize: 13,
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontFamily: T.font,
                whiteSpace: 'nowrap',
              }}
            >
              {saving ? (
                <>
                  <IconLoader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} />
                  Adding…
                </>
              ) : (
                <>
                  <IconUserPlus size={13} strokeWidth={2.5} />
                  Add Employee
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  </>
);
}

// ── Bulk Import Modal ─────────────────────────────────────────────────────────

interface ImportPreviewRow {
  _id: number;
  _row: number; // spreadsheet row number (row 1 = header)
  _errors: string[];
  name: string;
  empCode: string;
  phone: string;
  email: string;
  designation: string;
  department: string;
  joiningDate: string; // ISO yyyy-mm-dd
  joiningDateDisplay: string;
  workLocation: string;
  managerName: string;
  bloodGroup: string;
  bankAccount: string;
  ifscCode: string;
  monthlySalary: string;
}

const IMPORT_TEMPLATE_HEADERS = [
  'Name',
  'Employee ID',
  'Phone',
  'Email',
  'Designation',
  'Department',
  'Joining Date',
  'Work Location',
  'Manager Name',
  'Blood Group',
  'Bank Account',
  'IFSC Code',
  'Monthly Salary',
] as const;

const IMPORT_CHUNK_SIZE = 150;
const PREVIEW_PAGE_SIZE = 100;

function toCsv(rows: string[][]): string {
  return rows
    .map((row) => row.map((v) => `"${(v ?? '').toString().replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

function downloadCsv(filename: string, rows: string[][]) {
  const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function parseImportDate(raw: unknown): { iso: string; display: string } | null {
  if (raw == null || raw === '') return null;
  if (raw instanceof Date) {
    const y = raw.getFullYear();
    const m = String(raw.getMonth() + 1).padStart(2, '0');
    const d = String(raw.getDate()).padStart(2, '0');
    return { iso: `${y}-${m}-${d}`, display: `${d}/${m}/${y}` };
  }
  if (typeof raw === 'number') {
    const jsDate = new Date(Math.round((raw - 25569) * 86400 * 1000));
    if (Number.isNaN(jsDate.getTime())) return null;
    const y = jsDate.getUTCFullYear();
    const m = String(jsDate.getUTCMonth() + 1).padStart(2, '0');
    const d = String(jsDate.getUTCDate()).padStart(2, '0');
    return { iso: `${y}-${m}-${d}`, display: `${d}/${m}/${y}` };
  }
  const s = raw.toString().trim();
  const ddmm = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmm) {
    const dd = ddmm[1].padStart(2, '0');
    const mm = ddmm[2].padStart(2, '0');
    return { iso: `${ddmm[3]}-${mm}-${dd}`, display: `${dd}/${mm}/${ddmm[3]}` };
  }
  const yyyymm = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (yyyymm) return { iso: s, display: `${yyyymm[3]}/${yyyymm[2]}/${yyyymm[1]}` };
  return null;
}

function cell(row: Record<string, unknown>, key: string): string {
  const v = row[key];
  return v == null ? '' : v.toString().trim();
}

// Shown before linking to a pre-existing, unlinked login account whose name/
// email/department disagree with the employee data about to be entered —
// see AccountLinkFieldDiff. Lists what's currently stored on the account
// next to what it will become if the admin confirms the overwrite + link.
function AccountLinkDiffTable({ diffs }: { diffs: AccountLinkFieldDiff[] }) {
  return (
    <div
      style={{
        border: `1px solid ${T.border}`,
        borderRadius: 10,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          background: T.muted,
          fontSize: 11,
          fontWeight: 600,
          color: T.mutedFg,
          padding: '8px 12px',
        }}
      >
        <span>Field</span>
        <span>Currently in account</span>
        <span>Will become</span>
      </div>
      {diffs.map((d) => (
        <div
          key={d.field}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            padding: '8px 12px',
            fontSize: 13,
            borderTop: `1px solid ${T.border}`,
          }}
        >
          <span style={{ color: T.mutedFg }}>{d.label}</span>
          <span>{d.current || '—'}</span>
          <span style={{ color: T.warning, fontWeight: 600 }}>{d.incoming || '—'}</span>
        </div>
      ))}
    </div>
  );
}

// Confirmation overlay for a single account-link mismatch (Direct Joining
// form). Stacks above whatever modal triggered it.
function AccountLinkMismatchModal({
  diffs,
  isSaving,
  onConfirm,
  onCancel,
}: {
  diffs: AccountLinkFieldDiff[];
  isSaving: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <ModalPortal>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: modal backdrop dismiss */}
      <div
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 95,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)',
        padding: 16,
      }}
      onClick={onCancel}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-link-mismatch-title"
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          width: '100%',
          maxWidth: 560,
          padding: 20,
          fontFamily: T.font,
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <h3
          id="account-link-mismatch-title"
          style={{ fontSize: 15, fontWeight: 700, color: T.fg, margin: 0 }}
        >
          Existing login account has different details
        </h3>
        <p style={{ fontSize: 13, color: T.mutedFg, marginTop: 6, marginBottom: 14 }}>
          A login account with this phone number already exists, but its details don't match what
          you entered for this employee. Linking them will overwrite the account with this
          employee's data.
        </p>
        <AccountLinkDiffTable diffs={diffs} />
        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: `1px solid ${T.border}`,
              background: T.card,
              color: T.fg,
              fontSize: 13,
              fontWeight: 600,
              cursor: isSaving ? 'not-allowed' : 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSaving}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: 'none',
              background: T.primary,
              color: T.primaryFg,
              fontSize: 13,
              fontWeight: 600,
              cursor: isSaving ? 'not-allowed' : 'pointer',
            }}
          >
            {isSaving ? 'Linking…' : 'Confirm & Link'}
          </button>
        </div>
      </div>
    </div>
  </ModalPortal>
);
}

function EmployeeImportModal({ onClose }: { onClose: () => void }) {
  const requireCompanySelected = useRequireCompanySelected();
  const { data: departments = [] } = useDepartmentOptions();
  const bulkImportMutation = useBulkImportEmployees();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'guide' | 'preview' | 'results'>('guide');
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [previewPage, setPreviewPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [parseError, setParseError] = useState('');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<{
    created: { row: number; employeeId: string; empCode: string | null; name: string }[];
    errors: { row: number; error: string }[];
  } | null>(null);
  // Rows that matched an existing unlinked account with different data — not
  // created yet, pending the admin reviewing the diff and approving the
  // overwrite + link. Cleared as each row is confirmed and successfully
  // created (or newly failed for an unrelated reason, which moves it to
  // result.errors instead).
  const [pendingLinkConfirmations, setPendingLinkConfirmations] = useState<
    BulkImportResult['pendingLinkConfirmations']
  >([]);
  const [confirmingLinks, setConfirmingLinks] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      setParseError('');
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const XLSX = await import('xlsx');
          const buffer = e.target?.result as ArrayBuffer;
          const isCsv = /\.csv$/i.test(file.name) || file.type === 'text/csv';
          // See QuickTask's importer for why CSV must be decoded as UTF-8 text
          // (`type: 'string', raw: true`) while .xlsx/.xls stay on the binary
          // `type: 'array'` path — avoids mojibake and MM/DD-vs-DD/MM date
          // misparsing on ambiguous CSV date cells.
          const workbook = isCsv
            ? XLSX.read(new TextDecoder('utf-8').decode(buffer).replace(/^﻿/, ''), {
                type: 'string',
                raw: true,
              })
            : XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, {
            raw: true,
          });

          const seenEmails = new Map<string, number>();
          const seenPhones = new Map<string, number>();
          const seenEmpCodes = new Map<string, number>();

          const rows: ImportPreviewRow[] = jsonData.map((row, idx) => {
            const errors: string[] = [];
            const name = cell(row, 'Name');
            if (!name) errors.push('Missing Name');

            const empCode = cell(row, 'Employee ID');

            const phone = cell(row, 'Phone');
            if (!phone) errors.push('Missing Phone');

            const departmentRaw = cell(row, 'Department');
            if (departmentRaw) {
              const match = departments.find(
                (d) => d.name.toLowerCase() === departmentRaw.toLowerCase()
              );
              if (!match) errors.push(`Department "${departmentRaw}" not found`);
            }

            const rawDate = row['Joining Date'];
            let dateResult: { iso: string; display: string } | null = null;
            if (rawDate != null && rawDate !== '') {
              dateResult = parseImportDate(rawDate);
              if (!dateResult) errors.push(`Invalid date "${rawDate}" — use dd/mm/yyyy`);
            }

            const email = cell(row, 'Email');
            const monthlySalary = cell(row, 'Monthly Salary');
            if (monthlySalary && Number.isNaN(Number(monthlySalary))) {
              errors.push(`Invalid Monthly Salary "${monthlySalary}"`);
            }

            if (email) {
              const key = email.toLowerCase();
              const firstSeenAt = seenEmails.get(key);
              if (firstSeenAt !== undefined) {
                errors.push(`Duplicate of row ${firstSeenAt + 2} (same Email)`);
              } else {
                seenEmails.set(key, idx);
              }
            }
            if (phone) {
              const firstSeenAt = seenPhones.get(phone);
              if (firstSeenAt !== undefined) {
                errors.push(`Duplicate of row ${firstSeenAt + 2} (same Phone)`);
              } else {
                seenPhones.set(phone, idx);
              }
            }
            if (empCode) {
              const key = empCode.toUpperCase();
              const firstSeenAt = seenEmpCodes.get(key);
              if (firstSeenAt !== undefined) {
                errors.push(`Duplicate of row ${firstSeenAt + 2} (same Employee ID)`);
              } else {
                seenEmpCodes.set(key, idx);
              }
            }

            return {
              _id: idx,
              _row: idx + 2,
              _errors: errors,
              name,
              empCode,
              phone,
              email,
              designation: cell(row, 'Designation'),
              department: departmentRaw,
              joiningDate: dateResult?.iso ?? '',
              joiningDateDisplay:
                dateResult?.display ?? (rawDate != null ? rawDate.toString() : ''),
              workLocation: cell(row, 'Work Location'),
              managerName: cell(row, 'Manager Name'),
              bloodGroup: cell(row, 'Blood Group'),
              bankAccount: cell(row, 'Bank Account'),
              ifscCode: cell(row, 'IFSC Code'),
              monthlySalary,
            };
          });

          setPreviewRows(rows);
          setPreviewPage(0);
          setSelectedIds(new Set(rows.filter((r) => r._errors.length === 0).map((r) => r._id)));
          setStep('preview');
        } catch {
          setParseError(
            'Could not read this file. Make sure it is a valid .xlsx, .xls, or .csv file.'
          );
        }
      };
      reader.readAsArrayBuffer(file);
    },
    [departments]
  );

  const downloadTemplate = () => {
    const deptName = (i: number) =>
      departments.length ? departments[i % departments.length].name : 'Engineering';
    const sampleNames = [
      ['Ravi Kumar', 'Senior Engineer', 'Anita Sharma', 'O+'],
      ['Priya Singh', 'HR Executive', 'Rohit Verma', 'A+'],
      ['Amit Patel', 'Sales Manager', 'Sunita Rao', 'B+'],
      ['Neha Gupta', 'Accountant', 'Vikram Joshi', 'AB+'],
      ['Sanjay Mehta', 'Machine Operator', 'Anita Sharma', 'O-'],
      ['Kavita Reddy', 'Quality Inspector', 'Rohit Verma', 'B-'],
      ['Deepak Yadav', 'Store Executive', 'Sunita Rao', 'A-'],
      ['Pooja Nair', 'Front Desk Executive', 'Vikram Joshi', 'O+'],
      ['Manoj Tiwari', 'Maintenance Technician', 'Anita Sharma', 'AB-'],
      ['Shalini Iyer', 'Marketing Executive', 'Rohit Verma', 'B+'],
    ];
    const examples = sampleNames.map(([name, designation, manager, bloodGroup], i) => {
      const slug = name.toLowerCase().replace(/\s+/g, '.');
      const day = String(1 + (i % 28)).padStart(2, '0');
      return [
        name,
        '', // Employee ID — left blank to demonstrate auto-generation
        `90000${String(10000 + i).slice(-5)}`,
        `${slug}@company.com`,
        designation,
        deptName(i),
        `${day}/08/2026`,
        'Mumbai HO',
        manager,
        bloodGroup,
        `${100000000000 + i}`,
        'SBIN0001234',
        `${25000 + i * 1000}`,
      ];
    });
    downloadCsv('employee_import_template.csv', [[...IMPORT_TEMPLATE_HEADERS], ...examples]);
  };

  const toggleRow = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const validCount = previewRows.filter((r) => r._errors.length === 0).length;
  const errorCount = previewRows.length - validCount;
  const totalPreviewPages = Math.max(1, Math.ceil(previewRows.length / PREVIEW_PAGE_SIZE));
  const pagedPreviewRows = previewRows.slice(
    previewPage * PREVIEW_PAGE_SIZE,
    (previewPage + 1) * PREVIEW_PAGE_SIZE
  );

  const toBulkImportRow = (
    r: ImportPreviewRow,
    confirmAccountLinkOverwrite?: boolean
  ): BulkImportRow => ({
    row: r._row,
    name: r.name,
    phone: r.phone,
    email: r.email || undefined,
    empCode: r.empCode || undefined,
    designation: r.designation || undefined,
    department: r.department || undefined,
    joiningDate: r.joiningDate || undefined,
    workLocation: r.workLocation || undefined,
    managerName: r.managerName || undefined,
    bloodGroup: r.bloodGroup || undefined,
    bankAccount: r.bankAccount || undefined,
    ifscCode: r.ifscCode || undefined,
    monthlySalary: r.monthlySalary ? Number(r.monthlySalary) : undefined,
    ...(confirmAccountLinkOverwrite ? { confirmAccountLinkOverwrite: true } : {}),
  });

  const handleImport = async () => {
    if (!requireCompanySelected()) return;
    const rowsToImport = previewRows.filter((r) => selectedIds.has(r._id));
    if (rowsToImport.length === 0) return;

    setImporting(true);
    const chunks: ImportPreviewRow[][] = [];
    for (let i = 0; i < rowsToImport.length; i += IMPORT_CHUNK_SIZE) {
      chunks.push(rowsToImport.slice(i, i + IMPORT_CHUNK_SIZE));
    }
    setProgress({ done: 0, total: chunks.length });

    const created: { row: number; employeeId: string; empCode: string | null; name: string }[] = [];
    const errors: { row: number; error: string }[] = [];
    const pending: BulkImportResult['pendingLinkConfirmations'] = [];

    for (const chunk of chunks) {
      try {
        const payload: BulkImportRow[] = chunk.map((r) => toBulkImportRow(r));
        const chunkResult = await bulkImportMutation.mutateAsync(payload);
        created.push(...chunkResult.created);
        errors.push(...chunkResult.errors);
        pending.push(...chunkResult.pendingLinkConfirmations);
      } catch {
        for (const r of chunk) {
          errors.push({
            row: r._row,
            error: 'Import request failed for this batch. Please retry.',
          });
        }
      }
      setProgress((p) => ({ ...p, done: p.done + 1 }));
    }

    setResult({ created, errors });
    setPendingLinkConfirmations(pending);
    setImporting(false);
    setStep('results');
    if (created.length > 0) {
      toast.success(`Imported ${created.length} employee${created.length !== 1 ? 's' : ''}.`);
    }
    if (pending.length > 0) {
      toast.message(
        `${pending.length} row${pending.length !== 1 ? 's' : ''} need${pending.length === 1 ? 's' : ''} your confirmation before linking — see below.`
      );
    }
  };

  const handleConfirmPendingLinks = async () => {
    if (pendingLinkConfirmations.length === 0) return;
    setConfirmingLinks(true);
    try {
      const rowById = new Map(previewRows.map((r) => [r._row, r]));
      const payload: BulkImportRow[] = pendingLinkConfirmations
        .map((p) => rowById.get(p.row))
        .filter((r): r is ImportPreviewRow => Boolean(r))
        .map((r) => toBulkImportRow(r, true));
      const confirmResult = await bulkImportMutation.mutateAsync(payload);
      setResult((prev) => ({
        created: [...(prev?.created ?? []), ...confirmResult.created],
        errors: [...(prev?.errors ?? []), ...confirmResult.errors],
      }));
      // Rows that succeeded (or hit a different error this time) are done;
      // anything the backend reports as still pending — the confirm flag
      // didn't change the diff, e.g. re-run with stale data — stays visible.
      setPendingLinkConfirmations(confirmResult.pendingLinkConfirmations);
      if (confirmResult.created.length > 0) {
        toast.success(
          `Linked ${confirmResult.created.length} employee${confirmResult.created.length !== 1 ? 's' : ''}.`
        );
      }
    } catch {
      toast.error('Failed to confirm linking. Please retry.');
    } finally {
      setConfirmingLinks(false);
    }
  };

  const exportFailedRows = () => {
    if (!result || result.errors.length === 0) return;
    const rowById = new Map(previewRows.map((r) => [r._row, r]));
    const failedRows = result.errors.map((e) => {
      const r = rowById.get(e.row);
      return [
        r?.name ?? '',
        r?.empCode ?? '',
        r?.phone ?? '',
        r?.email ?? '',
        r?.designation ?? '',
        r?.department ?? '',
        r?.joiningDateDisplay ?? '',
        r?.workLocation ?? '',
        r?.managerName ?? '',
        r?.bloodGroup ?? '',
        r?.bankAccount ?? '',
        r?.ifscCode ?? '',
        r?.monthlySalary ?? '',
        e.error,
      ];
    });
    downloadCsv('employee_import_failed_rows.csv', [
      [...IMPORT_TEMPLATE_HEADERS, 'Error'],
      ...failedRows,
    ]);
  };

  const closable = !importing;

  return (
    <ModalPortal>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: modal backdrop dismiss */}
      <div
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)',
        padding: 16,
      }}
      onClick={() => closable && onClose()}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && closable) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-modal-title"
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          width: '100%',
          maxWidth: step === 'preview' ? 1080 : 760,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: T.font,
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 20px 14px',
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                background: T.primaryBg,
                border: `1px solid color-mix(in oklch, var(--primary) 25%, transparent)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: T.primary,
                flexShrink: 0,
              }}
            >
              <IconUpload size={16} strokeWidth={2} />
            </div>
            <div>
              <h2
                id="import-modal-title"
                style={{ fontSize: 16, fontWeight: 700, color: T.fg, margin: 0 }}
              >
                Import Employees from Excel
              </h2>
              <p style={{ fontSize: 12, color: T.mutedFg, margin: 0 }}>
                {step === 'guide' && 'Bulk-add employees from a spreadsheet'}
                {step === 'preview' &&
                  `${validCount} ready to import${errorCount > 0 ? `, ${errorCount} need fixing` : ''}`}
                {step === 'results' &&
                  result &&
                  `${result.created.length} created${result.errors.length > 0 ? `, ${result.errors.length} failed` : ''}`}
              </p>
            </div>
          </div>
          {closable && (
            <button
              type="button"
              onClick={onClose}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: 8,
                border: 'none',
                background: T.muted,
                color: T.mutedFg,
                cursor: 'pointer',
              }}
              aria-label="Close"
            >
              <IconX size={16} />
            </button>
          )}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {step === 'guide' && (
            <div>
              <SectionTitle first>Required &amp; Optional Columns</SectionTitle>
              <div style={{ overflowX: 'auto', marginBottom: 16 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th
                        style={{
                          textAlign: 'left',
                          padding: '6px 8px',
                          color: T.mutedFg,
                          borderBottom: `1px solid ${T.border}`,
                        }}
                      >
                        Column
                      </th>
                      <th
                        style={{
                          textAlign: 'left',
                          padding: '6px 8px',
                          color: T.mutedFg,
                          borderBottom: `1px solid ${T.border}`,
                        }}
                      >
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Name', 'Required.'],
                      [
                        'Employee ID',
                        'Optional. Leave blank to auto-generate (e.g. "EMP001"). If given, must be unique across employees in your organization.',
                      ],
                      [
                        'Phone',
                        'Required. If this number already has a login account, that account is automatically linked — no new account is created. Otherwise the employee is created without a login (shows up under "Create New User Account" later).',
                      ],
                      ['Email', 'Optional. Must be unique across employees.'],
                      ['Designation', 'Optional.'],
                      ['Department', 'Optional. Must match an existing department name.'],
                      ['Joining Date', 'Optional. Format dd/mm/yyyy.'],
                      ['Work Location', 'Optional.'],
                      ['Manager Name', 'Optional.'],
                      ['Blood Group', 'Optional.'],
                      ['Bank Account', 'Optional.'],
                      ['IFSC Code', 'Optional.'],
                      ['Monthly Salary', 'Optional. Numbers only, no currency symbol or commas.'],
                    ].map(([col, note]) => (
                      <tr key={col}>
                        <td
                          style={{
                            padding: '6px 8px',
                            fontWeight: 600,
                            color: T.fg,
                            borderBottom: `1px solid ${T.border}`,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {col}
                        </td>
                        <td
                          style={{
                            padding: '6px 8px',
                            color: T.mutedFg,
                            borderBottom: `1px solid ${T.border}`,
                          }}
                        >
                          {note}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                onClick={downloadTemplate}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: `1px solid ${T.border}`,
                  background: T.muted,
                  color: T.fg,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: T.font,
                  marginBottom: 18,
                }}
              >
                <IconDownload size={14} />
                Download Template
              </button>

              {parseError && (
                <p style={{ fontSize: 12, color: T.danger, marginBottom: 10 }}>{parseError}</p>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '100%',
                  padding: '28px 16px',
                  borderRadius: 12,
                  border: `1.5px dashed ${T.border}`,
                  background: T.muted,
                  color: T.mutedFg,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: T.font,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <IconUpload size={22} strokeWidth={1.5} color={T.primary} />
                Click to select a .xlsx, .xls, or .csv file
              </button>
            </div>
          )}

          {step === 'preview' && (
            <div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <div
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: T.successBg,
                    border: `1px solid color-mix(in oklch, var(--success) 25%, transparent)`,
                  }}
                >
                  <p style={{ fontSize: 11, color: T.mutedFg, margin: 0 }}>Total rows</p>
                  <p style={{ fontSize: 20, fontWeight: 700, color: T.fg, margin: 0 }}>
                    {previewRows.length}
                  </p>
                </div>
                <div
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: T.successBg,
                    border: `1px solid color-mix(in oklch, var(--success) 25%, transparent)`,
                  }}
                >
                  <p style={{ fontSize: 11, color: T.mutedFg, margin: 0 }}>Ready</p>
                  <p style={{ fontSize: 20, fontWeight: 700, color: T.success, margin: 0 }}>
                    {validCount}
                  </p>
                </div>
                <div
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: T.dangerBg,
                    border: `1px solid color-mix(in oklch, var(--danger) 25%, transparent)`,
                  }}
                >
                  <p style={{ fontSize: 11, color: T.mutedFg, margin: 0 }}>Needs fixing</p>
                  <p style={{ fontSize: 20, fontWeight: 700, color: T.danger, margin: 0 }}>
                    {errorCount}
                  </p>
                </div>
              </div>

              <div
                style={{
                  overflowX: 'auto',
                  overflowY: 'auto',
                  maxHeight: 360,
                  border: `1px solid ${T.border}`,
                  borderRadius: 10,
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: T.muted }}>
                      <th style={{ padding: '8px', textAlign: 'left' }} />
                      <th style={{ padding: '8px', textAlign: 'left', color: T.mutedFg }}>Row</th>
                      <th style={{ padding: '8px', textAlign: 'left', color: T.mutedFg }}>Name</th>
                      <th style={{ padding: '8px', textAlign: 'left', color: T.mutedFg }}>
                        Employee ID
                      </th>
                      <th style={{ padding: '8px', textAlign: 'left', color: T.mutedFg }}>Phone</th>
                      <th style={{ padding: '8px', textAlign: 'left', color: T.mutedFg }}>Email</th>
                      <th style={{ padding: '8px', textAlign: 'left', color: T.mutedFg }}>
                        Designation
                      </th>
                      <th style={{ padding: '8px', textAlign: 'left', color: T.mutedFg }}>
                        Department
                      </th>
                      <th style={{ padding: '8px', textAlign: 'left', color: T.mutedFg }}>
                        Joining Date
                      </th>
                      <th style={{ padding: '8px', textAlign: 'left', color: T.mutedFg }}>
                        Work Location
                      </th>
                      <th style={{ padding: '8px', textAlign: 'left', color: T.mutedFg }}>
                        Manager
                      </th>
                      <th style={{ padding: '8px', textAlign: 'left', color: T.mutedFg }}>
                        Blood Group
                      </th>
                      <th style={{ padding: '8px', textAlign: 'left', color: T.mutedFg }}>
                        Bank Account
                      </th>
                      <th style={{ padding: '8px', textAlign: 'left', color: T.mutedFg }}>IFSC</th>
                      <th style={{ padding: '8px', textAlign: 'left', color: T.mutedFg }}>
                        Salary
                      </th>
                      <th style={{ padding: '8px', textAlign: 'left', color: T.mutedFg }}>
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedPreviewRows.map((r) => (
                      <tr key={r._id} style={{ borderTop: `1px solid ${T.border}` }}>
                        <td style={{ padding: '8px' }}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(r._id)}
                            onChange={() => toggleRow(r._id)}
                          />
                        </td>
                        <td style={{ padding: '8px', color: T.mutedFg }}>{r._row}</td>
                        <td style={{ padding: '8px', color: T.fg, whiteSpace: 'nowrap' }}>
                          {r.name || '—'}
                        </td>
                        <td style={{ padding: '8px', color: T.mutedFg, whiteSpace: 'nowrap' }}>
                          {r.empCode || 'auto'}
                        </td>
                        <td style={{ padding: '8px', color: T.fg, whiteSpace: 'nowrap' }}>
                          {r.phone || '—'}
                        </td>
                        <td style={{ padding: '8px', color: T.fg, whiteSpace: 'nowrap' }}>
                          {r.email || '—'}
                        </td>
                        <td style={{ padding: '8px', color: T.fg, whiteSpace: 'nowrap' }}>
                          {r.designation || '—'}
                        </td>
                        <td style={{ padding: '8px', color: T.fg, whiteSpace: 'nowrap' }}>
                          {r.department || '—'}
                        </td>
                        <td style={{ padding: '8px', color: T.fg, whiteSpace: 'nowrap' }}>
                          {r.joiningDateDisplay || '—'}
                        </td>
                        <td style={{ padding: '8px', color: T.fg, whiteSpace: 'nowrap' }}>
                          {r.workLocation || '—'}
                        </td>
                        <td style={{ padding: '8px', color: T.fg, whiteSpace: 'nowrap' }}>
                          {r.managerName || '—'}
                        </td>
                        <td style={{ padding: '8px', color: T.fg, whiteSpace: 'nowrap' }}>
                          {r.bloodGroup || '—'}
                        </td>
                        <td style={{ padding: '8px', color: T.fg, whiteSpace: 'nowrap' }}>
                          {r.bankAccount || '—'}
                        </td>
                        <td style={{ padding: '8px', color: T.fg, whiteSpace: 'nowrap' }}>
                          {r.ifscCode || '—'}
                        </td>
                        <td style={{ padding: '8px', color: T.fg, whiteSpace: 'nowrap' }}>
                          {r.monthlySalary || '—'}
                        </td>
                        <td style={{ padding: '8px' }}>
                          {r._errors.length === 0 ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                color: T.success,
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <IconCheck size={13} /> OK
                            </span>
                          ) : (
                            <span
                              title={r._errors.join('; ')}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                color: T.danger,
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <IconAlertTriangle size={13} /> {r._errors[0]}
                              {r._errors.length > 1 ? ` (+${r._errors.length - 1} more)` : ''}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {previewRows.length > PREVIEW_PAGE_SIZE && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 10,
                  }}
                >
                  <p style={{ fontSize: 12, color: T.mutedFg, margin: 0 }}>
                    Showing {previewPage * PREVIEW_PAGE_SIZE + 1}–
                    {Math.min((previewPage + 1) * PREVIEW_PAGE_SIZE, previewRows.length)} of{' '}
                    {previewRows.length} rows
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setPreviewPage((p) => Math.max(0, p - 1))}
                      disabled={previewPage === 0}
                      style={{
                        height: 30,
                        padding: '0 12px',
                        borderRadius: 8,
                        border: `1px solid ${T.border}`,
                        background: T.muted,
                        color: T.fg,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: previewPage === 0 ? 'not-allowed' : 'pointer',
                        opacity: previewPage === 0 ? 0.5 : 1,
                        fontFamily: T.font,
                      }}
                    >
                      Previous
                    </button>
                    <span style={{ fontSize: 12, color: T.mutedFg }}>
                      Page {previewPage + 1} of {totalPreviewPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewPage((p) => Math.min(totalPreviewPages - 1, p + 1))}
                      disabled={previewPage >= totalPreviewPages - 1}
                      style={{
                        height: 30,
                        padding: '0 12px',
                        borderRadius: 8,
                        border: `1px solid ${T.border}`,
                        background: T.muted,
                        color: T.fg,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: previewPage >= totalPreviewPages - 1 ? 'not-allowed' : 'pointer',
                        opacity: previewPage >= totalPreviewPages - 1 ? 0.5 : 1,
                        fontFamily: T.font,
                      }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}

              {importing && (
                <p style={{ fontSize: 12, color: T.mutedFg, marginTop: 10 }}>
                  Importing batch {progress.done} of {progress.total}…
                </p>
              )}
            </div>
          )}

          {step === 'results' && result && (
            <div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <div
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: T.successBg,
                    border: `1px solid color-mix(in oklch, var(--success) 25%, transparent)`,
                  }}
                >
                  <p style={{ fontSize: 11, color: T.mutedFg, margin: 0 }}>Created</p>
                  <p style={{ fontSize: 20, fontWeight: 700, color: T.success, margin: 0 }}>
                    {result.created.length}
                  </p>
                </div>
                <div
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: T.dangerBg,
                    border: `1px solid color-mix(in oklch, var(--danger) 25%, transparent)`,
                  }}
                >
                  <p style={{ fontSize: 11, color: T.mutedFg, margin: 0 }}>Failed</p>
                  <p style={{ fontSize: 20, fontWeight: 700, color: T.danger, margin: 0 }}>
                    {result.errors.length}
                  </p>
                </div>
                {pendingLinkConfirmations.length > 0 && (
                  <div
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      borderRadius: 10,
                      background: T.warningBg,
                      border: `1px solid color-mix(in oklch, var(--warning) 25%, transparent)`,
                    }}
                  >
                    <p style={{ fontSize: 11, color: T.mutedFg, margin: 0 }}>Needs Confirmation</p>
                    <p style={{ fontSize: 20, fontWeight: 700, color: T.warning, margin: 0 }}>
                      {pendingLinkConfirmations.length}
                    </p>
                  </div>
                )}
              </div>

              {pendingLinkConfirmations.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 8,
                    }}
                  >
                    <p style={{ fontSize: 13, fontWeight: 700, color: T.fg, margin: 0 }}>
                      These rows match an existing login account with different details
                    </p>
                    <button
                      type="button"
                      onClick={handleConfirmPendingLinks}
                      disabled={confirmingLinks}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 8,
                        border: 'none',
                        background: T.primary,
                        color: T.primaryFg,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: confirmingLinks ? 'not-allowed' : 'pointer',
                        fontFamily: T.font,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {confirmingLinks ? 'Linking…' : 'Confirm & Link All'}
                    </button>
                  </div>
                  <p style={{ fontSize: 12, color: T.mutedFg, marginTop: 0, marginBottom: 10 }}>
                    Confirming will overwrite each account below with this import's data and link it
                    to the employee. Re-import without confirming to skip them instead.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {pendingLinkConfirmations.map((p) => (
                      <div
                        key={p.row}
                        style={{
                          border: `1px solid ${T.border}`,
                          borderRadius: 10,
                          padding: 12,
                        }}
                      >
                        <p style={{ fontSize: 12, fontWeight: 600, color: T.fg, margin: 0 }}>
                          Row {p.row} — {p.name} ({p.phone})
                        </p>
                        <div style={{ marginTop: 8 }}>
                          <AccountLinkDiffTable diffs={p.diffs} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.errors.length > 0 && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                    <button
                      type="button"
                      onClick={exportFailedRows}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 12px',
                        borderRadius: 8,
                        border: `1px solid ${T.border}`,
                        background: T.muted,
                        color: T.fg,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: T.font,
                      }}
                    >
                      <IconDownload size={13} />
                      Export Failed Rows
                    </button>
                  </div>
                  <div
                    style={{
                      overflowX: 'auto',
                      overflowY: 'auto',
                      maxHeight: 300,
                      border: `1px solid ${T.border}`,
                      borderRadius: 10,
                    }}
                  >
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: T.muted }}>
                          <th style={{ padding: '8px', textAlign: 'left', color: T.mutedFg }}>
                            Row
                          </th>
                          <th style={{ padding: '8px', textAlign: 'left', color: T.mutedFg }}>
                            Error
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.errors.map((e) => (
                          <tr key={e.row} style={{ borderTop: `1px solid ${T.border}` }}>
                            <td style={{ padding: '8px', color: T.mutedFg }}>{e.row}</td>
                            <td style={{ padding: '8px', color: T.danger }}>{e.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p style={{ fontSize: 11, color: T.mutedFg, marginTop: 8 }}>
                    Fix the highlighted cells in the exported file and re-import it to retry just
                    these rows.
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '14px 20px',
            borderTop: `1px solid ${T.border}`,
            gap: 10,
          }}
        >
          {step === 'preview' && (
            <>
              <button
                type="button"
                onClick={() => setStep('guide')}
                disabled={importing}
                style={{
                  height: 36,
                  padding: '0 16px',
                  borderRadius: 8,
                  border: `1px solid ${T.border}`,
                  background: T.muted,
                  color: T.fg,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: importing ? 'not-allowed' : 'pointer',
                  fontFamily: T.font,
                }}
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={importing || selectedIds.size === 0}
                style={{
                  height: 36,
                  padding: '0 20px',
                  borderRadius: 8,
                  border: 'none',
                  background: T.primary,
                  color: T.primaryFg,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: importing || selectedIds.size === 0 ? 'not-allowed' : 'pointer',
                  opacity: importing || selectedIds.size === 0 ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontFamily: T.font,
                  whiteSpace: 'nowrap',
                }}
              >
                {importing ? (
                  <>
                    <IconLoader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} />
                    Importing…
                  </>
                ) : (
                  `Import ${selectedIds.size} Selected`
                )}
              </button>
            </>
          )}
          {step === 'results' && (
            <button
              type="button"
              onClick={onClose}
              style={{
                height: 36,
                padding: '0 20px',
                borderRadius: 8,
                border: 'none',
                background: T.primary,
                color: T.primaryFg,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: T.font,
              }}
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  </ModalPortal>
);
}

// ── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  Icon,
  tint,
  vc,
}: {
  label: string;
  value: number;
  Icon: React.ComponentType<{ className?: string }>;
  tint: string;
  vc: string;
}) {
  return (
    <div className="group rounded-xl border border-border bg-card p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg sm:p-5">
      <div
        className={cn('mb-3 inline-flex h-9 w-9 items-center justify-center rounded-[9px]', tint)}
      >
        <Icon className="h-5 w-5" />
      </div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
        {label}
      </p>
      <p className={cn('text-[28px] font-bold leading-none tracking-[-0.02em] tabular-nums', vc)}>
        {value.toLocaleString('en-IN')}
      </p>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function MainAfterJoiningWork() {
  const requireCompanySelected = useRequireCompanySelected();
  const user = useAppSelector(selectUser);
  const { data: employees = [], isLoading } = useOnboardingList();
  const { data: checklistConfig, isLoading: configLoading } = useChecklistConfig();
  const updateMutation = useUpdateOnboarding();
  const saveConfigMutation = useSaveChecklistConfig();

  const config: ChecklistConfig = useMemo(() => {
    return {
      disabledStandardKeys: Array.isArray(checklistConfig?.disabledStandardKeys)
        ? checklistConfig.disabledStandardKeys
        : [],
      globalCustomItems: Array.isArray(checklistConfig?.globalCustomItems)
        ? checklistConfig.globalCustomItems
        : [],
    };
  }, [checklistConfig]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [deptFilter, setDeptFilter] = useState('');
  const [modalEmp, setModalEmp] = useState<OnboardingEmployee | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [directJoinOpen, setDirectJoinOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);

  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.department?.name) set.add(e.department.name);
    });
    return Array.from(set).sort();
  }, [employees]);

  const filtered = useMemo(() => {
    return employees.filter((emp) => {
      const q = search.toLowerCase();
      if (
        q &&
        !emp.name.toLowerCase().includes(q) &&
        !(emp.empCode ?? emp.employeeId).toLowerCase().includes(q) &&
        !(emp.designation ?? '').toLowerCase().includes(q)
      )
        return false;
      if (deptFilter && emp.department?.name !== deptFilter) return false;
      const { done, total } = getChecklistProgress(
        emp,
        config.disabledStandardKeys,
        config.globalCustomItems
      );
      if (statusFilter === 'pending' && done !== 0) return false;
      if (statusFilter === 'partial' && (done === 0 || done === total)) return false;
      if (statusFilter === 'done' && done !== total) return false;
      return true;
    });
  }, [employees, search, deptFilter, statusFilter, config]);

  const stats = useMemo(() => {
    const total = employees.length;
    const done = employees.filter((e) => {
      const p = getChecklistProgress(e, config.disabledStandardKeys, config.globalCustomItems);
      return p.done === p.total && p.total > 0;
    }).length;
    const partial = employees.filter((e) => {
      const p = getChecklistProgress(e, config.disabledStandardKeys, config.globalCustomItems);
      return p.done > 0 && p.done < p.total;
    }).length;
    const pending = employees.filter(
      (e) =>
        getChecklistProgress(e, config.disabledStandardKeys, config.globalCustomItems).done === 0
    ).length;
    return { total, done, partial, pending };
  }, [employees, config]);

  const handleSaveChecklist = async (
    emp: OnboardingEmployee,
    checklist: Record<string, boolean>,
    customItems: CustomChecklistItem[]
  ) => {
    setSavingId(emp.id);
    try {
      await updateMutation.mutateAsync({
        id: String(emp.id),
        data: { onboardingChecklist: checklist, customChecklistItems: customItems },
        actAsTenantId: resolveActAsTenant(emp.tenant, user?.tenantId),
      });
      setModalEmp(null);
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveConfig = async (cfg: ChecklistConfig) => {
    if (!requireCompanySelected()) return;
    await saveConfigMutation.mutateAsync(cfg);
    setSettingsOpen(false);
  };

  return (
    <div className="bg-background text-foreground grow">
      <div className="mx-auto max-w-350 space-y-5 px-4 pt-6 pb-10 sm:px-6 lg:px-8">
        {/* Page heading */}
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mb-0.5 text-[12px] text-muted-foreground">HR / Onboarding</p>
            <h1 className="text-[18px] font-bold leading-tight tracking-[-0.03em] sm:text-[22px]">
              After Joining Work
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} className="sm:mt-5">
            <button
              type="button"
              onClick={() => {
                if (!requireCompanySelected()) return;
                setDirectJoinOpen(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '8px 16px',
                borderRadius: 10,
                border: 'none',
                background: T.primary,
                color: T.primaryFg,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: T.font,
                whiteSpace: 'nowrap',
              }}
            >
              <IconUserPlus size={15} strokeWidth={2} />
              Add Employee
            </button>
            <button
              type="button"
              onClick={() => {
                if (!requireCompanySelected()) return;
                setImportOpen(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '8px 16px',
                borderRadius: 10,
                border: `1px solid ${T.border}`,
                background: T.muted,
                color: T.fg,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: T.font,
                whiteSpace: 'nowrap',
              }}
            >
              <IconUpload size={15} strokeWidth={2} />
              Import from Excel
            </button>
            <button
              type="button"
              onClick={() => {
                if (!requireCompanySelected()) return;
                setSettingsOpen(true);
              }}
              disabled={configLoading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '8px 16px',
                borderRadius: 10,
                border: `1.5px solid ${T.border}`,
                background: T.card,
                color: T.fg,
                fontSize: 13,
                fontWeight: 600,
                cursor: configLoading ? 'not-allowed' : 'pointer',
                opacity: configLoading ? 0.6 : 1,
                fontFamily: T.font,
                whiteSpace: 'nowrap',
              }}
            >
              <IconSettings size={15} strokeWidth={2} />
              Checklist Settings
            </button>
          </div>
        </div>

        {/* Hero banner */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <div className="flex flex-wrap items-center gap-4 bg-linear-to-br from-card to-card/50 px-5 py-5 sm:px-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/12 text-primary">
              <IconBriefcase className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-[18px] font-bold tracking-[-0.02em]">Onboarding Tracker</h2>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                Track after-joining checklist for newly joined employees
              </p>
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
          <StatCard
            label="Total"
            value={stats.total}
            Icon={IconUsers}
            tint="bg-primary/10 text-primary"
            vc="text-foreground"
          />
          <StatCard
            label="Not Started"
            value={stats.pending}
            Icon={IconClock}
            tint="bg-warning/10 text-warning"
            vc="text-warning"
          />
          <StatCard
            label="In Progress"
            value={stats.partial}
            Icon={IconFilter}
            tint="bg-info/10 text-info"
            vc="text-info"
          />
          <StatCard
            label="Completed"
            value={stats.done}
            Icon={IconCheck}
            tint="bg-success/10 text-success"
            vc="text-success"
          />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 0 }}>
            <IconSearch
              size={15}
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: T.mutedFg,
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              placeholder="Search by name, ID, designation…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                height: 36,
                paddingLeft: 32,
                paddingRight: 12,
                borderRadius: 8,
                border: `1px solid ${T.border}`,
                background: T.muted,
                color: T.fg,
                fontSize: 13,
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: T.font,
              }}
            />
          </div>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            style={{
              height: 36,
              padding: '0 28px 0 10px',
              borderRadius: 8,
              border: `1px solid ${T.border}`,
              background: T.muted,
              color: deptFilter ? T.fg : T.mutedFg,
              fontSize: 13,
              outline: 'none',
              cursor: 'pointer',
              fontFamily: T.font,
            }}
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: 6 }}>
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatusFilter(opt.value)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 8,
                  border: `1.5px solid ${statusFilter === opt.value ? T.primary : T.border}`,
                  background: statusFilter === opt.value ? T.primaryBg : T.muted,
                  color: statusFilter === opt.value ? T.primary : T.mutedFg,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  fontFamily: T.font,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 0',
              color: T.mutedFg,
              gap: 10,
            }}
          >
            <IconLoader2 size={20} style={{ animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontSize: 14 }}>Loading employees…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: T.mutedFg, fontSize: 14 }}>
            No employees found.
          </div>
        ) : (
          <div
            style={{
              background: T.card,
              border: `1px solid ${T.border}`,
              borderRadius: 12,
              overflowX: 'auto',
            }}
          >
            <table
              style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 700 }}
            >
              <thead>
                <tr style={{ background: T.muted, borderBottom: `1px solid ${T.border}` }}>
                  {[
                    'Action',
                    'Employee',
                    'Department',
                    'Designation',
                    'Joining Date',
                    'Progress',
                    'Planned At',
                    'Processed At',
                    'Delay',
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '10px 14px',
                        textAlign: 'left',
                        fontWeight: 600,
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        color: T.mutedFg,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp, idx) => {
                  const { done, total } = getChecklistProgress(
                    emp,
                    config.disabledStandardKeys,
                    config.globalCustomItems
                  );
                  const pct = total > 0 ? (done / total) * 100 : 0;
                  const isComplete = done === total && total > 0;
                  return (
                    <tr
                      key={emp.id}
                      style={{
                        borderBottom:
                          idx < filtered.length - 1 ? `1px solid ${T.border}` : undefined,
                        background: idx % 2 === 0 ? T.card : T.card2,
                      }}
                    >
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          onClick={() => setModalEmp(emp)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '5px 12px',
                            borderRadius: 8,
                            border: `1.5px solid ${isComplete ? T.success : T.primary}`,
                            background: isComplete ? T.successBg : T.primaryBg,
                            color: isComplete ? T.success : T.primary,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontFamily: T.font,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <IconSettings size={13} />
                          {isComplete ? 'Done' : 'Process'}
                        </button>
                      </td>
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600, color: T.fg }}>{emp.name}</div>
                        <div style={{ fontSize: 11, color: T.mutedFg, marginTop: 1 }}>
                          {emp.empCode ?? emp.employeeId}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', color: T.mutedFg, whiteSpace: 'nowrap' }}>
                        {emp.department?.name ?? '—'}
                      </td>
                      <td style={{ padding: '12px 14px', color: T.mutedFg, whiteSpace: 'nowrap' }}>
                        {emp.designation ?? '—'}
                      </td>
                      <td style={{ padding: '12px 14px', color: T.mutedFg, whiteSpace: 'nowrap' }}>
                        {emp.joiningDate
                          ? new Date(emp.joiningDate).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td style={{ padding: '12px 14px', minWidth: 100 }}>
                        <div style={{ fontSize: 11, color: T.mutedFg, marginBottom: 4 }}>
                          {done}/{total}
                        </div>
                        <div
                          style={{
                            height: 6,
                            borderRadius: 3,
                            background: T.muted,
                            overflow: 'hidden',
                            width: 80,
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              width: `${pct}%`,
                              background: isComplete ? T.success : done > 0 ? T.primary : T.border,
                              borderRadius: 3,
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </div>
                      </td>
                      <td
                        style={{
                          padding: '12px 14px',
                          color: T.mutedFg,
                          whiteSpace: 'nowrap',
                          fontSize: 12,
                        }}
                      >
                        {emp.processedAt ? (
                          fmtDt(emp.tatPlannedAt)
                        ) : emp.yourProjectedPlannedAt ? (
                          <>
                            {fmtDt(emp.yourProjectedPlannedAt)}
                            <span
                              style={{
                                marginLeft: 4,
                                fontSize: 10,
                                color: T.mutedFg,
                                opacity: 0.7,
                              }}
                            >
                              (estimate)
                            </span>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td
                        style={{
                          padding: '12px 14px',
                          color: T.mutedFg,
                          whiteSpace: 'nowrap',
                          fontSize: 12,
                        }}
                      >
                        {fmtDt(emp.processedAt)}
                        {emp.processedAt && emp.processedBy?.name && (
                          <div style={{ fontSize: 10, opacity: 0.7 }}>
                            by {emp.processedBy.name}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <DelayBadge delayMinutes={emp.tatDelayMinutes} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>

      {/* Checklist modal */}
      {modalEmp && (
        <ChecklistModal
          emp={modalEmp}
          config={config}
          onClose={() => setModalEmp(null)}
          onSave={(checklist, customItems) => handleSaveChecklist(modalEmp, checklist, customItems)}
          saving={savingId === modalEmp.id}
        />
      )}

      {/* Global settings modal */}
      {settingsOpen && (
        <ChecklistSettingsModal
          config={config}
          onClose={() => setSettingsOpen(false)}
          onSave={handleSaveConfig}
          saving={saveConfigMutation.isPending}
        />
      )}

      {/* Direct joining modal */}
      {directJoinOpen && <DirectJoiningModal onClose={() => setDirectJoinOpen(false)} />}
      {importOpen && <EmployeeImportModal onClose={() => setImportOpen(false)} />}
    </div>
  );
}
