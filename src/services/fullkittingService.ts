import { apiClient, storeApi } from '@/lib/apiClient';
import { hasNoFirmAccess, normalizeFirmAccess } from '@/lib/firmAccess';
import { uploadFile } from '@/lib/fetchers';

/**
 * Full Kitting Service
 * Handles full kitting operations via REST API
 */

export interface FullkittingRecord {
    id: number;
    timestamp: string;
    indentNumber: string;
    vendorName: string;
    productName: string;
    qty: number;
    billNo: string;
    transportingInclude: string;
    transporterName: string;
    amount: number;
    vehicalNo: string;
    driverName: string;
    driverMobileNo: string;
    planned: string;
    actual: string;
    timeDelay?: string;
    fmsName?: string;
    status: string;
    vehicleNumber: string;
    from: string;
    to: string;
    materialLoadDetails: string;
    biltyNumber: string;
    rateType: string;
    amount1: number;
    biltyImage: string;
    firmNameMatch: string;
    firm_id: number | null;
    indent_number?: string;
    vendor_name?: string;
    product_name?: string;
    bill_no?: string;
    transporting_include?: string;
    transporter_name?: string;
    vehical_no?: string;
    driver_name?: string;
    driver_mobile_no?: string;
    vehicle_number?: string;
    material_load_details?: string;
    bilty_number?: string;
    rate_type?: string;
    bilty_image?: string;
    firm_name?: string;
}

export type FullKittingRecord = FullkittingRecord;

/**
 * Fetch all full kitting records from REST API
 * @param permittedFirms Optional array of firm IDs to filter by
 */
export async function fetchFullkittingRecords(permittedFirms?: string[]): Promise<FullkittingRecord[]> {
    try {
        if (hasNoFirmAccess(permittedFirms)) return [];
        const firms = normalizeFirmAccess(permittedFirms);

        const params: Record<string, any> = {
            order: 'timestamp.desc',
            limit: 'all',
        };

        if (firms) {
            const ids = firms.filter(f => /^\d+$/.test(f)).map(Number);
            const names = firms.filter(f => !/^\d+$/.test(f));
            if (ids.length > 0) {
                params['in__firm_id'] = ids.join(',');
            } else if (names.length > 0) {
                params['in__firm_name'] = names.join(',');
            }
        }

        const res: any = await apiClient.get('/store/entity/fullkitting', { params });
        const data = res?.data || [];

        return data.map((r: any) => ({
            id: r.id,
            timestamp: r.timestamp || '',
            indentNumber: r.indent_number || '',
            indent_number: r.indent_number || '',
            vendorName: r.vendor_name || '',
            vendor_name: r.vendor_name || '',
            productName: r.product_name || '',
            product_name: r.product_name || '',
            qty: Number(r.qty) || 0,
            billNo: r.bill_no || '',
            bill_no: r.bill_no || '',
            transportingInclude: r.transporting_include || '',
            transporting_include: r.transporting_include || '',
            transporterName: r.transporter_name || '',
            transporter_name: r.transporter_name || '',
            amount: Number(r.amount) || 0,
            vehicalNo: r.vehical_no || '',
            vehical_no: r.vehical_no || '',
            driverName: r.driver_name || '',
            driver_name: r.driver_name || '',
            driverMobileNo: r.driver_mobile_no || '',
            driver_mobile_no: r.driver_mobile_no || '',
            planned: r.planned || '',
            actual: r.actual || '',
            timeDelay: r.time_delay || '',
            fmsName: r.firm?.firm_name || r.firm_name || '',
            status: r.status || '',
            vehicleNumber: r.vehicle_number || '',
            vehicle_number: r.vehicle_number || '',
            from: r.from || '',
            to: r.to || '',
            materialLoadDetails: r.material_load_details || '',
            material_load_details: r.material_load_details || '',
            biltyNumber: r.bilty_number || '',
            bilty_number: r.bilty_number || '',
            rateType: r.rate_type || '',
            rate_type: r.rate_type || '',
            amount1: Number(r.amount1) || 0,
            biltyImage: r.bilty_image || '',
            bilty_image: r.bilty_image || '',
            firmNameMatch: r.firm?.firm_name || r.firm_name || '',
            firm_name: r.firm?.firm_name || r.firm_name || '',
            firm_id: r.firm_id ?? null,
        }));
    } catch (error) {
        console.error('Error fetching full kitting records:', error);
        throw error;
    }
}

export const fetchFullKittingRecords = fetchFullkittingRecords;

/**
 * Create a new fullkitting entry
 */
export async function createFullkittingEntry(data: {
    timestamp: string;
    indent_number: string;
    vendor_name: string;
    product_name: string;
    qty: number;
    bill_no: string;
    transporter_name: string;
    amount: number;
    vehicle_no: string;
    driver_name: string;
    driver_mobile_no: string;
    firm_name: string;
    firm_id?: number | null;
}): Promise<boolean> {
    try {
        // Prevent duplicate entries for the same indent + product + bill_no
        const existing: any[] = await storeApi.fetch('fullkitting', {
            indent_number: data.indent_number,
            product_name: data.product_name,
            bill_no: data.bill_no,
        });

        if (existing && existing.length > 0) {
            return false;
        }

        await storeApi.insert('fullkitting', [{
            timestamp: data.timestamp,
            indent_number: data.indent_number,
            vendor_name: data.vendor_name,
            product_name: data.product_name,
            qty: data.qty,
            bill_no: data.bill_no,
            transporting_include: 'Yes',
            transporter_name: data.transporter_name,
            amount: data.amount,
            vehical_no: data.vehicle_no,
            driver_name: data.driver_name,
            driver_mobile_no: data.driver_mobile_no,
            firm_name: data.firm_name,
            firm_id: data.firm_id,
        }]);

        return true;
    } catch (error) {
        console.error('Error creating fullkitting entry:', error);
        throw error;
    }
}

/**
 * Update fullkitting record with form data
 */
export async function updateFullkittingRecord(
    indentNumber: string,
    updateData: {
        id?: number;
        actual?: string;
        status?: string;
        vehicleNumber?: string;
        from?: string;
        to?: string;
        materialLoadDetails?: string;
        biltyNumber?: string;
        rateType?: string;
        amount1?: number;
        biltyImage?: string;
    }
) {
    try {
        const mappedData: any = {};

        if (updateData.actual) mappedData.actual = updateData.actual;
        if (updateData.status) mappedData.status = updateData.status;
        if (updateData.vehicleNumber) mappedData.vehicle_number = updateData.vehicleNumber;
        if (updateData.from) mappedData.from = updateData.from;
        if (updateData.to) mappedData.to = updateData.to;
        if (updateData.materialLoadDetails) mappedData.material_load_details = updateData.materialLoadDetails;
        if (updateData.biltyNumber) mappedData.bilty_number = updateData.biltyNumber;
        if (updateData.rateType) mappedData.rate_type = updateData.rateType;
        if (updateData.amount1 !== undefined) mappedData.amount1 = updateData.amount1.toString();
        if (updateData.biltyImage) mappedData.bilty_image = updateData.biltyImage;

        if (updateData.id) {
            await storeApi.update('fullkitting', updateData.id, mappedData);
        } else {
            await storeApi.updateWhere('fullkitting', { indent_number: indentNumber }, mappedData);
        }

        return true;
    } catch (error) {
        console.error('Error updating fullkitting record:', error);
        throw error;
    }
}

/**
 * Upload bilty image to Storage
 */
export async function uploadBiltyImage(file: File, _indentNumber: string, onProgress?: (percent: number) => void): Promise<string> {
    try {
        return await uploadFile({
            file,
            folderId: 'store-and-inventory/freight-payment',
            subFolder: 'bilty-images',
            onProgress,
        });
    } catch (error) {
        console.error('Bilty image upload error:', error);
        throw error;
    }
}

/**
 * Reset Freight Payment stage:
 * Clears actual date and payment details, moving it back to pending freight payment
 */
export async function resetFullkittingStage(id: number): Promise<boolean> {
    try {
        await apiClient.post(`/store/stage-reset/fullkitting/${id}`);
        return true;
    } catch (error) {
        console.error(`Error resetting fullkitting stage for ID ${id}:`, error);
        throw error;
    }
}

