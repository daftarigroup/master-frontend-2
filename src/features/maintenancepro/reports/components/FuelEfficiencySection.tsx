import { Fuel, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { useProject } from '@/context/ProjectContext';
import { OwnershipBadge } from '@/features/asset/fleet/components/OwnershipBadge';
import { fmtNum, istToday } from '@/features/asset/fleet/lib/format';
import { useEfficiency } from '@/features/asset/fleet/server/tanstackQuery/useFleetQueries';
import { UNIT_LABEL, type EfficiencyRow } from '@/features/asset/fleet/types/types';
import { toFirmParam } from '../../shared/lib/common';

const rateText = (r: EfficiencyRow) =>
  r.rate === null || r.rate === undefined
    ? '—'
    : `${fmtNum(r.rate, 3)} L/${UNIT_LABEL[r.readingUnit] || 'unit'}`;
const devText = (r: EfficiencyRow) =>
  r.deviationPct === null || r.deviationPct === undefined
    ? '—'
    : `${r.deviationPct > 0 ? '+' : ''}${fmtNum(r.deviationPct, 1)}%`;

function FlagBadge() {
  return (
    <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700 dark:bg-red-900/40 dark:text-red-400">
      Flagged
    </span>
  );
}

function OpenNote({ n }: { n: number }) {
  return n > 0 ? (
    <p className="text-[11px] text-amber-700 dark:text-amber-300">
      {n} open entr{n === 1 ? 'y' : 'ies'} excluded
    </p>
  ) : null;
}

/** Litres, usage and litres-per-unit per machine over a date range (GET /fleet/efficiency). */
export function FuelEfficiencySection() {
  const { selectedProject } = useProject();
  const firmId = toFirmParam(selectedProject);
  const today = istToday();
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const valid = !!from && !!to && from <= to;

  const { data, isLoading, isError } = useEfficiency({ firmId, from, to });
  const rows = valid ? (data ?? []) : [];

  return (
    <Card className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex items-center text-base font-semibold">
          <Fuel size={20} className="mr-2 text-sky-600" />
          Fuel efficiency
        </h2>
        <div className="flex items-center gap-2 text-sm">
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full rounded-md border bg-background px-2 py-1.5 sm:w-auto"
            aria-label="From date"
          />
          <span className="text-muted-foreground">to</span>
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
            className="w-full rounded-md border bg-background px-2 py-1.5 sm:w-auto"
            aria-label="To date"
          />
        </div>
      </div>

      {!valid ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Pick a valid date range.</p>
      ) : isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 size={24} className="animate-spin text-sky-600" />
        </div>
      ) : isError ? (
        <p className="py-6 text-center text-sm text-red-600 dark:text-red-400">
          Failed to load fuel efficiency. Please try again.
        </p>
      ) : rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No diesel or usage in this period.</p>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">Machine</th>
                  <th className="px-3 text-right">Litres</th>
                  <th className="px-3 text-right">Usage</th>
                  <th className="px-3 text-right">Rate</th>
                  <th className="px-3 text-right">Expected</th>
                  <th className="px-3 text-right">Deviation</th>
                  <th className="pl-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => (
                  <tr key={r.machineId}>
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{r.machineName}</span>
                        <OwnershipBadge value={r.ownershipType} />
                      </div>
                      <OpenNote n={r.excludedOpenEntries} />
                    </td>
                    <td className="px-3 text-right tabular-nums">{fmtNum(r.litres)}</td>
                    <td className="px-3 text-right tabular-nums">
                      {fmtNum(r.usage)} {UNIT_LABEL[r.readingUnit]}
                    </td>
                    <td className="px-3 text-right tabular-nums">{rateText(r)}</td>
                    <td className="px-3 text-right tabular-nums">
                      {r.expected === null || r.expected === undefined ? '—' : fmtNum(r.expected, 3)}
                    </td>
                    <td className="px-3 text-right tabular-nums">{devText(r)}</td>
                    <td className="pl-3">{r.flagged && <FlagBadge />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {rows.map((r) => (
              <div key={r.machineId} className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-medium">{r.machineName}</span>
                    <OwnershipBadge value={r.ownershipType} />
                  </div>
                  {r.flagged && <FlagBadge />}
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                  <dt className="text-muted-foreground">Litres</dt>
                  <dd className="text-right tabular-nums">{fmtNum(r.litres)}</dd>
                  <dt className="text-muted-foreground">Usage</dt>
                  <dd className="text-right tabular-nums">
                    {fmtNum(r.usage)} {UNIT_LABEL[r.readingUnit]}
                  </dd>
                  <dt className="text-muted-foreground">Rate</dt>
                  <dd className="text-right tabular-nums">{rateText(r)}</dd>
                  <dt className="text-muted-foreground">Expected</dt>
                  <dd className="text-right tabular-nums">
                    {r.expected === null || r.expected === undefined ? '—' : fmtNum(r.expected, 3)}
                  </dd>
                  <dt className="text-muted-foreground">Deviation</dt>
                  <dd className="text-right tabular-nums">{devText(r)}</dd>
                </dl>
                <OpenNote n={r.excludedOpenEntries} />
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

export default FuelEfficiencySection;
