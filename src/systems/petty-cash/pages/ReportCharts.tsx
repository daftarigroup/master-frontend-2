import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import { formatCurrency } from '../utils/helpers';

const PALETTE = ['#0ea5e9', '#6366f1', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316'];

const STATUS_COLORS: Record<string, string> = {
  APPROVED: '#10b981',
  PENDING: '#f59e0b',
  REJECTED: '#ef4444',
};

const ChartCard: React.FC<{ title: string; subtitle?: string; children: React.ReactNode; empty?: boolean }> = ({
  title,
  subtitle,
  children,
  empty,
}) => (
  <div className="bg-card border rounded-lg shadow-xs p-4 flex flex-col">
    <div className="mb-2">
      <h3 className="font-bold text-foreground text-xs">{title}</h3>
      {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
    <div className="h-[220px] relative">
      {empty ? (
        <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground italic">
          No data to display
        </div>
      ) : (
        children
      )}
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-popover border border-border rounded-md shadow-md px-2.5 py-1.5 text-xs text-foreground">
      {label && <p className="font-semibold text-foreground mb-1">{label}</p>}
      {payload.map((entry: any, idx: number) => (
        <p key={idx} style={{ color: entry.color || entry.payload?.fill }} className="font-medium">
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
};

export const ReportCharts: React.FC<{ expenses: any[]; statusScopeExpenses: any[] }> = ({
  expenses,
  statusScopeExpenses,
}) => {
  const categoryData = useMemo(() => {
    const totals: Record<string, number> = {};
    expenses.forEach((e) => {
      const key = e.groupHead || 'Uncategorized';
      totals[key] = (totals[key] || 0) + Number(e.amount || 0);
    });
    const total = Object.values(totals).reduce((a, b) => a + b, 0);
    return Object.entries(totals)
      .map(([name, value]) => ({ name, value, percent: total ? (value / total) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  const employeeData = useMemo(() => {
    const totals: Record<string, number> = {};
    expenses.forEach((e) => {
      totals[e.personName] = (totals[e.personName] || 0) + Number(e.amount || 0);
    });
    return Object.entries(totals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  const monthlyTrend = useMemo(() => {
    const totals: Record<string, number> = {};
    expenses.forEach((e) => {
      const month = String(e.date).slice(0, 7); // YYYY-MM
      totals[month] = (totals[month] || 0) + Number(e.amount || 0);
    });
    return Object.entries(totals)
      .map(([month, value]) => ({ month, value }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((row) => ({
        ...row,
        label: new Date(`${row.month}-01`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
      }));
  }, [expenses]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = { APPROVED: 0, PENDING: 0, REJECTED: 0 };
    statusScopeExpenses.forEach((e) => {
      if (counts[e.status] !== undefined) {
        counts[e.status] = counts[e.status] + 1;
      }
    });
    return Object.entries(counts)
      .filter(([, count]) => count > 0)
      .map(([status, count]) => ({ name: status, value: count }));
  }, [statusScopeExpenses]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
      <ChartCard title="Expense by Category" subtitle="Share of total spend per group head" empty={categoryData.length === 0}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={categoryData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="45%"
              innerRadius={40}
              outerRadius={70}
              paddingAngle={3}
            >
              {categoryData.map((entry, index) => (
                <Cell key={entry.name} fill={PALETTE[index % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="bottom" iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Employee-wise Expense" subtitle="Total spend per employee" empty={employeeData.length === 0}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={employeeData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
            <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={45} />
            <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `₹${v}`} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" name="Amount" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Monthly Expense Trend" subtitle="Spend by month" empty={monthlyTrend.length === 0}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={monthlyTrend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
            <XAxis dataKey="label" tick={{ fontSize: 9 }} />
            <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `₹${v}`} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="value" name="Amount" stroke="#6366f1" strokeWidth={2} dot={{ r: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Request Status Distribution"
        subtitle="Approved / Pending / Rejected"
        empty={statusData.length === 0}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={statusData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="45%"
              innerRadius={40}
              outerRadius={70}
              paddingAngle={3}
            >
              {statusData.map((entry) => (
                <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#94a3b8'} />
              ))}
            </Pie>
            <Tooltip />
            <Legend verticalAlign="bottom" iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
};

export default ReportCharts;
