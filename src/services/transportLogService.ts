import { apiClient, storeApi } from '@/lib/apiClient';
import { filterByFirmAccess } from '@/lib/firmAccess';
import { uploadFile } from '@/lib/fetchers';

export interface TransportLogEntry {
    id: number;
    timestamp: string;
    liftNumber: string;
    poNumber: string;
    indentNo: string;
    firmName: string;
    firm_id: number | null;
    vendorName: string;
    productName: string;
    qty: number;
    uom?: string;
    vehicleNo: string;
    driverName: string;
    driverMobileNo: string;
    transporterName: string;
    transportationInclude: string;
    amount: number;
    rateType?: string;
    fromLocation?: string;
    toLocation?: string;
    biltyNumber?: string;
    biltyImage?: string;
    challanNo?: string;
    challanImage?: string;
    billNo?: string;
    photoOfBill?: string;
    billStatus?: string;
    materialDate?: string | null;
    status: 'In Transit' | 'Received at Store' | 'Quality Approved';
    actual6?: string;
    planned6?: string;
    receivingStatus?: string;
    receivedQuantity?: number;
    hodStatus?: string;
    remarks?: string;
}

export interface TransportUpdatePayload {
    vehicleNo?: string;
    driverName?: string;
    driverMobileNo?: string;
    transporterName?: string;
    transportationInclude?: string;
    amount?: number;
    biltyNumber?: string;
    biltyImage?: string;
    challanNo?: string;
    challanImage?: string;
    fromLocation?: string;
    toLocation?: string;
    materialDate?: string;
    remarks?: string;
}

export interface NewTransportLogPayload {
    poNumber: string;
    indentNo?: string;
    vendorName: string;
    productName: string;
    qty: number;
    uom?: string;
    firmName: string;
    firm_id?: number | null;
    vehicleNo: string;
    driverName?: string;
    driverMobileNo?: string;
    transporterName?: string;
    transportationInclude?: string;
    amount?: number;
    biltyNumber?: string;
    biltyImage?: string;
    challanNo?: string;
    challanImage?: string;
    fromLocation?: string;
    toLocation?: string;
    materialDate?: string;
    remarks?: string;
}

/**
 * Fetch and assemble all transport log entries from store_in and fullkitting
 */
export async function fetchTransportLogs(permittedFirms?: string[]): Promise<TransportLogEntry[]> {
    try {
        const params: Record<string, any> = { limit: 1000 };
        if (permittedFirms && permittedFirms.length > 0) {
            const ids = permittedFirms.filter((f) => /^\d+$/.test(f)).map(Number);
            if (ids.length > 0) {
                params['in__firm_id'] = ids.join(',');
            }
        }

        const [storeInRes, fullkittingRes]: [any, any] = await Promise.all([
            apiClient.get('/store/entity/store_in', { params }).catch(() => ({ data: [] })),
            apiClient.get('/store/entity/fullkitting', { params }).catch(() => ({ data: [] })),
        ]);

        const storeInRows: any[] = storeInRes?.data || [];
        const fullkittingRows: any[] = fullkittingRes?.data || [];

        // Build lookup map for fullkitting by indent_number + product_name or bilty
        const fkMap = new Map<string, any>();
        fullkittingRows.forEach((fk) => {
            const key1 = `${fk.indent_number || ''}_${fk.product_name || ''}`;
            if (key1 !== '_') fkMap.set(key1, fk);
            if (fk.bilty_number) fkMap.set(fk.bilty_number, fk);
            if (fk.vehical_no) fkMap.set(fk.vehical_no, fk);
        });

        const mapped: TransportLogEntry[] = storeInRows.map((r: any) => {
            const key1 = `${r.indent_no || r.indent_number || ''}_${r.product_name || r.product || ''}`;
            const fk = fkMap.get(key1) || fkMap.get(r.vehicle_no || '') || null;

            const vehicleNo = r.vehicle_no || fk?.vehical_no || fk?.vehicle_number || '';
            const driverName = r.driver_name || fk?.driver_name || '';
            const driverMobileNo = r.driver_mobile_no || fk?.driver_mobile_no || '';
            const transporterName = r.transporter_name || fk?.transporter_name || '';
            const biltyNumber = fk?.bilty_number || r.bilty_number || '';
            const biltyImage = fk?.bilty_image || r.bilty_image || '';
            const fromLocation = fk?.from || '';
            const toLocation = fk?.to || r.location || '';
            const amount = Number(r.amount) || Number(fk?.amount) || 0;

            // Determine transport / logistics status
            let status: 'In Transit' | 'Received at Store' | 'Quality Approved' = 'In Transit';
            if (r.hod_status === 'Approved') {
                status = 'Quality Approved';
            } else if (r.actual6 || (r.receiving_status && r.receiving_status !== 'Pending')) {
                status = 'Received at Store';
            }

            return {
                id: r.id,
                timestamp: r.timestamp || r.planned6 || '',
                liftNumber: r.lift_number || '',
                poNumber: r.po_number || fk?.po_number || '',
                indentNo: r.indent_no || r.indent_number || fk?.indent_number || '',
                firmName: r.firm_name || r.firm_name_match || fk?.firm_name || '',
                firm_id: r.firm_id ?? fk?.firm_id ?? null,
                vendorName: r.party_name || r.vendor_name || fk?.vendor_name || '',
                productName: r.product_name || r.product || fk?.product_name || '',
                qty: Number(r.qty) || Number(fk?.qty) || 0,
                uom: r.uom || r.unit_of_measurement || '',
                vehicleNo,
                driverName,
                driverMobileNo,
                transporterName,
                transportationInclude: r.transportation_include || fk?.transporting_include || 'No',
                amount,
                rateType: fk?.rate_type || '',
                fromLocation,
                toLocation,
                biltyNumber,
                biltyImage,
                challanNo: r.challan_no || '',
                challanImage: r.challan_image || '',
                billNo: r.bill_no || r.bill_number || fk?.bill_no || '',
                photoOfBill: r.photo_of_bill || '',
                billStatus: r.bill_status || '',
                materialDate: r.material_date || null,
                status,
                actual6: r.actual6 || '',
                planned6: r.planned6 || '',
                receivingStatus: r.receiving_status || '',
                receivedQuantity: Number(r.received_quantity) || 0,
                hodStatus: r.hod_status || 'Pending',
                remarks: r.bill_remark || fk?.material_load_details || r.remark || '',
            };
        });

        // Filter by user firm permissions
        const filtered = filterByFirmAccess(mapped, permittedFirms, {
            id: (row) => row.firm_id,
            name: (row) => row.firmName,
        });

        // Sort descending by date
        return filtered.sort((a, b) => {
            const timeA = new Date(a.timestamp || 0).getTime();
            const timeB = new Date(b.timestamp || 0).getTime();
            return timeB - timeA;
        });
    } catch (error) {
        console.error('Error fetching transport logs:', error);
        throw error;
    }
}

/**
 * Update transport metadata on an existing store_in (and linked fullkitting) record
 */
export async function updateTransportLogEntry(
    storeInId: number,
    payload: TransportUpdatePayload
): Promise<boolean> {
    try {
        const storeInUpdate: Record<string, any> = {};
        if (payload.vehicleNo !== undefined) storeInUpdate.vehicle_no = payload.vehicleNo.trim();
        if (payload.driverName !== undefined) storeInUpdate.driver_name = payload.driverName.trim();
        if (payload.driverMobileNo !== undefined) storeInUpdate.driver_mobile_no = payload.driverMobileNo.trim();
        if (payload.transporterName !== undefined) storeInUpdate.transporter_name = payload.transporterName.trim();
        if (payload.transportationInclude !== undefined) storeInUpdate.transportation_include = payload.transportationInclude;
        if (payload.amount !== undefined) storeInUpdate.amount = String(payload.amount);
        if (payload.challanNo !== undefined) storeInUpdate.challan_no = payload.challanNo.trim();
        if (payload.challanImage !== undefined) storeInUpdate.challan_image = payload.challanImage;
        if (payload.materialDate !== undefined) storeInUpdate.material_date = payload.materialDate || null;
        if (payload.remarks !== undefined) storeInUpdate.bill_remark = payload.remarks;

        await storeApi.updateWhere('store_in', { id: storeInId }, storeInUpdate);

        // Also check and update or create fullkitting record if bilty or vehicle provided
        try {
            const [currentStoreIn]: any = await storeApi.fetch('store_in', { id: storeInId });
            if (currentStoreIn) {
                const indentNo = currentStoreIn.indent_no || currentStoreIn.indent_number;
                const prodName = currentStoreIn.product_name || currentStoreIn.product;
                if (indentNo && prodName) {
                    const existingFk: any[] = await storeApi.fetch('fullkitting', {
                        indent_number: indentNo,
                        product_name: prodName,
                    });

                    const fkUpdate: Record<string, any> = {
                        vehical_no: payload.vehicleNo || currentStoreIn.vehicle_no,
                        vehicle_number: payload.vehicleNo || currentStoreIn.vehicle_no,
                        driver_name: payload.driverName || currentStoreIn.driver_name,
                        driver_mobile_no: payload.driverMobileNo || currentStoreIn.driver_mobile_no,
                        transporter_name: payload.transporterName || currentStoreIn.transporter_name,
                        amount: payload.amount ?? Number(currentStoreIn.amount || 0),
                        from: payload.fromLocation || undefined,
                        to: payload.toLocation || undefined,
                        bilty_number: payload.biltyNumber || undefined,
                        bilty_image: payload.biltyImage || undefined,
                        material_load_details: payload.remarks || undefined,
                    };

                    // Strip undefined
                    Object.keys(fkUpdate).forEach((k) => fkUpdate[k] === undefined && delete fkUpdate[k]);

                    if (existingFk && existingFk.length > 0) {
                        await storeApi.updateWhere('fullkitting', { id: existingFk[0].id }, fkUpdate);
                    } else if (payload.biltyNumber || payload.amount || payload.fromLocation) {
                        await storeApi.insert('fullkitting', [{
                            timestamp: new Date().toISOString(),
                            indent_number: indentNo,
                            vendor_name: currentStoreIn.party_name || currentStoreIn.vendor_name || '',
                            product_name: prodName,
                            qty: Number(currentStoreIn.qty) || 0,
                            bill_no: currentStoreIn.bill_no || '',
                            transporting_include: payload.transportationInclude || 'Yes',
                            transporter_name: payload.transporterName || currentStoreIn.transporter_name || '',
                            amount: payload.amount || Number(currentStoreIn.amount || 0),
                            vehical_no: payload.vehicleNo || currentStoreIn.vehicle_no || '',
                            driver_name: payload.driverName || currentStoreIn.driver_name || '',
                            driver_mobile_no: payload.driverMobileNo || currentStoreIn.driver_mobile_no || '',
                            firm_name: currentStoreIn.firm_name || '',
                            firm_id: currentStoreIn.firm_id ?? null,
                            from: payload.fromLocation || '',
                            to: payload.toLocation || '',
                            bilty_number: payload.biltyNumber || '',
                            bilty_image: payload.biltyImage || '',
                            material_load_details: payload.remarks || '',
                        }]);
                    }
                }
            }
        } catch (fkErr) {
            console.warn('Non-fatal: could not sync fullkitting record:', fkErr);
        }

        return true;
    } catch (error) {
        console.error('Error updating transport log:', error);
        throw error;
    }
}

/**
 * Record a new transport entry linked to a PO/Indent in store_in & fullkitting
 */
export async function createTransportLogEntry(payload: NewTransportLogPayload): Promise<string> {
    try {
        // Compute next Lift Number LN-XXX
        const allStoreIns: any[] = await storeApi.fetch('store_in', { limit: 500 }).catch(() => []);
        let maxNum = 0;
        allStoreIns.forEach((r: any) => {
            const match = String(r.lift_number).match(/LN-(\d+)/);
            if (match && match[1]) {
                const num = parseInt(match[1], 10);
                if (num > maxNum) maxNum = num;
            }
        });
        const liftNumber = `LN-${maxNum + 1}`;
        const now = new Date().toISOString();

        const insertRecord = {
            timestamp: now,
            lift_number: liftNumber,
            indent_no: payload.indentNo || null,
            po_number: payload.poNumber || null,
            party_name: payload.vendorName || null,
            vendor_name: payload.vendorName || null,
            product_name: payload.productName || null,
            qty: String(payload.qty || 0),
            uom: payload.uom || null,
            firm_name: payload.firmName || null,
            firm_id: payload.firm_id ?? null,
            vehicle_no: payload.vehicleNo.trim(),
            driver_name: payload.driverName ? payload.driverName.trim() : null,
            driver_mobile_no: payload.driverMobileNo ? payload.driverMobileNo.trim() : null,
            transporter_name: payload.transporterName ? payload.transporterName.trim() : null,
            transportation_include: payload.transportationInclude || 'No',
            amount: String(payload.amount || 0),
            challan_no: payload.challanNo ? payload.challanNo.trim() : null,
            challan_image: payload.challanImage || null,
            material_date: payload.materialDate || now,
            planned6: now,
            lifting_status: 'Lifted',
            bill_remark: payload.remarks || null,
            hod_status: 'Pending',
        };

        await storeApi.insert('store_in', [insertRecord]);

        // Create linked fullkitting entry if bilty or transport amount is specified
        if (payload.biltyNumber || payload.amount || payload.fromLocation) {
            await storeApi.insert('fullkitting', [{
                timestamp: now,
                indent_number: payload.indentNo || payload.poNumber,
                vendor_name: payload.vendorName,
                product_name: payload.productName,
                qty: payload.qty,
                transporting_include: payload.transportationInclude || 'Yes',
                transporter_name: payload.transporterName || '',
                amount: payload.amount || 0,
                vehical_no: payload.vehicleNo,
                driver_name: payload.driverName || '',
                driver_mobile_no: payload.driverMobileNo || '',
                firm_name: payload.firmName,
                firm_id: payload.firm_id ?? null,
                from: payload.fromLocation || '',
                to: payload.toLocation || '',
                bilty_number: payload.biltyNumber || '',
                bilty_image: payload.biltyImage || '',
                material_load_details: payload.remarks || '',
            }]).catch((e) => console.warn('Could not insert linked fullkitting:', e));
        }

        return liftNumber;
    } catch (error) {
        console.error('Error creating transport log entry:', error);
        throw error;
    }
}

/**
 * Upload Bilty or Challan document to S3
 */
export async function uploadTransportDocument(
    file: File,
    referenceNo: string,
    onProgress?: (percent: number) => void
): Promise<string> {
    return uploadFile({
        file,
        folderId: 'store-and-inventory/transport-log',
        subFolder: referenceNo ? `doc-${referenceNo}` : 'documents',
        onProgress,
    });
}
