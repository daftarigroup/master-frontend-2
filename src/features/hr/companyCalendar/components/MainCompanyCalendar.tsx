'use client';

import { IconChevronLeft, IconChevronRight, IconPlus } from '@tabler/icons-react';
import { useState } from 'react';

const MainCompanyCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const firstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const holidays = [
    { date: '2024-12-25', name: 'Christmas Day', type: 'holiday' },
    { date: '2024-12-31', name: "New Year's Eve", type: 'event' },
  ];

  const getDayData = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return holidays.find((h) => h.date === dateStr);
  };

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-800 sm:text-3xl">Company Calendar</h1>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">Manage holidays and events</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700 sm:text-base">
          <IconPlus className="h-4 w-4" />
          Add Event
        </button>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-3 sm:p-6">
        <div className="mb-4 flex items-center justify-between sm:mb-8">
          <h2 className="text-lg font-bold text-gray-800 sm:text-2xl">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() =>
                setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
              }
              className="rounded-lg p-1.5 transition-colors hover:bg-gray-100 sm:p-2"
            >
              <IconChevronLeft className="h-4 w-4 text-gray-600 sm:h-5 sm:w-5" />
            </button>
            <button
              onClick={() =>
                setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
              }
              className="rounded-lg p-1.5 transition-colors hover:bg-gray-100 sm:p-2"
            >
              <IconChevronRight className="h-4 w-4 text-gray-600 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>

        <div className="mb-2 grid grid-cols-7 gap-1 sm:mb-4 sm:gap-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="text-center text-[10px] font-semibold text-gray-500 sm:text-sm"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-4">
          {Array.from({ length: firstDayOfMonth(currentDate) }).map((_, i) => (
            <div key={`empty-${i}`} className="h-14 sm:h-24" />
          ))}
          {Array.from({ length: daysInMonth(currentDate) }).map((_, i) => {
            const day = i + 1;
            const data = getDayData(day);
            return (
              <div
                key={day}
                className={`h-14 cursor-pointer rounded-md border p-1 transition-colors hover:border-blue-500 sm:h-24 sm:rounded-lg sm:p-2 ${
                  data
                    ? data.type === 'holiday'
                      ? 'border-red-100 bg-red-50'
                      : 'border-blue-100 bg-blue-50'
                    : 'border-gray-100'
                }`}
              >
                <div className="mb-0.5 text-[10px] font-medium text-gray-700 sm:mb-1 sm:text-sm">
                  {day}
                </div>
                {data && (
                  <div
                    className={`truncate rounded-sm px-1 py-0.5 text-[8px] sm:px-1.5 sm:text-xs ${
                      data.type === 'holiday'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {data.name}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MainCompanyCalendar;
