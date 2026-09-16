'use client';

import {
  IconAlertCircle,
  IconCheck,
  IconLoader2,
  IconPlus,
  IconTrash,
  IconUser,
  IconX,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { resolveActAsTenant } from '@/features/organization/utils/actAsTenant';
import { useAppSelector } from '@/store/hook';
import { selectUser } from '@/store/slice/userAccountData';
import {
  useEmployeeStructure,
  useUpsertEmployeeStructure,
} from '../server/tanstackQuery/useSalaryManagementQueries';
import { previewStructure, type StructurePreview } from '../server/api/salaryManagementApi';
import { ModalPortal } from '../../_shared/components';
import type { DeductionDef, EmployeeSalaryStructure } from '../types/types';

const T = {
  bg: 'var(--background)',
  fg: 'var(--foreground)',
  card: 'var(--card)',
  muted: 'var(--muted)',
  mutedFg: 'var(--muted-foreground)',
  border: 'var(--border)',
  primary: 'var(--primary)',
  primaryBg: 'color-mix(in oklch, var(--primary) 12%, transparent)',
  primaryFg: 'var(--primary-foreground, #fff)',
  success: 'var(--success)',
  successBg: 'color-mix(in oklch, var(--success) 14%, transparent)',
  danger: 'var(--danger)',
  dangerBg: 'color-mix(in oklch, var(--danger) 14%, transparent)',
  warning: 'var(--warning)',
  warningBg: 'color-mix(in oklch, var(--warning) 14%, transparent)',
  font: "'DM Sans', system-ui, sans-serif" as string,
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);

const round2 = (n: number) => Math.round(n * 100) / 100;

const DEFAULT_DEDUCTIONS: DeductionDef[] = [
  {
    id: 'emp_pf',
    name: 'Provident Fund (PF)',
    percent: 12,
    employerPercent: 13,
    basis: 'basic',
    active: true,
  },
  {
    id: 'emp_esic',
    name: 'ESIC',
    percent: 0.75,
    employerPercent: 3.25,
    basis: 'gross',
    active: true,
    grossLimit: 21000,
  },
];

type StructForm = {
  basicPercent: string;
  hraPercent: string;
  conveyancePercent: string;
  medicalPercent: string;
  deductions: DeductionDef[];
};

const blankForm = (s?: EmployeeSalaryStructure | null): StructForm => ({
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

function InputField({
  id,
  label,
  value,
  onChange,
  suffix,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        style={{
          display: 'block',
          fontSize: 11,
          fontWeight: 600,
          color: T.mutedFg,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          marginBottom: 5,
          fontFamily: T.font,
        }}
      >
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          type="number"
          min={0}
          max={100}
          step={0.01}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%',
            height: 38,
            padding: suffix ? '0 28px 0 12px' : '0 12px',
            borderRadius: 8,
            border: `1px solid ${T.border}`,
            background: T.muted,
            color: T.fg,
            fontSize: 13,
            fontFamily: T.font,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        {suffix && (
          <span
            style={{
              position: 'absolute',
              right: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: 12,
              color: T.mutedFg,
              pointerEvents: 'none',
            }}
          >
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

export function EmployeeStructureModal({
  employeeId,
  employeeName,
  tenant,
  onClose,
}: {
  employeeId: string;
  employeeName: string;
  tenant?: { id: string; name: string } | null;
  onClose: () => void;
}) {
  const user = useAppSelector(selectUser);
  const actAsTenantId = resolveActAsTenant(tenant, user?.tenantId);
  const { data: existing, isLoading } = useEmployeeStructure(employeeId, actAsTenantId);
  const upsert = useUpsertEmployeeStructure();

  const [form, setForm] = useState<StructForm>(() => blankForm(null));
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!isLoading) setForm(blankForm(existing));
  }, [existing, isLoading]);

  const basicPct = Number(form.basicPercent) || 0;
  const hraPct = Number(form.hraPercent) || 0;
  const convPct = Number(form.conveyancePercent) || 0;
  const medPct = Number(form.medicalPercent) || 0;
  const specPct = round2(100 - basicPct - hraPct - convPct - medPct);
  const specNegative = specPct < 0;

  const [preview, setPreview] = useState<StructurePreview | null>(null);

  useEffect(() => {
    if (specNegative) {
      setPreview(null);
      return;
    }
    const controller = new AbortController();
    const t = setTimeout(() => {
      previewStructure(
        {
          basicPercent: basicPct,
          hraPercent: hraPct,
          conveyancePercent: convPct,
          medicalPercent: medPct,
          specialAllowancePercent: specPct,
          deductions: form.deductions,
        },
        controller.signal
      )
        .then(setPreview)
        .catch(() => {});
    }, 250);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basicPct, hraPct, convPct, medPct, specPct, form.deductions, specNegative]);

  const pBasic = preview?.basic ?? 0;
  const pHRA = preview?.hra ?? 0;
  const pConv = preview?.conveyance ?? 0;
  const pMed = preview?.medicalAllowance ?? 0;
  const pSpec = preview?.specialAllowance ?? 0;
  const pGross = preview?.grossEarnings ?? 0;
  const pNet = preview?.netPay ?? 0;

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

  const updateDed = (idx: number, patch: Partial<DeductionDef>) =>
    setForm((p) => ({
      ...p,
      deductions: p.deductions.map((d, i) => (i === idx ? { ...d, ...patch } : d)),
    }));

  const removeDed = (idx: number) =>
    setForm((p) => ({ ...p, deductions: p.deductions.filter((_, i) => i !== idx) }));

  const handleSave = async () => {
    if (specNegative) {
      setErr('Basic + HRA + Conveyance + Medical exceeds 100%');
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
    }
    try {
      await upsert.mutateAsync({
        employeeId,
        data: {
          basicPercent: basicPct,
          hraPercent: hraPct,
          conveyancePercent: convPct,
          medicalPercent: medPct,
          specialAllowancePercent: Math.max(0, specPct),
          deductions: form.deductions,
        },
        actAsTenantId,
      });
      toast.success(`Salary structure saved for ${employeeName}`);
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
        role="presentation"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 80,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        backdropFilter: 'blur(2px)',
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
          borderRadius: 18,
          width: '100%',
          maxWidth: 680,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 80px rgba(0,0,0,0.28)',
          fontFamily: T.font,
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
        role="document"
        tabIndex={-1}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            padding: 'clamp(12px, 4vw, 18px) clamp(14px, 4vw, 24px)',
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 11,
                background: T.primaryBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: T.primary,
                flexShrink: 0,
              }}
            >
              <IconUser size={20} />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: T.fg, margin: 0, lineHeight: 1.2 }}>
                Employee Salary Structure
              </p>
              <p style={{ fontSize: 12, color: T.mutedFg, margin: '3px 0 0' }}>
                Override for <strong style={{ color: T.fg }}>{employeeName}</strong>
                {existing && (
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: 10,
                      fontWeight: 600,
                      padding: '2px 7px',
                      borderRadius: 20,
                      background: T.primaryBg,
                      color: T.primary,
                      border: `1px solid ${T.primary}30`,
                    }}
                  >
                    Custom set
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
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

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 'clamp(14px, 4vw, 24px)' }}>
          {isLoading ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: T.mutedFg }}>
              <IconLoader2
                size={24}
                style={{
                  animation: 'spin 1s linear infinite',
                  display: 'block',
                  margin: '0 auto 8px',
                }}
              />
              <p style={{ fontSize: 13, margin: 0 }}>Loading structure…</p>
            </div>
          ) : (
            <>
              {err && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: `1px solid ${T.danger}40`,
                    background: T.dangerBg,
                    marginBottom: 20,
                  }}
                >
                  <IconAlertCircle
                    size={15}
                    style={{ color: T.danger, marginTop: 1, flexShrink: 0 }}
                  />
                  <p style={{ fontSize: 12, color: T.danger, margin: 0 }}>{err}</p>
                </div>
              )}

              {/* Earnings allocation */}
              <div style={{ marginBottom: 24 }}>
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: T.primary,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    margin: '0 0 12px',
                    paddingBottom: 8,
                    borderBottom: `1px solid ${T.primary}20`,
                  }}
                >
                  Earnings Allocation (% of Monthly CTC)
                </p>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr minmax(72px, 90px)',
                    gap: 12,
                  }}
                >
                  {EARNINGS_ROWS.map(({ key, label }) => {
                    const previewVal =
                      key === 'basicPercent'
                        ? pBasic
                        : key === 'hraPercent'
                          ? pHRA
                          : key === 'conveyancePercent'
                            ? pConv
                            : pMed;
                    return (
                      <div key={key} style={{ display: 'contents' }}>
                        <InputField
                          id={`es-${key}`}
                          label={label}
                          value={form[key]}
                          suffix="%"
                          onChange={(v) => {
                            setForm((p) => ({ ...p, [key]: v }));
                            setErr('');
                          }}
                        />
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            paddingBottom: 2,
                          }}
                        >
                          <div
                            style={{
                              padding: '6px 8px',
                              borderRadius: 8,
                              border: `1px dashed ${T.border}`,
                              background: `color-mix(in oklch, ${T.muted} 50%, transparent)`,
                              textAlign: 'center',
                              width: '100%',
                            }}
                          >
                            <p
                              style={{
                                fontSize: 9,
                                color: T.mutedFg,
                                margin: '0 0 2px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                              }}
                            >
                              ₹50k CTC
                            </p>
                            <p
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: T.fg,
                                margin: 0,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {fmt(previewVal)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Special Allowance — auto */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 8,
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: `1px ${specNegative ? 'solid' : 'dashed'} ${specNegative ? T.danger : T.primary}40`,
                    background: specNegative ? T.dangerBg : T.primaryBg,
                    marginTop: 12,
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: specNegative ? T.danger : T.primary,
                        margin: 0,
                      }}
                    >
                      Special Allowance
                      <span style={{ fontSize: 10, fontWeight: 400, marginLeft: 6, opacity: 0.7 }}>
                        (auto = 100% − Basic − HRA − Conveyance − Medical)
                      </span>
                    </p>
                    {specNegative && (
                      <p style={{ fontSize: 11, color: T.danger, margin: '3px 0 0' }}>
                        Other components exceed 100% — reduce them
                      </p>
                    )}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      flexShrink: 0,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: specNegative ? T.danger : T.primary,
                      }}
                    >
                      {specPct.toFixed(2)}%
                    </span>
                    <span style={{ fontSize: 12, color: T.mutedFg }}>{fmt(pSpec)}</span>
                  </div>
                </div>
              </div>

              {/* Preview bar */}
              <div style={{ marginBottom: 24 }}>
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: T.primary,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    margin: '0 0 10px',
                    paddingBottom: 8,
                    borderBottom: `1px solid ${T.primary}20`,
                  }}
                >
                  Preview for ₹50,000 CTC/month
                </p>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(72px, 1fr))',
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  {(
                    [
                      ['Basic', pBasic],
                      ['HRA', pHRA],
                      ['Conveyance', pConv],
                      ['Medical', pMed],
                      ['Special', pSpec],
                    ] as [string, number][]
                  ).map(([l, v]) => (
                    <div
                      key={l}
                      style={{
                        padding: '8px 6px',
                        borderRadius: 8,
                        border: `1px solid ${T.border}`,
                        background: `color-mix(in oklch, ${T.muted} 40%, transparent)`,
                        textAlign: 'center',
                      }}
                    >
                      <p
                        style={{
                          fontSize: 9,
                          fontWeight: 600,
                          color: T.mutedFg,
                          margin: '0 0 3px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {l}
                      </p>
                      <p
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: T.fg,
                          margin: 0,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {fmt(v)}
                      </p>
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 8,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: `1px solid ${T.border}`,
                    background: `color-mix(in oklch, ${T.muted} 30%, transparent)`,
                    fontSize: 12,
                    color: T.mutedFg,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span>
                    Gross: <strong style={{ color: T.fg }}>{fmt(pGross)}</strong>
                  </span>
                  <span>
                    Est. Net (after emp. deductions):{' '}
                    <strong style={{ color: T.fg }}>{fmt(pNet)}</strong>
                  </span>
                </div>
              </div>

              {/* Deductions */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 10,
                    paddingBottom: 8,
                    borderBottom: `1px solid ${T.primary}20`,
                  }}
                >
                  <p
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: T.primary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      margin: 0,
                    }}
                  >
                    Statutory Deductions
                  </p>
                  <button
                    type="button"
                    onClick={addDeduction}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '5px 10px',
                      borderRadius: 7,
                      border: `1px solid ${T.primary}30`,
                      background: T.primaryBg,
                      color: T.primary,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: T.font,
                    }}
                  >
                    <IconPlus size={12} /> Add
                  </button>
                </div>

                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  {/* Column headers */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 80px 90px 65px 50px 28px',
                      gap: 8,
                      padding: '0 4px 6px',
                      minWidth: 420,
                    }}
                  >
                    {['Deduction Name', 'Emp %', 'Employer %', 'Basis', 'Active', ''].map((h) => (
                      <p
                        key={h}
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: T.mutedFg,
                          margin: 0,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {h}
                      </p>
                    ))}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 420 }}>
                    {form.deductions.map((ded, i) => (
                      <div
                        key={ded.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 80px 90px 65px 50px 28px',
                          gap: 8,
                          alignItems: 'center',
                          padding: '8px 10px',
                          borderRadius: 9,
                          border: `1px solid ${T.border}`,
                          background: `color-mix(in oklch, ${T.muted} 30%, transparent)`,
                        }}
                      >
                        <input
                          type="text"
                          value={ded.name}
                          onChange={(e) => updateDed(i, { name: e.target.value })}
                          placeholder="e.g. Provident Fund"
                          style={{
                            height: 32,
                            padding: '0 10px',
                            borderRadius: 7,
                            border: `1px solid ${T.border}`,
                            background: T.muted,
                            color: T.fg,
                            fontSize: 12,
                            fontFamily: T.font,
                            outline: 'none',
                            width: '100%',
                            boxSizing: 'border-box',
                          }}
                        />
                        {/* Emp % */}
                        <div style={{ position: 'relative' }}>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={0.01}
                            value={ded.percent}
                            onChange={(e) => updateDed(i, { percent: Number(e.target.value) })}
                            style={{
                              height: 32,
                              width: '100%',
                              padding: '0 20px 0 8px',
                              borderRadius: 7,
                              border: `1px solid ${T.border}`,
                              background: T.muted,
                              color: T.fg,
                              fontSize: 12,
                              fontFamily: T.font,
                              outline: 'none',
                              boxSizing: 'border-box',
                            }}
                          />
                          <span
                            style={{
                              position: 'absolute',
                              right: 6,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              fontSize: 10,
                              color: T.mutedFg,
                              pointerEvents: 'none',
                            }}
                          >
                            %
                          </span>
                        </div>
                        {/* Employer % */}
                        <div style={{ position: 'relative' }}>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={0.01}
                            value={ded.employerPercent ?? 0}
                            onChange={(e) =>
                              updateDed(i, { employerPercent: Number(e.target.value) })
                            }
                            style={{
                              height: 32,
                              width: '100%',
                              padding: '0 20px 0 8px',
                              borderRadius: 7,
                              border: '1px solid oklch(0.85 0.06 85)',
                              background: 'oklch(0.98 0.02 85 / 0.5)',
                              color: T.fg,
                              fontSize: 12,
                              fontFamily: T.font,
                              outline: 'none',
                              boxSizing: 'border-box',
                            }}
                          />
                          <span
                            style={{
                              position: 'absolute',
                              right: 6,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              fontSize: 10,
                              color: T.mutedFg,
                              pointerEvents: 'none',
                            }}
                          >
                            %
                          </span>
                        </div>
                        {/* Basis */}
                        <select
                          value={ded.basis}
                          onChange={(e) =>
                            updateDed(i, { basis: e.target.value as 'basic' | 'gross' })
                          }
                          style={{
                            height: 32,
                            padding: '0 6px',
                            borderRadius: 7,
                            border: `1px solid ${T.border}`,
                            background: T.muted,
                            color: T.fg,
                            fontSize: 12,
                            fontFamily: T.font,
                            outline: 'none',
                            cursor: 'pointer',
                            width: '100%',
                          }}
                        >
                          <option value="basic">Basic</option>
                          <option value="gross">Gross</option>
                        </select>
                        {/* Active */}
                        <label
                          htmlFor={`ded-active-${ded.id}-${i}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            id={`ded-active-${ded.id}-${i}`}
                            type="checkbox"
                            checked={ded.active}
                            onChange={(e) => updateDed(i, { active: e.target.checked })}
                            style={{
                              width: 15,
                              height: 15,
                              accentColor: T.primary,
                              cursor: 'pointer',
                            }}
                          />
                        </label>
                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => removeDed(i)}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 7,
                            border: 'none',
                            background: 'transparent',
                            color: T.mutedFg,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = T.dangerBg;
                            (e.currentTarget as HTMLButtonElement).style.color = T.danger;
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                            (e.currentTarget as HTMLButtonElement).style.color = T.mutedFg;
                          }}
                        >
                          <IconTrash size={13} />
                        </button>
                      </div>
                    ))}
                    {form.deductions.length === 0 && (
                      <div
                        style={{
                          padding: '16px',
                          borderRadius: 9,
                          border: `1px dashed ${T.border}`,
                          textAlign: 'center',
                          fontSize: 12,
                          color: T.mutedFg,
                        }}
                      >
                        No deductions configured. Click "Add" to add one.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 10,
            flexWrap: 'wrap',
            padding: 'clamp(12px, 4vw, 14px) clamp(14px, 4vw, 24px)',
            borderTop: `1px solid ${T.border}`,
            background: `color-mix(in oklch, ${T.muted} 30%, transparent)`,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={upsert.isPending}
            style={{
              height: 36,
              padding: '0 16px',
              borderRadius: 9,
              border: `1px solid ${T.border}`,
              background: T.muted,
              color: T.fg,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: T.font,
              opacity: upsert.isPending ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={upsert.isPending || isLoading}
            style={{
              height: 36,
              padding: '0 18px',
              borderRadius: 9,
              border: 'none',
              background: T.primary,
              color: T.primaryFg,
              fontSize: 13,
              fontWeight: 600,
              cursor: upsert.isPending ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              opacity: upsert.isPending ? 0.7 : 1,
              fontFamily: T.font,
            }}
          >
            {upsert.isPending ? (
              <IconLoader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <IconCheck size={14} />
            )}
            Save Structure
          </button>
        </div>
      </div>
    </div>
  </ModalPortal>
);
}
