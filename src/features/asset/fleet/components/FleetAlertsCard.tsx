import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Fuel } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useProject } from '@/context/ProjectContext';
import { fmtDateTime, fmtDay } from '../lib/format';
import { useFleetAlerts } from '../server/tanstackQuery/useFleetQueries';

/** What needs attention in the diesel and usage logbooks: flagged readings (usage and diesel), entries left open. */
export function FleetAlertsCard() {
  const { selectedProject } = useProject();
  const firmId = selectedProject && selectedProject.id !== 'all' ? String(selectedProject.id) : null;
  const { data, isLoading } = useFleetAlerts(firmId);

  if (isLoading || !data) return null;
  const { flaggedEntries, staleOpenEntries } = data;
  const flaggedDiesel = data.flaggedDiesel ?? [];
  const clear = flaggedDiesel.length === 0 && flaggedEntries === 0 && staleOpenEntries.length === 0;

  return (
    <Card className="space-y-3 p-4">
      <h3 className="flex items-center gap-2 text-sm font-bold">
        <Fuel className="size-4 text-blue-600" /> Diesel & usage alerts
      </h3>
      {clear ? (
        <p className="flex items-center gap-1.5 text-sm text-emerald-600">
          <CheckCircle2 className="size-4" /> Nothing needs attention.
        </p>
      ) : (
        <ul className="space-y-2 text-sm">
          {flaggedDiesel.slice(0, 5).map((d) => (
            <li key={d.id} className="flex items-start gap-2 text-amber-700 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>
                {d.machineName ?? 'A machine'}: the meter reading on the {d.litres} L diesel issue of {fmtDay(d.date)}
                {d.meterReading !== null ? ` (${d.meterReading})` : ''} needs a check.{' '}
                {d.machineId && (
                  <Link to={`/asset/machines/${d.machineId}/logbook?tab=diesel`} className="font-medium underline hover:text-amber-900 dark:hover:text-amber-100">
                    Open
                  </Link>
                )}
              </span>
            </li>
          ))}
          {flaggedEntries > 0 && (
            <li className="flex items-start gap-2 text-amber-700 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>
                {flaggedEntries} meter reading{flaggedEntries === 1 ? '' : 's'} flagged in the last 30 days
                {data.flaggedList?.[0] ? ` on ${data.flaggedList[0].machineName}` : ''}.{' '}
                <Link
                  to={
                    data.flaggedList?.[0]
                      ? `/asset/machines/${data.flaggedList[0].machineId}/logbook?tab=flags`
                      : '/asset/work-logs?view=all'
                  }
                  className="font-medium underline hover:text-amber-900 dark:hover:text-amber-100"
                >
                  Open
                </Link>
              </span>
            </li>
          )}
          {staleOpenEntries.slice(0, 5).map((e) => (
            <li key={e.id} className="flex items-start gap-2 text-amber-700 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>
                <Link to={`/asset/machines/${e.machineId}/logbook`} className="font-medium underline">
                  {e.machineName}
                </Link>{' '}
                has been running since {fmtDateTime(e.startedAt)} with no stop reading.{' '}
                <Link
                  to={`/asset/machines/${e.machineId}/logbook`}
                  className="font-medium underline hover:text-amber-900 dark:hover:text-amber-100"
                >
                  Open
                </Link>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default FleetAlertsCard;
