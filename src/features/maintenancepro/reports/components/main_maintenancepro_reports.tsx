'use client';
import { BarChart2, Calendar, DollarSign, Download, Filter, Loader2, Wrench } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  useCostAnalysisReport,
  useMachineReliabilityReport,
  useReportDepartments,
} from '../server/tanstackQuery/useReportsQueries';
import type { ReportTimeframe } from '../types/types';

const formatINR = (value: number) => `₹${value.toLocaleString('en-IN')}`;

const reliabilityColor = (score: number) =>
  score >= 90 ? '#10B981' : score >= 70 ? '#F59E0B' : '#EF4444';

const departmentChartColors = ['#0284c7', '#60A5FA', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899'];

export default function ReportsPage() {
  const [reportType, setReportType] = useState<'costAnalysis' | 'machineReliability'>(
    'costAnalysis'
  );
  const [selectedTimeframe, setSelectedTimeframe] = useState<ReportTimeframe>('thisYear');
  const [selectedDepartment, setSelectedDepartment] = useState('all');

  const filters = {
    timeframe: selectedTimeframe,
    departmentId: selectedDepartment === 'all' ? undefined : selectedDepartment,
  };

  const { data: departments } = useReportDepartments();
  const {
    data: costAnalysis,
    isLoading: isCostLoading,
    isError: isCostError,
  } = useCostAnalysisReport(filters);
  const {
    data: reliability,
    isLoading: isReliabilityLoading,
    isError: isReliabilityError,
  } = useMachineReliabilityReport(filters);

  const monthlyCostData = costAnalysis?.monthlyCosts ?? [];
  const departmentCostData = costAnalysis?.departmentCosts ?? [];
  // Disambiguate the chart's machine-name label when the response is merged
  // across companies — two companies could otherwise both have a machine
  // named e.g. "Compressor 1" and appear as one indistinguishable bar.
  const machineReliabilityData = (reliability?.machines ?? []).map((m) => ({
    name: m.tenant ? `${m.machineName} (${m.tenant.name})` : m.machineName,
    value: m.reliabilityScore,
    color: reliabilityColor(m.reliabilityScore),
  }));

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const chartAxisColor = isDark ? '#9ca3af' : '#6b7280';
  const chartGridColor = isDark ? '#374151' : '#f0f0f0';
  const tooltipStyle = isDark
    ? { backgroundColor: '#1f2937', border: '1px solid #374151', color: '#f3f4f6' }
    : {};
  const tooltipItemStyle = isDark ? { color: '#f3f4f6' } : {};
  const tooltipLabelStyle = isDark ? { color: '#e5e7eb' } : {};

  const downloadCSV = (data: Record<string, string | number>[], filename: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map((row) =>
        headers
          .map((h) => {
            const v = row[h];
            return typeof v === 'string' && v.includes(',') ? `"${v}"` : v;
          })
          .join(',')
      ),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExport = () => {
    if (reportType === 'costAnalysis') {
      downloadCSV(
        monthlyCostData.map((i) => ({ Month: i.month, 'Cost (₹)': i.cost })),
        'monthly_maintenance_costs'
      );
      downloadCSV(
        departmentCostData.map((i) => ({ Department: i.department, 'Cost (₹)': i.cost })),
        'department_cost_breakdown'
      );
    } else {
      downloadCSV(
        (reliability?.machines ?? []).map((i) => ({
          Machine_Name: i.machineName,
          Reliability_Score: `${i.reliabilityScore}%`,
          Status: i.status,
          ...(i.tenant ? { Company: i.tenant.name } : {}),
        })),
        'machine_reliability_report'
      );
    }
  };

  const isLoading = reportType === 'costAnalysis' ? isCostLoading : isReliabilityLoading;
  const isError = reportType === 'costAnalysis' ? isCostError : isReliabilityError;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 justify-between items-center sm:flex-row">
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Reports</h1>
        <button
          type="button"
          onClick={handleExport}
          disabled={isLoading}
          className="inline-flex justify-center items-center px-4 py-2 w-full text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-lg sm:w-auto hover:bg-gray-50 disabled:opacity-50 dark:text-gray-200 dark:bg-gray-800 dark:border-gray-600 dark:hover:bg-gray-700"
        >
          <Download size={16} className="mr-2" />
          Export Report
        </button>
      </div>

      <div className="flex flex-col p-4 space-y-4 bg-white rounded-lg shadow-lg dark:bg-gray-900">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-center space-x-2">
            <select
              className="px-4 py-2 w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              value={reportType}
              onChange={(e) =>
                setReportType(e.target.value as 'costAnalysis' | 'machineReliability')
              }
            >
              <option value="costAnalysis">Cost Analysis</option>
              <option value="machineReliability">Machine Reliability</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar size={16} className="flex-shrink-0 text-gray-500 dark:text-gray-400" />
            <select
              className="px-4 py-2 w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value as ReportTimeframe)}
            >
              <option value="thisMonth">This Month</option>
              <option value="lastQuarter">Last Quarter</option>
              <option value="thisYear">This Year</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <Filter size={16} className="flex-shrink-0 text-gray-500 dark:text-gray-400" />
            <select
              className="px-4 py-2 w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
            >
              <option value="all">All Departments</option>
              {(departments ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center items-center p-12 bg-white rounded-lg shadow-lg dark:bg-gray-900">
          <Loader2 size={24} className="animate-spin text-sky-600" />
        </div>
      )}

      {!isLoading && isError && (
        <div className="p-6 text-sm text-center text-red-600 bg-white rounded-lg shadow-lg dark:bg-gray-900 dark:text-red-400">
          Failed to load report data. Please try again.
        </div>
      )}

      {!isLoading && !isError && reportType === 'costAnalysis' && (
        <div className="space-y-6">
          <div className="p-4 bg-white rounded-lg shadow-lg sm:p-6 dark:bg-gray-900">
            <h2 className="flex items-center mb-6 text-base font-semibold dark:text-gray-100">
              <DollarSign size={20} className="mr-2 text-sky-600" />
              Monthly Maintenance Costs
            </h2>
            {monthlyCostData.length === 0 ? (
              <p className="py-10 text-sm text-center text-gray-500 dark:text-gray-400">
                No cost data for the selected period.
              </p>
            ) : (
              <div className="h-60 overflow-x-auto sm:h-80">
                <ResponsiveContainer width="100%" height="100%" minWidth={280}>
                  <BarChart data={monthlyCostData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                    <XAxis dataKey="month" tick={{ fill: chartAxisColor }} />
                    <YAxis
                      tickFormatter={(v: number) => `₹${v / 1000}K`}
                      tick={{ fill: chartAxisColor }}
                    />
                    <Tooltip
                      formatter={(v: number) => formatINR(v)}
                      contentStyle={tooltipStyle}
                      itemStyle={tooltipItemStyle}
                      labelStyle={tooltipLabelStyle}
                    />
                    <Legend wrapperStyle={{ color: chartAxisColor }} />
                    <Bar dataKey="cost" name="Monthly Cost" fill="#0284c7" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="p-4 bg-white rounded-lg shadow-lg sm:p-6 dark:bg-gray-900">
              <h2 className="flex items-center mb-6 text-base font-semibold dark:text-gray-100">
                <Wrench size={20} className="mr-2 text-sky-600" />
                Department Cost Breakdown
              </h2>
              {departmentCostData.length === 0 ? (
                <p className="py-10 text-sm text-center text-gray-500 dark:text-gray-400">
                  No department cost data for the selected period.
                </p>
              ) : (
                <div className="h-60 overflow-x-auto sm:h-80">
                  <ResponsiveContainer width="100%" height="100%" minWidth={260}>
                    <PieChart>
                      <Pie
                        data={departmentCostData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="cost"
                        nameKey="department"
                        label={({ department, percent }: { department: string; percent: number }) =>
                          `${department} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {departmentCostData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={departmentChartColors[index % departmentChartColors.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number) => formatINR(v)}
                        contentStyle={tooltipStyle}
                        itemStyle={tooltipItemStyle}
                        labelStyle={tooltipLabelStyle}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="p-4 bg-white rounded-lg shadow-lg sm:p-6 dark:bg-gray-900">
              <h2 className="flex items-center mb-6 text-base font-semibold dark:text-gray-100">
                <BarChart2 size={20} className="mr-2 text-sky-600" />
                Machine Reliability
              </h2>
              {machineReliabilityData.length === 0 ? (
                <p className="py-10 text-sm text-center text-gray-500 dark:text-gray-400">
                  No machine reliability data for the selected period.
                </p>
              ) : (
                <div className="h-60 overflow-x-auto sm:h-80">
                  <ResponsiveContainer width="100%" height="100%" minWidth={280}>
                    <BarChart
                      data={machineReliabilityData}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fill: chartAxisColor }} />
                      <YAxis dataKey="name" type="category" tick={{ fill: chartAxisColor }} />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        itemStyle={tooltipItemStyle}
                        labelStyle={tooltipLabelStyle}
                      />
                      <Legend wrapperStyle={{ color: chartAxisColor }} />
                      <Bar
                        dataKey="value"
                        name="Reliability Score (%)"
                        background={{ fill: isDark ? '#374151' : '#eee' }}
                      >
                        {machineReliabilityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!isLoading && !isError && reportType === 'machineReliability' && (
        <div className="p-4 bg-white rounded-lg shadow-lg sm:p-6 dark:bg-gray-900">
          <h2 className="flex items-center mb-6 text-base font-semibold dark:text-gray-100">
            <BarChart2 size={20} className="mr-2 text-sky-600" />
            Machine Reliability Overview
          </h2>
          {machineReliabilityData.length === 0 ? (
            <p className="py-10 text-sm text-center text-gray-500 dark:text-gray-400">
              No machine reliability data for the selected period.
            </p>
          ) : (
            <div className="h-60 overflow-x-auto sm:h-80">
              <ResponsiveContainer width="100%" height="100%" minWidth={280}>
                <BarChart
                  data={machineReliabilityData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: chartAxisColor }} />
                  <YAxis dataKey="name" type="category" tick={{ fill: chartAxisColor }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ color: chartAxisColor }} />
                  <Bar dataKey="value" name="Reliability Score (%)">
                    {machineReliabilityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
