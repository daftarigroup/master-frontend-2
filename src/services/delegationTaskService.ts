import { checklistApiClient } from '@/lib/checklistApiClient';
import type { ChecklistTaskStatus } from './checklistTaskService';

/**
 * Delegation Task Service
 *
 * Wraps the new `/checklist/delegation-task` backend routes for one-time
 * tasks. Snake_case on the wire, mirrored as-is in the UI shape.
 */

export interface DelegationTaskRow {
    task_id: number;
    firm_id: number | null;
    firm_name: string | null;
    doer_id: number | null;
    doer_name: string | null;
    given_by_id: number | null;
    given_by_name: string | null;
    task_description: string | null;
    require_attachment: boolean | null;
    duration: string | null;
    task_start_date: string;
    planned_date: string | null;
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
    updated_at: string | null;
}

export interface DelegationDoneRow {
    id: number;
    task_id: number | null;
    status: ChecklistTaskStatus | null;
    next_extend_date: string | null;
    reason: string | null;
    image_url: string | null;
    audio_url: string | null;
    duration: string | null;
    admin_done: boolean | null;
    admin_approved_by: number | null;
    admin_approval_date: string | null;
    created_at: string;
}

export interface DelegationTaskFilters {
    status?: ChecklistTaskStatus;
    firm_id?: number;
}

export async function fetchDelegationTasks(filters: DelegationTaskFilters = {}): Promise<DelegationTaskRow[]> {
    const res: any = await checklistApiClient.get('/delegation-task', { params: filters });
    return res.data || [];
}

export async function fetchDelegationTaskById(id: number | string): Promise<DelegationTaskRow> {
    const res: any = await checklistApiClient.get(`/delegation-task/${id}`);
    return res.data;
}

export type DelegationSubmitPayload =
    | { status: 'done'; image?: string | null; audio_url?: string | null; remark?: string | null }
    | { status: 'extend'; next_extend_date: string; reason: string };

export async function submitDelegationTask(id: number | string, payload: DelegationSubmitPayload) {
    const res: any = await checklistApiClient.patch(`/delegation-task/${id}/submit`, payload);
    return res.data;
}

export async function approveDelegationTask(id: number | string) {
    const res: any = await checklistApiClient.patch(`/delegation-task/${id}/approve`, {});
    return res.data;
}

export async function approveDelegationExtension(id: number | string) {
    const res: any = await checklistApiClient.patch(`/delegation-task/${id}/approve-extension`, {});
    return res.data;
}

export async function rejectDelegationTask(id: number | string, remark?: string) {
    const res: any = await checklistApiClient.patch(`/delegation-task/${id}/reject`, { remark });
    return res.data;
}

export async function fetchDelegationTaskHistory(id: number | string): Promise<DelegationDoneRow[]> {
    const res: any = await checklistApiClient.get(`/delegation-task/${id}/history`);
    return res.data || [];
}

export async function updateDelegationTask(id: number | string, payload: any) {
    const res: any = await checklistApiClient.patch(`/delegation-task/${id}`, payload);
    return res.data;
}

export async function deleteDelegationTask(id: number | string) {
    const res: any = await checklistApiClient.delete(`/delegation-task/${id}`);
    return res?.data ?? res;
}

export async function deleteDelegationTasksBatch(ids: (number | string)[]) {
    const res: any = await checklistApiClient.post('/delegation-task/delete-batch', { ids });
    return (res?.data ?? res) as { deletedCount: number };
}


