import { BreakdownCard, CostCard, MechanicCard } from './SideCards';
import { ChecklistCard } from './ChecklistCard';
import { NextServiceBanner } from './NextServiceBanner';
import { ScheduleCard } from './ScheduleCard';
import type { RecordSummary } from '../types';

interface Actions {
  canTick: boolean;
  onSchedule: () => void;
  onManage: () => void;
  onAddSchedule: () => void;
}

/** Banner, schedule and checklist: the main column of the Overview. */
export function OverviewMain({ s, a }: { s: RecordSummary; a: Actions }) {
  return (
    <div className="space-y-3">
      <NextServiceBanner next={s.nextService} hasSchedules={s.schedules.length > 0} canManage={s.canManageSchedules} onAddSchedule={a.onAddSchedule} />
      <ScheduleCard schedules={s.schedules} next={s.nextService} unit={s.machine.readingUnit} canManage={s.canManageSchedules} onManage={a.onManage} />
      <ChecklistCard checklist={s.checklist} canTick={a.canTick} canSchedule={s.canScheduleService && s.schedules.length > 0} onSchedule={a.onSchedule} />
    </div>
  );
}

/** Breakdown, mechanic and (only when the API sent it) cost. Phones show mechanic and cost side by side. */
export function OverviewSide({ s, desktop }: { s: RecordSummary; desktop?: boolean }) {
  const hasCost = s.cost !== undefined;
  return (
    <>
      {desktop ? (
        <>
          <MechanicCard mechanic={s.mechanic} />
          {hasCost && <CostCard cost={s.cost ?? null} />}
          <BreakdownCard breakdown={s.breakdown} />
        </>
      ) : (
        <>
          <BreakdownCard breakdown={s.breakdown} />
          <div className={hasCost ? 'grid grid-cols-2 gap-3' : ''}>
            <MechanicCard mechanic={s.mechanic} />
            {hasCost && <CostCard cost={s.cost ?? null} />}
          </div>
        </>
      )}
    </>
  );
}
