// HR Leave Management Types

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  leaveType?: string;
  fromDate: string;
  toDate: string;
  days: number;
  leaveDays?: Array<{
    date: string;
    type: 'full' | 'half';
    half?: 'first' | 'second';
    decision?: 'approved' | 'rejected';
  }>;
  reason: string;
  status: 'pending' | 'approved' | 'partial' | 'rejected' | 'cancelled';
  appliedDate: string;
  submittedBy?: string;
  approvedBy?: string;
  approvedDate?: string;
  remarks?: string;
  createdAt?: string;
  tatPlannedAt?: string | null;
  tatDelayMinutes?: number | null;
  processedAt?: string | null;
  processedById?: string | null;
  processedBy?: { id: string; name: string | null } | null;
  yourProjectedPlannedAt?: string | null;
  // Checklist & Delegation task-transfer outcome — only present in the
  // response right after an approval (PATCH /status), not on plain reads.
  taskTransfer?: TaskTransferOutcome | null;
  // Only present for a multi-company identity user (see UserIdentity) —
  // absent for every individual company and every single-company session.
  tenant?: { id: string; name: string };
}

export interface AffectedItem {
  targetType: 'task' | 'occurrence';
  // For targetType "task" (ONE_TIME only): the task id. For "occurrence":
  // the occurrence's own id — one item per scheduled date, so two dates of
  // the same recurring task can go to two different people.
  id: string;
  // The underlying CdTask id either way — used to group multiple per-date
  // "occurrence" items back together under one task heading in the UI.
  taskId: string;
  title: string;
  frequency?: string;
  // Set for "occurrence" items — the specific date this decision covers.
  scheduledDate?: string;
}

// Preview of what approving this leave would affect — fetched BEFORE approval
// so the reviewer can resolve every item; approval is blocked until they do.
export type TaskImpact =
  | { status: 'not_linked' }
  | { status: 'not_needed' }
  | {
      status: 'needs_decision';
      items: AffectedItem[];
      defaultBackupId: string | null;
      backupOnLeave: boolean;
    };

export type TaskTransferDecision =
  | { targetType: 'task' | 'occurrence'; targetId: string; action: 'skip' }
  | {
      targetType: 'task' | 'occurrence';
      targetId: string;
      action: 'transfer';
      delegateeId: string;
    }
  // ONE_TIME tasks can't be transferred — only their due date can be pushed out.
  | { targetType: 'task'; targetId: string; action: 'extend'; newDate: string };

// Result stamped onto the leave record's response right after a PATCH /status
// approval — either the impact was resolved via taskDecisions, or there was
// nothing to resolve in the first place.
export type TaskTransferOutcome =
  | { status: 'not_linked' }
  | { status: 'not_needed' }
  | { status: 'resolved'; transferred: number; skipped: number; extended: number };

export interface LeaveBalance {
  employeeId: string;
  sick: number;
  annual: number;
  casual: number;
  total: number;
  used: number;
  remaining: number;
}
