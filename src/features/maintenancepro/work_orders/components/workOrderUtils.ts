import { toast } from 'sonner';
import type { OutsourceStage, WorkOrderKind, WorkOrderRow } from '../server/api/workOrdersApi';

export type TabKey = 'all' | 'scheduled' | 'breakdown' | 'repair' | 'outsourced';

export const TAB_TYPE: Partial<Record<TabKey, WorkOrderKind>> = {
  scheduled: 'SCHEDULED',
  breakdown: 'BREAKDOWN',
  repair: 'REPAIR',
};

export const STAGES: { value: OutsourceStage; label: string }[] = [
  { value: 'TO_SEND', label: 'To send' },
  { value: 'SENT', label: 'Sent' },
  { value: 'RECEIVED', label: 'Received' },
  { value: 'PAID', label: 'Paid' },
];

export const TYPE_LABEL: Record<string, string> = {
  SCHEDULED: 'Maintenance',
  BREAKDOWN: 'Breakdown',
  REPAIR: 'Repair',
  ONE_TIME: 'One-time',
};

const OPEN_STATUSES = ['PENDING', 'IN_PROGRESS', 'OVERDUE', 'ON_LEAVE'];

export const isOpen = (wo: WorkOrderRow) => OPEN_STATUSES.includes(wo.status);

export const isOverdue = (wo: WorkOrderRow) =>
  wo.status === 'OVERDUE' || (isOpen(wo) && !!wo.actualDueDate && new Date(wo.actualDueDate).getTime() < Date.now());

export const canProcessRepair = (wo: WorkOrderRow) =>
  (wo.type === 'REPAIR' || wo.type === 'BREAKDOWN') && isOpen(wo) && !wo.outsource;

export const canMarkDone = (wo: WorkOrderRow) => isOpen(wo) && !wo.outsource;

export const canSkipOrCancel = (wo: WorkOrderRow) => isOpen(wo) || wo.status === 'ON_HOLD';

export const nextStage = (wo: WorkOrderRow): 'send' | 'receive' | 'pay' | null => {
  switch (wo.outsource?.status) {
    case 'TO_SEND':
      return 'send';
    case 'SENT':
      return 'receive';
    case 'RECEIVED':
      return 'pay';
    default:
      return null;
  }
};

export const fmtDateTime = (d?: string | null) =>
  d
    ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '-';

export const fmtMoney = (n?: number | null) => (n === null || n === undefined ? '-' : `Rs ${n.toLocaleString('en-IN')}`);

export const todayStr = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** Toast the server's message (response.data.message) or a fallback. */
export function toastError(e: unknown, fallback: string) {
  const err = e as { response?: { data?: { message?: string } }; message?: string };
  toast.error(err?.response?.data?.message || err?.message || fallback);
}

/** An in-house repair that needs Store parts and cannot be completed until parts are issued.
 * Partial issued parts are allowed; unused parts can be returned to inventory via Store Issue Return.
 */
export const isWaitingForParts = (wo: WorkOrderRow) => {
  if (wo.materialRequired !== true || wo.outsource || !(wo.type === 'REPAIR' || wo.type === 'BREAKDOWN') || !(isOpen(wo) || wo.status === 'ON_HOLD')) return false;
  if (!wo.parts || wo.parts.total === 0) return true;
  const anyIssued = wo.parts.lines?.some((l) => l.issued > 0);
  return !anyIssued;
};

/** The reason "Mark done" / "Complete" is not available yet, or null. */
export const partsBlockReason = (wo: WorkOrderRow): string | null => {
  if (wo.materialRequired !== true || wo.outsource || !(wo.type === 'REPAIR' || wo.type === 'BREAKDOWN') || !(isOpen(wo) || wo.status === 'ON_HOLD')) return null;
  const p = wo.parts;
  if (!p || p.total === 0) return 'List the parts this repair needs first';
  const anyIssued = p.lines?.some((l) => l.issued > 0);
  if (!anyIssued) return 'No parts have been issued by the Store yet';
  return null;
};

/** A scheduled service work order cannot be marked done until all checklist items are completed (Done or Issue). */
export const checklistBlockReason = (wo: WorkOrderRow): string | null => {
  if (wo.type !== 'SCHEDULED' || !wo.checklistItems || wo.checklistItems.length === 0) return null;
  const pending = wo.checklistItems.filter((i) => i.state === 'PENDING' || (!i.state && !i.done));
  if (pending.length === 0) return null;
  return `${pending.length} of ${wo.checklistItems.length} checklist item${pending.length > 1 ? 's' : ''} not completed yet`;
};

/** Combined block reason for Mark done (parts issued for repair + checklist completed for scheduled) */
export const markDoneBlockReason = (wo: WorkOrderRow): string | null => {
  return partsBlockReason(wo) || checklistBlockReason(wo);
};

