import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { toast } from 'sonner';
import { Form, FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import DataTable from '../element/DataTable';
import { fetchIndentRecords, deleteIndentRecord, uploadIndentAttachment, type IndentRecord } from '@/services/indentService';
import { filterByFirmAccess } from '@/lib/firmAccess';
import { canDeleteStoreStage } from '@/lib/roleAccess';
import StageDeleteDialog from '../element/StageDeleteDialog';
import { AttachmentUploadField } from '../element/AttachmentUploadField';
import { useAttachmentUpload } from '@/hooks/useAttachmentUpload';

import { formatDate, formatDateTimeFull, cn } from '@/lib/utils';
import { type ColumnDef } from '@tanstack/react-table';
import { Pill } from '../ui/pill';
import { ClipLoader as Loader } from 'react-spinners';
import { ClipboardList, Trash, Search, PlusCircle, Download, Calendar as CalendarIcon } from 'lucide-react';
import { useSheets } from '@/context/SheetsContext';
import Heading from '../element/Heading';
import { useState, useEffect, useCallback, useRef } from 'react';
import { storeApi } from '@/lib/apiClient';
import { useAuth } from '@/context/AuthContext';
import { calculateRealInventory } from '@/lib/inventoryUtils';
import { pdf } from '@react-pdf/renderer';
import IndentPdf from '../element/IndentPdf';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

// useAttachmentUpload is a hook, so it can't be called inside the products
// .map() loop directly — this child component gives each product row its
// own hook instance instead, keyed by the row's stable field.id so add/remove
// unmounts exactly the right row's upload state via React's own reconciliation.
function ProductAttachmentField({
    control,
    index,
    setValue,
    onUploadingChange,
    justSubmittedRef,
}: {
    control: any;
    index: number;
    setValue: (name: any, value: any, options?: any) => void;
    onUploadingChange: (index: number, isUploading: boolean) => void;
    justSubmittedRef: { current: boolean };
}) {
    const attachment = useAttachmentUpload(uploadIndentAttachment);
    // Mirrors `attachment` for the unmount-cleanup effect below, so that
    // effect doesn't need attachment (and its changing identity) as a dep.
    const attachmentRef = useRef(attachment);
    attachmentRef.current = attachment;

    useEffect(() => {
        onUploadingChange(index, attachment.status === 'uploading');
        return () => onUploadingChange(index, false);
    }, [attachment.status, index, onUploadingChange]);

    // This row unmounts either because the user removed it (its own Trash
    // button, via useFieldArray's remove()) or because a successful submit
    // replaced the whole products array with one fresh row. Only the first
    // case should discard an uploaded-but-unsaved file — justSubmittedRef is
    // briefly true during the second case, since the URL was just persisted.
    useEffect(() => {
        return () => {
            // Intentionally reading the LATEST ref value at cleanup time
            // (not a snapshot) — that's the entire point here, see the
            // comment above. Not a DOM-node ref, so the usual
            // "may have changed by cleanup time" concern doesn't apply.
            // eslint-disable-next-line react-hooks/exhaustive-deps
            if (!justSubmittedRef.current) {
                attachmentRef.current.reset();
            }
        };
    }, [justSubmittedRef]);

    return (
        <FormField
            control={control}
            name={`products.${index}.attachment`}
            render={() => (
                <FormItem>
                    <FormLabel>Attachment</FormLabel>
                    <FormControl>
                        <AttachmentUploadField
                            id={`indent-attachment-${index}`}
                            status={attachment.status}
                            progress={attachment.progress}
                            fileName={attachment.fileName}
                            error={attachment.error}
                            onSelect={async (file: File) => {
                                const url = await attachment.select(file);
                                setValue(`products.${index}.attachment`, url ?? undefined, {
                                    shouldValidate: true,
                                });
                            }}
                            onRemove={() => {
                                attachment.remove();
                                setValue(`products.${index}.attachment`, undefined, {
                                    shouldValidate: true,
                                });
                            }}
                        />
                    </FormControl>
                </FormItem>
            )}
        />
    );
}

export default () => {
    const {
        masterSheet: options,
        inventorySheet,
        storeInSheet,
        issueSheet,
        indentSheet,
        updateInventorySheet,
        updateMasterSheet,
        updateIndentSheet,
        updateAll,
    } = useSheets();
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [searchTermGroupHead, setSearchTermGroupHead] = useState('');
    const [searchTermProductName, setSearchTermProductName] = useState('');
    const [searchTermUOM, setSearchTermUOM] = useState('');
    const [searchTermAreaOfUse, setSearchTermAreaOfUse] = useState('');
    const [searchTermFirmName, setSearchTermFirmName] = useState('');
    const [historyData, setHistoryData] = useState<IndentRecord[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [exportingIndentNo, setExportingIndentNo] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<IndentRecord | null>(null);


    const [isAddingProject, setIsAddingProject] = useState(false);
    const [isAddingDept, setIsAddingDept] = useState(false);
    const [isAddingAreaOfUse, setIsAddingAreaOfUse] = useState(false);


    const schema = z.object({
        createdDate: z.string().nonempty({ message: 'Select Indent Date' }),
        indenterName: z.string().nonempty(),
        firmName: z.string().nonempty({ message: 'Select Project Name' }),
        firmId: z.coerce.number().optional(),

        indentStatus: z.enum(['Critical', 'Non-Critical'], {
            required_error: 'Select indent status',
        }),
        products: z
            .array(
                z.object({
                    // department: z.string().optional(),
                    groupHead: z.string().nonempty(),
                    productName: z.string().nonempty(),
                    quantity: z.coerce.number().gt(0, 'Must be greater than 0'),
                    minStockQty: z.coerce.number().optional(),
                    uom: z.string().nonempty(),
                    areaOfUse: z.string().nonempty(),
                    expectedRequirementDate: z.string().nonempty('Date is required').refine(val => {
                        const [year, month, day] = val.split('-').map(Number);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const selectDate = new Date(year, month - 1, day);
                        return selectDate >= today;
                    }, {
                        message: "Date cannot be in the past",
                    }),
                    // Already uploaded directly to S3 at selection time — this
                    // field holds the resulting URL string by submit time, not a File.
                    attachment: z.any().optional(),
                    specifications: z.string().optional(),
                })
            )
            .min(1, 'At least one product is required'),
    });

    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            createdDate: new Date().toISOString().split('T')[0],
            indenterName: '',
            firmName: '',
            firmId: undefined,

            indentStatus: undefined,
            products: [
                {
                    attachment: undefined,
                    uom: '',
                    productName: '',
                    specifications: '',
                    quantity: '' as any,
                    minStockQty: 0,
                    areaOfUse: '',
                    expectedRequirementDate: '',
                    groupHead: '',
                    // department: '',
                },
            ],
        },
    });

    const products = form.watch('products');
    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'products',
    });

    // Tracks which product rows currently have an attachment upload in
    // flight, aggregated from each row's own ProductAttachmentField instance.
    const [uploadingRows, setUploadingRows] = useState<Set<number>>(new Set());
    const handleUploadingChange = useCallback((index: number, isUploading: boolean) => {
        setUploadingRows((prev) => {
            const next = new Set(prev);
            if (isUploading) {
                next.add(index);
            } else {
                next.delete(index);
            }
            return next;
        });
    }, []);

    // Briefly set to true around the post-submit form.reset() below, so the
    // product rows' own unmount-cleanup (see ProductAttachmentField) knows
    // not to discard attachments that were just successfully persisted.
    const justSubmittedRef = useRef(false);
    // Always flips the flag back off after every commit. No dependency array
    // is intentional: React runs every removed component's effect cleanup
    // before any new/changed effect's setup within one commit, so on the
    // commit caused by the post-submit form.reset() below, the old rows'
    // unmount cleanup (which reads justSubmittedRef) is guaranteed to run
    // before this effect's setup (which clears it) — see the comment at the
    // reset() call site in onSubmit for why a microtask-based reset is wrong.
    useEffect(() => {
        justSubmittedRef.current = false;
    });


    useEffect(() => {
        if (user?.username) {
            fetchHistory();
        }
    }, [user?.username, user?.firm_access]);

    const fetchHistory = async () => {
        setHistoryLoading(true);
        try {
            // Pass permitted firms to the service for backend-level filtering
            const permittedFirms = (user?.administrate || !user?.firm_access || user?.firm_access.length === 0) ? undefined : user.firm_access;
            const data = await fetchIndentRecords(permittedFirms);
            
            // Secondary frontend check for absolute security/robustness
            const filtered = filterByFirmAccess(data, permittedFirms, {
                id: (i) => i.firm_id,
                name: (i) => i.firm_name
            });
            
            setHistoryData(filtered);


        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setHistoryLoading(false);
        }
    };

    const historyColumns: ColumnDef<IndentRecord>[] = [
        { accessorKey: 'indent_number', header: 'Indent No.' },
        {
            accessorKey: 'timestamp',
            header: 'Date',
            cell: ({ row }) => row.original.timestamp ? formatDate(new Date(row.original.timestamp)) : '-',
        },
        { accessorKey: 'firm_name', header: 'Project' },
        { accessorKey: 'indenter_name', header: 'Indenter' },

        { accessorKey: 'group_head', header: 'Group Head' },
        { accessorKey: 'product_name', header: 'Product' },
        { accessorKey: 'quantity', header: 'Qty' },
        { accessorKey: 'uom', header: 'UOM' },
        { accessorKey: 'area_of_use', header: 'Area of Use' },
        {
            accessorKey: 'expected_req_date',
            header: 'Expected Date',
            cell: ({ row }) => row.original.expected_req_date ? formatDate(new Date(row.original.expected_req_date)) : '-',
        },
        { accessorKey: 'specifications', header: 'Remarks' },
        {
            accessorKey: 'indent_status',
            header: 'Priority',
            cell: ({ row }) => (
                <Pill variant={row.original.indent_status === 'Critical' ? 'reject' : 'secondary'}>
                    {row.original.indent_status}
                </Pill>
            ),
        },
        {
            accessorKey: 'vendor_type',
            header: 'Status',
            cell: ({ row }) => (
                <Pill variant={row.original.vendor_type === 'Reject' ? 'reject' : row.original.vendor_type === 'Pending' ? 'secondary' : 'primary'}>
                    {row.original.vendor_type}
                </Pill>
            ),
        },
        {
            id: 'actions',
            header: 'Action',
            cell: ({ row }) => {
                const indentNo = row.original.indent_number;
                const isLoading = exportingIndentNo === indentNo;
                const canDelete = canDeleteStoreStage(user, 'create_indent');
                return (
                    <div className="flex items-center gap-1.5">
                        <Button
                            size="sm"
                            variant="ghost"
                            disabled={isLoading}
                            onClick={() => handleExportIndentPdf(indentNo)}
                            className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 h-7 px-2 text-xs"
                        >
                            {isLoading ? <Loader size={11} color="currentColor" /> : <Download size={11} />}
                            View PDF
                        </Button>
                        {canDelete && (
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeleteTarget(row.original)}
                                className="flex items-center gap-1 text-red-600 hover:text-red-800 hover:bg-red-50 h-7 px-2 text-xs"
                                title="Delete Indent"
                            >
                                <Trash size={12} />
                                Delete
                            </Button>
                        )}
                    </div>
                );
            },
        },
    ];

    const handleFirmNameSelect = (_val: string) => {
        form.setValue('indenterName', '');
    };

    const handleAddProject = async () => {
        if (!searchTermFirmName.trim()) return;
        setIsAddingProject(true);
        try {
            const data: any = await storeApi.insert('firm', { firm_name: searchTermFirmName.trim() });
            const inserted = Array.isArray(data) ? data[0] : data;

            toast.success(`Project "${searchTermFirmName}" added successfully!`);
            // Refresh firms list from context
            updateMasterSheet();
            // Automatically select the newly added project
            form.setValue('firmName', searchTermFirmName.trim());
            if (inserted?.id) form.setValue('firmId', inserted.id);
            handleFirmNameSelect(searchTermFirmName.trim());
            setSearchTermFirmName('');

        } catch (error) {
            console.error('Error adding project:', error);
            toast.error('Failed to add project. It might already exist.');
        } finally {
            setIsAddingProject(false);
        }
    };


    const handleAddAreaOfUse = async (index: number, areaValue?: string) => {
        const value = areaValue || form.getValues(`products.${index}.areaOfUse`);
        if (!value || !value.trim()) {
            toast.error("Please enter a value to add");
            return;
        }
        setIsAddingAreaOfUse(true);
        try {
            await storeApi.insert('area_of_use', { name: value.trim() });

            toast.success(`Area "${value}" added successfully!`);
            form.setValue(`products.${index}.areaOfUse`, value.trim());
            setSearchTermAreaOfUse('');
            updateMasterSheet();
        } catch (error) {
            console.error('Error adding area of use:', error);
            toast.error('Failed to add area of use.');
        } finally {
            setIsAddingAreaOfUse(false);
        }
    };


    const handleAddDept = async () => {
        if (!searchTerm.trim()) return;
        setIsAddingDept(true);
        try {
            await storeApi.insert('department', { name: searchTerm.trim() });

            toast.success(`Department "${searchTerm}" added successfully!`);
            // Refresh options from context
            updateMasterSheet();
            setSearchTerm('');
        } catch (error) {
            console.error('Error adding department:', error);
            toast.error('Failed to add department. It might already exist.');
        } finally {
            setIsAddingDept(false);
        }
    };

    // Function to handle Group Head selection
    const handleGroupHeadChange = async (index: number, groupHead: string) => {
        form.setValue(`products.${index}.groupHead`, groupHead);
        
        // Filter products for this group head
        const productOptions = options?.products[groupHead] || [];
        
        // If only one product exists, auto-select it
        if (productOptions.length === 1) {
            handleItemChange(index, productOptions[0]);
        } else {
            // Reset product and UOM if group head changed and multiple products exist
            form.setValue(`products.${index}.productName`, '');
            form.setValue(`products.${index}.uom`, '');
            form.setValue(`products.${index}.minStockQty`, 0);
        }

        // Auto-select area of use if possible (e.g., if there's only one used with this group head in history, or from master)
        // For now, if there's only one area of use in options, we could pick it, but usually area of use is site-specific.
        if (options?.areaOfUses.length === 1) {
            form.setValue(`products.${index}.areaOfUse`, options.areaOfUses[0]);
        }
    };

    // Resolve item details from context maps — zero DB round trips
    const handleItemChange = (index: number, itemName: string) => {
        form.setValue(`products.${index}.productName`, itemName);

        const groupHeadName = options?.itemGroupHeadMap?.[itemName] || '';
        const uomName = options?.itemUomMap?.[itemName] || '';

        if (groupHeadName) form.setValue(`products.${index}.groupHead`, groupHeadName);
        if (uomName) form.setValue(`products.${index}.uom`, uomName);

        // Update displayed stock qty from context (synchronous, no DB call)
        const firmName = form.getValues('firmName');
        if (firmName && groupHeadName) {
            const realInventory = calculateRealInventory(
                inventorySheet || [], indentSheet || [], storeInSheet || [], issueSheet || [], [], firmName
            );
            const thisItem = realInventory.find(i => i.itemName === itemName && i.groupHead === groupHeadName);
            form.setValue(`products.${index}.minStockQty`, thisItem?.current ?? 0);
        } else {
            form.setValue(`products.${index}.minStockQty`, 0);
        }
    };

    // Function to fetch and update inventory when product is clicked/selected
    const handleProductSelect = async (index: number, productName: string, groupHead: string, quantityToAdd: number = 1) => {
        try {
            const firmName = form.getValues('firmName');
            const firmId = form.getValues('firmId') || options?.firmObjects?.find((f: { name: string; id: number }) => f.name === firmName)?.id;

            if (!firmId) {
                toast.error('Project ID is required for inventory');
                return;
            }

            // Calculate the actual stock dynamically using the same logic as the Inventory page
            const realInventory = calculateRealInventory(
                inventorySheet || [],
                indentSheet || [],
                storeInSheet || [],
                issueSheet || []
            );

            const thisItem = realInventory.find(i =>
                i.itemName === productName && i.groupHead === groupHead
            );

            if (thisItem) {
                form.setValue(`products.${index}.minStockQty`, thisItem.current);
            } else {
                console.warn(`Item ${productName} not found in inventory master`);
            }

            // Sync the 'indented' count in the DB as per original logic
            const inventoryRecords: any[] = await storeApi.fetch('inventory', {
                item_name: productName,
                group_head: groupHead,
                firm_id: firmId,
            });
            const inventoryData = inventoryRecords?.[0];

            if (inventoryData) {
                // Update the indented column by adding quantityToAdd
                const currentIndented = Number(inventoryData.indented) || 0;
                const newIndented = currentIndented + quantityToAdd;

                await storeApi.update('inventory', inventoryData.id, {
                    indented: newIndented,
                    firm_id: firmId || null,
                    firm_name: firmName || ''
                });
            } else {
                // If no inventory record exists, create one with indented = quantityToAdd
                await storeApi.insert('inventory', {
                    item_name: productName,
                    group_head: groupHead,
                    indented: quantityToAdd,
                    firm_name: firmName || '',
                    firm_id: firmId || null,
                    timestamp: new Date().toISOString(),
                });
            }
        } catch (error) {
            console.error('Error in handleProductSelect:', error);
            toast.error('Failed to process inventory update');
        }
    };

    // Fetch next indent number by querying DB directly + checking local state
    const fetchNextIndentNumber = async (): Promise<string> => {
        let maxNum = 0;

        // 1. Fetch directly from DB to get absolute latest SI-XXXX across all records
        try {
            const data: any[] = await storeApi.fetch('indent', {
                order: 'id.desc',
                limit: 500,
            });

            if (data) {
                for (const row of data) {
                    const match = String(row.indent_number || '').match(/^SI-(\d+)$/i);
                    if (match) {
                        const num = parseInt(match[1], 10);
                        if (num > maxNum) maxNum = num;
                    }
                }
            }
        } catch (err) {
            console.error('Error fetching DB indent number:', err);
        }

        // 2. Fallback / check against in-memory historyData and indentSheet
        if (historyData && historyData.length > 0) {
            for (const r of historyData) {
                const match = String(r.indent_number || '').match(/^SI-(\d+)$/i);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (num > maxNum) maxNum = num;
                }
            }
        }
        if (indentSheet && indentSheet.length > 0) {
            for (const r of indentSheet) {
                const match = String(r.indentNumber || '').match(/^SI-(\d+)$/i);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (num > maxNum) maxNum = num;
                }
            }
        }

        return `SI-${String(maxNum + 1).padStart(4, '0')}`;
    };

    async function handleExportIndentPdf(indentNo: string) {
        setExportingIndentNo(indentNo);
        try {
            let logoBase64 = '';
            try {
                const r = await fetch('/logo.png');
                if (r.ok) {
                    const blob = await r.blob();
                    logoBase64 = await new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.readAsDataURL(blob);
                    });
                }
            } catch {}

            let rows = historyData.filter(r => r.indent_number === indentNo);
            if (rows.length === 0) {
                const data: any[] = await storeApi.fetch('indent', {
                    indent_number: indentNo,
                });
                if (data && data.length > 0) {
                    rows = data as any;
                }
            }

            if (rows.length === 0) {
                toast.error('Indent data not found');
                return;
            }

            const first = rows[0];

            const blob = await pdf(
                <IndentPdf
                    indentNumber={indentNo}
                    indenterName={first.indenter_name}
                    firmName={first.firm_name}
                    indentStatus={first.indent_status as 'Critical' | 'Non-Critical'}
                    date={first.timestamp ? formatDateTimeFull(new Date(first.timestamp)) : formatDateTimeFull(new Date())}
                    products={rows.map(r => ({
                        productName: r.product_name,
                        groupHead: r.group_head ?? '',
                        quantity: r.quantity,
                        uom: r.uom,
                        expectedRequirementDate: r.expected_req_date || '',
                        specifications: r.specifications || '',
                        areaOfUse: r.area_of_use || '',
                    }))}
                    logo={logoBase64 || '/logo.png'}
                /> as any
            ).toBlob();

            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
            toast.success(`${indentNo} PDF opened`);
        } catch (err) {
            console.error(err);
            toast.error('Failed to generate PDF');
        } finally {
            setExportingIndentNo(null);
        }
    }

    async function onSubmit(data: z.infer<typeof schema>) {
        try {
            const firmId = data.firmId || options?.firmObjects?.find((f: { name: string; id: number }) => f.name === data.firmName)?.id;
            if (!firmId) {
                toast.error('Project ID is required to create an indent');
                return;
            }

            // 1. Indent number calculated directly from DB + state
            const nextIndentNumber = await fetchNextIndentNumber();
            // Already uploaded directly to S3 at selection time — each
            // product's attachment field holds the resulting URL string.
            const attachmentUrls = data.products.map(
                (product) => (product.attachment as unknown as string) || ''
            );

            // 2. Insert rows immediately — don't wait for PDF
            const now = new Date();
            let timestamp: string;
            if (data.createdDate) {
                const [year, month, day] = data.createdDate.split('-').map(Number);
                const d = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
                timestamp = d.toISOString();
            } else {
                timestamp = now.toISOString();
            }

            const rows = data.products.map((product, i) => ({
                timestamp,
                planned1: timestamp,
                indent_number: nextIndentNumber,
                indenter_name: data.indenterName,
                area_of_use: product.areaOfUse,
                group_head: product.groupHead,
                product_name: product.productName,
                quantity: product.quantity,
                min_stock_qty: product.minStockQty || 0,
                uom: product.uom,
                firm_name: data.firmName,
                firm_id: firmId,
                specifications: product.specifications || '',
                indent_status: data.indentStatus,
                expected_req_date: product.expectedRequirementDate,
                attachment: attachmentUrls[i] || '',
                indent_url: '',
                status: 'Pending',
            }));

            await storeApi.insert('indent', rows);

            // 3. Show success immediately — user is unblocked
            toast.success(`Indent ${nextIndentNumber} created successfully!`);
            fetchHistory();
            updateIndentSheet(true);
            updateAll(true);
                // 4. Increment inventory 'indented' counts in background (non-blocking)
            data.products.forEach(product => {
                const groupHead = product.groupHead || options?.itemGroupHeadMap?.[product.productName] || '';
                if (!groupHead || !firmId) return;
                handleProductSelect(0, product.productName, groupHead, Number(product.quantity) || 1).catch(console.error);
            });

            // The row(s) being replaced below just had their attachment URLs
            // persisted via storeApi.insert above — tell each row's
            // ProductAttachmentField (about to unmount) not to delete them.
            // The flag is flipped back off by the always-on effect further
            // down, which — because React runs every removed component's
            // effect cleanup before any new/changed effect's setup within a
            // single commit — is guaranteed to run after these rows' unmount
            // cleanup has already read it as true. A queueMicrotask reset
            // here would fire too early (microtasks drain before React's
            // passive-effects flush), incorrectly deleting files that were
            // just successfully saved.
            justSubmittedRef.current = true;
            form.reset({
                createdDate: new Date().toISOString().split('T')[0],
                indenterName: '',
                firmName: '',
                firmId: undefined,
                indentStatus: '' as any,
                products: [{
                    attachment: undefined,
                    uom: '',
                    productName: '',
                    specifications: '',
                    quantity: '' as any,
                    minStockQty: 0,
                    areaOfUse: '',
                    expectedRequirementDate: '',
                    groupHead: '',
                }],
            });
        } catch (error) {
            console.error('Error in onSubmit:', error);
            toast.error('Error while creating indent! Please try again');
        }
    }

    function onError(e: any) {
        console.log(e);
        toast.error('Please fill all required fields');
    }

    return (
        <div className="h-full space-y-4 md:space-y-6 flex flex-col px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            <Tabs defaultValue="pending" onValueChange={(val) => val === 'history' && fetchHistory()}>
                <Heading
                    heading="Create Indent"
                    subtext="Create new Indent"
                    tabs
                    pendingLabel="Create"
                >
                    <PlusCircle size={50} className="text-primary" />
                </Heading>

                <TabsContent value="pending">
                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(onSubmit, onError)}
                            className="space-y-8"
                        >
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                                <FormField
                                    control={form.control}
                                    name="createdDate"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>
                                                Indent Date
                                                <span className="text-destructive">*</span>
                                            </FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant="outline"
                                                            className={cn(
                                                                "w-full justify-between text-left font-normal h-10 px-3 bg-background",
                                                                !field.value && "text-muted-foreground"
                                                            )}
                                                        >
                                                            <span>{field.value ? formatDate(field.value) : "Select date"}</span>
                                                            <CalendarIcon className="h-4 w-4 opacity-70" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={field.value ? new Date(field.value + 'T00:00:00') : undefined}
                                                        onSelect={(date) => {
                                                            if (date) {
                                                                const pad = (n: number) => n.toString().padStart(2, '0');
                                                                const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
                                                                field.onChange(dateStr);
                                                            }
                                                        }}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="firmName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                Project Name
                                                <span className="text-destructive">*</span>
                                            </FormLabel>
                                            <Select
                                                onValueChange={(val) => {
                                                    field.onChange(val);
                                                    const firmObj = options?.firmObjects?.find(f => f.name === val);
                                                    if (firmObj) form.setValue('firmId', firmObj.id);
                                                    handleFirmNameSelect(val);

                                                    // Recalculate stock for all rows
                                                    const currentProducts = form.getValues('products') || [];
                                                    currentProducts.forEach((product, idx) => {
                                                        const pName = product.productName;
                                                        const gHead = product.groupHead;
                                                        if (val && pName && gHead) {
                                                            const realInventory = calculateRealInventory(
                                                                inventorySheet || [], indentSheet || [], storeInSheet || [], issueSheet || [], [], val
                                                            );
                                                            const thisItem = realInventory.find(i => i.itemName === pName && i.groupHead === gHead);
                                                            form.setValue(`products.${idx}.minStockQty`, thisItem?.current ?? 0);
                                                        } else {
                                                            form.setValue(`products.${idx}.minStockQty`, 0);
                                                        }
                                                    });
                                                }}
                                                value={field.value}
                                            >
                                                <FormControl>
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Select Project Name" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <div className="flex items-center border-b px-3 pb-3">
                                                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                                        <input
                                                            placeholder="Search Project Name..."
                                                            value={searchTermFirmName}
                                                            onChange={(e) => setSearchTermFirmName(e.target.value)}
                                                            onKeyDown={(e) => e.stopPropagation()}
                                                            className="flex h-10 w-full rounded-md border-0 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                                                        />
                                                    </div>
                                                    {(options?.firmObjects || [])
                                                        .filter((f: { name: string; id: number }) => 
                                                            f.name.toLowerCase().includes(searchTermFirmName.toLowerCase())
                                                        )

                                                        .map((firm: { name: string; id: number }) => (
                                                            <SelectItem key={firm.id} value={firm.name} onClick={() => form.setValue('firmId', firm.id)}>

                                                                {firm.name}
                                                            </SelectItem>
                                                        ))}


                                                    {user?.administrate &&
                                                        searchTermFirmName.trim() !== '' &&
                                                        !(options?.firms || []).some(f => f.toLowerCase() === searchTermFirmName.toLowerCase()) && (
                                                            <div className="p-2 border-t mt-1">
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="w-full justify-start text-primary gap-2 h-8"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleAddProject();
                                                                    }}
                                                                    disabled={isAddingProject}
                                                                >
                                                                    {isAddingProject ? (
                                                                        <Loader size={14} color="currentColor" />
                                                                    ) : (
                                                                        <PlusCircle size={14} />
                                                                    )}
                                                                    Add "{searchTermFirmName}" as new Project
                                                                </Button>
                                                            </div>
                                                        )}
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="indenterName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                Indenter Name
                                                <span className="text-destructive">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Enter indenter name"
                                                    {...field}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="indentStatus"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                Indent Status
                                                <span className="text-destructive">*</span>
                                            </FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value || ""}>
                                                <FormControl>
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Select status" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="Critical">Critical</SelectItem>
                                                    <SelectItem value="Non-Critical">
                                                        Non-Critical
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-lg font-semibold">Products</h2>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                            append({
                                                // department: '',
                                                groupHead: '',
                                                productName: '',
                                                quantity: '' as any,
                                                minStockQty: 0,
                                                uom: '',
                                                areaOfUse: '',
                                                expectedRequirementDate: '',
                                                attachment: undefined,
                                                specifications: '',
                                            })
                                        }
                                    >
                                        Add Product
                                    </Button>
                                </div>

                                {fields.map((field, index) => {
                                    // const currentDept = products[index]?.department;
                                    const currentGroupHead = products[index]?.groupHead;
                                    const groupHeadOptions = options?.allGroupHeads || [];
                                    const productOptions = currentGroupHead
                                        ? options?.products[currentGroupHead] || []
                                        : Array.from(new Set(Object.values(options?.products || {}).flat())).sort();

                                    return (
                                        <div
                                            key={field.id}
                                            className="flex flex-col gap-4 border p-4 rounded-lg"
                                        >
                                            <div className="flex justify-between">
                                                <h3 className="text-md font-semibold">
                                                    Product {index + 1}
                                                </h3>
                                                <Button
                                                    variant="destructive"
                                                    type="button"
                                                    onClick={() => fields.length > 1 && remove(index)}
                                                    disabled={fields.length === 1}
                                                >
                                                    <Trash />
                                                </Button>
                                            </div>
                                            <div className="grid gap-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <FormField
                                                        control={form.control}
                                                        name={`products.${index}.groupHead`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>
                                                                    Group Head
                                                                    <span className="text-destructive">
                                                                        *
                                                                    </span>
                                                                </FormLabel>
                                                                <Select
                                                                    onValueChange={(val) => {
                                                                        handleGroupHeadChange(index, val);
                                                                    }}
                                                                    value={field.value}
                                                                >
                                                                    <FormControl>
                                                                        <SelectTrigger className="w-full">
                                                                            <SelectValue placeholder="Select group head" />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        <div className="flex items-center border-b px-3 pb-3">
                                                                            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                                                            <input
                                                                                placeholder="Search group head..."
                                                                                value={searchTermGroupHead}
                                                                                onChange={(e) =>
                                                                                    setSearchTermGroupHead(
                                                                                        e.target.value
                                                                                    )
                                                                                }
                                                                                onKeyDown={(e) =>
                                                                                    e.stopPropagation()
                                                                                }
                                                                                className="flex h-10 w-full rounded-md border-0 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                                                                            />
                                                                        </div>
                                                                        {groupHeadOptions
                                                                            .filter((gh) =>
                                                                                gh
                                                                                    .toLowerCase()
                                                                                    .includes(
                                                                                        searchTermGroupHead.toLowerCase()
                                                                                    )
                                                                            )
                                                                            .map((gh, i) => (
                                                                                <SelectItem
                                                                                    key={i}
                                                                                    value={gh}
                                                                                >
                                                                                    {gh}
                                                                                </SelectItem>
                                                                            ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </FormItem>
                                                        )}
                                                    />
                                                    {/* <FormField
                                                        control={form.control}
                                                        name={`products.${index}.department`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>
                                                                    Department
                                                                </FormLabel>
                                                                <Select
                                                                    onValueChange={(val) => {
                                                                        field.onChange(val);
                                                                    }}
                                                                    value={field.value}
                                                                >
                                                                    <FormControl>
                                                                        <SelectTrigger className="w-full">
                                                                            <SelectValue placeholder="Select department" />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        <div className="flex items-center border-b px-3 pb-3">
                                                                            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                                                            <input
                                                                                placeholder="Search departments..."
                                                                                value={searchTerm}
                                                                                onChange={(e) =>
                                                                                    setSearchTerm(
                                                                                        e.target.value
                                                                                    )
                                                                                }
                                                                                onKeyDown={(e) =>
                                                                                    e.stopPropagation()
                                                                                }
                                                                                className="flex h-10 w-full rounded-md border-0 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                                                                            />
                                                                        </div>
                                                                        {(options?.departments || [])
                                                                            .filter((dept) =>
                                                                                dept
                                                                                    .toLowerCase()
                                                                                    .includes(
                                                                                        searchTerm.toLowerCase()
                                                                                    )
                                                                            )
                                                                            .map((dept, i) => (
                                                                                <SelectItem
                                                                                    key={i}
                                                                                    value={dept}
                                                                                >
                                                                                    {dept}
                                                                                </SelectItem>
                                                                            ))}

                                                                        {searchTerm.trim() !== '' &&
                                                                            !(options?.departments || []).some(d => d.toLowerCase() === searchTerm.toLowerCase()) && (
                                                                                <div className="p-2 border-t mt-1">
                                                                                    <Button
                                                                                        type="button"
                                                                                        variant="ghost"
                                                                                        size="sm"
                                                                                        className="w-full justify-start text-primary gap-2 h-8"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            handleAddDept(index);
                                                                                        }}
                                                                                        disabled={isAddingDept}
                                                                                    >
                                                                                        {isAddingDept ? (
                                                                                            <Loader size={14} color="currentColor" />
                                                                                        ) : (
                                                                                            <PlusCircle size={14} />
                                                                                        )}
                                                                                        Add "{searchTerm}" as new Dept
                                                                                    </Button>
                                                                                </div>
                                                                            )}
                                                                    </SelectContent>
                                                                </Select>
                                                            </FormItem>
                                                        )}
                                                    /> */}
                                                    <FormField
                                                        control={form.control}
                                                        name={`products.${index}.areaOfUse`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>
                                                                    Area Of Use
                                                                    <span className="text-destructive">
                                                                        *
                                                                    </span>
                                                                </FormLabel>
                                                                <Select
                                                                    onValueChange={field.onChange}
                                                                    value={field.value}
                                                                >
                                                                    <FormControl>
                                                                        <SelectTrigger className="w-full">
                                                                            <SelectValue placeholder="Select Area of Use" />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        <div className="flex items-center border-b px-3 pb-3">
                                                                            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                                                            <input
                                                                                placeholder="Search Area of Use..."
                                                                                value={searchTermAreaOfUse}
                                                                                onChange={(e) => setSearchTermAreaOfUse(e.target.value)}
                                                                                onKeyDown={(e) => e.stopPropagation()}
                                                                                className="flex h-10 w-full rounded-md border-0 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                                                                            />
                                                                        </div>
                                                                        {(options?.areaOfUses || [])
                                                                            .filter((area) =>
                                                                                area
                                                                                    .toLowerCase()
                                                                                    .includes(searchTermAreaOfUse.toLowerCase())
                                                                            )
                                                                            .map((area, i) => (
                                                                                <SelectItem key={i} value={area}>
                                                                                    {area}
                                                                                </SelectItem>
                                                                            ))}

                                                                        {searchTermAreaOfUse.trim() !== '' &&
                                                                            !(options?.areaOfUses || []).some(area => area.toLowerCase() === searchTermAreaOfUse.trim().toLowerCase()) && (
                                                                                <div className="p-2 border-t mt-1">
                                                                                    <Button
                                                                                        type="button"
                                                                                        variant="ghost"
                                                                                        size="sm"
                                                                                        className="w-full justify-start text-primary gap-2 h-8"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            handleAddAreaOfUse(index, searchTermAreaOfUse.trim());
                                                                                        }}
                                                                                        disabled={isAddingAreaOfUse}
                                                                                    >
                                                                                        {isAddingAreaOfUse ? (
                                                                                            <Loader size={14} color="currentColor" />
                                                                                        ) : (
                                                                                            <PlusCircle size={14} />
                                                                                        )}
                                                                                        Add "{searchTermAreaOfUse}" as new Area
                                                                                    </Button>
                                                                                </div>
                                                                            )}
                                                                    </SelectContent>
                                                                </Select>
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <FormField
                                                        control={form.control}
                                                        name={`products.${index}.productName`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>
                                                                    Product Name
                                                                    <span className="text-destructive">
                                                                        *
                                                                    </span>
                                                                </FormLabel>
                                                                <Select
                                                                    onValueChange={(val) => {
                                                                        handleItemChange(index, val);
                                                                    }}
                                                                    value={field.value}
                                                                >
                                                                    <FormControl>
                                                                        <SelectTrigger className="w-full">
                                                                            <SelectValue placeholder="Select product" />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        <div className="flex items-center border-b px-3 pb-3">
                                                                            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                                                            <input
                                                                                placeholder="Search product..."
                                                                                value={searchTermProductName}
                                                                                onChange={(e) =>
                                                                                    setSearchTermProductName(
                                                                                        e.target.value
                                                                                    )
                                                                                }
                                                                                onKeyDown={(e) =>
                                                                                    e.stopPropagation()
                                                                                }
                                                                                className="flex h-10 w-full rounded-md border-0 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                                                                            />
                                                                        </div>
                                                                        {productOptions
                                                                            .filter((p) =>
                                                                                p
                                                                                    .toLowerCase()
                                                                                    .includes(
                                                                                        searchTermProductName.toLowerCase()
                                                                                    )
                                                                            )
                                                                            .map((p, i) => (
                                                                                <SelectItem
                                                                                    key={i}
                                                                                    value={p}
                                                                                >
                                                                                    {p}
                                                                                </SelectItem>
                                                                            ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name={`products.${index}.quantity`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>
                                                                    Quantity
                                                                    <span className="text-destructive">
                                                                        *
                                                                    </span>
                                                                </FormLabel>
                                                                <FormControl>
                                                                    <Input
                                                                        type="number"
                                                                        step="any"
                                                                        {...field}
                                                                        placeholder="Enter quantity"
                                                                        disabled={!currentGroupHead}
                                                                    />
                                                                </FormControl>
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name={`products.${index}.minStockQty`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>
                                                                    Current Stock Qty
                                                                </FormLabel>
                                                                <FormControl>
                                                                    <Input
                                                                        type="number"
                                                                        step="any"
                                                                        {...field}
                                                                        placeholder="Current stock quantity"
                                                                        disabled={!currentGroupHead}
                                                                        readOnly
                                                                    />
                                                                </FormControl>
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name={`products.${index}.uom`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>
                                                                    UOM
                                                                    <span className="text-destructive">
                                                                        *
                                                                    </span>
                                                                </FormLabel>
                                                                <Select
                                                                    onValueChange={field.onChange}
                                                                    value={field.value}
                                                                    disabled={!currentGroupHead}
                                                                >
                                                                    <FormControl>
                                                                        <SelectTrigger className="w-full">
                                                                            <SelectValue placeholder="Select UOM" />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        <div className="flex items-center border-b px-3 pb-3">
                                                                            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                                                            <input
                                                                                placeholder="Search UOM..."
                                                                                value={searchTermUOM}
                                                                                onChange={(e) =>
                                                                                    setSearchTermUOM(e.target.value)
                                                                                }
                                                                                onKeyDown={(e) => e.stopPropagation()}
                                                                                className="flex h-10 w-full rounded-md border-0 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                                                                            />
                                                                        </div>
                                                                        {(options?.uoms || [])
                                                                            .filter((uom) =>
                                                                                uom
                                                                                    .toLowerCase()
                                                                                    .includes(searchTermUOM.toLowerCase())
                                                                            )
                                                                            .map((uom, i) => (
                                                                                <SelectItem key={i} value={uom}>
                                                                                    {uom}
                                                                                </SelectItem>
                                                                            ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name={`products.${index}.expectedRequirementDate`}
                                                        render={({ field }) => (
                                                            <FormItem className="flex flex-col">
                                                                <FormLabel>
                                                                    Expected Requirement Date
                                                                    <span className="text-destructive">
                                                                        *
                                                                    </span>
                                                                </FormLabel>
                                                                <Popover>
                                                                    <PopoverTrigger asChild>
                                                                        <FormControl>
                                                                            <Button
                                                                                variant="outline"
                                                                                disabled={!currentGroupHead}
                                                                                className={cn(
                                                                                    "w-full justify-between text-left font-normal h-10 px-3 bg-background",
                                                                                    !field.value && "text-muted-foreground"
                                                                                )}
                                                                            >
                                                                                <span>{field.value ? formatDate(field.value) : "Select date"}</span>
                                                                                <CalendarIcon className="h-4 w-4 opacity-70" />
                                                                            </Button>
                                                                        </FormControl>
                                                                    </PopoverTrigger>
                                                                    <PopoverContent className="w-auto p-0" align="start">
                                                                        <Calendar
                                                                            mode="single"
                                                                            selected={field.value ? new Date(field.value + 'T00:00:00') : undefined}
                                                                            disabled={(date) => {
                                                                                const today = new Date();
                                                                                today.setHours(0, 0, 0, 0);
                                                                                return date < today;
                                                                            }}
                                                                            onSelect={(date) => {
                                                                                if (date) {
                                                                                    const pad = (n: number) => n.toString().padStart(2, '0');
                                                                                    const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
                                                                                    field.onChange(dateStr);
                                                                                }
                                                                            }}
                                                                            initialFocus
                                                                        />
                                                                    </PopoverContent>
                                                                </Popover>
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                                <ProductAttachmentField
                                                    control={form.control}
                                                    index={index}
                                                    setValue={form.setValue}
                                                    onUploadingChange={handleUploadingChange}
                                                    justSubmittedRef={justSubmittedRef}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name={`products.${index}.specifications`}
                                                    render={({ field }) => (
                                                        <FormItem className="w-full">
                                                            <FormLabel>Specifications</FormLabel>
                                                            <FormControl>
                                                                <Textarea
                                                                    placeholder="Enter specifications"
                                                                    className="resize-y"
                                                                    {...field}
                                                                />
                                                            </FormControl>
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div>
                                <Button
                                    className="w-full"
                                    type="submit"
                                    disabled={form.formState.isSubmitting || uploadingRows.size > 0}
                                >
                                    {form.formState.isSubmitting && (
                                        <Loader size={20} color="white" aria-label="Loading Spinner" />
                                    )}
                                    Create Indent
                                </Button>
                            </div>
                        </form>
                    </Form>
                </TabsContent>

                <TabsContent value="history">
                    <DataTable
                        data={historyData}
                        columns={historyColumns}
                        dataLoading={historyLoading}
                        searchFields={['indent_number', 'product_name', 'indenter_name', 'firm_name', 'group_head', 'area_of_use', 'specifications']}
                    />
                </TabsContent>
            </Tabs>

            <StageDeleteDialog
                open={!!deleteTarget}
                onOpenChange={(v) => !v && setDeleteTarget(null)}
                stageName="Create Indent"
                isPermanentDelete={true}
                indentNumber={deleteTarget?.indent_number}
                productName={deleteTarget?.product_name}
                onConfirm={async () => {
                    if (!deleteTarget) return;
                    const targetId = deleteTarget.id;
                    const indentNum = deleteTarget.indent_number;
                    await deleteIndentRecord(targetId);
                    toast.success(`Indent ${indentNum} deleted successfully`);
                    setDeleteTarget(null);
                    setHistoryData(prev => prev.filter(r => r.id !== targetId));
                    await fetchHistory();
                    updateIndentSheet(true);
                }}
            />

        </div>
    );
};

