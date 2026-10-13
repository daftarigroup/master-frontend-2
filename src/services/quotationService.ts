import { apiClient, storeApi } from '@/lib/apiClient';
import type { QuotationHistorySheet } from '@/types';
import { hasNoFirmAccess, normalizeFirmAccess } from '@/lib/firmAccess';

/**
 * Quotation Service
 * Handles all REST API operations for Quotations via master-backend.
 * Replaces direct Supabase calls.
 */

/**
 * Fetch all quotation history records from backend API
 */
export async function fetchQuotationHistory(permittedFirms?: (string | number)[]): Promise<QuotationHistorySheet[]> {
    try {
        if (hasNoFirmAccess(permittedFirms as string[] | undefined)) return [];
        const firms = normalizeFirmAccess(permittedFirms as string[] | undefined);

        const params: Record<string, any> = {
            order: 'timestamp.desc',
        };

        if (firms) {
            const ids = firms.filter(f => /^\d+$/.test(f)).map(Number);
            const names = firms.filter(f => !/^\d+$/.test(f));
            if (ids.length > 0) {
                params['in__firm_id'] = ids.join(',');
            } else if (names.length > 0) {
                params['in__firm'] = names.join(',');
            }
        }

        const res: any = await apiClient.get('/store/entity/quotation_history', { params });
        const records: any[] = res.data || [];

        return records.map((r: any) => ({
            timestamp: r.timestamp || '',
            quatationNo: r.quatationNo || '',
            supplierName: r.supplierName || '',
            adreess: r.adreess || '',
            gst: r.gst || '',
            indentNo: r.indentNo || '',
            product: r.product || '',
            description: r.description || '',
            qty: r.qty || '',
            unit: r.unit || '',
            pdfLink: r.pdfLink || '',
            firm: r.firm || '',
            token: r.token || '',
            vendor_rate: (r.vendor_rate !== undefined && r.vendor_rate !== null && r.vendor_rate !== '') ? Number(r.vendor_rate) : undefined,
            responded_at: r.responded_at || '',
            firm_id: r.firm_id,
        }));
    } catch (error) {
        console.error('Error fetching quotation history:', error);
        throw error;
    }
}

/**
 * Insert multiple quotation records via backend API
 */
export async function insertQuotationHistory(records: any[]) {
    try {
        const mappedRecords = records.map(r => ({
            timestamp: r.timestamp,
            quatationNo: r.quatationNo,
            supplierName: r.supplierName,
            adreess: r.adreess,
            gst: r.gst,
            indentNo: r.indentNo,
            product: r.product,
            description: r.description,
            qty: String(r.qty),
            unit: r.unit,
            pdfLink: r.pdfLink,
            firm: r.firm,
            token: r.token,
            vendor_rate: r.vendor_rate,
            responded_at: r.responded_at,
            firm_id: r.firm_id,
        }));

        // Insert all records (one by one or batch depending on backend support)
        await Promise.all(mappedRecords.map(record =>
            storeApi.insert('quotation_history', record)
        ));

        return true;
    } catch (error) {
        console.error('Error inserting quotation history:', error);
        throw error;
    }
}

/**
 * Fetch quotation details by token
 */
export async function fetchQuotationByToken(token: string): Promise<{ rows: any[]; vendor: any; firm: any }> {
    try {
        // Public page (vendor has no login): the token endpoint returns only that token's rows plus the vendor and project details.
        const res: any = await apiClient.get(`/store/vendor-bid/${encodeURIComponent(token)}`);
        return { rows: res.data || [], vendor: res.vendor || null, firm: res.firm || null };
    } catch (error) {
        console.error('Error fetching quotation by token:', error);
        throw error;
    }
}

/**
 * Update vendor rate for a specific item in a quotation
 */
export async function updateVendorRate(token: string, indentNo: string, product: string, rate: number) {
    try {
        // The server finds the line (token + indent + product) and writes only vendor_rate and responded_at.
        await apiClient.patch(`/store/vendor-bid/${encodeURIComponent(token)}`, { indentNo, product, rate });
        return true;
    } catch (error) {
        if ((error as { status?: number })?.status === 404) return false;
        console.error('Error updating vendor rate:', error);
        throw error;
    }
}
