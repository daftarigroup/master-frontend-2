'use client';

import type React from 'react';
import { memo } from 'react';

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
  chart5: 'var(--chart-5)',
  chart5Bg: 'color-mix(in oklch, var(--chart-5) 14%, transparent)',
  font: "'DM Sans', system-ui, sans-serif" as string,
};

// ── StatCard ──────────────────────────────────────────────────────────────────
export const StatCard = memo(function StatCard({
  label,
  value,
  color,
  bg,
  icon,
  active,
  onClick,
}: {
  label: string;
  value: number;
  color: string;
  bg: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  const base: React.CSSProperties = {
    background: T.card,
    border: active ? `2px solid ${color}` : `1px solid ${T.border}`,
    borderRadius: 12,
    padding: '14px 18px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    transition: 'all 0.2s ease',
    boxShadow: active ? `0 0 0 2px ${color}` : 'var(--shadow-md)',
    width: '100%',
    textAlign: 'left' as const,
    fontFamily: 'inherit',
    cursor: onClick ? 'pointer' : 'default',
  };
  const content = (
    <>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.02em', lineHeight: 1 }}>
          {value}
        </div>
        <div style={{ fontSize: 11, color: T.mutedFg, marginTop: 3 }}>{label}</div>
      </div>
    </>
  );
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        style={base}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = active ? `0 0 0 2px ${color}` : 'var(--shadow-md)';
        }}
      >
        {content}
      </button>
    );
  }
  return <div style={base}>{content}</div>;
});
