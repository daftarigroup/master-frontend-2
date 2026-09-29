'use client';

import {
  IconActivity,
  IconAlertCircle,
  IconCalendar,
  IconCheck,
  IconClock,
  IconFilter,
  IconLoader2,
  IconTool,
  IconTrendingUp,
  IconUser,
  IconUsers,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useProject } from '@/context/ProjectContext';
import { filterByFirmAccess } from '@/lib/firmAccess';
import { useDailyReport } from '../server/tanstackQuery/useDailyReportQueries';
import type { DailyTaskStatus } from '../types/types';

type DisplayStatus = 'completed' | 'in-progress' | 'pending';
type MachineDisplayStatus = 'operational' | 'maintenance' | 'down';

function toDisplayStatus(status: DailyTaskStatus): DisplayStatus {
  if (status === 'COMPLETED' || status === 'COMPLETED_LATE') return 'completed';
  if (status === 'IN_PROGRESS' || status === 'PENDING_APPROVAL') return 'in-progress';
  return 'pending';
}

function toMachineDisplayStatus(status: string): MachineDisplayStatus {
  if (status === 'UNDER_MAINTENANCE') return 'maintenance';
  if (status === 'BREAKDOWN') return 'down';
  return 'operational';
}

function taskStatusBadgeClass(status: DisplayStatus) {
  if (status === 'completed')
    return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400';
  if (status === 'in-progress')
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400';
  return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
}

export default function MaintenanceDailyReportPage() {
  const { effectivePermittedFirms, selectedProject } = useProject();
  const queryFirmId = selectedProject ? String(selectedProject.id) : undefined;

  const [selectedAssigneeId, setSelectedAssigneeId] = useState('all');
  const { data: rawData, isLoading, isError } = useDailyReport(queryFirmId);

  const data = useMemo(() => {
    if (!rawData) return null;
    return {
      workOrders: filterByFirmAccess(rawData.workOrders, effectivePermittedFirms),
      machines: filterByFirmAccess(rawData.machines, effectivePermittedFirms),
    };
  }, [rawData, effectivePermittedFirms]);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const uniqueAssignees = useMemo(() => {
    if (!data) return [];
    const seen = new Set<string>();
    const list: { id: string; name: string }[] = [];
    for (const wo of data.workOrders) {
      if (wo.assigneeId && !seen.has(wo.assigneeId)) {
        seen.add(wo.assigneeId);
        list.push({ id: wo.assigneeId, name: wo.assignedTo });
      }
    }
    return list;
  }, [data]);

  const filteredTasks = useMemo(() => {
    if (!data) return [];
    if (selectedAssigneeId === 'all') return data.workOrders;
    return data.workOrders.filter((wo) => wo.assigneeId === selectedAssigneeId);
  }, [data, selectedAssigneeId]);

  const completed = filteredTasks.filter((t) => toDisplayStatus(t.status) === 'completed').length;
  const inProgress = filteredTasks.filter(
    (t) => toDisplayStatus(t.status) === 'in-progress'
  ).length;
  const pending = filteredTasks.filter((t) => toDisplayStatus(t.status) === 'pending').length;
  const total = filteredTasks.length;

  const relevantMachineIds = new Set(filteredTasks.map((t) => t.machineId));
  const relevantMachines = !data
    ? []
    : selectedAssigneeId === 'all'
      ? data.machines
      : data.machines.filter((m) => relevantMachineIds.has(m.id));

  const operational = relevantMachines.filter(
    (m) => toMachineDisplayStatus(m.status) === 'operational'
  ).length;
  const maintenance = relevantMachines.filter(
    (m) => toMachineDisplayStatus(m.status) === 'maintenance'
  ).length;
  const down = relevantMachines.filter((m) => toMachineDisplayStatus(m.status) === 'down').length;

  const selectedAssigneeName = uniqueAssignees.find((u) => u.id === selectedAssigneeId)?.name ?? '';

  const statCards = [
    {
      title: 'Total Tasks Today',
      value: total,
      Icon: IconActivity,
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/30',
    },
    {
      title: 'Completed',
      value: completed,
      Icon: IconCheck,
      textColor: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/30',
    },
    {
      title: 'In Progress',
      value: inProgress,
      Icon: IconClock,
      textColor: 'text-yellow-600',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/30',
    },
    {
      title: 'Pending',
      value: pending,
      Icon: IconAlertCircle,
      textColor: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-900/30',
    },
  ];

  const machineStatCards = [
    {
      title: 'Operational',
      value: operational,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/40',
    },
    {
      title: 'Maintenance',
      value: maintenance,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/40',
    },
    { title: 'Down', value: down, color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/40' },
  ];

  const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const availabilityPct =
    relevantMachines.length > 0 ? Math.round((operational / relevantMachines.length) * 100) : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <IconLoader2 className="w-8 h-8 text-sky-600 animate-spin" />
        <span className="ml-3 text-gray-600 dark:text-gray-400 text-sm">Loading daily report…</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <IconAlertCircle className="w-8 h-8 text-red-500" />
        <span className="ml-3 text-red-600 text-sm">
          Failed to load daily report. Please try again.
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Daily Report</h1>
            <div className="flex items-center gap-2 mt-2 text-gray-600 dark:text-gray-400">
              <IconCalendar className="w-5 h-5" />
              <p className="text-base">{today}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-sky-50 dark:bg-sky-900/20 rounded-lg">
              <IconUsers className="w-5 h-5 text-sky-600" />
              <span className="text-xs font-medium text-sky-900 dark:text-sky-300">Admin View</span>
            </div>
          </div>
        </div>

        {/* User Filter */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <IconFilter className="w-5 h-5" />
              <span className="text-xs font-semibold">Filter by User:</span>
            </div>
            <select
              value={selectedAssigneeId}
              onChange={(e) => setSelectedAssigneeId(e.target.value)}
              className="px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:border-sky-400 dark:hover:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all"
            >
              <option value="all">All Users</option>
              {uniqueAssignees.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            {selectedAssigneeId !== 'all' && (
              <span className="px-3 py-1 bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 rounded-full text-xs font-semibold">
                Viewing: {selectedAssigneeName}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Task Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.title}
            className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{card.title}</p>
                <p className={`text-2xl font-bold mt-2 ${card.textColor}`}>{card.value}</p>
              </div>
              <div className={`${card.bgColor} p-3 rounded-lg`}>
                <card.Icon className={`w-6 h-6 ${card.textColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Machine Status Overview */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <IconTool className="w-5 h-5 text-sky-600" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            Machine Status Overview
            {selectedAssigneeId !== 'all' && (
              <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-2">
                (Machines assigned to {selectedAssigneeName})
              </span>
            )}
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {machineStatCards.map((card) => (
            <div
              key={card.title}
              className={`${card.bgColor} rounded-lg p-4 border-2 border-transparent hover:border-gray-300 transition-all`}
            >
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{card.title}</p>
              <p className={`text-xl font-bold mt-1 ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 text-xs text-gray-600 dark:text-gray-400">
          Total Machines:{' '}
          <span className="font-semibold dark:text-gray-100">{relevantMachines.length}</span>
        </div>
      </div>

      {/* Today's Tasks List */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {"Today's Tasks"}
            {selectedAssigneeId !== 'all' && (
              <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-2">
                for {selectedAssigneeName}
              </span>
            )}
          </h2>
        </div>
        <div className="p-6">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <IconActivity className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-base">
                {selectedAssigneeId !== 'all'
                  ? `No tasks assigned to ${selectedAssigneeName} today`
                  : 'No tasks due today'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task) => {
                const displayStatus = toDisplayStatus(task.status);
                return (
                  <div
                    key={task.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Machine: {task.machineName}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <IconUser className="w-3 h-3" />
                          {task.assignedTo}
                        </span>
                      </div>
                    </div>
                    <div className="sm:ml-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${taskStatusBadgeClass(displayStatus)}`}
                      >
                        {displayStatus}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Performance Summary */}
      <div className="bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-900/20 dark:to-blue-900/20 rounded-lg shadow-lg p-6 border border-sky-200 dark:border-sky-800">
        <div className="flex items-center gap-2 mb-4">
          <IconTrendingUp className="w-5 h-5 text-sky-600" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            Performance Summary
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Task Completion Rate</p>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className="bg-sky-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${completionPct}%` }}
                />
              </div>
              <span className="text-xs font-bold text-sky-600">{completionPct}%</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Machine Availability</p>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className="bg-green-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${availabilityPct}%` }}
                />
              </div>
              <span className="text-xs font-bold text-green-600">{availabilityPct}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
