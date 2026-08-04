import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { getAccentStyle } from '../config/accentStyles';
import { cn } from '@/lib/utils';

interface AppIconProps {
  icon: LucideIcon;
  accentClassName: string;
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
  disabled?: boolean;
  className?: string;
}

const SIZE_MAP = {
  sm: { box: 'size-8 rounded-lg', icon: 14 },
  md: { box: 'size-10 rounded-xl', icon: 18 },
  lg: { box: 'size-14 rounded-2xl', icon: 26 },
} as const;

/**
 * Standalone "app icon" visual language: a rounded-square, colored badge for
 * a system/module. Reused by the sidebar's icon dock (rail mode), the
 * launcher overlay, and the expanded sidebar's section headers, so the same
 * glyph reads consistently everywhere a system is represented.
 */
export const AppIcon: React.FC<AppIconProps> = ({
  icon: Icon,
  accentClassName,
  size = 'md',
  active = false,
  disabled = false,
  className,
}) => {
  const accent = getAccentStyle(accentClassName);
  const dims = SIZE_MAP[size];

  return (
    <div
      className={cn(
        'flex items-center justify-center text-white shadow-sm transition-all duration-200',
        dims.box,
        disabled ? 'bg-muted text-muted-foreground shadow-none' : accent.iconBg,
        active && !disabled && `ring-2 ring-offset-2 ring-offset-sidebar ${accent.ring}`,
        className
      )}
    >
      <Icon size={dims.icon} />
    </div>
  );
};

export default AppIcon;
