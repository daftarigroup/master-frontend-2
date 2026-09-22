'use client';

import {
  AlertTriangle,
  BarChart2,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  Filter,
  Loader2,
  Plus,
  Sparkles,
  ThermometerSun,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  type DashboardPeriod,
  useMaintenanceDashboardV3,
} from '../server/tanstackQuery/useDashboardQueries';

type SelectedCard = 'machines' | 'departments' | 'weekly' | 'frequent';

const PIE_COLORS = ['#0284c7', '#60A5FA', '#F59E0B', '#10B981', '#8B5CF6', '#EF4444'];

const getHealthBarColor = (score: number) =>
  score >= 70 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500';

const getHealthColorClass = (score: number) =>
  score >= 70
    ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
    : score >= 50
      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400'
      : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400';

const s = (v: unknown): string => String(v ?? '');
const n = (v: unknown): number => Number(v ?? 0);

const MaintenanceDashboard = () => {
  const [selectedCard, setSelectedCard] = useState<SelectedCard | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [filterInput, setFilterInput] = useState('');
  const [tableData, setTableData] = useState<Record<string, unknown>[]>([]);
  const [period, setPeriod] = useState<DashboardPeriod>('thisMonth');

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const chartAxisColor = isDark ? '#9ca3af' : '#6b7280';
  const chartGridColor = isDark ? '#374151' : '#f0f0f0';
  const tooltipStyle = isDark
    ? { backgroundColor: '#1f2937', border: '1px solid #374151', color: '#f3f4f6' }
    : {};

  const { data, isLoading, isFetching, isError, refetch } = useMaintenanceDashboardV3(period);

  const MACHINES = data?.machines ?? [];
  const WORK_ORDERS = data?.workOrders ?? [];
  const ALERTS = data?.alerts ?? [];
  const WEEKLY_COMPLETION = data?.weeklyCompletion ?? [];
  const KPI = data?.kpi ?? {
    totalWorkOrders: 0,
    overdueTasks: 0,
    completedToday: 0,
    completionRate: 0,
    criticalMachines: 0,
    criticalMachineIds: [] as string[],
    activeTechnicians: 0,
    pendingToday: 0,
    totalCost: 0,
  };

  // ── Derived chart data ──────────────────────────────────────────────

  const machineWOData = useMemo(() => {
    const byMachine: Record<string, Record<string, unknown>> = {};
    for (const m of MACHINES) {
      byMachine[m.id] = {
        name: m.assetCode || m.name.slice(0, 10),
        completedWOs: 0,
        pendingWOs: 0,
        status: m.status,
        department: m.line,
      };
    }
    for (const wo of WORK_ORDERS) {
      const entry = byMachine[wo.machineId];
      if (!entry) continue;
      if (wo.status === 'done') entry.completedWOs = n(entry.completedWOs) + 1;
      else entry.pendingWOs = n(entry.pendingWOs) + 1;
    }
    return Object.values(byMachine)
      .filter((m) => n(m.completedWOs) + n(m.pendingWOs) > 0)
      .sort((a, b) => n(b.completedWOs) + n(b.pendingWOs) - (n(a.completedWOs) + n(a.pendingWOs)))
      .slice(0, 6);
  }, [MACHINES, WORK_ORDERS]);

  const departmentData = useMemo(() => {
    const deptMap: Record<string, Record<string, unknown>> = {};
    for (const m of MACHINES) {
      const dept = m.line || 'Unknown';
      if (!deptMap[dept]) deptMap[dept] = { name: dept, machines: 0, tasks: 0 };
      deptMap[dept].machines = n(deptMap[dept].machines) + 1;
    }
    for (const wo of WORK_ORDERS) {
      const m = MACHINES.find((mac) => mac.id === wo.machineId);
      const dept = m?.line || 'Unknown';
      if (!deptMap[dept]) deptMap[dept] = { name: dept, machines: 0, tasks: 0 };
      deptMap[dept].tasks = n(deptMap[dept].tasks) + 1;
    }
    return Object.values(deptMap).filter((d) => s(d.name) !== '—');
  }, [MACHINES, WORK_ORDERS]);

  const weeklyTrendData = useMemo(
    () =>
      WEEKLY_COMPLETION.map((w) => ({
        time: w.day,
        completed: w.completed,
        isToday: w.isToday,
      })),
    [WEEKLY_COMPLETION]
  );

  const frequentWOData = useMemo(() => {
    const woCount: Record<string, Record<string, unknown>> = {};
    for (const m of MACHINES) {
      woCount[m.id] = {
        name: m.assetCode || m.name.slice(0, 10),
        workOrders: 0,
        lastWO: '—',
      };
    }
    for (const wo of WORK_ORDERS) {
      const entry = woCount[wo.machineId];
      if (!entry) continue;
      entry.workOrders = n(entry.workOrders) + 1;
      if (wo.due && (s(entry.lastWO) === '—' || wo.due > s(entry.lastWO))) {
        entry.lastWO = wo.due.slice(0, 10);
      }
    }
    return Object.values(woCount)
      .filter((m) => n(m.workOrders) > 0)
      .sort((a, b) => n(b.workOrders) - n(a.workOrders))
      .slice(0, 5);
  }, [MACHINES, WORK_ORDERS]);

  const sortedByHealth = useMemo(
    () => [...MACHINES].sort((a, b) => a.health - b.health),
    [MACHINES]
  );

  const healthy = useMemo(() => MACHINES.filter((m) => m.health >= 70).length, [MACHINES]);
  const moderate = useMemo(
    () => MACHINES.filter((m) => m.health >= 50 && m.health < 70).length,
    [MACHINES]
  );
  const highRiskMachines = useMemo(
    () => sortedByHealth.filter((m) => m.health < 50),
    [sortedByHealth]
  );

  const downtimeTrend = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().slice(0, 10);
      const count = WORK_ORDERS.filter(
        (wo) => wo.due?.startsWith(dateStr) && wo.status === 'overdue'
      ).length;
      return {
        date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        downtime: count,
      };
    });
  }, [WORK_ORDERS]);

  const woCounts = useMemo(() => {
    const c = { pending: 0, overdue: 0, done: 0 };
    for (const wo of WORK_ORDERS) {
      if (wo.status === 'pending') c.pending++;
      else if (wo.status === 'overdue') c.overdue++;
      else if (wo.status === 'done') c.done++;
    }
    return c;
  }, [WORK_ORDERS]);

  const getMTBF = (machineId: string): string => {
    const done = WORK_ORDERS.filter(
      (wo) => wo.machineId === machineId && wo.status === 'done'
    ).length;
    return done > 0 ? `${done} tasks` : 'N/A';
  };

  // ── Modal handlers ─────────────────────────────────────────────────

  const handleCardClick = (cardType: SelectedCard) => {
    setSelectedCard(cardType);
    setActiveTab(0);
    setFilterInput('');
    switch (cardType) {
      case 'machines':
        setTableData(machineWOData);
        break;
      case 'departments':
        setTableData(departmentData);
        break;
      case 'weekly':
        setTableData(weeklyTrendData);
        break;
      case 'frequent':
        setTableData(frequentWOData);
        break;
    }
  };

  const closeModal = () => {
    setSelectedCard(null);
    setTableData([]);
  };

  const addRow = () => {
    const first = tableData[0];
    if (!first) return;
    setTableData([...tableData, { ...first, name: `New-${Date.now()}` }]);
  };

  const removeRow = (idx: number) => setTableData(tableData.filter((_, i) => i !== idx));

  const getFilteredData = () => {
    if (!filterInput) return tableData;
    return tableData.filter((item) =>
      Object.values(item).some((v) => String(v).toLowerCase().includes(filterInput.toLowerCase()))
    );
  };

  const renderModalTitle = () => {
    switch (selectedCard) {
      case 'machines':
        return 'Machine Work Order Details';
      case 'departments':
        return 'Department Overview';
      case 'weekly':
        return 'Weekly Completion Log';
      case 'frequent':
        return 'Machines by Work Orders';
      default:
        return '';
    }
  };

  const renderTableContent = () => {
    const filtered = getFilteredData();

    if (selectedCard === 'machines') {
      return (
        <table className="w-full">
          <thead className="bg-sky-50 dark:bg-sky-900/30">
            <tr>
              {['Machine', 'Completed WOs', 'Pending WOs', 'Status', 'Department', 'Action'].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold text-sky-800 dark:text-sky-300 uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item, idx) => (
              <tr
                key={idx}
                className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <td className="px-4 py-3 text-xs text-gray-800 dark:text-gray-200 whitespace-nowrap">
                  {s(item.name)}
                </td>
                <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  {n(item.completedWOs)}
                </td>
                <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  {n(item.pendingWOs)}
                </td>
                <td className="px-4 py-3 text-xs">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      s(item.status) === 'good'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400'
                        : s(item.status) === 'warn'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400'
                    }`}
                  >
                    {s(item.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  {s(item.department)}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    type="button"
                    onClick={() => removeRow(idx)}
                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (selectedCard === 'departments') {
      return (
        <table className="w-full">
          <thead className="bg-sky-50 dark:bg-sky-900/30">
            <tr>
              {['Department', 'Machines', 'Work Orders', 'Action'].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold text-sky-800 dark:text-sky-300 uppercase tracking-wider whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item, idx) => (
              <tr
                key={idx}
                className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <td className="px-4 py-3 text-xs font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">
                  {s(item.name)}
                </td>
                <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  {n(item.machines)}
                </td>
                <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  {n(item.tasks)}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    type="button"
                    onClick={() => removeRow(idx)}
                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (selectedCard === 'weekly') {
      return (
        <table className="w-full">
          <thead className="bg-sky-50 dark:bg-sky-900/30">
            <tr>
              {['Day', 'Completed Tasks', 'Today', 'Action'].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold text-sky-800 dark:text-sky-300 uppercase tracking-wider whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item, idx) => (
              <tr
                key={idx}
                className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <td className="px-4 py-3 text-xs text-gray-800 dark:text-gray-200 whitespace-nowrap">
                  {s(item.time)}
                </td>
                <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  {n(item.completed)}
                </td>
                <td className="px-4 py-3 text-xs">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      item.isToday
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}
                  >
                    {item.isToday ? 'Today' : '—'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    type="button"
                    onClick={() => removeRow(idx)}
                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (selectedCard === 'frequent') {
      return (
        <table className="w-full">
          <thead className="bg-sky-50 dark:bg-sky-900/30">
            <tr>
              {['Machine', 'Total Work Orders', 'Last WO Date', 'Action'].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold text-sky-800 dark:text-sky-300 uppercase tracking-wider whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item, idx) => (
              <tr
                key={idx}
                className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <td className="px-4 py-3 text-xs font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">
                  {s(item.name)}
                </td>
                <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  {n(item.workOrders)}
                </td>
                <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  {s(item.lastWO)}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    type="button"
                    onClick={() => removeRow(idx)}
                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    return null;
  };

  // ── Loading / error states ─────────────────────────────────────────

  if (isLoading && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
          <Loader2 className="h-7 w-7 animate-spin text-sky-600" />
          <p className="text-sm">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-center">
          <AlertTriangle className="h-7 w-7 text-red-500" />
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">
            Couldn't load dashboard data
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            The backend could not be reached. Check your connection and try again.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-sky-600 px-4 text-xs font-semibold text-white hover:opacity-90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────

  return (
    <div className="bg-transparent">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Dashboard</h1>
          <div className="flex items-center gap-3">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as DashboardPeriod)}
              className="w-full sm:w-auto px-4 py-2 bg-white dark:bg-gray-800 dark:text-gray-200 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
            >
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Last Month</option>
              <option value="lastQuarter">Last Quarter</option>
              <option value="thisYear">This Year</option>
            </select>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-60"
            >
              {isFetching ? (
                <Loader2 size={16} className="animate-spin text-sky-600" />
              ) : (
                <Sparkles size={16} className="text-sky-600" />
              )}
              Refresh
            </button>
          </div>
        </div>

        {/* KPI Strip — 6 cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[
            {
              label: 'Total Machines',
              value: MACHINES.length,
              icon: <Wrench size={18} className="text-blue-600" />,
              color: 'bg-blue-100 dark:bg-blue-900/40',
            },
            {
              label: 'Maintenance Tasks',
              value: KPI.totalWorkOrders,
              icon: <Calendar size={18} className="text-sky-600" />,
              color: 'bg-sky-100 dark:bg-sky-900/40',
            },
            {
              label: 'Tasks Complete',
              value: woCounts.done,
              icon: <CheckCircle size={18} className="text-green-600" />,
              color: 'bg-green-100 dark:bg-green-900/40',
            },
            {
              label: 'Tasks Pending',
              value: woCounts.pending,
              icon: <Clock size={18} className="text-amber-600" />,
              color: 'bg-amber-100 dark:bg-amber-900/40',
            },
            {
              label: 'Tasks Overdue',
              value: KPI.overdueTasks,
              icon: <AlertTriangle size={18} className="text-red-600" />,
              color: 'bg-red-100 dark:bg-red-900/40',
            },
            {
              label: 'Total Cost',
              display: `₹${KPI.totalCost.toLocaleString('en-IN')}`,
              icon: <DollarSign size={18} className="text-purple-600" />,
              color: 'bg-purple-100 dark:bg-purple-900/40',
            },
          ].map((stat, idx) => (
            <div
              key={idx}
              className="p-4 sm:p-5 bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-100 dark:border-gray-700/50 hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
            >
              <div className="flex items-center">
                <div className={`p-2 ${stat.color} rounded-full mr-3 flex-shrink-0`}>
                  {stat.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    title={stat.label}
                    className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider leading-tight break-words"
                  >
                    {stat.label}
                  </p>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100">
                    {'display' in stat ? stat.display : (stat.value ?? 0).toLocaleString('en-IN')}
                  </h3>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 4 Charts — 2×2 grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Chart 1: Work Orders by Machine */}
          <div
            onClick={() => handleCardClick('machines')}
            className="p-4 sm:p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700/50 cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            <h2 className="flex items-center text-sm sm:text-base font-bold text-gray-800 dark:text-gray-100 mb-4">
              <BarChart2 size={18} className="mr-2 text-sky-600" />
              Work Orders by Machine
            </h2>
            <div className="h-64 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={machineWOData} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridColor} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: chartAxisColor }} />
                  <YAxis tick={{ fontSize: 10, fill: chartAxisColor }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 10, color: chartAxisColor }} />
                  <Bar
                    dataKey="completedWOs"
                    name="Completed"
                    fill="#0284c7"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar dataKey="pendingWOs" name="Pending" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Department Distribution */}
          <div
            onClick={() => handleCardClick('departments')}
            className="p-4 sm:p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700/50 cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            <h2 className="flex items-center text-sm sm:text-base font-bold text-gray-800 dark:text-gray-100 mb-4">
              <DollarSign size={18} className="mr-2 text-sky-600" />
              Department Distribution
            </h2>
            <div className="h-64 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={departmentData}
                    dataKey="machines"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius="80%"
                    label={({ name, percent }: { name: string; percent: number }) =>
                      percent > 0.08 ? name : ''
                    }
                  >
                    {departmentData.map((_d, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 10, color: chartAxisColor }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Weekly Completion Trend */}
          <div
            onClick={() => handleCardClick('weekly')}
            className="p-4 sm:p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700/50 cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            <h2 className="flex items-center text-sm sm:text-base font-bold text-gray-800 dark:text-gray-100 mb-4">
              <ThermometerSun size={18} className="mr-2 text-sky-600" />
              Weekly Completion Trend
            </h2>
            <div className="h-64 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyTrendData} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridColor} />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: chartAxisColor }} />
                  <YAxis tick={{ fontSize: 10, fill: chartAxisColor }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 10, color: chartAxisColor }} />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    name="Completed Tasks"
                    stroke="#0284c7"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 4: Top Machines by Work Orders */}
          <div
            onClick={() => handleCardClick('frequent')}
            className="p-4 sm:p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700/50 cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            <h2 className="flex items-center text-sm sm:text-base font-bold text-gray-800 dark:text-gray-100 mb-4">
              <Wrench size={18} className="mr-2 text-sky-600" />
              Top Machines by Work Orders
            </h2>
            <div className="h-64 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={frequentWOData} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridColor} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: chartAxisColor }} />
                  <YAxis tick={{ fontSize: 10, fill: chartAxisColor }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 10, color: chartAxisColor }} />
                  <Bar
                    dataKey="workOrders"
                    name="Work Orders"
                    fill="#EF4444"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Detail Modal */}
        {selectedCard && (
          <div className="fixed inset-0 z-50 flex justify-center items-center bg-black bg-opacity-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg w-full max-w-5xl max-h-[90vh] overflow-hidden">
              <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700 bg-sky-50 dark:bg-sky-900/20">
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                  {renderModalTitle()}
                </h2>
                <button
                  type="button"
                  onClick={closeModal}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setActiveTab(0)}
                      className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-bold text-xs transition active:scale-95 ${
                        activeTab === 0
                          ? 'bg-sky-600 text-white shadow-md shadow-sky-200'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      Overview ({tableData.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab(1)}
                      className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-bold text-xs transition active:scale-95 ${
                        activeTab === 1
                          ? 'bg-sky-600 text-white shadow-md shadow-sky-200'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      Details
                    </button>
                  </div>

                  <div className="flex w-full sm:w-auto gap-2 items-center">
                    <div className="relative flex-1 sm:flex-none">
                      <Filter
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
                      />
                      <input
                        type="text"
                        placeholder="Filter..."
                        value={filterInput}
                        onChange={(e) => setFilterInput(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addRow}
                      className="p-2 sm:px-4 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition active:scale-95 shadow-md shadow-green-100"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>

                <div className="overflow-auto max-h-[500px] border border-gray-200 dark:border-gray-700 rounded-lg">
                  {renderTableContent()}
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Showing {getFilteredData().length} of {tableData.length} entries
                  </p>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-6 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            PREDICTIVE INTELLIGENCE
            ═══════════════════════════════════════════════════════ */}
        <div className="mt-8 space-y-6">
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} className="text-amber-500" />
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 tracking-wide">
              Predictive Intelligence
            </h2>
            <div className="flex-1 h-px bg-gradient-to-r from-amber-200 dark:from-amber-700 to-transparent" />
          </div>

          {/* Row 1: Machine Health + Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Machine Health Overview */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700/50 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-sky-50 to-white dark:from-sky-900/20 dark:to-gray-900 flex items-center gap-2">
                <CheckCircle size={16} className="text-sky-500" />
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                  Machine Health Overview
                </h3>
              </div>
              <div className="grid grid-cols-3 gap-3 p-4 pb-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{healthy}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Healthy</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-600">{moderate}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Moderate</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{highRiskMachines.length}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">High Risk</p>
                </div>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700/50 max-h-64 overflow-y-auto">
                {sortedByHealth.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 py-8">No machine data.</p>
                ) : (
                  sortedByHealth.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
                          {m.name}
                        </p>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all ${getHealthBarColor(m.health)}`}
                            style={{ width: `${m.health}%` }}
                          />
                        </div>
                      </div>
                      <span
                        className={`flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${getHealthColorClass(m.health)}`}
                      >
                        {m.health}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Upcoming Maintenance Alerts */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700/50 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-red-50 to-white dark:from-red-900/20 dark:to-gray-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-red-500" />
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    Upcoming Maintenance Alerts
                  </h3>
                </div>
                {ALERTS.length > 0 && (
                  <span className="text-xs bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">
                    {ALERTS.length} active
                  </span>
                )}
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700/50 max-h-72 overflow-y-auto">
                {ALERTS.length === 0 ? (
                  <div className="px-5 py-8 text-center text-gray-400 text-sm">
                    <CheckCircle size={24} className="mx-auto mb-2 text-green-400" />
                    All clear! No active alerts.
                  </div>
                ) : (
                  ALERTS.slice(0, 5).map((alert) => (
                    <div
                      key={alert.id}
                      className="px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`flex-shrink-0 mt-1 w-2 h-2 rounded-full ${
                            alert.severity === 'critical'
                              ? 'bg-red-500'
                              : alert.severity === 'warning'
                                ? 'bg-orange-500'
                                : 'bg-yellow-500'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                            {alert.message}
                          </p>
                          {alert.machineId && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                              {alert.machineId}
                            </p>
                          )}
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                            {alert.timestamp}
                          </p>
                        </div>
                        <span
                          className={`flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            alert.severity === 'critical'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                              : alert.severity === 'warning'
                                ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400'
                                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400'
                          }`}
                        >
                          {alert.severity}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {ALERTS.length > 5 && (
                <div className="px-5 py-2 border-t border-gray-100 dark:border-gray-700 text-center text-xs text-sky-600 font-medium">
                  + {ALERTS.length - 5} more alerts
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Downtime Trend + High Risk Machines */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 7-Day Overdue Trend */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700/50 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-orange-50 to-white dark:from-orange-900/20 dark:to-gray-900 flex items-center gap-2">
                <BarChart2 size={16} className="text-orange-500" />
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                  7-Day Overdue Work Orders
                </h3>
              </div>
              <div className="p-4">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart
                    data={downtimeTrend}
                    margin={{ top: 5, right: 10, bottom: 5, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: chartAxisColor }} />
                    <YAxis tick={{ fontSize: 10, fill: chartAxisColor }} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line
                      type="monotone"
                      dataKey="downtime"
                      name="Overdue WOs"
                      stroke="#f97316"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#f97316' }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* High Risk Machines */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700/50 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-red-50 to-white dark:from-red-900/20 dark:to-gray-900 flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-500" />
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                  High Risk Machines
                </h3>
              </div>
              {highRiskMachines.length === 0 ? (
                <div className="px-5 py-8 text-center text-gray-400 text-sm">
                  <CheckCircle size={24} className="mx-auto mb-2 text-green-400" />
                  No high-risk machines.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-red-50 dark:bg-red-900/20">
                      <tr>
                        {['Machine', 'Health', 'Maintenance', 'Risk'].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-left text-xs font-semibold text-red-800 dark:text-red-400 uppercase tracking-wider whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {highRiskMachines.map((m) => (
                        <tr
                          key={m.id}
                          className="border-b border-gray-100 dark:border-gray-700 hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-colors"
                        >
                          <td className="px-4 py-3 text-xs font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">
                            {m.name}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                <div
                                  className="h-1.5 rounded-full bg-red-500"
                                  style={{ width: `${m.health}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-red-700 dark:text-red-400">
                                {m.health}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                            {getMTBF(m.id)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
                              High Risk
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceDashboard;
