/**
 * Shared per-system accent tokens — reused by the sidebar's colored section
 * headers, the icon dock (rail mode), and the app launcher overlay so every
 * surface that represents a "system" draws from one palette definition.
 * Built entirely from existing Tailwind color scales; no new hex values.
 */
export interface AccentStyle {
  gradient: string;
  border: string;
  text: string;
  iconBg: string;
  ring: string;
}

export const ACCENT_STYLES: Record<string, AccentStyle> = {
  blue: {
    gradient: 'from-blue-600/15 via-blue-600/10 to-transparent',
    border: 'border-blue-600',
    text: 'text-blue-700 dark:text-blue-400',
    iconBg: 'bg-blue-600',
    ring: 'ring-blue-600/40',
  },
  orange: {
    gradient: 'from-orange-600/15 via-orange-600/10 to-transparent',
    border: 'border-orange-600',
    text: 'text-orange-700 dark:text-orange-400',
    iconBg: 'bg-orange-600',
    ring: 'ring-orange-600/40',
  },
  purple: {
    gradient: 'from-purple-600/15 via-purple-600/10 to-transparent',
    border: 'border-purple-600',
    text: 'text-purple-700 dark:text-purple-400',
    iconBg: 'bg-purple-600',
    ring: 'ring-purple-600/40',
  },
  emerald: {
    gradient: 'from-emerald-600/15 via-emerald-600/10 to-transparent',
    border: 'border-emerald-600',
    text: 'text-emerald-700 dark:text-emerald-400',
    iconBg: 'bg-emerald-600',
    ring: 'ring-emerald-600/40',
  },
  amber: {
    gradient: 'from-amber-600/15 via-amber-600/10 to-transparent',
    border: 'border-amber-600',
    text: 'text-amber-700 dark:text-amber-400',
    iconBg: 'bg-amber-600',
    ring: 'ring-amber-600/40',
  },
  indigo: {
    gradient: 'from-indigo-600/15 via-indigo-600/10 to-transparent',
    border: 'border-indigo-600',
    text: 'text-indigo-700 dark:text-indigo-400',
    iconBg: 'bg-indigo-600',
    ring: 'ring-indigo-600/40',
  },
  slate: {
    gradient: 'from-slate-600/15 via-slate-600/10 to-transparent',
    border: 'border-slate-600',
    text: 'text-slate-700 dark:text-slate-400',
    iconBg: 'bg-slate-600',
    ring: 'ring-slate-600/40',
  },
};

export const getAccentStyle = (accentClassName: string): AccentStyle =>
  ACCENT_STYLES[accentClassName] || ACCENT_STYLES.blue;
