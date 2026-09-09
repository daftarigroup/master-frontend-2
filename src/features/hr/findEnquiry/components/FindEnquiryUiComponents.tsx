'use client';

import { IconAlertCircle, IconArrowRight, IconCheck, IconClock, IconX } from '@tabler/icons-react';
import type React from 'react';
import { memo } from 'react';

// ─── STATUS_CFG ──────────────────────────────────────────────────────────────

export const STATUS_CFG: Record<
  string,
  { label: string; actionLabel?: string; bg: string; text: string; icon: React.ReactNode }
> = {
  pending: {
    label: 'PENDING',
    actionLabel: 'Re-open',
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    icon: <IconClock className="h-2.5 w-2.5" />,
  },
  shortlisted: {
    label: 'SHORTLISTED',
    bg: 'bg-warning/10',
    text: 'text-warning',
    icon: <IconAlertCircle className="h-2.5 w-2.5" />,
  },
  interviewed: {
    label: 'INTERVIEWED',
    actionLabel: 'Under Interview',
    bg: 'bg-primary/10',
    text: 'text-primary',
    icon: <IconClock className="h-2.5 w-2.5" />,
  },
  selected: {
    label: 'SELECTED',
    actionLabel: 'Selected',
    bg: 'bg-success/10',
    text: 'text-success',
    icon: <IconCheck className="h-2.5 w-2.5" strokeWidth={3} />,
  },
  joining_initiated: {
    label: 'JOINING INIT',
    bg: 'bg-primary/10',
    text: 'text-primary',
    icon: <IconArrowRight className="h-2.5 w-2.5" />,
  },
  joined: {
    label: 'JOINED',
    bg: 'bg-success/10',
    text: 'text-success',
    icon: <IconCheck className="h-2.5 w-2.5" strokeWidth={3} />,
  },
  rejected: {
    label: 'REJECTED',
    actionLabel: 'Reject',
    bg: 'bg-destructive/10',
    text: 'text-destructive',
    icon: <IconX className="h-2.5 w-2.5" strokeWidth={3} />,
  },
  resigned: {
    label: 'RESIGNED',
    bg: 'bg-warning/10',
    text: 'text-warning',
    icon: <IconX className="h-2.5 w-2.5" strokeWidth={3} />,
  },
  terminated: {
    label: 'TERMINATED',
    bg: 'bg-destructive/10',
    text: 'text-destructive',
    icon: <IconX className="h-2.5 w-2.5" strokeWidth={3} />,
  },
  completed: {
    label: 'OFFBOARDED',
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    icon: <IconCheck className="h-2.5 w-2.5" strokeWidth={3} />,
  },
};

// ─── DelayBadge ───────────────────────────────────────────────────────────────

export const DelayBadge = memo(function DelayBadge({
  delayMinutes,
}: {
  delayMinutes: number | null | undefined;
}) {
  if (delayMinutes == null) return <span className="text-xs text-muted-foreground">—</span>;
  if (delayMinutes === 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
        On time
      </span>
    );
  }
  const d = Math.floor(delayMinutes / 1440);
  const h = Math.floor((delayMinutes % 1440) / 60);
  const m = delayMinutes % 60;
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || parts.length === 0) parts.push(`${m}m`);
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold whitespace-nowrap bg-red-500/20 border-red-500/30 text-red-400"
      title={`Processed ${parts.join(' ')} late vs planned`}
    >
      +{parts.join(' ')}
    </span>
  );
});

// ─── StatusPill ───────────────────────────────────────────────────────────────

export const StatusPill = memo(function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.pending!;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] ${cfg.bg} ${cfg.text}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
});

// ─── JLabel ───────────────────────────────────────────────────────────────────

export const JLabel = memo(function JLabel({
  children,
  optional,
}: {
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
      {children}
      {optional && (
        <span className="ml-1 font-normal normal-case tracking-normal text-muted-foreground/60">
          (optional)
        </span>
      )}
    </label>
  );
});

// ─── JSectionTitle ────────────────────────────────────────────────────────────

export const JSectionTitle = memo(function JSectionTitle({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <p className="col-span-full mb-0.5 border-b border-border pb-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
      {children}
    </p>
  );
});
