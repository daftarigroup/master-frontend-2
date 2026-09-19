'use client';

import {
  IconCheck,
  IconClock,
  IconLoader2,
  IconLogin2,
  IconLogout2,
  IconMapPin,
  IconSearch,
  IconSun,
  IconX,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { cn, getPublicFileUrl } from '@/lib/utils';
import { uploadPunchPhoto } from '../server/api/attendanceApi';
import { useAttendancePunches, useSubmitPunch } from '../server/tanstackQuery/useAttendanceQueries';
import type { EmployeeMeta, PunchType } from '../types/types';
import type { GeoPhoto } from './GeoPhotoCapture';
import GeoPhotoCapture from './GeoPhotoCapture';

const PUNCH_OPTIONS: { key: PunchType; label: string; Icon: typeof IconLogin2 }[] = [
  { key: 'in', label: 'In', Icon: IconLogin2 },
  { key: 'out', label: 'Out', Icon: IconLogout2 },
  { key: 'half_day', label: 'Half Day', Icon: IconSun },
];

const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const fmt12 = (t: string) => {
  const [hStr, mStr] = t.split(':');
  const h = parseInt(hStr ?? '0', 10);
  const m = parseInt(mStr ?? '0', 10);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

interface Props {
  employees: EmployeeMeta[];
}

/**
 * The incharge-operated attendance kiosk panel: the employee never logs in
 * (see [[hr-system-access-model]] / [[employee-user-independence]]) — a
 * logged-in incharge picks the employee, the shift type, and captures a
 * mandatory geo-stamped photo, one employee at a time.
 */
export default function SubmitAttendanceTab({ employees }: Props) {
  const today = new Date().toISOString().slice(0, 10);

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<EmployeeMeta | null>(null);
  const [punchType, setPunchType] = useState<PunchType | null>(null);
  const [time, setTime] = useState(nowHHMM());
  const [geoPhoto, setGeoPhoto] = useState<GeoPhoto | null>(null);
  const [uploading, setUploading] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState<{ url: string; title?: string } | null>(null);

  useEffect(() => {
    if (!viewingPhoto) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setViewingPhoto(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewingPhoto]);

  const submitMut = useSubmitPunch();
  const { data: todayPunches = [], isLoading: loadingToday } = useAttendancePunches({ date: today });

  // Punches are returned newest-first, so the first entry for this employee
  // today is their most recent punch — if it's an unmatched 'in', block a
  // second 'in' until they punch 'out'.
  const lastPunchTypeForSelected = useMemo(() => {
    if (!selected) return null;
    return todayPunches.find((p) => p.employeeId === selected.employeeId)?.punchType ?? null;
  }, [todayPunches, selected]);
  const isInLocked = lastPunchTypeForSelected === 'in';

  useEffect(() => {
    if (isInLocked && punchType === 'in') setPunchType(null);
  }, [isInLocked, punchType]);

  const filteredEmployees = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return [];
    return employees
      .filter(
        (e) =>
          (e.name ?? '').toLowerCase().includes(term) ||
          (e.empCode ?? '').toLowerCase().includes(term) ||
          e.employeeId.toLowerCase().includes(term)
      )
      .slice(0, 8);
  }, [employees, search]);

  const canSubmit = !!selected && !!punchType && !!geoPhoto && !uploading && !submitMut.isPending;

  const resetForm = () => {
    setSelected(null);
    setSearch('');
    setPunchType(null);
    setTime(nowHHMM());
    setGeoPhoto(null);
  };

  const handleSubmit = async () => {
    if (!selected || !punchType || !geoPhoto) return;
    setUploading(true);
    try {
      const photoUrl = await uploadPunchPhoto(geoPhoto.blob, selected.employeeId);
      setUploading(false);
      submitMut.mutate(
        {
          employeeId: selected.employeeId,
          punchType,
          time,
          photoUrl,
          latitude: geoPhoto.latitude,
          longitude: geoPhoto.longitude,
        },
        {
          onSuccess: () => {
            toast.success(`Attendance marked for ${selected.name ?? selected.employeeId}`);
            resetForm();
          },
          onError: (err: unknown) => {
            const msg =
              (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
              'Failed to submit attendance';
            toast.error(msg);
          },
        }
      );
    } catch (err) {
      setUploading(false);
      const msg = err instanceof Error ? err.message : 'Failed to upload photo';
      toast.error(msg);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      {/* Submission form */}
      <div className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-5">
        <div>
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
            1. Select Employee
          </p>
          {selected ? (
            <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5">
              <div>
                <p className="text-[13px] font-semibold">{selected.name ?? selected.employeeId}</p>
                <p className="text-[11px] text-muted-foreground">
                  {selected.empCode ?? selected.employeeId}
                  {selected.department?.name ? ` · ${selected.department.name}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setGeoPhoto(null);
                }}
                className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search employee by name, code, or ID…"
                className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-[13px] outline-none focus:border-primary"
              />
              {filteredEmployees.length > 0 && (
                <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                  {filteredEmployees.map((emp) => (
                    <button
                      key={emp.employeeId}
                      type="button"
                      onClick={() => {
                        setSelected(emp);
                        setSearch('');
                        setGeoPhoto(null);
                      }}
                      className="flex w-full flex-col items-start px-4 py-2 text-left hover:bg-muted/50"
                    >
                      <span className="text-[13px] font-medium">{emp.name ?? emp.employeeId}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {emp.empCode ?? emp.employeeId}
                        {emp.department?.name ? ` · ${emp.department.name}` : ''}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
            2. Shift Type
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PUNCH_OPTIONS.map(({ key, label, Icon }) => {
              const disabled = key === 'in' && isInLocked;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={disabled}
                  onClick={() => setPunchType(key)}
                  title={disabled ? 'Already punched in — punch out first' : undefined}
                  className={cn(
                    'flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-[13px] font-semibold transition-colors',
                    disabled
                      ? 'cursor-not-allowed border-border bg-muted/30 text-muted-foreground/50'
                      : punchType === key
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted/40'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              );
            })}
          </div>
          {isInLocked && (
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {selected?.name ?? 'This employee'} is already punched in today — punch out before punching in again.
            </p>
          )}
        </div>

        <div>
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
            3. Time
          </p>
          <div className="relative w-40">
            <IconClock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-[13px] outline-none focus:border-primary"
            />
          </div>
        </div>

        <div>
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
            4. Location Photo <span className="text-destructive">*</span>
          </p>
          <GeoPhotoCapture
            value={geoPhoto}
            onCapture={setGeoPhoto}
            onClear={() => setGeoPhoto(null)}
            disabled={uploading || submitMut.isPending}
          />
        </div>

        <button
          type="button"
          disabled={!canSubmit}
          onClick={handleSubmit}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {uploading || submitMut.isPending ? (
            <IconLoader2 className="h-4 w-4 animate-spin" />
          ) : (
            <IconCheck className="h-4 w-4" />
          )}
          {uploading ? 'Uploading photo…' : submitMut.isPending ? 'Submitting…' : 'Submit Attendance'}
        </button>
      </div>

      {/* Today's submissions */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-5">
        <p className="mb-3 text-[13px] font-semibold">Submitted Today</p>
        {loadingToday ? (
          <div className="flex items-center justify-center py-8">
            <IconLoader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : todayPunches.length === 0 ? (
          <p className="py-6 text-center text-[12px] text-muted-foreground">
            No attendance marked yet today.
          </p>
        ) : (
          <div className="max-h-[520px] space-y-2 overflow-y-auto">
            {todayPunches.map((p) => {
              const photoSrc = getPublicFileUrl(p.photoUrl);
              const punchLabel =
                PUNCH_OPTIONS.find((o) => o.key === p.punchType)?.label ?? p.punchType;
              const formattedTime = fmt12(p.punchTime);
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-xl border border-border p-2.5 transition-colors hover:bg-muted/30"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setViewingPhoto({
                        url: photoSrc,
                        title: `${p.employeeName ?? p.employeeId} · ${punchLabel} (${formattedTime})`,
                      })
                    }
                    className="group relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-border/80 focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                    title="Click to view full photo"
                  >
                    <img
                      src={photoSrc}
                      alt={p.employeeName ?? p.employeeId}
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-110"
                    />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold">
                      {p.employeeName ?? p.employeeId}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {punchLabel} · {formattedTime}
                    </p>
                  </div>
                  <IconMapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Full image preview popup */}
      {viewingPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setViewingPhoto(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex flex-col max-h-[90vh] max-w-[90vw] sm:max-w-xl md:max-w-2xl overflow-hidden rounded-2xl border border-border/80 bg-card p-3 shadow-2xl"
          >
            {/* Minimized Close Button at top right corner */}
            <button
              type="button"
              onClick={() => setViewingPhoto(null)}
              className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white shadow-md transition hover:bg-black/80 focus:outline-none cursor-pointer"
              title="Close (Esc)"
              aria-label="Close photo preview"
            >
              <IconX className="h-4 w-4" />
            </button>

            <div className="overflow-hidden rounded-xl bg-black/10 flex items-center justify-center">
              <img
                src={viewingPhoto.url}
                alt={viewingPhoto.title ?? 'Attendance photo'}
                className="max-h-[75vh] w-auto max-w-full object-contain rounded-lg"
              />
            </div>

            {viewingPhoto.title && (
              <div className="mt-2.5 px-1 flex items-center justify-between">
                <p className="text-[13px] font-semibold truncate text-foreground">
                  {viewingPhoto.title}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
