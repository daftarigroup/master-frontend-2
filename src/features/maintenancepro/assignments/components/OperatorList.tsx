import { ChevronRight } from 'lucide-react';
import { useCostEdit } from '@/features/asset/equipment/lib/useCostAccess';
import { fmtDay } from '@/features/asset/fleet/lib/format';
import { Button } from '@/components/ui/button';
import { useOperatorRows } from '../server/useAssignmentQueries';
import type { AssignmentAction } from '../types';
import { Panel, PanelState } from './Panel';

const SHIFT = { DAY: 'Day shift', NIGHT: 'Night shift', GENERAL: 'General shift' } as const;

export function OperatorList({ onAction }: { onAction: (a: AssignmentAction) => void }) {
  const q = useOperatorRows();
  const admin = useCostEdit();
  const rows = q.data ?? [];
  return (
    <Panel title="Operator Assignment" count={q.data?.length}>
      <PanelState loading={q.isLoading} error={q.isError} onRetry={() => q.refetch()} empty={q.data && rows.length === 0 ? 'No operators assigned.' : undefined} rows={2} />
      <ul className="max-h-96 divide-y overflow-y-auto">
        {rows.map((o) => {
          const who = [o.operator.code, o.operator.designation].filter(Boolean).join(' · ');
          return (
            <li key={o.id} className="flex items-center gap-2 py-2">
              <div className="min-w-0 flex-1 text-xs">
                <p className="truncate text-sm font-medium">{o.operator.name ?? 'Operator'}</p>
                {who && <p className="truncate text-muted-foreground">{who}</p>}
                <p className="truncate text-muted-foreground">{o.machine.name} ({o.machine.assetCode}){o.shift ? ` · ${SHIFT[o.shift]}` : ''}</p>
                <p className="mt-0.5 flex items-center gap-1.5">
                  {o.validTill ? `Valid till ${fmtDay(o.validTill)}` : 'No end date'}
                  {o.expiringSoon && <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300">Expiring</span>}
                </p>
              </div>
              {admin && (
                <div className="flex shrink-0 flex-col gap-1">
                  <Button variant="outline" className="h-11 gap-1 px-2 lg:h-9" aria-label={`Change operator for ${o.machine.name}`} onClick={() => onAction({ kind: 'operator', machine: { id: o.machine.id, name: o.machine.name }, current: { assignmentId: o.id, id: o.operator.id, name: o.operator.name, shift: o.shift, validTill: o.validTill, expiringSoon: o.expiringSoon } })}>
                    Change<ChevronRight className="size-4" aria-hidden />
                  </Button>
                  <Button variant="ghost" className="h-11 px-2 text-red-600 lg:h-9" aria-label={`End operator assignment for ${o.machine.name}`} onClick={() => onAction({ kind: 'endOperator', id: o.id, operatorName: o.operator.name, machineName: o.machine.name })}>End</Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
