'use client';

import type React from 'react';
import { memo, useEffect } from 'react';

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

// ── Chip ──────────────────────────────────────────────────────────────────────
export const Chip = memo(function Chip({
  children,
  color,
  bg,
}: {
  children: React.ReactNode;
  color: string;
  bg: string;
}) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '.06em',
        padding: '3px 10px',
        borderRadius: 9999,
        background: bg,
        color,
        border: `1px solid ${color}`,
        whiteSpace: 'nowrap',
        textTransform: 'uppercase' as const,
      }}
    >
      {children}
    </span>
  );
});

// ── TextInput ─────────────────────────────────────────────────────────────────
export const TextInput = memo(function TextInput({
  style,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        background: T.muted,
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 13,
        color: T.fg,
        fontFamily: 'inherit',
        outline: 'none',
        transition: 'border-color .15s',
        ...style,
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = T.primary;
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = T.border;
      }}
    />
  );
});

// ── Dropdown ──────────────────────────────────────────────────────────────────
export const Dropdown = memo(function Dropdown({
  value,
  onChange,
  options,
  style,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  style?: React.CSSProperties;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        background: T.muted,
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        padding: '8px 28px 8px 12px',
        fontSize: 13,
        color: T.fg,
        fontFamily: 'inherit',
        outline: 'none',
        cursor: 'pointer',
        appearance: 'none' as const,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 10px center',
        ...style,
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
});

// ── Btn ───────────────────────────────────────────────────────────────────────
export const Btn = memo(function Btn({
  children,
  variant = 'default',
  size = 'default',
  style,
  onClick,
  disabled,
  type = 'button',
}: {
  children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'default';
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  const sizes: Record<string, React.CSSProperties> = {
    sm: { fontSize: 12, padding: '6px 12px', borderRadius: 6 },
    default: { fontSize: 13, padding: '8px 16px', borderRadius: 8 },
  };
  const variants: Record<string, React.CSSProperties> = {
    default: { background: T.primary, color: T.primaryFg },
    secondary: { background: T.muted, color: T.fg },
    ghost: { background: 'transparent', color: T.mutedFg },
    outline: { background: 'transparent', color: T.fg, border: `1px solid ${T.border}` },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        fontFamily: 'inherit',
        fontWeight: 500,
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all .15s',
        outline: 'none',
        whiteSpace: 'nowrap',
        opacity: disabled ? 0.5 : 1,
        ...sizes[size],
        ...variants[variant],
        ...style,
      }}
    >
      {children}
    </button>
  );
});

// ── Toast ─────────────────────────────────────────────────────────────────────
export const Toast = memo(function Toast({
  message,
  type,
  onDone,
}: {
  message: string;
  type: 'success' | 'warning' | 'info';
  onDone: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [onDone]);
  const colors = { success: T.success, warning: T.warning, info: T.primary };
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        background: T.card,
        border: `1px solid ${colors[type]}`,
        borderRadius: 10,
        padding: '12px 18px',
        fontSize: 13,
        fontWeight: 500,
        color: T.fg,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        boxShadow: '0 8px 30px rgba(0,0,0,.4)',
        minWidth: 220,
      }}
    >
      <div
        style={{ width: 6, height: 6, borderRadius: 3, background: colors[type], flexShrink: 0 }}
      />
      {message}
    </div>
  );
});
