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
export async function fetchQuotationByToken(token: string) {
    try {
        const res: any = await apiClient.get('/store/entity/quotation_history', {
            params: { token },
        });
        return res.data || [];
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
        // Fetch the record first to get its ID
        const res: any = await apiClient.get('/store/entity/quotation_history', {
            params: { token, indentNo },
        });
        const records: any[] = res.data || [];

        // Filter by product
        const target = records.find((r: any) =>
            r.product?.trim().toLowerCase() === product?.trim().toLowerCase()
        );

        if (!target) {
            return false;
        }

        await storeApi.update('quotation_history', target.id, {
            vendor_rate: rate,
            responded_at: new Date().toISOString(),
        });

        return true;
    } catch (error) {
        console.error('Error updating vendor rate:', error);
        throw error;
    }
}
