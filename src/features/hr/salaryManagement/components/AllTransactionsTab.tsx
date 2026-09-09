'use client';

import {
  IconAlertTriangle,
  IconArrowRight,
  IconBriefcase,
  IconLoader2,
  IconLock,
  IconSearch,
  IconUser,
  IconUserOff,
  IconX,
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useSalaryEmployeeList } from '../server/tanstackQuery/useSalaryManagementQueries';
import type { SalaryEmployeeListItem } from '../types/types';

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
  font: "'DM Sans', system-ui, sans-serif" as string,
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);

function EmpStatusBadge({ status }: { status: string }) {
  const isActive = status === 'active';
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        padding: '2px 8px',
        borderRadius: 5,
        background: isActive ? T.successBg : T.dangerBg,
        color: isActive ? T.success : T.danger,
        border: `1px solid ${isActive ? T.success : T.danger}30`,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
      }}
    >
      {isActive ? <IconUser size={9} /> : <IconUserOff size={9} />}
      {isActive ? 'Active' : status === 'resigned' ? 'Resigned' : 'Inactive'}
    </span>
  );
}

export default function AllTransactionsTab() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedDept, setAppliedDept] = useState('');

  const {
    data: employees,
    isLoading,
    isError,
  } = useSalaryEmployeeList({
    search: appliedSearch || undefined,
    dept: appliedDept || undefined,
  });

  const paidEmployees = (employees ?? []).filter((e) => e.paidPayslipCount > 0);

  const filteredEmployees = statusFilter
    ? paidEmployees.filter((e) =>
        statusFilter === 'active' ? e.status === 'active' : e.status !== 'active'
      )
    : paidEmployees;

  const allDepts = [
    ...new Set(paidEmployees.map((e) => e.department?.name).filter(Boolean)),
  ] as string[];

  const apply = () => {
    setAppliedSearch(search);
    setAppliedDept(deptFilter);
  };

  const clear = () => {
    setSearch('');
    setDeptFilter('');
    setStatusFilter('');
    setAppliedSearch('');
    setAppliedDept('');
  };

  const navigate = (emp: SalaryEmployeeListItem) => {
    const params = new URLSearchParams({ name: emp.name, from: 'salary-records' });
    if (emp.department?.name) params.set('dept', emp.department.name);
    if (emp.designation) params.set('desig', emp.designation);
    // Only present under "All Companies" (merged) view — lets the detail page
    // resolve act-as-tenant for a row belonging to a non-active company.
    if (emp.tenant?.id) params.set('tenantId', emp.tenant.id);
    if (emp.tenant?.name) params.set('tenantName', emp.tenant.name);
    router.push(`/hr/salary-management/${emp.employeeId}?${params.toString()}`);
  };

  const hasFilter = !!(appliedSearch || appliedDept || statusFilter);
  const activeCount = paidEmployees.filter((e) => e.status === 'active').length;
  const resignedCount = paidEmployees.length - activeCount;

  return (
    <div style={{ padding: '0 clamp(14px, 4vw, 28px) 24px', fontFamily: T.font }}>
      {/* Stats row */}
      {!isLoading && employees && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: 12,
            marginBottom: 20,
          }}
        >
          {[
            {
              label: 'Employees with Paid Salary',
              value: paidEmployees.length,
              color: T.primary,
              icon: <IconBriefcase size={16} />,
            },
            { label: 'Active', value: activeCount, color: T.success, icon: <IconUser size={16} /> },
            {
              label: 'Resigned / Inactive',
              value: resignedCount,
              color: T.danger,
              icon: <IconUserOff size={16} />,
            },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: 12,
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  background: `${s.color}22`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: s.color,
                  flexShrink: 0,
                }}
              >
                {s.icon}
              </div>
              <div>
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: T.mutedFg,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    margin: 0,
                  }}
                >
                  {s.label}
                </p>
                <p
                  style={{
                    fontSize: 'clamp(16px, 4vw, 20px)',
                    fontWeight: 700,
                    color: T.fg,
                    margin: '2px 0 0',
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {s.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: 16,
        }}
      >
        {/* Name search */}
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 0 }}>
          <IconSearch
            size={13}
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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') apply();
            }}
            placeholder="Search by name or ID…"
            style={{
              width: '100%',
              height: 34,
              paddingLeft: 30,
              paddingRight: search ? 28 : 10,
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              background: T.card,
              color: T.fg,
              fontSize: 12,
              fontFamily: T.font,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: T.mutedFg,
                padding: 0,
                display: 'flex',
              }}
            >
              <IconX size={12} />
            </button>
          )}
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            height: 34,
            padding: '0 10px',
            borderRadius: 8,
            border: `1px solid ${statusFilter ? T.primary : T.border}`,
            background: statusFilter ? T.primaryBg : T.card,
            color: statusFilter ? T.primary : T.mutedFg,
            fontSize: 12,
            fontFamily: T.font,
            cursor: 'pointer',
            minWidth: 140,
            fontWeight: statusFilter ? 600 : 400,
          }}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive / Resigned</option>
        </select>

        {/* Department filter */}
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          style={{
            height: 34,
            padding: '0 10px',
            borderRadius: 8,
            border: `1px solid ${T.border}`,
            background: T.card,
            color: deptFilter ? T.fg : T.mutedFg,
            fontSize: 12,
            fontFamily: T.font,
            cursor: 'pointer',
            minWidth: 140,
          }}
        >
          <option value="">All Departments</option>
          {allDepts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={apply}
          style={{
            height: 34,
            padding: '0 14px',
            borderRadius: 8,
            border: `1px solid ${T.primary}40`,
            background: T.primaryBg,
            color: T.primary,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: T.font,
          }}
        >
          Search
        </button>

        {hasFilter && (
          <button
            type="button"
            onClick={clear}
            style={{
              height: 34,
              padding: '0 12px',
              borderRadius: 8,
              border: `1px solid ${T.border}`,
              background: 'transparent',
              color: T.mutedFg,
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: T.font,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <IconX size={12} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        {isLoading ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 220,
              gap: 10,
              color: T.mutedFg,
            }}
          >
            <IconLoader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 13 }}>Loading employees…</span>
          </div>
        ) : isError ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 180,
              gap: 8,
              color: T.danger,
            }}
          >
            <IconAlertTriangle size={18} />
            <span style={{ fontSize: 13 }}>Failed to load employees</span>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: 220,
              gap: 8,
              color: T.mutedFg,
            }}
          >
            <IconBriefcase size={36} style={{ opacity: 0.25 }} />
            <span style={{ fontSize: 13 }}>No employees found</span>
            {hasFilter && (
              <button
                type="button"
                onClick={clear}
                style={{
                  fontSize: 12,
                  color: T.primary,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: T.font,
                  textDecoration: 'underline',
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
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
                <tr style={{ background: T.card2 }}>
                  {[
                    'Employee',
                    'Department',
                    'Designation',
                    'Status',
                    'Joining Date',
                    'Monthly CTC',
                    'Paid Payslips',
                    'Salary',
                    '',
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '10px 14px',
                        textAlign: 'left',
                        fontSize: 10,
                        fontWeight: 700,
                        color: T.mutedFg,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        whiteSpace: 'nowrap',
                        borderBottom: `1px solid ${T.border}`,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp, idx) => (
                  <tr
                    key={emp.employeeId}
                    onClick={() => navigate(emp)}
                    style={{
                      borderBottom:
                        idx < filteredEmployees.length - 1 ? `1px solid ${T.border}` : 'none',
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.background = T.primaryBg;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.background = 'transparent';
                    }}
                  >
                    {/* Employee */}
                    <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: `${T.primary}18`,
                            color: T.primary,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 13,
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {emp.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: T.fg, margin: 0 }}>
                            {emp.name}
                          </p>
                          <p
                            style={{
                              fontSize: 10,
                              color: T.mutedFg,
                              margin: '1px 0 0',
                              fontFamily: 'monospace',
                            }}
                          >
                            {emp.employeeId}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Department */}
                    <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: 12, color: T.fg }}>
                        {emp.department?.name ?? '—'}
                      </span>
                    </td>

                    {/* Designation */}
                    <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: 12, color: T.fg }}>{emp.designation ?? '—'}</span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <EmpStatusBadge status={emp.status} />
                        {emp.salaryOnHold && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              color: T.warning,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 3,
                            }}
                          >
                            <IconLock size={9} /> Salary Hold
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Joining date */}
                    <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: 12, color: T.fg }}>
                        {emp.joiningDate
                          ? new Date(emp.joiningDate).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—'}
                      </span>
                      {emp.lastWorkingDay && (
                        <p style={{ fontSize: 10, color: T.danger, margin: '2px 0 0' }}>
                          Left:{' '}
                          {new Date(emp.lastWorkingDay).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      )}
                    </td>

                    {/* Monthly CTC */}
                    <td
                      style={{
                        padding: '12px 14px',
                        whiteSpace: 'nowrap',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 600, color: T.fg }}>
                        {emp.monthlySalary > 0 ? fmt(emp.monthlySalary) : '—'}
                      </span>
                    </td>

                    {/* Payslip count */}
                    <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          padding: '3px 10px',
                          borderRadius: 6,
                          background: emp.paidPayslipCount > 0 ? T.successBg : T.muted,
                          color: emp.paidPayslipCount > 0 ? T.success : T.mutedFg,
                          border: `1px solid ${emp.paidPayslipCount > 0 ? T.success : T.border}30`,
                        }}
                      >
                        {emp.paidPayslipCount}
                      </span>
                    </td>

                    {/* Salary hold indicator */}
                    <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                      {emp.salaryOnHold ? (
                        <span style={{ fontSize: 11, color: T.warning, fontWeight: 600 }}>
                          On Hold
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: T.success, fontWeight: 600 }}>
                          Normal
                        </span>
                      )}
                    </td>

                    {/* Arrow */}
                    <td style={{ padding: '12px 14px', width: 40 }}>
                      <IconArrowRight size={14} style={{ color: T.mutedFg, opacity: 0.5 }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {filteredEmployees.length > 0 && (
        <p style={{ fontSize: 12, color: T.mutedFg, margin: '10px 0 0' }}>
          {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? 's' : ''} with paid
          salary records — click any row to view details
        </p>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
