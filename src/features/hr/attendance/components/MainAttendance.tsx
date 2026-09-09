'use client';

import {
  IconAlertCircle,
  IconBell,
  IconBriefcase,
  IconBuilding,
  IconCalendar,
  IconCalendarCheck,
  IconCalendarStats,
  IconCalendarTime,
  IconDownload,
  IconLoader2,
  IconRefresh,
  IconSearch,
  IconSun,
  IconUpload,
  IconUsers,
  IconWorld,
} from '@tabler/icons-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import UserAvatar from '@/components/ui/UserAvatar';
import { resolveActAsTenant } from '@/features/organization/utils/actAsTenant';
import { cn } from '@/lib/utils';
import { useAppSelector } from '@/store/hook';
import { selectUser } from '@/store/slice/userAccountData';
import { getDepartments } from '../server/api/attendanceApi';
import {
  useAttendanceEmployees,
  useAttendanceShifts,
  useMonthlyAttendance,
  useUpsertAttendance,
} from '../server/tanstackQuery/useAttendanceQueries';

// ── Design tokens (T) for modals only — rest of page uses Tailwind ────────────
const T = {
  bg: 'var(--background)',
  fg: 'var(--foreground)',
  card: 'var(--card)',
  muted: 'var(--muted)',
  mutedFg: 'var(--muted-foreground)',
  border: 'var(--border)',
  primary: 'var(--primary)',
  primaryBg: 'color-mix(in oklch, var(--primary) 12%, transparent)',
  primaryFg: 'var(--primary-foreground, #fff)' as string,
  success: 'var(--success)',
  successBg: 'color-mix(in oklch, var(--success) 14%, transparent)',
  warning: 'var(--warning)',
  warningBg: 'color-mix(in oklch, var(--warning) 14%, transparent)',
  danger: 'var(--danger)',
  dangerBg: 'color-mix(in oklch, var(--danger) 14%, transparent)',
  font: "'DM Sans', system-ui, sans-serif" as string,
};

interface PreviewAttendanceRow {
  _id: number;
  employeeId: string;
  employeeName: string;
  date: string; // display dd/mm/yyyy
  parsedDate: string; // ISO yyyy-mm-dd
  status: string;
  checkIn: string | null;
  checkOut: string | null;
  shiftId: string | null;
  shiftName: string | null;
  notes: string | null;
}

const VALID_STATUSES = ['present', 'absent', 'half_day', 'leave', 'holiday', 'overtime'];

const monthLabel = () => new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

const percentageTone = (pct: number) => {
  if (pct >= 90) return { bg: 'bg-success/10', text: 'text-success', bar: 'bg-success' };
  if (pct >= 75) return { bg: 'bg-warning/10', text: 'text-warning', bar: 'bg-warning' };
  return { bg: 'bg-destructive/10', text: 'text-destructive', bar: 'bg-destructive' };
};

const MainAttendance = () => {
  const user = useAppSelector(selectUser);
  const now = new Date();
  const {
    data: monthlyData,
    isLoading,
    isError,
    refetch,
  } = useMonthlyAttendance(now.getFullYear(), now.getMonth() + 1);
  const { data: employees = [] } = useAttendanceEmployees();
  const { data: shifts = [] } = useAttendanceShifts();
  const upsertAttendance = useUpsertAttendance();

  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | 'high' | 'mid' | 'low'>('all');

  // Import state
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewRows, setPreviewRows] = useState<PreviewAttendanceRow[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ saved: number; failed: number } | null>(null);

  const departments = getDepartments(employees);

  const filteredData = useMemo(() => {
    if (!monthlyData) return [];
    const term = searchTerm.toLowerCase().trim();
    return monthlyData.filter((emp) => {
      const matchesSearch =
        !term ||
        emp.employeeName.toLowerCase().includes(term) ||
        emp.employeeId.toLowerCase().includes(term);
      const matchesDepartment = !departmentFilter || emp.department === departmentFilter;
      const matchesTier =
        tierFilter === 'all' ||
        (tierFilter === 'high' && emp.attendancePercentage >= 90) ||
        (tierFilter === 'mid' && emp.attendancePercentage >= 75 && emp.attendancePercentage < 90) ||
        (tierFilter === 'low' && emp.attendancePercentage < 75);
      return matchesSearch && matchesDepartment && matchesTier;
    });
  }, [monthlyData, searchTerm, departmentFilter, tierFilter]);

  const stats = useMemo(() => {
    const list = monthlyData ?? [];
    const total = list.length;
    const avg =
      total > 0 ? Math.round(list.reduce((acc, e) => acc + e.attendancePercentage, 0) / total) : 0;
    return {
      total,
      avg,
      high: list.filter((e) => e.attendancePercentage >= 90).length,
      mid: list.filter((e) => e.attendancePercentage >= 75 && e.attendancePercentage < 90).length,
      low: list.filter((e) => e.attendancePercentage < 75).length,
    };
  }, [monthlyData]);

  // ── Import from CSV / Excel ──────────────────────────────────────────────────
  const importFromExcel = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const XLSX = await import('xlsx');
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { raw: true });
        const parsed: PreviewAttendanceRow[] = [];
        const errors: string[] = [];

        const parseDate = (raw: unknown): { iso: string; display: string } | null => {
          if (raw == null || raw === '') return null;
          if (raw instanceof Date) {
            const y = raw.getFullYear();
            const m = String(raw.getMonth() + 1).padStart(2, '0');
            const d = String(raw.getDate()).padStart(2, '0');
            return { iso: `${y}-${m}-${d}`, display: `${d}/${m}/${y}` };
          }
          if (typeof raw === 'number') {
            const jsDate = new Date(Math.round((raw - 25569) * 86400 * 1000));
            if (!Number.isNaN(jsDate.getTime())) {
              const y = jsDate.getUTCFullYear();
              const m = String(jsDate.getUTCMonth() + 1).padStart(2, '0');
              const d = String(jsDate.getUTCDate()).padStart(2, '0');
              return { iso: `${y}-${m}-${d}`, display: `${d}/${m}/${y}` };
            }
            return null;
          }
          const s = String(raw).trim();
          const ddmm = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
          if (ddmm) {
            const dd = ddmm[1].padStart(2, '0');
            const mm = ddmm[2].padStart(2, '0');
            return { iso: `${ddmm[3]}-${mm}-${dd}`, display: `${dd}/${mm}/${ddmm[3]}` };
          }
          const yyyymm = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
          if (yyyymm) return { iso: s, display: `${yyyymm[3]}/${yyyymm[2]}/${yyyymm[1]}` };
          return null;
        };

        const parseTime = (raw: unknown): string | null => {
          if (raw == null || raw === '') return null;
          const s = String(raw).trim();
          if (/^\d{1,2}:\d{2}$/.test(s)) return s.padStart(5, '0');
          return null;
        };

        for (const [idx, row] of rows.entries()) {
          const rowNum = idx + 2;

          const rawEmpId = row.EmployeeID ?? row.employeeId ?? row['Employee ID'];
          if (!rawEmpId) {
            errors.push(`Row ${rowNum}: Missing EmployeeID`);
            continue;
          }
          const empIdStr = String(rawEmpId).trim();
          const emp = employees.find((e) => e.employeeId === empIdStr);
          if (!emp) {
            errors.push(`Row ${rowNum}: EmployeeID "${empIdStr}" not found`);
            continue;
          }

          const rawDate = row.Date ?? row.date;
          if (rawDate == null || rawDate === '') {
            errors.push(`Row ${rowNum}: Missing Date`);
            continue;
          }
          const dateResult = parseDate(rawDate);
          if (!dateResult) {
            errors.push(`Row ${rowNum}: Invalid Date "${rawDate}" — use dd/mm/yyyy`);
            continue;
          }

          const rawStatus = String(row.Status ?? row.status ?? '')
            .trim()
            .toLowerCase();
          if (!rawStatus) {
            errors.push(`Row ${rowNum}: Missing Status`);
            continue;
          }
          const normalizedStatus = rawStatus === 'halfday' ? 'half_day' : rawStatus;
          if (!VALID_STATUSES.includes(normalizedStatus)) {
            errors.push(
              `Row ${rowNum}: Invalid Status "${rawStatus}" — must be one of: ${VALID_STATUSES.join(', ')}`
            );
            continue;
          }

          const rawShiftName = row.ShiftName ?? row.Shift ?? null;
          let shiftId: string | null = null;
          let shiftName: string | null = null;
          if (rawShiftName) {
            const matched = shifts.find(
              (s) => s.name.toLowerCase() === String(rawShiftName).toLowerCase()
            );
            if (matched) {
              shiftId = matched.id;
              shiftName = matched.name;
            } else {
              errors.push(
                `Row ${rowNum}: ShiftName "${rawShiftName}" not found — row imported without shift`
              );
            }
          }

          parsed.push({
            _id: idx,
            employeeId: emp.employeeId,
            employeeName: emp.name ?? emp.employeeId,
            date: dateResult.display,
            parsedDate: dateResult.iso,
            status: normalizedStatus,
            checkIn: parseTime(row.CheckIn ?? row.checkIn ?? row['Check In']),
            checkOut: parseTime(row.CheckOut ?? row.checkOut ?? row['Check Out']),
            shiftId,
            shiftName,
            notes: row.Notes ? String(row.Notes) : null,
          });
        }

        setImportErrors(errors);
        setPreviewRows(parsed);
        setSelectedRowIds(new Set(parsed.map((r) => r._id)));
        setSaveResult(null);
        setShowPreviewModal(true);
      };
      reader.readAsArrayBuffer(file);
    },
    [employees, shifts]
  );

  const downloadSampleCsv = () => {
    const firstEmp = employees[0]?.employeeId ?? 'EMP001';
    const secondEmp = employees[1]?.employeeId ?? 'EMP002';
    const firstShift = shifts[0]?.name ?? 'Morning Shift';
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const ydd = String(yesterday.getDate()).padStart(2, '0');
    const ymm = String(yesterday.getMonth() + 1).padStart(2, '0');

    const headers = ['EmployeeID', 'Date', 'Status', 'CheckIn', 'CheckOut', 'ShiftName', 'Notes'];
    const row1 = [firstEmp, `${dd}/${mm}/${yyyy}`, 'present', '09:00', '18:00', firstShift, ''];
    const row2 = [secondEmp, `${ydd}/${ymm}/${yyyy}`, 'absent', '', '', '', 'Informed leave'];
    const row3 = [firstEmp, `${ydd}/${ymm}/${yyyy}`, 'half_day', '09:00', '13:00', firstShift, ''];
    const csv = [headers.join(','), row1.join(','), row2.join(','), row3.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_attendance_import.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveImportedRows = async () => {
    const toSave = previewRows.filter((r) => selectedRowIds.has(r._id));
    setIsSaving(true);
    let saved = 0;
    let failed = 0;
    await Promise.all(
      toSave.map(async (r) => {
        try {
          const emp = employees.find((e) => e.employeeId === r.employeeId);
          await upsertAttendance.mutateAsync({
            payload: {
              employeeId: r.employeeId,
              date: r.parsedDate,
              status: r.status,
              checkIn: r.checkIn,
              checkOut: r.checkOut,
              shiftId: r.shiftId,
              notes: r.notes,
            },
            actAsTenantId: resolveActAsTenant(emp?.tenant, user?.tenantId),
          });
          saved++;
        } catch {
          failed++;
        }
      })
    );
    setIsSaving(false);
    setSaveResult({ saved, failed });
    if (failed === 0) {
      refetch();
      setTimeout(() => {
        setShowPreviewModal(false);
        setPreviewRows([]);
        setImportErrors([]);
        setSelectedRowIds(new Set());
        setSaveResult(null);
      }, 1200);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <IconLoader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-[13px]">Loading attendance data…</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
          <IconAlertCircle className="h-7 w-7 text-destructive" />
          <p className="text-[13px] font-semibold text-destructive">
            Couldn't load attendance data
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-4 text-[12px] font-semibold text-primary-foreground hover:opacity-90"
          >
            <IconRefresh className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      </div>
    );
  }

  const calendarStats = (() => {
    const year = now.getFullYear();
    const month = now.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();
    let workingDays = 0;
    let weekendDays = 0;
    for (let d = 1; d <= totalDays; d++) {
      const day = new Date(year, month, d).getDay();
      if (day === 0 || day === 6) weekendDays++;
      else workingDays++;
    }
    const elapsed = now.getDate();
    const remaining = totalDays - elapsed;
    return { totalDays, workingDays, weekendDays, elapsed, remaining };
  })();

  const statCards = [
    {
      label: 'Total Days',
      value: calendarStats.totalDays,
      sub: monthLabel(),
      Icon: IconCalendar,
      tint: 'bg-primary/10 text-primary',
      valueColor: 'text-foreground',
    },
    {
      label: 'Working Days',
      value: calendarStats.workingDays,
      sub: 'Mon – Fri',
      Icon: IconBriefcase,
      tint: 'bg-success/10 text-success',
      valueColor: 'text-success',
    },
    {
      label: 'Weekends',
      value: calendarStats.weekendDays,
      sub: 'Sat & Sun',
      Icon: IconSun,
      tint: 'bg-warning/10 text-warning',
      valueColor: 'text-warning',
    },
    {
      label: 'Days Elapsed',
      value: calendarStats.elapsed,
      sub: 'Since month start',
      Icon: IconCalendarCheck,
      tint: 'bg-primary/10 text-primary',
      valueColor: 'text-primary',
    },
    {
      label: 'Days Remaining',
      value: calendarStats.remaining,
      sub: calendarStats.remaining === 0 ? 'Month ends today' : 'Until month end',
      Icon: IconCalendarTime,
      tint: 'bg-muted text-muted-foreground',
      valueColor: 'text-foreground',
    },
  ];

  const tierTabs: {
    key: 'all' | 'high' | 'mid' | 'low';
    label: string;
    count: number;
  }[] = [
    { key: 'all', label: 'All', count: stats.total },
    { key: 'high', label: 'High', count: stats.high },
    { key: 'mid', label: 'Moderate', count: stats.mid },
    { key: 'low', label: 'Low', count: stats.low },
  ];

  return (
    <div className="bg-background text-foreground grow">
      {/* Hidden file input for CSV/Excel */}
      <input
        ref={csvInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) importFromExcel(f);
          e.target.value = '';
        }}
      />

      <div className="mx-auto max-w-350 space-y-5 px-4 pt-6 pb-10 sm:px-6 lg:px-8">
        {/* Top header bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-0.5 text-[12px] text-muted-foreground">Attendance</p>
            <h1 className="text-[18px] font-bold leading-tight tracking-[-0.03em] sm:text-[22px]">
              Monthly Attendance
            </h1>
          </div>
        </div>

        {/* Hero banner */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <div className="flex flex-col gap-4 bg-linear-to-br from-card to-card/50 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/12 text-primary">
                <IconCalendarStats className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-[18px] font-bold tracking-[-0.02em]">{monthLabel()} Summary</h2>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  View and manage employee attendance records for the month
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-border bg-muted px-4 text-[13px] font-semibold text-foreground transition-opacity hover:opacity-80 sm:w-auto"
              >
                <IconUpload className="h-4 w-4" />
                Import
              </button>
              <button
                type="button"
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:w-auto"
              >
                <IconDownload className="h-4 w-4" />
                Export Report
              </button>
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
          {statCards.map((s) => (
            <div
              key={s.label}
              className="group rounded-xl border border-border bg-card p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg sm:p-5"
            >
              <div
                className={cn(
                  'mb-3 inline-flex h-9 w-9 items-center justify-center rounded-[9px]',
                  s.tint
                )}
              >
                <s.Icon className="h-5.5 w-5.5" />
              </div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                {s.label}
              </p>
              <p
                className={cn(
                  'text-[28px] font-bold leading-none tracking-[-0.02em] tabular-nums',
                  s.valueColor
                )}
              >
                {s.value}
              </p>
              <p className="mt-1.5 text-[10px] text-muted-foreground">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs sm:px-5">
          <div className="flex flex-col gap-2.5 md:flex-row md:items-center">
            <div className="relative flex-1">
              <IconSearch className="pointer-events-none absolute top-1/2 left-3.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name or ID…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-muted pl-10 pr-3 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
              />
            </div>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="h-10 cursor-pointer rounded-lg border border-border bg-muted px-3 pr-8 text-[13px] font-medium text-foreground outline-none transition-colors focus:border-primary md:min-w-44"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>

            {/* Tier tabs */}
            <div className="flex flex-wrap gap-1.5">
              {tierTabs.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTierFilter(t.key)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors',
                    tierFilter === t.key
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-muted text-muted-foreground hover:bg-muted-foreground/10'
                  )}
                >
                  {t.label}
                  <span
                    className={cn(
                      'rounded-full px-1.5 text-[10px] tabular-nums',
                      tierFilter === t.key
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-card text-foreground'
                    )}
                  >
                    {t.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Result count */}
        <div className="px-1 text-[12px] text-muted-foreground">
          Showing{' '}
          <span className="font-semibold text-foreground tabular-nums">{filteredData.length}</span>{' '}
          of{' '}
          <span className="font-semibold text-foreground tabular-nums">
            {monthlyData?.length ?? 0}
          </span>{' '}
          employee{(monthlyData?.length ?? 0) === 1 ? '' : 's'}
        </div>

        {/* Attendance table */}
        {filteredData.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full min-w-215">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                      Employee
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                      Department
                    </th>
                    <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                      Present
                    </th>
                    <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                      Absent
                    </th>
                    <th className="whitespace-nowrap px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                      Half Day
                    </th>
                    <th className="whitespace-nowrap px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                      Leave
                    </th>
                    <th className="whitespace-nowrap px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                      Late Days
                    </th>
                    <th className="whitespace-nowrap px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                      Attendance %
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredData.map((employee) => {
                    const tone = percentageTone(employee.attendancePercentage);
                    return (
                      <tr key={employee.employeeId} className="transition-colors hover:bg-muted/40">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <UserAvatar
                              name={employee.employeeName}
                              avatarUrl={
                                (employee as { avatarUrl?: string | null }).avatarUrl ?? null
                              }
                              size={36}
                            />
                            <div className="min-w-0">
                              <p className="truncate text-[13px] font-semibold">
                                {employee.employeeName}
                              </p>
                              <p className="mt-0.5 truncate font-mono text-[10px] font-semibold text-muted-foreground">
                                {employee.employeeId}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                            <IconBuilding className="h-3.5 w-3.5" />
                            <span className="truncate">{employee.department}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="inline-flex items-center rounded-md bg-success/10 px-2 py-0.5 text-[12px] font-semibold tabular-nums text-success">
                            {employee.totalPresent % 1 === 0
                              ? employee.totalPresent
                              : employee.totalPresent.toFixed(1)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="inline-flex items-center rounded-md bg-destructive/10 px-2 py-0.5 text-[12px] font-semibold tabular-nums text-destructive">
                            {employee.absentDays}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="inline-flex items-center rounded-md bg-warning/10 px-2 py-0.5 text-[12px] font-semibold tabular-nums text-warning">
                            {employee.halfDays}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-[12px] font-semibold tabular-nums text-primary">
                            {employee.leaveDays}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span
                            className={cn(
                              'inline-flex items-center rounded-md px-2 py-0.5 text-[12px] font-semibold tabular-nums',
                              employee.lateDays > 0
                                ? 'bg-orange-500/10 text-orange-500'
                                : 'bg-muted text-muted-foreground'
                            )}
                          >
                            {employee.lateDays}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                              <div
                                className={cn('h-full rounded-full transition-all', tone.bar)}
                                style={{
                                  width: `${Math.min(100, employee.attendancePercentage)}%`,
                                }}
                              />
                            </div>
                            <span
                              className={cn(
                                'rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums',
                                tone.bg,
                                tone.text
                              )}
                            >
                              {employee.attendancePercentage}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <IconUsers className="h-6 w-6" />
            </div>
            <p className="text-[14px] font-semibold">No attendance data found</p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              {searchTerm || departmentFilter || tierFilter !== 'all'
                ? 'Try adjusting your filters.'
                : 'Attendance data will appear here once recorded.'}
            </p>
          </div>
        )}
      </div>

      {/* ── Import Instructions Modal ── */}
      {showImportModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            zIndex: 9000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
          onClick={() => setShowImportModal(false)}
        >
          <div
            style={{
              background: T.card,
              borderRadius: 14,
              padding: '28px 32px',
              maxWidth: 560,
              width: '90%',
              boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
              fontFamily: T.font,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <IconUpload size={18} color={T.primary} />
              <h2 style={{ fontSize: 17, fontWeight: 700, color: T.fg, margin: 0 }}>
                Import Attendance from CSV / Excel
              </h2>
            </div>
            <p style={{ fontSize: 13, color: T.mutedFg, marginBottom: 18 }}>
              Upload a <strong>.csv</strong> or <strong>.xlsx</strong> file. Each row creates or
              updates one attendance record.
            </p>

            {/* Required columns */}
            <div
              style={{
                background: T.primaryBg,
                border: `1px solid color-mix(in oklch, ${T.primary} 25%, transparent)`,
                borderRadius: 8,
                padding: '14px 16px',
                marginBottom: 14,
              }}
            >
              <p style={{ fontSize: 12, fontWeight: 600, color: T.primary, marginBottom: 10 }}>
                Required Columns
              </p>
              {(
                [
                  {
                    col: 'EmployeeID',
                    type: 'text',
                    note: 'Must match an existing employee ID (e.g. EMP001)',
                  },
                  { col: 'Date', type: 'date', note: 'Format: dd/mm/yyyy (e.g. 15/06/2025)' },
                  {
                    col: 'Status',
                    type: 'enum',
                    note: 'present · absent · half_day · leave · holiday · overtime',
                  },
                ] as const
              ).map(({ col, type, note }) => (
                <div
                  key={col}
                  style={{ display: 'flex', gap: 8, marginBottom: 7, alignItems: 'flex-start' }}
                >
                  <span
                    style={{
                      minWidth: 100,
                      fontSize: 11,
                      fontWeight: 700,
                      color: T.primaryFg,
                      background: T.primary,
                      borderRadius: 4,
                      padding: '3px 8px',
                      flexShrink: 0,
                    }}
                  >
                    {col}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: T.mutedFg,
                      background: T.muted,
                      borderRadius: 4,
                      padding: '3px 7px',
                      flexShrink: 0,
                    }}
                  >
                    {type}
                  </span>
                  <span style={{ fontSize: 12, color: T.mutedFg, paddingTop: 2 }}>{note}</span>
                </div>
              ))}
            </div>

            {/* Optional columns */}
            <div
              style={{
                background: T.muted,
                borderRadius: 8,
                padding: '14px 16px',
                marginBottom: 20,
              }}
            >
              <p style={{ fontSize: 12, fontWeight: 600, color: T.fg, marginBottom: 10 }}>
                Optional Columns
              </p>
              {(
                [
                  { col: 'CheckIn', type: 'time', note: 'HH:MM format (e.g. 09:00)' },
                  { col: 'CheckOut', type: 'time', note: 'HH:MM format (e.g. 18:00)' },
                  { col: 'ShiftName', type: 'text', note: 'Must match an existing shift name' },
                  { col: 'Notes', type: 'text', note: 'Any remarks for this record' },
                ] as const
              ).map(({ col, type, note }) => (
                <div
                  key={col}
                  style={{ display: 'flex', gap: 8, marginBottom: 7, alignItems: 'flex-start' }}
                >
                  <span
                    style={{
                      minWidth: 100,
                      fontSize: 11,
                      fontWeight: 600,
                      color: T.fg,
                      background: 'color-mix(in oklch, var(--muted-foreground) 15%, transparent)',
                      borderRadius: 4,
                      padding: '3px 8px',
                      flexShrink: 0,
                    }}
                  >
                    {col}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: T.mutedFg,
                      background: T.card,
                      borderRadius: 4,
                      padding: '3px 7px',
                      flexShrink: 0,
                    }}
                  >
                    {type}
                  </span>
                  <span style={{ fontSize: 12, color: T.mutedFg, paddingTop: 2 }}>{note}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: `1px solid ${T.border}`,
                  background: 'transparent',
                  color: T.mutedFg,
                  fontSize: 13,
                  cursor: 'pointer',
                  fontFamily: T.font,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={downloadSampleCsv}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: `1px solid ${T.border}`,
                  background: T.muted,
                  color: T.fg,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontFamily: T.font,
                }}
              >
                <IconDownload size={14} /> Download Sample CSV
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  csvInputRef.current?.click();
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: T.primary,
                  color: T.primaryFg,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontFamily: T.font,
                }}
              >
                <IconUpload size={14} /> Choose File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Import Preview Modal ── */}
      {showPreviewModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            zIndex: 9500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            style={{
              background: T.card,
              borderRadius: 14,
              padding: '24px 28px',
              maxWidth: 1000,
              width: '100%',
              maxHeight: '88vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 12px 48px rgba(0,0,0,0.22)',
              fontFamily: T.font,
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginBottom: 16,
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: T.fg, margin: 0 }}>
                  Review Attendance Import
                </h2>
                <p style={{ fontSize: 12, color: T.mutedFg, margin: '4px 0 0' }}>
                  {selectedRowIds.size} of {previewRows.length} row
                  {previewRows.length !== 1 ? 's' : ''} selected — uncheck rows to skip them
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowPreviewModal(false);
                    setPreviewRows([]);
                    setImportErrors([]);
                    setSelectedRowIds(new Set());
                    setSaveResult(null);
                  }}
                  style={{
                    padding: '7px 16px',
                    borderRadius: 8,
                    border: `1px solid ${T.border}`,
                    background: 'transparent',
                    color: T.mutedFg,
                    fontSize: 13,
                    cursor: 'pointer',
                    fontFamily: T.font,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveImportedRows}
                  disabled={selectedRowIds.size === 0 || isSaving}
                  style={{
                    padding: '7px 20px',
                    borderRadius: 8,
                    border: 'none',
                    background: selectedRowIds.size === 0 || isSaving ? T.muted : T.primary,
                    color: selectedRowIds.size === 0 || isSaving ? T.mutedFg : T.primaryFg,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: selectedRowIds.size === 0 || isSaving ? 'default' : 'pointer',
                    fontFamily: T.font,
                    minWidth: 90,
                  }}
                >
                  {isSaving
                    ? 'Saving…'
                    : `Save${selectedRowIds.size > 0 ? ` (${selectedRowIds.size})` : ''}`}
                </button>
              </div>
            </div>

            {/* Save result banner */}
            {saveResult && (
              <div
                style={{
                  background: saveResult.failed === 0 ? T.successBg : T.warningBg,
                  border: `1px solid color-mix(in oklch, ${saveResult.failed === 0 ? T.success : T.warning} 30%, transparent)`,
                  borderRadius: 8,
                  padding: '10px 14px',
                  marginBottom: 12,
                  fontSize: 13,
                  fontWeight: 600,
                  color: saveResult.failed === 0 ? T.success : T.warning,
                }}
              >
                {saveResult.saved} record{saveResult.saved !== 1 ? 's' : ''} saved
                {saveResult.failed > 0 ? ` · ${saveResult.failed} failed` : ' successfully'}
              </div>
            )}

            {/* Errors */}
            {importErrors.length > 0 && (
              <div
                style={{
                  background: T.dangerBg,
                  border: `1px solid color-mix(in oklch, ${T.danger} 30%, transparent)`,
                  borderRadius: 8,
                  padding: '10px 14px',
                  marginBottom: 12,
                  maxHeight: 120,
                  overflowY: 'auto',
                }}
              >
                <p style={{ fontSize: 12, fontWeight: 600, color: T.danger, margin: '0 0 6px' }}>
                  {importErrors.length} row{importErrors.length !== 1 ? 's' : ''} skipped due to
                  errors:
                </p>
                {importErrors.map((err) => (
                  <p key={err} style={{ fontSize: 11, color: T.danger, margin: '2px 0' }}>
                    • {err}
                  </p>
                ))}
              </div>
            )}

            {previewRows.length === 0 ? (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: T.mutedFg,
                  fontSize: 13,
                }}
              >
                No valid rows found in file.
              </div>
            ) : (
              <>
                {/* Select All */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: T.muted,
                    marginBottom: 10,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={previewRows.length > 0 && selectedRowIds.size === previewRows.length}
                    onChange={(e) => {
                      if (e.target.checked)
                        setSelectedRowIds(new Set(previewRows.map((r) => r._id)));
                      else setSelectedRowIds(new Set());
                    }}
                    style={{ width: 15, height: 15, cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.fg }}>Select All</span>
                </div>

                {/* Preview table */}
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: T.muted }}>
                        {[
                          '',
                          'Employee',
                          'Employee ID',
                          'Date',
                          'Status',
                          'Check In',
                          'Check Out',
                          'Shift',
                          'Notes',
                        ].map((h) => (
                          <th
                            key={h}
                            style={{
                              padding: '9px 10px',
                              textAlign: 'left',
                              fontWeight: 600,
                              color: T.mutedFg,
                              position: 'sticky',
                              top: 0,
                              background: T.muted,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((r) => {
                        const sel = selectedRowIds.has(r._id);
                        const statusColor =
                          r.status === 'present' || r.status === 'overtime'
                            ? { bg: T.successBg, fg: T.success }
                            : r.status === 'absent'
                              ? { bg: T.dangerBg, fg: T.danger }
                              : r.status === 'half_day'
                                ? { bg: T.warningBg, fg: T.warning }
                                : { bg: T.muted, fg: T.mutedFg };
                        return (
                          <tr
                            key={r._id}
                            style={{
                              borderBottom: `1px solid ${T.border}`,
                              background: sel ? T.primaryBg : 'transparent',
                              cursor: 'pointer',
                            }}
                            onClick={() =>
                              setSelectedRowIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(r._id)) next.delete(r._id);
                                else next.add(r._id);
                                return next;
                              })
                            }
                          >
                            <td style={{ padding: '10px 10px' }}>
                              <input
                                type="checkbox"
                                checked={sel}
                                onChange={() => {}}
                                style={{ width: 14, height: 14 }}
                              />
                            </td>
                            <td
                              style={{
                                padding: '10px 10px',
                                fontWeight: 500,
                                color: T.fg,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {r.employeeName}
                            </td>
                            <td
                              style={{
                                padding: '10px 10px',
                                color: T.mutedFg,
                                fontFamily: 'monospace',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {r.employeeId}
                            </td>
                            <td
                              style={{
                                padding: '10px 10px',
                                color: T.mutedFg,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {r.date}
                            </td>
                            <td style={{ padding: '10px 10px' }}>
                              <span
                                style={{
                                  fontSize: 11,
                                  padding: '3px 8px',
                                  borderRadius: 12,
                                  background: statusColor.bg,
                                  color: statusColor.fg,
                                  fontWeight: 600,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {r.status}
                              </span>
                            </td>
                            <td
                              style={{
                                padding: '10px 10px',
                                color: T.mutedFg,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {r.checkIn ?? '—'}
                            </td>
                            <td
                              style={{
                                padding: '10px 10px',
                                color: T.mutedFg,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {r.checkOut ?? '—'}
                            </td>
                            <td
                              style={{
                                padding: '10px 10px',
                                color: T.mutedFg,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {r.shiftName ?? '—'}
                            </td>
                            <td
                              style={{
                                padding: '10px 10px',
                                color: T.mutedFg,
                                maxWidth: 160,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {r.notes ?? '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MainAttendance;
