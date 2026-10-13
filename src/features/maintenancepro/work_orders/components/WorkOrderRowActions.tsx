import { CheckCircle2, Eye, MoreHorizontal, SkipForward, Truck, UserRoundCog, Wrench, XCircle, PackageCheck, Banknote, FileText, Image as ImageIcon } from 'lucide-react';
import { getPublicFileUrl } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { WorkOrderRow } from '../server/api/workOrdersApi';
import { canMarkDone, canProcessRepair, canSkipOrCancel, markDoneBlockReason, nextStage } from './workOrderUtils';

export interface RowHandlers {
  onView: (wo: WorkOrderRow) => void;
  onProcess: (wo: WorkOrderRow) => void;
  onDone: (wo: WorkOrderRow) => void;
  onSkip: (wo: WorkOrderRow) => void;
  onCancel: (wo: WorkOrderRow) => void;
  onStage: (wo: WorkOrderRow, stage: 'send' | 'receive' | 'pay') => void;
  onReassign: (wo: WorkOrderRow) => void;
  /** Only the responsible person or an admin may reassign (the server enforces it too). */
  mayReassign: (wo: WorkOrderRow) => boolean;
}

const STAGE_ITEM = {
  send: { label: 'Send to vendor', Icon: Truck },
  receive: { label: 'Receive from vendor', Icon: PackageCheck },
  pay: { label: 'Mark paid', Icon: Banknote },
} as const;

export function WorkOrderRowActions({ wo, handlers }: { wo: WorkOrderRow; handlers: RowHandlers }) {
  const stage = nextStage(wo);
  const StageIcon = stage ? STAGE_ITEM[stage].Icon : null;
  const blocked = markDoneBlockReason(wo);
  const billUrl = wo.outsource?.billUrl || wo.billUrl || (wo.checklistResponses as any)?.repairProcess?.billUrl;
  const photoUrl = wo.photoUrl || (wo.checklistResponses as any)?.repairProcess?.photoUrl;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" aria-label="Row actions">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={() => handlers.onView(wo)}>
          <Eye className="mr-2 size-4" /> View details
        </DropdownMenuItem>
        {billUrl && (
          <DropdownMenuItem onClick={() => window.open(getPublicFileUrl(billUrl), '_blank')}>
            <FileText className="mr-2 size-4 text-blue-600" /> View bill
          </DropdownMenuItem>
        )}
        {photoUrl && (
          <DropdownMenuItem onClick={() => window.open(getPublicFileUrl(photoUrl), '_blank')}>
            <ImageIcon className="mr-2 size-4 text-purple-600" /> View photo
          </DropdownMenuItem>
        )}
        {canProcessRepair(wo) && (
          <DropdownMenuItem onClick={() => handlers.onProcess(wo)}>
            <Wrench className="mr-2 size-4" /> Process repair
          </DropdownMenuItem>
        )}
        {stage && StageIcon && (
          <DropdownMenuItem onClick={() => handlers.onStage(wo, stage)}>
            <StageIcon className="mr-2 size-4" /> {STAGE_ITEM[stage].label}
          </DropdownMenuItem>
        )}
        {canMarkDone(wo) && (
          <DropdownMenuItem disabled={!!blocked} title={blocked ?? undefined} onClick={() => handlers.onDone(wo)}>
            <CheckCircle2 className="mr-2 size-4" /> Mark done
          </DropdownMenuItem>
        )}
        {canMarkDone(wo) && blocked && <div className="px-2 pb-1.5 text-[11px] leading-tight text-amber-700 dark:text-amber-400">{blocked}</div>}
        {canSkipOrCancel(wo) && handlers.mayReassign(wo) && (
          <DropdownMenuItem onClick={() => handlers.onReassign(wo)}>
            <UserRoundCog className="mr-2 size-4" /> Reassign
          </DropdownMenuItem>
        )}
        {canSkipOrCancel(wo) && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handlers.onSkip(wo)}>
              <SkipForward className="mr-2 size-4" /> Skip
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handlers.onCancel(wo)}>
              <XCircle className="mr-2 size-4" /> Cancel
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
