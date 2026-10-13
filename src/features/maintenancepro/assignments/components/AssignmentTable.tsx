import { PaginationBar } from '@/components/shared/PaginationBar';
import { EquipmentPhoto } from '@/features/asset/equipment/components/EquipmentPhoto';
import { StatusPill } from '@/features/asset/equipment/components/StatusPill';
import { OwnershipBadge } from '@/features/asset/fleet/components/OwnershipBadge';
import { fmtDay } from '@/features/asset/fleet/lib/format';
import { dayLong } from '../lib/dates';
import type { AssignmentAction, AssignmentList } from '../types';
import { Panel, PanelState } from './Panel';
import { ReturnBy } from './ReturnBy';
import { RowActions } from './RowActions';

const COLS = ['Machine', 'Project / Site', 'Operator', 'Responsible', 'Since', 'Return by', 'Status'];

interface Props {
  data?: AssignmentList;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onAction: (a: AssignmentAction) => void;
  page: number;
  limit: number;
  onPage: (p: number) => void;
  onLimit: (n: number) => void;
}

/** Desktop: every machine matching the filters, with its assignment (or "Unassigned"). */
export function AssignmentTable({ data, loading, error, onRetry, onAction, page, limit, onPage, onLimit }: Props) {
  const rows = data?.rows ?? [];
  return (
    <Panel title="Assignments" count={data?.total}>
      <PanelState loading={loading && !data} error={error && !data} onRetry={onRetry} empty={data && rows.length === 0 ? 'No machines match these filters.' : undefined} />
      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                {COLS.map((c) => <th key={c} scope="col" className="px-2 py-2 font-medium">{c}</th>)}
                <th scope="col" className="px-2 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const a = r.assignment;
                return (
                  <tr key={r.machine.id} className="border-b last:border-0 align-middle">
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-2">
                        <EquipmentPhoto src={r.machine.imageUrl} category={r.machine.category} name={r.machine.name} className="size-9" />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{r.machine.name}</p>
                          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">{r.machine.assetCode}<OwnershipBadge value={r.machine.ownershipType} /></p>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2">{a ? <><p>{a.firm.name}</p><p className="text-xs text-muted-foreground">{a.site?.name ?? 'No specific site'}</p></> : <span className="text-muted-foreground">Unassigned</span>}</td>
                    <td className="px-2 py-2">
                      {r.operators && r.operators.length > 0 ? (
                        <div>
                          <p className="font-medium text-xs">{r.operators.map((op) => op.name).filter(Boolean).join(', ')}</p>
                          {r.operators[0]?.validTill && <p className="text-[11px] text-muted-foreground">till {fmtDay(r.operators[0].validTill)}</p>}
                        </div>
                      ) : r.operator ? (
                        <>
                          <p className="font-medium text-xs">{r.operator.name ?? '-'}</p>
                          {r.operator.validTill && <p className="text-[11px] text-muted-foreground">till {fmtDay(r.operator.validTill)}</p>}
                        </>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-2 py-2">{a?.responsible?.name ?? <span className="text-muted-foreground">-</span>}</td>
                    <td className="whitespace-nowrap px-2 py-2">{a ? dayLong(a.since.slice(0, 10)) : '-'}</td>
                    <td className="whitespace-nowrap px-2 py-2">{a ? <ReturnBy row={r} prefix={false} /> : '-'}</td>
                    <td className="px-2 py-2"><StatusPill status={r.status} /></td>
                    <td className="px-2 py-2 text-right"><RowActions row={r} onAction={onAction} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {data && data.total > limit && <div className="mt-3"><PaginationBar page={page} totalPages={Math.max(1, Math.ceil(data.total / limit))} onPageChange={onPage} pageSize={limit} onPageSizeChange={onLimit} /></div>}
    </Panel>
  );
}
