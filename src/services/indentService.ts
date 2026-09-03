import { apiClient, storeApi } from '@/lib/apiClient';
import { hasNoFirmAccess, normalizeFirmAccess } from '@/lib/firmAccess';
import { uploadFile } from '@/lib/fetchers';

/**
 * Indent Service
 * Handles all REST API operations for Indents via master-backend
 */

// ==================== INTERFACES ====================

export interface IndentRecord {
    id: number;
    indent_number: string;
    indenter_name: string;
    product_name: string;
    quantity: number;
    uom: string;
    attachment: string;
    specifications: string;
    area_of_use: string;
    vendor_type: string;
    indent_status: string;
    indent_type: string;
    no_day: number;
    planned1: string;
    actual1: string;
    firm_name: string;
    firm_id?: number;
    firmName: string;
    firmNameMatch: string;
    approved_quantity: number;
    timestamp: string;
    price: number;
    total_rate: number;
    // Approval fields
    indent_approved_by: string;
    approved_date: string;
    // Stage 2 fields
    planned2: string;
    actual2: string;
    vendor_name: string;
    negotiated_rate: number;
    // Stage 3 fields
    planned3: string;
    actual3: string;
    attachment3: string;
    comparative_analysis: string;
    // Stage 4 fields
    planned4: string;
    actual4: string;
    po_number: string;
    po_date: string;
    po_copy: string;
    // Stage 5 fields
    planned5: string;
    actual5: string;
    transportation_include: string;
    tax_extra: string;
    credit_days: number;
    remarks5: string;
    status: string;
    lifting_status?: string;
    po_qty?: number;
    received_quantity?: number;
    pending_qty?: number;
    approved_vendor_name?: string;
    pending_po_qty?: number | null;
    pending_lift_qty?: number | null;
    po_requred?: string;
    vendor1_rank?: string;
    vendor2_rank?: string;
    vendor3_rank?: string;
    indent_url?: string;
    expected_req_date?: string;
    group_head?: string;
    min_stock_qty?: number;
    approved_rate?: string | number;
    approvedRate?: number;
    rate?: number;
    rate1?: number;
    rate2?: number;
    rate3?: number;
    vendor_rate?: number;
}

// ==================== UPLOAD FUNCTIONS ====================

/**
 * Uploads a product attachment for an indent directly to S3.
 * Matches the (file, id, onProgress?) => Promise<string> shape useAttachmentUpload
 * expects — the second param is unused, kept only for call-site consistency
 * with the rest of the app's upload functions.
 */
export async function uploadIndentAttachment(
    file: File,
    _id: string,
    onProgress?: (percent: number) => void
): Promise<string> {
    return await uploadFile({
        file,
        folderId: 'store-and-inventory/create-indent',
        subFolder: 'indent-attachments',
        onProgress,
    });
}

// ==================== FETCH FUNCTIONS ====================

/**
 * Fetch all indent records from REST API
 * @param permittedFirms Optional array of firm names/IDs to filter by
 */
export async function fetchIndentRecords(
    permittedFirms?: string[],
    options?: { cursor?: string; limit?: number }
): Promise<IndentRecord[]> {
    try {
        if (hasNoFirmAccess(permittedFirms)) return [];
        const firms = normalizeFirmAccess(permittedFirms);

        const params: Record<string, any> = {
            order: 'indent_number.desc',
            limit: 'all',
        };

        if (options?.cursor) params['cursor'] = options.cursor;
        if (options?.limit) params['limit'] = options.limit;

        if (firms) {
            const ids = firms.filter(f => /^\d+$/.test(f)).map(Number);
            const names = firms.filter(f => !/^\d+$/.test(f));
            if (ids.length > 0) {
                params['in__firm_id'] = ids.join(',');
            } else if (names.length > 0) {
                params['in__firm_name'] = names.join(',');
            }
        }

        const res: any = await apiClient.get('/store/entity/indent', { params });
        const records = res.data || [];

        return records.map((r: any) => ({
            id: r.id,
            indent_number: r.indent_number || '',
            indenter_name: r.indenter_name || '',
            product_name: r.product_name || '',
            quantity: Number(r.quantity) || 0,
            uom: r.uom || '',
            attachment: r.attachment || '',
            specifications: r.specifications || '',
            area_of_use: r.area_of_use || '',
            vendor_type: r.vendor_type || 'Pending',
            indent_status: r.indent_status || '',
            indent_type: r.indent_type || '',
            no_day: Number(r.no_day) || 0,
            planned1: r.planned1 || '',
            actual1: r.actual1 || '',
            firm_name: r.firm_name || '',
            firm_id: r.firm_id,
            firmName: r.firm_name || '',
            firmNameMatch: r.firm_name || '',
            approved_quantity: Number(r.approved_quantity) || 0,
            timestamp: r.timestamp || '',
            price: Number(r.price) || 0,
            total_rate: Number(r.total_rate) || 0,
            indent_approved_by: r.indent_approved_by || '',
            approved_date: r.approved_date || '',
            planned2: r.planned2 || '',
            actual2: r.actual2 || '',
            vendor_name: r.vendor_name || '',
            negotiated_rate: Number(r.negotiated_rate) || 0,
            planned3: r.planned3 || '',
            actual3: r.actual3 || '',
            attachment3: r.attachment3 || '',
            comparative_analysis: r.comparative_analysis || '',
            planned4: r.planned4 || '',
            actual4: r.actual4 || '',
            po_number: r.po_number || '',
            po_date: r.po_date || '',
            po_copy: r.po_copy || '',
            planned5: r.planned5 || '',
            actual5: r.actual5 || '',
            transportation_include: r.transportation_include || '',
            tax_extra: r.tax_extra || '',
            credit_days: Number(r.credit_days) || 0,
            remarks5: r.remarks5 || '',
            status: r.status || '',
            lifting_status: r.lifting_status || '',
            po_qty: Number(r.po_qty) || 0,
            received_quantity: Number(r.received_qty) || 0,
            pending_qty: Number(r.pending_qty) || 0,
            approved_vendor_name: r.approved_vendor_name || '',
            pending_po_qty: r.pending_po_qty != null && r.pending_po_qty !== '' ? Number(r.pending_po_qty) : null,
            pending_lift_qty: r.pending_lift_qty != null && r.pending_lift_qty !== '' ? Number(r.pending_lift_qty) : null,
            po_requred: r.po_requred || '',
            vendor1_rank: r.vendor1_rank || '',
            vendor2_rank: r.vendor2_rank || '',
            vendor3_rank: r.vendor3_rank || '',
            indent_url: r.indent_url || '',
            expected_req_date: r.expected_req_date || '',
            group_head: r.group_head || '',
            min_stock_qty: Number(r.min_stock_qty) || 0,
            approved_rate: r.approved_rate || '',
            approvedRate: Number(r.approved_rate) || 0,
            rate: Number(r.approved_rate) || Number(r.rate1) || Number(r.vendor_rate) || Number(r.negotiated_rate) || Number(r.price) || 0,
            rate1: Number(r.rate1) || 0,
            rate2: Number(r.rate2) || 0,
            rate3: Number(r.rate3) || 0,
            vendor_rate: Number(r.vendor_rate) || 0,
        }));
    } catch (error) {
        console.error('Error fetching indent records:', error);
        throw error;
    }
}

// ==================== UPDATE FUNCTIONS ====================

/**
 * Update indent record for Stage 1: Approval
 */
export async function updateIndentApproval(
    id: number,
    updateData: {
        actual1: string;
        vendor_type: string;
        approved_quantity: number;
        planned2?: string | null;
        status?: string;
        indent_url?: string;
    }
) {
    try {
        await apiClient.patch(`/store/entity/indent/${id}`, {
            actual1: updateData.actual1,
            vendor_type: updateData.vendor_type,
            approved_quantity: updateData.approved_quantity,
            planned2: updateData.planned2,
            status: updateData.status,
            indent_url: updateData.indent_url,
        });
        return true;
    } catch (error) {
        console.error('Error updating indent approval:', error);
        throw error;
    }
}

/**
 * Update indent specifications
 */
export async function updateIndentSpecifications(id: number, specifications: string) {
    try {
        await apiClient.patch(`/store/entity/indent/${id}`, { specifications });
        return true;
    } catch (error) {
        console.error('Error updating indent specifications:', error);
        throw error;
    }
}

/**
 * Update indent fields from history edit
 */
export async function updateIndentHistoryFields(
    id: number,
    updateData: {
        approved_quantity?: number;
        uom?: string;
        vendor_type?: string;
    }
) {
    try {
        await apiClient.patch(`/store/entity/indent/${id}`, updateData);
        return true;
    } catch (error) {
        console.error('Error updating indent history fields:', error);
        throw error;
    }
}

/**
 * Update indent for Stage 2: Vendor Selection
 */
export async function updateIndentVendorSelection(
    indentNumber: string,
    updateData: {
        actual2: string;
        vendor_name: string;
        negotiated_rate: number;
        planned3: string;
    }
) {
    try {
        await storeApi.updateWhere('indent', { indent_number: indentNumber }, {
            actual2: updateData.actual2,
            vendor_name: updateData.vendor_name,
            negotiated_rate: updateData.negotiated_rate,
            planned3: updateData.planned3,
        });
        return true;
    } catch (error) {
        console.error('Error updating indent vendor selection:', error);
        throw error;
    }
}

/**
 * Update indent for Stage 3: HOD Approval (Comparative Analysis)
 */
export async function updateIndentHODApproval(
    indentNumber: string,
    updateData: {
        actual3: string;
        comparative_analysis: string;
        attachment3: string;
        planned4: string;
    }
) {
    try {
        await storeApi.updateWhere('indent', { indent_number: indentNumber }, {
            actual3: updateData.actual3,
            comparative_analysis: updateData.comparative_analysis,
            attachment3: updateData.attachment3,
            planned4: updateData.planned4,
        });
        return true;
    } catch (error) {
        console.error('Error updating indent HOD approval:', error);
        throw error;
    }
}

/**
 * Update indent for Stage 4: PO Creation
 */
export async function updateIndentPOCreation(
    indentNumber: string,
    updateData: {
        actual4: string;
        po_number: string;
        po_date: string;
        po_copy: string;
        planned5: string;
    }
) {
    try {
        await storeApi.updateWhere('indent', { indent_number: indentNumber }, {
            actual4: updateData.actual4,
            po_number: updateData.po_number,
            po_date: updateData.po_date,
            po_copy: updateData.po_copy,
            planned5: updateData.planned5,
        });
        return true;
    } catch (error) {
        console.error('Error updating indent PO creation:', error);
        throw error;
    }
}

/**
 * Update indent for Stage 5: Payment Terms (Final Stage)
 */
export async function updateIndentPaymentTerms(
    indentNumber: string,
    updateData: {
        actual5: string;
        transportation_include: string;
        tax_extra: string;
        credit_days: number;
        remarks5: string;
    }
) {
    try {
        await storeApi.updateWhere('indent', { indent_number: indentNumber }, {
            actual5: updateData.actual5,
            transportation_include: updateData.transportation_include,
            tax_extra: updateData.tax_extra,
            credit_days: updateData.credit_days,
            remarks5: updateData.remarks5,
        });
        return true;
    } catch (error) {
        console.error('Error updating indent payment terms:', error);
        throw error;
    }
}

/**
 * Update indent for Store Out Approval
 */
export async function updateIndentStoreOutApproval(
    indentNumber: string,
    updateData: {
        approved_by: string;
        approved_date: string;
        approved_quantity: number;
        status: string;
    }
) {
    try {
        await storeApi.updateWhere('indent', { indent_number: indentNumber }, {
            indent_approved_by: updateData.approved_by,
            approved_date: updateData.approved_date,
            approved_quantity: updateData.approved_quantity,
            indent_status: updateData.status,
        });
        return true;
    } catch (error) {
        console.error('Error updating Store Out Approval:', error);
        throw error;
    }
}

// ==================== STAGE DELETION & RESET FUNCTIONS ====================

/**
 * Permanently delete an indent record by ID
 */
export async function deleteIndentRecord(id: number) {
    try {
        await apiClient.delete(`/store/indents/${id}`);
        return true;
    } catch (error) {
        console.error('Error deleting indent record:', error);
        throw error;
    }
}

/**
 * Reset a specific stage and cascade reset all downstream stages
 */
export async function resetIndentStage(
    id: number,
    stage: 'approval' | 'vendor_rate' | 'technical_approval' | 'management_approval'
) {
    try {
        await apiClient.post(`/store/indents/${id}/reset-stage`, { stage });
        return true;
    } catch (error) {
        console.error(`Error resetting indent stage '${stage}':`, error);
        throw error;
    }
}

