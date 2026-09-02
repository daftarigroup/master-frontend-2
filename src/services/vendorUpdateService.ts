import { apiClient, storeApi } from '@/lib/apiClient';
import { hasNoFirmAccess, normalizeFirmAccess } from '@/lib/firmAccess';

/**
 * Vendor Update Service
 * Handles all REST API operations for Vendor Rate Update page via master-backend.
 * Replaces direct Supabase calls.
 */

// ==================== INTERFACES ====================

export interface VendorPendingRecord {
    id: number;
    indentNo: string;
    firmNameMatch: string;
    indenter: string;
    product: string;
    quantity: number;
    uom: string;
    vendorType: 'Three Party' | 'Regular';
    planned2: string;
    actual2: string;
    specifications: string;
}

export interface VendorHistoryRecord {
    id: number;
    date: string;
    indentNo: string;
    firmNameMatch: string;
    indenter: string;
    product: string;
    quantity: number;
    uom: string;
    rate: number;
    vendorType: 'Three Party' | 'Regular';
    planned2: string;
    actual2: string;
    specifications: string;
    vendorName1?: string;
    rate1?: number;
    vendorName2?: string;
    rate2?: number;
    vendorName3?: string;
    rate3?: number;
    actual4?: string;
}

export interface IndentQuote {
    id?: number;
    timestamp: string;
    quatationNo: string;
    supplierName: string;
    indentNo: string;
    product: string;
    vendor_rate: number;
    firm_id?: number;
}

// ==================== FETCH FUNCTIONS ====================

/**
 * Fetch pending vendor update records (planned2 set, actual2 not set)
 */
export async function fetchPendingVendorUpdates(permittedFirms?: string[]): Promise<VendorPendingRecord[]> {
    try {
        if (hasNoFirmAccess(permittedFirms)) return [];
        const firms = normalizeFirmAccess(permittedFirms);

        const params: Record<string, any> = {
            'not_null__planned2': 'true',
            'is_null__actual2': 'true',
            order: 'indent_number.desc',
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

        const res: any = await apiClient.get('/store/entity/indent', { params });
        const records: any[] = res.data || [];

        // Filter: planned2 must exist AND actual2 must be null/empty, exclude rejected indents
        const filtered = records.filter(r =>
            r.planned2 && r.planned2 !== '' &&
            (!r.actual2 || r.actual2 === '') &&
            r.vendor_type !== 'Reject' &&
            r.status !== 'Rejected'
        );

        return filtered.map(r => ({
            id: Number(r.id),
            indentNo: r.indent_number || '',
            firmNameMatch: r.firm_name || '',
            indenter: r.indenter_name || '',
            product: r.product_name || '',
            quantity: Number(r.approved_quantity) || 0,
            uom: r.uom || '',
            vendorType: (r.vendor_type || 'Regular') as VendorPendingRecord['vendorType'],
            planned2: r.planned2 || '',
            actual2: r.actual2 || '',
            specifications: r.specifications || '',
        }));
    } catch (error) {
        console.error('Error fetching pending vendor updates:', error);
        throw error;
    }
}

/**
 * Fetch completed vendor update records (both planned2 and actual2 set)
 */
export async function fetchCompletedVendorUpdates(permittedFirms?: string[]): Promise<VendorHistoryRecord[]> {
    try {
        if (hasNoFirmAccess(permittedFirms)) return [];
        const firms = normalizeFirmAccess(permittedFirms);

        const params: Record<string, any> = {
            'not_null__planned2': 'true',
            'not_null__actual2': 'true',
            order: 'indent_number.desc',
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

        const res: any = await apiClient.get('/store/entity/indent', { params });
        const records: any[] = res.data || [];

        // Filter: both planned2 AND actual2 must exist, exclude rejected indents
        const filtered = records.filter(r =>
            r.planned2 && r.planned2 !== '' &&
            r.actual2 && r.actual2 !== '' &&
            r.vendor_type !== 'Reject' &&
            r.status !== 'Rejected'
        );

        return filtered.map(r => {
            const vendorType = (r.vendor_type || 'Regular') as VendorHistoryRecord['vendorType'];
            const approvedRate = parseFloat(r.approved_rate) || 0;
            const rate1 = parseFloat(r.rate1) || 0;
            const rate = vendorType === 'Three Party'
                ? approvedRate
                : (approvedRate || rate1);

            return {
                id: Number(r.id),
                date: r.actual2 ? new Date(r.actual2).toLocaleDateString('en-IN') : '',
                indentNo: r.indent_number || '',
                firmNameMatch: r.firm_name || '',
                indenter: r.indenter_name || '',
                product: r.product_name || '',
                quantity: Number(r.approved_quantity) || Number(r.quantity) || 0,
                uom: r.uom || '',
                rate,
                vendorType,
                planned2: r.planned2 || '',
                actual2: r.actual2 || '',
                specifications: r.specifications || '',
                vendorName1: r.vendor_name1 || '',
                rate1: parseFloat(r.rate1) || 0,
                vendorName2: r.vendor_name2 || '',
                rate2: parseFloat(r.rate2) || 0,
                vendorName3: r.vendor_name3 || '',
                rate3: parseFloat(r.rate3) || 0,
                actual4: r.actual4 || '',
            };
        });
    } catch (error) {
        console.error('Error fetching completed vendor updates:', error);
        throw error;
    }
}

/**
 * Fetch quotation quotes for a specific indent and product
 */
export async function fetchIndentQuotes(indentNo: string, product: string): Promise<IndentQuote[]> {
    try {
        const params: Record<string, any> = {
            indentNo,
            limit: 'all',
        };

        const res: any = await apiClient.get('/store/entity/quotation_history', { params });
        const records: any[] = res.data || [];

        // Filter by product (case-insensitive trim)
        const filtered = records.filter(r =>
            r.product?.trim().toLowerCase() === product?.trim().toLowerCase()
        );

        return filtered.map(r => ({
            id: Number(r.id),
            timestamp: r.timestamp || '',
            quatationNo: r.quatationNo || '',
            supplierName: r.supplierName || '',
            indentNo: r.indentNo || '',
            product: r.product || '',
            vendor_rate: Number(r.vendor_rate) || 0,
            firm_id: r.firm_id,
        }));
    } catch (error) {
        console.error('Error fetching indent quotes:', error);
        throw error;
    }
}

// ==================== UPDATE FUNCTIONS ====================

/**
 * Update indent with Regular vendor rate details
 */
export async function updateVendorRateRegular(
    id: number,
    data: {
        actual2: string;
        planned3: string;
        planned4?: string;
        po_requred: string;
        vendor_name1: string;
        rate1: string;
        approved_vendor_name?: string;
        approved_rate?: string;
        approved_payment_term?: string;
        vendor1_rank?: string;
        select_rate_type1: string;
        with_tax_or_not1: string;
        tax_value1: string;
        payment_term1: string;
        advance_percent1: string;
        quotation_no1: string;
        quotation_date1: string;
        delivery_time1: string;
        make1: string;
        vendor_type: string;
    }
) {
    try {
        await storeApi.update('indent', id, data);
        return true;
    } catch (error) {
        console.error('Error updating regular vendor rate:', error);
        throw error;
    }
}

/**
 * Update indent with Three Party vendor rate details
 */
export async function updateVendorRateThreeParty(
    id: number,
    data: {
        actual2: string;
        planned3: string;
        // Vendor 1
        vendor_name1: string;
        select_rate_type1: string;
        rate1: string;
        with_tax_or_not1: string;
        tax_value1: string;
        payment_term1: string;
        advance_percent1: string;
        whatsapp_number1: string;
        email_id1: string;
        quotation_no1: string;
        quotation_date1: string;
        delivery_time1: string;
        make1: string;
        // Vendor 2
        vendor_name2: string;
        select_rate_type2: string;
        rate2: string;
        with_tax_or_not2: string;
        tax_value2: string;
        payment_term2: string;
        advance_percent2: string;
        whatsapp_number2: string;
        email_id2: string;
        quotation_no2: string;
        quotation_date2: string;
        delivery_time2: string;
        make2: string;
        // Vendor 3
        vendor_name3: string;
        select_rate_type3: string;
        rate3: string;
        with_tax_or_not3: string;
        tax_value3: string;
        payment_term3: string;
        advance_percent3: string;
        whatsapp_number3: string;
        email_id3: string;
        quotation_no3: string;
        quotation_date3: string;
        delivery_time3: string;
        make3: string;
        // Other
        comparison_sheet: string;
        product_code: string;
        vendor_type: string;
    }
) {
    try {
        await storeApi.update('indent', id, data);
        return true;
    } catch (error) {
        console.error('Error updating three party vendor rate:', error);
        throw error;
    }
}

/**
 * Update indent history fields (quantity, uom, vendor_type) from history edit
 */
export async function updateVendorHistoryFields(
    id: number,
    data: {
        approved_quantity?: number;
        uom?: string;
        vendor_type?: string;
    }
) {
    try {
        await storeApi.update('indent', id, data);
        return true;
    } catch (error) {
        console.error('Error updating vendor history fields:', error);
        throw error;
    }
}
