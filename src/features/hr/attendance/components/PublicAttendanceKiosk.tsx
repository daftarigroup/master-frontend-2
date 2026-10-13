import React, { useEffect, useMemo, useState } from 'react';
import {
  IconAlertCircle,
  IconArrowsMaximize,
  IconArrowsMinimize,
  IconBuildingCommunity,
  IconCalendarEvent,
  IconCamera,
  IconClock,
  IconLoader2,
  IconQrcode,
  IconRefresh,
  IconShieldCheck,
  IconUsers,
} from '@tabler/icons-react';
import { useAttendanceEmployees } from '../server/tanstackQuery/useAttendanceQueries';
import type { EmployeeMeta } from '../types/types';
import SubmitAttendanceTab from './SubmitAttendanceTab';
import AttendanceQRModal from './AttendanceQRModal';

export const PublicAttendanceKiosk: React.FC = () => {
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fullscreen state tracker
  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

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

  const dateStr = useMemo(() => {
    return currentTime.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }, [currentTime]);

  const timeStr = useMemo(() => {
    return currentTime.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  }, [currentTime]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-foreground flex flex-col selection:bg-primary/20">
      {/* Top Banner / Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/95 backdrop-blur-md shadow-xs">
        <div className="mx-auto max-w-[1600px] px-4 py-3 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-3">
          {/* Left: Branding & Status */}
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
              <IconCamera className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[17px] font-bold tracking-tight text-foreground sm:text-[19px]">
                  Attendance Punching Kiosk
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Kiosk
                </span>
              </div>
              <p className="text-[12px] text-muted-foreground flex items-center gap-1.5">
                <IconShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span>Public Access · No Login Required · Photo & Geo-Verified</span>
              </p>
            </div>
          </div>

          {/* Right: Live Clock & Action Controls */}
          <div className="flex items-center gap-2.5">
            {/* Live Digital Clock */}
            <div className="hidden md:flex flex-col items-end rounded-xl border border-border bg-card px-3.5 py-1.5 shadow-2xs">
              <span className="font-mono text-[14px] font-bold tracking-tight text-foreground">
                {timeStr}
              </span>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <IconCalendarEvent className="h-3 w-3" />
                {dateStr}
              </span>
            </div>

            {/* Attendance QR Code Modal Trigger */}
            <button
              type="button"
              onClick={() => setQrModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-[12px] font-semibold text-primary transition-colors hover:bg-primary/20"
              title="Show QR Code for others to scan"
            >
              <IconQrcode className="h-4 w-4" />
              <span className="hidden sm:inline">Share QR</span>
            </button>

            {/* Refresh */}
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center justify-center rounded-xl border border-border bg-card p-2 text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
              title="Refresh employee data"
            >
              <IconRefresh className="h-4 w-4" />
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="inline-flex items-center justify-center rounded-xl border border-border bg-card p-2 text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? (
                <IconArrowsMinimize className="h-4 w-4" />
              ) : (
                <IconArrowsMaximize className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Kiosk Content */}
      <main className="flex-1 mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {loadingEmps ? (
          <div className="flex min-h-[50vh] items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <IconLoader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-[14px] font-medium">Loading attendance kiosk directory…</p>
            </div>
          </div>
        ) : errEmps ? (
          <div className="flex min-h-[50vh] items-center justify-center px-4">
            <div className="flex max-w-md flex-col items-center gap-3.5 rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center shadow-xs">
              <div className="rounded-full bg-destructive/10 p-3 text-destructive">
                <IconAlertCircle className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-destructive">Unable to Load Directory</h3>
                <p className="text-[12px] text-muted-foreground mt-1">
                  Could not retrieve active employee directory. Please check network connectivity and try again.
                </p>
              </div>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-2 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-[12px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                <IconRefresh className="h-3.5 w-3.5" /> Retry Connection
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Quick Helper Banner */}
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <IconUsers className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-foreground">
                    Ready for Attendance Punching · {employees.length} Active Employees
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Search your name or code, choose shift punch, capture selfie with GPS location, and submit.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[12px] text-muted-foreground bg-background/80 rounded-xl px-3 py-1.5 border border-border">
                <IconClock className="h-3.5 w-3.5 text-primary" />
                <span>Current Date: <strong>{dateStr}</strong></span>
              </div>
            </div>

            {/* Attendance Form & Ledger */}
            <SubmitAttendanceTab employees={employees} />
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-border/60 bg-background/80 py-4 px-4 text-center text-[12px] text-muted-foreground">
        <div className="mx-auto max-w-[1600px] flex flex-wrap items-center justify-between gap-3 px-4">
          <p>© {new Date().getFullYear()} Daftari Group HR & Facilities Management System</p>
          <p className="flex items-center gap-1.5">
            <IconShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>Geo-stamped Proof of Presence Attendance System</span>
          </p>
        </div>
      </footer>

      {/* QR Code Modal for sharing */}
      <AttendanceQRModal open={qrModalOpen} onOpenChange={setQrModalOpen} />
    </div>
  );
};

export default PublicAttendanceKiosk;
