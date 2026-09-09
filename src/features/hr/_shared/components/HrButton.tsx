'use client';

import { IconLoader2 } from '@tabler/icons-react';
import type React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline';
type Size = 'xs' | 'sm' | 'md';

const variantClasses: Record<Variant, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-primary/60',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  ghost: 'text-foreground hover:bg-muted',
  outline: 'border border-border bg-card text-foreground hover:bg-muted',
  danger: 'bg-danger text-danger-foreground hover:bg-danger/90',
  success: 'bg-success text-success-foreground hover:bg-success/90',
};

const sizeClasses: Record<Size, string> = {
  xs: 'h-7 px-2.5 text-[11px] gap-1 rounded-lg',
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-9 px-4 text-sm gap-2 rounded-xl',
};

interface HrButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}

export function HrButton({
  variant = 'primary',
  size = 'sm',
  loading,
  icon: Icon,
  className,
  children,
  disabled,
  ...rest
}: HrButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...rest}
    >
      {loading ? (
        <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
      ) : Icon ? (
        <Icon className="h-3.5 w-3.5" />
      ) : null}
      {children}
    </button>
  );
}

export default HrButton;
