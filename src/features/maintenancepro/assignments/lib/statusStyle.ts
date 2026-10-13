import { Activity, CheckCircle2, PauseCircle, Truck, Wrench, type LucideIcon } from 'lucide-react';
import type { KpiTone } from '@/components/shared/KpiTile';
import type { DerivedStatus } from '../types';

export const STATUS_ORDER: DerivedStatus[] = ['IN_USE', 'IDLE', 'UNDER_MAINT', 'AVAILABLE', 'IN_TRANSIT'];

/** Timeline legend names (the brief says "Maintenance" here; the pills keep the shared "Under Maint."). */
export const LEGEND_LABEL: Record<DerivedStatus, string> = {
  IN_USE: 'In Use',
  IDLE: 'Idle',
  UNDER_MAINT: 'Maintenance',
  AVAILABLE: 'Available',
  IN_TRANSIT: 'In Transit',
};

/** Colour AND a letter, so the grid never relies on colour alone. */
export const CELL: Record<DerivedStatus, { letter: string; cls: string }> = {
  IN_USE: { letter: 'U', cls: 'bg-emerald-500 text-white dark:bg-emerald-600' },
  IDLE: { letter: 'I', cls: 'bg-amber-400 text-amber-950 dark:bg-amber-500 dark:text-amber-950' },
  UNDER_MAINT: { letter: 'M', cls: 'bg-red-500 text-white dark:bg-red-600' },
  AVAILABLE: { letter: 'A', cls: 'bg-sky-400 text-sky-950 dark:bg-sky-500 dark:text-sky-950' },
  IN_TRANSIT: { letter: 'T', cls: 'bg-violet-500 text-white dark:bg-violet-600' },
};

export const TILE: Record<DerivedStatus, { icon: LucideIcon; tone: KpiTone }> = {
  IN_USE: { icon: Activity, tone: 'emerald' },
  AVAILABLE: { icon: CheckCircle2, tone: 'blue' },
  UNDER_MAINT: { icon: Wrench, tone: 'red' },
  IDLE: { icon: PauseCircle, tone: 'amber' },
  IN_TRANSIT: { icon: Truck, tone: 'violet' },
};
