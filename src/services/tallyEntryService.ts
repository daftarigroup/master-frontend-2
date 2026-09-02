import { apiClient, storeApi } from '@/lib/apiClient';
import { hasNoFirmAccess, filterByFirmAccess } from '@/lib/firmAccess';

/**
 * TallyEntry Service
 * Handles all REST API operations for the TallyEntry component (Audit Data) via master-backend
 */

// ==================== INTERFACES ====================

export interface TallyEntryRecord {
    id: number;
    timestamp: string;
    liftNumber: string;
    indentNumber: string;
    poNumber: string;
    materialInDate: string;
    productName: string;
    billStatus: string;
    qty: number;
    partyName: string;
    billAmt: number;
    billImage: string;
    billNo: string;
    location: string;
    typeOfBills: string;
    productImage: string;
    area: string;
    approvedPartyName: string;
    rate: number;
    indentQty: number;
    totalRate: number;
    billReceivedLater: string;
    planned1: string;
    actual1: string;
    delay1: string;
    status1: string;
    remarks1: string;
    planned2: string;
    actual2: string;
    delay2: string;
    status2: string;
    remarks2: string;
    planned3: string;
    actual3: string;
    delay3: string;
    status3: string;
    remarks3: string;
    planned4: string;
    actual4: string;
    delay4: string;
    status4: string;
    remarks4: string;
    planned5: string;
    actual5: string;
    delay5: string;
    status5: string;
    remarks5: string;
    firmNameMatch: string;
    damageOrder?: string;
    quantityAsPerBill?: string;
    priceAsPerPoCheck?: string;
    hodStatus?: string;
    hodRemark?: string;
    receivingStatus?: string;
    receivedQuantity?: number;
    firm_id?: number;
}

// ==================== FETCH FUNCTIONS ====================

/**
 * Fetch all tally entry records from REST API
 * @param permittedFirms Optional array of firm names/IDs to filter by
 */
export async function fetchTallyEntryRecords(permittedFirms?: string[]): Promise<TallyEntryRecord[]> {
    try {
        if (hasNoFirmAccess(permittedFirms)) return [];
        const allowed = (permittedFirms || []).map((f) => String(f || '').trim()).filter(Boolean);
        const allowedIds = allowed.filter((v) => /^\d+$/.test(v)).map(Number);

        const tallyRes: any = await apiClient.get('/store/entity/tally_entry', {
            params: { order: 'lift_number.desc', limit: 'all' },
        });
        const tallyData = tallyRes.data || [];

        // Fetch additional details from store_in entity
        const storeRes: any = await apiClient.get('/store/entity/store_in', {
            params: { limit: 'all' },
        });
        const storeData = storeRes.data || [];

        // Map store_in data with trimmed keys for matching
        const storeMap = new Map();
        storeData.forEach((item: any) => {
            const key = `${String(item.lift_number || '').trim()}-${String(item.indent_no || '').trim()}`;
            storeMap.set(key, item);
        });

        const mapped: TallyEntryRecord[] = tallyData.map((r: any) => {
            const liftKey = String(r.lift_number || '').trim();
            const indentKey = String(r.indent_number || '').trim();
            const storeInfo = storeMap.get(`${liftKey}-${indentKey}`);

            return {
                id: r.id,
                timestamp: r.timestamp || '',
                liftNumber: r.lift_number || '',
                indentNumber: r.indent_number || '',
                poNumber: r.po_number || '',
                materialInDate: r.material_in_date || '',
                productName: r.product_name || '',
                billStatus: r.bill_status || '',
                qty: Number(r.qty) || 0,
                partyName: r.party_name || '',
                billAmt: Number(r.bill_amt) || 0,
                billImage: r.bill_image || '',
                billNo: r.bill_no || '',
                location: r.location || '',
                typeOfBills: r.type_of_bills || '',
                productImage: r.product_image || '',
                area: r.area || '',
                approvedPartyName: r.approved_party_name || '',
                rate: Number(r.rate) || 0,
                indentQty: Number(r.indent_qty) || 0,
                totalRate: Number(r.total_rate) || 0,
                billReceivedLater: r.bill_recieved_later || '',
                planned1: r.planned1 || '',
                actual1: r.actual1 || '',
                delay1: r.delay1 || '',
                status1: r.status1 || '',
                remarks1: r.remarks1 || '',
                planned2: r.planned2 || '',
                actual2: r.actual2 || '',
                delay2: r.delay2 || '',
                status2: r.status2 || '',
                remarks2: r.remarks2 || '',
                planned3: r.planned3 || '',
                actual3: r.actual3 || '',
                delay3: r.delay3 || '',
                status3: r.status3 || '',
                remarks3: r.remarks3 || '',
                planned4: r.planned4 || '',
                actual4: r.actual4 || '',
                delay4: r.delay4 || '',
                status4: r.status4 || '',
                remarks4: r.remarks4 || '',
                planned5: r.planned5 || '',
                actual5: r.actual5 || '',
                delay5: r.delay5 || '',
                status5: r.status5 || '',
                remarks5: r.remarks5 || '',
                firmNameMatch: r.firm_name || '',
                damageOrder: storeInfo?.damage_order || '',
                quantityAsPerBill: storeInfo?.quantity_as_per_bill || '',
                priceAsPerPoCheck: storeInfo?.bill_received2 || '',
                hodStatus: storeInfo?.hod_status || r.hod_status || 'Pending',
                hodRemark: storeInfo?.hod_remark || r.hod_remark || '',
                receivingStatus: storeInfo?.receiving_status || r.receiving_status || '',
                receivedQuantity: Number(storeInfo?.received_quantity) || 0,
                firm_id: r.firm_id || storeInfo?.firm_id,
            };
        });

        let fallbackAllowedNames = new Set<string>();
        if (allowedIds.length > 0) {
            const firmRes: any = await apiClient.get('/store/entity/firm', {
                params: { in__id: allowedIds.join(','), limit: 'all' },
            });
            const firmRows = firmRes.data || [];

            fallbackAllowedNames = new Set(
                firmRows
                    .map((f: any) => String(f.firm_name || '').trim().toLowerCase())
                    .filter(Boolean)
            );
        }

        const idFirstFiltered: TallyEntryRecord[] = filterByFirmAccess(mapped, permittedFirms, {
            id: (row: any) => row.firm_id,
            name: (row: any) => row.firmNameMatch,
        });

        if (allowedIds.length === 0 || fallbackAllowedNames.size === 0) {
            return idFirstFiltered;
        }

        const mergedById = new Map<number, TallyEntryRecord>();
        idFirstFiltered.forEach((row) => mergedById.set(row.id, row));

        mapped.forEach((row: TallyEntryRecord) => {
            const name = String(row.firmNameMatch || '').trim().toLowerCase();
            if (!row.firm_id && fallbackAllowedNames.has(name)) {
                mergedById.set(row.id, row);
            }
        });

        return Array.from(mergedById.values());
    } catch (error) {
        console.error('Error fetching tally entry records:', error);
        throw error;
    }
}

// ==================== UPDATE FUNCTIONS ====================

/**
 * Update a tally entry record with provided fields by its unique ID
 */
export async function updateTallyEntryRecord(
    id: number,
    updates: Record<string, any>
) {
    try {
        await apiClient.patch(`/store/entity/tally_entry/${id}`, updates);
        return true;
    } catch (error) {
        console.error(`Error updating tally entry for ID ${id}:`, error);
        throw error;
    }
}

/**
 * Create a new tally entry record via REST API
 */
export async function createTallyEntryRecord(record: any) {
    try {
        const mappedRecord = {
            timestamp: record.timestamp,
            lift_number: record.lift_number || record.liftNumber,
            indent_number: record.indent_number || record.indentNumber,
            po_number: record.po_number || record.poNumber,
            material_in_date: record.material_in_date || record.materialInDate,
            product_name: record.product_name || record.productName,
            bill_status: record.bill_status || record.billStatus,
            qty: record.qty,
            party_name: record.party_name || record.partyName,
            bill_amt: record.bill_amt || record.billAmt,
            bill_image: record.bill_image || record.billImage,
            bill_no: record.bill_no || record.billNo,
            planned1: record.planned1,
            firm_name: record.firmNameMatch || record.firm_name,
            firm_name_match: record.firmNameMatch || record.firm_name,
            firm_id: record.firm_id || record.firmId,
        };

        await apiClient.post('/store/entity/tally_entry', mappedRecord);
        return true;
    } catch (error) {
        console.error('Error creating tally entry record:', error);
        throw error;
    }
}

/**
 * Reset specific tally stage (audit, rectify, reaudit, tally_entry, again_audit)
 * and cascade reset downstream stages
 */
export async function resetTallyEntryStage(
    id: number,
    stage: 'audit' | 'rectify' | 'reaudit' | 'tally_entry' | 'again_audit' | 'stage1' | 'stage2' | 'stage3' | 'stage4' | 'stage5'
): Promise<boolean> {
    try {
        await apiClient.post(`/store/stage-reset/tally-entry/${id}`, { stage });
        return true;
    } catch (error) {
        console.error(`Error resetting tally entry stage '${stage}' for ID ${id}:`, error);
        throw error;
    }
}

