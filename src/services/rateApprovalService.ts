import { storeApi, apiClient } from '@/lib/apiClient';
import { filterByFirmAccess } from '@/lib/firmAccess';

export interface ManagementApprovalIndent {
    id: number;
    indentNo: string;
    indenter: string;
    product: string;
    comparisonSheet: string;
    vendors: [string, string, string, string, string, string, string, string, string, string, string, string][];
    date: string;
    firmNameMatch?: string;
    firm_id?: number;
    plannedDate: string;
}

export interface ManagementApprovalHistory {
    id: number;
    indentNo: string;
    indenter: string;
    firmNameMatch: string;
    firm_id?: number;
    product: string;
    vendor: [string, string];
    date: string;
    rank: string;
}

/**
 * Fetch pending management approvals (Rate Approval)
 */
export async function fetchPendingManagementApprovals(permittedFirms?: string[]): Promise<ManagementApprovalIndent[]> {
    try {
        const res: any = await apiClient.get('/store/entity/indent', {
            params: {
                order: 'indent_number.desc',
                not_null__planned4: 'true',
                is_null__actual4: 'true',
                limit: 'all',
            },
        });

        const rows = (res.data || []) as any[];

        const mapped = rows
            // r.planned4 must be set — it's only stamped once Technical Approval actually
            // completes, so this keeps indents that haven't reached this stage yet from
            // appearing as "pending" here.
            .filter((r) => r.planned4 && r.vendor_type !== 'Reject' && r.status !== 'Rejected' && !r.actual4 && (!r.approved_vendor_name || r.approved_vendor_name.trim() === '') && (r.vendor1_rank || r.vendor2_rank || r.vendor3_rank))
            .map((r): ManagementApprovalIndent => ({
                id: r.id,
                indentNo: r.indent_number || '',
                firmNameMatch: r.firm_name || '',
                firm_id: r.firm_id,
                indenter: r.indenter_name || '',
                product: r.product_name || '',
                comparisonSheet: r.comparison_sheet || '',
                date: r.timestamp ? r.timestamp : '',
                plannedDate: r.planned4 || 'Not Set',
                vendors: [
                    [
                        r.vendor_name1 || '',
                        r.rate1?.toString() || '0',
                        r.payment_term1 || '',
                        r.select_rate_type1 || 'With Tax',
                        r.with_tax_or_not1 || 'Yes',
                        r.tax_value1?.toString() || '0',
                        r.quotation_no1 || '',
                        r.quotation_date1 || '',
                        r.vendor1_rank || '',
                        r.delivery_time1 || '',
                        r.make1 || '',
                        r.advance_percent1 || ''
                    ],
                    [
                        r.vendor_name2 || '',
                        r.rate2?.toString() || '0',
                        r.payment_term2 || '',
                        r.select_rate_type2 || 'With Tax',
                        r.with_tax_or_not2 || 'Yes',
                        r.tax_value2?.toString() || '0',
                        r.quotation_no2 || '',
                        r.quotation_date2 || '',
                        r.vendor2_rank || '',
                        r.delivery_time2 || '',
                        r.make2 || '',
                        r.advance_percent2 || ''
                    ],
                    [
                        r.vendor_name3 || '',
                        r.rate3?.toString() || '0',
                        r.payment_term3 || '',
                        r.select_rate_type3 || 'With Tax',
                        r.with_tax_or_not3 || 'Yes',
                        r.tax_value3?.toString() || '0',
                        r.quotation_no3 || '',
                        r.quotation_date3 || '',
                        r.vendor3_rank || '',
                        r.delivery_time3 || '',
                        r.make3 || '',
                        r.advance_percent3 || ''
                    ],
                ].filter(vendor => vendor[0] !== '') as [string, string, string, string, string, string, string, string, string, string, string, string][],
            }));

        return filterByFirmAccess(mapped, permittedFirms, {
            id: (row: any) => row.firm_id,
            name: (row: any) => row.firmNameMatch,
        });
    } catch (error) {
        console.error('Error fetching pending management approvals:', error);
        throw error;
    }
}

/**
 * Fetch completed management approvals (History)
 */
export async function fetchCompletedManagementApprovals(permittedFirms?: string[]): Promise<ManagementApprovalHistory[]> {
    try {
        const res: any = await apiClient.get('/store/entity/indent', {
            params: {
                order: 'indent_number.desc',
                not_null__planned4: 'true',
                limit: 'all',
            },
        });

        const rows = (res.data || []) as any[];

        const mapped = rows
            .filter((r) => r.vendor_type !== 'Reject' && r.status !== 'Rejected' && (r.actual4 || r.approved_vendor_name) && r.approved_vendor_name && r.approved_vendor_name.trim() !== '')
            .map((r): ManagementApprovalHistory => ({
                id: r.id,
                indentNo: r.indent_number || '',
                firmNameMatch: r.firm_name || '',
                firm_id: r.firm_id,
                indenter: r.indenter_name || '',
                product: r.product_name || '',
                date: r.actual4 || r.timestamp || '',
                vendor: [r.approved_vendor_name || '', r.approved_rate?.toString() || '0'],
                rank: r.vendor_rate || '',
            }));

        return filterByFirmAccess(mapped, permittedFirms, {
            id: (row: any) => row.firm_id,
            name: (row: any) => row.firmNameMatch,
        });
    } catch (error) {
        console.error('Error fetching completed management approvals:', error);
        throw error;
    }
}

/**
 * Submit management approval: approve final vendor, set actual4 and planned5 (triggers PO creation)
 */
export async function submitManagementApproval(id: number, selectedVendor: string[]) {
    try {
        const now = new Date().toISOString();
        const rate = parseFloat(selectedVendor[1]) || 0;

        const payload = {
            actual4: now,
            planned5: now, // Triggers Pending PO to Make
            po_requred: 'Yes',
            approved_vendor_name: selectedVendor[0] || '',
            approved_rate: rate.toString(),
            approved_payment_term: selectedVendor[2] || '',
            approved_advance_percent: selectedVendor[11] || '',
            with_tax_or_not4: selectedVendor[3] === 'Basic Rate' ? 'No' : 'Yes',
            tax_value4: selectedVendor[5] || '0',
            approved_quotation_no: selectedVendor[6] || '',
            approved_quotation_date: selectedVendor[7] || '',
            vendor_rate: selectedVendor[8] || '',
        };

        return await storeApi.update('indent', id, payload);
    } catch (error) {
        console.error('Error submitting management approval:', error);
        throw error;
    }
}

/**
 * Update approved rate from history tab
 */
export async function updateApprovedRate(id: number, rate: number) {
    try {
        return await storeApi.update('indent', id, {
            approved_rate: rate.toString(),
        });
    } catch (error) {
        console.error('Error updating approved rate:', error);
        throw error;
    }
}
