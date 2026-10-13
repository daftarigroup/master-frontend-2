import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { InventoryRecord } from '@/services/inventoryService';
import type { InventorySheet } from '@/types/sheets';
import {
    createInventoryResolutionContext,
    resolveInventoryTransactionDetails
} from './inventoryUtils';

export interface ExportColumnConfig {
    id: string;
    label: string;
    field: string;
    isTransaction?: boolean;
    formatType: 'text' | 'number' | 'currency';
    wch: number;
    category: 'info' | 'transaction' | 'metric';
}

export const ALL_EXPORT_COLUMNS: ExportColumnConfig[] = [
    { id: 'itemName', label: 'Item', field: 'itemName', formatType: 'text', wch: 32, category: 'info' },
    { id: 'groupHead', label: 'Group Head', field: 'groupHead', formatType: 'text', wch: 22, category: 'info' },
    { id: 'uom', label: 'UOM', field: 'uom', formatType: 'text', wch: 10, category: 'info' },
    { id: 'status', label: 'Status', field: 'status', formatType: 'text', wch: 14, category: 'info' },
    { id: 'indented', label: 'Indented', field: 'indented', isTransaction: true, formatType: 'number', wch: 12, category: 'transaction' },
    { id: 'approved', label: 'Approved', field: 'approved', isTransaction: true, formatType: 'number', wch: 12, category: 'transaction' },
    { id: 'purchaseReturn', label: 'Purchase Return', field: 'purchaseReturn', isTransaction: true, formatType: 'number', wch: 16, category: 'transaction' },
    { id: 'liftingQty', label: 'Lifting Quantity', field: 'liftingQty', isTransaction: true, formatType: 'number', wch: 16, category: 'transaction' },
    { id: 'inTransit', label: 'In Transit', field: 'inTransit', isTransaction: true, formatType: 'number', wch: 12, category: 'transaction' },
    { id: 'issueReturn', label: 'Issue Return', field: 'issueReturn', isTransaction: true, formatType: 'number', wch: 14, category: 'transaction' },
    { id: 'outQuantity', label: 'Issued', field: 'outQuantity', isTransaction: true, formatType: 'number', wch: 12, category: 'transaction' },
    { id: 'stockTransferGiven', label: 'S.T. To', field: 'stockTransferGiven', isTransaction: true, formatType: 'number', wch: 12, category: 'transaction' },
    { id: 'stockTransferReceiving', label: 'S.T. From', field: 'stockTransferReceiving', isTransaction: true, formatType: 'number', wch: 12, category: 'transaction' },
    { id: 'current', label: 'Quantity', field: 'current', formatType: 'number', wch: 12, category: 'metric' },
    { id: 'avgPrice', label: 'Avg Price', field: 'avgPrice', formatType: 'currency', wch: 14, category: 'metric' },
    { id: 'totalPrice', label: 'Total Price', field: 'totalPrice', formatType: 'currency', wch: 16, category: 'metric' },
];

export interface TransactionSheetDef {
    key: string;               // column key in ALL_EXPORT_COLUMNS (e.g. 'liftingQty')
    colHeader: string;         // column header in Inventory (e.g. 'Lifting Quantity')
    sheetName: string;         // dedicated sheet name (e.g. 'Lifting Details')
    type: string;              // transaction type passed to resolveInventoryTransactionDetails (e.g. 'Lifting Quantity')
    field: string;             // field on InventoryRecord (e.g. 'liftingQty')
}

export const TRANSACTION_SHEET_DEFS: TransactionSheetDef[] = [
    { key: 'indented', colHeader: 'Indented', sheetName: 'Indent Details', type: 'Indented', field: 'indented' },
    { key: 'approved', colHeader: 'Approved', sheetName: 'Approval Details', type: 'Approved', field: 'approved' },
    { key: 'purchaseReturn', colHeader: 'Purchase Return', sheetName: 'Purchase Return', type: 'Purchase Return', field: 'purchaseReturn' },
    { key: 'liftingQty', colHeader: 'Lifting Quantity', sheetName: 'Lifting Details', type: 'Lifting Quantity', field: 'liftingQty' },
    { key: 'inTransit', colHeader: 'In Transit', sheetName: 'Transit Details', type: 'In Transit', field: 'inTransit' },
    { key: 'issueReturn', colHeader: 'Issue Return', sheetName: 'Issue Return', type: 'Issue Return', field: 'issueReturn' },
    { key: 'outQuantity', colHeader: 'Issued', sheetName: 'Issue Details', type: 'Issued', field: 'outQuantity' },
    { key: 'stockTransferGiven', colHeader: 'S.T. To', sheetName: 'Transfer To', type: 'Stock Transfer Given', field: 'stockTransferGiven' },
    { key: 'stockTransferReceiving', colHeader: 'S.T. From', sheetName: 'Transfer From', type: 'Stock Transfer Receiving', field: 'stockTransferReceiving' },
];

export interface ExportInventoryExcelParams {
    tableData: InventoryRecord[];
    selectedColumnKeys?: string[];
    partyFilteredIndents?: any[];
    partyFilteredStoreIns?: any[];
    partyFilteredIssues?: any[];
    partyFilteredTransfers?: any[];
    inventorySheet?: InventorySheet[];
    poMasterSheet?: any[];
    selectedProjectId?: string;
    selectedParty?: string;
    projectName?: string;
}

const PRODUCT_SECTION_HEADERS = [
    'Date',
    'Reference',
    'Party / Person',
    'Project',
    'Site Location',
    'Qty',
    'Rate',
    'Amount',
    'Navigate'
];

function formatDisplayDate(dateVal: any, isLifting: boolean): string {
    if (!dateVal) return 'N/A';
    const dStr = String(dateVal).trim();
    if (!dStr || dStr.toLowerCase() === 'null' || dStr.toLowerCase() === 'undefined' || dStr === '-' || dStr.toLowerCase() === 'n/a') {
        return 'N/A';
    }
    if (dStr.includes('/') && !dStr.includes('T')) return dStr;
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return dStr;
    return format(d, isLifting ? 'dd/MM/yyyy' : 'dd/MM/yyyy HH:mm');
}

function getStatusLabel(item: any): string {
    const code = (item.status || '').toLowerCase();
    if ((item.current || 0) === 0) return 'Out of Stock';
    if (code === 'red') return 'Low Stock';
    if (code === 'purple') return 'Excess';
    return 'In Stock';
}

function round2(val: number): number {
    return Math.round((val + Number.EPSILON) * 100) / 100;
}

interface SheetBuilder {
    def: TransactionSheetDef;
    sheetName: string;
    rows: any[][];
    hyperlinks: { cellRef: string; targetSheet: string; targetCell: string; tooltip: string }[];
    productCount: number;
    totalRecordCount: number;
}

export function exportInventoryToExcel(params: ExportInventoryExcelParams): boolean {
    const {
        tableData,
        selectedColumnKeys,
        partyFilteredIndents = [],
        partyFilteredStoreIns = [],
        partyFilteredIssues = [],
        partyFilteredTransfers = [],
        inventorySheet = [],
        poMasterSheet = [],
        selectedProjectId = 'All',
        selectedParty = 'All',
        projectName = 'All Projects'
    } = params;

    if (!tableData || tableData.length === 0) {
        toast.error("No inventory data to export");
        return false;
    }

    try {
        // Resolve active columns based on user selection
        const activeColumns = (selectedColumnKeys && selectedColumnKeys.length > 0)
            ? ALL_EXPORT_COLUMNS.filter(col => selectedColumnKeys.includes(col.id))
            : ALL_EXPORT_COLUMNS;

        if (activeColumns.length === 0) {
            toast.error("Please select at least one column to export");
            return false;
        }

        // Step 1: Pre-index all transaction data for O(1) lookups during batch export
        const context = createInventoryResolutionContext(
            partyFilteredIndents,
            partyFilteredStoreIns,
            partyFilteredIssues,
            partyFilteredTransfers,
            poMasterSheet,
            inventorySheet
        );

        // Step 2: Build Inventory Sheet data rows
        const invRows: any[][] = [activeColumns.map(c => c.label)];

        tableData.forEach((item) => {
            const rowData = activeColumns.map(col => {
                if (col.id === 'status') {
                    return getStatusLabel(item);
                }
                if (col.formatType === 'number' || col.formatType === 'currency') {
                    return Number((item as any)[col.field] || 0);
                }
                return String((item as any)[col.field] || '');
            });
            invRows.push(rowData);
        });

        // Add Summary Total row at the bottom of Inventory sheet
        const totalRow = activeColumns.map(col => {
            if (col.id === 'itemName') return 'TOTAL';
            if (col.id === 'avgPrice') return '';
            if (col.formatType === 'number' || col.formatType === 'currency') {
                const sum = tableData.reduce((acc, i) => acc + (Number((i as any)[col.field]) || 0), 0);
                return round2(sum);
            }
            return '';
        });
        invRows.push(totalRow);

        // Step 3: Initialize dedicated Sheet Builders for each active transaction type
        const activeTxDefs = TRANSACTION_SHEET_DEFS.filter(def =>
            activeColumns.some(c => c.id === def.key)
        );

        const txBuilders: Map<string, SheetBuilder> = new Map();
        activeTxDefs.forEach(def => {
            txBuilders.set(def.key, {
                def,
                sheetName: def.sheetName,
                rows: [],
                hyperlinks: [],
                productCount: 0,
                totalRecordCount: 0
            });
        });

        // Step 4: Populate Product Sections inside each Transaction Sheet & construct index
        const invHyperlinks: { cellRef: string; targetSheet: string; targetCell: string; tooltip: string }[] = [];

        tableData.forEach((item, itemIdx) => {
            const invRowNumber = itemIdx + 2; // Row 1 is header, data starts at Row 2

            activeTxDefs.forEach((txDef) => {
                const builder = txBuilders.get(txDef.key);
                if (!builder) return;

                const activeColIndex = activeColumns.findIndex(c => c.id === txDef.key);
                if (activeColIndex === -1) return;

                const cellValue = Number((item as any)[txDef.field] || 0);

                // Only generate drill-down section if item has non-zero transaction value
                if (cellValue > 0) {
                    const records = resolveInventoryTransactionDetails({
                        type: txDef.type,
                        itemName: item.itemName,
                        partyFilteredIndents,
                        partyFilteredStoreIns,
                        partyFilteredIssues,
                        partyFilteredTransfers,
                        inventorySheet,
                        poMasterSheet,
                        selectedProjectId,
                        selectedParty,
                        context
                    });

                    if (records.length > 0) {
                        const sectionStartRow = builder.rows.length + 1; // 1-indexed Excel row
                        const colLetter = XLSX.utils.encode_col(activeColIndex);

                        // Hyperlink from Inventory cell to Product Section start in this transaction sheet
                        invHyperlinks.push({
                            cellRef: `${colLetter}${invRowNumber}`,
                            targetSheet: builder.sheetName,
                            targetCell: `A${sectionStartRow}`,
                            tooltip: `Click to view ${item.itemName} (${records.length} records in ${builder.sheetName})`
                        });

                        // 1. Product Section Banner Row
                        const bannerRowIndex = builder.rows.length + 1;
                        builder.rows.push([
                            `Product: ${item.itemName}`,
                            `Transaction: ${txDef.colHeader}`,
                            '',
                            '',
                            '',
                            '',
                            '',
                            '',
                            '↑ Back to Inventory'
                        ]);
                        builder.hyperlinks.push({
                            cellRef: `I${bannerRowIndex}`,
                            targetSheet: 'Inventory',
                            targetCell: `A${invRowNumber}`,
                            tooltip: `Back to ${item.itemName} in Inventory`
                        });

                        // 2. Table Header Row for this section
                        builder.rows.push(PRODUCT_SECTION_HEADERS);

                        // 3. Detail Data Rows
                        const isLifting = txDef.type === 'Lifting Quantity';
                        records.forEach((record) => {
                            const curRowIndex = builder.rows.length + 1;
                            const displayDate = formatDisplayDate(record.date, isLifting);

                            builder.rows.push([
                                displayDate,
                                record.refNo || 'N/A',
                                record.party || 'N/A',
                                record.projectName || 'N/A',
                                record.siteLocation || 'N/A',
                                Number(record.quantity || 0),
                                Number(record.rate || 0),
                                Number(record.amount || 0),
                                '↑ Back to Inventory'
                            ]);

                            builder.hyperlinks.push({
                                cellRef: `I${curRowIndex}`,
                                targetSheet: 'Inventory',
                                targetCell: `A${invRowNumber}`,
                                tooltip: `Back to ${item.itemName} in Inventory`
                            });
                        });

                        // 4. Section Summary / Subtotal Row
                        const subtotalRowIndex = builder.rows.length + 1;
                        const subtotalQty = records.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
                        const subtotalAmount = records.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
                        const weightedAvgRate = subtotalQty > 0 ? (subtotalAmount / subtotalQty) : 0;

                        builder.rows.push([
                            `Total (${item.itemName})`,
                            '',
                            '',
                            '',
                            '',
                            round2(subtotalQty),
                            round2(weightedAvgRate),
                            round2(subtotalAmount),
                            '↑ Back to Inventory'
                        ]);

                        builder.hyperlinks.push({
                            cellRef: `I${subtotalRowIndex}`,
                            targetSheet: 'Inventory',
                            targetCell: `A${invRowNumber}`,
                            tooltip: `Back to ${item.itemName} in Inventory`
                        });

                        // 5. Blank separator row between product sections
                        builder.rows.push(['', '', '', '', '', '', '', '', '']);

                        builder.productCount += 1;
                        builder.totalRecordCount += records.length;
                    }
                }
            });
        });

        // Step 5: Convert Inventory array to worksheet and attach hyperlinks
        const wsInv = XLSX.utils.aoa_to_sheet(invRows);

        invHyperlinks.forEach((link) => {
            if (wsInv[link.cellRef]) {
                wsInv[link.cellRef].l = {
                    Target: `#'${link.targetSheet}'!${link.targetCell}`,
                    Tooltip: link.tooltip
                };
            }
        });

        // Apply Number & Currency Formatting to Inventory Sheet
        const totalInvRows = invRows.length;
        for (let r = 2; r <= totalInvRows; r++) {
            activeColumns.forEach((col, cIdx) => {
                const colLetter = XLSX.utils.encode_col(cIdx);
                const cell = wsInv[`${colLetter}${r}`];
                if (cell && cell.t === 'n') {
                    if (col.formatType === 'currency') {
                        cell.z = '"₹"#,##0.00';
                    } else if (col.formatType === 'number') {
                        cell.z = '#,##0.00';
                    }
                }
            });
        }

        wsInv['!cols'] = activeColumns.map(c => ({ wch: c.wch }));
        const lastColLetter = XLSX.utils.encode_col(activeColumns.length - 1);
        wsInv['!autofilter'] = { ref: `A1:${lastColLetter}${totalInvRows - 1}` };
        wsInv['!views'] = [{ state: 'frozen', xSplit: 1, ySplit: 1 }];

        // Step 6: Assemble Workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, wsInv, 'Inventory');

        // Step 7: Convert each Transaction Sheet Builder into worksheet and append
        activeTxDefs.forEach((txDef) => {
            const builder = txBuilders.get(txDef.key);
            if (!builder) return;

            // If no products had records for this transaction type, add a friendly placeholder
            if (builder.rows.length === 0) {
                builder.rows.push([
                    `No ${txDef.colHeader} records found for the current selection.`,
                    '', '', '', '', '', '', '',
                    '↑ Back to Inventory'
                ]);
                builder.hyperlinks.push({
                    cellRef: 'I1',
                    targetSheet: 'Inventory',
                    targetCell: 'A1',
                    tooltip: 'Back to Inventory'
                });
            }

            const wsTx = XLSX.utils.aoa_to_sheet(builder.rows);

            // Attach bidirectional return hyperlinks
            builder.hyperlinks.forEach((link) => {
                if (wsTx[link.cellRef]) {
                    wsTx[link.cellRef].l = {
                        Target: `#'${link.targetSheet}'!${link.targetCell}`,
                        Tooltip: link.tooltip
                    };
                }
            });

            // Format Numeric / Currency Columns on Transaction Sheet (Qty: F, Rate: G, Amount: H)
            const totalTxRows = builder.rows.length;
            for (let r = 1; r <= totalTxRows; r++) {
                const qCell = wsTx[`F${r}`];
                if (qCell && qCell.t === 'n') {
                    qCell.z = '#,##0.00';
                }

                const rCell = wsTx[`G${r}`];
                if (rCell && rCell.t === 'n') {
                    rCell.z = '"₹"#,##0.00';
                }

                const aCell = wsTx[`H${r}`];
                if (aCell && aCell.t === 'n') {
                    aCell.z = '"₹"#,##0.00';
                }
            }

            // Set Column Widths for Transaction Sheet
            wsTx['!cols'] = [
                { wch: 18 }, // A: Date
                { wch: 16 }, // B: Reference
                { wch: 28 }, // C: Party / Person
                { wch: 24 }, // D: Project
                { wch: 20 }, // E: Site Location
                { wch: 12 }, // F: Qty
                { wch: 14 }, // G: Rate
                { wch: 16 }, // H: Amount
                { wch: 22 }, // I: Navigate
            ];

            XLSX.utils.book_append_sheet(wb, wsTx, builder.sheetName);
        });

        // Step 8: Generate filename and trigger download
        const safeProject = (projectName || selectedProjectId || 'All').replace(/[^a-zA-Z0-9_-]/g, '_');
        const safeParty = (selectedParty && selectedParty !== 'All')
            ? `_${selectedParty.replace(/[^a-zA-Z0-9_-]/g, '_')}`
            : '';
        const dateStr = format(new Date(), 'yyyy-MM-dd');
        const filename = `Inventory_Report_${safeProject}${safeParty}_${dateStr}.xlsx`;

        XLSX.writeFile(wb, filename);

        const totalSheetsCreated = 1 + activeTxDefs.length;
        toast.success(`Inventory exported successfully (${tableData.length} items across ${totalSheetsCreated} sheets)`);
        return true;
    } catch (err: any) {
        console.error("Excel Export Error:", err);
        toast.error(`Export failed: ${err.message || 'Unknown error'}`);
        return false;
    }
}
