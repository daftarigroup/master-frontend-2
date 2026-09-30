import { Package2, Trash2 } from 'lucide-react';
import Heading from '../element/Heading';
import { useEffect, useState, useCallback } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import DataTable from '../element/DataTable';
import { Pill } from '../ui/pill';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useAuth } from '@/context/AuthContext';
import { useProject } from '@/context/ProjectContext';
import { apiClient } from '@/lib/apiClient';
import { hasNoFirmAccess, normalizeFirmAccess } from '@/lib/firmAccess';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { resetPoStage } from '@/services/poService';
import { openPoPdfPreview, type PoFilterContext } from '@/lib/poPdfUtils';
import { canDeleteStoreStage } from '@/lib/roleAccess';
import StageDeleteDialog from '../element/StageDeleteDialog';

interface HistoryData {
    poNumber: string;
    poCopy: string;
    vendorName: string;
    preparedBy: string;
    approvedBy: string;
    totalAmount: number;
    status: 'Revised' | 'Not Received' | 'Received';
    timestamp: string;
    /** Composite-key disambiguators for duplicate PO numbers */
    firmId?: number | null;
    firmName?: string;
    indentNumber?: string;
}

interface POMasterRecord {
    approvedBy?: string;
    pdf?: string;
    poNumber?: string;
    preparedBy?: string;
    totalPoAmount?: string | number;
    partyName?: string;
    firmNameMatch?: string;
}

interface IndentRecord {
    poNumber?: string;
}

interface ReceivedRecord {
    poNumber?: string;
}

/**
 * Compares PO numbers in descending serial order (e.g. 26-27/49 > 26-27/48 > 26-27/38 > ...)
 */
function comparePoNumbersDescending(poA?: string, poB?: string): number {
    const cleanA = (poA || '').trim();
    const cleanB = (poB || '').trim();

    if (!cleanA && !cleanB) return 0;
    if (!cleanA) return 1;
    if (!cleanB) return -1;

    // Pattern: [prefix/year/]<sequenceNumber> (e.g. "26-27/49", "PO-2026-0012", "123")
    const matchA = cleanA.match(/(?:.*\/)?(\d+)$/);
    const matchB = cleanB.match(/(?:.*\/)?(\d+)$/);

    if (matchA && matchB) {
        const numA = parseInt(matchA[1], 10);
        const numB = parseInt(matchB[1], 10);

        if (numA !== numB) {
            return numB - numA; // Higher numeric sequence comes first
        }
    }

    return cleanB.localeCompare(cleanA, undefined, { numeric: true, sensitivity: 'base' });
}

export default function Order() {
    const { user } = useAuth();
    const { effectivePermittedFirms } = useProject();
    const [historyData, setHistoryData] = useState<HistoryData[]>([]);
    const [dataLoading, setDataLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>('All');
    const [openingPo, setOpeningPo] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<HistoryData | null>(null);

    const handleOpenPdf = async (po: HistoryData) => {
        try {
            setOpeningPo(po.poNumber);
            // Build a disambiguation context from the row's firm and date so that
            // duplicate PO numbers (e.g. back-dated imports) resolve to the correct records.
            const context: PoFilterContext = {
                firmId: po.firmId ?? undefined,
                firmName: po.firmName || undefined,
                vendorName: po.vendorName || undefined,
                date: po.timestamp || undefined,
            };
            await openPoPdfPreview(po.poNumber, undefined, context);
        } catch (err) {
            console.error('Error opening PO PDF:', err);
            toast.error('Failed to open PO PDF');
        } finally {
            setOpeningPo(null);
        }
    };

    const fetchPOHistory = useCallback(async () => {
        try {
            setDataLoading(true);

            if (hasNoFirmAccess(effectivePermittedFirms)) {
                setHistoryData([]);
                setDataLoading(false);
                return;
            }

            const firms = normalizeFirmAccess(effectivePermittedFirms);
            const queryParams: Record<string, any> = {};

            if (firms) {
                const ids = firms.filter(f => /^\d+$/.test(f)).map(Number);
                const names = firms.filter(f => !/^\d+$/.test(f));
                if (ids.length > 0) {
                    queryParams['in__firm_id'] = ids.join(',');
                } else if (names.length > 0) {
                    queryParams['in__firm_name'] = names.join(',');
                }
            }

            const [poRes, indentRes, storeInRes]: any[] = await Promise.all([
                apiClient.get('/store/entity/po_master', { params: { ...queryParams, order: 'timestamp.desc', limit: 'all' } }),
                apiClient.get('/store/entity/indent', { params: { ...queryParams, neq__po_number: '', limit: 'all' } }),
                apiClient.get('/store/entity/store_in', { params: { ...queryParams, neq__po_number: '', limit: 'all' } }),
            ]);

            const poMasterData = poRes?.data || [];
            const indentData = indentRes?.data || [];
            const receivedData = storeInRes?.data || [];

            // Create sets for quick lookup
            const indentPoNumbers = new Set(
                (indentData || [])
                    .map((r: any) => r.po_number)
                    .filter(Boolean)
            );

            const receivedPoNumbers = new Set(
                (receivedData || [])
                    .map((r: any) => r.po_number)
                    .filter(Boolean)
            );

            // Deduplicate by composite key: po_number + firm_id (or firm_name) + po_created_date
            // This ensures that identical PO numbers from different firms or dates each get
            // their own distinct row in the history table.
            const uniquePOMap = new Map<string, any>();
            (poMasterData || []).forEach((sheet: any) => {
                const poNumber = sheet?.po_number;
                if (!poNumber) return;
                const firmKey = sheet.firm_id != null ? String(sheet.firm_id) : (sheet.firm_name || '');
                const safeDateKey = (raw: any): string => {
                    if (!raw) return '';
                    const d = new Date(raw);
                    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
                };
                const dateKey = safeDateKey(sheet.po_created_date) || safeDateKey(sheet.timestamp);
                const vendorKey = String(sheet.party_name || sheet.partyName || '').trim().toLowerCase();
                const compositeKey = `${poNumber}__${firmKey}__${vendorKey}__${dateKey}`;
                if (!uniquePOMap.has(compositeKey)) {
                    uniquePOMap.set(compositeKey, sheet);
                }
            });

            // Process history data
            const processedHistoryData: HistoryData[] = Array.from(uniquePOMap.values()).map((sheet: any) => {
                const poNumber = sheet.po_number || '';

                // Determine status
                let status: 'Revised' | 'Not Received' | 'Received' = 'Not Received';

                if (indentPoNumbers.has(poNumber)) {
                    status = receivedPoNumbers.has(poNumber) ? 'Received' : 'Not Received';
                } else {
                    status = 'Revised';
                }

                return {
                    approvedBy: sheet.approved_by || '',
                    poCopy: sheet.pdf || '',
                    poNumber: poNumber,
                    preparedBy: sheet.prepared_by || '',
                    totalAmount: Number(sheet.total_po_amount) || 0,
                    vendorName: sheet.party_name || '',
                    status: status,
                    timestamp: sheet.po_created_date || sheet.timestamp || '',
                    firmId: sheet.firm_id != null ? Number(sheet.firm_id) : null,
                    firmName: sheet.firm_name || '',
                    indentNumber: sheet.internal_code || sheet.internalCode || '',
                };
            });

            // Sort serial-wise with newest at top (descending PO number, then date)
            processedHistoryData.sort((a, b) => {
                const poDiff = comparePoNumbersDescending(a.poNumber, b.poNumber);
                if (poDiff !== 0) return poDiff;
                const dateA = new Date(a.timestamp).getTime() || 0;
                const dateB = new Date(b.timestamp).getTime() || 0;
                return dateB - dateA;
            });

            setHistoryData(processedHistoryData);
        } catch (error) {
            console.error('Error fetching PO history:', error);
            toast.error('Failed to fetch PO history');
            setHistoryData([]);
        } finally {
            setDataLoading(false);
        }
    }, [effectivePermittedFirms, user?.administrate]);

    useEffect(() => {
        fetchPOHistory();
    }, [fetchPOHistory]);

    const filteredData = statusFilter === 'All'
        ? historyData
        : historyData.filter((item: any) => item.status === statusFilter);

    // Creating table columns
    const historyColumns: ColumnDef<HistoryData>[] = [
        {
            accessorKey: 'poNumber',
            header: 'PO Number',
            cell: ({ getValue }) => <div>{getValue() as string || '-'}</div>
        },
        {
            accessorKey: 'poDate',
            header: 'PO Date',
            cell: ({ row }) => <div>{formatDate(row.original.timestamp)}</div>
        },
        {
            accessorKey: 'poCopy',
            header: 'PO Copy',
            cell: ({ row }) => {
                const poNum = row.original.poNumber;
                const isOpening = openingPo === poNum;

                return (
                    <button
                        type="button"
                        onClick={() => handleOpenPdf(row.original)}
                        disabled={isOpening}
                        className="text-primary hover:underline font-medium cursor-pointer disabled:opacity-50"
                    >
                        {isOpening ? 'Loading...' : 'PDF'}
                    </button>
                );
            },
        },
        {
            accessorKey: 'vendorName',
            header: 'Vendor Name',
            cell: ({ getValue }) => <div>{getValue() as string || '-'}</div>
        },
        {
            accessorKey: 'totalAmount',
            header: 'Amount',
            cell: ({ row }) => {
                return <div>&#8377;{(row.original.totalAmount || 0).toLocaleString('en-IN')}</div>;
            },
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => {
                const status = row.original.status;
                const variant =
                    status === "Not Received" ? "secondary" :
                        status === "Received" ? "primary" :
                            "default";

                return <Pill variant={variant}>{status}</Pill>;
            }
        },
        {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => {
                const po = row.original;
                const canDelete = canDeleteStoreStage(user, 'po_history');
                if (!canDelete) return null;

                return (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteTarget(po)}
                            className="flex items-center gap-1 text-red-600 hover:text-red-800 hover:bg-red-50 h-8 px-2 text-xs"
                            title="Delete PO & Reset to Pending"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                        </Button>
                    </div>
                );
            },
        },
    ];

    return (
        <div>
            <Heading heading="PO History " subtext="View purchase orders ">
                <Package2 size={50} className="text-primary" />
            </Heading>

            <DataTable
                data={filteredData}
                columns={historyColumns}
                searchFields={['vendorName', 'poNumber', 'preparedBy', 'approvedBy']}
                dataLoading={dataLoading}
                className='h-[80dvh]'
                extraActions={
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Status</SelectItem>
                            <SelectItem value="Revised">Revised</SelectItem>
                            <SelectItem value="Not Received">Not Received</SelectItem>
                            <SelectItem value="Received">Received</SelectItem>
                        </SelectContent>
                    </Select>
                }
            />

            <StageDeleteDialog
                open={!!deleteTarget}
                onOpenChange={(v) => !v && setDeleteTarget(null)}
                stageName="PO Creation"
                isPermanentDelete={false}
                indentNumber={deleteTarget?.poNumber}
                productName={deleteTarget?.vendorName}
                customMessage={`Are you sure you want to delete PO ${deleteTarget?.poNumber}${deleteTarget?.vendorName ? ` for vendor ${deleteTarget.vendorName}` : ''}${deleteTarget?.firmName ? ` (${deleteTarget.firmName})` : ''}? This will remove this specific PO record and revert its linked indents back to Pending PO to Make.`}
                onConfirm={async () => {
                    if (!deleteTarget) return;
                    const target = deleteTarget;
                    const poNum = target.poNumber;
                    await resetPoStage(poNum, {
                        firmId: target.firmId ?? undefined,
                        vendorName: target.vendorName ?? undefined,
                        poCreatedDate: target.timestamp ?? undefined,
                    });
                    toast.success(`PO ${poNum} deleted and reset successfully`);
                    setDeleteTarget(null);
                    setHistoryData(prev =>
                        prev.filter(
                            r =>
                                !(
                                    r.poNumber === poNum &&
                                    (target.firmId != null ? r.firmId === target.firmId : true) &&
                                    (target.vendorName ? r.vendorName === target.vendorName : true)
                                )
                        )
                    );
                    await fetchPOHistory();
                }}
            />
        </div>
    );
};

