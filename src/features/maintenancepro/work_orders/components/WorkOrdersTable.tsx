import { cn, getPublicFileUrl } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Image as ImageIcon, Paperclip } from 'lucide-react';
import OwnershipBadge from '@/features/asset/fleet/components/OwnershipBadge';
import type { WorkOrderRow } from '../server/api/workOrdersApi';
import { PartsPill, PriorityPill, StagePill, StatusPill, TypePill } from './WorkOrderBadges';
import { WorkOrderRowActions, type RowHandlers } from './WorkOrderRowActions';
import { fmtDateTime, fmtMoney, isOverdue } from './workOrderUtils';

interface ListProps {
  rows: WorkOrderRow[];
  ownership: Map<string, string>;
  handlers: RowHandlers;
}

const cost = (wo: WorkOrderRow) => wo.outsource?.billAmount ?? wo.cost ?? null;

const getAttachments = (wo: WorkOrderRow) => {
  const billUrl = wo.outsource?.billUrl || wo.billUrl || (wo.checklistResponses as any)?.repairProcess?.billUrl || null;
  const photoUrl = wo.photoUrl || (wo.checklistResponses as any)?.repairProcess?.photoUrl || null;
  const docUrl = wo.documentUrl || (wo.checklistResponses as any)?.documentUrl || null;
  return { billUrl, photoUrl, docUrl };
};

export function WorkOrdersTable({ rows, ownership, handlers }: ListProps) {
  return (
    <Card className="hidden overflow-hidden p-0 md:block">
      <div className="w-full overflow-x-auto">
        <Table className="min-w-[1260px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px] whitespace-nowrap">Code</TableHead>
              <TableHead className="min-w-[200px]">Title</TableHead>
              <TableHead className="min-w-[180px]">Machine</TableHead>
              <TableHead className="min-w-[180px]">Assigned to / Responsible</TableHead>
              <TableHead className="w-[110px] whitespace-nowrap">Type</TableHead>
              <TableHead className="w-[100px] whitespace-nowrap">Priority</TableHead>
              <TableHead className="min-w-[160px] whitespace-nowrap">Due</TableHead>
              <TableHead className="w-[150px] whitespace-nowrap">Status</TableHead>
              <TableHead className="w-[120px] whitespace-nowrap">Outsource</TableHead>
              <TableHead className="w-[120px] text-center whitespace-nowrap">Attachment</TableHead>
              <TableHead className="w-[110px] text-right whitespace-nowrap">Cost</TableHead>
              <TableHead className="w-12 text-center" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((wo) => {
              const overdue = isOverdue(wo);
              const { billUrl, photoUrl, docUrl } = getAttachments(wo);
              return (
                <TableRow key={wo.id} className={cn(overdue && 'bg-red-50/60 dark:bg-red-950/20')}>
                  <TableCell className="whitespace-nowrap font-mono text-xs">{wo.workOrderCode ?? wo.id.slice(0, 8)}</TableCell>
                  <TableCell className="min-w-[200px] max-w-[280px] font-medium" title={wo.title ?? wo.plan?.title ?? ''}>
                    <button type="button" className="text-left hover:underline line-clamp-2" onClick={() => handlers.onView(wo)}>
                      {wo.title ?? wo.plan?.title ?? '-'}
                    </button>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="truncate max-w-[140px] font-medium">{wo.machine?.name ?? '-'}</span>
                      <OwnershipBadge value={ownership.get(wo.machineId)} />
                    </div>
                    <div className="text-xs text-muted-foreground">{wo.machine?.assetCode}</div>
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    <div className="font-medium">{wo.currentAssignee?.name ?? <span className="text-muted-foreground">Unassigned</span>}</div>
                    <div className="text-muted-foreground">{wo.responsible?.name ? `Resp: ${wo.responsible.name}` : 'Admin approves'}</div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap"><TypePill type={wo.type} /></TableCell>
                  <TableCell className="whitespace-nowrap"><PriorityPill priority={wo.priority} /></TableCell>
                  <TableCell className={cn('whitespace-nowrap text-sm', overdue && 'font-semibold text-red-600 dark:text-red-400')}>
                    {fmtDateTime(wo.actualDueDate)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap"><div className="flex flex-col items-start gap-1"><StatusPill status={wo.status} /><PartsPill wo={wo} /></div></TableCell>
                  <TableCell className="whitespace-nowrap"><StagePill wo={wo} /></TableCell>
                  <TableCell className="whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {billUrl && (
                        <a
                          href={getPublicFileUrl(billUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="View Bill / Invoice"
                          className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300 transition-colors"
                        >
                          <FileText className="size-3" /> Bill
                        </a>
                      )}
                      {photoUrl && (
                        <a
                          href={getPublicFileUrl(photoUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="View Work Photo"
                          className="inline-flex items-center gap-1 rounded border border-purple-200 bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700 hover:bg-purple-100 dark:border-purple-900 dark:bg-purple-950/40 dark:text-purple-300 transition-colors"
                        >
                          <ImageIcon className="size-3" /> Photo
                        </a>
                      )}
                      {docUrl && !billUrl && !photoUrl && (
                        <a
                          href={getPublicFileUrl(docUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="View Document"
                          className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 transition-colors"
                        >
                          <Paperclip className="size-3" /> Doc
                        </a>
                      )}
                      {!billUrl && !photoUrl && !docUrl && (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums whitespace-nowrap font-medium">{fmtMoney(cost(wo))}</TableCell>
                  <TableCell className="w-12 text-center"><WorkOrderRowActions wo={wo} handlers={handlers} /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

export function WorkOrderCards({ rows, ownership, handlers }: ListProps) {
  return (
    <div className="space-y-3 md:hidden">
      {rows.map((wo) => {
        const overdue = isOverdue(wo);
        const { billUrl, photoUrl, docUrl } = getAttachments(wo);
        return (
          <Card key={wo.id} className={cn('space-y-2 p-3', overdue && 'border-red-300 dark:border-red-800')}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-mono text-[11px] text-muted-foreground">{wo.workOrderCode ?? wo.id.slice(0, 8)}</div>
                <button type="button" className="text-left text-sm font-semibold" onClick={() => handlers.onView(wo)}>
                  {wo.title ?? wo.plan?.title ?? '-'}
                </button>
              </div>
              <WorkOrderRowActions wo={wo} handlers={handlers} />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="truncate">{wo.machine?.name ?? '-'}</span>
              <OwnershipBadge value={ownership.get(wo.machineId)} />
            </div>
            <div className="text-xs text-muted-foreground">
              {wo.currentAssignee?.name ?? 'Unassigned'} · {wo.responsible?.name ? `Responsible: ${wo.responsible.name}` : 'Admin approves'}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <TypePill type={wo.type} />
              <PriorityPill priority={wo.priority} />
              <StatusPill status={wo.status} />
              <PartsPill wo={wo} />
            </div>
            <div className={cn('text-xs', overdue ? 'font-semibold text-red-600 dark:text-red-400' : 'text-muted-foreground')}>
              Due {fmtDateTime(wo.actualDueDate)}
            </div>
            {(billUrl || photoUrl || docUrl) && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                <span className="text-muted-foreground">Files:</span>
                {billUrl && (
                  <a
                    href={getPublicFileUrl(billUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300"
                  >
                    <FileText className="size-3" /> Bill
                  </a>
                )}
                {photoUrl && (
                  <a
                    href={getPublicFileUrl(photoUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded border border-purple-200 bg-purple-50 px-1.5 py-0.5 text-[11px] font-medium text-purple-700 dark:border-purple-900 dark:bg-purple-950/40 dark:text-purple-300"
                  >
                    <ImageIcon className="size-3" /> Photo
                  </a>
                )}
                {docUrl && !billUrl && !photoUrl && (
                  <a
                    href={getPublicFileUrl(docUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                  >
                    <Paperclip className="size-3" /> Doc
                  </a>
                )}
              </div>
            )}
            {wo.outsource && (
              <div className="flex items-center justify-between border-t pt-2">
                <StagePill wo={wo} />
                <span className="text-sm tabular-nums">{fmtMoney(cost(wo))}</span>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
