'use client';

import {
  IconAlertCircle,
  IconCalendarStats,
  IconCamera,
  IconCheck,
  IconLoader2,
  IconLogin2,
  IconLogout2,
  IconQrcode,
  IconRefresh,
  IconUsers,
} from '@tabler/icons-react';
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRequireCompanySelected } from '@/features/organization/hooks/useRequireCompanySelected';
import { useAppSelector } from '@/store/hook';
import { selectUser } from '@/store/slice/userAccountData';
import {
  useMyToday,
  useSelfCheckIn,
  useSelfCheckOut,
} from '@/features/hr/myAttendance/server/tanstackQuery/useMyAttendanceQueries';
import { useAttendanceEmployees } from '../server/tanstackQuery/useAttendanceQueries';
import type { EmployeeMeta } from '../types/types';
import SubmitAttendanceTab from './SubmitAttendanceTab';
import AttendanceQRModal from './AttendanceQRModal';

const fmt12My = (timeStr?: string | null) => {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr ?? '0', 10);
  const m = parseInt(mStr ?? '0', 10);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

export default function MainMarkAttendance() {
  const requireCompanySelected = useRequireCompanySelected();
  const currentUser = useAppSelector(selectUser);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  const {
    data: rawEmployees,
    isLoading: loadingEmps,
    isError: errEmps,
    refetch,
  } = useAttendanceEmployees();

  const employees = useMemo(() => {
    if (Array.isArray(rawEmployees)) {
      return rawEmployees;
    }
    return [] as EmployeeMeta[];
  }, [rawEmployees]);

  const isHrEmployee = !!currentUser?.employeeId;
  const { data: todayRecord, isLoading: todayLoading } = useMyToday({ enabled: isHrEmployee });
  const checkInMut = useSelfCheckIn();
  const checkOutMut = useSelfCheckOut();
  const isCheckedIn = !!todayRecord?.checkIn;
  const isCheckedOut = !!todayRecord?.checkOut;

  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString('en-IN', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }, []);

  if (loadingEmps) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <IconLoader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-[13px]">Loading employees for attendance kiosk…</p>
        </div>
      </div>
    );
  }

  if (errEmps) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
          <IconAlertCircle className="h-7 w-7 text-destructive" />
          <p className="text-[13px] font-semibold text-destructive">Failed to load employees</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-[12px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <IconRefresh className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background text-foreground grow">
      <div className="mx-auto max-w-[1600px] space-y-5 px-4 pt-6 pb-10 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card px-5 py-4 shadow-xs sm:px-6 sm:py-5">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[11px] bg-primary/12 text-primary">
              <IconCamera className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-[20px] font-bold leading-tight tracking-[-0.02em]">
                  Mark Attendance
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <IconUsers className="h-3 w-3" />
                  {employees.length} Employees
                </span>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
                <span>{todayFormatted}</span>
                <span>·</span>
                <span>Photo & Geo-verified Attendance Punching</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Share / Attendance QR Code Modal */}
            <button
              type="button"
              onClick={() => setQrModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3.5 py-2 text-[13px] font-semibold text-primary transition-colors hover:bg-primary/20"
            >
              <IconQrcode className="h-4 w-4" />
              Attendance QR Code
            </button>

            {/* Quick Link to Daily Attendance */}
            <Link
              to="/hr/attendance"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3.5 py-2 text-[13px] font-semibold text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            >
              <IconCalendarStats className="h-4 w-4" />
              Daily Attendance Records
            </Link>

            {/* Self check-in / check-out if linked to HR employee */}
            {isHrEmployee && (
              <div className="flex shrink-0 flex-wrap items-center gap-2 border-l border-border pl-2.5">
                {todayRecord?.checkIn && (
                  <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                    <IconLogin2 className="h-4 w-4 text-emerald-500" />
                    <span className="font-semibold tabular-nums text-foreground">
                      {fmt12My(todayRecord.checkIn)}
                    </span>
                    {todayRecord?.checkOut && (
                      <>
                        <IconLogout2 className="ml-1 h-4 w-4 text-rose-500" />
                        <span className="font-semibold tabular-nums text-foreground">
                          {fmt12My(todayRecord.checkOut)}
                        </span>
                      </>
                    )}
                  </div>
                )}
                {todayLoading ? (
                  <IconLoader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : isCheckedOut ? (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[13px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <IconCheck className="h-4 w-4" strokeWidth={2.5} /> Checked Out
                  </div>
                ) : isCheckedIn ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!requireCompanySelected()) return;
                      checkOutMut.mutate(undefined);
                    }}
                    disabled={checkOutMut.isPending}
                    className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-[13px] font-semibold text-rose-600 transition-colors hover:bg-rose-500/20 disabled:opacity-60"
                  >
                    {checkOutMut.isPending ? (
                      <IconLoader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <IconLogout2 className="h-4 w-4" />
                    )}
                    Check Out
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (!requireCompanySelected()) return;
                      checkInMut.mutate(undefined);
                    }}
                    disabled={checkInMut.isPending}
                    className="flex items-center gap-2 rounded-lg bg-primary px-4 py-1.5 text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                  >
                    {checkInMut.isPending ? (
                      <IconLoader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <IconLogin2 className="h-4 w-4" />
                    )}
                    Check In
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mark Attendance Kiosk Section */}
        <SubmitAttendanceTab employees={employees} />

        {/* QR Code & Direct Link Modal */}
        <AttendanceQRModal open={qrModalOpen} onOpenChange={setQrModalOpen} />
      </div>
    </div>
  );
}
