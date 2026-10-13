import { apiClient, storeApi } from '@/lib/apiClient';
import { filterByFirmAccess, hasNoFirmAccess, normalizeFirmAccess } from '@/lib/firmAccess';

/**
 * Issue Service
 * Handles all REST API operations for the Issue component via master-backend
 */

// ==================== INTERFACES ====================

export interface IssueRecord {
    id?: number;
    issue_no: string;
    issue_to: string;
    uom: string;
    product_name: string;
    quantity: number;
    group_head: string;
    planned1: string;
    actual1: string;
    status: string;
    given_qty: number;
    timestamp?: string;
    location?: string;
    constructor_name?: string;
    site_location?: string;
    rejected_damage_qty?: string;
    damage_remark?: string;
    return_person_name?: string;
    issue_person_name?: string;
    issue_slip?: string;
    return_slip?: string;
    firmNameMatch?: string;
    firm_name?: string;
    firm_id?: number;
    // store_issue_kind_v1
    issue_kind?: 'MATERIAL' | 'MAINTENANCE' | 'ASSET_DIESEL';
    machine_id?: string;
    work_order_id?: string;
    requirement_id?: string; // the part line of the work order a maintenance issue is against
    meter_reading?: number;
    machine_name?: string;
    work_order_code?: string; // the repair work order a maintenance issue is for
    work_order_title?: string;
    work_order_status?: string;
    work_order_repair_parts?: Array<{ partName: string; quantity: number }>;
    work_order?: {
        workOrderCode?: string;
        title?: string;
        status?: string;
        repairParts?: Array<{ partName: string; quantity: number }>;
    };
    machine_unit?: 'KM' | 'HOURS' | 'NONE';
}

// ==================== FETCH FUNCTIONS ====================

/**
 * Fetch all issue records from REST API
 * @param permittedFirms Optional array of firm names/IDs to filter by
 */
export async function fetchIssueRecords(permittedFirms?: string[]): Promise<IssueRecord[]> {
    try {
        if (hasNoFirmAccess(permittedFirms)) return [];

        const params: Record<string, any> = {
            order: 'issue_no.desc',
            limit: 'all',
        };

        const res: any = await apiClient.get('/store/entity/issue', { params });
        const records = res.data || [];

        const mapped: IssueRecord[] = records.map((r: any) => ({
            id: r.id,
            issue_no: r.issue_no || '',
            issue_to: r.issue_to || '',
            uom: r.uom || '',
            product_name: r.product_name || '',
            quantity: Number(r.quantity) || 0,
            group_head: r.group_head || '',
            planned1: r.planned1 || '',
            actual1: r.actual1 || '',
            status: r.status || '',
            given_qty: Number(r.given_qty) || 0,
            timestamp: r.timestamp || '',
            location: r.location || '',
            constructor_name: r.constructor_name || '',
            site_location: r.site_location || '',
            firm_name: r.firm_name || '',
            firm_id: r.firm_id ? Number(r.firm_id) : undefined,
            rejected_damage_qty: r.rejected_damage_qty || '',
            damage_remark: r.damage_remark || '',
            return_person_name: r.return_person_name || '',
            issue_person_name: r.issue_person_name || '',
            issue_slip: r.issue_slip || '',
            return_slip: r.return_slip || '',
            firmNameMatch: r.firm_name || '',
            issue_kind: r.issue_kind || 'MATERIAL',
            machine_id: r.machine_id || undefined,
            work_order_id: r.work_order_id || undefined,
            meter_reading: r.meter_reading !== null && r.meter_reading !== undefined ? Number(r.meter_reading) : undefined,
            machine_name: r.machine?.name || undefined,
            work_order_code: r.work_order?.workOrderCode || undefined,
            work_order_title: r.work_order?.title || undefined,
            work_order_status: r.work_order?.status || undefined,
            machine_unit: r.machine?.readingUnit || undefined,
        }));

        return filterByFirmAccess(mapped, permittedFirms, {
            id: (row) => row.firm_id,
            name: (row) => row.firm_name,
        });
    } catch (error) {
        console.error('Error fetching issue records:', error);
        throw error;
    }
}

// ==================== UPDATE FUNCTIONS ====================

/**
 * @deprecated Not called any more: the server keeps inventory totals in step (stock.service.ts). Calling it after an approval
 * double counts. Kept only so old imports do not break.
 * Update inventory record out_quantity and current stock when a store issue is approved.
 */
export async function updateInventoryOnIssue(
    productName: string,
    firmId: number | null | undefined,
    firmName: string | null | undefined,
    givenQty: number,
    previousGivenQty: number = 0
) {
    try {
        const delta = givenQty - previousGivenQty;
        if (delta === 0 || !productName) return;

        const params: Record<string, any> = {
            item_name: productName.trim(),
        };
        if (firmId) {
            params.firm_id = firmId;
        } else if (firmName && firmName.trim()) {
            params.firm_name = firmName.trim();
        }

        const records = await storeApi.fetch('inventory', params);

        if (records && records.length > 0) {
            const inv = records[0];
            const currentOut = Number(inv.out_quantity) || 0;
            const currentStock = Number(inv.current) || 0;
            const newOut = currentOut + delta;
            const newStock = Math.max(0, currentStock - delta);
            const colorCode = newStock <= 0 ? 'red' : (newStock < 5 ? 'red' : 'green');

            await storeApi.update('inventory', inv.id, {
                out_quantity: String(newOut),
                current: String(newStock),
                color_code: colorCode,
            });
        }
    } catch (err) {
        console.error('Error updating inventory on issue:', err);
    }
}

/**
 * Update issue record with approval details
 * @param issue_no - Issue number to identify the record
 *        updateData - Data to update
 */
export async function updateIssueApproval(
    issue_no: string,
    updateData: {
        actual1: string;
        status: string;
        given_qty?: number | null;
        issue_slip?: string;
        product_name?: string;
        firm_id?: number | null;
        firm_name?: string;
        previous_given_qty?: number;
    }
) {
    try {
        const payload: Record<string, any> = {
            actual1: updateData.actual1,
            status: updateData.status,
            given_qty: updateData.given_qty,
        };
        if (updateData.issue_slip !== undefined) {
            payload.issue_slip = updateData.issue_slip;
        }
        // The server re-syncs the stock of the item (out_quantity, current, colour) on this bulk update (P0.4), so the old
        // client-side inventory patch is gone: running it too would count the issue twice.
        await storeApi.updateWhere('issue', { issue_no }, payload);

        return true;
    } catch (error) {
        console.error('Error updating issue approval:', error);
        throw error;
    }
}

/**
 * Update planned date of an issue record
 */
export async function updateIssuePlannedDate(id: number, plannedDate: string) {
    try {
        await apiClient.patch(`/store/entity/issue/${id}`, { planned1: plannedDate });
        return true;
    } catch (error) {
        console.error(`Error updating planned date for issue ID ${id}:`, error);
        throw error;
    }
}

/**
 * Update a specific issue record by ID
 */
export async function updateIssueRecordById(id: number, data: Partial<IssueRecord>) {
    try {
        await apiClient.patch(`/store/entity/issue/${id}`, data);
        return true;
    } catch (error) {
        console.error(`Error updating issue record with ID ${id}:`, error);
        throw error;
    }
}

/**
 * Create new issue records in master-backend
 * @param rows - Array of issue records to insert
 */
export async function createIssueRecords(rows: Partial<IssueRecord>[]) {
    try {
        const mappedRows = rows.map(r => ({
            timestamp: r.timestamp || r.planned1 || new Date().toISOString(),
            issue_no: r.issue_no,
            issue_to: r.issue_to,
            uom: r.uom,
            product_name: r.product_name,
            quantity: r.quantity,
            group_head: r.group_head,
            planned1: r.planned1,
            actual1: r.actual1,
            status: r.status || 'Pending',
            given_qty: r.given_qty !== undefined ? r.given_qty : 0,
            constructor_name: r.constructor_name || '',
            site_location: r.site_location || '',
            firm_name: r.firm_name || '',
            firm_id: r.firm_id,
            rejected_damage_qty: r.rejected_damage_qty || '',
            damage_remark: r.damage_remark || '',
            return_person_name: r.return_person_name || '',
            issue_person_name: r.issue_person_name || '',
            issue_slip: r.issue_slip || '',
            return_slip: r.return_slip || '',
            // store_issue_kind_v1: omitted for a material issue (the server defaults it)
            ...(r.issue_kind && r.issue_kind !== 'MATERIAL' ? { issue_kind: r.issue_kind, machine_id: r.machine_id, work_order_id: r.work_order_id, requirement_id: r.requirement_id, meter_reading: r.meter_reading } : {}),
        }));

        const res: any = await apiClient.post('/store/entity/issue', mappedRows);
        return res.data;
    } catch (error) {
        console.error('Error creating issue records:', error);
        throw error;
    }
}

/**
 * Reset/Delete Store Data Issue Approval Stage:
 * Reverts an approved or rejected issue record back to Pending status
 * and resynchronizes inventory stock aggregations.
 * @param id The ID of the issue record
 */
export async function resetIssueStage(id: number): Promise<boolean> {
    try {
        await apiClient.post(`/store/stage-reset/issue/${id}`);
        return true;
    } catch (error) {
        console.error(`Error resetting issue stage for ID ${id}:`, error);
        throw error;
    }
}

