import type React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import type { AttendanceStat } from '../hooks/useMyAttendance';

export interface AttendanceStatsProps {
  stats: AttendanceStat[];
}

export function AttendanceStats({ stats }: AttendanceStatsProps): React.ReactNode {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.title}
          className="transition-all duration-200 hover:-translate-y-0.5"
        >
          <Card className="overflow-hidden border shadow-xs hover:shadow-md transition-all duration-200">
            <CardContent className="p-4 sm:p-6">
              <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span
                  className={`text-2xl font-bold tabular-nums tracking-tight sm:text-3xl ${stat.color}`}
                >
                  {stat.value}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}
