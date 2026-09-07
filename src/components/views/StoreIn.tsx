import type { ColumnDef, Row } from '@tanstack/react-table';
import { useEffect, useState, useMemo } from 'react';
import DataTable from '../element/DataTable';
import { z } from 'zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from '../ui/dialog';
import { Truck, Building, FileText, IndianRupee, Plus, Pencil, Trash } from 'lucide-react';
import { Button } from '../ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel } from '../ui/form';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent } from '../ui/tabs';
import { useAuth } from '@/context/AuthContext';
import { hasPageAccess } from '@/components/element/PermissionGuard';
import Heading from '../element/Heading';
import { formatDate, formatDateTime, parseCustomDate, getPublicFileUrl } from '@/lib/utils';
import { Pill } from '../ui/pill';
import { filterByFirmAccess, isAllowedFirm } from '@/lib/firmAccess';
import { canDeleteStoreStage } from '@/lib/roleAccess';
import StageDeleteDialog from '../element/StageDeleteDialog';
import { AttachmentUploadField } from '../element/AttachmentUploadField';
import { useAttachmentUpload } from '@/hooks/useAttachmentUpload';

import { fetchMasterOptions, type MasterData } from '@/services/masterService';
import { useSheets } from '@/context/SheetsContext';
import { useProject } from '@/context/ProjectContext';
import {
    fetchStoreInRecords,
    fetchDirectRecords,
    updateStoreInReceiving,
    uploadProductPhoto,
    uploadChallanImage,
    uploadBillCopy,
    updateLiftHistoryAdmin,
    createDirectRecord,
    createPaymentEntry,
    resetStoreInStage,
    type StoreInRecord,
} from '@/services/storeInService';
import { createFullkittingEntry } from '@/services/fullkittingService';

interface StoreInPendingData {
    liftNumber: string;
    indentNo: string;
    billNo: string;
    vendorName: string;
    productName: string;
    typeOfBill: string;
    billAmount: number;
    paymentType: string;
    advanceAmountIfAny: number;
    photoOfBill: string;
    transportationInclude: string;
    transporterName: string;
    amount: number;
    poDate: string;
    poNumber: string;
    vendor: string;
    indentNumber: string;
    product: string;
    uom: string;
    qty: number;
    priceAsPerPo: number;
    remark: string;
    poCopy: string;
    billStatus: string;
    leadTimeToLiftMaterial: number;
    discountAmount: number;
    firmNameMatch: string;
    firm_id?: number;
    planned6Date: string;
    timestamp: string;
    products?: string[];
    indentNumbers?: string[];
    originalItems?: any[];
}

interface StoreInHistoryData {
    id: number;
    liftNumber: string;
    indentNo: string;
    billNo: string;
    vendorName: string;
    productName: string;
    qty: number;
    typeOfBill: string;
    billAmount: number;
    paymentType: string;
    advanceAmountIfAny: number;
    photoOfBill: string;
    transportationInclude: string;
    transporterName: string;
    amount: number;
    billStatus: string;
    photoOfProduct: string;
    unitOfMeasurement: string;
    damageOrder: string;
    quantityAsPerBill: string;
    priceAsPerPoCheck: string;
    priceAsPerPo: number;
    remark: string;
    poDate: string;
    poNumber: string;
    receiveStatus: string;
    vendor: string;
    product: string;
    orderQuantity: number;
    receivedDate: string;
    billNumber: string;
    anyTransport: string;
    transportingAmount: number;
    timestamp: string;
    leadTimeToLiftMaterial: number;
    discountAmount: number;
    billReceived: string;
    billImage: string;
    firmNameMatch: string;
    firm_id?: number;
    planned6Date: string;
    hodStatus: string;
    hodRemark: string;
    materialDate?: string | null;
}

interface DirectStoreInData {
    liftNumber: string;
    indentNo: string;
    billNo: string;
    vendorName: string;
    productName: string;
    qty: number;
    billAmount: number;
    photoOfBill: string;
    transportationInclude: string;
    transporterName: string;
    amount: number;
    actual6: string;
    receivingStatus: string;
    receivedQuantity: number;
    photoOfProduct: string;
    timestamp: string;
    receiverName: string;
    firmNameMatch: string;
    vehicleNo: string;
    hodStatus: string;
}

type RecieveItemsData = StoreInPendingData;
type HistoryData = StoreInHistoryData;

interface StoreInSheetItem {
    liftNumber?: string;
    indentNo?: string;
    billNo?: string;
    vendorName?: string;
    productName?: string;
    qty?: number;
    typeOfBill?: string;
    billAmount?: number;
    paymentType?: string;
    advanceAmountIfAny?: number | string;
    photoOfBill?: string;
    transportationInclude?: string;
    transporterName?: string;
    amount?: number;
    planned6?: string;
    actual6?: string;
    status?: string;
    billCopyAttached?: string;
    debitNote?: string;
    reason?: string;
    damageOrder?: string;
    quantityAsPerBill?: string;
    priceAsPerPoCheck?: string;
    priceAsPerPo?: number;
    remark?: string;
    firmNameMatch?: string;
    rowIndex?: number;
    poDate?: string;
    poNumber?: string;
    vendor?: string;
    indentNumber?: string;
    product?: string;
    uom?: string;
    poCopy?: string;
    billStatus?: string;
    leadTimeToLiftMaterial?: number;
    discountAmount?: number;
    receivedQuantity?: number;
    photoOfProduct?: string;
    unitOfMeasurement?: string;
    timestamp?: string;
    billNumber?: string;
    anyTransport?: string;
    transportingAmount?: number;
    receivingStatus?: string;
}

// Safe date formatter for Planned Date
const formatPlannedDate = (dateString: string) => {
    if (!dateString || dateString.trim() === '') return '';
    try {
        // If it's already in dd/mm/yyyy format, return as is
        if (dateString.includes('/')) {
            return dateString;
        }

        // If it's a date string that can be parsed
        const dateObj = new Date(dateString);
        if (isNaN(dateObj.getTime())) return dateString;

        const day = String(dateObj.getDate()).padStart(2, '0');
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const year = String(dateObj.getFullYear()).slice(-2);
        return `${day}/${month}/${year}`;
    } catch {
        return dateString;
    }
};

export default () => {
    const { user } = useAuth();
    const { effectivePermittedFirms } = useProject();
    const { updateAll } = useSheets();

    const [tableData, setTableData] = useState<StoreInPendingData[]>([]);
    const [historyData, setHistoryData] = useState<StoreInHistoryData[]>([]);
    const [directData, setDirectData] = useState<DirectStoreInData[]>([]);
    const [selectedIndent, setSelectedIndent] = useState<StoreInPendingData | null>(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [indentLoading, setIndentLoading] = useState(false);
    const [receivedLoading, setReceivedLoading] = useState(false);
    const [storeInRecords, setStoreInRecords] = useState<StoreInRecord[]>([]);
    const [activeItemIndex, setActiveItemIndex] = useState(0);
    const [completedItems, setCompletedItems] = useState<Set<number>>(new Set());
    const [openDirectDialog, setOpenDirectDialog] = useState(false);
    const [options, setOptions] = useState<MasterData | null>(null);
    const [editHistoryRow, setEditHistoryRow] = useState<StoreInHistoryData | null>(null);
    const [editSubmitting, setEditSubmitting] = useState(false);
    const [editDeliveryDate, setEditDeliveryDate] = useState('');
    const editPhotoAttachment = useAttachmentUpload(uploadBillCopy);
    const [vendorOptions, setVendorOptions] = useState<{ label: string; value: string }[]>([]);
    const [productOptions, setProductOptions] = useState<{ label: string; value: string }[]>([]);
    const [deleteTarget, setDeleteTarget] = useState<StoreInHistoryData | null>(null);

    const fetchAllData = async () => {
        setIndentLoading(true);
        setReceivedLoading(true);
        try {
            // Pass permitted firms to the service for backend-level filtering
            const permittedFirms = effectivePermittedFirms;
            const [storeIns, directIns, masterData] = await Promise.all([
                fetchStoreInRecords(permittedFirms),
                fetchDirectRecords(permittedFirms),
                fetchMasterOptions()
            ]);
            setStoreInRecords(storeIns);
            setDirectData(directIns);
            updateAll(true);

            // Populate master options
            if (masterData) {
                setOptions(masterData);
                setVendorOptions(masterData.vendorNames.map(name => ({ label: name, value: name })));

                // Extract all unique products from the products record
                const allProducts = Array.from(new Set(Object.values(masterData.products).flat()))
                    .sort()
                    .map(name => ({ label: name, value: name }));
                setProductOptions(allProducts);
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
            toast.error('Failed to load data');
        } finally {
            setIndentLoading(false);
            setReceivedLoading(false);
        }
    };

    // Fetch all data from Supabase
    useEffect(() => {
        if (user?.username) {
            fetchAllData();
        }
    }, [user?.username, effectivePermittedFirms]);

    // Process pending table data
    useEffect(() => {
        const permittedFirms = effectivePermittedFirms;
        const filteredByFirm = filterByFirmAccess(
            storeInRecords,
            permittedFirms,
            { id: (i: any) => i.firm_id, name: (i: any) => i.firmNameMatch }
        );

        // Filter for pending items (planned6 set, actual6 empty)
        const pendingItems = filteredByFirm.filter(
            (i) => i.planned6 !== '' && i.actual6 === '' &&
                (i.billStatus === 'Bill Received' || i.billStatus === 'Not Received')
        );

        // Map each pending record individually (previously grouped by bill)
        setTableData(pendingItems.map(i => ({
            ...i,
            billNo: String(i.billNo || ''),
            qty: Number(i.qty) || 0,
            advanceAmountIfAny: Number(i.advanceAmountIfAny) || 0,
            planned6Date: i.planned6 || '',
            // Populate arrays with single item data to maintain compatibility with the Store-In dialog
            products: [i.productName || ''],
            indentNumbers: [i.indentNo || ''],
            originalItems: [i]
        })));
    }, [storeInRecords, user?.firmNameMatch, effectivePermittedFirms]);

    // Process history data
    useEffect(() => {
        const permittedFirms = effectivePermittedFirms;
        const filteredByFirm = filterByFirmAccess(
            storeInRecords,
            permittedFirms,
            { id: (i: any) => i.firm_id, name: (i: any) => i.firmNameMatch }
        );

        // Display standard procurement records (actual6 set, NO Direct prefix)
        const historyItems = filteredByFirm.filter(i => i.actual6 !== '' && !i.liftNumber.startsWith('DIRECT-'));

        setHistoryData(historyItems.map((i) => ({
            id: i.id,
            liftNumber: i.liftNumber || '',
            indentNo: i.indentNo || '',
            billNo: String(i.billNo) || '',
            vendorName: i.vendorName || '',
            productName: i.productName || '',
            qty: i.qty || 0,
            typeOfBill: i.typeOfBill || '',
            billAmount: i.billAmount || 0,
            paymentType: i.paymentType || '',
            advanceAmountIfAny: Number(i.advanceAmountIfAny) || 0,
            photoOfBill: i.photoOfBill || '',
            transportationInclude: i.transportationInclude || '',
            transporterName: i.transporterName || '',
            amount: i.amount || 0,
            billStatus: i.billStatus || '',
            receivedQuantity: i.receivedQuantity || 0,
            photoOfProduct: i.photoOfProduct || '',
            unitOfMeasurement: i.unitOfMeasurement || '',
            damageOrder: i.damageOrder || '',
            quantityAsPerBill: i.quantityAsPerBill || '',
            priceAsPerPoCheck: i.priceAsPerPoCheck || '',
            priceAsPerPo: i.priceAsPerPo || 0,
            remark: i.remark || '',
            poDate: i.poDate || '',
            poNumber: i.poNumber || '',
            receiveStatus: i.receivingStatus || '',
            vendor: i.vendorName || '',
            product: i.productName || '',
            orderQuantity: i.qty || 0,
            receivedDate: i.timestamp ? formatDateTime(parseCustomDate(i.timestamp)) : '',
            billNumber: i.billNumber || String(i.billNo) || '',
            anyTransport: i.transportationInclude || '',
            transportingAmount: i.amount || 0,
            timestamp: i.timestamp ? formatDateTime(parseCustomDate(i.timestamp)) : '',
            leadTimeToLiftMaterial: i.leadTimeToLiftMaterial || 0,
            discountAmount: i.discountAmount || 0,
            billReceived: i.billStatus || '',
            billImage: i.photoOfBill || '',
            firmNameMatch: i.firmNameMatch || '',
            planned6Date: i.planned6 || '',
            hodStatus: i.hodStatus || '',
            hodRemark: i.hodRemark || '',
            materialDate: i.materialDate || null,
            challanNo: i.challanNo || '',
            challanImage: i.challanImage || '',
            receiverName: i.receiverName || '',
        })));

        // Note: directData is now set directly in fetchAllData from the new table
    }, [storeInRecords, user?.firmNameMatch, effectivePermittedFirms]);

    const textWrapCell = ({ getValue }: { getValue: () => any }) => {
        const value = getValue();
        return <div className="min-w-[150px] whitespace-normal break-words">{value?.toString() || '-'}</div>;
    };

    const canEditStoreIn = hasPageAccess(user as any, 'store_in', 'EDIT', 'storeIn');

    const columns: ColumnDef<RecieveItemsData>[] = [
        ...(canEditStoreIn
            ? [
                {
                    header: 'Action',
                    cell: ({ row }: { row: Row<RecieveItemsData> }) => {
                        const indent = row.original;
                        return (
                            <DialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setSelectedIndent(indent);
                                    }}
                                >
                                    Store In
                                </Button>
                            </DialogTrigger>
                        );
                    },
                },
            ]
            : []),
        {
            accessorKey: 'timestamp',
            header: 'Timestamp',
            cell: ({ getValue }) => <div>{getValue() ? formatDateTime(parseCustomDate(getValue())) : '-'}</div>,
        },
        { accessorKey: 'poNumber', header: 'PO Number', cell: textWrapCell },
        { accessorKey: 'vendorName', header: 'Vendor Name', cell: textWrapCell },
        { accessorKey: 'billNo', header: 'Bill No.', cell: textWrapCell },
        {
            accessorKey: 'products',
            header: 'Products',
            cell: ({ row }) => {
                const products = row.original.products || [];
                return (
                    <div className="max-w-[200px] truncate" title={products.join(', ')}>
                        {products.length > 1 ? `${products[0]} (+${products.length - 1})` : products[0]}
                    </div>
                );
            }
        },
        { accessorKey: 'firmNameMatch', header: 'Project Name', cell: textWrapCell },
        {
            accessorKey: 'billStatus',
            header: 'Bill Status',
            cell: ({ getValue }) => {
                const status = getValue() as string;
                return (
                    <Pill variant={status === 'Bill Received' ? 'default' : 'secondary'}>
                        {status || 'Unknown'}
                    </Pill>
                );
            }
        },
        {
            accessorKey: 'billAmount',
            header: 'Bill Amount',
            cell: ({ getValue }) => <div className="font-medium">₹ {(getValue() as number || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        },
        { accessorKey: 'discountAmount', header: 'Discount Amount' },
        { accessorKey: 'qty', header: 'Qty' },
        { accessorKey: 'leadTimeToLiftMaterial', header: 'Lead Time To Lift' },
        { accessorKey: 'typeOfBill', header: 'Type Of Bill', cell: textWrapCell },
        { accessorKey: 'paymentType', header: 'Payment Type', cell: textWrapCell },
        { accessorKey: 'advanceAmountIfAny', header: 'Advance' },
        {
            accessorKey: 'photoOfBill',
            header: 'Photo Of Bill',
            cell: ({ row }) => {
                const photo = row.original.photoOfBill;
                const fileUrl = getPublicFileUrl(photo);
                return fileUrl ? (
                    <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                        View
                    </a>
                ) : null;
            },
        },
        { accessorKey: 'transportationInclude', header: 'Trans. Include', cell: textWrapCell },
        { accessorKey: 'transporterName', header: 'Transporter', cell: textWrapCell },
        { accessorKey: 'amount', header: 'Freight Amount' },
    ];

    const isAdmin = user?.administrate === true || (user?.administrate as any) === 'true';

    const historyColumns = useMemo<ColumnDef<HistoryData>[]>(() => [
        { accessorKey: 'timestamp', header: 'Timestamp' },
        { accessorKey: 'liftNumber', header: 'Lift Number', cell: textWrapCell },
        { accessorKey: 'indentNo', header: 'Indent No.', cell: textWrapCell },
        { accessorKey: 'poNumber', header: 'PO Number', cell: textWrapCell },
        { accessorKey: 'firmNameMatch', header: 'Project Name', cell: textWrapCell },
        { accessorKey: 'vendorName', header: 'Vendor Name', cell: textWrapCell },
        { accessorKey: 'productName', header: 'Product Name', cell: textWrapCell },
        {
            accessorKey: 'billStatus',
            header: 'Bill Status',
            cell: ({ getValue }) => {
                const status = getValue() as string;
                return (
                    <Pill variant={status === 'Bill Received' ? 'default' : 'secondary'}>
                        {status || 'Unknown'}
                    </Pill>
                );
            }
        },
        { accessorKey: 'billNo', header: 'Bill No.', cell: textWrapCell },
        { accessorKey: 'qty', header: 'Qty' },
        { accessorKey: 'leadTimeToLiftMaterial', header: 'Lead Time To Lift', cell: textWrapCell },
        { accessorKey: 'typeOfBill', header: 'Type Of Bill', cell: textWrapCell },
        {
            accessorKey: 'billAmount',
            header: 'Bill Amount',
            cell: ({ getValue }) => <div className="font-medium">₹ {(getValue() as number || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        },
        { accessorKey: 'discountAmount', header: 'Discount' },
        { accessorKey: 'paymentType', header: 'Payment Type', cell: textWrapCell },
        { accessorKey: 'advanceAmountIfAny', header: 'Advance' },
        {
            accessorKey: 'photoOfBill',
            header: 'Photo Of Bill',
            cell: ({ row }) => {
                const photo = row.original.photoOfBill;
                const fileUrl = getPublicFileUrl(photo);
                return fileUrl ? (
                    <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                        View
                    </a>
                ) : null;
            },
        },
        { accessorKey: 'transportationInclude', header: 'Trans. Include', cell: textWrapCell },
        { accessorKey: 'transporterName', header: 'Transporter', cell: textWrapCell },
        { accessorKey: 'amount', header: 'Freight Amount' },
        { accessorKey: 'receiveStatus', header: 'Rec. Status', cell: textWrapCell },
        { accessorKey: 'receivedQuantity', header: 'Rec. Qty' },
        {
            accessorKey: 'hodStatus',
            header: 'HOD Status',
            cell: ({ getValue }) => {
                const status = getValue() as string;
                return (
                    <Pill variant={status === 'Approved' ? 'default' : (status === 'Rejected' ? 'reject' : 'secondary')}>
                        {status || 'Pending'}
                    </Pill>
                );
            }
        },
        { accessorKey: 'hodRemark', header: 'HOD Remark', cell: textWrapCell },
        {
            accessorKey: 'photoOfProduct',
            header: 'Product Photo',
            cell: ({ row }) => {
                const photo = row.original.photoOfProduct;
                const fileUrl = getPublicFileUrl(photo);
                return fileUrl ? (
                    <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                        View
                    </a>
                ) : null;
            },
        },
        {
            accessorKey: 'damageOrder',
            header: 'Physical Check',
            cell: ({ row }) => {
                const isDamaged = row.original.damageOrder === 'No';
                return (
                    <Pill variant={isDamaged ? 'reject' : 'default'}>
                        {isDamaged ? 'Not Good' : 'Good'}
                    </Pill>
                );
            }
        },
        {
            accessorKey: 'quantityAsPerBill',
            header: 'Qty Match?',
            cell: ({ row }) => (
                <Pill variant={row.original.quantityAsPerBill === 'Yes' ? 'default' : 'reject'}>
                    {row.original.quantityAsPerBill === 'Yes' ? 'Match' : 'Mismatch'}
                </Pill>
            )
        },
        {
            accessorKey: 'priceAsPerPo',
            header: 'Price Match?',
            cell: ({ row }) => (
                <Pill variant={row.original.priceAsPerPoCheck === 'Yes' ? 'default' : 'reject'}>
                    {row.original.priceAsPerPoCheck === 'Yes' ? 'Match' : 'Mismatch'}
                </Pill>
            )
        },
        { accessorKey: 'remark', header: 'Remark', cell: textWrapCell },
        {
            accessorKey: 'planned6Date',
            header: 'Planned Date',
            cell: ({ row }) => formatPlannedDate(row.original.planned6Date)
        },
        {
            accessorKey: 'materialDate',
            header: 'Delivery Date',
            cell: ({ row }) => row.original.materialDate ? formatPlannedDate(row.original.materialDate) : '-'
        },
        ...[{
            id: 'adminEdit',
            header: 'Edit',
            cell: ({ row }: { row: Row<HistoryData> }) => (
                <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1"
                    onClick={() => {
                        setEditHistoryRow(row.original);
                        setEditDeliveryDate(row.original.materialDate || '');
                        editPhotoAttachment.reset();
                    }}
                >
                    <Pencil size={12} />
                    Edit
                </Button>
            ),
        },
        {
            id: 'stage_delete_action',
            header: 'Action',
            cell: ({ row }: { row: Row<HistoryData> }) => {
                const canDelete = canDeleteStoreStage(user, 'store_in');
                if (!canDelete) return null;
                return (
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteTarget(row.original)}
                        className="flex items-center gap-1 text-red-600 hover:text-red-800 hover:bg-red-50 h-7 px-2 text-xs"
                        title="Delete Store Check Data"
                    >
                        <Trash className="h-3.5 w-3.5" />
                        Delete
                    </Button>
                );
            },
        }] as ColumnDef<HistoryData>[],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ], [setEditHistoryRow, setEditDeliveryDate, editPhotoAttachment, user?.role, user?.administrate]);

    const schema = z.object({
        status: z.enum(['Received', 'Not Received']),
        receiverName: z.string().optional(),
        challanNo: z.string().optional(),
        // Holds an already-uploaded S3 URL string by the time the form is
        // submitted (upload happens on file-select, not at submit time — see
        // AttachmentUploadField), not the raw File.
        challanImage: z.any().optional(),
        photoOfProduct: z.any().refine(
            (v) => v instanceof File || (typeof v === 'string' && v.length > 0),
            { message: 'Photo of product is required' }
        ),
        damageOrder: z.enum(['Yes', 'No']),
        quantityAsPerBill: z.enum(['Yes', 'No']),
        priceAsPerPoCheck: z.enum(['Yes', 'No']),
        remark: z.string().optional(),
        location: z.string().optional(),
        items: z.array(z.object({
            liftNumber: z.string(),
            indentNo: z.string(),
            productName: z.string(),
            qty: z.number(),
            receivedQty: z.coerce.number().min(1, 'Received quantity is required'),
        })),
    });

    type FormValues = z.infer<typeof schema>;

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            status: 'Received',
            receiverName: '',
            challanNo: '',
            challanImage: undefined,
            photoOfProduct: undefined,
            damageOrder: undefined,
            quantityAsPerBill: undefined,
            priceAsPerPoCheck: undefined,
            remark: '',
            location: '',
            items: [],
        },
    });

    const { fields: itemFields, append, remove } = useFieldArray({
        control: form.control,
        name: "items"
    });

    const statusSelector = form.watch('status');
    const itemsWatcher = form.watch('items');

    const challanAttachment = useAttachmentUpload(uploadChallanImage);
    const productPhotoAttachment = useAttachmentUpload(uploadProductPhoto);

    // Reset form when dialog closes
    useEffect(() => {
        if (!openDialog) {
            form.reset();
            challanAttachment.reset();
            productPhotoAttachment.reset();
            fetchAllData(); // Refresh data on close
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [openDialog, form]);

    useEffect(() => {
        if (selectedIndent?.originalItems) {
            form.reset({
                status: 'Received',
                receiverName: user?.name || user?.username || '',
                challanNo: '',
                challanImage: undefined,
                photoOfProduct: undefined,
                damageOrder: undefined,
                quantityAsPerBill: undefined,
                priceAsPerPoCheck: undefined,
                remark: '',
                location: '',
                items: selectedIndent.originalItems.map(item => ({
                    liftNumber: item.liftNumber || '',
                    indentNo: item.indentNo || '',
                    productName: item.productName || '',
                    qty: Number(item.qty) || 0,
                    receivedQty: Number(item.qty) || 0,
                    damageOrder: '',
                })),
            });
            challanAttachment.reset();
            productPhotoAttachment.reset();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedIndent, form, user]);

    async function onSubmit(values: FormValues) {
        if (!selectedIndent) return;
        try {
            // Both attachments were already uploaded directly to S3 at
            // selection time by AttachmentUploadField — these are already
            // URL strings, not raw Files.
            const photoUrl = (values.photoOfProduct as unknown as string) || '';
            const challanImageUrl = (values.challanImage as unknown as string) || '';

            const currentDateTime = new Date().toISOString();

            // Use sequential loop to avoid 409 Conflict / database locks
            for (const item of values.items) {
                // Update original store_in record to remove from processing
                await updateStoreInReceiving(item.liftNumber, item.indentNo, item.productName, {
                    actual6: currentDateTime,
                    receivingStatus: values.status,
                    receivedQuantity: item.receivedQty,
                    photoOfProduct: photoUrl,
                    damageOrder: values.damageOrder || '',
                    quantityAsPerBill: values.quantityAsPerBill || '',
                    priceAsPerPoCheck: values.priceAsPerPoCheck || '',
                    remark: values.remark || '',
                    location: values.location || '',
                    challanNo: values.challanNo || '',
                    challanImage: challanImageUrl || '',
                    receiverName: values.receiverName || user?.name || user?.username || 'Store User',
                });

                // Note: fullkitting entry was already created in GetLift when transportation=Yes.
                // Creating it again here would produce duplicates. Direct entries handle
                // their own fullkitting creation in onDirectSubmit below.

                // If Not Received, also create a record in the direct table
                if (values.status === 'Not Received') {
                    await createDirectRecord({
                        liftNumber: `DIRECT-${item.liftNumber}`,
                        indentNo: item.indentNo,
                        vendorName: selectedIndent.vendorName,
                        productName: item.productName,
                        qty: item.qty,
                        receivedQuantity: item.receivedQty,
                        receivingStatus: values.status,
                        billNo: values.challanNo || 'NOT-RECEIVED',
                        billAmount: 0,
                        photoOfProduct: photoUrl,
                        photoOfBill: challanImageUrl,
                        receiverName: user?.name || 'Store User',
                        transportationInclude: 'No',
                        firmNameMatch: selectedIndent.firmNameMatch,
                        firm_id: selectedIndent.firm_id || options?.firmObjects?.find((f: any) => f.name === selectedIndent.firmNameMatch)?.id,
                        timestamp: currentDateTime,
                    });

                }
            }


            toast.success(`All ${values.items.length} items stored in successfully!`);
            challanAttachment.reset({ committed: true });
            productPhotoAttachment.reset({ committed: true });
            setOpenDialog(false);
            await fetchAllData();
        } catch (error) {
            console.error('Error in onSubmit:', error);
            toast.error('Failed to store in');
        }
    }

    const directSchemaBase = z.object({
        receiverName: z.string().min(1, 'Receiver name is required'),
        vendorName: z.string().min(1, 'Vendor name is required'),
        billNo: z.string().optional(),
        billAmount: z.coerce.number().optional(),
        productName: z.string().min(1, 'Product name is required'),
        receivingQty: z.coerce.number().optional(),
        status: z.enum(['Received', 'Not Received'], { required_error: 'Please select a status' }),
        // Hold already-uploaded S3 URL strings by submit time (upload happens
        // on file-select — see AttachmentUploadField), not raw Files.
        billImage: z.any().optional(),
        productImage: z.any().refine(
            (v) => v instanceof File || (typeof v === 'string' && v.length > 0),
            { message: 'Product image is required' }
        ),
        anyTransport: z.enum(['Yes', 'No']),
        transportAmount: z.coerce.number().optional(),
        transporterName: z.string().optional(),
        vehicleNo: z.string().optional(),
        challanNo: z.string().optional(),
        challanImage: z.any().optional(),
        firmName: z.string().min(1, 'Project name is required'),
        firmId: z.coerce.number().optional(),
    });


    const directSchema = directSchemaBase.superRefine((val, ctx) => {
        if (val.status === 'Received') {
            if (!val.billNo || val.billNo.trim() === '') {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Bill number is required', path: ['billNo'] });
            }
            if (!val.billAmount || val.billAmount <= 0) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Bill amount is required', path: ['billAmount'] });
            }
            if (!val.receivingQty || val.receivingQty <= 0) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Quantity is required', path: ['receivingQty'] });
            }
            if (!val.billImage) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Bill image is required', path: ['billImage'] });
            }
        }
    });

    type DirectFormValues = z.infer<typeof directSchemaBase>;

    const directForm = useForm<DirectFormValues>({
        resolver: zodResolver(directSchema),
        defaultValues: {
            status: '' as any,   // must be '' not undefined — prevents Select uncontrolled→controlled warning
            anyTransport: 'No',
            billNo: '',
            billAmount: 0,
            receivingQty: 0,
            challanNo: '',
            challanImage: undefined,
            firmName: '',
            firmId: undefined,
        },

    });

    const watchAnyTransport = directForm.watch('anyTransport');
    const watchDirectStatus = directForm.watch('status');

    const directChallanAttachment = useAttachmentUpload(uploadChallanImage);
    const directBillAttachment = useAttachmentUpload(uploadBillCopy);
    const directProductAttachment = useAttachmentUpload(uploadProductPhoto);

    // Reset attachment state whenever the dialog closes, regardless of
    // whether that happened via Radix's onOpenChange (ESC/overlay click) or
    // a direct setOpenDirectDialog(false) call elsewhere in this file — a
    // useEffect watching the boolean catches both, unlike wrapping onOpenChange.
    useEffect(() => {
        if (!openDirectDialog) {
            directChallanAttachment.reset();
            directBillAttachment.reset();
            directProductAttachment.reset();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [openDirectDialog]);

    async function onDirectSubmit(values: DirectFormValues) {
        try {
            const roundedBillAmount = Number((values.billAmount || 0).toFixed(2));
            const firmId = values.firmId || options?.firmObjects?.find((firm) => firm.name === values.firmName)?.id;
            if (!firmId) {
                toast.error('Project ID is required for direct entry');
                return;
            }

            const timestamp = Date.now();
            const liftId = `DIRECT-${timestamp}`;
            const indentId = `DIRECT-${timestamp}`;

            // All three attachments were already uploaded directly to S3 at
            // selection time by AttachmentUploadField — already URL strings.
            const photoUrl = (values.productImage as unknown as string) || '';
            const billUrl = (values.billImage as unknown as string) || '';
            const challanUrl = (values.challanImage as unknown as string) || '';

            // 2. Create Record
            await createDirectRecord({
                liftNumber: liftId,
                indentNo: indentId,
                vendorName: values.vendorName,
                productName: values.productName,
                qty: values.receivingQty || 0,
                receivedQuantity: values.receivingQty || 0,
                receivingStatus: values.status,
                billNo: values.billNo || '',
                billAmount: roundedBillAmount,
                photoOfProduct: photoUrl,
                photoOfBill: billUrl,
                receiverName: values.receiverName,
                transportationInclude: values.anyTransport,
                transporterName: values.transporterName || '',
                amount: values.transportAmount || 0,
                vehicleNo: values.vehicleNo || '',
                firmNameMatch: values.firmName,
                firm_id: firmId,
                timestamp: new Date().toISOString(),

                challanNo: values.challanNo,
                challanImage: challanUrl,
            });

            // 3. Create Payment Entry for Make Payment if Received
            if (values.status === 'Received') {
                await createPaymentEntry({
                    indent_number: indentId,
                    vendor_name: values.vendorName,
                    po_number: liftId,
                    bill_amount: roundedBillAmount,
                    photo_of_bill: billUrl,
                    product_name: values.productName,
                    firm_name: values.firmName,
                    firm_id: firmId,
                    payment_terms: 'Advance', // Default to advance to show up in Make Payment

                    prefix: 'DIRECT'
                });
            }

            // 4. Trigger Freight Payment flow if transportation is included
            if (values.anyTransport === 'Yes') {
                await createFullkittingEntry({
                    timestamp: new Date().toISOString(),
                    indent_number: indentId,
                    vendor_name: values.vendorName,
                    product_name: values.productName,
                    qty: values.receivingQty || 0,
                    bill_no: values.billNo || values.challanNo || '',
                    transporter_name: values.transporterName || '',
                    amount: values.transportAmount || 0,
                    vehicle_no: values.vehicleNo || '',
                    driver_name: '',
                    driver_mobile_no: '',
                    firm_name: values.firmName,
                    firm_id: firmId,
                });
            }

            toast.success('Direct entry saved successfully!');
            directChallanAttachment.reset({ committed: true });
            directBillAttachment.reset({ committed: true });
            directProductAttachment.reset({ committed: true });
            setOpenDirectDialog(false);
            directForm.reset();
            await fetchAllData();
        } catch (error) {
            console.error('Direct submission error:', error);
            toast.error('Failed to save direct entry');
        }
    }

    function onError(e: any) {
        console.error(e);
        if (e.qty) {
            toast.error(e.qty.message || 'Received quantity cannot exceed lifting quantity');
            return;
        }
        toast.error('Please fill all required fields');
    }

    return (
        <div>
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <Tabs defaultValue="pending" className="w-full">
                    <Heading
                        heading="Store Check for Receive Items"
                        subtext="Receive items from purchase orders"
                        tabs
                        pendingCount={tableData.length}
                        historyCount={historyData.length}
                        directCount={directData.length}
                        directValue="direct"
                        action={
                            <Dialog open={openDirectDialog} onOpenChange={setOpenDirectDialog}>
                                <DialogTrigger asChild>
                                    <Button variant="default" className="gap-2 shadow-sm">
                                        <Plus className="h-4 w-4" />
                                        Direct Form
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="w-[95vw] sm:w-[90vw] max-w-2xl max-h-[92vh] flex flex-col p-4 sm:p-6 rounded-2xl sm:rounded-xl overflow-hidden">
                                    <DialogHeader className="shrink-0 text-left pr-6 mb-2">
                                        <DialogTitle className="text-lg sm:text-xl font-bold">Direct Material Entry</DialogTitle>
                                        <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-normal">Enter material details manually without an existing PO/Indent</DialogDescription>
                                    </DialogHeader>
                                    <Form {...directForm}>
                                        <form onSubmit={directForm.handleSubmit(onDirectSubmit)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                                            <div className="flex-1 overflow-y-auto pr-1 space-y-4 py-2">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <FormField
                                                    control={directForm.control}
                                                    name="firmName"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Project Name</FormLabel>
                                                             <Select onValueChange={(val) => { field.onChange(val); const firmObj = options?.firmObjects?.find(f => f.name === val); if (firmObj) directForm.setValue('firmId', firmObj.id); }} value={field.value || ""}>
                                                                <FormControl>
                                                                    <SelectTrigger className="w-full">
                                                                        <SelectValue placeholder="Select project" />
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent>
                                                                    {(options?.firmObjects || [])
                                                                        .filter((f: { id: number; name: string }) => isAllowedFirm({ id: f.id, name: f.name }, user?.firm_access || []))

                                                                        .map((firm) => (
                                                                            <SelectItem key={firm.id} value={firm.name}>
                                                                                {firm.name}
                                                                            </SelectItem>
                                                                        ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={directForm.control}
                                                    name="receiverName"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Receiver Name</FormLabel>
                                                            <FormControl>
                                                                <Input {...field} placeholder="Name of person receiving" />
                                                            </FormControl>
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={directForm.control}
                                                    name="vendorName"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Vendor Name</FormLabel>
                                                            <Select onValueChange={field.onChange} value={field.value || ""}>
                                                                <FormControl>
                                                                    <SelectTrigger className="w-full">
                                                                        <SelectValue placeholder="Select vendor" />
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent>
                                                                    {vendorOptions.map((opt) => (
                                                                        <SelectItem key={opt.value} value={opt.value}>
                                                                            {opt.label}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={directForm.control}
                                                    name="productName"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Product Name</FormLabel>
                                                            <Select onValueChange={field.onChange} value={field.value || ""}>
                                                                <FormControl>
                                                                    <SelectTrigger className="w-full">
                                                                        <SelectValue placeholder="Select product" />
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent>
                                                                    {productOptions.map((opt) => (
                                                                        <SelectItem key={opt.value} value={opt.value}>
                                                                            {opt.label}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={directForm.control}
                                                    name="status"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Bill Status</FormLabel>
                                                            <Select onValueChange={field.onChange} value={field.value || ""}>
                                                                <FormControl>
                                                                    <SelectTrigger className="w-full">
                                                                        <SelectValue placeholder="Select status" />
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent>
                                                                    <SelectItem value="Received">Received</SelectItem>
                                                                    <SelectItem value="Not Received">Not Received</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </FormItem>
                                                    )}
                                                />

                                                {watchDirectStatus === 'Received' && (
                                                    <>
                                                        <FormField
                                                            control={directForm.control}
                                                            name="billNo"
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel>Bill No</FormLabel>
                                                                    <FormControl>
                                                                        <Input {...field} placeholder="Enter bill number" />
                                                                    </FormControl>
                                                                </FormItem>
                                                            )}
                                                        />
                                                        <FormField
                                                            control={directForm.control}
                                                            name="billAmount"
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel>Bill Amount</FormLabel>
                                                                    <FormControl>
                                                                        <Input
                                                                            type="number"
                                                                            step="0.01"
                                                                            {...field}
                                                                            onBlur={(e) => {
                                                                                field.onBlur();
                                                                                const rounded = Number((Number(e.target.value) || 0).toFixed(2));
                                                                                field.onChange(rounded);
                                                                            }}
                                                                            placeholder="Enter amount"
                                                                        />
                                                                    </FormControl>
                                                                </FormItem>
                                                            )}
                                                        />
                                                        <FormField
                                                            control={directForm.control}
                                                            name="receivingQty"
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel>Receiving Qty</FormLabel>
                                                                    <FormControl>
                                                                        <Input type="number" step="any" {...field} placeholder="Enter quantity" />
                                                                    </FormControl>
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </>
                                                )}

                                                {watchDirectStatus === 'Not Received' && (
                                                    <>
                                                        <FormField
                                                            control={directForm.control}
                                                            name="challanNo"
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel>Challan Number</FormLabel>
                                                                    <FormControl>
                                                                        <Input {...field} placeholder="Enter challan number" />
                                                                    </FormControl>
                                                                </FormItem>
                                                            )}
                                                        />
                                                        <FormField
                                                            control={directForm.control}
                                                            name="challanImage"
                                                            render={() => (
                                                                <FormItem>
                                                                    <FormLabel>Challan Image</FormLabel>
                                                                    <FormControl>
                                                                        <AttachmentUploadField
                                                                            id="direct-challan-image"
                                                                            accept="image/*"
                                                                            status={directChallanAttachment.status}
                                                                            progress={directChallanAttachment.progress}
                                                                            fileName={directChallanAttachment.fileName}
                                                                            error={directChallanAttachment.error}
                                                                            onSelect={async (file) => {
                                                                                const url = await directChallanAttachment.select(file);
                                                                                directForm.setValue('challanImage', url ?? undefined, { shouldValidate: true });
                                                                            }}
                                                                            onRemove={() => {
                                                                                directChallanAttachment.remove();
                                                                                directForm.setValue('challanImage', undefined, { shouldValidate: true });
                                                                            }}
                                                                        />
                                                                    </FormControl>
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </>
                                                )}

                                                <FormField
                                                    control={directForm.control}
                                                    name="anyTransport"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Transporting Type</FormLabel>
                                                            <Select onValueChange={field.onChange} value={field.value || ""}>
                                                                <FormControl>
                                                                    <SelectTrigger className="w-full">
                                                                        <SelectValue placeholder="Include Transport?" />
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent>
                                                                    <SelectItem value="No">No</SelectItem>
                                                                    <SelectItem value="Yes">Yes</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>

                                            {watchAnyTransport === 'Yes' && (
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg border border-dashed">
                                                    <FormField
                                                        control={directForm.control}
                                                        name="transportAmount"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Freight Amount</FormLabel>
                                                                <FormControl>
                                                                    <Input type="number" {...field} placeholder="Amt" />
                                                                </FormControl>
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={directForm.control}
                                                        name="transporterName"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Transporter Name</FormLabel>
                                                                <FormControl>
                                                                    <Input {...field} placeholder="Name" />
                                                                </FormControl>
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={directForm.control}
                                                        name="vehicleNo"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Vehicle No</FormLabel>
                                                                <FormControl>
                                                                    <Input {...field} placeholder="No" />
                                                                </FormControl>
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                            )}

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {watchDirectStatus === 'Received' && (
                                                    <FormField
                                                        control={directForm.control}
                                                        name="billImage"
                                                        render={() => (
                                                            <FormItem>
                                                                <FormLabel>Bill Image</FormLabel>
                                                                <FormControl>
                                                                    <AttachmentUploadField
                                                                        id="direct-bill-image"
                                                                        accept="image/*"
                                                                        status={directBillAttachment.status}
                                                                        progress={directBillAttachment.progress}
                                                                        fileName={directBillAttachment.fileName}
                                                                        error={directBillAttachment.error}
                                                                        onSelect={async (file) => {
                                                                            const url = await directBillAttachment.select(file);
                                                                            directForm.setValue('billImage', url ?? undefined, { shouldValidate: true });
                                                                        }}
                                                                        onRemove={() => {
                                                                            directBillAttachment.remove();
                                                                            directForm.setValue('billImage', undefined, { shouldValidate: true });
                                                                        }}
                                                                    />
                                                                </FormControl>
                                                            </FormItem>
                                                        )}
                                                    />
                                                )}
                                                <FormField
                                                    control={directForm.control}
                                                    name="productImage"
                                                    render={() => (
                                                        <FormItem>
                                                            <FormLabel>Product Image</FormLabel>
                                                            <FormControl>
                                                                <AttachmentUploadField
                                                                    id="direct-product-image"
                                                                    accept="image/*"
                                                                    status={directProductAttachment.status}
                                                                    progress={directProductAttachment.progress}
                                                                    fileName={directProductAttachment.fileName}
                                                                    error={directProductAttachment.error}
                                                                    onSelect={async (file) => {
                                                                        const url = await directProductAttachment.select(file);
                                                                        directForm.setValue('productImage', url ?? undefined, { shouldValidate: true });
                                                                    }}
                                                                    onRemove={() => {
                                                                        directProductAttachment.remove();
                                                                        directForm.setValue('productImage', undefined, { shouldValidate: true });
                                                                    }}
                                                                />
                                                            </FormControl>
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>

                                            </div>

                                            <DialogFooter className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-3 border-t mt-4 shrink-0">
                                                <Button
                                                    type="submit"
                                                    disabled={
                                                        directForm.formState.isSubmitting ||
                                                        directChallanAttachment.status === 'uploading' ||
                                                        directBillAttachment.status === 'uploading' ||
                                                        directProductAttachment.status === 'uploading'
                                                    }
                                                    className="w-full sm:w-auto"
                                                >
                                                    <Plus className="h-4 w-4 mr-2" />
                                                    Submit Direct Entry
                                                </Button>
                                            </DialogFooter>
                                        </form>
                                    </Form>
                                </DialogContent>
                            </Dialog>
                        }
                    >
                        <Truck size={50} className="text-primary" />
                    </Heading>

                    <TabsContent value="pending">
                        <DataTable
                            data={tableData}
                            columns={columns}
                            searchFields={['vendorName', 'productName', 'billNo', 'indentNo', 'poNumber']}
                            dataLoading={indentLoading}
                        />
                    </TabsContent>
                    <TabsContent value="history">
                        <DataTable
                            data={historyData}
                            columns={historyColumns}
                            searchFields={['productName', 'billNo', 'indentNo', 'vendorName', 'poNumber']}
                            dataLoading={receivedLoading}
                        />
                    </TabsContent>
                    <TabsContent value="direct">
                        <DataTable
                            data={directData}
                            columns={[
                                { accessorKey: 'indentNo', header: 'Indent No' },
                                { accessorKey: 'receiverName', header: 'Receiver' },
                                { accessorKey: 'vendorName', header: 'Vendor' },
                                { accessorKey: 'productName', header: 'Product' },
                                { accessorKey: 'billNo', header: 'Bill No' },
                                {
                                    accessorKey: 'billAmount',
                                    header: 'Bill Amount',
                                    cell: ({ getValue }) => `₹${(getValue() as number || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                },
                                { accessorKey: 'qty', header: 'Qty' },
                                { accessorKey: 'receivingStatus', header: 'Rec. Status' },
                                {
                                    accessorKey: 'photoOfBill',
                                    header: 'Bill Photo',
                                    cell: ({ row }) => {
                                        const photo = (row.original as DirectStoreInData).photoOfBill;
                                        const fileUrl = getPublicFileUrl(photo);
                                        return fileUrl ? (
                                            <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View</a>
                                        ) : '-';
                                    }
                                },
                                {
                                    accessorKey: 'photoOfProduct',
                                    header: 'Product Photo',
                                    cell: ({ row }) => {
                                        const photo = (row.original as DirectStoreInData).photoOfProduct;
                                        const fileUrl = getPublicFileUrl(photo);
                                        return fileUrl ? (
                                            <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View</a>
                                        ) : '-';
                                    }
                                },
                                { accessorKey: 'transportationInclude', header: 'Trans. Include' },
                                { accessorKey: 'transporterName', header: 'Transporter' },
                                { accessorKey: 'amount', header: 'Freight Amount' },
                                { accessorKey: 'vehicleNo', header: 'Vehicle No' },
                            ] as ColumnDef<DirectStoreInData>[]}
                            searchFields={['productName', 'billNo', 'vendorName', 'receiverName']}
                            dataLoading={receivedLoading}
                        />
                    </TabsContent>
                </Tabs>

                {selectedIndent && (
                    <DialogContent className="w-[95vw] sm:w-[90vw] sm:max-w-4xl lg:max-w-6xl max-h-[92vh] flex flex-col p-4 sm:p-6 rounded-2xl sm:rounded-xl overflow-hidden">
                        <Form {...form}>
                            <form
                                onSubmit={form.handleSubmit(onSubmit, onError)}
                                className="flex flex-col flex-1 min-h-0 overflow-hidden"
                            >
                                <DialogHeader className="space-y-3 pb-3 border-b shrink-0 text-left pr-6 mb-2">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-2.5 bg-primary/10 rounded-xl shrink-0">
                                            <Truck className="h-5 w-5 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <DialogTitle className="text-lg sm:text-2xl font-bold tracking-tight truncate">Store In Processing</DialogTitle>
                                            <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-normal">
                                                Process reception and verify quality of delivered items
                                            </DialogDescription>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                                        <div className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-lg bg-muted/50 border border-border/50">
                                            <div className="p-1.5 bg-background rounded-md shadow-xs shrink-0">
                                                <Building className="h-4 w-4 text-primary" />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Vendor</span>
                                                <span className="text-xs sm:text-sm font-semibold truncate" title={selectedIndent.vendorName}>
                                                    {selectedIndent.vendorName}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-lg bg-muted/50 border border-border/50">
                                            <div className="p-1.5 bg-background rounded-md shadow-xs shrink-0">
                                                <FileText className="h-4 w-4 text-primary" />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Bill Number</span>
                                                <span className="text-xs sm:text-sm font-semibold truncate">{selectedIndent.billNo || 'N/A'}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-lg bg-primary/5 border border-primary/20">
                                            <div className="p-1.5 bg-primary/10 rounded-md shadow-xs shrink-0">
                                                <IndianRupee className="h-4 w-4 text-primary" />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[10px] uppercase font-bold text-primary/70 tracking-wider">Bill Amount</span>
                                                <span className="text-xs sm:text-sm font-bold text-primary truncate">₹{selectedIndent.billAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </DialogHeader>

                                <div className="flex-1 overflow-y-auto pr-1 space-y-4 sm:space-y-5 py-2">

                                {/* Product list - always show details table even for single products */}
                                {(selectedIndent.originalItems?.length || 0) > 0 && (
                                    <div className="border rounded-xl overflow-x-auto shadow-xs max-h-[300px] sm:max-h-[400px]">
                                        <div className="bg-muted px-3 py-2 text-xs sm:text-sm font-semibold">Products in this shipment ({selectedIndent.originalItems?.length})</div>
                                        <table className="w-full min-w-[620px] text-xs sm:text-sm">
                                            <thead className="bg-muted/40 border-b sticky top-0 z-10">
                                                <tr>
                                                    <th className="px-3 py-2 text-left bg-muted">S.No.</th>
                                                    <th className="px-3 py-2 text-left bg-muted">Lift No.</th>
                                                    <th className="px-3 py-2 text-left bg-muted">Product</th>
                                                    <th className="px-3 py-2 text-left bg-muted">Indent No.</th>
                                                    <th className="px-3 py-2 text-right bg-muted">Lift Qty</th>
                                                    <th className="px-3 py-2 text-right w-32 bg-muted">Received Qty</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {itemFields.map((field, idx) => (
                                                    <tr key={field.id} className="hover:bg-muted/30 transition-colors">
                                                        <td className="px-3 py-2">{idx + 1}</td>
                                                        <td className="px-3 py-2 text-muted-foreground">{field.liftNumber}</td>
                                                        <td className="px-3 py-2 font-medium">{field.productName}</td>
                                                        <td className="px-3 py-2 text-muted-foreground">{field.indentNo}</td>
                                                        <td className="px-3 py-2 text-right">{field.qty}</td>
                                                        <td className="px-3 py-2">
                                                            <FormField
                                                                control={form.control}
                                                                name={`items.${idx}.receivedQty`}
                                                                render={({ field: inputField }) => (
                                                                    <FormItem>
                                                                        <FormControl>
                                                                            <Input
                                                                                type="number"
                                                                                step="any"
                                                                                {...inputField}
                                                                                max={field.qty}
                                                                                className="h-8 text-right"
                                                                            />
                                                                        </FormControl>
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}


                                {/* Standard form fields */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                                    <FormField
                                        control={form.control}
                                        name="receiverName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Receiver Name</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="Enter receiver name" />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="challanNo"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Challan Number (optional)</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="Enter challan number" />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                                    <FormField
                                        control={form.control}
                                        name="status"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Bill Status</FormLabel>
                                                <FormControl>
                                                    <Select
                                                        onValueChange={field.onChange}
                                                        value={field.value || ""}
                                                    >
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="Select status" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Received">Received</SelectItem>
                                                            <SelectItem value="Not Received">Not Received</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="location"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Location (optional)</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="Enter storage location" />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                                    <FormField
                                        control={form.control}
                                        name="challanImage"
                                        render={() => (
                                            <FormItem>
                                                <FormLabel>Challan Image (optional)</FormLabel>
                                                <FormControl>
                                                    <AttachmentUploadField
                                                        id="storein-challan-image"
                                                        accept="image/*"
                                                        status={challanAttachment.status}
                                                        progress={challanAttachment.progress}
                                                        fileName={challanAttachment.fileName}
                                                        error={challanAttachment.error}
                                                        onSelect={async (file) => {
                                                            const url = await challanAttachment.select(file);
                                                            form.setValue('challanImage', url ?? undefined, { shouldValidate: true });
                                                        }}
                                                        onRemove={() => {
                                                            challanAttachment.remove();
                                                            form.setValue('challanImage', undefined, { shouldValidate: true });
                                                        }}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="photoOfProduct"
                                        render={() => (
                                            <FormItem>
                                                <div className="flex items-center gap-1">
                                                    <FormLabel className="m-0">Photo of Product</FormLabel>
                                                    <span className="text-destructive font-bold">*</span>
                                                </div>
                                                <FormControl>
                                                    <AttachmentUploadField
                                                        id="storein-product-photo"
                                                        accept="image/*"
                                                        status={productPhotoAttachment.status}
                                                        progress={productPhotoAttachment.progress}
                                                        fileName={productPhotoAttachment.fileName}
                                                        error={productPhotoAttachment.error}
                                                        onSelect={async (file) => {
                                                            const url = await productPhotoAttachment.select(file);
                                                            form.setValue('photoOfProduct', url ?? undefined, { shouldValidate: true });
                                                        }}
                                                        onRemove={() => {
                                                            productPhotoAttachment.remove();
                                                            form.setValue('photoOfProduct', undefined, { shouldValidate: true });
                                                        }}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                                    <FormField
                                        control={form.control}
                                        name="damageOrder"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Physical Check</FormLabel>
                                                <FormControl>
                                                    <Select
                                                        onValueChange={field.onChange}
                                                        value={field.value || ""}
                                                    >
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="Select" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Yes">OK</SelectItem>
                                                            <SelectItem value="No">Not OK</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="quantityAsPerBill"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Quantity As Per Bill</FormLabel>
                                                <FormControl>
                                                    <Select
                                                        onValueChange={field.onChange}
                                                        value={field.value}
                                                    >
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="Select" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Yes">Yes</SelectItem>
                                                            <SelectItem value="No">No</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="priceAsPerPoCheck"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold">Price as per PO?</FormLabel>
                                                <FormControl>
                                                    <Select
                                                        onValueChange={field.onChange}
                                                        value={field.value}
                                                    >
                                                        <SelectTrigger className="w-full border-blue-200 focus:ring-blue-500">
                                                            <SelectValue placeholder="Select" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Yes">Yes</SelectItem>
                                                            <SelectItem value="No">No</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />


                                    <FormField
                                        control={form.control}
                                        name="remark"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Remark</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        className="w-full"
                                                        rows={3}
                                                        placeholder="Enter remark"
                                                        {...field}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                </div>

                                <DialogFooter className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-3 border-t mt-3 shrink-0">
                                    <DialogClose asChild>
                                        <Button variant="outline" className="w-full sm:w-auto">Close</Button>
                                    </DialogClose>

                                    <Button
                                        type="submit"
                                        disabled={form.formState.isSubmitting || challanAttachment.status === 'uploading' || productPhotoAttachment.status === 'uploading'}
                                        className="w-full sm:w-auto min-w-[120px]"
                                    >
                                        Store In
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                )}
            </Dialog>

            {/* Admin edit dialog for Lifting History */}
            <Dialog open={!!editHistoryRow} onOpenChange={(open) => { if (!open) { setEditHistoryRow(null); editPhotoAttachment.reset(); } }}>
                <DialogContent className="w-[95vw] sm:w-full sm:max-w-md p-4 sm:p-6 rounded-2xl sm:rounded-xl">
                    <DialogHeader className="text-left pr-6">
                        <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                            <Pencil size={18} />
                            Edit Lifting Record
                        </DialogTitle>
                        <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                            Update delivery date and photo of bill for lift <span className="font-mono font-semibold">{editHistoryRow?.liftNumber}</span>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Delivery Date</label>
                            <Input
                                type="date"
                                value={editDeliveryDate}
                                onChange={(e) => setEditDeliveryDate(e.target.value)}
                                className="h-10"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Photo of Bill</label>
                            {editHistoryRow?.photoOfBill && (
                                <a
                                    href={getPublicFileUrl(editHistoryRow.photoOfBill)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block text-xs text-blue-600 underline mb-1"
                                >
                                    View current photo
                                </a>
                            )}
                            <AttachmentUploadField
                                id="edit-lift-photo-of-bill"
                                accept="image/*,.pdf"
                                status={editPhotoAttachment.status}
                                progress={editPhotoAttachment.progress}
                                fileName={editPhotoAttachment.fileName}
                                error={editPhotoAttachment.error}
                                onSelect={(file) => { editPhotoAttachment.select(file); }}
                                onRemove={editPhotoAttachment.remove}
                            />
                        </div>
                    </div>

                    <DialogFooter className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t">
                        <DialogClose asChild>
                            <Button variant="outline" className="w-full sm:w-auto" disabled={editSubmitting}>Cancel</Button>
                        </DialogClose>
                        <Button
                            className="w-full sm:w-auto min-w-[100px]"
                            disabled={editSubmitting || editPhotoAttachment.status === 'uploading'}
                            onClick={async () => {
                                if (!editHistoryRow) return;
                                setEditSubmitting(true);
                                try {
                                    // Already uploaded directly to S3 at selection time.
                                    const photoUrl = editPhotoAttachment.url || undefined;
                                    await updateLiftHistoryAdmin(editHistoryRow.id, {
                                        materialDate: editDeliveryDate || null,
                                        ...(photoUrl !== undefined && { photoOfBill: photoUrl }),
                                    });
                                    toast.success('Record updated successfully');
                                    setEditHistoryRow(null);
                                    editPhotoAttachment.reset({ committed: true });
                                    fetchAllData();
                                } catch {
                                    toast.error('Failed to update record');
                                } finally {
                                    setEditSubmitting(false);
                                }
                            }}
                        >
                            {editSubmitting ? 'Saving…' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <StageDeleteDialog
                open={!!deleteTarget}
                onOpenChange={(v) => !v && setDeleteTarget(null)}
                stageName="Store Check"
                isPermanentDelete={false}
                indentNumber={deleteTarget?.indentNo}
                productName={deleteTarget?.productName}
                onConfirm={async () => {
                    if (!deleteTarget) return;
                    await resetStoreInStage(deleteTarget.id, 'store_check');
                    toast.success(`Store Check details for Indent ${deleteTarget.indentNo} deleted and reset`);
                    setDeleteTarget(null);
                    await fetchAllData();
                    updateAll();
                }}
            />
        </div>
    );
};


