import React from 'react';

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  bg: 'var(--background)',
  fg: 'var(--foreground)',
  card: 'var(--card)',
  muted: 'var(--muted)',
  mutedFg: 'var(--muted-foreground)',
  border: 'var(--border)',
  primary: 'var(--primary)',
  primaryBg: 'color-mix(in oklch, var(--primary) 12%, transparent)',
  primaryFg: 'var(--primary-foreground, #fff)' as string,
  success: 'var(--success)',
  successBg: 'color-mix(in oklch, var(--success) 14%, transparent)',
  warning: 'var(--warning)',
  warningBg: 'color-mix(in oklch, var(--warning) 14%, transparent)',
  danger: 'var(--danger)',
  dangerBg: 'color-mix(in oklch, var(--danger) 14%, transparent)',
  info: 'oklch(0.488 0.243 264.376)',
  infoBg: 'oklch(0.488 0.243 264.376 / 0.14)',
  font: "'DM Sans', system-ui, sans-serif" as string,
};

function StatusBadge({ status }: { status: string | null }) {
  if (status === 'in_progress' || status === 'IN_PROGRESS')
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '2px 10px',
          borderRadius: 9999,
          fontSize: 11,
          fontWeight: 600,
          background: T.infoBg,
          color: T.info,
        }}
      >
        In Progress
      </span>
    );
  if (status === 'completed' || status === 'COMPLETED')
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '2px 10px',
          borderRadius: 9999,
          fontSize: 11,
          fontWeight: 600,
          background: T.successBg,
          color: T.success,
        }}
      >
        Completed
      </span>
    );
  if (status === 'COMPLETED_LATE')
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '2px 10px',
          borderRadius: 9999,
          fontSize: 11,
          fontWeight: 600,
          background: T.successBg,
          color: T.success,
        }}
      >
        Completed Late
      </span>
    );
  if (status === 'OVERDUE')
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '2px 10px',
          borderRadius: 9999,
          fontSize: 11,
          fontWeight: 600,
          background: T.dangerBg,
          color: T.danger,
        }}
      >
        Overdue
      </span>
    );
  if (status === 'ON_LEAVE')
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '2px 10px',
          borderRadius: 9999,
          fontSize: 11,
          fontWeight: 600,
          background: T.infoBg,
          color: T.info,
        }}
      >
        On Leave
      </span>
    );
  if (status === 'cancelled' || status === 'CANCELLED')
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '2px 10px',
          borderRadius: 9999,
          fontSize: 11,
          fontWeight: 600,
          background: T.dangerBg,
          color: T.danger,
        }}
      >
        Cancelled
      </span>
    );
  if (status === 'PENDING_APPROVAL')
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '2px 10px',
          borderRadius: 9999,
          fontSize: 11,
          fontWeight: 600,
          background: T.warningBg,
          color: T.warning,
        }}
      >
        Pending Approval
      </span>
    );
  if (status === 'COMPLETION_REJECTED')
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '2px 10px',
          borderRadius: 9999,
          fontSize: 11,
          fontWeight: 600,
          background: T.dangerBg,
          color: T.danger,
        }}
      >
        Rejected
      </span>
    );
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: 9999,
        fontSize: 11,
        fontWeight: 600,
        background: T.warningBg,
        color: T.warning,
      }}
    >
      Pending
    </span>
  );
}

export default React.memo(StatusBadge);
