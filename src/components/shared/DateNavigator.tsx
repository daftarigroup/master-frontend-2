import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDayLong } from '@/lib/dayFormat';

const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
interface Props {
  value: string;
  onChange: (iso: string) => void;
  /** the latest day that may be picked (default: no limit) */
  max?: string;
  className?: string;
}

/** Previous / date picker / next. The date input is the browser's own, so phones get their native picker. */
export function DateNavigator({ value, onChange, max, className }: Props) {
  return (
    <div className={`flex items-center gap-1 ${className ?? ''}`}>
      <Button type="button" variant="outline" size="icon" className="size-10 shrink-0" aria-label="Previous day" onClick={() => onChange(addDays(value, -1))}>
        <ChevronLeft className="size-4" />
      </Button>
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">Date</span>
        <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          type="date"
          value={value}
          max={max}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          className="h-10 w-full min-w-0 rounded-md border bg-background pl-8 pr-2 text-sm font-medium"
          aria-label={`Date, showing ${formatDayLong(value)}`}
        />
      </label>
      <Button type="button" variant="outline" size="icon" className="size-10 shrink-0" aria-label="Next day" disabled={!!max && value >= max} onClick={() => onChange(addDays(value, 1))}>
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
