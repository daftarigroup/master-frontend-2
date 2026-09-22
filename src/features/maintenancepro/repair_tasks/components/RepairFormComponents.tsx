import React, { useState } from 'react';

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

function RLabel({
  children,
  required,
  htmlFor,
}: {
  children: React.ReactNode;
  required?: boolean;
  htmlFor: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      style={{ display: 'block', fontSize: 12, fontWeight: 600, color: T.fg, marginBottom: 7 }}
    >
      {children}
      {required && <span style={{ color: T.danger, marginLeft: 3 }}>*</span>}
    </label>
  );
}

function RSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  error,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
}) {
  const [focus, setFocus] = useState(false);
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      disabled={disabled}
      style={{
        width: '100%',
        background: T.muted,
        border: `1px solid ${error ? T.danger : focus ? T.primary : T.border}`,
        borderRadius: 10,
        padding: '10px 34px 10px 12px',
        fontSize: 13,
        color: value ? T.fg : T.mutedFg,
        outline: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        appearance: 'none',
        transition: 'all .15s',
        opacity: disabled ? 0.6 : 1,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
        boxShadow: focus
          ? '0 0 0 3px color-mix(in oklch, var(--primary) 15%, transparent)'
          : 'none',
      }}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function RInput({
  id,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { id: string; error?: boolean }) {
  const [focus, setFocus] = useState(false);
  return (
    <input
      id={id}
      {...props}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={{
        width: '100%',
        background: T.muted,
        border: `1px solid ${error ? T.danger : focus ? T.primary : T.border}`,
        borderRadius: 10,
        padding: '10px 12px',
        fontSize: 13,
        color: T.fg,
        outline: 'none',
        transition: 'all .15s',
        boxSizing: 'border-box',
        boxShadow: focus
          ? '0 0 0 3px color-mix(in oklch, var(--primary) 15%, transparent)'
          : 'none',
        ...(props.style ?? {}),
      }}
    />
  );
}

function RToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        background: checked ? T.primary : T.border,
        border: 'none',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background .2s',
        flexShrink: 0,
        padding: 0,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 2,
          left: checked ? 22 : 2,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: 'white',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          transition: 'left .2s',
        }}
      />
    </button>
  );
}

export const MemoRLabel = React.memo(RLabel);
export const MemoRSelect = React.memo(RSelect);
export const MemoRInput = React.memo(RInput);
export const MemoRToggle = React.memo(RToggle);

export { RLabel, RSelect, RInput, RToggle };
