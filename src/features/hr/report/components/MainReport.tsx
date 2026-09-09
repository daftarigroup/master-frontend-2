'use client';

import { IconCalendar, IconDownload, IconFilter, IconReportAnalytics } from '@tabler/icons-react';
import { useState } from 'react';

const MainReport = () => {
  const [selectedReport, setSelectedReport] = useState('attendance');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  const reports = [
    {
      id: 'attendance',
      name: 'Attendance Report',
      description: 'Daily/Monthly attendance summary',
    },
    {
      id: 'payroll',
      name: 'Payroll Report',
      description: 'Salary disbursement details',
    },
    {
      id: 'leave',
      name: 'Leave Report',
      description: 'Leave balance and utilization',
    },
    {
      id: 'headcount',
      name: 'Headcount Report',
      description: 'Department-wise employee count',
    },
    {
      id: 'turnover',
      name: 'Turnover Report',
      description: 'Hiring and attrition analysis',
    },
    {
      id: 'performance',
      name: 'Performance Report',
      description: 'Employee performance metrics',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 sm:text-3xl">Reports</h1>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">Generate and download HR reports</p>
        </div>
      </div>

      {/* Report Selection */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => (
          <div
            key={report.id}
            onClick={() => setSelectedReport(report.id)}
            className={`cursor-pointer rounded-lg border-2 bg-white p-5 transition-all ${
              selectedReport === report.id
                ? 'border-blue-500 shadow-md'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`rounded-lg p-2 ${selectedReport === report.id ? 'bg-blue-50' : 'bg-gray-50'}`}
              >
                <IconReportAnalytics
                  className={`h-5 w-5 ${selectedReport === report.id ? 'text-blue-600' : 'text-gray-500'}`}
                />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{report.name}</h3>
                <p className="mt-1 text-sm text-gray-500">{report.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Section */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-800">
          <IconFilter className="h-5 w-5 text-gray-500" />
          Report Filters
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm text-gray-600">From Date</label>
            <div className="relative">
              <IconCalendar className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                className="w-full rounded-lg border border-gray-300 py-2 pr-4 pl-10 outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-600">To Date</label>
            <div className="relative">
              <IconCalendar className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                className="w-full rounded-lg border border-gray-300 py-2 pr-4 pl-10 outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-600">Department</label>
            <select className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500">
              <option value="">All Departments</option>
              <option value="engineering">Engineering</option>
              <option value="production">Production</option>
              <option value="hr">HR</option>
              <option value="finance">Finance</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700"
          >
            <IconReportAnalytics className="h-4 w-4" />
            Generate Report
          </button>
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
          >
            <IconDownload className="h-4 w-4" />
            Export PDF
          </button>
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
          >
            <IconDownload className="h-4 w-4" />
            Export Excel
          </button>
        </div>
      </div>

      {/* Report Preview Placeholder */}
      <div className="rounded-lg border border-gray-200 bg-white p-8">
        <div className="text-center text-gray-500">
          <IconReportAnalytics className="mx-auto mb-4 h-16 w-16 opacity-30" />
          <h3 className="mb-2 font-semibold text-gray-700">
            {reports.find((r) => r.id === selectedReport)?.name}
          </h3>
          <p className="text-sm">
            Select date range and click &quot;Generate Report&quot; to preview
          </p>
        </div>
      </div>
    </div>
  );
};

export default MainReport;
