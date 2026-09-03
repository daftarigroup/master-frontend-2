import type { ColumnDef, Row } from '@tanstack/react-table';
import { useEffect, useState } from 'react';
import DataTable from '../element/DataTable';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
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
import { Button } from '../ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel } from '../ui/form';
import { PuffLoader as Loader } from 'react-spinners';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
    fetchStoreInRecords,
    updateStoreInBillStatus,
    uploadBillCopyBillNotReceived,
    resetStoreInStage,
    type StoreInRecord,
} from '@/services/storeInService';
import { Truck, Trash } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useAuth } from '@/context/AuthContext';
import { hasPageAccess } from '@/components/element/PermissionGuard';
import Heading from '../element/Heading';
import { Pill } from '../ui/pill';
import { filterByFirmAccess } from '@/lib/firmAccess';
import { getPublicFileUrl, formatDateTime, parseCustomDate } from '@/lib/utils';
import { canDeleteStoreStage } from '@/lib/roleAccess';
import StageDeleteDialog from '../element/StageDeleteDialog';
import { useProject } from '@/context/ProjectContext';
import { AttachmentUploadField } from '../element/AttachmentUploadField';
import { useAttachmentUpload } from '@/hooks/useAttachmentUpload';

interface StoreInPendingData {
    id?: number;
    liftNumber: string;
    indentNo: string;
    billNo: string;
    vendorName: string;
    productName: string;
    qty: number;
    typeOfBill: string;
    billAmount: number;
    paymentType: string;
    advanceAmountIfAny: string;
    photoOfBill: string;
    transportationInclude: string;
    transporterName: string;
    amount: number;
    // Add missing properties that are used in columns
    poDate: string;
    plannedDate: string; 
    poNumber: string;
    vendor: string;
    indentNumber: string;
    product: string;
    uom: string;
    quantity: number;
    poCopy: string;

    billStatus: string;
    leadTimeToLiftMaterial: number;
    discountAmount: number;
    rowIndex?: number; 
    firmNameMatch: string;
    firm_id?: number;
    challanNo: string;
    challanImage: string;
    actual11?: string;
}


// Fix type names to match usage
type RecieveItemsData = StoreInPendingData;

export default () => {
    const { user } = useAuth();
    const { effectivePermittedFirms } = useProject();

    const [allData, setAllData] = useState<StoreInRecord[]>([]);
    const [tableData, setTableData] = useState<RecieveItemsData[]>([]);
    const [historyData, setHistoryData] = useState<RecieveItemsData[]>([]);
    const [selectedIndent, setSelectedIndent] = useState<RecieveItemsData | null>(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [dataLoading, setDataLoading] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<RecieveItemsData | null>(null);

    const fetchAllData = async () => {
        setDataLoading(true);
        try {
            const records = await fetchStoreInRecords(effectivePermittedFirms);
            setAllData(records);
        } catch (error) {
            console.error('Failed to fetch store-in records:', error);
            toast.error('Failed to load data');
        } finally {
            setDataLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, [effectivePermittedFirms]);

    useEffect(() => {
        const filteredByFirm = filterByFirmAccess(
            allData,
            effectivePermittedFirms,
            { id: (i: any) => i.firm_id, name: (i: any) => i.firmNameMatch }
        );

        const mapItem = (i: any): RecieveItemsData => ({
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
            advanceAmountIfAny: String(i.advanceAmountIfAny) || '',
            photoOfBill: i.photoOfBill || '',
            transportationInclude: i.transportationInclude || '',
            transporterName: i.transporterName || '',
            amount: i.amount || 0,
            poDate: i.poDate || '',
            plannedDate: i.planned11 || '',
            poNumber: i.poNumber || '',
            vendor: i.vendor || '',
            indentNumber: i.indentNumber || '',
            product: i.product || '',
            uom: i.uom || '',
            quantity: i.qty || 0,
            poCopy: i.poCopy || '',
            billStatus: i.billStatus || '',
            leadTimeToLiftMaterial: i.leadTimeToLiftMaterial || 0,
            discountAmount: i.discountAmount || 0,
            firmNameMatch: i.firmNameMatch || '',
            firm_id: i.firm_id,
            challanNo: i.challanNo || '',
            challanImage: i.challanImage || '',
            actual11: i.actual11 || '',
        });

        setTableData(
            filteredByFirm
                .filter((i) => i.planned11 !== '' && i.actual11 === '')
                .map(mapItem)
        );

        setHistoryData(
            filteredByFirm
                .filter((i) => i.planned11 !== '' && i.actual11 !== '')
                .map(mapItem)
        );
    }, [allData, user?.username, effectivePermittedFirms]);


    useEffect(() => {
        if (!openDialog) {
            form.reset({ status: undefined });
            billImageAttachment.reset();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [openDialog]);

    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const schema = z.object({
        status: z.enum(['ok']),
        // Holds an already-uploaded S3 URL string by submit time (upload
        // happens on file-select — see AttachmentUploadField). MIME-type/size
        // validation now happens in handleBillImageSelect BEFORE the upload
        // starts, rather than here after the fact — by the time this schema
        // runs, an invalid file would already have been rejected pre-upload.
        billImageStatus: z.any().optional(),
    });

    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            status: undefined,
            billImageStatus: undefined,
        },
    });

    const billImageAttachment = useAttachmentUpload(uploadBillCopyBillNotReceived);

    const ALLOWED_BILL_IMAGE_TYPES = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
    ];

    const handleBillImageSelect = async (file: File) => {
        if (!ALLOWED_BILL_IMAGE_TYPES.includes(file.type)) {
            toast.error('File must be an image (JPEG, PNG, GIF, WebP) or PDF');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error('File size should be less than 5MB');
            return;
        }
        const url = await billImageAttachment.select(file);
        form.setValue('billImageStatus', url ?? undefined, { shouldValidate: true });
    };


    const canEditBillNotReceived = hasPageAccess(user as any, 'finance_logistics', 'EDIT', 'billNotReceived');

    const columns: ColumnDef<RecieveItemsData>[] = [
        ...(canEditBillNotReceived
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
                                    Action
                                </Button>
                            </DialogTrigger>
                        );
                    },
                },
            ]
            : []),
        { accessorKey: 'liftNumber', header: 'Lift Number' },
        { accessorKey: 'indentNo', header: 'Indent No.' },
        { accessorKey: 'poNumber', header: 'PO Number' },
        { accessorKey: 'vendorName', header: 'Vendor Name' },
        { accessorKey: 'firmNameMatch', header: 'Project Name' },
        { accessorKey: 'productName', header: 'Product Name' },
        { accessorKey: 'billStatus', header: 'Bill Status' },
        {
            accessorKey: 'plannedDate', // ✅ FIXED: Using correct field name
            header: 'Planned Date',
            cell: ({ row }) => formatDate(row.original.plannedDate) // ✅ FIXED: Using correct field name
        },
        { accessorKey: 'billNo', header: 'Bill No.' },
        { accessorKey: 'qty', header: 'Qty' },
        { accessorKey: 'leadTimeToLiftMaterial', header: 'Lead Time To Lift Material' },
        { accessorKey: 'typeOfBill', header: 'Type Of Bill' },
        { accessorKey: 'billAmount', header: 'Bill Amount' },
        { accessorKey: 'discountAmount', header: 'Discount Amount' },
        { accessorKey: 'paymentType', header: 'Payment Type' },
        {
            accessorKey: 'advanceAmountIfAny',
            header: 'Advance Amount If Any',
            cell: ({ row }) => formatDate(row.original.advanceAmountIfAny)
        },

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
        { accessorKey: 'transportationInclude', header: 'Transportation Include' },
        { accessorKey: 'transporterName', header: 'Transporter Name' },
        { accessorKey: 'amount', header: 'Amount' },
        { accessorKey: 'challanNo', header: 'Challan No.' },
        {
            accessorKey: 'challanImage',
            header: 'Challan Image',
            cell: ({ row }) => {
                const photo = row.original.challanImage;
                const fileUrl = getPublicFileUrl(photo);
                return fileUrl ? (
                    <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
                        View Challan
                    </a>
                ) : <span className="text-muted-foreground">-</span>;
            },
        },
    ];

    const historyColumns: ColumnDef<RecieveItemsData>[] = [
        { accessorKey: 'liftNumber', header: 'Lift No.' },
        { accessorKey: 'indentNo', header: 'Indent No.' },
        { accessorKey: 'vendorName', header: 'Vendor Name' },
        { accessorKey: 'productName', header: 'Product' },
        { accessorKey: 'qty', header: 'Qty' },
        { accessorKey: 'billStatus', header: 'Bill Status' },
        {
            accessorKey: 'actual11',
            header: 'Received Date',
            cell: ({ getValue }) => <div>{getValue() ? formatDateTime(parseCustomDate(getValue() as string)) : '-'}</div>,
        },
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
        {
            id: 'stage_delete_action',
            header: 'Action',
            cell: ({ row }: { row: Row<RecieveItemsData> }) => {
                const canDelete = canDeleteStoreStage(user as any);
                if (!canDelete) return null;
                return (
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteTarget(row.original)}
                        className="flex items-center gap-1 text-red-600 hover:text-red-800 hover:bg-red-50 h-7 px-2 text-xs"
                        title="Delete Bill Status Update"
                    >
                        <Trash className="h-3.5 w-3.5" />
                        Delete
                    </Button>
                );
            },
        },
    ];





    // async function onSubmit(values: z.infer<typeof schema>) {
    //     try {
    //         const mappedData = [
    //             {
    //                 indentNo: selectedIndent!.indentNo,
    //                 actual11: new Date().toISOString(),
    //                 billStatusNew: values.status,
    //                 rowIndex: selectedIndent!.rowIndex, // ✅ Add this line
    //             }
    //         ];

    //         console.log('Mapped data to post:', mappedData);

    //         await postToSheet(mappedData, 'update', 'STORE IN');

    //         toast.success(`Bill status updated for ${selectedIndent?.indentNo}`);
    //         setOpenDialog(false);
    //         setTimeout(() => updateAll(), 1000);
    //     } catch (err) {
    //         console.error("Error:", err);
    //         toast.error('Failed to update');
    //     }
    // }


    async function onSubmit(values: z.infer<typeof schema>) {
        try {
            // Already uploaded directly to S3 at selection time.
            const billImageUrl = (values.billImageStatus as unknown as string) || '';

            const currentDateTime = new Date().toISOString();

            if (!selectedIndent?.liftNumber) {
                toast.error('No record selected');
                return;
            }


            await updateStoreInBillStatus(
                selectedIndent.liftNumber,
                selectedIndent.indentNo,
                selectedIndent.productName,
                {
                    actual11: currentDateTime,
                    billStatusNew: values.status,
                    billImageStatus: billImageUrl || '',
                }
            );

            toast.success(`Bill status updated for ${selectedIndent?.indentNo}`);
            billImageAttachment.reset({ committed: true });
            setOpenDialog(false);

            // Refresh data
            setTimeout(() => {
                fetchAllData();
            }, 1000);

        } catch (err) {
            console.error('❌ Error in onSubmit:', err);
            toast.error('Failed to update. Please try again.');
        }
    }




    function onError(e: any) {
        console.log(e);
        toast.error('Please fill all required fields');
    }

    // console.log("selectedIndent", selectedIndent);

    return (
        <div>
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <Tabs defaultValue="pending">
                    <Heading
                        heading="Bill Status"
                        subtext="Receive items from purchase orders"
                        tabs
                        pendingCount={tableData.length}
                        historyCount={historyData.length}
                    >
                        <Truck size={50} className="text-primary" />
                    </Heading>

                    <TabsContent value="pending">
                        <DataTable
                            data={tableData}
                            columns={columns}
                            searchFields={[
                                'liftNumber',
                                'indentNo',
                                'poNumber',
                                'vendorName',
                                'productName',
                                'billStatus',
                                'billNo',
                                'qty',
                                'leadTimeToLiftMaterial',
                                'typeOfBill',
                                'billAmount',
                                'discountAmount',
                                'paymentType',
                                'advanceAmountIfAny',
                                'transportationInclude',
                                'transporterName',
                                'amount'
                            ]}
                            dataLoading={dataLoading}
                        />
                    </TabsContent>

                    <TabsContent value="history">
                        <DataTable
                            data={historyData}
                            columns={historyColumns}
                            searchFields={[
                                'liftNumber',
                                'indentNo',
                                'vendorName',
                                'productName',
                                'billStatus',
                            ]}
                            dataLoading={dataLoading}
                        />
                    </TabsContent>

                </Tabs>

                {selectedIndent && (
                    <DialogContent className="sm:max-w-3xl">
                        <Form {...form}>
                            <form
                                onSubmit={form.handleSubmit(onSubmit, onError)}
                                className="space-y-5"
                            >
                                <DialogHeader className="space-y-1">
                                    <DialogTitle>Store In</DialogTitle>
                                    <DialogDescription>
                                        Store In from indent{' '}
                                        <span className="font-medium">
                                            {selectedIndent.indentNo}
                                        </span>
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="bg-muted p-4 rounded-md grid gap-3">
                                    <h3 className="text-lg font-bold">Item Details</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 bg-muted rounded-md gap-3 ">
                                        <div className="space-y-1">
                                            <p className="font-medium text-nowrap">Indent Number</p>
                                            <p className="text-sm font-light">
                                                {selectedIndent.indentNo}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="font-medium">Item Name</p>
                                            <p className="text-sm font-light">
                                                {selectedIndent.productName}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="font-medium text-nowrap">
                                                Ordered Quantity
                                            </p>
                                            <p className="text-sm font-light">
                                                {selectedIndent.quantity}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="font-medium text-nowrap">UOM</p>
                                            <p className="text-sm font-light">
                                                {selectedIndent.uom}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="status"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Select
                                                        onValueChange={field.onChange}
                                                        value={field.value}
                                                    >
                                                        <FormLabel>Status</FormLabel>
                                                        <FormControl>
                                                            <SelectTrigger className="w-full">
                                                                <SelectValue placeholder="Set status" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="ok">ok</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    {form.watch('status') === 'ok' && (
                                        <FormField
                                            control={form.control}
                                            name="billImageStatus"
                                            render={() => (
                                                <FormItem>
                                                    <FormLabel>Bill Image/Document</FormLabel>
                                                    <FormControl>
                                                        <AttachmentUploadField
                                                            id="bill-not-received-image"
                                                            accept="image/*,.pdf,application/pdf"
                                                            status={billImageAttachment.status}
                                                            progress={billImageAttachment.progress}
                                                            fileName={billImageAttachment.fileName}
                                                            error={billImageAttachment.error}
                                                            onSelect={handleBillImageSelect}
                                                            onRemove={() => {
                                                                billImageAttachment.remove();
                                                                form.setValue('billImageStatus', undefined, { shouldValidate: true });
                                                            }}
                                                        />
                                                    </FormControl>
                                                    <p className="text-xs text-muted-foreground">
                                                        Upload image (JPEG, PNG, GIF, WebP) or PDF document (Max: 5MB)
                                                    </p>
                                                </FormItem>
                                            )}
                                        />
                                    )}
                                </div>


                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button variant="outline">Close</Button>
                                    </DialogClose>

                                    <Button type="submit" disabled={form.formState.isSubmitting || billImageAttachment.status === 'uploading'}>
                                        {form.formState.isSubmitting && (
                                            <Loader
                                                size={20}
                                                color="white"
                                                aria-label="Loading Spinner"
                                            />
                                        )}
                                        Store In
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                )}
            </Dialog>

            <StageDeleteDialog
                open={!!deleteTarget}
                onOpenChange={(v) => !v && setDeleteTarget(null)}
                stageName="Bill Not Received"
                isPermanentDelete={false}
                indentNumber={deleteTarget?.indentNo}
                productName={deleteTarget?.productName}
                onConfirm={async () => {
                    if (!deleteTarget || !deleteTarget.id) return;
                    await resetStoreInStage(deleteTarget.id, 'bill_not_received');
                    toast.success(`Bill Status for Indent ${deleteTarget.indentNo} deleted and reset`);
                    setDeleteTarget(null);
                    await fetchAllData();
                }}
            />
        </div>
    );
};
