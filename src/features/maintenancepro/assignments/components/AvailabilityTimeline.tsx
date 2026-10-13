import { useState } from 'react';
import { StatusPill } from '@/features/asset/equipment/components/StatusPill';
import { cn } from '@/lib/utils';
import { dayLong, dayOfMonth, weekdayShort } from '../lib/dates';
import { CELL, LEGEND_LABEL, STATUS_ORDER } from '../lib/statusStyle';
import type { Availability } from '../types';
import { Panel, PanelState } from './Panel';

interface Props {
  data?: Availability;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  /** phone: 7-day strip with a per-day list; desktop: machines x days grid */
  desktop: boolean;
}

function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs" aria-label="Legend">
      {STATUS_ORDER.map((s) => (
        <li key={s} className="flex items-center gap-1.5">
          <span aria-hidden className={cn('grid size-4 place-items-center rounded-sm text-[10px] font-bold', CELL[s].cls)}>{CELL[s].letter}</span>
          {LEGEND_LABEL[s]}
        </li>
      ))}
      <li className="flex items-center gap-1.5 text-muted-foreground"><span aria-hidden className="size-4 rounded-sm border border-dashed border-foreground/50" />Dashed = planned</li>
    </ul>
  );
}

function DayStrip({ data }: { data: Availability }) {
  const days = data.rows[0]?.cells.map((c) => c.date) ?? [];
  const [picked, setPicked] = useState<string | null>(null);
  const selected = picked && days.includes(picked) ? picked : data.today;
  const planned = selected > data.today;
  const groups = STATUS_ORDER.map((s) => ({
    status: s,
    machines: data.rows.filter((r) => r.cells.find((c) => c.date === selected)?.status === s),
  })).filter((g) => g.machines.length > 0);
  return (
    <>
      <div role="group" aria-label="Pick a day" className="grid grid-cols-7 gap-1">
        {days.map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={d === selected}
            aria-label={`${dayLong(d)}${d === data.today ? ', today' : d > data.today ? ', planned' : ''}`}
            onClick={() => setPicked(d)}
            className={cn(
              'flex min-h-14 flex-col items-center justify-center rounded-lg border text-xs transition-colors',
              d === selected ? 'border-primary bg-primary text-primary-foreground' : d === data.today ? 'border-primary text-foreground' : 'bg-card text-muted-foreground',
            )}
          >
            <span>{weekdayShort(d)}</span>
            <span className="text-base font-bold tabular-nums">{dayOfMonth(d)}</span>
          </button>
        ))}
      </div>
      <div className="mt-3 space-y-3">
        <p className="text-xs font-medium text-muted-foreground">{dayLong(selected)}{planned ? ' (planned)' : selected === data.today ? ' (today)' : ''}</p>
        {groups.length === 0 && <p className="py-3 text-center text-sm text-muted-foreground">No machines in the fleet for this day.</p>}
        {groups.map((g) => (
          <div key={g.status}>
            <p className="mb-1 flex items-center gap-2 text-xs"><StatusPill status={g.status} /><span className="text-muted-foreground">{g.machines.length} machine{g.machines.length === 1 ? '' : 's'}</span></p>
            <ul className="space-y-1 text-sm">
              {g.machines.map((m) => <li key={m.machineId} className="truncate">{m.name} <span className="text-xs text-muted-foreground">{m.assetCode}</span></li>)}
            </ul>
          </div>
        ))}
      </div>
    </>
  );
}

function Grid({ data }: { data: Availability }) {
  const days = data.rows[0]?.cells ?? [];
  return (
    <div className="max-h-[480px] max-w-full overflow-auto rounded-lg border">
      <table className="border-separate border-spacing-0 text-xs">
        <thead>
          <tr>
            <th scope="col" className="sticky left-0 top-0 z-20 min-w-48 border-b bg-card px-2 py-1.5 text-left font-medium">Machine</th>
            {days.map((c) => (
              <th key={c.date} scope="col" title={dayLong(c.date)} className={cn('sticky top-0 z-10 border-b bg-card px-0.5 py-1.5 text-center font-medium', c.date === data.today && 'text-primary')}>
                <span className="block">{weekdayShort(c.date)}</span>
                <span className="block tabular-nums">{dayOfMonth(c.date)}</span>
                {c.date === data.today && <span className="block text-[10px]">Today</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r) => (
            <tr key={r.machineId}>
              <th scope="row" className="sticky left-0 z-10 border-b bg-card px-2 py-1 text-left font-normal">
                <span className="block max-w-48 truncate font-medium">{r.name}</span>
                <span className="block text-muted-foreground">{r.assetCode}</span>
              </th>
              {r.cells.map((c) => {
                const label = `${r.name}, ${dayLong(c.date)}: ${LEGEND_LABEL[c.status]}${c.planned ? ' (planned)' : ''}`;
                return (
                  <td key={c.date} className="border-b p-0.5">
                    <span
                      title={label}
                      aria-label={label}
                      className={cn('mx-auto grid size-8 place-items-center rounded font-bold', CELL[c.status].cls, c.planned && 'border border-dashed border-foreground/60 opacity-75')}
                    >
                      {CELL[c.status].letter}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AvailabilityTimeline({ data, loading, error, onRetry, desktop }: Props) {
  const empty = data && data.rows.length === 0 ? 'No machines to show.' : undefined;
  return (
    <Panel title="Availability Timeline" action={desktop ? <span className="text-xs text-muted-foreground">Next {data?.days ?? 14} days, future days are planned</span> : undefined}>
      <div className="mb-3"><Legend /></div>
      <PanelState loading={loading && !data} error={error && !data} onRetry={onRetry} empty={empty} rows={2} />
      {data && data.rows.length > 0 && (desktop ? <Grid data={data} /> : <DayStrip data={data} />)}
    </Panel>
  );
}
