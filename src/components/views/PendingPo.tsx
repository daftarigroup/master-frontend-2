import { CheckCircle } from 'lucide-react';
import Heading from '../element/Heading';
import { useEffect, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { formatDate, formatDateTime } from '@/lib/utils';
import DataTable from '../element/DataTable';
import { useAuth } from '@/context/AuthContext';
import { Pill } from '../ui/pill';
import { supabase, supabaseEnabled } from '@/lib/supabase';
import { normalizeFirmAccess, applyFirmAccessFilter } from '@/lib/firmAccess';
import { toast } from 'sonner';

interface ApprovedPOData {
    date: string;
    plannedDate: string;
    indentNo: string;
    product: string;
    quantity: number;
    rate: number;
    uom: string;
    vendorName: string;
    paymentTerm: string;
    specifications: string;
    firmNameMatch: string;
    poRequired: string;
    poRequiredStatus: 'Yes';
    expectedReqDate: string;
    expectedReqDateRaw: string | null;
    rawTimestamp: number;
}

export default function ApprovedPOs() {
    const { user } = useAuth();

    const [approvedTableData, setApprovedTableData] = useState<ApprovedPOData[]>([]);
    const [dataLoading, setDataLoading] = useState(false);

    // Fetch pending PO data from Supabase
    const fetchPendingPOs = async () => {
        if (!supabaseEnabled) return;

        try {
            setDataLoading(true);

            // Fetch indents
            let query = supabase
                .from('indent')
                .select('indent_number, firm_name, firm_id, product_name, pending_po_qty, quantity, approved_rate, rate1, uom, approved_vendor_name, vendor_name1, approved_payment_term, payment_term1, specifications, po_requred, timestamp, planned5, actual4, expected_req_date, delivery_date, po_number')
                .order('indent_number', { ascending: false });

            const permittedFirms = (user?.administrate || !user?.firm_access || user?.firm_access.length === 0)
                ? undefined
                : user.firm_access;

            const filteredQuery = applyFirmAccessFilter(query, permittedFirms);
            if (!filteredQuery) {
                setApprovedTableData([]);
                return;
            }

            const { data: indentData, error: indentError } = await filteredQuery;

            if (indentError) throw indentError;

            // Filter for Management Approved indents that do NOT have a PO created yet
            const filteredData = (indentData || []).filter((sheet: any) => {
                const isApproved = sheet.po_requred === 'Yes' || !!sheet.actual4 || !!sheet.approved_vendor_name;
                if (!isApproved) return false;

                // Check if PO was already created for this specific indent record
                const hasPoNumber = Boolean(sheet.po_number && String(sheet.po_number).trim() !== '');
                return !hasPoNumber;
            });

            // Map to table data format
            const mappedData = filteredData
                .map((sheet: any) => {
                    let formattedDate = '';
                    let formattedPlannedDate = '';

                    try {
                        if (sheet.timestamp) {
                            formattedDate = formatDateTime(sheet.timestamp);
                        }
                    } catch (error) {
                        console.warn('Invalid timestamp format:', sheet.timestamp);
                    }

                    try {
                        if (sheet.planned5) {
                            formattedPlannedDate = formatDate(sheet.planned5);
                        }
                    } catch (error) {
                        console.warn('Invalid planned date format:', sheet.planned5);
                    }

                    let rawExpected = sheet.expected_req_date || sheet.delivery_date || null;
                    let formattedExpectedDate = '';
                    if (rawExpected) {
                        try {
                            formattedExpectedDate = formatDate(new Date(rawExpected));
                        } catch (error) {
                            console.warn('Invalid expected date format:', rawExpected);
                        }
                    }

                    return {
                        date: formattedDate,
                        plannedDate: formattedPlannedDate,
                        indentNo: sheet.indent_number?.toString() || '',
                        firmNameMatch: sheet.firm_name || '',
                        product: sheet.product_name || '',
                        quantity: Number(sheet.pending_po_qty) || Number(sheet.quantity) || 0,
                        rate: Number(sheet.approved_rate) || Number(sheet.rate1) || 0,
                        uom: sheet.uom || '',
                        vendorName: sheet.approved_vendor_name || sheet.vendor_name1 || '',
                        paymentTerm: sheet.approved_payment_term || sheet.payment_term1 || '',
                        specifications: sheet.specifications || '',
                        poRequired: sheet.po_requred?.toString() || 'Yes',
                        poRequiredStatus: 'Yes' as const,
                        expectedReqDateRaw: rawExpected,
                        expectedReqDate: formattedExpectedDate,
                        rawTimestamp: sheet.timestamp ? new Date(sheet.timestamp).getTime() : 0,
                    };
                })
                .sort((a: any, b: any) => b.rawTimestamp - a.rawTimestamp);

            setApprovedTableData(mappedData);
        } catch (err) {
            console.error('Error fetching pending POs:', err);
            toast.error('Failed to fetch pending POs');
        } finally {
            setDataLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingPOs();
    }, [user?.firm_access, user?.administrate]);

    // Creating approved PO table columns (same as history but only for "Yes" entries)
    const approvedColumns: ColumnDef<ApprovedPOData>[] = [
        {
            accessorKey: 'date',
            header: 'Timestamp',
            cell: ({ getValue }) => <div className="px-2">{getValue() as string || '-'}</div>
        },
        {
            accessorKey: 'plannedDate',
            header: 'Planned Date',
            cell: ({ getValue }) => {
                const plannedDate = getValue() as string;
                return (
                    <div className="px-2">
                        {plannedDate || '-'}
                    </div>
                );
            }
        },
        {
            accessorKey: 'expectedReqDate',
            header: 'Expected Date',
            cell: ({ getValue }) => <div className="px-2">{getValue() as string || '-'}</div>
        },
        {
            accessorKey: 'indentNo',
            header: 'Indent Number',
            cell: ({ getValue }) => <div className="px-2">{getValue() as string || '-'}</div>
        },
        {
            accessorKey: 'firmNameMatch',
            header: 'Project Name',
            cell: ({ getValue }) => <div className="px-2">{getValue() as string || '-'}</div>
        },
        {
            accessorKey: 'product',
            header: 'Product',
            cell: ({ getValue }) => (
                <div className="max-w-[120px] break-words whitespace-normal px-1 text-sm">
                    {getValue() as string || '-'}
                </div>
            ),
        },
        {
            accessorKey: 'quantity',
            header: 'Pending PO Qty',
            cell: ({ getValue }) => <div className="px-2">{getValue() as number || 0}</div>
        },
        {
            accessorKey: 'rate',
            header: 'Rate',
            cell: ({ row }) => (
                <div className="px-2">
                    &#8377;{row.original.rate || 0}
                </div>
            ),
        },
        {
            accessorKey: 'uom',
            header: 'UOM',
            cell: ({ getValue }) => <div className="px-2">{getValue() as string || '-'}</div>
        },
        {
            accessorKey: 'vendorName',
            header: 'Vendor Name',
            cell: ({ getValue }) => <div className="px-2">{getValue() as string || '-'}</div>
        },
        {
            accessorKey: 'paymentTerm',
            header: 'Payment Term',
            cell: ({ getValue }) => <div className="px-2">{getValue() as string || '-'}</div>
        },
        {
            accessorKey: 'specifications',
            header: 'Specifications',
            cell: ({ getValue }) => (
                <div className="max-w-[150px] break-words whitespace-normal px-2 text-sm">
                    {getValue() as string || '-'}
                </div>
            ),
        },
        {
            accessorKey: 'poRequiredStatus',
            header: 'PO Required',
            cell: ({ row }) => {
                const status = row.original.poRequiredStatus;
                return (
                    <div className="px-2">
                        <Pill variant="primary">{status}</Pill>
                    </div>
                );
            },
        },
    ];

    return (
        <div>
            <Heading
                heading="Pending POs to be created"
                subtext="View all pending purchase orders"
            >
                <CheckCircle size={50} className="text-green-600" />
            </Heading>

            <DataTable
                data={approvedTableData}
                columns={approvedColumns}
                searchFields={['product', 'vendorName', 'paymentTerm', 'specifications', 'firmNameMatch']}
                dataLoading={dataLoading}
                className="h-[80dvh]"
            />
        </div>
    );
}
