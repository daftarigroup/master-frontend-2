import { CalendarClock, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { bannerText, DUE_STYLE } from '../lib/due';
import type { NextService } from '../types';
import { DuePill } from './DuePill';

interface Props {
  next: NextService;
  hasSchedules: boolean;
  canManage: boolean;
  onAddSchedule: () => void;
}

/** Next Service Due: the headline of the Overview. */
export function NextServiceBanner({ next, hasSchedules, canManage, onAddSchedule }: Props) {
  if (next.status === 'NOT_SET' && !hasSchedules) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed bg-card p-4">
        <CalendarClock className="size-5 text-muted-foreground" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">No service schedule</p>
          <p className="text-xs text-muted-foreground">Add a schedule to track when this machine is next due.</p>
        </div>
        {canManage && (
          <Button size="sm" className="h-11 lg:h-9" onClick={onAddSchedule}>
            <Plus className="size-4" /> Add schedule
          </Button>
        )}
      </div>
    );
  }
  const text = bannerText(next);
  return (
    <div className={cn('flex items-center gap-3 rounded-xl border p-4', DUE_STYLE[next.status])}>
      <CalendarClock className="size-6 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium opacity-80">Next Service Due{next.scheduleName ? ` · ${next.scheduleName}` : ''}</p>
        <p className="text-sm font-bold">{next.missingBaseline ? 'Set the last service to start tracking' : (text ?? 'Not set')}</p>
      </div>
      <DuePill due={next} className="bg-card/70 dark:bg-card/40" />
    </div>
  );
}
