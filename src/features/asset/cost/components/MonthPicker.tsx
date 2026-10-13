import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { istMonth, shiftMonth } from '@/features/asset/fleet/lib/format';
import { monthLabel } from '../lib/costLabels';

/** Previous / next month around the native month input (which gives phones their own picker). Future months are not offered. */
export function MonthPicker({ value, onChange }: { value: string; onChange: (m: string) => void }) {
  const current = istMonth();
  return (
    <div className="inline-flex items-center gap-1">
      <Button variant="outline" size="icon" className="size-10" aria-label="Previous month" onClick={() => onChange(shiftMonth(value, -1))}>
        <ChevronLeft className="size-4" />
      </Button>
      <label className="relative">
        <span className="sr-only">Month</span>
        <input
          type="month"
          value={value}
          max={current}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          className="h-10 w-[11.5rem] rounded-md border bg-background px-3 text-sm font-medium"
          aria-label={`Month, showing ${monthLabel(value)}`}
        />
      </label>
      <Button variant="outline" size="icon" className="size-10" aria-label="Next month" disabled={value >= current} onClick={() => onChange(shiftMonth(value, 1))}>
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
