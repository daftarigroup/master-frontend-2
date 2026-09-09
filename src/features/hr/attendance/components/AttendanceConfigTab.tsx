'use client';

import { IconLoader2, IconSettings } from '@tabler/icons-react';
import type { AxiosError } from 'axios';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useRequireCompanySelected } from '@/features/organization/hooks/useRequireCompanySelected';
import {
  useAttendanceConfig,
  useUpdateAttendanceConfig,
} from '../server/tanstackQuery/useAttendanceQueries';

const T = {
  card: 'var(--card)',
  fg: 'var(--foreground)',
  mutedFg: 'var(--muted-foreground)',
  border: 'var(--border)',
  primary: 'var(--primary)',
  primaryFg: 'var(--primary-foreground, #fff)' as string,
};

const FIELDS = [
  {
    key: 'fullDayHours' as const,
    label: 'Full Day Hours',
    help: 'Hours worked at or above this mark a full/present day.',
  },
  {
    key: 'halfDayMinHours' as const,
    label: 'Half Day Minimum Hours',
    help: 'Hours worked below full-day but at or above this mark a half day. Below this counts as absent.',
  },
  {
    key: 'lateGraceMinutes' as const,
    label: 'Late Grace (minutes)',
    help: 'Minutes after shift start time before a check-in is marked late.',
  },
];

export default function AttendanceConfigTab() {
  const requireCompanySelected = useRequireCompanySelected();
  const { data: config, isLoading } = useAttendanceConfig();
  const { mutate: update, isPending } = useUpdateAttendanceConfig();

  const [fullDayHours, setFullDayHours] = useState('9');
  const [halfDayMinHours, setHalfDayMinHours] = useState('4');
  const [lateGraceMinutes, setLateGraceMinutes] = useState('0');

  useEffect(() => {
    if (config) {
      setFullDayHours(String(config.fullDayHours));
      setHalfDayMinHours(String(config.halfDayMinHours));
      setLateGraceMinutes(String(config.lateGraceMinutes));
    }
  }, [config]);

  const values: Record<(typeof FIELDS)[number]['key'], string> = {
    fullDayHours,
    halfDayMinHours,
    lateGraceMinutes,
  };

  const setters: Record<(typeof FIELDS)[number]['key'], (v: string) => void> = {
    fullDayHours: setFullDayHours,
    halfDayMinHours: setHalfDayMinHours,
    lateGraceMinutes: setLateGraceMinutes,
  };

  const handleSave = () => {
    if (!requireCompanySelected()) return;
    const payload = {
      fullDayHours: Number(fullDayHours),
      halfDayMinHours: Number(halfDayMinHours),
      lateGraceMinutes: Number(lateGraceMinutes),
    };
    if (
      Number.isNaN(payload.fullDayHours) ||
      Number.isNaN(payload.halfDayMinHours) ||
      Number.isNaN(payload.lateGraceMinutes)
    ) {
      toast.error('Please enter valid numbers for all fields');
      return;
    }
    if (payload.halfDayMinHours >= payload.fullDayHours) {
      toast.error('Half day minimum hours must be less than full day hours');
      return;
    }
    update(payload, {
      onSuccess: () => toast.success('Attendance configuration saved'),
      onError: (err: Error) => {
        const axiosError = err as AxiosError<{ message?: string }>;
        toast.error(axiosError.response?.data?.message ?? 'Failed to save configuration');
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <IconLoader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-xs sm:p-5">
      <div className="mb-5 flex items-center gap-2">
        <div className="rounded-full bg-muted p-2">
          <IconSettings className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-[15px] font-semibold" style={{ color: T.fg }}>
            Attendance Configuration
          </h2>
          <p className="text-[13px]" style={{ color: T.mutedFg }}>
            Define working-hour thresholds used to auto-mark full day / half day and late check-ins.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {FIELDS.map((field) => (
          <div key={field.key}>
            <label
              htmlFor={field.key}
              className="mb-1.5 block text-[13px] font-semibold"
              style={{ color: T.fg }}
            >
              {field.label}
            </label>
            <input
              id={field.key}
              type="number"
              min={0}
              step={field.key === 'lateGraceMinutes' ? 1 : 0.5}
              value={values[field.key]}
              onChange={(e) => setters[field.key](e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              style={{ borderColor: T.border, background: T.card, color: T.fg }}
            />
            <p className="mt-1 text-xs" style={{ color: T.mutedFg }}>
              {field.help}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end border-t pt-4" style={{ borderColor: T.border }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
          style={{ background: T.primary, color: T.primaryFg }}
        >
          {isPending ? <IconLoader2 className="h-4 w-4 animate-spin" /> : null}
          Save Configuration
        </button>
      </div>
    </div>
  );
}
