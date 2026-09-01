import { apiClient } from '@/lib/apiClient';
import { hasNoFirmAccess, normalizeFirmAccess } from '@/lib/firmAccess';

export interface StockTransferRecord {
    id?: number;
    timestamp: string;
    transfer_no: string;
    from_project: string;
    from_firm_id?: number;
    to_project: string;
    to_firm_id?: number;
    product_name: string;
    uom: string;
    group_head: string;
    quantity: number;
    remark: string;
    status: string;
}

/**
 * Fetch all stock transfer records from REST API
 * @param permittedFirms Optional array of firm IDs to filter by
 */
export async function fetchStockTransferRecords(permittedFirms?: string[]) {
    try {
        if (hasNoFirmAccess(permittedFirms)) return [];
        const firms = normalizeFirmAccess(permittedFirms);

        const params: Record<string, any> = {
            order: 'timestamp.desc',
        };

        if (firms) {
            const ids = firms.filter(f => /^\d+$/.test(f)).map(Number);
            if (ids.length === 0) return [];
            params['or__in__from_firm_id'] = ids.join(',');
            params['or__in__to_firm_id'] = ids.join(',');
        }

        const res: any = await apiClient.get('/store/entity/stock_transfers', { params });
        const data = res?.data || [];

        return data.map((r: any) => ({
            id: r.id,
            timestamp: r.timestamp,
            transferNo: r.transfer_no,
            fromProject: r.from_project,
            fromFirmId: r.from_firm_id,
            toProject: r.to_project,
            toFirmId: r.to_firm_id,
            productName: r.product_name,
            uom: r.uom,
            groupHead: r.group_head,
            quantity: Number(r.quantity) || 0,
            remark: r.remark,
            status: r.status
        }));
    } catch (error) {
        console.error('Error fetching stock transfers:', error);
        throw error;
    }
}
