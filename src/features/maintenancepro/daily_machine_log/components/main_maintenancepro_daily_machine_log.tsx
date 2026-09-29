'use client';

import {
  Activity,
  BarChart2,
  Briefcase,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Factory,
  FileText,
  Filter,
  Fuel,
  Loader2,
  MapPin,
  MessageSquare,
  MoreVertical,
  Plus,
  Thermometer,
  Timer,
  TrendingUp,
  User,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useEffect, useMemo, useState } from 'react';
import { useProject } from '@/context/ProjectContext';
import { filterByFirmAccess } from '@/lib/firmAccess';
import { CompanySelectField } from '@/features/organization/components/CompanySelectField';
import { useCompanyPinForCreate } from '@/features/organization/hooks/useCompanyPinForCreate';
import { usePagination } from '@/hooks/usePagination';
import { useAppSelector } from '@/store/hook';
import { selectOrgViewMode } from '@/store/slice/userAccountData';
import { useAssignableUsers } from '../../assign_task/server/tanstackQuery/useUsersQueries';
import {
  useCreateDailyMachineLog,
  useDailyMachineLogs,
  useRealMachinesForLog,
} from '../server/tanstackQuery/useDailyMachineLogQueries';
import type { DailyMachineLog } from '../types/types';

const TEMP_THRESHOLD = 80;

const initialForm = {
  machineId: '',
  date: new Date().toISOString().slice(0, 10),
  startTimeReading: '',
  endTimeReading: '',
  runtimeHours: '',
  temperature: '',
  load: '',
  operatorName: '',
  remarks: '',
};

export default function DailyMachineLogPage() {
  const { effectivePermittedFirms, selectedProject } = useProject();
  const queryFirmId = selectedProject ? String(selectedProject.id) : undefined;

  const orgViewMode = useAppSelector(selectOrgViewMode);
  const { pinnedCompany, selectCompany, reset: resetPinnedCompany } = useCompanyPinForCreate();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [filterMachineId, setFilterMachineId] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const showCompanyPicker = showForm && orgViewMode === 'all' && !pinnedCompany;

  useEffect(() => {
    if (!showForm) resetPinnedCompany();
  }, [showForm, resetPinnedCompany]);
  const [selectedLog, setSelectedLog] = useState<DailyMachineLog | null>(null);
  const [toast, setToast] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [filterByDate, setFilterByDate] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const { page, limit, setPage } = usePagination(20);
  // A page number from the old machine filter isn't meaningful for a new one.
  useEffect(() => {
    setPage(1);
  }, [setPage]);

  const { data: logsData, isLoading: logsLoading } = useDailyMachineLogs({
    ...(filterMachineId !== 'all' ? { machineId: filterMachineId } : {}),
    ...(queryFirmId ? { firmId: queryFirmId } : {}),
    page,
    limit,
  });
  const { data: rawMachines, isLoading: machinesLoading } = useRealMachinesForLog(pinnedCompany?.id);
  const machines = useMemo(
    () => filterByFirmAccess(rawMachines ?? [], effectivePermittedFirms),
    [rawMachines, effectivePermittedFirms]
  );
  const { data: users, isLoading: usersLoading } = useAssignableUsers(pinnedCompany?.id);
  const createMutation = useCreateDailyMachineLog();

  const rawLogs = useMemo(() => logsData?.data ?? [], [logsData?.data]);
  const logs = useMemo(
    () => filterByFirmAccess(rawLogs, effectivePermittedFirms),
    [rawLogs, effectivePermittedFirms]
  );
  const total = logs.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().slice(0, 10));
    setFilterByDate(true);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().slice(0, 10));
    setFilterByDate(true);
  };

  const formattedDateString = useMemo(() => {
    try {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        weekday: 'short',
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  const selectedMachine = useMemo(() => {
    if (filterMachineId === 'all') return null;
    return (machines ?? []).find((m) => m.id === filterMachineId) ?? null;
  }, [filterMachineId, machines]);

  const displayedLogs = useMemo<DailyMachineLog[]>(() => {
    if (!filterByDate) return logs;
    const target = logs.filter(
      (l: DailyMachineLog) => l.date === selectedDate || l.date.slice(0, 10) === selectedDate
    );
    return target;
  }, [logs, filterByDate, selectedDate]);

  const kpiStats = useMemo(() => {
    const targetLogs = displayedLogs.length > 0 ? displayedLogs : logs;
    const totalRuntime = targetLogs.reduce(
      (sum: number, l: DailyMachineLog) => sum + (Number(l.runtimeHours) || 0),
      0
    );
    const hours = Math.floor(totalRuntime);
    const minutes = Math.round((totalRuntime % 1) * 60);
    const totalHoursStr = `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`.trim() || '0h';

    const totalFuel = targetLogs.reduce(
      (sum: number, l: DailyMachineLog) => sum + (l.fuelUsed || 0),
      0
    );
    const fuelStr =
      totalFuel > 0
        ? `${totalFuel} L`
        : targetLogs.length > 0
        ? `${Math.round(targetLogs.reduce((sum: number, l: DailyMachineLog) => sum + (l.temperature || 0), 0) / targetLogs.length)}°C`
        : '—';

    const totalTrips = targetLogs.length;

    const avgLoad =
      targetLogs.length > 0
        ? Math.round(
            targetLogs.reduce((sum: number, l: DailyMachineLog) => sum + (l.load || 0), 0) /
              targetLogs.length
          )
        : 0;

    return {
      totalHours: totalHoursStr,
      fuelUsed: fuelStr,
      totalTrips,
      avgProductivity: `${avgLoad}%`,
    };
  }, [displayedLogs, logs]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.machineId) errs.machineId = 'Please select a machine';
    if (!form.date) errs.date = 'Date is required';
    if (
      !form.runtimeHours ||
      Number.isNaN(Number(form.runtimeHours)) ||
      Number(form.runtimeHours) < 0 ||
      Number(form.runtimeHours) > 24
    )
      errs.runtimeHours = 'Runtime must be 0–24 hours';
    if (
      !form.temperature ||
      Number.isNaN(Number(form.temperature)) ||
      Number(form.temperature) < 0 ||
      Number(form.temperature) > 500
    )
      errs.temperature = 'Temperature must be 0–500°C';
    if (
      !form.load ||
      Number.isNaN(Number(form.load)) ||
      Number(form.load) < 0 ||
      Number(form.load) > 100
    )
      errs.load = 'Load must be 0–100%';
    if (!form.operatorName.trim()) errs.operatorName = 'Operator name is required';
    return errs;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    createMutation.mutate(
      {
        dto: {
          machineId: form.machineId,
          date: form.date,
          startTimeReading: form.startTimeReading.trim() || undefined,
          endTimeReading: form.endTimeReading.trim() || undefined,
          runtimeHours: Number(form.runtimeHours),
          temperature: Number(form.temperature),
          load: Number(form.load),
          operatorName: form.operatorName.trim(),
          remarks: form.remarks.trim() || undefined,
        },
        actAsTenantId: pinnedCompany?.id,
      },
      {
        onSuccess: () => {
          showToast('Daily log submitted successfully!');
          setForm({ ...initialForm, date: new Date().toISOString().slice(0, 10) });
          setShowForm(false);
        },
        onError: () => {
          showToast('Failed to save log. Please try again.');
        },
      }
    );
  };

  const inputCls = (field: string) =>
    `w-full px-4 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all ${
      errors[field]
        ? 'border-red-400 bg-red-50 dark:bg-red-900/20 dark:border-red-700'
        : 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 hover:bg-white dark:hover:bg-gray-700 focus:bg-white dark:focus:bg-gray-700 dark:text-gray-200'
    }`;

  // Formats a raw date string (ISO or YYYY-MM-DD) into a readable date like "18 Sep 2026"
  const formatDate = (raw: string) => {
    try {
      const d = new Date(raw);
      // If it parsed OK, format it; otherwise fall back to raw
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    } catch {
      // noop
    }
    return raw;
  };

  // Resolves machineName: prefers the machineName field if it looks like a name (not a cuid),
  // otherwise falls back to looking up the machine by machineId in the machines list.
  const getMachineName = (log: DailyMachineLog) => {
    const { machineName, machineId } = log;
    // A cuid starts with 'c' and is 25 chars — if machineName looks like an ID, look up from list
    if (machineName && machineName.length <= 20 && !machineName.startsWith('c')) {
      return machineName;
    }
    const found = (machines ?? []).find((m) => m.id === machineId);
    if (found) return found.name;
    // Fallback: if machineName is truthy and not too long, use it; else truncate ID
    return machineName || machineId.slice(0, 8) + '…';
  };

  return (
    <div className="space-y-6 w-full">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 px-6 py-3 rounded-lg shadow-lg bg-green-500 text-white font-semibold text-sm">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700/50">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3 tracking-tight">
            <div className="p-2 bg-sky-100 dark:bg-sky-900/40 rounded-lg shadow-sm shadow-sky-50">
              <Activity size={24} className="text-sky-600" />
            </div>
            Daily Machine Log
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 ml-11">
            Operational Intelligence
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowForm(true);
          }}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-sky-600 text-white rounded-xl hover:bg-sky-700 transition-all text-sm font-semibold shadow-sm hover:shadow active:scale-95 tracking-wide w-full sm:w-auto"
        >
          <Plus size={18} />
          Add Log Entry
        </button>
      </div>

      {/* Modal Form */}
      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) {
            setErrors({});
            resetPinnedCompany();
          }
        }}
      >
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0">
          <DialogHeader className="p-6 border-b border-border text-left">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 shrink-0">
                <Activity size={22} />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-foreground">
                  New Daily Log Entry
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Record machine runtime, temperature, load, and operator details
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {showCompanyPicker ? (
            <div className="p-6">
              <CompanySelectField onSelect={selectCompany} />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-1.5">
                    <label
                      className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1"
                      htmlFor="machineId"
                    >
                      Machine *
                    </label>
                    <select
                      id="machineId"
                      className={inputCls('machineId')}
                      value={form.machineId}
                      onChange={(e) => setForm({ ...form, machineId: e.target.value })}
                      disabled={machinesLoading}
                    >
                      <option value="">
                        {machinesLoading ? 'Loading machines…' : 'Select Machine...'}
                      </option>
                      {(machines ?? []).map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.assetCode})
                        </option>
                      ))}
                    </select>
                    {errors.machineId && (
                      <p className="text-xs text-red-500 mt-1 ml-1">{errors.machineId}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label
                      className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1"
                      htmlFor="logDate"
                    >
                      Date *
                    </label>
                    <input
                      id="logDate"
                      type="date"
                      className={inputCls('date')}
                      value={form.date}
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                    />
                    {errors.date && <p className="text-xs text-red-500 mt-1 ml-1">{errors.date}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label
                      className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1"
                      htmlFor="startTimeReading"
                    >
                      Start Time Reading
                    </label>
                    <div className="relative group">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-400 group-focus-within:text-sky-500 transition-colors">
                        <Clock size={16} />
                      </div>
                      <input
                        id="startTimeReading"
                        type="time"
                        className={`pl-12 ${inputCls('startTimeReading')}`}
                        value={form.startTimeReading}
                        onChange={(e) => setForm({ ...form, startTimeReading: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label
                      className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1"
                      htmlFor="endTimeReading"
                    >
                      End Time Reading
                    </label>
                    <div className="relative group">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-400 group-focus-within:text-sky-500 transition-colors">
                        <Clock size={16} />
                      </div>
                      <input
                        id="endTimeReading"
                        type="time"
                        className={`pl-12 ${inputCls('endTimeReading')}`}
                        value={form.endTimeReading}
                        onChange={(e) => setForm({ ...form, endTimeReading: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label
                      className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1"
                      htmlFor="runtimeHours"
                    >
                      Runtime Hours *
                    </label>
                    <div className="relative group">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-400 group-focus-within:text-sky-500 transition-colors">
                        <Clock size={16} />
                      </div>
                      <input
                        id="runtimeHours"
                        type="number"
                        min={0}
                        max={24}
                        step={0.5}
                        placeholder="e.g. 8"
                        className={`pl-12 ${inputCls('runtimeHours')}`}
                        value={form.runtimeHours}
                        onChange={(e) => setForm({ ...form, runtimeHours: e.target.value })}
                      />
                    </div>
                    {errors.runtimeHours && (
                      <p className="text-xs text-red-500 mt-1 ml-1">{errors.runtimeHours}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label
                      className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1"
                      htmlFor="temperature"
                    >
                      Temperature (°C) *
                    </label>
                    <div className="relative group">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-400 group-focus-within:text-sky-500 transition-colors">
                        <Thermometer size={16} />
                      </div>
                      <input
                        id="temperature"
                        type="number"
                        min={0}
                        max={500}
                        placeholder="e.g. 45"
                        className={`pl-12 ${inputCls('temperature')}`}
                        value={form.temperature}
                        onChange={(e) => setForm({ ...form, temperature: e.target.value })}
                      />
                    </div>
                    {errors.temperature && (
                      <p className="text-xs text-red-500 mt-1 ml-1">{errors.temperature}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label
                      className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1"
                      htmlFor="load"
                    >
                      Load (%) *
                    </label>
                    <input
                      id="load"
                      type="number"
                      min={0}
                      max={100}
                      placeholder="e.g. 75"
                      className={inputCls('load')}
                      value={form.load}
                      onChange={(e) => setForm({ ...form, load: e.target.value })}
                    />
                    {errors.load && <p className="text-xs text-red-500 mt-1 ml-1">{errors.load}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label
                      className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1"
                      htmlFor="operatorName"
                    >
                      Operator Name *
                    </label>
                    <div className="relative group">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-400 group-focus-within:text-sky-500 transition-colors">
                        <User size={16} />
                      </div>
                      <select
                        id="operatorName"
                        className={`pl-12 ${inputCls('operatorName')}`}
                        value={form.operatorName}
                        onChange={(e) => setForm({ ...form, operatorName: e.target.value })}
                        disabled={usersLoading}
                      >
                        <option value="">
                          {usersLoading ? 'Loading users…' : 'Select Operator...'}
                        </option>
                        {(users ?? []).map((u) => (
                          <option key={u.id} value={u.name}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {errors.operatorName && (
                      <p className="text-xs text-red-500 mt-1 ml-1">{errors.operatorName}</p>
                    )}
                  </div>
                  <div className="md:col-span-2 lg:col-span-3 space-y-1.5">
                    <label
                      className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1"
                      htmlFor="remarks"
                    >
                      Remarks
                    </label>
                    <div className="relative group">
                      <div className="absolute left-3 top-3 p-1.5 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-400 group-focus-within:text-sky-500 transition-colors">
                        <MessageSquare size={16} />
                      </div>
                      <textarea
                        id="remarks"
                        rows={3}
                        placeholder="Any observations or notes..."
                        className={`pl-12 ${inputCls('remarks')}`}
                        value={form.remarks}
                        onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              <DialogFooter className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setErrors({});
                    setForm({ ...initialForm, date: new Date().toISOString().slice(0, 10) });
                  }}
                  className="px-6 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-8 py-2.5 text-sm font-semibold bg-sky-600 text-white rounded-xl hover:bg-sky-700 transition-all shadow-sm active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {createMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                  Save Log Entry
                </button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        {selectedLog && (
          <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto p-0 gap-0">
            <DialogHeader className="p-6 border-b border-border text-left">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 shrink-0">
                  <Activity size={20} />
                </div>
                <div>
                  <DialogTitle className="text-lg font-semibold text-foreground leading-snug">
                    {getMachineName(selectedLog)}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(selectedLog.date)}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/40 rounded-xl p-4 border border-border/50">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Start Reading
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {selectedLog.startTimeReading || '—'}
                  </p>
                </div>
                <div className="bg-muted/40 rounded-xl p-4 border border-border/50">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    End Reading
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {selectedLog.endTimeReading || '—'}
                  </p>
                </div>
                <div className="bg-sky-50 dark:bg-sky-900/20 rounded-xl p-4 border border-sky-100 dark:border-sky-800/30">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Clock size={12} />
                    Runtime
                  </p>
                  <p className="text-sm font-medium text-sky-700 dark:text-sky-400">
                    {selectedLog.runtimeHours}h
                  </p>
                </div>
                <div
                  className={`rounded-xl p-4 border ${
                    selectedLog.temperature > TEMP_THRESHOLD
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/30'
                      : 'bg-muted/40 border-border/50'
                  }`}
                >
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Thermometer size={12} />
                    Temperature
                  </p>
                  <p
                    className={`text-sm font-medium ${
                      selectedLog.temperature > TEMP_THRESHOLD ? 'text-red-600' : 'text-foreground'
                    }`}
                  >
                    {selectedLog.temperature}°C {selectedLog.temperature > TEMP_THRESHOLD && '⚠️'}
                  </p>
                </div>
                <div className="bg-muted/40 rounded-xl p-4 border border-border/50">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Load
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {selectedLog.load}%
                  </p>
                </div>
                <div className="bg-muted/40 rounded-xl p-4 border border-border/50">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                    <User size={12} />
                    Operator
                  </p>
                  <p className="text-sm font-medium text-foreground truncate">
                    {selectedLog.operatorName}
                  </p>
                </div>
              </div>
              <div className="bg-muted/40 rounded-xl p-4 border border-border/50">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                  <MessageSquare size={12} />
                  Remarks
                </p>
                <p className="text-sm text-foreground leading-relaxed italic">
                  {selectedLog.remarks ? (
                    `"${selectedLog.remarks}"`
                  ) : (
                    <span className="text-muted-foreground/50 not-italic">No remarks</span>
                  )}
                </p>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Machine Selector Breadcrumb / Hero Card (Image 2 style) */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-800/40 flex items-center justify-center shrink-0">
              <Factory size={24} className="text-sky-600 dark:text-sky-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 truncate">
                  {selectedMachine ? selectedMachine.name : 'All Equipment Fleet'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50">
                  Active
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                <span className="font-mono font-medium text-sky-600 dark:text-sky-400">
                  {selectedMachine ? selectedMachine.assetCode : 'ALL-ASSETS'}
                </span>
                <span>•</span>
                <span>
                  {selectedMachine ? 'Active Unit' : `${machines?.length ?? 0} machines registered`}
                </span>
              </div>
            </div>
          </div>

          <div className="relative shrink-0 w-full sm:w-auto">
            <select
              className="text-xs font-semibold border border-gray-200 dark:border-gray-700 rounded-xl pl-3 pr-8 py-2 bg-gray-50/50 dark:bg-gray-800 dark:text-gray-200 appearance-none w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              value={filterMachineId}
              onChange={(e) => setFilterMachineId(e.target.value)}
            >
              <option value="all">Fleet: All Equipment</option>
              {(machines ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.assetCode})
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
          </div>
        </div>
      </div>

      {/* Date Carousel Navigation & Quick Add (Image 2 style) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-1.5 shadow-2xs">
          <button
            type="button"
            onClick={handlePrevDay}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-500 dark:text-gray-400 transition-colors"
            title="Previous Day"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="relative flex items-center gap-2 px-3 py-1 font-semibold text-xs text-gray-800 dark:text-gray-200 cursor-pointer">
            <Calendar size={14} className="text-sky-600" />
            <span>{formattedDateString}</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setFilterByDate(true);
              }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <ChevronDown size={12} className="text-gray-400" />
          </div>

          <button
            type="button"
            onClick={handleNextDay}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-500 dark:text-gray-400 transition-colors"
            title="Next Day"
          >
            <ChevronRight size={16} />
          </button>

          {filterByDate && (
            <button
              type="button"
              onClick={() => setFilterByDate(false)}
              className="ml-2 px-2 py-1 text-[11px] text-sky-600 hover:text-sky-700 dark:text-sky-400 font-medium hover:underline"
            >
              Clear Date Filter
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-600 text-white rounded-xl hover:bg-sky-700 transition-all text-xs font-semibold shadow-2xs hover:shadow active:scale-95"
        >
          <Plus size={16} />
          <span>Add Work Log</span>
        </button>
      </div>

      {/* 4-KPI Strip (Image 2 style) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-900 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-2xs">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
            <Clock size={14} className="text-amber-500" />
            <span>Total Hours</span>
          </div>
          <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {kpiStats.totalHours}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-2xs">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
            <Fuel size={14} className="text-orange-500" />
            <span>Fuel / Temp</span>
          </div>
          <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {kpiStats.fuelUsed}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-2xs">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
            <Activity size={14} className="text-sky-500" />
            <span>Total Trips</span>
          </div>
          <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {kpiStats.totalTrips}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-2xs">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
            <TrendingUp size={14} className="text-emerald-500" />
            <span>Avg. Productivity</span>
          </div>
          <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {kpiStats.avgProductivity}
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700/50 overflow-hidden flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 border-b bg-white dark:bg-gray-900 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 tracking-tight">
              Log History
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Historical records of machine operations
            </p>
          </div>
          <div className="relative group w-full sm:w-auto">
            <Filter
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-sky-500 transition-colors"
            />
            <select
              className="text-sm font-medium border border-gray-200 dark:border-gray-700 rounded-xl pl-10 pr-4 py-2 bg-gray-50/50 dark:bg-gray-800 dark:text-gray-200 appearance-none w-full sm:min-w-[180px] focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/50 focus:bg-white transition-all text-gray-700"
              value={filterMachineId}
              onChange={(e) => setFilterMachineId(e.target.value)}
            >
              <option value="all">All Machines</option>
              {(machines ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-auto">
          <table className="w-full border-separate border-spacing-0">
            <thead className="sticky top-0 z-10 bg-gray-50/95 dark:bg-gray-800/95 backdrop-blur-sm">
              <tr>
                {[
                  'Date',
                  'Machine',
                  'Start Reading',
                  'End Reading',
                  'Runtime (hrs)',
                  'Temperature',
                  'Load %',
                  'Operator',
                  'Remarks',
                  ...(logs.some((l) => l.tenant) ? ['Company'] : []),
                ].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {logsLoading ? (
                <tr>
                  <td
                    colSpan={logs.some((l) => l.tenant) ? 10 : 9}
                    className="px-6 py-20 text-center"
                  >
                    <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                      <Loader2 size={32} className="mb-3 animate-spin text-sky-500" />
                      <p className="text-sm font-medium text-muted-foreground">Loading logs…</p>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={logs.some((l) => l.tenant) ? 10 : 9}
                    className="px-6 py-20 text-center"
                  >
                    <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                      <Activity size={48} className="mb-4 opacity-10" />
                      <p className="text-sm font-semibold text-muted-foreground">
                        No log entries found
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">Add a log entry to get started</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const tempWarn = log.temperature > TEMP_THRESHOLD;
                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="group hover:bg-sky-50/30 dark:hover:bg-sky-900/10 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap font-normal">
                        {formatDate(log.date)}
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                        {getMachineName(log)}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-700 dark:text-gray-300 font-normal whitespace-nowrap">
                        {log.startTimeReading || (
                          <span className="text-gray-300 dark:text-gray-600 italic">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-700 dark:text-gray-300 font-normal whitespace-nowrap">
                        {log.endTimeReading || (
                          <span className="text-gray-300 dark:text-gray-600 italic">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-700 dark:text-gray-300 font-medium">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                          {log.runtimeHours}h
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-700 dark:text-gray-300">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${tempWarn ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800' : 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'}`}
                        >
                          {log.temperature}°C{' '}
                          {tempWarn && <span className="ml-1 animate-pulse">⚠️</span>}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-gray-700 dark:text-gray-300">
                        {log.load}%
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-700 dark:text-gray-300 font-normal whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-sky-600 flex items-center justify-center text-white text-xs font-medium shadow-sm">
                            {log.operatorName.charAt(0)}
                          </div>
                          {log.operatorName}
                        </div>
                      </td>
                      <td
                        className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 max-w-[200px] truncate"
                        title={log.remarks ?? ''}
                      >
                        {log.remarks || (
                          <span className="text-gray-300 dark:text-gray-600 italic">
                            No remarks
                          </span>
                        )}
                      </td>
                      {logs.some((l) => l.tenant) && (
                        <td className="px-6 py-4 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {log.tenant?.name ?? '—'}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards (Image 2 style) */}
        <div className="md:hidden overflow-auto p-4 space-y-3 bg-gray-50/50 dark:bg-gray-800/30">
          {logsLoading ? (
            <div className="px-6 py-12 text-center bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
              <Loader2 size={32} className="mx-auto mb-3 animate-spin text-sky-500" />
              <p className="text-sm font-semibold text-muted-foreground">Loading logs…</p>
            </div>
          ) : displayedLogs.length === 0 ? (
            <div className="px-6 py-12 text-center bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
              <Activity size={48} className="mx-auto mb-4 text-gray-200" />
              <p className="text-sm font-semibold text-muted-foreground">
                No log entries found for this filter
              </p>
              {filterByDate && (
                <button
                  type="button"
                  onClick={() => setFilterByDate(false)}
                  className="mt-3 text-xs text-sky-600 font-semibold hover:underline"
                >
                  View all available dates ({logs.length} total)
                </button>
              )}
            </div>
          ) : (
            displayedLogs.map((log: DailyMachineLog, index: number) => {
              const tempWarn = log.temperature > TEMP_THRESHOLD;
              const isApproved = log.approvalStatus === 'APPROVED';
              const logId = `WL-${log.date.slice(0, 10).replace(/-/g, '')}-${String(index + 1).padStart(2, '0')}`;
              const durationHours = Math.floor(log.runtimeHours);
              const durationMins = Math.round((log.runtimeHours % 1) * 60);
              const durationStr = `${durationHours}h ${durationMins > 0 ? `${durationMins}m` : ''}`.trim() || `${log.runtimeHours}h`;

              return (
                <div
                  key={log.id}
                  className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 space-y-3 transition-all hover:shadow-md"
                >
                  {/* Card Header: Number Badge, Log ID, Approval Status & Menu */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-md bg-amber-500 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <span className="text-xs font-bold text-gray-800 dark:text-gray-200 font-mono truncate">
                        Log ID: {logId}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isApproved ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50">
                          <CheckCircle2 size={11} /> Approved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/50">
                          <Clock size={11} /> Pending
                        </span>
                      )}

                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setActiveMenuId(activeMenuId === log.id ? null : log.id)}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md"
                        >
                          <MoreVertical size={15} />
                        </button>
                        {activeMenuId === log.id && (
                          <div className="absolute right-0 top-6 w-36 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-1 z-20 text-xs">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedLog(log);
                                setActiveMenuId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                              View Details
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Machine Name Banner */}
                  <div className="text-[11px] text-sky-600 dark:text-sky-400 font-medium">
                    {getMachineName(log)}
                  </div>

                  {/* Time & Meter Timeline Strip */}
                  <div className="bg-gray-50/70 dark:bg-gray-800/50 rounded-xl p-3 border border-gray-100 dark:border-gray-800/80 flex items-center justify-between text-center">
                    <div className="text-left">
                      <div className="text-[10px] text-gray-400 font-medium uppercase">Start</div>
                      <div className="text-xs font-bold text-gray-900 dark:text-gray-100">
                        {log.startTimeReading || '08:00 AM'}
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono">
                        Meter: {log.startTimeReading ? `${log.startTimeReading}h` : '—'}
                      </div>
                    </div>

                    <div className="flex flex-col items-center px-2">
                      <Timer size={14} className="text-sky-500 mb-0.5" />
                      <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400">
                        {durationStr}
                      </span>
                      <span className="text-[9px] text-gray-400">Duration</span>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-gray-400 font-medium uppercase">End</div>
                      <div className="text-xs font-bold text-gray-900 dark:text-gray-100">
                        {log.endTimeReading || '05:00 PM'}
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono">
                        Meter: {log.endTimeReading ? `${log.endTimeReading}h` : '—'}
                      </div>
                    </div>
                  </div>

                  {/* 2-Column Details Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                      <User size={13} className="text-gray-400 shrink-0" />
                      <span className="truncate">{log.operatorName}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                      <Fuel size={13} className="text-orange-500 shrink-0" />
                      <span>{log.fuelUsed ? `${log.fuelUsed} L` : `${log.temperature}°C`}</span>
                      {tempWarn && <span className="text-[9px] text-red-500 font-bold">HOT</span>}
                    </div>

                    <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                      <MapPin size={13} className="text-sky-500 shrink-0" />
                      <span className="truncate">{log.location || 'Site Area'}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                      <Briefcase size={13} className="text-purple-500 shrink-0" />
                      <span className="truncate">{log.workType || 'Standard Ops'}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                      <BarChart2 size={13} className="text-emerald-500 shrink-0" />
                      <span>{log.load}% Load</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                      <FileText size={13} className="text-gray-400 shrink-0" />
                      <span className="truncate italic text-gray-500 dark:text-gray-400">
                        {log.remarks || 'Routine shift'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="px-6 py-4 border-t dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>
            Showing {logs.length} of {total} entries
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2 normal-case tracking-normal">
              <button
                type="button"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-1.5 text-gray-400 hover:text-sky-600 rounded-lg disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-medium text-muted-foreground tabular-nums">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-1.5 text-gray-400 hover:text-sky-600 rounded-lg disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-sky-600 bg-sky-100/50 dark:bg-sky-900/20 px-3 py-1 rounded-full border border-sky-100 dark:border-sky-900 text-xs font-medium">
            <div className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
            Live Data Feed
          </div>
        </div>
      </div>
    </div>
  );
}
