import { apiClient, storeApi } from '@/lib/apiClient';
import { hasNoFirmAccess, filterByFirmAccess, normalizeFirmAccess } from '@/lib/firmAccess';
import { uploadFile } from '@/lib/fetchers';

/**
 * StoreIn Service
 * Handles all REST API operations for the StoreIn component via master-backend
 */

// ==================== INTERFACES ====================

export interface StoreInRecord {
    id: number;
    liftNumber: string;
    indentNo: string;
    billNo: string;
    vendorName: string;
    productName: string;
    qty: number;
    typeOfBill: string;
    billAmount: number;
    paymentType: string;
    advanceAmountIfAny: number;
    photoOfBill: string;
    transportationInclude: string;
    transporterName: string;
    amount: number;
    planned6: string;
    actual6: string;
    receivingStatus: string;
    receivedQuantity: number;
    photoOfProduct: string;
    damageOrder: string;
    quantityAsPerBill: string;
    remark: string;
    location: string;
    poDate: string;
    poNumber: string;
    vendor: string;
    indentNumber: string;
    product: string;
    uom: string;
    poCopy: string;
    billStatus: string;
    leadTimeToLiftMaterial: number;
    discountAmount: number;
    firmNameMatch: string;
    timestamp: string;
    billNumber: string;
    unitOfMeasurement: string;
    priceAsPerPo: number;
    rate?: number;
    priceAsPerPoCheck: string;
    // Stage 7 fields
    planned7: string;
    actual7: string;
    status: string;
    billCopyAttached: string;
    reason: string;
    sendDebitNote: string;
    // Stage 8 fields
    planned8: string;
    actual8: string;
    // Stage 9 fields
    planned9: string;
    actual9: string;
    debitNoteCopy: string;
    debitNoteNumber: string;
    statusPurchaser: string;
    billCopy: string;
    returnCopy: string;
    // Stage 10 fields
    planned10: string;
    actual10: string;
    // Stage 11 fields
    planned11: string;
    actual11: string;
    billStatusNew: string;
    billImageStatus: string;
    vehicleNo: string;
    driverName: string;
    driverMobileNo: string;
    billRemark: string;
    // HOD Approval fields
    plannedHod: string;
    actualHod: string;
    hodStatus: string;
    hodRemark: string;
    paymentTerms: string;
    challanNo: string;
    challanImage: string;
    receiverName: string;
    firm_id?: number;
    materialDate?: string | null;
}

export interface LocationOption {
    location: string;
}

// ==================== FETCH FUNCTIONS ====================

/**
 * Fetch all store-in records from REST API
 * @param permittedFirms Optional array of firm IDs/names to filter by
 */
export async function fetchStoreInRecords(
    permittedFirms?: string[],
    options?: { cursor?: string; limit?: number }
): Promise<StoreInRecord[]> {
    try {
        if (hasNoFirmAccess(permittedFirms)) return [];

        const firms = normalizeFirmAccess(permittedFirms);
        const params: Record<string, any> = {
            order: 'indent_no.desc',
            limit: 'all',
        };

        if (options?.cursor) params['cursor'] = options.cursor;
        if (options?.limit) params['limit'] = options.limit;

        // Push firm filter to the server so the DB returns only the rows we need,
        // not the entire table. Client-side filterByFirmAccess below is a safety net.
        if (firms) {
            const ids = firms.filter(f => /^\d+$/.test(f)).map(Number);
            if (ids.length > 0) {
                params['in__firm_id'] = ids.join(',');
            }
        }

        const res: any = await apiClient.get('/store/entity/store_in', { params });
        const data = res.data || [];

        const mapped: StoreInRecord[] = data.map((r: any) => ({
            id: r.id,
            liftNumber: r.lift_number || '',
            indentNo: r.indent_no || '',
            billNo: r.bill_no || '',
            vendorName: r.vendor_name || '',
            productName: r.product_name || '',
            qty: Number(r.qty) || 0,
            typeOfBill: r.type_of_bill || '',
            billAmount: Number(r.bill_amount) || 0,
            paymentType: r.payment_type || '',
            advanceAmountIfAny: Number(r.advance_amount_if_any) || 0,
            photoOfBill: r.photo_of_bill || '',
            transportationInclude: r.transportation_include || '',
            transporterName: r.transporter_name || '',
            amount: Number(r.amount) || 0,
            planned6: r.planned6 || r.timestamp || '',
            actual6: r.actual6 || '',
            receivingStatus: r.receiving_status || '',
            receivedQuantity: Number(r.received_quantity) || 0,
            photoOfProduct: r.photo_of_product || '',
            damageOrder: r.damage_order || '',
            quantityAsPerBill: r.quantity_as_per_bill || '',
            remark: r.remark || '',
            location: r.location || '',
            poDate: r.po_date || '',
            poNumber: r.po_number || '',
            vendor: r.vendor || '',
            indentNumber: r.indent_number || '',
            product: r.product || '',
            uom: r.uom || '',
            poCopy: r.po_copy || '',
            billStatus: r.bill_status || '',
            leadTimeToLiftMaterial: Number(r.lead_time_to_lift_material) || 0,
            discountAmount: Number(r.discount_amount) || 0,
            firmNameMatch: r.firm_name_match || r.firm_name || '',
            timestamp: r.timestamp || '',
            billNumber: r.bill_number || '',
            unitOfMeasurement: r.unit_of_measurement || '',
            priceAsPerPo: Number(r.rate) || 0,
            rate: Number(r.rate) || 0,
            priceAsPerPoCheck: r.bill_received2 || '',
            vehicleNo: r.vehicle_no || '',
            driverName: r.driver_name || '',
            driverMobileNo: r.driver_mobile_no || '',
            billRemark: r.bill_remark || '',
            planned7: r.planned7 || '',
            actual7: r.actual7 || '',
            status: r.status || '',
            billCopyAttached: r.bill_copy_attached || '',
            reason: r.reason || '',
            sendDebitNote: r.send_debit_note || '',
            plannedHod: r.hod_planned || '',
            actualHod: r.hod_actual || '',
            hodStatus: r.hod_status || 'Pending',
            hodRemark: r.hod_remark || '',
            paymentTerms: r.payment_terms || '',
            planned8: r.planned8 || '',
            actual8: r.actual8 || '',
            planned9: r.planned9 || '',
            actual9: r.actual9 || '',
            debitNoteCopy: r.debit_note_copy || '',
            debitNoteNumber: r.debit_note_number || '',
            statusPurchaser: r.status_purchaser || '',
            billCopy: r.bill_copy || '',
            returnCopy: r.return_copy || '',
            planned10: r.planned10 || '',
            actual10: r.actual10 || '',
            planned11: r.planned11 || '',
            actual11: r.actual11 || '',
            billStatusNew: r.bill_status_new || '',
            billImageStatus: r.bill_image_status || '',
            challanNo: r.challan_no || '',
            challanImage: r.challan_image || '',
            receiverName: r.receiver_name || '',
            firm_id: r.firm_id,
            materialDate: r.material_date || null,
        }));

        return filterByFirmAccess(mapped, permittedFirms, {
            id: (row: any) => row.firm_id,
            name: (row: any) => row.firmNameMatch,
        });

    } catch (error) {
        console.error('Error fetching store-in records:', error);
        throw error;
    }
}

/**
 * Fetch all direct store-in records from the specialized table
 * @param permittedFirms Optional array of firm IDs to filter by
 */
export async function fetchDirectRecords(permittedFirms?: string[]) {
    try {
        if (hasNoFirmAccess(permittedFirms)) return [];

        const firms = normalizeFirmAccess(permittedFirms);
        const directParams: Record<string, any> = { limit: 'all' };
        if (firms) {
            const ids = firms.filter(f => /^\d+$/.test(f)).map(Number);
            if (ids.length > 0) directParams['in__firm_id'] = ids.join(',');
        }

        const res: any = await apiClient.get('/store/entity/store_in_direct', { params: directParams });
        const data = res.data || [];

        const mapped = data.map((r: any) => ({
            liftNumber: r.lift_number || '',
            indentNo: r.indent_no || '',
            billNo: r.bill_no || '',
            vendorName: r.vendor_name || '',
            productName: r.product_name || '',
            qty: Number(r.qty) || 0,
            billAmount: Number(r.bill_amount) || 0,
            photoOfBill: r.photo_of_bill || '',
            transportationInclude: r.transportation_include || '',
            transporterName: r.transporter_name || '',
            amount: Number(r.amount) || 0,
            actual6: r.actual6 || '',
            receivingStatus: r.receiving_status || '',
            receivedQuantity: Number(r.received_quantity) || 0,
            photoOfProduct: r.photo_of_product || '',
            timestamp: r.timestamp || '',
            receiverName: r.receiver_name || '',
            firmNameMatch: r.firm_name_match || '',
            vehicleNo: r.vehicle_no || '',
            hodStatus: r.hod_status || 'Pending',
            firm_id: r.firm_id,
        }));

        return filterByFirmAccess(mapped, permittedFirms, {
            id: (row: any) => row.firm_id,
            name: (row: any) => row.firmNameMatch,
        });

    } catch (error) {
        console.error('Error fetching direct records:', error);
        throw error;
    }
}

/**
 * Fetch location options from site location table
 */
export async function fetchLocationOptions(): Promise<string[]> {
    try {
        const res: any = await apiClient.get('/store/entity/site_location_details');
        const data = res.data || [];

        const locations = Array.from(new Set(
            data
                .map((r: any) => r.location)
                .filter(Boolean)
        )).sort();

        return locations as string[];
    } catch (error) {
        console.error('Error fetching location options:', error);
        return [];
    }
}

// ==================== UPDATE FUNCTIONS ====================

/**
 * Update store-in record with receiving details
 */
export async function updateStoreInReceiving(
    liftNumber: string,
    indentNo: string,
    productName: string,
    updateData: {
        actual6: string;
        receivingStatus: string;
        receivedQuantity: number;
        photoOfProduct: string;
        damageOrder: string;
        quantityAsPerBill: string;
        remark: string;
        location: string;
        priceAsPerPoCheck: string;
        challanNo?: string;
        challanImage?: string;
        receiverName?: string;
    }
) {
    try {
        await storeApi.updateWhere('store_in', {
            lift_number: liftNumber,
            indent_no: indentNo,
            product_name: productName,
        }, {
            actual6: updateData.actual6,
            receiving_status: updateData.receivingStatus,
            received_quantity: updateData.receivedQuantity,
            photo_of_product: updateData.photoOfProduct,
            damage_order: updateData.damageOrder,
            quantity_as_per_bill: updateData.quantityAsPerBill,
            remark: updateData.remark,
            location: updateData.location,
            price_as_per_po_check: updateData.priceAsPerPoCheck,
            challan_no: updateData.challanNo,
            challan_image: updateData.challanImage,
            receiver_name: updateData.receiverName,
            hod_planned: updateData.actual6,
            hod_status: 'Pending',
        });

        return true;
    } catch (error: any) {
        console.error('Error updating store-in record:', error);
        if (error.message) {
            import('sonner').then(({ toast }) => {
                toast.error(`Database Error: ${error.message}`);
            });
        }
        throw error;
    }
}

/**
 * Update store-in record for HOD Approval
 */
export async function updateStoreInHodApproval(
    liftNumber: string,
    indentNo: string,
    productName: string,
    updateData: {
        actualHod: string;
        hodStatus: string;
        hodRemark: string;
        triggerStage7: boolean;
    },
    id?: number
) {
    try {
        const payload: Record<string, any> = {
            hod_actual: updateData.actualHod,
            hod_status: updateData.hodStatus,
            hod_remark: updateData.hodRemark,
        };

        if (updateData.triggerStage7) {
            payload.planned7 = updateData.actualHod;
        }

        if (id) {
            await storeApi.update('store_in', id, payload);
        } else {
            await storeApi.updateWhere('store_in', {
                lift_number: liftNumber,
                indent_no: indentNo,
                product_name: productName,
            }, payload);
        }

        return true;
    } catch (error) {
        console.error('Error updating HOD approval:', error);
        throw error;
    }
}

/**
 * Update store-in record for Stage 7: Quantity Check In
 */
export async function updateStoreInQuantityCheck(
    liftNumber: string,
    indentNo: string,
    productName: string,
    updateData: {
        actual7: string;
        status: string;
        billCopyAttached: string;
        sendDebitNote: string;
        reason: string;
    }
) {
    try {
        const updateFields: any = {
            actual7: updateData.actual7,
            status: updateData.status,
            bill_copy_attached: updateData.billCopyAttached,
            send_debit_note: updateData.sendDebitNote,
            reason: updateData.reason,
        };

        if (updateData.sendDebitNote === 'Yes' && updateData.status === 'Accept') {
            updateFields.planned9 = updateData.actual7;
        }

        await storeApi.updateWhere('store_in', {
            lift_number: liftNumber,
            indent_no: indentNo,
            product_name: productName,
        }, updateFields);

        return true;
    } catch (error) {
        console.error('Error updating store-in quantity check:', error);
        throw error;
    }
}

/**
 * Update store-in record for Stage 9: Send Debit Note
 */
export async function updateStoreInDebitNote(
    liftNumber: string,
    indentNo: string,
    productName: string,
    updateData: {
        actual9: string;
        debitNoteCopy: string;
        debitNoteNumber: string;
        firmNameMatch?: string;
    }
) {
    try {
        await storeApi.updateWhere('store_in', {
            lift_number: liftNumber,
            indent_no: indentNo,
            product_name: productName,
        }, {
            actual9: updateData.actual9,
            debit_note_copy: updateData.debitNoteCopy,
            debit_note_number: updateData.debitNoteNumber,
            firm_name: updateData.firmNameMatch,
            firm_name_match: updateData.firmNameMatch,
        });

        return true;
    } catch (error) {
        console.error('Error updating store-in debit note:', error);
        throw error;
    }
}

/**
 * Update store-in record for Stage 10: Exchange Materials
 */
export async function updateStoreInExchange(
    liftNumber: string,
    indentNo: string,
    productName: string,
    updateData: {
        actual10: string;
        status: string;
    }
) {
    try {
        await storeApi.updateWhere('store_in', {
            lift_number: liftNumber,
            indent_no: indentNo,
            product_name: productName,
        }, {
            actual10: updateData.actual10,
            status: updateData.status,
        });

        return true;
    } catch (error) {
        console.error('Error updating store-in exchange:', error);
        throw error;
    }
}

/**
 * Update store-in record for Stage 11: Bill Status
 */
export async function updateStoreInBillStatus(
    liftNumber: string,
    indentNo: string,
    productName: string,
    updateData: {
        actual11: string;
        billStatusNew: string;
        billImageStatus: string;
    }
) {
    try {
        await storeApi.updateWhere('store_in', {
            lift_number: liftNumber,
            indent_no: indentNo,
            product_name: productName,
        }, {
            actual11: updateData.actual11,
            bill_status: 'Bill Received',
            bill_status_new: updateData.billStatusNew,
            bill_image_status: updateData.billImageStatus,
        });

        return true;
    } catch (error) {
        console.error('Error updating store-in bill status:', error);
        throw error;
    }
}

// ==================== FILE UPLOAD ====================

/**
 * Create payment entry when transportation is not included
 */
export async function createPaymentEntry(storeInData: {
    indent_number: string;
    vendor_name: string;
    po_number: string;
    bill_amount: number;
    photo_of_bill?: string;
    product_name: string;
    firm_name: string;
    firmNameMatch?: string;
    firm_id?: number;
    payment_form?: string;
    prefix?: string;
    remark?: string;
    payment_terms?: string;
}, billPhotoUrl: string = '') {
    try {
        if (!storeInData.firm_id) {
            throw new Error('Project ID is required for payment entry');
        }

        const nowIso = new Date().toISOString();

        const res: any = await apiClient.get('/store/entity/payments');
        const latestPayments = res.data || [];

        let uniqueNo = 'PAY-0001';
        if (latestPayments && latestPayments.length > 0) {
            let maxNum = 0;
            latestPayments.forEach((record: any) => {
                if (record.unique_no) {
                    const matches = record.unique_no.match(/PAY-(\d+)/);
                    if (matches && matches[1]) {
                        const num = parseInt(matches[1], 10);
                        if (num > maxNum) maxNum = num;
                    }
                }
            });
            uniqueNo = `PAY-${(maxNum + 1).toString().padStart(4, '0')}`;
        }

        const paymentEntry = {
            timestamp: nowIso,
            unique_no: uniqueNo,
            party_name: storeInData.vendor_name,
            po_number: storeInData.po_number,
            firm_name: storeInData.firmNameMatch || storeInData.firm_name,
            firm_id: storeInData.firm_id,
            total_po_amount: String(storeInData.bill_amount),
            internal_code: storeInData.indent_number,
            product: storeInData.product_name,
            delivery_date: null,
            payment_terms: storeInData.payment_terms || null,
            number_of_days: '0',
            pdf: billPhotoUrl || storeInData.photo_of_bill || '',
            pay_amount: String(storeInData.bill_amount),
            file: billPhotoUrl || storeInData.photo_of_bill || '',
            remark: storeInData.remark || `Payment for Store In - Indent ${storeInData.indent_number}`,
            total_paid_amount: '0',
            outstanding_amount: String(storeInData.bill_amount),
            status: 'Pending',
            planned: null,
            actual: null,
            status1: 'hod_approval_pending',
            payment_form: storeInData.payment_form || 'store_in',
        };

        const created: any = await apiClient.post('/store/entity/payments', paymentEntry);
        return created.data;
    } catch (error) {
        console.error('Error creating payment entry:', error);
        throw error;
    }
}

export async function uploadProductPhoto(file: File, indentNumber: string, onProgress?: (percent: number) => void): Promise<string> {
    void indentNumber;
    try {
        return await uploadFile({ file, folderId: 'store-and-inventory/store-check', subFolder: 'product-photos', onProgress });
    } catch (error) {
        // Previously this silently fabricated a fake /uploads/... path here
        // instead of rethrowing, which meant a failed upload still looked
        // like a success and saved a dead link to the DB. Surface it instead.
        console.error('Product photo upload error:', error);
        throw error;
    }
}

// Bill-copy uploads happen from three different sections (Store Check,
// Bill Not Received, Reject For GRN) — each needs its own S3 folder so the
// bucket layout mirrors the app's actual module/section structure.
async function uploadBillCopyTo(folderId: string, file: File, onProgress?: (percent: number) => void): Promise<string> {
    try {
        return await uploadFile({ file, folderId, subFolder: 'bills', onProgress });
    } catch (error) {
        console.error('Bill copy upload error:', error);
        throw error;
    }
}

export async function uploadBillCopy(file: File, liftNumber: string, onProgress?: (percent: number) => void): Promise<string> {
    void liftNumber;
    return uploadBillCopyTo('store-and-inventory/store-check', file, onProgress);
}

export async function uploadBillCopyBillNotReceived(file: File, liftNumber: string, onProgress?: (percent: number) => void): Promise<string> {
    void liftNumber;
    return uploadBillCopyTo('store-and-inventory/bill-not-received', file, onProgress);
}

export async function uploadBillCopyGrnRejection(file: File, liftNumber: string, onProgress?: (percent: number) => void): Promise<string> {
    void liftNumber;
    return uploadBillCopyTo('store-and-inventory/reject-for-grn', file, onProgress);
}

export async function uploadPaymentImage(file: File, uniqueNo: string, onProgress?: (percent: number) => void): Promise<string> {
    void uniqueNo;
    try {
        return await uploadFile({ file, folderId: 'store-and-inventory/make-payment', subFolder: 'payment-images', onProgress });
    } catch (error) {
        console.error('Payment image upload error:', error);
        throw error;
    }
}

export async function updateStoreInReturnToParty(
    liftNumber: string,
    updateData: {
        actual8: string;
        statusPurchaser: string;
    }
) {
    try {
        await storeApi.updateWhere('store_in', { lift_number: liftNumber }, {
            actual8: updateData.actual8,
            status_purchaser: updateData.statusPurchaser,
        });
        return true;
    } catch (error) {
        console.error('Error updating store-in return to party:', error);
        throw error;
    }
}

export async function uploadDebitNoteCopy(file: File, liftNumber: string, onProgress?: (percent: number) => void): Promise<string> {
    void liftNumber;
    try {
        return await uploadFile({ file, folderId: 'store-and-inventory/send-debit-note', subFolder: 'debit-notes', onProgress });
    } catch (error) {
        console.error('Debit note copy upload error:', error);
        throw error;
    }
}

export async function uploadChallanImage(file: File, liftNumber: string, onProgress?: (percent: number) => void): Promise<string> {
    void liftNumber;
    try {
        return await uploadFile({ file, folderId: 'store-and-inventory/store-check', subFolder: 'challan-images', onProgress });
    } catch (error) {
        console.error('Challan image upload error:', error);
        throw error;
    }
}

export async function updateLiftHistoryAdmin(
    id: number,
    data: { photoOfBill?: string | null; materialDate?: string | null }
): Promise<void> {
    const payload: Record<string, any> = {};
    if (data.photoOfBill !== undefined) payload.photo_of_bill = data.photoOfBill;
    if (data.materialDate !== undefined) payload.material_date = data.materialDate;

    await apiClient.patch(`/store/entity/store_in/${id}`, payload);
}

export async function createDirectRecord(recordData: any) {
    try {
        const payload = {
            lift_number: recordData.liftNumber,
            indent_no: recordData.indentNo,
            vendor_name: recordData.vendorName,
            product_name: recordData.productName,
            qty: recordData.qty,
            received_quantity: recordData.receivedQuantity,
            receiving_status: recordData.receivingStatus,
            bill_no: recordData.billNo,
            bill_amount: recordData.billAmount,
            photo_of_product: recordData.photoOfProduct,
            photo_of_bill: recordData.photoOfBill,
            receiver_name: recordData.receiverName,
            transportation_include: recordData.transportationInclude,
            firm_name_match: recordData.firmNameMatch,
            firm_id: recordData.firm_id,
            timestamp: recordData.timestamp,
            vehicle_no: recordData.vehicleNo,
            hod_status: 'Pending',
        };

        const res: any = await apiClient.post('/store/entity/store_in_direct', payload);
        return res.data;
    } catch (error) {
        console.error('Error creating direct record:', error);
        throw error;
    }
}

// ==================== STAGE DELETION & RESET FUNCTIONS ====================

/**
 * Reset a specific stage of store_in (store_check, hod_check, reject_grn, bill_not_received)
 * and cascade reset downstream stages
 */
export async function resetStoreInStage(
    id: number,
    stage: 'store_check' | 'hod_check' | 'reject_grn' | 'bill_not_received'
): Promise<boolean> {
    try {
        await apiClient.post(`/store/stage-reset/store-in/${id}`, { stage });
        return true;
    } catch (error) {
        console.error(`Error resetting store-in stage '${stage}':`, error);
        throw error;
    }
}

/**
 * Reset/Delete Lifting Stage:
 * Removes store_in record, removes linked fullkitting/payments/tally, and restores indent to Pending Lifting
 */
export async function resetLiftingStage(data: {
    id?: number;
    liftNumber?: string;
    indentNo?: string;
    productName?: string;
}): Promise<boolean> {
    try {
        await apiClient.post('/store/stage-reset/lifting', data);
        return true;
    } catch (error) {
        console.error('Error resetting lifting stage:', error);
        throw error;
    }
}

