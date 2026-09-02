import { apiClient, storeApi } from '@/lib/apiClient';
import { hasNoFirmAccess, normalizeFirmAccess } from '@/lib/firmAccess';

/**
 * Inventory Service
 * Handles inventory operations via master-backend REST API
 */

export interface InventoryRecord {
    itemName: string;
    groupHead: string;
    uom: string;
    opening: number;
    individualRate: number;
    individual_rate?: number;
    rate: number;
    indented: number;
    approved: number;
    purchaseQuantity: number;
    purchaseReturn: number;
    liftingQty: number;
    inTransit: number;
    outQuantity: number;
    issueReturn: number;
    stockTransfer: number;
    stockTransferGiven: number;
    stockTransferReceiving: number;
    fromProject: string;
    toProject: string;
    firmName: string;
    firm_id?: number;
    current: number;
    avgPrice?: number;
    totalPrice: number;
    status: string;
    colorCode?: string;
}

export interface InventoryItemInput {
    itemName: string;
    groupHead: string;
    uom?: string;
    quantity: number;
    firmName?: string;
    firmId?: number;
    inventoryRecordId?: number;
}

function toNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function getInventoryStatus(current: number): string {
    if (current <= 0) return 'red';
    if (current < 5) return 'red';
    return 'green';
}

function toTextNumber(value: number): string {
    return String(value);
}

/**
 * Fetch all inventory records from REST API
 * @param permittedFirms Optional array of firm IDs to filter by
 */
export async function fetchInventoryRecords(permittedFirms?: string[]): Promise<InventoryRecord[]> {
    try {
        if (hasNoFirmAccess(permittedFirms)) return [];
        const firms = normalizeFirmAccess(permittedFirms);

        const params: Record<string, any> = {
            order: 'item_name.asc',
            limit: 'all',
        };

        if (firms) {
            const ids = firms.filter(f => /^\d+$/.test(f)).map(Number);
            if (ids.length === 0) return [];
            params['in__firm_id'] = ids.join(',');
        }

        const res: any = await apiClient.get('/store/entity/inventory', { params });
        const data = res?.data || [];

        return data.map((r: any) => {
            const purQty = Number(r.purchase_quantity) || 0;
            const liftQty = Number(r.received_quantity) || 0;
            const firmName = r.firm?.firm_name || r.firm_name || '';
            
            return {
                itemName: r.item_name || '',
                groupHead: r.group_head || '',
                uom: r.uom || '',
                opening: Number(r.opening) || 0,
                individualRate: Number(r.individual_rate) || 0,
                rate: Number(r.individual_rate) || 0,
                individual_rate: Number(r.individual_rate) || 0,
                indented: Number(r.indented) || 0,
                approved: Number(r.approved) || 0,
                purchaseQuantity: purQty,
                purchaseReturn: Number(r.return_quantity) || 0,
                liftingQty: liftQty,
                inTransit: Math.max(0, purQty - liftQty),
                outQuantity: Number(r.out_quantity) || 0,
                issueReturn: Number(r.issue_return) || 0,
                stockTransfer: Number(r.stock_transfer) || 0,
                stockTransferGiven: 0,
                stockTransferReceiving: Number(r.stock_transfer) || 0,
                fromProject: '',
                toProject: '',
                firmName: firmName,
                firmNameMatch: firmName,
                firm_id: r.firm_id,
                current: Number(r.current) || 0,
                avgPrice: Number(r.avg_price ?? r.avgPrice ?? 0),
                totalPrice: Number(r.total_price) || 0,
                status: r.color_code || '',
                colorCode: r.color_code || '',
            };
        });
    } catch (error) {
        console.error('Error fetching inventory records:', error);
        throw error;
    }
}

export async function fetchItemInventoryRecord(itemName: string, firmId?: number, firmName?: string): Promise<{ id: number | null; opening: number }> {
    try {
        const params: Record<string, any> = { item_name: itemName };
        if (firmId) {
            params.firm_id = firmId;
        } else if (firmName) {
            params.firm_name = firmName;
        }

        const data: any[] = await storeApi.fetch('inventory', params);
        const record = data?.[0];
        return { id: record?.id ?? null, opening: record ? Number(record.opening) || 0 : 0 };
    } catch {
        return { id: null, opening: 0 };
    }
}

export async function addItemToInventory(input: InventoryItemInput): Promise<{ success: boolean; error?: any }> {
    try {
        const quantityToAdd = toNumber(input.quantity);

        if (quantityToAdd <= 0) {
            return { success: false, error: new Error('Quantity must be greater than 0') };
        }

        if (!input.firmId && !input.inventoryRecordId) {
            return { success: false, error: new Error('Project ID is required for inventory') };
        }

        let resolvedRecord: any = null;

        if (input.inventoryRecordId) {
            resolvedRecord = await storeApi.fetchById('inventory', input.inventoryRecordId);
        } else {
            const records: any[] = await storeApi.fetch('inventory', {
                item_name: input.itemName,
                firm_id: input.firmId!,
            });
            resolvedRecord = records?.[0] || null;
        }

        if (resolvedRecord) {
            const rate = toNumber(resolvedRecord.individual_rate);
            const existingOpening = toNumber(resolvedRecord.opening);
            const existingCurrent = toNumber(resolvedRecord.current);
            const newOpening = existingOpening + quantityToAdd;
            const newCurrent = existingCurrent + quantityToAdd;

            await storeApi.update('inventory', resolvedRecord.id, {
                group_head: input.groupHead || resolvedRecord.group_head,
                uom: input.uom || resolvedRecord.uom || '',
                opening: toTextNumber(newOpening),
                current: toTextNumber(newCurrent),
                total_price: toTextNumber(newOpening * rate),
                color_code: getInventoryStatus(newCurrent),
                firm_name: input.firmName || resolvedRecord.firm_name || '',
                firm_id: input.firmId || resolvedRecord.firm_id || null,
            });
        } else {
            const payload = {
                item_name: input.itemName,
                group_head: input.groupHead,
                uom: input.uom || '',
                max_level: null,
                opening: toTextNumber(quantityToAdd),
                individual_rate: '0',
                indented: '0',
                approved: '0',
                purchase_quantity: '0',
                out_quantity: '0',
                current: toTextNumber(quantityToAdd),
                total_price: '0',
                color_code: getInventoryStatus(quantityToAdd),
                received_quantity: '0',
                return_quantity: '0',
                request_quantity: '0',
                firm_name: input.firmName || '',
                firm_id: input.firmId || null,
            };

            await storeApi.insert('inventory', payload);
        }

        return { success: true };
    } catch (error) {
        console.error('Error adding item to inventory:', error);
        return { success: false, error };
    }
}
