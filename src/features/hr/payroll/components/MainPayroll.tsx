'use client';

import {
  IconCheck,
  IconClock,
  IconCurrencyRupee,
  IconDownload,
  IconLoader2,
  IconMinus,
  IconPlus,
  IconSearch,
  IconUsers,
} from '@tabler/icons-react';
import type React from 'react';
import { useMemo, useState } from 'react';
import { getDepartments } from '../server/api/payrollApi';
import { usePayrollData, usePayrollSummary } from '../server/tanstackQuery/usePayrollQueries';

const MainPayroll = () => {
  const { data: payrollData, isLoading, isError } = usePayrollData();
  const { data: summary } = usePayrollSummary();
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const departments = getDepartments();

  const filteredData = useMemo(() => {
    if (!payrollData) return [];
    return payrollData.filter((record) => {
      const matchesSearch =
        record.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDepartment = !departmentFilter || record.department === departmentFilter;
      const matchesStatus = !statusFilter || record.status === statusFilter;
      return matchesSearch && matchesDepartment && matchesStatus;
    });
  }, [payrollData, searchTerm, departmentFilter, statusFilter]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      pending: {
        bg: 'bg-amber-100',
        text: 'text-amber-700',
        icon: <IconClock className="h-3 w-3" />,
      },
      processed: {
        bg: 'bg-emerald-100',
        text: 'text-emerald-700',
        icon: <IconCheck className="h-3 w-3" />,
      },
      paid: {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        icon: <IconCheck className="h-3 w-3" />,
      },
    };
    const labels: Record<string, string> = {
      pending: 'Pending',
      processed: 'Processed',
      paid: 'Paid',
    };
    const style = styles[status] || styles.pending;
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${style.bg} ${style.text}`}
      >
        {style.icon}
        {labels[status] || status}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <IconLoader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading payroll data...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <IconCurrencyRupee className="mx-auto mb-2 h-12 w-12 text-red-400" />
          <p className="text-red-600">Failed to load payroll data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 sm:text-3xl">Payroll</h1>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            Manage employee salary and payroll processing
          </p>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700"
        >
          <IconDownload className="h-4 w-4" />
          Export Payroll
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          {
            title: 'Total Employees',
            value: summary?.totalEmployees || 0,
            icon: IconUsers,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
          },
          {
            title: 'Total Gross',
            value: formatCurrency(summary?.totalGrossSalary || 0),
            icon: IconPlus,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50',
          },
          {
            title: 'Total Deductions',
            value: formatCurrency(summary?.totalDeductions || 0),
            icon: IconMinus,
            color: 'text-rose-600',
            bg: 'bg-rose-50',
          },
          {
            title: 'In-Hand Salary',
            value: formatCurrency(summary?.totalNetSalary || 0),
            icon: IconCurrencyRupee,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
          },
        ].map((stat, index) => (
          <div
            key={index}
            className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4"
          >
            <div className={`rounded-lg p-3 ${stat.bg}`}>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 sm:text-sm">{stat.title}</p>
              <p className="text-base font-bold whitespace-nowrap text-gray-800 sm:text-lg">
                {stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <IconSearch className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 transform text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pr-4 pl-10 outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="processed">Processed</option>
            <option value="paid">Paid</option>
          </select>
        </div>
      </div>

      {/* Payroll Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium whitespace-nowrap tracking-wider text-gray-500 uppercase">
                  Employee
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium whitespace-nowrap tracking-wider text-gray-500 uppercase">
                  Basic
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium whitespace-nowrap tracking-wider text-gray-500 uppercase">
                  Allowances
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium whitespace-nowrap tracking-wider text-gray-500 uppercase">
                  Gross
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium whitespace-nowrap tracking-wider text-gray-500 uppercase">
                  Deductions
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium whitespace-nowrap tracking-wider text-gray-500 uppercase">
                  In-Hand Salary
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium whitespace-nowrap tracking-wider text-gray-500 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredData.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-indigo-600 text-sm font-medium text-white">
                        {record.employeeName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{record.employeeName}</p>
                        <p className="text-xs text-gray-500">{record.department}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right text-sm whitespace-nowrap text-gray-600">
                    {formatCurrency(record.basicSalary)}
                  </td>
                  <td className="px-4 py-4 text-right text-sm whitespace-nowrap text-emerald-600">
                    +{formatCurrency(record.hra + record.conveyance + record.otherAllowances)}
                  </td>
                  <td className="px-4 py-4 text-right text-sm font-medium whitespace-nowrap text-gray-900">
                    {formatCurrency(record.grossSalary)}
                  </td>
                  <td className="px-4 py-4 text-right text-sm whitespace-nowrap text-rose-600">
                    -{formatCurrency(record.totalDeductions)}
                  </td>
                  <td className="px-4 py-4 text-right text-sm font-bold whitespace-nowrap text-indigo-600">
                    {formatCurrency(record.netSalary)}
                  </td>
                  <td className="px-4 py-4 text-center whitespace-nowrap">
                    {getStatusBadge(record.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredData.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <IconCurrencyRupee className="mx-auto mb-2 h-12 w-12 opacity-50" />
            <p>No payroll records found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MainPayroll;
