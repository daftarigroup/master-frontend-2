import { storeApi, apiClient } from '@/lib/apiClient';
import { hasNoFirmAccess, normalizeFirmAccess } from '@/lib/firmAccess';
import { uploadFile } from '@/lib/fetchers';

/**
 * GetLift Service
 * Handles all Supabase operations for the GetLift component
 * Manages purchase lifting, bill status updates, and store-in records
 */

// ==================== INTERFACES ====================

export interface GetLiftIndentRecord {
    indentNumber: string;
    firmNameMatch: string;
    firm_id?: number;
    approvedVendorName: string;
    poNumber: string;
    actual4: string;
    poDate: string;
    deliveryDate: string;
    planned5: string;
    actual5: string;
    productName: string;
    totalQty: number;
    quantity: number;
    pendingQty: number;
    liftingStatus: string;
    cancelQty: number;
    approvedRate: string;
    taxValue: number;
    withTax: string;
    timestamp: string;
    expectedDate: string;
    // department?: string;
    areaOfUse?: string;
    approvedQuantity: number;
    receivedQuantity: number;
    uom: string;
}

export interface GetLiftStoreInRecord {
    id: number;
    liftNumber: string;
    indentNo: string;
    firmNameMatch: string;
    firm_id?: number;
    vendorName: string;
    productName: string;
    poNumber: string;
    receivedQuantity: number;
    qty: number;
    photoOfBill: string;
    timestamp: string;
    materialDate?: string | null;
}

export interface VendorOption {
    vendorName: string;
}

export interface StoreInInsertData {
    timestamp: string;
    liftNumber?: string;
    indentNo: string;
    billNo: string;
    vendorName: string;
    productName: string;
    qty: number;
    leadTimeToLiftMaterial?: number;
    discountAmount: number;
    typeOfBill: string;
    billAmount: number;
    paymentType: string;
    advanceAmountIfAny: number;
    photoOfBill: string;
    transportationInclude: string;
    transporterName: string;
    amount: number;
    billStatus: string;
    quantityAsPerBill: number;
    poDate: string;
    poNumber: string;
    vendor: string;
    indentNumber: string;
    product: string;
    quantity: number;
    vehicleNo: string;
    driverName: string;
    driverMobileNo: string;
    billRemark: string;
    receivedQuantity?: number;
    firmNameMatch: string;
    firm_id?: number | null;
    rate: string;
    // department?: string;
    areaOfUse?: string;
    approvedVendorName?: string;
    liftingStatus?: string;
    notBillReceivedNo?: string;
    challanNo?: string;
    challanImage?: string;
    uom?: string;
    materialDate?: string | null;
}

export function parseNumericQty(val: any): number {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const str = String(val).trim();
    const parsed = parseFloat(str);
    if (!isNaN(parsed)) return parsed;
    const match = str.match(/[-+]?\d*\.?\d+/);
    return match ? parseFloat(match[0]) : 0;
}

// ==================== FETCH FUNCTIONS ====================

/**
 * Fetch all indent records from REST API
 * Used for displaying pending and completed lift records
 */
export async function fetchIndentRecords(permittedFirms?: string[]) {
    try {
        if (hasNoFirmAccess(permittedFirms)) return [];
        const firms = normalizeFirmAccess(permittedFirms);

        const params: Record<string, any> = {
            order: 'indent_number.desc',
            limit: 'all',
        };

        if (firms) {
            const ids = firms.filter((firm) => /^\d+$/.test(firm)).map(Number);
            const names = firms.filter((firm) => !/^\d+$/.test(firm));
            if (ids.length > 0) {
                params['in__firm_id'] = ids.join(',');
            } else if (names.length > 0) {
                params['in__firm_name'] = names.join(',');
            } else {
                return [];
            }
        }

        const res: any = await apiClient.get('/store/entity/indent', { params });
        const data = res?.data || [];

        return data.map((r: any) => {
            const rawQuantity = parseNumericQty(r.quantity);
            const rawApproved = parseNumericQty(r.approved_quantity);
            const rawPending = parseNumericQty(r.pending_qty || r.pending_po_qty);
            const approvedQty = rawApproved > 0 ? rawApproved : (rawPending > 0 ? rawPending : rawQuantity);

            return {
                indentNumber: r.indent_number || '',
                firmNameMatch: r.firm_name,
                firm_id: r.firm_id,
                approvedVendorName: r.approved_vendor_name || '',
                poNumber: r.po_number || '',
                actual4: r.actual4 || '',
                poDate: r.actual4 || '',
                deliveryDate: r.delivery_date || '',
                planned5: r.planned5 || '',
                actual5: r.actual5 || '',
                productName: r.product_name || '',
                totalQty: parseNumericQty(r.total_qty),
                quantity: rawQuantity,
                pendingQty: rawPending,
                liftingStatus: r.lifting_status || '',
                cancelQty: parseNumericQty(r.cancel_qty),
                approvedRate: r.approved_rate || '',
                taxValue: parseNumericQty(r.tax_value4),
                withTax: r.with_tax_or_not4 || 'No',
                // department: r.department || '',
                areaOfUse: r.area_of_use || '',
                timestamp: r.timestamp || '',
                expectedDate: r.expected_req_date || '',
                approvedQuantity: approvedQty,
                receivedQuantity: 0,
                uom: r.uom || '',
            };
        });
    } catch (error) {
        console.error('Error fetching indent records:', error);
        throw error;
    }
}

/**
 * Fetch all store-in records from REST API
 * Used for calculating received quantities and history
 */
export async function fetchStoreInRecords(permittedFirms?: string[]) {
    try {
        if (hasNoFirmAccess(permittedFirms)) return [];
        const firms = normalizeFirmAccess(permittedFirms);

        const params: Record<string, any> = {
            order: 'timestamp.desc',
            limit: 'all',
        };

        if (firms) {
            const ids = firms.filter((firm) => /^\d+$/.test(firm)).map(Number);
            const names = firms.filter((firm) => !/^\d+$/.test(firm));
            if (ids.length > 0) {
                params['in__firm_id'] = ids.join(',');
            } else if (names.length > 0) {
                params['in__firm_name'] = names.join(',');
            } else {
                return [];
            }
        }

        const res: any = await apiClient.get('/store/entity/store_in', { params });
        const data = res?.data || [];

        return data.map((r: any) => ({
            id: r.id,
            liftNumber: r.lift_number || '',
            indentNo: r.indent_no || '',
            firmNameMatch: r.firm_name,
            firm_id: r.firm_id ?? null,
            vendorName: r.vendor_name || '',
            productName: r.product_name || '',
            poNumber: r.po_number || '',
            qty: Number(r.qty) || 0,
            receivedQuantity: Number(r.received_quantity) || 0,
            photoOfBill: r.photo_of_bill || '',
            timestamp: r.timestamp || '',
            materialDate: r.material_date || null,
        }));
    } catch (error) {
        console.error('Error fetching store-in records:', error);
        throw error;
    }
}

/**
 * Fetch vendor options from master table via REST API
 * Used for populating vendor dropdown
 */
export const fetchVendorOptions = async (): Promise<string[]> => {
    try {
        const res: any = await apiClient.get('/store/entity/vendors', {
            params: {
                not_null__vendor_name: true,
                order: 'vendor_name.asc',
                limit: 'all',
            },
        });
        const data = res?.data || [];

        // Filter out null/undefined/empty values and remove duplicates
        const vendorNames = data
            .map((item: any) => item.vendor_name?.trim())
            .filter((name: any): name is string => !!name && name.length > 0);

        return [...new Set(vendorNames)] as string[]; // Remove duplicates
    } catch (error) {
        console.error('Error fetching vendors:', error);
        throw error;
    }
};

// ==================== INSERT/UPDATE FUNCTIONS ====================

/**
 * Insert a new store-in record
 * @param storeInData - Store-in record data
 */
export async function insertStoreInRecord(storeInData: StoreInInsertData) {
    try {
        // 1. Fetch all lift_numbers and filter LN- prefix in JS (avoids .like() which is not supported)
        const allLifts = await storeApi.fetch('store_in', { _limit: 9999 });
        const lnLifts = (allLifts || []).filter((r: any) =>
            r.lift_number && String(r.lift_number).startsWith('LN-')
        );

        let liftNumber = 'LN-1';
        if (lnLifts.length > 0) {
            let maxNum = 0;
            lnLifts.forEach((record: any) => {
                const matches = String(record.lift_number).match(/LN-(\d+)/);
                if (matches && matches[1]) {
                    const num = parseInt(matches[1], 10);
                    if (num > maxNum) maxNum = num;
                }
            });
            liftNumber = `LN-${maxNum + 1}`;
        }

        const now = new Date().toISOString();

        // ✅ EXACT SCHEMA MAPPING BASED ON PROVIDED SQL
        const mappedData = {
            timestamp: storeInData.timestamp || now,
            lift_number: liftNumber,
            indent_no: storeInData.indentNo || null,
            po_number: storeInData.poNumber || null,
            vendor_name: storeInData.vendorName || null,
            product_name: storeInData.productName || null,
            bill_status: storeInData.billStatus || null,
            bill_no: storeInData.billNo || null,
            qty: String(storeInData.qty || '0'),
            lead_time_to_lift_material: null,
            type_of_bill: storeInData.typeOfBill || null,
            bill_amount: String(storeInData.billAmount || '0'),
            discount_amount: String(storeInData.discountAmount || '0'),
            payment_type: storeInData.paymentType || null,
            advance_amount_if_any: String(storeInData.advanceAmountIfAny || '0'),
            photo_of_bill: storeInData.photoOfBill || null,
            transportation_include: storeInData.transportationInclude || null,
            transporter_name: storeInData.transporterName || null,
            amount: String(storeInData.amount || '0'),
            vehicle_no: storeInData.vehicleNo || null,
            driver_name: storeInData.driverName || null,
            driver_mobile_no: storeInData.driverMobileNo || null,
            bill_remark: storeInData.billRemark || null,
            planned6: storeInData.timestamp || now,
            actual6: null,
            time_delay6: null,
            receiving_status: null,
            received_quantity: String(storeInData.receivedQuantity || '0'),
            photo_of_product: null,
            damage_order: null,
            quantity_as_per_bill: null,
            remark: null,
            planned7: null,
            actual7: null,
            time_delay7: null,
            status: null,
            bill_copy_attached: null,
            reason: null,
            send_debit_note: null,
            planned9: null,
            actual9: null,
            time_delay9: null,
            debit_note_copy: null,
            debit_note_number: null,
            firm_name: storeInData.firmNameMatch || null,
            firm_id: storeInData.firm_id ?? null,
            lifting_status: storeInData.liftingStatus || 'Pending',
            planned11: null,
            actual11: null,
            time_delay: null,
            bill_status_new: null,
            bill_image_status: null,
            indent_date: storeInData.indentNo ? now : null,
            indent_qty: String(storeInData.qty || '0'),
            purchase_date: now,
            material_date: storeInData.materialDate || null,
            party_name: storeInData.vendorName || null,
            location: null,
            area: storeInData.areaOfUse || null,
            not_bill_received_no: storeInData.notBillReceivedNo || null,
            indented_for: null,
            approved_party_name: storeInData.approvedVendorName || storeInData.vendorName || null,
            rate: String(storeInData.rate || '0'),
            total_rate: String(Number(storeInData.rate || 0) * Number(storeInData.qty || 0)),
            bill_received2: null,
            price_as_per_po_check: null,
            hod_status: 'Pending',
            hod_remark: null,
            hod_planned: null,
            hod_actual: null,
            challan_no: storeInData.challanNo || null,
            challan_image: storeInData.challanImage || null,
            receiver_name: null,
        };

        // Use storeApi.insert directly (no .like() needed)
        const inserted = await storeApi.insert('store_in', mappedData);
        return inserted;
    } catch (error) {
        console.error('Error inserting store-in record:', error);
        throw error;
    }
}

/**
 * Update actual5 timestamp for an indent
 * @param indentNumber - Indent number to update
 */
export async function updateActual5Timestamp(indentNumber: string, productName: string, firmId?: number | null) {
    try {
        const currentDateTime = new Date().toISOString();
        const where: Record<string, any> = { indent_number: indentNumber, product_name: productName };
        if (firmId != null) where.firm_id = firmId;

        await storeApi.updateWhere('indent', where, { actual5: currentDateTime });
        return true;
    } catch (error) {
        console.error('Error updating actual5 timestamp:', error);
        throw error;
    }
}

/**
 * Update cancel quantity for an indent
 * @param indentNumber - Indent number to update
 * @param cancelQty - Quantity to cancel
 */
export async function updateCancelQuantity(indentNumber: string, productName: string, cancelQty: number, firmId?: number | null) {
    try {
        const where: Record<string, any> = { indent_number: indentNumber, product_name: productName };
        if (firmId != null) where.firm_id = firmId;

        await storeApi.updateWhere('indent', where, { cancel_qty: cancelQty });
        return true;
    } catch (error) {
        console.error('Error updating cancel quantity:', error);
        throw error;
    }
}

export async function updateLiftingStatus(indentNumber: string, productName: string, status: string, firmId?: number | null) {
    try {
        const where: Record<string, any> = { indent_number: indentNumber, product_name: productName };
        if (firmId != null) where.firm_id = firmId;

        await storeApi.updateWhere('indent', where, { lifting_status: status });
        return true;
    } catch (error) {
        console.error('Error updating lifting status:', error);
        throw error;
    }
}

/**
 * Update pending lift quantity for an indent
 * @param indentNumber - Indent number to update
 * @param liftQty - Quantity currently being lifted
 */
export async function updatePendingLiftQty(indentNumber: string, productName: string, liftQty: number, firmId?: number | null) {
    try {
        const where: Record<string, any> = { indent_number: indentNumber, product_name: productName };
        if (firmId != null) where.firm_id = firmId;

        await storeApi.updateWhere('indent', where, { pending_lift_qty: liftQty.toString() });
        return true;
    } catch (error) {
        console.error('Error updating pending lift qty:', error);
        throw error;
    }
}

// ==================== FILE UPLOAD ====================

/**
 * Upload bill photo/document to Storage
 * @param file - File to upload
 * @param indentNumber - Indent number for file naming
 * @param onProgress - Optional 0-100 upload progress callback
 */
export async function uploadBillPhoto(file: File, _indentNumber: string, onProgress?: (percent: number) => void): Promise<string> {
    try {
        return await uploadFile({
            file,
            folderId: 'store-and-inventory/lifting',
            subFolder: 'payment-images',
            onProgress,
        });
    } catch (error) {
        console.error('Bill photo upload error:', error);
        throw error;
    }
}
