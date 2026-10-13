import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ReadingUnit } from '@/features/asset/equipment/types';
import { cn } from '@/lib/utils';
import { DUE_LABEL, DUE_STYLE, intervalText, longDay, readingText } from '../lib/due';
import type { NextService, ScheduleLine } from '../types';

function Cell({ label, value, sub }: { label: string; value: string; sub?: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold">{value}</dd>
      {sub && <dd className="text-xs text-muted-foreground">{sub}</dd>}
    </div>
  );
}

interface Props {
  schedules: ScheduleLine[];
  next: NextService;
  unit: ReadingUnit;
  canManage: boolean;
  onManage: () => void;
}

/** Service Schedule: the nearest schedule in full, any others listed compactly with their status. */
export function ScheduleCard({ schedules, next, unit, canManage, onManage }: Props) {
  const main = schedules.find((s) => s.id === next.scheduleId) ?? schedules[0] ?? null;
  const others = schedules.filter((s) => s.id !== main?.id);
  return (
    <section className="rounded-xl border bg-card p-4" aria-label="Service Schedule">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="flex-1 text-sm font-semibold">Service Schedule</h2>
        {canManage && (
          <Button variant="ghost" size="sm" className="h-9" onClick={onManage}>
            <Settings2 className="size-4" /> Manage
          </Button>
        )}
      </div>
      {!main ? (
        <p className="text-sm text-muted-foreground">No schedule yet.</p>
      ) : (
        <dl className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3">
          <Cell label="Last Service" value={main.lastServiceAt ? longDay(main.lastServiceAt) : 'Not recorded'} sub={main.lastServiceReading !== null ? `at ${readingText(main.lastServiceReading, unit)}` : null} />
          <Cell
            label="Next Due"
            value={main.nextDueReading !== null ? readingText(main.nextDueReading, unit) : main.nextDueDate ? longDay(main.nextDueDate) : '—'}
            sub={main.nextDueReading !== null && main.nextDueDate ? `or ${longDay(main.nextDueDate)}` : null}
          />
          <Cell label="Service Interval" value={intervalText(main, unit)} />
        </dl>
      )}
      {others.length > 0 && (
        <ul className="mt-3 divide-y border-t">
          {others.map((s) => (
            <li key={s.id} className="flex items-center gap-2 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate">{s.name}</span>
              <span className="hidden text-xs text-muted-foreground sm:inline">{intervalText(s, unit)}</span>
              <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-semibold', DUE_STYLE[s.status])}>{DUE_LABEL[s.status]}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
