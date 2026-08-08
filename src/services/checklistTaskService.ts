import { checklistApiClient } from '@/lib/checklistApiClient';

/**
 * Checklist Task Service
 *
 * Wraps the new `/checklist/checklist-task` and `/checklist/tasks` backend
 * routes. Unlike the rest of the app's services (which camelCase-translate
 * generic-entity rows), these new endpoints are snake_case end-to-end on
 * the wire — so the "row" and "UI" shapes are intentionally identical here.
 */

export type ChecklistTaskStatus = 'pending' | 'done' | 'extend' | 'extended' | 'approved' | 'rejected';

export type ChecklistFrequency =
    | 'daily'
    | 'alternate-day'
    | 'weekly'
    | 'fortnight'
    | 'monthly'
    | 'quarterly'
    | 'half-yearly'
    | 'yearly'
    | 'end-of-1st-week'
    | 'end-of-2nd-week'
    | 'end-of-3rd-week'
    | 'end-of-4rth-week'
    | 'one-time';

export interface ChecklistTaskRow {
    task_id: number;
    firm_id: number | null;
    firm_name: string | null;
    doer_id: number | null;
    doer_name: string | null;
    given_by_id: number | null;
    given_by_name: string | null;
    task_description: string | null;
    frequency: string | null;
    enable_reminder: boolean | null;
    reminder_days_before: number | null;
    early_reminder_sent: boolean | null;
    require_attachment: boolean | null;
    duration: string | null;
    planned_date: string | null;
    task_start_date: string | null;
    submission_date: string | null;
    status: ChecklistTaskStatus | null;
    remark: string | null;
    image: string | null;
    audio_url: string | null;
    instruction_attachment_url: string | null;
    instruction_attachment_type: string | null;
    delay: string | null;
    admin_done: boolean | null;
    admin_approved_by: number | null;
    admin_approval_date: string | null;
    created_at: string;
}

export interface AssignTaskPayload {
    firm_id: number;
    firm_name: string;
    doer_id: number;
    doer_name: string;
    given_by_id?: number | null;
    given_by_name?: string | null;
    task_description: string;
    frequency: ChecklistFrequency;
    task_start_date: string;
    duration?: string | null;
    require_attachment?: boolean;
    enable_reminder?: boolean;
    reminder_days_before?: number | null;
    instruction_attachment_url?: string | null;
    instruction_attachment_type?: string | null;
    audio_url?: string | null;
    priority?: string | null;
    remark?: string | null;
}

export interface AssignTaskResult {
    type: 'delegation' | 'checklist';
    task?: any;
    count?: number;
    sample?: any;
}

/**
 * Unified assign-task endpoint used by both Quick Task and Assign Task
 * pages. `frequency === 'one-time'` is routed server-side to a single
 * Delegation task; any other frequency generates recurring Checklist rows.
 */
export async function assignTask(payload: AssignTaskPayload): Promise<AssignTaskResult> {
    const res: any = await checklistApiClient.post('/tasks', payload);
    return res.data;
}

export interface ChecklistTaskFilters {
    status?: ChecklistTaskStatus;
    firm_id?: number;
    from?: string;
    to?: string;
}

export async function fetchChecklistTasks(filters: ChecklistTaskFilters = {}): Promise<ChecklistTaskRow[]> {
    const res: any = await checklistApiClient.get('/checklist-task', { params: filters });
    return res.data || [];
}

export async function fetchChecklistTaskById(id: number | string): Promise<ChecklistTaskRow> {
    const res: any = await checklistApiClient.get(`/checklist-task/${id}`);
    return res.data;
}

export interface ChecklistSubmitPayload {
    image?: string | null;
    audio_url?: string | null;
    remark?: string | null;
}

export async function submitChecklistTask(id: number | string, payload: ChecklistSubmitPayload) {
    const res: any = await checklistApiClient.patch(`/checklist-task/${id}/submit`, payload);
    return res.data;
}

export async function approveChecklistTask(id: number | string) {
    const res: any = await checklistApiClient.patch(`/checklist-task/${id}/approve`, {});
    return res.data;
}

export async function rejectChecklistTask(id: number | string, remark?: string) {
    const res: any = await checklistApiClient.patch(`/checklist-task/${id}/reject`, { remark });
    return res.data;
}

export async function updateChecklistTask(id: number | string, payload: Partial<AssignTaskPayload>) {
    const res: any = await checklistApiClient.patch(`/checklist-task/${id}`, payload);
    return res.data;
}

/**
 * Bulk-update all checklist tasks in the same recurrence group.
 * The backend uses the anchor task's fingerprint (doer_id, firm_id,
 * task_description, frequency) to find all siblings and update them together.
 * Returns { updatedCount, anchorTaskId }.
 */
export async function updateChecklistTaskGroup(id: number | string, payload: Partial<AssignTaskPayload>) {
    const res: any = await checklistApiClient.patch(`/checklist-task/${id}/group`, payload);
    return (res?.data ?? res) as { updatedCount: number; anchorTaskId: number };
}

export async function deleteChecklistTaskGroup(id: number | string) {
    const res: any = await checklistApiClient.delete(`/checklist-task/${id}/group`);
    return (res?.data ?? res) as { deletedCount: number; anchorTaskId: number };
}

export async function deleteChecklistTaskGroupsBatch(anchorIds: (number | string)[]) {
    const res: any = await checklistApiClient.post('/checklist-task/delete-groups', { anchorIds });
    return (res?.data ?? res) as { deletedCount: number };
}


