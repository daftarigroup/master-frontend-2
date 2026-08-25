import { Package2, Trash2 } from 'lucide-react';
import Heading from '../element/Heading';
import { useEffect, useState, useCallback } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import DataTable from '../element/DataTable';
import { Pill } from '../ui/pill';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useAuth } from '@/context/AuthContext';
import { supabase, supabaseEnabled } from '@/lib/supabase';
import { applyFirmAccessFilter } from '@/lib/firmAccess';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { resetPoStage } from '@/services/poService';
import { openPoPdfPreview } from '@/lib/poPdfUtils';
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

function getAttachmentUrl(attachment?: string): string {
    if (!attachment || typeof attachment !== 'string') return '';
    let url = attachment.trim().replace(/^["']|["']$/g, '');
    if (!url) return '';

    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
        return url;
    }

    if (url.startsWith('po_image/')) {
        const { data } = supabase.storage.from('po_image').getPublicUrl(url.replace(/^po_image\//, ''));
        return data.publicUrl;
    }
    if (url.startsWith('indent-pdfs/')) {
        const { data } = supabase.storage.from('indent-pdfs').getPublicUrl(url.replace(/^indent-pdfs\//, ''));
        return data.publicUrl;
    }

    const { data } = supabase.storage.from('po_image').getPublicUrl(url);
    return data.publicUrl;
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

    // Matches strings like "26-27/49", "PO-26-27/49", "26-27-49", "PO/49", "49"
    const matchA = cleanA.match(/^(.*?)(?:[/_-])?(\d+)$/);
    const matchB = cleanB.match(/^(.*?)(?:[/_-])?(\d+)$/);

    if (matchA && matchB) {
        const prefixA = (matchA[1] || '').trim();
        const prefixB = (matchB[1] || '').trim();
        const numA = parseInt(matchA[2], 10);
        const numB = parseInt(matchB[2], 10);

        if (prefixA.toLowerCase() === prefixB.toLowerCase()) {
            if (numB !== numA) return numB - numA;
        } else {
            const prefixComp = prefixB.localeCompare(prefixA, undefined, { numeric: true, sensitivity: 'base' });
            if (prefixComp !== 0) return prefixComp;
            if (numB !== numA) return numB - numA;
        }
    }

    return cleanB.localeCompare(cleanA, undefined, { numeric: true, sensitivity: 'base' });
}

export default function POHistory() {
    const { user } = useAuth();

    const [historyData, setHistoryData] = useState<HistoryData[]>([]);
    const [dataLoading, setDataLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>('All');
    const [openingPo, setOpeningPo] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<HistoryData | null>(null);

    const handleOpenPdf = async (poNumber: string, _rawPdfUrl?: string) => {
        try {
            setOpeningPo(poNumber);
            await openPoPdfPreview(poNumber);
        } catch (err) {
            console.error('Error opening PO PDF:', err);
            toast.error('Failed to open PO PDF');
        } finally {
            setOpeningPo(null);
        }
    };

    const fetchPOHistory = useCallback(async () => {
        if (!supabaseEnabled) return;

        try {
            setDataLoading(true);

            // Fetch PO Master data
            let poQuery = supabase
                .from('po_master')
                .select('po_number, approved_by, pdf, prepared_by, total_po_amount, party_name, timestamp, po_created_date, firm_id')
                .order('timestamp', { ascending: false });

            const permittedFirms = (user?.administrate || !user?.firm_access || user?.firm_access.length === 0)
                ? undefined
                : user.firm_access;

            const filteredQuery = applyFirmAccessFilter(poQuery, permittedFirms);
            if (!filteredQuery) {
                setHistoryData([]);
                return;
            }

            const { data: poMasterData, error: poError } = await filteredQuery;
            if (poError) throw poError;

            // Fetch indent data to check PO status
            const { data: indentData, error: indentError } = await supabase
                .from('indent')
                .select('indent_number, po_number')
                .not('po_number', 'is', null);

            if (indentError) throw indentError;

            // Fetch store_in data to check if PO materials have been received
            const { data: receivedData, error: receivedError } = await supabase
                .from('store_in')
                .select('po_number')
                .not('po_number', 'is', null);

            if (receivedError) throw receivedError;

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

            // Get unique PO numbers
            const uniquePOMap = new Map<string, any>();
            (poMasterData || []).forEach((sheet: any) => {
                const poNumber = sheet?.po_number;
                if (poNumber && !uniquePOMap.has(poNumber)) {
                    uniquePOMap.set(poNumber, sheet);
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
    }, [user?.firm_access, user?.administrate]);

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
                const rawAttachment = row.original.poCopy;
                const isOpening = openingPo === poNum;

                return (
                    <button
                        type="button"
                        onClick={() => handleOpenPdf(poNum, rawAttachment)}
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
                const canDelete = canDeleteStoreStage(user);
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
                customMessage={`Are you sure you want to delete PO ${deleteTarget?.poNumber}? This will remove the PO record and revert linked indents back to Pending PO to Make.`}
                onConfirm={async () => {
                    if (!deleteTarget) return;
                    await resetPoStage(deleteTarget.poNumber);
                    toast.success(`PO ${deleteTarget.poNumber} deleted and reset successfully`);
                    setDeleteTarget(null);
                    await fetchPOHistory();
                }}
            />
        </div>
    );
};

