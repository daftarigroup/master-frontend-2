import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pill } from '../ui/pill';
import {
    FileSpreadsheet,
    CheckSquare,
    Square,
    Search,
    Columns,
    Layers,
    RotateCcw,
    Check
} from 'lucide-react';
import type { InventoryRecord } from '@/services/inventoryService';
import type { InventorySheet } from '@/types/sheets';
import {
    ALL_EXPORT_COLUMNS,
    exportInventoryToExcel
} from '@/lib/exportInventoryToExcel';

interface InventoryExportModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tableData: InventoryRecord[];
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

export const InventoryExportModal: React.FC<InventoryExportModalProps> = ({
    open,
    onOpenChange,
    tableData,
    partyFilteredIndents,
    partyFilteredStoreIns,
    partyFilteredIssues,
    partyFilteredTransfers,
    inventorySheet,
    poMasterSheet,
    selectedProjectId,
    selectedParty,
    projectName
}) => {
    // Selected columns state (column IDs)
    const [selectedColKeys, setSelectedColKeys] = useState<string[]>(() =>
        ALL_EXPORT_COLUMNS.map(c => c.id)
    );

    // Selected rows state (Set of itemNames)
    const [selectedItemNames, setSelectedItemNames] = useState<Set<string>>(() =>
        new Set(tableData.map(item => item.itemName))
    );

    // Search filter for rows
    const [searchQuery, setSearchQuery] = useState('');
    const [isExporting, setIsExporting] = useState(false);

    // Only re-initialize selection when the modal transitions from closed to open
    const wasOpenRef = useRef(false);
    useEffect(() => {
        if (open && !wasOpenRef.current) {
            setSelectedItemNames(new Set(tableData.map(item => item.itemName)));
            setSelectedColKeys(ALL_EXPORT_COLUMNS.map(c => c.id));
            setSearchQuery('');
        }
        wasOpenRef.current = open;
    }, [open]);

    // Filtered rows based on search query
    const filteredRows = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return tableData;
        return tableData.filter(i =>
            (i.itemName || '').toLowerCase().includes(q) ||
            (i.groupHead || '').toLowerCase().includes(q) ||
            (i.uom || '').toLowerCase().includes(q)
        );
    }, [tableData, searchQuery]);

    // Transaction vs Info Columns definitions
    const transactionColIds = useMemo(() =>
        new Set(ALL_EXPORT_COLUMNS.filter(c => c.category === 'transaction').map(c => c.id)),
        []
    );

    const infoColIds = useMemo(() =>
        new Set(ALL_EXPORT_COLUMNS.filter(c => c.category === 'info' || c.category === 'metric').map(c => c.id)),
        []
    );

    // Column Handlers (Explicit boolean & Toggle)
    const handleSetCol = (colId: string, checked: boolean) => {
        if (colId === 'itemName') return; // Item Name is required as primary key
        setSelectedColKeys(prev => {
            const has = prev.includes(colId);
            if (checked && !has) return [...prev, colId];
            if (!checked && has) return prev.filter(k => k !== colId);
            return prev;
        });
    };

    const handleToggleCol = (colId: string) => {
        if (colId === 'itemName') return;
        setSelectedColKeys(prev =>
            prev.includes(colId) ? prev.filter(k => k !== colId) : [...prev, colId]
        );
    };

    // Quick Column Actions
    const handleSelectAllCols = () => {
        setSelectedColKeys(ALL_EXPORT_COLUMNS.map(c => c.id));
    };

    const handleDeselectAllCols = () => {
        // Keep itemName always selected
        setSelectedColKeys(['itemName']);
    };

    const handleSelectTransactionColsOnly = () => {
        setSelectedColKeys(['itemName', ...Array.from(transactionColIds)]);
    };

    const handleSelectMainInfoColsOnly = () => {
        setSelectedColKeys(Array.from(infoColIds));
    };

    // Row Handlers (Explicit boolean & Toggle)
    const handleSetRow = (itemName: string, checked: boolean) => {
        setSelectedItemNames(prev => {
            const next = new Set(prev);
            if (checked) {
                next.add(itemName);
            } else {
                next.delete(itemName);
            }
            return next;
        });
    };

    const handleToggleRow = (itemName: string) => {
        setSelectedItemNames(prev => {
            const next = new Set(prev);
            if (next.has(itemName)) {
                next.delete(itemName);
            } else {
                next.add(itemName);
            }
            return next;
        });
    };

    // Master row checkbox state
    const allFilteredSelected = useMemo(() => {
        if (filteredRows.length === 0) return false;
        return filteredRows.every(r => selectedItemNames.has(r.itemName));
    }, [filteredRows, selectedItemNames]);

    const someFilteredSelected = useMemo(() => {
        return filteredRows.some(r => selectedItemNames.has(r.itemName));
    }, [filteredRows, selectedItemNames]);

    const handleToggleAllRows = () => {
        if (allFilteredSelected) {
            // Deselect all visible
            setSelectedItemNames(prev => {
                const next = new Set(prev);
                filteredRows.forEach(r => next.delete(r.itemName));
                return next;
            });
        } else {
            // Select all visible
            setSelectedItemNames(prev => {
                const next = new Set(prev);
                filteredRows.forEach(r => next.add(r.itemName));
                return next;
            });
        }
    };

    const handleSelectAllRowsGlobal = () => {
        setSelectedItemNames(new Set(tableData.map(i => i.itemName)));
    };

    const handleDeselectAllRowsGlobal = () => {
        setSelectedItemNames(new Set());
    };

    // Execute Export
    const handleExecuteExport = () => {
        if (selectedItemNames.size === 0 || selectedColKeys.length === 0) return;

        // Filter tableData to only selected rows
        const filteredTableData = tableData.filter(item =>
            selectedItemNames.has(item.itemName)
        );

        setIsExporting(true);
        setTimeout(() => {
            try {
                const success = exportInventoryToExcel({
                    tableData: filteredTableData,
                    selectedColumnKeys: selectedColKeys,
                    partyFilteredIndents,
                    partyFilteredStoreIns,
                    partyFilteredIssues,
                    partyFilteredTransfers,
                    inventorySheet,
                    poMasterSheet,
                    selectedProjectId,
                    selectedParty,
                    projectName
                });

                if (success) {
                    onOpenChange(false);
                }
            } finally {
                setIsExporting(false);
            }
        }, 50);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[96vw] xl:max-w-7xl h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl border shadow-2xl">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 p-4 sm:p-5 text-white shrink-0">
                    <DialogHeader className="space-y-1">
                        <DialogTitle className="flex items-center gap-2.5 text-lg sm:text-xl font-bold text-white">
                            <FileSpreadsheet className="size-6 text-emerald-200" />
                            <span>Export Inventory to Excel (.xlsx)</span>
                        </DialogTitle>
                        <DialogDescription className="text-emerald-100 text-xs sm:text-sm">
                            Select or deselect rows and columns directly in the table below to customize your export.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                {/* Toolbar Controls */}
                <div className="p-3 sm:p-4 bg-muted/20 border-b flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0">
                    {/* Search filter */}
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                        <Input
                            placeholder="Search rows by item name, group head, or UOM..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-9 pl-9 pr-14 text-xs sm:text-sm rounded-xl bg-background"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground font-medium cursor-pointer"
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    {/* Quick selection toolbars */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Column Quick Select */}
                        <div className="flex items-center gap-1.5 bg-background border rounded-xl p-1 shadow-2xs text-xs">
                            <span className="text-[11px] font-semibold text-muted-foreground px-2 flex items-center gap-1">
                                <Columns className="size-3.5 text-emerald-600" />
                                <span>Columns:</span>
                            </span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleSelectAllCols();
                                }}
                                className="h-7 px-2.5 text-xs font-semibold rounded-lg hover:bg-muted cursor-pointer"
                                title="Select all columns"
                            >
                                All ({ALL_EXPORT_COLUMNS.length})
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleSelectTransactionColsOnly();
                                }}
                                className="h-7 px-2.5 text-xs font-semibold rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer"
                                title="Select transaction drill-down columns only"
                            >
                                <Layers className="size-3 mr-1" />
                                Transactions Only
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleSelectMainInfoColsOnly();
                                }}
                                className="h-7 px-2.5 text-xs font-semibold rounded-lg text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
                                title="Select general info columns only"
                            >
                                Info Only
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleDeselectAllCols();
                                }}
                                className="h-7 px-2.5 text-xs font-semibold rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                                title="Reset columns to Item Name only"
                            >
                                <RotateCcw className="size-3 mr-1" />
                                Reset
                            </Button>
                        </div>

                        {/* Row Quick Select */}
                        <div className="flex items-center gap-1.5 bg-background border rounded-xl p-1 shadow-2xs text-xs">
                            <span className="text-[11px] font-semibold text-muted-foreground px-2">
                                Rows:
                            </span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleSelectAllRowsGlobal();
                                }}
                                className="h-7 px-2.5 text-xs font-semibold rounded-lg text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
                            >
                                <CheckSquare className="size-3 mr-1" />
                                All ({tableData.length})
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleDeselectAllRowsGlobal();
                                }}
                                className="h-7 px-2.5 text-xs font-semibold rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                                <Square className="size-3 mr-1" />
                                Deselect All
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Interactive Table Container */}
                <div className="flex-1 overflow-auto bg-background relative border-b">
                    <table className="w-full text-xs border-collapse">
                        {/* Column Header Checkboxes */}
                        <thead className="sticky top-0 z-30 bg-muted/95 backdrop-blur-xs border-b shadow-xs">
                            <tr className="divide-x divide-border/60">
                                {/* Row Selection Master Corner Header */}
                                <th
                                    onClick={handleToggleAllRows}
                                    className="sticky left-0 z-40 bg-muted/95 backdrop-blur-xs p-2.5 text-center w-12 min-w-[48px] select-none border-r border-border/80 cursor-pointer hover:bg-muted"
                                    title="Toggle all visible rows"
                                >
                                    <div
                                        className="flex items-center justify-center"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <Checkbox
                                            checked={allFilteredSelected ? true : someFilteredSelected ? 'indeterminate' : false}
                                            onCheckedChange={handleToggleAllRows}
                                            className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 cursor-pointer"
                                            aria-label="Select all rows"
                                        />
                                    </div>
                                </th>

                                {/* Index / Row # header */}
                                <th className="sticky left-12 z-40 bg-muted/95 backdrop-blur-xs p-2 text-center w-12 min-w-[48px] font-bold text-muted-foreground select-none border-r border-border/80">
                                    #
                                </th>

                                {/* Dynamic Column Headers with Checkboxes */}
                                {ALL_EXPORT_COLUMNS.map((col) => {
                                    const isColSelected = selectedColKeys.includes(col.id);
                                    const isRequired = col.id === 'itemName';
                                    const isTx = col.category === 'transaction';

                                    return (
                                        <th
                                            key={col.id}
                                            onClick={() => !isRequired && handleToggleCol(col.id)}
                                            style={{ minWidth: `${Math.max(col.wch * 8.5, 90)}px` }}
                                            className={`p-2.5 text-left font-semibold transition-colors select-none ${
                                                isRequired
                                                    ? 'sticky left-24 z-40 bg-muted/95 backdrop-blur-xs border-r border-border/80 cursor-default'
                                                    : 'cursor-pointer'
                                            } ${
                                                isColSelected
                                                    ? isTx
                                                        ? 'bg-blue-50/70 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200 hover:bg-blue-100/70'
                                                        : 'bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200 hover:bg-emerald-100/60'
                                                    : 'bg-muted/40 text-muted-foreground/60 hover:bg-muted/70 opacity-60'
                                            }`}
                                            title={isRequired ? 'Item Name is required as the primary key' : `Click to ${isColSelected ? 'deselect' : 'select'} ${col.label} column`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="shrink-0"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Checkbox
                                                        id={`th-col-${col.id}`}
                                                        checked={isColSelected}
                                                        disabled={isRequired}
                                                        onCheckedChange={(val) => !isRequired && handleSetCol(col.id, !!val)}
                                                        className={`cursor-pointer ${
                                                            isTx
                                                                ? 'data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600'
                                                                : 'data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600'
                                                        }`}
                                                    />
                                                </div>
                                                <div className="flex flex-col min-w-0 flex-1 leading-tight">
                                                    <span className={`truncate text-xs font-bold ${!isColSelected ? 'line-through text-muted-foreground/50' : ''}`}>
                                                        {col.label}
                                                    </span>
                                                    {isTx ? (
                                                        <span className="text-[9px] text-blue-600 dark:text-blue-400 font-mono font-normal">
                                                            drill-down
                                                        </span>
                                                    ) : isRequired ? (
                                                        <span className="text-[9px] text-emerald-700 dark:text-emerald-400 font-normal">
                                                            Required
                                                        </span>
                                                    ) : (
                                                        <span className="text-[9px] text-muted-foreground font-normal capitalize">
                                                            {col.formatType}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>

                        {/* Table Body */}
                        <tbody className="divide-y divide-border/60">
                            {filteredRows.length > 0 ? (
                                filteredRows.map((item, idx) => {
                                    const isRowSelected = selectedItemNames.has(item.itemName);
                                    const statusCode = (item.status || '').toLowerCase();

                                    return (
                                        <tr
                                            key={item.itemName}
                                            className={`divide-x divide-border/40 transition-colors ${
                                                isRowSelected
                                                    ? 'hover:bg-muted/30'
                                                    : 'opacity-40 bg-muted/20 hover:opacity-75'
                                            }`}
                                        >
                                            {/* Row Checkbox (Sticky Left) */}
                                            <td
                                                onClick={() => handleToggleRow(item.itemName)}
                                                className={`sticky left-0 z-20 p-2 text-center w-12 cursor-pointer border-r border-border/80 ${
                                                    isRowSelected
                                                        ? 'bg-background hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20'
                                                        : 'bg-muted/30'
                                                }`}
                                            >
                                                <div
                                                    className="flex items-center justify-center"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Checkbox
                                                        checked={isRowSelected}
                                                        onCheckedChange={(val) => handleSetRow(item.itemName, !!val)}
                                                        className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 cursor-pointer"
                                                        aria-label={`Select row ${item.itemName}`}
                                                    />
                                                </div>
                                            </td>

                                            {/* Row Index # */}
                                            <td className="sticky left-12 z-20 p-2 text-center w-12 text-[11px] font-mono text-muted-foreground bg-background border-r border-border/80 select-none">
                                                {idx + 1}
                                            </td>

                                            {/* Row Data Cells */}
                                            {ALL_EXPORT_COLUMNS.map((col) => {
                                                const isColSelected = selectedColKeys.includes(col.id);
                                                const isRequired = col.id === 'itemName';
                                                const val = (item as any)[col.field];

                                                let cellContent: React.ReactNode = '-';
                                                if (col.id === 'status') {
                                                    cellContent = (item.current || 0) === 0 ? (
                                                        <Pill variant="reject">Out</Pill>
                                                    ) : statusCode === 'red' ? (
                                                        <Pill variant="pending">Low</Pill>
                                                    ) : (
                                                        <Pill variant="secondary">In Stock</Pill>
                                                    );
                                                } else if (col.formatType === 'currency') {
                                                    const num = Number(val) || 0;
                                                    cellContent = num !== 0 ? `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '₹0';
                                                } else if (col.formatType === 'number') {
                                                    const num = Number(val) || 0;
                                                    cellContent = num !== 0 ? num.toLocaleString('en-IN') : '0';
                                                } else {
                                                    cellContent = val || '-';
                                                }

                                                return (
                                                    <td
                                                        key={col.id}
                                                        className={`p-2.5 text-xs transition-opacity ${
                                                            isRequired
                                                                ? 'sticky left-24 z-20 bg-background font-semibold text-foreground border-r border-border/80 max-w-[240px] truncate'
                                                                : ''
                                                        } ${
                                                            !isColSelected
                                                                ? 'opacity-30 bg-muted/15 text-muted-foreground/50'
                                                                : col.category === 'transaction' && Number(val) > 0
                                                                ? 'font-bold text-blue-600 dark:text-blue-400'
                                                                : 'text-foreground'
                                                        } ${
                                                            col.formatType === 'number' || col.formatType === 'currency'
                                                                ? 'text-right'
                                                                : 'text-left'
                                                        }`}
                                                        title={String(val ?? '')}
                                                    >
                                                        {cellContent}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td
                                        colSpan={ALL_EXPORT_COLUMNS.length + 2}
                                        className="p-12 text-center text-muted-foreground text-sm italic"
                                    >
                                        No inventory rows match your search query "{searchQuery}"
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Controls & Live Export Summary */}
                <DialogFooter className="p-3.5 sm:p-4 bg-muted/20 border-t flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                    <div className="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm">
                        <span className="text-muted-foreground font-medium">Export Scope:</span>
                        <div className="inline-flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800 shadow-2xs">
                            <Check className="size-4 text-emerald-600" />
                            <span>{selectedItemNames.size} of {tableData.length} rows</span>
                            <span className="text-emerald-400">•</span>
                            <span>{selectedColKeys.length} of {ALL_EXPORT_COLUMNS.length} columns</span>
                        </div>
                        {selectedItemNames.size === 0 && (
                            <span className="text-red-500 font-medium text-xs">
                                (Please select at least 1 row)
                            </span>
                        )}
                        {selectedColKeys.length === 0 && (
                            <span className="text-red-500 font-medium text-xs">
                                (Please select at least 1 column)
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2.5 w-full sm:w-auto">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="rounded-xl h-9 sm:h-10 px-4 text-xs sm:text-sm flex-1 sm:flex-initial cursor-pointer"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleExecuteExport}
                            disabled={selectedItemNames.size === 0 || selectedColKeys.length === 0 || isExporting}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl h-9 sm:h-10 px-5 text-xs sm:text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 flex-1 sm:flex-initial cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <FileSpreadsheet className="size-4" />
                            <span>{isExporting ? 'Generating Excel...' : 'Download Excel (.xlsx)'}</span>
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
