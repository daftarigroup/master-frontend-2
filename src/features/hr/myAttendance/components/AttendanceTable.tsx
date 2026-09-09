'use client';

import { IconAlertCircle, IconCheck, IconClock, IconX } from '@tabler/icons-react';
import type React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AttendanceRecord } from '../hooks/useMyAttendance';

export interface AttendanceTableProps {
  records: AttendanceRecord[];
}

interface StatusConfig {
  Icon: React.ElementType;
  className: string;
  label: string;
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  present: {
    Icon: IconCheck,
    className:
      'bg-emerald-50 border-emerald-200/50 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400',
    label: 'Present',
  },
  absent: {
    Icon: IconX,
    className:
      'bg-rose-50 border-rose-200/50 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400',
    label: 'Absent',
  },
  half_day: {
    Icon: IconClock,
    className:
      'bg-amber-50 border-amber-200/50 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-400',
    label: 'Half Day',
  },
};

export function AttendanceTable({ records }: AttendanceTableProps): React.ReactNode {
  return (
    <Card className="overflow-hidden border shadow-xs">
      <CardHeader className="border-b bg-muted/40 px-6 py-4">
        <CardTitle className="text-base font-semibold">December 2024</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-max">
            <thead className="border-b bg-muted/30">
              <tr>
                {['Date', 'Status', 'Check In', 'Check Out', 'Working Hours'].map((head) => (
                  <th
                    key={head}
                    className="whitespace-nowrap px-6 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {records.map((record) => {
                const config = STATUS_CONFIG[record.status] || {
                  Icon: IconAlertCircle,
                  className: 'bg-muted border-border text-muted-foreground',
                  label: record.status,
                };
                return (
                  <tr key={record.date} className="hover:bg-muted/20 transition-colors">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-foreground">
                      {new Date(record.date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        weekday: 'short',
                      })}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div
                        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${config.className}`}
                      >
                        <config.Icon className="h-3.5 w-3.5" />
                        <span>{config.label}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                      {record.checkIn}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                      {record.checkOut}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-foreground">
                      {record.hours}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
