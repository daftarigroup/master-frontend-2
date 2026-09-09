'use client';

import {
  IconAlertCircle,
  IconCheck,
  IconEdit,
  IconLoader2,
  IconPlus,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { type ReactNode, useEffect, useState } from 'react';
import { useRequireCompanySelected } from '@/features/organization/hooks/useRequireCompanySelected';
import { useUpsertStructure } from '../server/tanstackQuery/useSalaryQueries';
import { ModalPortal } from '../../_shared/components';
import {
  DEFAULT_DEDUCTIONS,
  type DeductionDef,
  type SalaryStructure,
  type UpsertStructureDto,
} from '../types/types';

const inputCls =
  'h-10 w-full rounded-lg border border-border bg-muted px-3 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary';
const labelCls =
  'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);

const round2 = (n: number) => Math.round(n * 100) / 100;

type StructForm = {
  basicPercent: string;
  hraPercent: string;
  conveyancePercent: string;
  medicalPercent: string;
  deductions: DeductionDef[];
};

const BLANK_FORM = (s?: SalaryStructure | null): StructForm => ({
  basicPercent: String(s?.basicPercent ?? 40),
  hraPercent: String(s?.hraPercent ?? 20),
  conveyancePercent: String(s?.conveyancePercent ?? 10),
  medicalPercent: String(s?.medicalPercent ?? 5),
  deductions: s?.deductions?.length ? s.deductions : DEFAULT_DEDUCTIONS,
});

const EARNINGS_ROWS: { key: keyof Omit<StructForm, 'deductions'>; label: string }[] = [
  { key: 'basicPercent', label: 'Basic' },
  { key: 'hraPercent', label: 'HRA' },
  { key: 'conveyancePercent', label: 'Conveyance' },
  { key: 'medicalPercent', label: 'Medical Allowance' },
];

const SectionTitle = ({ children }: { children: ReactNode }) => (
  <p className="mb-3 border-b border-primary/20 pb-1 text-[11px] font-bold uppercase tracking-[0.05em] text-primary">
    {children}
  </p>
);

export const EditStructureModal = ({
  existing,
  onClose,
  onSaved,
}: {
  existing: SalaryStructure | null | undefined;
  onClose: () => void;
  onSaved: (s: SalaryStructure) => void;
}) => {
  const requireCompanySelected = useRequireCompanySelected();
  const upsert = useUpsertStructure();
  const [form, setForm] = useState<StructForm>(() => BLANK_FORM(existing));
  const [err, setErr] = useState('');

  useEffect(() => {
    setForm(BLANK_FORM(existing));
  }, [existing]);

  // ── Live preview calculations (all % of CTC) ──────────────────────────
  const P = 50000;
  const basicPct = Number(form.basicPercent) || 0;
  const hraPct = Number(form.hraPercent) || 0;
  const convPct = Number(form.conveyancePercent) || 0;
  const medPct = Number(form.medicalPercent) || 0;
  const specPct = round2(100 - basicPct - hraPct - convPct - medPct);

  const pBasic = round2(P * (basicPct / 100));
  const pHRA = round2(P * (hraPct / 100));
  const pConv = round2(P * (convPct / 100));
  const pMed = round2(P * (medPct / 100));
  const pSpec = round2(P * (Math.max(0, specPct) / 100));
  const pGross = round2(pBasic + pHRA + pConv + pMed + pSpec);

  let previewEmpDed = 0;
  for (const d of form.deductions) {
    if (!d.active) continue;
    if (d.grossLimit !== undefined && pGross > d.grossLimit) continue;
    const base = d.basis === 'basic' ? pBasic : pGross;
    previewEmpDed = round2(previewEmpDed + base * (d.percent / 100));
  }
  const pNet = round2(pGross - previewEmpDed);

  const specNegative = specPct < 0;

  // ── Deduction helpers ─────────────────────────────────────────────────
  const addDeduction = () =>
    setForm((p) => ({
      ...p,
      deductions: [
        ...p.deductions,
        {
          id: `d_${Date.now()}`,
          name: '',
          percent: 0,
          employerPercent: 0,
          basis: 'basic',
          active: true,
        },
      ],
    }));

  const updateDeduction = (idx: number, patch: Partial<DeductionDef>) =>
    setForm((p) => ({
      ...p,
      deductions: p.deductions.map((d, i) => (i === idx ? { ...d, ...patch } : d)),
    }));

  const removeDeduction = (idx: number) =>
    setForm((p) => ({ ...p, deductions: p.deductions.filter((_, i) => i !== idx) }));

  // ── Save ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!requireCompanySelected()) return;
    if (specNegative) {
      setErr(
        `Basic + HRA + Conveyance + Medical exceeds 100% — reduce them so Special Allowance is ≥ 0%`
      );
      return;
    }
    for (const d of form.deductions) {
      if (!d.name.trim()) {
        setErr('All deduction rows must have a name');
        return;
      }
      if (d.percent < 0 || d.percent > 100) {
        setErr(`"${d.name}" employee % must be 0–100`);
        return;
      }
      if ((d.employerPercent ?? 0) < 0 || (d.employerPercent ?? 0) > 100) {
        setErr(`"${d.name}" employer % must be 0–100`);
        return;
      }
    }
    try {
      const payload: UpsertStructureDto = {
        basicPercent: basicPct,
        hraPercent: hraPct,
        conveyancePercent: convPct,
        medicalPercent: medPct,
        specialAllowancePercent: specPct,
        deductions: form.deductions,
      };
      const saved = await upsert.mutateAsync(payload);
      onSaved(saved);
      onClose();
    } catch (e) {
      setErr(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Save failed'
      );
    }
  };

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200"
        role="dialog"
        aria-modal="true"
        aria-label="Edit salary structure"
        onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      tabIndex={-1}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
        role="document"
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <IconEdit className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold leading-tight tracking-[-0.01em]">
                Edit Salary Structure
              </h2>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                Global rules applied to all employees when generating payslips
              </p>
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

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {err && (
            <div className="flex items-start gap-2.5 rounded-xl border border-destructive/40 bg-destructive/5 px-3.5 py-3">
              <IconAlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <p className="text-[12px] font-medium text-destructive">{err}</p>
            </div>
          )}

          {/* Earnings allocation */}
          <div>
            <SectionTitle>Earnings Allocation (% of Monthly CTC)</SectionTitle>
            <div className="space-y-3">
              {EARNINGS_ROWS.map(({ key, label }) => (
                <div key={key} className="grid grid-cols-[1fr_90px] items-end gap-3">
                  <div>
                    <label htmlFor={`ea-${key}`} className={labelCls}>
                      {label}
                    </label>
                    <div className="relative">
                      <input
                        id={`ea-${key}`}
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        value={form[key]}
                        onChange={(e) => {
                          setForm((p) => ({ ...p, [key]: e.target.value }));
                          setErr('');
                        }}
                        className={`${inputCls} pr-8`}
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground">
                        %
                      </span>
                    </div>
                  </div>
                  <div className="rounded-lg border border-dashed border-border bg-muted/30 px-2 py-2 text-center">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-[0.04em]">
                      ₹50k CTC
                    </p>
                    <p className="text-[13px] font-bold tabular-nums">
                      {fmt(
                        key === 'basicPercent'
                          ? pBasic
                          : key === 'hraPercent'
                            ? pHRA
                            : key === 'conveyancePercent'
                              ? pConv
                              : key === 'medicalPercent'
                                ? pMed
                                : pSpec
                      )}
                    </p>
                  </div>
                </div>
              ))}

              {/* Special Allowance — auto-calculated remainder */}
              <div
                className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 ${
                  specNegative
                    ? 'border-destructive/40 bg-destructive/5'
                    : 'border-dashed border-primary/30 bg-primary/5'
                }`}
              >
                <div>
                  <p
                    className={`text-[11px] font-semibold ${specNegative ? 'text-destructive' : 'text-primary'}`}
                  >
                    Special Allowance
                    <span className="ml-1.5 text-[10px] font-normal opacity-70">
                      (auto = 100% − Basic − HRA − Conveyance − Medical)
                    </span>
                  </p>
                  {specNegative && (
                    <p className="mt-0.5 text-[11px] text-destructive">
                      Other components exceed 100% — reduce them to allow a positive special
                      allowance
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`tabular-nums text-[15px] font-bold ${specNegative ? 'text-destructive' : 'text-primary'}`}
                  >
                    {specPct.toFixed(2)}%
                  </span>
                  <span className="text-[12px] tabular-nums text-muted-foreground">
                    {fmt(pSpec)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Live preview */}
          <div>
            <SectionTitle>Preview for ₹50,000 CTC/month</SectionTitle>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {[
                { l: 'Basic', v: pBasic },
                { l: 'HRA', v: pHRA },
                { l: 'Conveyance', v: pConv },
                { l: 'Medical', v: pMed },
                { l: 'Special', v: pSpec },
              ].map((item) => (
                <div
                  key={item.l}
                  className="rounded-lg border border-border bg-muted/40 px-2.5 py-2 text-center"
                >
                  <p className="text-[9px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                    {item.l}
                  </p>
                  <p className="mt-0.5 text-[12px] font-bold tabular-nums">{fmt(item.v)}</p>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-[11px]">
              <span className="text-muted-foreground">
                Gross: <span className="font-bold text-foreground">{fmt(pGross)}</span>
              </span>
              <span className="text-muted-foreground">
                Est. Net (after emp. deductions):{' '}
                <span className="font-bold text-foreground">{fmt(pNet)}</span>
              </span>
            </div>
          </div>

          {/* Deductions */}
          <div>
            <div className="mb-3 flex items-center justify-between border-b border-primary/20 pb-1">
              <SectionTitle>Statutory Deductions</SectionTitle>
              <button
                type="button"
                onClick={addDeduction}
                className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20"
              >
                <IconPlus className="h-3 w-3" /> Add
              </button>
            </div>

            <div className="overflow-x-auto">
              <div className="mb-1.5 grid min-w-[520px] grid-cols-[1fr_80px_90px_65px_50px_28px] items-center gap-2 px-1">
                {['Deduction Name', 'Emp %', 'Employer %', 'Basis', 'Active', ''].map((h) => (
                  <p
                    key={h}
                    className="text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground"
                  >
                    {h}
                  </p>
                ))}
              </div>

              <div className="min-w-[520px] space-y-2">
                {form.deductions.map((ded, i) => (
                  <div
                    key={ded.id}
                    className="grid grid-cols-[1fr_80px_90px_65px_50px_28px] items-center gap-2 rounded-lg border border-border bg-muted/30 px-2.5 py-2"
                  >
                    <input
                      type="text"
                      value={ded.name}
                      onChange={(e) => updateDeduction(i, { name: e.target.value })}
                      placeholder="e.g. Provident Fund"
                      className="h-8 w-full rounded-md border border-border bg-muted px-2 text-[12px] text-foreground outline-none focus:border-primary"
                    />
                    {/* Employee % */}
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        value={ded.percent}
                        onChange={(e) => updateDeduction(i, { percent: Number(e.target.value) })}
                        className="h-8 w-full rounded-md border border-border bg-muted pr-5 pl-2 text-[12px] text-foreground outline-none focus:border-primary"
                      />
                      <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                        %
                      </span>
                    </div>
                    {/* Employer % — amber tint to distinguish */}
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        value={ded.employerPercent ?? 0}
                        onChange={(e) =>
                          updateDeduction(i, { employerPercent: Number(e.target.value) })
                        }
                        className="h-8 w-full rounded-md border border-amber-300/60 bg-amber-50/60 pr-5 pl-2 text-[12px] text-foreground outline-none focus:border-amber-400 dark:border-amber-700/50 dark:bg-amber-950/20"
                      />
                      <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                        %
                      </span>
                    </div>
                    {/* Basis */}
                    <select
                      value={ded.basis}
                      onChange={(e) =>
                        updateDeduction(i, { basis: e.target.value as 'basic' | 'gross' })
                      }
                      className="h-8 cursor-pointer rounded-md border border-border bg-muted px-1.5 text-[12px] text-foreground outline-none focus:border-primary"
                    >
                      <option value="basic">Basic</option>
                      <option value="gross">Gross</option>
                    </select>
                    {/* Active */}
                    <label
                      htmlFor={`ded-active-${ded.id}`}
                      className="flex cursor-pointer items-center justify-center"
                    >
                      <input
                        id={`ded-active-${ded.id}`}
                        type="checkbox"
                        checked={ded.active}
                        onChange={(e) => updateDeduction(i, { active: e.target.checked })}
                        className="h-4 w-4 rounded accent-primary"
                      />
                    </label>
                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => removeDeduction(i)}
                      aria-label="Remove"
                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <IconTrash className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {form.deductions.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border px-4 py-4 text-center text-[12px] text-muted-foreground">
                    No deductions configured. Click "Add" to add one.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={upsert.isPending}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-muted px-4 text-[12px] font-semibold transition-colors hover:bg-muted-foreground/10 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={upsert.isPending}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-[12px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {upsert.isPending ? (
              <>
                <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <IconCheck className="h-3.5 w-3.5" />
                Save Structure
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  </ModalPortal>
);
};
