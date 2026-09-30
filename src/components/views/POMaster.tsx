import { ListTodo, Loader2 } from 'lucide-react';
import Heading from '../element/Heading';
import { useEffect, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { formatDate } from '@/lib/utils';
import DataTable from '../element/DataTable';
import { useAuth } from '@/context/AuthContext';
import { openPoPdfPreview, type PoFilterContext } from '@/lib/poPdfUtils';
import { toast } from 'sonner';

interface PendingIndentsData {
    timestamp: string;
    partyName: string;
    poNumber: string;
    quotationNumber: string;
    quotationDate: string;
    enquiryNumber: string;
    enquiryDate: string;
    internalCode: string;
    product: string;
    description: string;
    quantity: number;
    unit: string;
    rate: number;
    gstPercent: number;
    discountPercent: number;
    amount: number;
    totalPoAmount: number;
    // preparedBy: string;
    // approvedBy: string;
    pdf: string;
}

// Helper function to parse GST percentage value
const parseGSTPercent = (value: any): number => {
    if (value === null || value === undefined || value === '') {
        return 0;
    }

    // Convert to string first
    const stringValue = String(value).trim();

    // If it's already a percentage string (like "18%"), remove % and convert
    if (stringValue.includes('%')) {
        const numericPart = stringValue.replace('%', '').trim();
        const parsed = parseFloat(numericPart);
        return isNaN(parsed) ? 0 : parsed;
    }

    // If it's a decimal (like 0.18 for 18%), convert to percentage
    const numericValue = parseFloat(stringValue);
    if (isNaN(numericValue)) {
        return 0;
    }

    // If the value is between 0 and 1, it's likely a decimal representation
    // Convert it to percentage (0.18 -> 18)
    if (numericValue > 0 && numericValue < 1) {
        return numericValue * 100;
    }

    // Otherwise, assume it's already in percentage format
    return numericValue;
};

import { fetchPoMaster } from '@/services/poService';
import { useProject } from '@/context/ProjectContext';

export default () => {
    const { user } = useAuth();
    const { effectivePermittedFirms } = useProject();
    const [tableData, setTableData] = useState<any[]>([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [generatingPoNumber, setGeneratingPoNumber] = useState<string | null>(null);

    const permittedFirms = effectivePermittedFirms;

    const fetchData = async () => {
        try {
            setDataLoading(true);
            const data = await fetchPoMaster(permittedFirms);
            const mapped = data.map((sheet: any) => ({
                ...sheet,
                po_created_date: sheet.po_created_date ? formatDate(sheet.po_created_date) : (sheet.timestamp ? formatDate(sheet.timestamp) : ''),
                rawTimestamp: sheet.timestamp || sheet.po_created_date || '',
                timestamp: sheet.timestamp ? formatDate(sheet.timestamp) : '',
                quotationDate: sheet.quotationDate ? formatDate(sheet.quotationDate) : '',
                enquiryDate: sheet.enquiryDate ? formatDate(sheet.enquiryDate) : '',
            }));

            mapped.sort((a: any, b: any) => {
                const cleanA = (a.poNumber || a.po_number || '').trim();
                const cleanB = (b.poNumber || b.po_number || '').trim();
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
                const numComp = cleanB.localeCompare(cleanA, undefined, { numeric: true, sensitivity: 'base' });
                if (numComp !== 0) return numComp;
                return new Date(b.rawTimestamp || 0).getTime() - new Date(a.rawTimestamp || 0).getTime();
            });

            setTableData(mapped);
        } catch (error) {
            console.error('Error fetching PO master:', error);
        } finally {
            setDataLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [effectivePermittedFirms]);

    // TODO(migration): PDF is now generated on-demand, no longer stored — remove after verification
    // Previously this pulled the stored po_master.pdf URL and opened it directly.
    // Now it re-fetches fresh po_master/master data and regenerates the PDF on every click.
    const handleViewPdf = async (row: any) => {
        const poNumber = row.poNumber || row.po_number || '';
        try {
            setGeneratingPoNumber(poNumber);
            const freshRows = await fetchPoMaster(permittedFirms);
            // Build a disambiguation context so duplicate PO numbers across firms/dates
            // resolve only the rows that belong to this specific entry.
            const context: PoFilterContext = {
                firmId: row.firm_id != null ? row.firm_id : undefined,
                firmName: row.firmNameMatch || row.firm_name || undefined,
                vendorName: row.partyName || row.party_name || undefined,
                date: row.rawTimestamp || row.po_created_date || row.timestamp || undefined,
            };
            await openPoPdfPreview(poNumber, freshRows, context);
        } catch (error) {
            console.error('Error generating PO PDF:', error);
            toast.error('Failed to generate Purchase Order PDF');
        } finally {
            setGeneratingPoNumber(null);
        }
    };

    // Creating table columns based on PO MASTER sheet structure (Columns A-T)
    const columns: ColumnDef<any>[] = [
        { accessorKey: 'po_created_date', header: 'PO Date' },
        { accessorKey: 'partyName', header: 'Party Name' },
        { accessorKey: 'poNumber', header: 'PO Number' },
        { accessorKey: 'quotationNumber', header: 'Quotation Number' },
        { accessorKey: 'quotationDate', header: 'Quotation Date' },
        { accessorKey: 'enquiryNumber', header: 'Enquiry Number' },
        { accessorKey: 'enquiryDate', header: 'Enquiry Date' },
        { accessorKey: 'internalCode', header: 'Internal Code' },
        { accessorKey: 'product', header: 'Product' },
        { accessorKey: 'description', header: 'Description' },
        { accessorKey: 'quantity', header: 'Quantity' },
        { accessorKey: 'unit', header: 'Unit' },
        {
            accessorKey: 'rate',
            header: 'Rate',
            cell: ({ row }) => {
                return <>&#8377;{row.original.rate.toLocaleString()}</>;
            },
        },
        {
            accessorKey: 'gstPercent',
            header: 'GST %',
            cell: ({ row }) => {
                return <>{row.original.gstPercent}%</>;
            },
        },
        {
            accessorKey: 'discountPercent',
            header: 'Discount %',
            cell: ({ row }) => {
                return <>{row.original.discountPercent}%</>;
            },
        },
        {
            accessorKey: 'amount',
            header: 'Amount',
            cell: ({ row }) => {
                return <>&#8377;{row.original.amount.toLocaleString()}</>;
            },
        },
        {
            accessorKey: 'totalPoAmount',
            header: 'Total PO Amount',
            cell: ({ row }) => {
                return <>&#8377;{row.original.totalPoAmount.toLocaleString()}</>;
            },
        },
        { accessorKey: 'preparedBy', header: 'Prepared By' },
        { accessorKey: 'approvedBy', header: 'Approved By' },
        {
            accessorKey: 'pdf',
            header: 'PDF',
            cell: ({ row }) => {
                const poNumber = row.original.poNumber;
                const isGenerating = generatingPoNumber === poNumber;
                return (
                    <button
                        type="button"
                        onClick={() => handleViewPdf(row.original)}
                        disabled={isGenerating}
                        className="text-blue-600 hover:text-blue-800 underline disabled:text-gray-400 disabled:no-underline inline-flex items-center gap-1"
                    >
                        {isGenerating && <Loader2 size={14} className="animate-spin" />}
                        {isGenerating ? 'Generating...' : 'View PDF'}
                    </button>
                );
            },
        },
    ];

    return (
        <div>
            <Heading heading="Pending POs" subtext="View pending purchase orders from PO Master">
                <ListTodo size={50} className="text-primary" />
            </Heading>
            <DataTable
                data={tableData}
                columns={columns}
                searchFields={[
                    'partyName',
                    'poNumber',
                    'product',
                    'description',
                    'quotationNumber',
                    'enquiryNumber',
                    'preparedBy',
                    'approvedBy'
                ]}
                dataLoading={dataLoading}
                className="h-[80dvh]"
            />
        </div>
    );
};
