import { apiClient } from '@/lib/apiClient';
import type { PaymentsSheet, PaymentHistory } from '@/types/sheets';
import { hasNoFirmAccess, normalizeFirmAccess } from '@/lib/firmAccess';

/**
 * Payment Service
 * Handles all REST API operations for Payments and Payment History via master-backend
 */

/**
 * Fetch all payment records from REST API
 * @param permittedFirms Optional array of firm names to filter by
 */
export async function fetchPayments(permittedFirms?: string[]): Promise<PaymentsSheet[]> {
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

        const res: any = await apiClient.get('/store/entity/payments', { params });
        const data = res?.data || [];

        return data.map((p: any) => ({
            timestamp: p.timestamp || '',
            uniqueNo: p.unique_no || '',
            partyName: p.party_name || '',
            poNumber: p.po_number || '',
            totalPoAmount: Number(p.total_po_amount) || 0,
            internalCode: p.internal_code || '',
            product: p.product || '',
            deliveryDate: p.delivery_date || '',
            paymentTerms: p.payment_terms || '',
            numberOfDays: Number(p.number_of_days) || 0,
            pdf: p.pdf || '',
            payAmount: Number(p.pay_amount) || 0,
            file: p.file || '',
            remark: p.remark || '',
            totalPaidAmount: Number(p.total_paid_amount) || 0,
            outstandingAmount: Number(p.outstanding_amount) || 0,
            status: p.status || '',
            planned: p.planned || '',
            actual: p.actual || '',
            delay: p.delay || '',
            status1: p.status1 || '',
            paymentForm: p.payment_form || '',
            paymentDone: p.payment_done || false,
            firmNameMatch: p.firm_name || '',
            firm_id: p.firm_id,
            id: p.id,
        })) as unknown as PaymentsSheet[];
    } catch (error) {
        console.error('Error fetching payments:', error);
        throw error;
    }
}

/**
 * Fetch all payment history records from REST API (from payments table)
 * @param permittedFirms Optional array of firm names to filter by
 */
export async function fetchPaymentHistory(permittedFirms?: string[]): Promise<PaymentHistory[]> {
    try {
        if (hasNoFirmAccess(permittedFirms)) return [];
        const firms = normalizeFirmAccess(permittedFirms);

        const params: Record<string, any> = {
            payment_done: true,
            order: 'actual.desc',
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

        const res: any = await apiClient.get('/store/entity/payments', { params });
        const data = res?.data || [];

        return data.map((h: any) => ({
            timestamp: h.actual || h.timestamp || '',
            appaymentNumber: '', // Not used anymore if fetching from payments
            status: h.status || 'Completed',
            uniquenumber: h.unique_no || '',
            fmsName: h.firm_name || '',
            payTo: h.party_name || '',
            amountToBepaid: Number(h.pay_amount) || 0,
            remarks: h.remark || '',
            anyAttachments: h.file || h.pdf || '',
            indent_no: h.internal_code || '',
            po_number: h.po_number || '',
            vendor_name: h.party_name || '',
            product_name: h.product || '',
            firmNameMatch: h.firm_name || '',
            firm_id: h.firm_id,
        })) as unknown as PaymentHistory[];
    } catch (error) {
        console.error('Error fetching payment history from payments table:', error);
        throw error;
    }
}

/**
 * Reset Payment Stage:
 * Clears actual date, sets status back to Pending, and removes payment_history record
 */
export async function resetPaymentStage(id: number): Promise<boolean> {
    try {
        await apiClient.post(`/store/stage-reset/payments/${id}`);
        return true;
    } catch (error) {
        console.error(`Error resetting payment stage for ID ${id}:`, error);
        throw error;
    }
}

