'use client';

import {
  IconCheck,
  IconClock,
  IconCurrencyRupee,
  IconLoader2,
  IconSettings,
  IconShieldCheck,
} from '@tabler/icons-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useRequireCompanySelected } from '@/features/organization/hooks/useRequireCompanySelected';
import { api } from '@/lib/axios';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PayPolicy {
  otEnabled: boolean;
  otMode: 'PAY' | 'COMP_OFF';
  standardShiftHours: number;
  overtimeRateMultiplier: number;
  weekendOtMultiplier: number;
  holidayOtMultiplier: number;
  weekendWorkMultiplier: number;
  holidayWorkMultiplier: number;
  lateGraceMinutes: number;
  lateDeductType: 'PER_MINUTE' | 'HALF_DAY' | 'NONE';
  halfDayAfterLateMinutes: number;
  punchMisTreatment: 'ABSENT' | 'HALF_DAY' | 'PRESENT';
  pfEnabled: boolean;
  pfEmployeeRate: number;
  pfEmployerRate: number;
  esiEnabled: boolean;
  esiEmployeeRate: number;
  esiEmployerRate: number;
  esiGrossLimit: number;
  professionalTaxEnabled: boolean;
}

const DEFAULT: PayPolicy = {
  otEnabled: true,
  otMode: 'PAY',
  standardShiftHours: 8,
  overtimeRateMultiplier: 1.5,
  weekendOtMultiplier: 1.5,
  holidayOtMultiplier: 2.0,
  weekendWorkMultiplier: 1.5,
  holidayWorkMultiplier: 2.0,
  lateGraceMinutes: 15,
  lateDeductType: 'NONE',
  halfDayAfterLateMinutes: 120,
  punchMisTreatment: 'HALF_DAY',
  pfEnabled: true,
  pfEmployeeRate: 12,
  pfEmployerRate: 12,
  esiEnabled: true,
  esiEmployeeRate: 0.75,
  esiEmployerRate: 3.25,
  esiGrossLimit: 21000,
  professionalTaxEnabled: false,
};

// ── API ───────────────────────────────────────────────────────────────────────

const fetchPolicy = async (): Promise<PayPolicy | null> => {
  const res = await api.get('/hrfms/salary/policy');
  return res.data.data ?? null;
};

const savePolicy = async (draft: PayPolicy): Promise<PayPolicy> => {
  const res = await api.post('/hrfms/salary/policy', draft);
  return res.data.data;
};

// ── Primitives ────────────────────────────────────────────────────────────────

const Row: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({
  label,
  hint,
  children,
}) => (
  <div className="grid grid-cols-1 gap-2 py-3 border-b border-border last:border-0 sm:grid-cols-[1fr_auto] sm:items-center">
    <div>
      <p className="text-[13px] font-medium">{label}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">{hint}</p>}
    </div>
    <div className="flex items-center gap-2 flex-wrap">{children}</div>
  </div>
);

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string }> = ({
  checked,
  onChange,
  label,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={cn(
      'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors',
      checked ? 'bg-primary' : 'bg-muted-foreground/30'
    )}
  >
    <span
      className={cn(
        'inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
        checked ? 'translate-x-5' : 'translate-x-0'
      )}
    />
    <span className="sr-only">{label}</span>
  </button>
);

const NumInput: React.FC<{
  id: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  prefix?: string;
  width?: string;
}> = ({ id, value, onChange, min = 0, max, step = 1, suffix, prefix, width = 'w-24' }) => (
  <div className="flex items-center gap-1.5">
    {prefix && <span className="text-[13px] text-muted-foreground">{prefix}</span>}
    <input
      id={id}
      type="number"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={cn(
        'h-9 rounded-lg border border-border bg-muted px-3 text-[13px] tabular-nums outline-none focus:border-primary',
        width
      )}
    />
    {suffix && <span className="text-[12px] text-muted-foreground">{suffix}</span>}
  </div>
);

// ── Tab definitions ────────────────────────────────────────────────────────────

type TabId = 'overtime' | 'late' | 'pf' | 'esi' | 'pt';

const TABS: { id: TabId; label: string; icon: React.ReactNode; hint: string }[] = [
  {
    id: 'overtime',
    label: 'Overtime',
    icon: <IconClock size={15} />,
    hint: 'OT pay & multipliers',
  },
  {
    id: 'late',
    label: 'Late & Punch Mis',
    icon: <IconClock size={15} />,
    hint: 'Grace, deductions',
  },
  {
    id: 'pf',
    label: 'Provident Fund',
    icon: <IconCurrencyRupee size={15} />,
    hint: 'PF contribution rates',
  },
  {
    id: 'esi',
    label: 'ESI',
    icon: <IconShieldCheck size={15} />,
    hint: 'ESIC wage ceiling & rates',
  },
  {
    id: 'pt',
    label: 'Professional Tax',
    icon: <IconCurrencyRupee size={15} />,
    hint: 'State PT toggle',
  },
];

// ── Tab panels ─────────────────────────────────────────────────────────────────

const OvertimeTab: React.FC<{
  draft: PayPolicy;
  set: <K extends keyof PayPolicy>(k: K, v: PayPolicy[K]) => void;
}> = ({ draft, set }) => (
  <div>
    <Row
      label="Enable Overtime"
      hint="When off, no OT pay or comp-off is calculated regardless of hours worked"
    >
      <Toggle
        checked={draft.otEnabled}
        onChange={(v) => set('otEnabled', v)}
        label="Enable overtime"
      />
      <span
        className={cn(
          'text-[12px] font-semibold px-2 py-0.5 rounded-md',
          draft.otEnabled ? 'bg-green-500/12 text-green-600' : 'bg-muted text-muted-foreground'
        )}
      >
        {draft.otEnabled ? 'Enabled' : 'Disabled'}
      </span>
    </Row>

    {draft.otEnabled && (
      <>
        <Row
          label="Standard Shift Hours"
          hint="Used to derive hourly rate from daily salary for OT calculation"
        >
          <NumInput
            id="shift-hours"
            value={draft.standardShiftHours}
            onChange={(v) => set('standardShiftHours', v)}
            min={4}
            max={12}
            step={0.5}
            suffix="hrs / day"
            width="w-20"
          />
        </Row>

        <Row
          label="Weekend / Holiday Settlement"
          hint="PAY — extra salary added to payslip · COMP OFF — 1 compensatory leave credited instead"
        >
          <div className="flex gap-2">
            {(['PAY', 'COMP_OFF'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => set('otMode', mode)}
                className={cn(
                  'rounded-lg border px-4 py-2 text-[13px] font-semibold transition-colors',
                  draft.otMode === mode
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-muted text-muted-foreground hover:bg-muted-foreground/10'
                )}
              >
                {mode === 'PAY' ? '💰 Pay Extra' : '🏖️ Comp Off'}
              </button>
            ))}
          </div>
        </Row>

        {draft.otMode === 'COMP_OFF' && (
          <div className="my-2 rounded-lg border border-orange-500/30 bg-orange-500/5 px-4 py-3 text-[12px] text-orange-600">
            Comp Off mode: approved weekend / holiday claims will credit 1 leave day to the
            employee's balance instead of paying extra salary.
          </div>
        )}

        <div className="mt-2 pt-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Pay Multipliers
          </p>
          <Row
            label="Weekday OT Multiplier"
            hint="Applied to hours worked beyond the standard shift on regular weekdays"
          >
            <NumInput
              id="ot-mult"
              value={draft.overtimeRateMultiplier}
              onChange={(v) => set('overtimeRateMultiplier', v)}
              min={1}
              step={0.25}
              suffix="× hourly rate"
            />
          </Row>
          {draft.otMode === 'PAY' && (
            <>
              <Row
                label="Weekend Work Multiplier"
                hint="Applied to each weekend day worked (daily rate × this)"
              >
                <NumInput
                  id="weekend-mult"
                  value={draft.weekendWorkMultiplier}
                  onChange={(v) => set('weekendWorkMultiplier', v)}
                  min={1}
                  step={0.25}
                  suffix="× daily rate"
                />
              </Row>
              <Row
                label="Weekend OT Multiplier"
                hint="Applied to overtime hours worked on a weekend day (hourly rate × this)"
              >
                <NumInput
                  id="weekend-ot-mult"
                  value={draft.weekendOtMultiplier}
                  onChange={(v) => set('weekendOtMultiplier', v)}
                  min={1}
                  step={0.25}
                  suffix="× hourly rate"
                />
              </Row>
              <Row
                label="Holiday Work Multiplier"
                hint="Applied to each holiday day worked (daily rate × this)"
              >
                <NumInput
                  id="holiday-mult"
                  value={draft.holidayWorkMultiplier}
                  onChange={(v) => set('holidayWorkMultiplier', v)}
                  min={1}
                  step={0.25}
                  suffix="× daily rate"
                />
              </Row>
              <Row
                label="Holiday OT Multiplier"
                hint="Applied to overtime hours worked on a holiday (hourly rate × this)"
              >
                <NumInput
                  id="holiday-ot-mult"
                  value={draft.holidayOtMultiplier}
                  onChange={(v) => set('holidayOtMultiplier', v)}
                  min={1}
                  step={0.25}
                  suffix="× hourly rate"
                />
              </Row>
            </>
          )}
        </div>

        <div className="mt-4 rounded-lg border border-border bg-muted/40 px-4 py-3 text-[12px] text-muted-foreground space-y-0.5">
          <p className="font-semibold text-foreground mb-1">Formula preview</p>
          <p>Daily Rate = Monthly CTC ÷ Working Days</p>
          <p>Hourly Rate = Daily Rate ÷ {draft.standardShiftHours}h</p>
          <p>Weekday OT Pay = Weekday OT Hours × Hourly Rate × {draft.overtimeRateMultiplier}×</p>
          {draft.otMode === 'PAY' && (
            <>
              <p>
                Weekend Pay = (Weekend Days × Daily Rate × {draft.weekendWorkMultiplier}×) +
                (Weekend OT Hours × Hourly Rate × {draft.weekendOtMultiplier}×)
              </p>
              <p>
                Holiday Pay = (Holiday Days × Daily Rate × {draft.holidayWorkMultiplier}×) +
                (Holiday OT Hours × Hourly Rate × {draft.holidayOtMultiplier}×)
              </p>
            </>
          )}
        </div>
      </>
    )}
  </div>
);

const LateTab: React.FC<{
  draft: PayPolicy;
  set: <K extends keyof PayPolicy>(k: K, v: PayPolicy[K]) => void;
}> = ({ draft, set }) => (
  <div>
    <Row label="Grace Period" hint="Minutes after shift start before an employee is marked as late">
      <NumInput
        id="grace"
        value={draft.lateGraceMinutes}
        onChange={(v) => set('lateGraceMinutes', v)}
        min={0}
        max={60}
        suffix="mins"
      />
    </Row>
    <Row
      label="Late Deduction Type"
      hint="How salary is affected when an employee arrives late (beyond grace period)"
    >
      <select
        value={draft.lateDeductType}
        onChange={(e) => set('lateDeductType', e.target.value as PayPolicy['lateDeductType'])}
        className="h-9 cursor-pointer rounded-lg border border-border bg-muted px-3 text-[13px] outline-none focus:border-primary"
      >
        <option value="NONE">No Deduction</option>
        <option value="HALF_DAY">Mark as Half Day after threshold</option>
        <option value="PER_MINUTE">Deduct per minute late</option>
      </select>
    </Row>
    {draft.lateDeductType === 'HALF_DAY' && (
      <Row
        label="Half-Day Threshold"
        hint="Once late by this many minutes the day counts as half-day"
      >
        <NumInput
          id="half-day-mins"
          value={draft.halfDayAfterLateMinutes}
          onChange={(v) => set('halfDayAfterLateMinutes', v)}
          min={1}
          max={480}
          suffix="mins late"
        />
      </Row>
    )}
    <Row
      label="Punch Mis Treatment"
      hint="Applies when check-in is recorded but check-out is missing"
    >
      <select
        value={draft.punchMisTreatment}
        onChange={(e) => set('punchMisTreatment', e.target.value as PayPolicy['punchMisTreatment'])}
        className="h-9 cursor-pointer rounded-lg border border-border bg-muted px-3 text-[13px] outline-none focus:border-primary"
      >
        <option value="ABSENT">Treat as Absent</option>
        <option value="HALF_DAY">Treat as Half Day</option>
        <option value="PRESENT">Treat as Present (ignore)</option>
      </select>
    </Row>
  </div>
);

const PFTab: React.FC<{
  draft: PayPolicy;
  set: <K extends keyof PayPolicy>(k: K, v: PayPolicy[K]) => void;
}> = ({ draft, set }) => (
  <div>
    <Row label="Enable Provident Fund">
      <Toggle checked={draft.pfEnabled} onChange={(v) => set('pfEnabled', v)} label="Enable PF" />
      <span
        className={cn(
          'text-[12px] font-semibold px-2 py-0.5 rounded-md',
          draft.pfEnabled ? 'bg-green-500/12 text-green-600' : 'bg-muted text-muted-foreground'
        )}
      >
        {draft.pfEnabled ? 'Enabled' : 'Disabled'}
      </span>
    </Row>
    {draft.pfEnabled && (
      <>
        <Row
          label="Employee PF Rate"
          hint="Percentage of basic salary deducted from the employee each month"
        >
          <NumInput
            id="emp-pf"
            value={draft.pfEmployeeRate}
            onChange={(v) => set('pfEmployeeRate', v)}
            min={0}
            max={100}
            step={0.5}
            suffix="% of basic"
          />
        </Row>
        <Row
          label="Employer PF Rate"
          hint="Percentage the company contributes — not deducted from employee's take-home"
        >
          <NumInput
            id="er-pf"
            value={draft.pfEmployerRate}
            onChange={(v) => set('pfEmployerRate', v)}
            min={0}
            max={100}
            step={0.5}
            suffix="% of basic"
          />
        </Row>
        <div className="mt-4 rounded-lg border border-border bg-muted/40 px-4 py-3 text-[12px] text-muted-foreground space-y-0.5">
          <p className="font-semibold text-foreground mb-1">Statutory defaults (India)</p>
          <p>Employee contribution: 12% of basic</p>
          <p>Employer contribution: 12% of basic (3.67% to EPF + 8.33% to EPS)</p>
        </div>
      </>
    )}
  </div>
);

const ESITab: React.FC<{
  draft: PayPolicy;
  set: <K extends keyof PayPolicy>(k: K, v: PayPolicy[K]) => void;
}> = ({ draft, set }) => (
  <div>
    <Row label="Enable ESI">
      <Toggle
        checked={draft.esiEnabled}
        onChange={(v) => set('esiEnabled', v)}
        label="Enable ESI"
      />
      <span
        className={cn(
          'text-[12px] font-semibold px-2 py-0.5 rounded-md',
          draft.esiEnabled ? 'bg-green-500/12 text-green-600' : 'bg-muted text-muted-foreground'
        )}
      >
        {draft.esiEnabled ? 'Enabled' : 'Disabled'}
      </span>
    </Row>
    {draft.esiEnabled && (
      <>
        <Row label="Employee ESI Rate">
          <NumInput
            id="emp-esi"
            value={draft.esiEmployeeRate}
            onChange={(v) => set('esiEmployeeRate', v)}
            min={0}
            max={10}
            step={0.01}
            suffix="% of gross"
          />
        </Row>
        <Row label="Employer ESI Rate">
          <NumInput
            id="er-esi"
            value={draft.esiEmployerRate}
            onChange={(v) => set('esiEmployerRate', v)}
            min={0}
            max={10}
            step={0.01}
            suffix="% of gross"
          />
        </Row>
        <Row
          label="Gross Wage Ceiling"
          hint="Employees earning above this gross are exempt from ESI deduction"
        >
          <NumInput
            id="esi-ceil"
            value={draft.esiGrossLimit}
            onChange={(v) => set('esiGrossLimit', v)}
            min={0}
            step={500}
            prefix="₹"
            suffix="/ month"
          />
        </Row>
        <div className="mt-4 rounded-lg border border-border bg-muted/40 px-4 py-3 text-[12px] text-muted-foreground space-y-0.5">
          <p className="font-semibold text-foreground mb-1">Statutory defaults (India)</p>
          <p>Employee: 0.75% · Employer: 3.25% of gross salary</p>
          <p>Wage ceiling: ₹21,000 / month</p>
        </div>
      </>
    )}
  </div>
);

const PTTab: React.FC<{
  draft: PayPolicy;
  set: <K extends keyof PayPolicy>(k: K, v: PayPolicy[K]) => void;
}> = ({ draft, set }) => (
  <div>
    <Row
      label="Enable Professional Tax"
      hint="State-levied tax applicable in Maharashtra, Karnataka, West Bengal, etc."
    >
      <Toggle
        checked={draft.professionalTaxEnabled}
        onChange={(v) => set('professionalTaxEnabled', v)}
        label="Enable PT"
      />
      <span
        className={cn(
          'text-[12px] font-semibold px-2 py-0.5 rounded-md',
          draft.professionalTaxEnabled
            ? 'bg-green-500/12 text-green-600'
            : 'bg-muted text-muted-foreground'
        )}
      >
        {draft.professionalTaxEnabled ? 'Enabled' : 'Disabled'}
      </span>
    </Row>
    {draft.professionalTaxEnabled && (
      <div className="mt-4 rounded-lg border border-border bg-muted/40 px-4 py-3 text-[12px] text-muted-foreground">
        <p className="font-semibold text-foreground mb-1">Note</p>
        <p>
          PT slabs vary by state and are applied at payslip generation based on gross salary.
          Standard slab: ₹200/month for gross &gt; ₹15,000.
        </p>
      </div>
    )}
  </div>
);

// ── Main ──────────────────────────────────────────────────────────────────────

export default function MainPayPolicy() {
  const requireCompanySelected = useRequireCompanySelected();
  const [draft, setDraft] = useState<PayPolicy>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('overtime');

  useEffect(() => {
    fetchPolicy()
      .then((p) => {
        if (p) setDraft({ ...DEFAULT, ...p });
      })
      .catch(() => toast.error('Failed to load pay policy'))
      .finally(() => setLoading(false));
  }, []);

  const set = <K extends keyof PayPolicy>(k: K, v: PayPolicy[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireCompanySelected()) return;
    setSaving(true);
    try {
      await savePolicy(draft);
      toast.success('Pay policy saved');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to save'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <IconLoader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-background text-foreground grow">
      <form onSubmit={handleSave}>
        <div className="mx-auto max-w-4xl px-4 pt-6 pb-10 sm:px-6 lg:px-8 space-y-5">
          {/* Page header */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card px-5 py-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[11px] bg-primary/12 text-primary">
                <IconSettings className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-[17px] sm:text-[20px] font-bold leading-tight tracking-[-0.02em]">
                  Pay Policy
                </h1>
                <p className="mt-0.5 text-[12px] sm:text-[13px] text-muted-foreground">
                  Configure salary calculation rules for your organisation
                </p>
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 sm:px-5 py-2 sm:py-2.5 text-[13px] font-semibold text-primary-foreground disabled:opacity-60 whitespace-nowrap"
            >
              {saving ? (
                <>
                  <IconLoader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : saved ? (
                <>
                  <IconCheck className="h-4 w-4" />
                  Saved
                </>
              ) : (
                'Save Policy'
              )}
            </button>
          </div>

          {/* Tab bar */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Horizontal tab strip */}
            <div className="flex border-b border-border overflow-x-auto">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'relative flex items-center gap-2 px-5 py-3.5 text-[13px] font-semibold whitespace-nowrap transition-colors shrink-0',
                    activeTab === tab.id
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                  {activeTab === tab.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
                  )}
                </button>
              ))}
            </div>

            {/* Panel content */}
            <div className="px-6 py-5">
              {activeTab === 'overtime' && <OvertimeTab draft={draft} set={set} />}
              {activeTab === 'late' && <LateTab draft={draft} set={set} />}
              {activeTab === 'pf' && <PFTab draft={draft} set={set} />}
              {activeTab === 'esi' && <ESITab draft={draft} set={set} />}
              {activeTab === 'pt' && <PTTab draft={draft} set={set} />}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
