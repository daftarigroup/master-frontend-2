'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  IconChevronLeft,
  IconChevronRight,
  IconPlus,
  IconCalendar,
  IconFilter,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import {
  fetchHolidays,
  createHoliday,
  deleteHoliday,
  type HolidayRow,
} from '@/services/holidayService';
import AddEventModal, {
  type CalendarEvent,
  type CalendarEventType,
} from './AddEventModal';
import EventDetailModal from './EventDetailModal';

const STORAGE_KEY = 'hr_company_calendar_events';

const INITIAL_EVENTS: CalendarEvent[] = [];

const monthNames = [
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

const typeColorMap: Record<
  CalendarEventType,
  { bg: string; text: string; border: string; dot: string }
> = {
  holiday: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
  },
  event: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
  },
  celebration: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    dot: 'bg-purple-500',
  },
  meeting: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
  },
};

const MainCompanyCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDateForAdd, setSelectedDateForAdd] = useState<string>('');
  const [selectedEventForDetail, setSelectedEventForDetail] =
    useState<CalendarEvent | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  // Load events from localStorage and synchronize with backend holidays
  useEffect(() => {
    const loadAllEvents = async () => {
      setLoading(true);
      let localEvents: CalendarEvent[] = [];
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          localEvents = JSON.parse(stored);
        } else {
          localEvents = INITIAL_EVENTS;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_EVENTS));
        }
      } catch (e) {
        console.warn('Failed to parse stored events:', e);
        localEvents = INITIAL_EVENTS;
      }

      // Try fetching database holidays
      try {
        const dbHolidays: HolidayRow[] = await fetchHolidays();
        if (Array.isArray(dbHolidays) && dbHolidays.length > 0) {
          const holidayEvents: CalendarEvent[] = dbHolidays.map((h) => ({
            id: `db-${h.id}`,
            date: h.holiday_date ? h.holiday_date.split('T')[0] : '',
            title: h.holiday_name,
            type: 'holiday' as CalendarEventType,
            isDbHoliday: true,
          })).filter((h) => !!h.date);

          // Merge: avoid duplicating holidays that have the same date and title
          const existingKeys = new Set(
            localEvents.map((e) => `${e.date}_${e.title.toLowerCase()}`)
          );
          const newDbHolidays = holidayEvents.filter(
            (h) => !existingKeys.has(`${h.date}_${h.title.toLowerCase()}`)
          );

          const merged = [...localEvents, ...newDbHolidays];
          setEvents(merged);
          return;
        }
      } catch (err) {
        console.warn('Could not fetch backend holidays (offline or no table):', err);
      }

      setEvents(localEvents);
      setLoading(false);
    };

    loadAllEvents();
  }, []);

  // Save events helper
  const persistEvents = (updated: CalendarEvent[]) => {
    setEvents(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  };

  const handleAddEvent = async (newEventData: Omit<CalendarEvent, 'id'>) => {
    let dbId: number | null = null;

    // If it is a holiday, attempt to sync with backend
    if (newEventData.type === 'holiday') {
      try {
        const res: any = await createHoliday({
          holiday_date: newEventData.date,
          holiday_name: newEventData.title,
        });
        if (res && res.id) {
          dbId = res.id;
        }
      } catch (err) {
        console.warn('Failed to insert holiday into backend DB, falling back to local:', err);
      }
    }

    const createdEvent: CalendarEvent = {
      ...newEventData,
      id: dbId ? `db-${dbId}` : `evt-${Date.now()}`,
      isDbHoliday: !!dbId,
    };

    persistEvents([...events, createdEvent]);
  };

  const handleDeleteEvent = async (id: string | number) => {
    const target = events.find((e) => e.id === id);
    if (!target) return;

    if (target.isDbHoliday && String(target.id).startsWith('db-')) {
      const rawId = Number(String(target.id).replace('db-', ''));
      if (!isNaN(rawId)) {
        try {
          await deleteHoliday(rawId);
        } catch (err) {
          console.warn('Failed to delete holiday from database:', err);
        }
      }
    }

    const updated = events.filter((e) => e.id !== id);
    persistEvents(updated);
    toast.success('Event deleted successfully');
  };

  const daysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const firstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === currentDate.getMonth() &&
      today.getFullYear() === currentDate.getFullYear()
    );
  };

  const filteredEvents = useMemo(() => {
    if (filterType === 'all') return events;
    return events.filter((e) => e.type === filterType);
  }, [events, filterType]);

  const getEventsForDay = (day: number): CalendarEvent[] => {
    const dateStr = `${currentDate.getFullYear()}-${String(
      currentDate.getMonth() + 1
    ).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return filteredEvents.filter((h) => h.date === dateStr);
  };

  const handleOpenAddModal = (day?: number) => {
    if (day) {
      const dateStr = `${currentDate.getFullYear()}-${String(
        currentDate.getMonth() + 1
      ).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      setSelectedDateForAdd(dateStr);
    } else {
      setSelectedDateForAdd(new Date().toISOString().split('T')[0]);
    }
    setIsAddModalOpen(true);
  };

  const handlePrevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  const handleJumpToToday = () => {
    setCurrentDate(new Date());
  };

  // Month event counts
  const monthEventStats = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    const thisMonthEvents = events.filter((e) => e.date.startsWith(prefix));
    return {
      total: thisMonthEvents.length,
      holidays: thisMonthEvents.filter((e) => e.type === 'holiday').length,
      events: thisMonthEvents.filter((e) => e.type === 'event').length,
      celebrations: thisMonthEvents.filter((e) => e.type === 'celebration').length,
      meetings: thisMonthEvents.filter((e) => e.type === 'meeting').length,
    };
  }, [events, currentDate]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-800 sm:text-3xl">Company Calendar</h1>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">Manage holidays and events</p>
        </div>
        <button
          type="button"
          onClick={() => handleOpenAddModal()}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 sm:text-base cursor-pointer"
        >
          <IconPlus className="h-4 w-4" />
          Add Event
        </button>
      </div>

      {/* Calendar Card Container */}
      <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-xs sm:p-6">
        {/* Navigation & Controls Bar */}
        <div className="mb-4 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gray-800 sm:text-2xl">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button
              type="button"
              onClick={handleJumpToToday}
              className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition"
            >
              Today
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Filter Pills */}
            <div className="flex items-center gap-1 rounded-lg bg-gray-100/80 p-1 text-xs">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`rounded-md px-2.5 py-1 font-medium transition ${
                  filterType === 'all'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All ({monthEventStats.total})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('holiday')}
                className={`rounded-md px-2.5 py-1 font-medium transition ${
                  filterType === 'holiday'
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Holidays ({monthEventStats.holidays})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('event')}
                className={`rounded-md px-2.5 py-1 font-medium transition ${
                  filterType === 'event'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Events ({monthEventStats.events})
              </button>
            </div>

            {/* Navigation Arrows */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Previous Month"
                onClick={handlePrevMonth}
                className="rounded-lg border border-gray-200 p-1.5 transition-colors hover:bg-gray-100 sm:p-2"
              >
                <IconChevronLeft className="h-4 w-4 text-gray-600 sm:h-5 sm:w-5" />
              </button>
              <button
                type="button"
                aria-label="Next Month"
                onClick={handleNextMonth}
                className="rounded-lg border border-gray-200 p-1.5 transition-colors hover:bg-gray-100 sm:p-2"
              >
                <IconChevronRight className="h-4 w-4 text-gray-600 sm:h-5 sm:w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="mb-2 grid grid-cols-7 gap-1 sm:mb-3 sm:gap-3">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
            <div
              key={day}
              className={`text-center text-[11px] font-semibold uppercase sm:text-xs tracking-wider py-1 ${
                idx === 0 ? 'text-red-500' : 'text-gray-500'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-3">
          {/* Empty prefix cells */}
          {Array.from({ length: firstDayOfMonth(currentDate) }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="h-20 sm:h-32 rounded-lg bg-gray-50/50 border border-transparent opacity-40"
            />
          ))}

          {/* Month Day Cells */}
          {Array.from({ length: daysInMonth(currentDate) }).map((_, i) => {
            const day = i + 1;
            const dayEvents = getEventsForDay(day);
            const currentDay = isToday(day);

            return (
              <div
                key={day}
                onClick={() => handleOpenAddModal(day)}
                className={`group relative flex flex-col h-20 sm:h-32 rounded-lg border p-1.5 sm:p-2.5 transition-all hover:border-blue-500 hover:shadow-xs cursor-pointer ${
                  currentDay
                    ? 'border-blue-500/80 bg-blue-50/20 ring-2 ring-blue-500/20'
                    : 'border-gray-200/80 bg-white hover:bg-gray-50/50'
                }`}
              >
                {/* Day Number Row */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full text-[11px] sm:text-xs font-semibold ${
                      currentDay
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 group-hover:text-blue-600'
                    }`}
                  >
                    {day}
                  </span>

                  {/* Quick Add indicator on hover */}
                  <span className="hidden opacity-0 group-hover:opacity-100 group-hover:inline-flex text-[10px] text-blue-600 font-medium sm:items-center gap-0.5">
                    <IconPlus className="h-3 w-3" />
                  </span>
                </div>

                {/* Events List in Day Cell */}
                <div className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
                  {dayEvents.map((evt) => {
                    const style =
                      typeColorMap[evt.type] || typeColorMap.event;
                    return (
                      <div
                        key={evt.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEventForDetail(evt);
                        }}
                        title={`${evt.title}${evt.time ? ` (${evt.time})` : ''}`}
                        className={`group/chip flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] sm:text-xs font-medium transition-all hover:brightness-95 ${style.bg} ${style.text} ${style.border}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`}
                        />
                        <span className="truncate flex-1">{evt.title}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-gray-100 pt-4 text-xs text-gray-600">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
            <span>Holiday</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            <span>Company Event</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
            <span>Celebration</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            <span>Meeting</span>
          </div>
          <span className="ml-auto hidden text-[11px] text-gray-400 sm:inline">
            Click on any date to quickly add an event
          </span>
        </div>
      </div>

      {/* Add Event Modal Form */}
      <AddEventModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        defaultDate={selectedDateForAdd}
        onAddEvent={handleAddEvent}
      />

      {/* Event Details & Delete Modal */}
      <EventDetailModal
        event={selectedEventForDetail}
        onClose={() => setSelectedEventForDetail(null)}
        onDeleteEvent={handleDeleteEvent}
      />
    </div>
  );
};

export default MainCompanyCalendar;
