import { Package2 } from 'lucide-react';
import Heading from '../element/Heading';
import { useEffect, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import DataTable from '../element/DataTable';
import { Pill } from '../ui/pill';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useAuth } from '@/context/AuthContext';
import { supabase, supabaseEnabled } from '@/lib/supabase';
import { normalizeFirmAccess, applyFirmAccessFilter } from '@/lib/firmAccess';
import { toast } from 'sonner';
import { pdf } from '@react-pdf/renderer';
import POPdf, { type POPdfProps } from '../element/POPdf';
import { calculateSubtotal, calculateTotalGst, formatDate } from '@/lib/utils';
import { fetchPoMaster } from '@/services/poService';
import { openPoPdfPreview } from '@/lib/poPdfUtils';

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

export default function POHistory() {
    const { user } = useAuth();

    const [historyData, setHistoryData] = useState<HistoryData[]>([]);
    const [dataLoading, setDataLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>('All');
    const [openingPo, setOpeningPo] = useState<string | null>(null);

    // TODO(migration): PDF is now generated on-demand, no longer stored — remove after verification
    // This used to try opening the stored po_master.pdf URL first (with a dynamic-generation
    // fallback if that failed). The PO PDF is now always regenerated fresh via the shared
    // buildPoPdfProps/openPoPdfPreview helper (src/lib/poPdfUtils.ts), used consistently
    // everywhere po_master.pdf used to be read (POMaster.tsx, MakePayment.tsx, here).
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

    // let url = getAttachmentUrl(rawPdfUrl);
    //
    // if (url) {
    //     try {
    //         const res = await fetch(url);
    //         if (res.ok) {
    //             const contentType = res.headers.get('content-type') || '';
    //             if (contentType.toLowerCase().includes('application/pdf') || contentType.toLowerCase().includes('octet-stream')) {
    //                 const blob = await res.blob();
    //                 const blobUrl = URL.createObjectURL(blob);
    //                 window.open(blobUrl, '_blank');
    //                 return;
    //             }
    //         }
    //     } catch (fetchErr) {
    //         console.warn('Direct PDF fetch failed, falling back to dynamic generation:', fetchErr);
    //     }
    //
    //     if (url.startsWith('http://') || url.startsWith('https://')) {
    //         if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
    //             window.open(url, '_blank', 'noopener,noreferrer');
    //             return;
    //         }
    //     }
    // }
    //
    // // Fallback: Dynamically generate PDF from Database
    // const { data: poRecords, error } = await supabase
    //     .from('po_master')
    //     .select('*')
    //     .eq('po_number', poNumber);
    //
    // if (error || !poRecords || poRecords.length === 0) {
    //     toast.error('PO details not found');
    //     return;
    // }
    //
    // const firstRecord = poRecords[0];
    //
    // // Fetch company details for Contact Details section
    // const { data: companyData } = await supabase.from('company').select('*').limit(1);
    // const companyObj = companyData && companyData.length > 0 ? companyData[0] : null;
    //
    // // Parse terms from terms jsonb array or term1..term10 columns
    // let terms: { num: string; text: string }[] = [];
    // if (Array.isArray(firstRecord.terms)) {
    //     terms = firstRecord.terms;
    // } else {
    //     const termKeys = ['term1', 'term2', 'term3', 'term4', 'term5', 'term6', 'term7', 'term8', 'term9', 'term10'];
    //     terms = termKeys
    //         .map((key, i) => ({ num: `${i + 1}.`, text: firstRecord[key] }))
    //         .filter(t => Boolean(t.text && t.text.trim()));
    // }
    //
    // let logoBase64 = '/logo.png';
    // try {
    //     const logoRes = await fetch(window.location.origin + '/logo.png');
    //     if (logoRes.ok) {
    //         const logoBlob = await logoRes.blob();
    //         logoBase64 = await new Promise<string>((resolve) => {
    //             const reader = new FileReader();
    //             reader.onloadend = () => resolve((reader.result as string) || '/logo.png');
    //             reader.readAsDataURL(logoBlob);
    //         });
    //     }
    // } catch (e) {
    //     console.warn('Could not load logo as base64:', e);
    // }
    //
    // const mappedItems = poRecords.map((r: any) => ({
    //     quantity: Number(r.quantity) || 0,
    //     rate: Number(r.rate) || 0,
    //     discountPercent: Number(r.discount) || 0,
    //     gstPercent: Number(r.gst) || 0,
    // }));
    //
    // const pdfProps: POPdfProps = {
    //     companyName: firstRecord.company_name || companyObj?.company_name || firstRecord.firm_name || 'Company Name',
    //     companyAddress: firstRecord.billing_address || companyObj?.billing_address || companyObj?.address || '',
    //     companyPhone: companyObj?.phone || '',
    //     companyEmail: firstRecord.company_email || companyObj?.email || '',
    //     companyGstin: firstRecord.firm_gstin || companyObj?.gstin || '',
    //     companyPan: companyObj?.pan || '',
    //     companyContactPerson: companyObj?.contact_person || '',
    //     supplierName: firstRecord.party_name || '',
    //     supplierAddress: firstRecord.supplier_address || '',
    //     supplierGstin: firstRecord.supplier_gstin || '',
    //     supplierContactPerson: '',
    //     supplierPhone: '',
    //     supplierEmail: '',
    //     poNumber: firstRecord.po_number || poNumber,
    //     poDate: formatDate(firstRecord.timestamp || new Date()),
    //     deliveryDate: formatDate(firstRecord.delivery_date || firstRecord.expected_req_date || ''),
    //     projectName: firstRecord.firm_name || '',
    //     deliveryAddress: firstRecord.destination_address || '',
    //     deliveryContactPerson: '',
    //     deliveryPhone: '',
    //     deliveryEmail: '',
    //     siteEngineerName: firstRecord.site_engineer_name || '',
    //     siteEngineerEmail: firstRecord.site_engineer_email || '',
    //     siteEngineerPhoneNo: firstRecord.site_engineer_phoneNo || firstRecord.site_engineer_phone_no || '',
    //     siteEngineerName2: firstRecord.site_engineer_name_2 || '',
    //     siteEngineerEmail2: firstRecord.site_engineer_email_2 || '',
    //     siteEngineerPhoneNo2: firstRecord.site_engineer_phoneNo_2 || firstRecord.site_engineer_phone_no_2 || '',
    //     subtotal: calculateSubtotal(mappedItems),
    //     totalGst: calculateTotalGst(mappedItems),
    //     items: poRecords.map((r: any) => ({
    //         internalCode: r.internal_code || '',
    //         quotationNo: r.quotation_number || '',
    //         product: r.product || '',
    //         paymentTerm: r.payment_terms || '',
    //         qty: Number(r.quantity) || 0,
    //         unit: r.unit || '',
    //         rate: Number(r.rate) || 0,
    //         gst: Number(r.gst) || 0,
    //         discount: Number(r.discount) || 0,
    //         amount: Number(r.amount) || 0,
    //     })),
    //     totalAmount: Number(firstRecord.total_po_amount) || 0,
    //     terms: terms,
    //     logo: logoBase64,
    // };
    //
    // const blob = await pdf(<POPdf {...pdfProps} />).toBlob();
    // const blobUrl = URL.createObjectURL(blob);
    // window.open(blobUrl, '_blank');

    useEffect(() => {
        async function fetchPOHistory() {
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

                // Fetch received data to check if PO is received
                const { data: receivedData, error: receivedError } = await supabase
                    .from('received')
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

                // Explicitly sort by latest
                processedHistoryData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

                setHistoryData(processedHistoryData);
            } catch (error) {
                console.error('Error fetching PO history:', error);
                toast.error('Failed to fetch PO history');
                setHistoryData([]);
            } finally {
                setDataLoading(false);
            }
        }

        fetchPOHistory();
    }, [user?.firm_access, user?.administrate]);

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
        // { 
        //     accessorKey: 'preparedBy', 
        //     header: 'Prepared By',
        //     cell: ({ getValue }) => <div>{getValue() as string || '-'}</div>
        // },
        // { 
        //     accessorKey: 'approvedBy', 
        //     header: 'Approved By',
        //     cell: ({ getValue }) => <div>{getValue() as string || '-'}</div>
        // },
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
        </div>
    );
};
