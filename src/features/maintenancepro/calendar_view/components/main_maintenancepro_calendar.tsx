'use client';

import {
  IconAlertTriangle,
  IconCalendar,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconLoader2,
  IconTool,
  IconUser,
  IconX,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useAppSelector } from '@/store/hook';
import { selectUser } from '@/store/slice/userAccountData';
import type { WorkOrder, WorkOrderStatus } from '../../unique_task/server/api/workordersApi';
import { useWorkOrders } from '../../unique_task/server/tanstackQuery/useWorkOrdersQueries';

interface CalendarTask {
  id: string;
  title: string;
  date: Date;
  status: WorkOrderStatus;
  machineName: string | null;
  assigneeName: string | null;
  isBreakdown: boolean;
  workOrder: WorkOrder;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const STATUS_META: Record<
  WorkOrderStatus,
  { label: string; dot: string; badge: string; ring: string }
> = {
  PENDING: {
    label: 'Pending',
    dot: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    ring: 'border-l-amber-500',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    dot: 'bg-blue-500',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
    ring: 'border-l-blue-500',
  },
  PENDING_APPROVAL: {
    label: 'Pending Approval',
    dot: 'bg-purple-500',
    badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
    ring: 'border-l-purple-500',
  },
  COMPLETION_REJECTED: {
    label: 'Rejected',
    dot: 'bg-rose-500',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400',
    ring: 'border-l-rose-500',
  },
  COMPLETED: {
    label: 'Completed',
    dot: 'bg-green-500',
    badge: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
    ring: 'border-l-green-500',
  },
  COMPLETED_LATE: {
    label: 'Completed Late',
    dot: 'bg-emerald-600',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
    ring: 'border-l-emerald-600',
  },
  OVERDUE: {
    label: 'Overdue',
    dot: 'bg-red-600',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
    ring: 'border-l-red-600',
  },
  ON_LEAVE: {
    label: 'On Leave',
    dot: 'bg-indigo-500',
    badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400',
    ring: 'border-l-indigo-500',
  },
  MISSED: {
    label: 'Missed',
    dot: 'bg-red-600',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
    ring: 'border-l-red-600',
  },
  SKIPPED: {
    label: 'Skipped',
    dot: 'bg-gray-400',
    badge: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    ring: 'border-l-gray-400',
  },
  CANCELLED: {
    label: 'Cancelled',
    dot: 'bg-gray-400',
    badge: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500',
    ring: 'border-l-gray-400',
  },
  ON_HOLD: {
    label: 'On Hold',
    dot: 'bg-orange-500',
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
    ring: 'border-l-orange-500',
  },
};

const LEGEND: Array<{ label: string; dot: string }> = [
  { label: 'Pending', dot: 'bg-amber-500' },
  { label: 'In Progress', dot: 'bg-blue-500' },
  { label: 'Completed', dot: 'bg-green-500' },
  { label: 'Missed', dot: 'bg-red-600' },
  { label: 'On Hold', dot: 'bg-orange-500' },
  { label: 'Cancelled', dot: 'bg-gray-400' },
];

function dateKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function workOrderDate(wo: WorkOrder): Date | null {
  const raw = wo.actualDueDate ?? wo.scheduledDate;
  return raw ? new Date(raw) : null;
}

function isBreakdownOrigin(wo: WorkOrder): boolean {
  return wo.plan?.activityType?.code === 'REPAIR' || wo.repairLog != null;
}

function taskTitle(wo: WorkOrder): string {
  return wo.plan?.title || wo.machine?.name || 'Maintenance Task';
}

export default function MaintenanceCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'day' | 'week' | 'month'>('month');
  const [modalDate, setModalDate] = useState<Date | null>(null);

  const currentUser = useAppSelector(selectUser);
  const isAdmin =
    (currentUser as { role?: string } | null)?.role === 'ADMIN' ||
    (currentUser as { role?: string } | null)?.role === 'SUPERADMIN';

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  // Visible range for the current view — padded to the full grid so
  // leading/trailing days from adjacent months are covered too.
  const { rangeFrom, rangeTo } = useMemo(() => {
    if (view === 'day') {
      const from = new Date(currentDate);
      from.setHours(0, 0, 0, 0);
      const to = new Date(currentDate);
      to.setHours(23, 59, 59, 999);
      return { rangeFrom: from, rangeTo: to };
    }
    if (view === 'week') {
      const from = new Date(currentDate);
      from.setDate(currentDate.getDate() - currentDate.getDay());
      from.setHours(0, 0, 0, 0);
      const to = new Date(from);
      to.setDate(from.getDate() + 6);
      to.setHours(23, 59, 59, 999);
      return { rangeFrom: from, rangeTo: to };
    }
    const totalCells = Math.ceil((daysInMonth + firstDay) / 7) * 7;
    const from = new Date(year, month, 1 - firstDay);
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(from.getDate() + totalCells - 1);
    to.setHours(23, 59, 59, 999);
    return { rangeFrom: from, rangeTo: to };
  }, [view, currentDate, year, month, firstDay, daysInMonth]);

  const {
    data: woData,
    isLoading,
    isError,
  } = useWorkOrders({
    from: rangeFrom.toISOString(),
    to: rangeTo.toISOString(),
    limit: 500,
  });

  const tasksByDay = useMemo(() => {
    const map = new Map<string, CalendarTask[]>();
    const workOrders = woData?.data ?? [];
    for (const wo of workOrders) {
      const d = workOrderDate(wo);
      if (!d) continue;
      const key = dateKey(d);
      const task: CalendarTask = {
        id: wo.id,
        title: taskTitle(wo),
        date: d,
        status: wo.status,
        machineName: wo.machine?.name ?? null,
        assigneeName: wo.currentAssignee?.name ?? null,
        isBreakdown: isBreakdownOrigin(wo),
        workOrder: wo,
      };
      const existing = map.get(key);
      if (existing) existing.push(task);
      else map.set(key, [task]);
    }
    return map;
  }, [woData]);

  function getTasksForDate(date: Date): CalendarTask[] {
    return tasksByDay.get(dateKey(date)) ?? [];
  }

  const totalVisibleTasks = woData?.data?.length ?? 0;

  function prevNav() {
    if (view === 'day') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 1);
      setCurrentDate(d);
    } else if (view === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    } else {
      setCurrentDate(new Date(year, month - 1));
    }
  }

  function nextNav() {
    if (view === 'day') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 1);
      setCurrentDate(d);
    } else if (view === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    } else {
      setCurrentDate(new Date(year, month + 1));
    }
  }

  function goToday() {
    setCurrentDate(new Date());
  }

  function renderMonthView() {
    const totalCells = Math.ceil((daysInMonth + firstDay) / 7) * 7;
    const cells = [];
    for (let i = 0; i < totalCells; i++) {
      const dayNum = i - firstDay + 1;
      const valid = dayNum > 0 && dayNum <= daysInMonth;
      const date = valid ? new Date(year, month, dayNum) : null;
      const tasks = date ? getTasksForDate(date) : [];
      const isToday = date && date.toDateString() === today.toDateString();
      const isWeekend = i % 7 === 0 || i % 7 === 6;

      cells.push(
        <button
          type="button"
          key={i}
          disabled={!valid}
          className={`group relative min-h-20 md:min-h-24 p-1.5 md:p-2 text-left border border-gray-200 dark:border-gray-700 transition-all ${
            !valid
              ? 'bg-gray-50 dark:bg-gray-800/50 cursor-default'
              : `cursor-pointer hover:shadow-md hover:z-10 hover:scale-[1.02] ${
                  isWeekend ? 'bg-gray-50/60 dark:bg-gray-800/30' : 'bg-white dark:bg-gray-900'
                }`
          } ${isToday ? 'ring-2 ring-inset ring-sky-500' : ''}`}
          onClick={() => {
            if (date) setModalDate(date);
          }}
        >
          {valid && (
            <>
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`flex items-center justify-center text-xs font-semibold ${
                    isToday
                      ? 'w-5 h-5 rounded-full bg-sky-600 text-white'
                      : 'text-gray-900 dark:text-gray-100'
                  }`}
                >
                  {dayNum}
                </span>
                {tasks.length > 0 && (
                  <span className="bg-gradient-to-br from-sky-500 to-indigo-600 text-white text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 rounded-full font-semibold shadow-sm">
                    {tasks.length}
                  </span>
                )}
              </div>
              <div className="space-y-1 hidden md:block">
                {tasks.slice(0, 2).map((task) => (
                  <div
                    key={task.id}
                    className={`text-[11px] px-1.5 py-1 rounded border-l-2 truncate ${STATUS_META[task.status].ring} ${STATUS_META[task.status].badge}`}
                  >
                    {task.isBreakdown && (
                      <IconAlertTriangle className="inline w-3 h-3 mr-0.5 -mt-0.5" />
                    )}
                    {task.title}
                  </div>
                ))}
                {tasks.length > 2 && (
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 font-medium pl-1">
                    +{tasks.length - 2} more
                  </div>
                )}
              </div>
              {tasks.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1 md:hidden">
                  {tasks.slice(0, 4).map((task) => (
                    <div
                      key={task.id}
                      className={`w-1.5 h-1.5 rounded-full ${STATUS_META[task.status].dot}`}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </button>
      );
    }
    return cells;
  }

  function renderWeekView() {
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - currentDate.getDay());

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 md:gap-4">
        {[0, 1, 2, 3, 4, 5, 6].map((offset) => {
          const d = new Date(weekStart);
          d.setDate(weekStart.getDate() + offset);
          const tasks = getTasksForDate(d);
          const isToday = d.toDateString() === today.toDateString();
          return (
            <button
              type="button"
              key={offset}
              onClick={() => setModalDate(d)}
              className={`text-left bg-white dark:bg-gray-900 rounded-xl border p-3 md:p-4 transition-all hover:shadow-md hover:-translate-y-0.5 ${
                isToday
                  ? 'border-sky-500 ring-1 ring-sky-500'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="text-center mb-3">
                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  {DAY_NAMES[offset]}
                </div>
                <div
                  className={`text-lg md:text-xl font-bold mt-1 ${isToday ? 'text-sky-600' : 'text-gray-900 dark:text-gray-100'}`}
                >
                  {d.getDate()}
                </div>
              </div>
              <div className="space-y-2">
                {tasks.length === 0 ? (
                  <div className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">
                    No tasks
                  </div>
                ) : (
                  tasks.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      className={`text-xs p-2 rounded truncate border-l-2 ${STATUS_META[task.status].ring} ${STATUS_META[task.status].badge}`}
                      title={task.title}
                    >
                      {task.title}
                    </div>
                  ))
                )}
                {tasks.length > 3 && (
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 text-center font-medium">
                    +{tasks.length - 3} more
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  function renderDayView() {
    const tasks = getTasksForDate(currentDate);
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 md:p-6">
        <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
          {currentDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </h3>
        {tasks.length === 0 ? (
          <div className="text-center py-12">
            <IconCalendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No tasks scheduled for this day</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const navLabel =
    view === 'day'
      ? currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : view === 'week'
        ? (() => {
            const s = new Date(currentDate);
            s.setDate(currentDate.getDate() - currentDate.getDay());
            const e = new Date(s);
            e.setDate(s.getDate() + 6);
            return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
          })()
        : `${MONTH_NAMES[month]} ${year}`;

  return (
    <div className="bg-transparent pb-8">
      <div className="space-y-4 md:space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sky-600 via-indigo-600 to-violet-600 p-5 md:p-6 shadow-lg">
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -left-6 -bottom-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <IconCalendar className="w-6 h-6" />
                Maintenance Calendar
              </h1>
              <p className="text-sm text-sky-100 mt-1">
                {isAdmin
                  ? 'All maintenance & repair tasks across the team'
                  : 'Your assigned maintenance & repair tasks'}
                {!isLoading &&
                  !isError &&
                  ` · ${totalVisibleTasks} task${totalVisibleTasks === 1 ? '' : 's'} in view`}
              </p>
            </div>
            <div className="flex items-center gap-2 self-start md:self-center">
              <button
                type="button"
                onClick={goToday}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/15 text-white hover:bg-white/25 transition-colors backdrop-blur-sm"
              >
                Today
              </button>
              <div className="flex bg-white/15 p-1 rounded-lg backdrop-blur-sm">
                {(['day', 'week', 'month'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setView(v)}
                    className={`px-3 md:px-4 py-1.5 rounded-md text-xs md:text-sm font-medium transition-all capitalize ${
                      view === v
                        ? 'bg-white text-sky-700 shadow-sm'
                        : 'text-sky-50 hover:text-white'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between bg-white dark:bg-gray-900 p-3 md:p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <button
            type="button"
            onClick={prevNav}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 rounded-lg transition-colors"
          >
            <IconChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <h2 className="flex-1 min-w-0 flex items-center justify-center gap-2 text-sm md:text-lg font-bold text-gray-900 dark:text-gray-100 text-center">
            <span className="truncate">{navLabel}</span>
            {isLoading && (
              <IconLoader2 className="w-4 h-4 animate-spin text-sky-500 flex-shrink-0" />
            )}
          </h2>
          <button
            type="button"
            onClick={nextNav}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 rounded-lg transition-colors"
          >
            <IconChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-white dark:bg-gray-900 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs">
          {LEGEND.map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${l.dot}`} />
              <span className="text-gray-600 dark:text-gray-400">{l.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <IconAlertTriangle className="w-3.5 h-3.5 text-red-500" />
            <span className="text-gray-600 dark:text-gray-400">Breakdown repair</span>
          </div>
        </div>

        {isError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-xl p-4 text-center">
            Failed to load calendar tasks. Please try again.
          </div>
        )}

        {/* Month View */}
        {view === 'month' && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-x-auto overflow-y-hidden">
            <div className="min-w-[560px]">
              <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-800">
                {DAY_NAMES.map((d) => (
                  <div
                    key={d}
                    className="p-2 md:p-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700"
                  >
                    <span className="hidden sm:inline">{d}</span>
                    <span className="sm:hidden">{d.charAt(0)}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">{renderMonthView()}</div>
            </div>
          </div>
        )}

        {/* Week View */}
        {view === 'week' && renderWeekView()}

        {/* Day View */}
        {view === 'day' && renderDayView()}
      </div>

      {/* Day tasks popup */}
      {modalDate && (
        <DayTasksModal
          date={modalDate}
          tasks={getTasksForDate(modalDate)}
          onClose={() => setModalDate(null)}
        />
      )}
    </div>
  );
}

function TaskRow({ task }: { task: CalendarTask }) {
  const meta = STATUS_META[task.status];
  return (
    <div
      className={`flex items-start gap-3 p-3 md:p-4 border border-gray-200 dark:border-gray-700 border-l-4 ${meta.ring} rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors`}
    >
      {task.status === 'COMPLETED' || task.status === 'COMPLETED_LATE' ? (
        <IconCheck className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
      ) : task.status === 'MISSED' || task.status === 'CANCELLED' ? (
        <IconX className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
      ) : (
        <IconClock className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 dark:text-gray-100 text-xs md:text-sm truncate flex items-center gap-1.5">
          {task.isBreakdown && (
            <IconAlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
          )}
          {task.title}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[11px] text-gray-500 dark:text-gray-400">
          {task.machineName && (
            <span className="flex items-center gap-1">
              <IconTool className="w-3 h-3" /> {task.machineName}
            </span>
          )}
          {task.assigneeName && (
            <span className="flex items-center gap-1">
              <IconUser className="w-3 h-3" /> {task.assigneeName}
            </span>
          )}
        </div>
      </div>
      <span
        className={`px-2 md:px-3 py-1 rounded-full text-[10px] md:text-xs font-semibold flex-shrink-0 ${meta.badge}`}
      >
        {meta.label}
      </span>
    </div>
  );
}

function DayTasksModal({
  date,
  tasks,
  onClose,
}: {
  date: Date;
  tasks: CalendarTask[];
  onClose: () => void;
}) {
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: overlay closes the modal on backdrop click
    // biome-ignore lint/a11y/useKeyWithClickEvents: dialog is closable via the visible close button and Escape is native to <dialog>-like overlays here
    <div
      className="fixed inset-0 z-[9500] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: stops the backdrop click from closing the modal */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: this div only guards a click from bubbling, it isn't itself the interactive control */}
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-sky-600 to-indigo-600">
          <div className="min-w-0 flex-1">
            <h3 className="text-white font-bold text-sm md:text-base">
              {date.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </h3>
            <p className="text-sky-100 text-xs mt-0.5">
              {tasks.length} task{tasks.length === 1 ? '' : 's'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors"
          >
            <IconX className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 md:p-5 overflow-y-auto space-y-2.5">
          {tasks.length === 0 ? (
            <div className="text-center py-10">
              <IconCalendar className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                No tasks scheduled for this date
              </p>
            </div>
          ) : (
            tasks.map((task) => <TaskRow key={task.id} task={task} />)
          )}
        </div>
      </div>
    </div>
  );
}
