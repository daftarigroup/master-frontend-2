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
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { ClipLoader as Loader } from 'react-spinners';
import { ClipboardList, Trash, Search, RotateCcw } from 'lucide-react';
import { isAllowedFirm } from '@/lib/firmAccess';

import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { supabase } from '@/lib/supabase';
import type { IndentSheet } from '@/types';

import type { IssueSheet } from '@/types';
import Heading from '../element/Heading';
import { useEffect, useState, useMemo } from 'react';

import { fetchIssueRecords, createIssueRecords, updateIssueRecordById, type IssueRecord } from '@/services/issueService';
import { fetchMasterOptions, type MasterData } from '@/services/masterService';
import { useAuth } from '@/context/AuthContext';
import { useSheets } from '@/context/SheetsContext';
import { calculateRealInventory } from '@/lib/inventoryUtils';

export default () => {
    const { user } = useAuth();
    const {
        inventorySheet,
        indentSheet,
        storeInSheet,
        issueSheet: sheetIssues,
        stockTransferSheet,
        updateIssueSheet,
        updateStockTransferSheet,
    } = useSheets();

    const [options, setOptions] = useState<MasterData | null>(null);
    const [dataLoading, setDataLoading] = useState(true);

    const fetchData = async () => {
        try {
            setDataLoading(true);
            // We can call updateAll if we want the freshest data from DB
            updateIssueSheet(true);
            updateStockTransferSheet(true);
            const masterOptions = await fetchMasterOptions();
            setOptions(masterOptions);
        } catch (error) {
            console.error('Error fetching data for StoreIssue:', error);
        } finally {
            setDataLoading(false);
        }
    };

    useEffect(() => {
        if (user?.username) {
            fetchData();
        }
    }, [user?.username, user?.firm_access]);

    const [searchTerm, setSearchTerm] = useState('');
    const [searchTermGroupHead, setSearchTermGroupHead] = useState('');
    const [searchTermProductName, setSearchTermProductName] = useState('');
    const [searchTermUOM, setSearchTermUOM] = useState('');
    // const [searchTermDepartment, setSearchTermDepartment] = useState('');

    const schema = z.object({
        constructorName: z.string().nonempty('Contractor Name is required'),
        siteLocation: z.string().nonempty('Site Location is required'),
        projectName: z.string().nonempty('Project Name is required'),
        firmId: z.coerce.number().optional(),
        issueDate: z.string().nonempty('Issue Date is required'),
        remarks: z.string().optional(),

        issuePersonName: z.string().optional(),
        returnPersonName: z.string().optional(),
        damageRemark: z.string().optional(),
        rejectedDamageQty: z.coerce.number().optional(),
        id: z.number().optional(),
        products: z
            .array(
                z.object({
                    // department: z.string().optional(),
                    groupHead: z.string().nonempty(),
                    productName: z.string().nonempty(),
                    quantity: z.coerce.number().gt(0, 'Must be greater than 0'),
                    uom: z.string().nonempty(),
                    givenQuantity: z.coerce.number().gt(0, 'Must be greater than 0').optional(),
                })
            )
            .min(1, 'At least one product is required'),
    });

    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            constructorName: '',
            siteLocation: '',
            projectName: '',
            firmId: undefined,
            issueDate: new Date().toLocaleDateString('en-CA'),
            remarks: '',

            issuePersonName: '',
            returnPersonName: '',
            damageRemark: '',
            rejectedDamageQty: 0,
            products: [
                {
                    uom: '',
                    productName: '',
                    quantity: 1,
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

    const selectedProject = form.watch('projectName') || 'All';

    const realInventory = useMemo(() => {
        if (!inventorySheet) return [];
        return calculateRealInventory(
            inventorySheet,
            indentSheet || [],
            storeInSheet || [],
            sheetIssues || [],
            stockTransferSheet || [],
            selectedProject
        );
    }, [inventorySheet, indentSheet, storeInSheet, sheetIssues, stockTransferSheet, selectedProject]);

    async function onSubmit(data: z.infer<typeof schema>) {
        try {
            const rows: Partial<IssueRecord>[] = [];
            for (const product of data.products) {
                const row: Partial<IssueRecord> = {
                    timestamp: new Date().toISOString(),
                    uom: product.uom,
                    group_head: product.groupHead,
                    product_name: product.productName,
                    quantity: Number(product.quantity || 0),
                    constructor_name: data.constructorName,
                    site_location: data.siteLocation,
                    firm_name: data.projectName,
                    issue_to: data.remarks,
                    issue_person_name: data.issuePersonName,
                    return_person_name: data.returnPersonName,
                    damage_remark: data.damageRemark,
                    rejected_damage_qty: String(data.rejectedDamageQty || 0),
                };
                rows.push(row);
            }

            if (data.id) {
                // Return Logic
                const updateData: Partial<IssueRecord> = rows[0];
                delete updateData.issue_no;

                await updateIssueRecordById(data.id, updateData);
                toast.success('Return updated successfully');
            } else {
                // Create Logic (Issue)
                await createIssueRecords(rows);
                toast.success('Issue created successfully');
            }

            fetchData(); // Refresh data

            form.reset({
                constructorName: '',
                siteLocation: '',
                projectName: '',
                firmId: undefined,
                issueDate: new Date().toLocaleDateString('en-CA'),
                remarks: '',

                issuePersonName: '',
                returnPersonName: '',
                damageRemark: '',
                rejectedDamageQty: 0,
                products: [
                    {
                        uom: '',
                        productName: '',
                        quantity: 1,
                        groupHead: '',
                        // department: '',
                    },
                ],
            });
        } catch (error) {
            console.error('Error in onSubmit:', error);
            toast.error('Error while creating issue! Please try again');
        }
    }

    function onError(e: any) {
        console.error(e);
        toast.error('Please fill all required fields');
    }

    const handleIssueSelect = (issueId: string) => {
        const selected = sheetIssues.find(i => String(i.id) === issueId);
        if (selected) {
            form.setValue('constructorName', selected.constructorName || '');
            form.setValue('siteLocation', selected.siteLocation || '');
            form.setValue('projectName', selected.projectName || '');
            form.setValue('issueDate', selected.planned1 ? selected.planned1.slice(0, 10) : new Date().toLocaleDateString('en-CA'));
            form.setValue('remarks', selected.issueTo || '');
            form.setValue('issuePersonName', selected.issuePersonName || '');

            // Map the product
            form.setValue('products', [
                {
                    // department: selected.department,
                    groupHead: selected.groupHead,
                    productName: selected.productName,
                    quantity: selected.quantity,
                    uom: selected.uom,
                }
            ]);
            form.setValue('id', selected.id);
            toast.info(`Loaded issue ${selected.issueNo}`);
        }
    };

    return (
        <div className="pb-10">
            <Heading
                heading="Store Management"
                subtext="Create material issues"
            >
                <ClipboardList size={50} className="text-primary" />
            </Heading>

            <div className="max-w-6xl mx-auto px-4">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-8">
                        <Card className="border-slate-200 shadow-sm overflow-hidden">
                            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                                <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500">Issue Details</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="projectName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-600 font-semibold">Project Name <span className="text-destructive">*</span></FormLabel>
                                                <Select
                                                    onValueChange={(val) => {
                                                        field.onChange(val);
                                                        const firmObj = options?.firmObjects?.find(f => f.name === val);
                                                        if (firmObj) form.setValue('firmId', firmObj.id);
                                                    }}
                                                    value={field.value}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger className="w-full h-11 bg-white border-slate-200 focus:ring-primary/20">
                                                            <SelectValue placeholder="Select project" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {(options?.firmObjects || [])
                                                            .filter(f => isAllowedFirm({ id: f.id, name: f.name }, user?.firm_access || []))
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
                                        control={form.control}
                                        name="constructorName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-600 font-semibold">Contractor Name <span className="text-destructive">*</span></FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="w-full h-11 bg-white border-slate-200 focus:ring-primary/20">
                                                            <SelectValue placeholder="Select contractor" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {(options?.contractors || []).map((c, i) => (
                                                            <SelectItem key={i} value={c.contractorName}>
                                                                {c.contractorName}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="siteLocation"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-600 font-semibold">Site Location <span className="text-destructive">*</span></FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="w-full h-11 bg-white border-slate-200 focus:ring-primary/20">
                                                            <SelectValue placeholder="Select location" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {(options?.siteLocations || []).map((loc, i) => (
                                                            <SelectItem key={i} value={loc}>
                                                                {loc}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="issueDate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-600 font-semibold">Issue Date <span className="text-destructive">*</span></FormLabel>
                                                <FormControl>
                                                    <Input type="date" className="h-11 bg-white border-slate-200 focus:ring-primary/20" {...field} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="issuePersonName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-600 font-semibold">Issuer Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Person issuing material" className="h-11 bg-white border-slate-200 focus:ring-primary/20" {...field} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="remarks"
                                        render={({ field }) => (
                                            <FormItem className="md:col-span-2">
                                                <FormLabel className="text-slate-600 font-semibold">Purpose / Remarks</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Enter issue purpose or additional notes" className="h-11 bg-white border-slate-200 focus:ring-primary/20" {...field} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                                    <div className="w-2 h-6 bg-primary rounded-full" />
                                    Material List
                                </h3>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="bg-primary/5 text-primary border-primary/20 hover:bg-primary/10 font-bold"
                                    onClick={() => append({ uom: '', productName: '', quantity: 1, groupHead: '', /* department: '' */ })}
                                >
                                    + Add Item
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {fields.map((field, index) => {
                                    const groupHead = products[index]?.groupHead;
                                    const groupHeadOptions = options?.allGroupHeads || [];
                                    const productOptions = options?.products[groupHead] || [];

                                    return (
                                        <Card
                                            key={field.id}
                                            className="border-slate-200 shadow-sm hover:border-primary/30 transition-colors"
                                        >
                                            <CardContent className="p-4 sm:p-6">
                                                <div className="flex justify-between items-center mb-4">
                                                    <div className="bg-slate-100 px-3 py-1 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                                        Product Item #{index + 1}
                                                    </div>
                                                    {fields.length > 1 && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-full"
                                                            onClick={() => remove(index)}
                                                        >
                                                            <Trash size={16} />
                                                        </Button>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                                    <FormField
                                                        control={form.control}
                                                        name={`products.${index}.groupHead`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-xs font-semibold text-slate-500 uppercase">
                                                                    Group Head <span className="text-destructive">*</span>
                                                                </FormLabel>
                                                                <Select
                                                                    onValueChange={field.onChange}
                                                                    value={field.value}
                                                                >
                                                                    <FormControl>
                                                                        <SelectTrigger className="w-full h-10 bg-slate-50/50 border-slate-200">
                                                                            <SelectValue placeholder="Select Head" className="truncate" />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        {groupHeadOptions.map((gh, i) => (
                                                                            <SelectItem key={i} value={gh}>
                                                                                {gh}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </FormItem>
                                                        )}
                                                    />

                                                    <FormField
                                                        control={form.control}
                                                        name={`products.${index}.productName`}
                                                        render={({ field }) => (
                                                            <FormItem className="md:col-span-1">
                                                                <FormLabel className="text-xs font-semibold text-slate-500 uppercase">
                                                                    Product Name <span className="text-destructive">*</span>
                                                                </FormLabel>
                                                                <Select
                                                                    onValueChange={field.onChange}
                                                                    value={field.value}
                                                                    disabled={!groupHead}
                                                                >
                                                                    <FormControl>
                                                                        <SelectTrigger className="w-full h-10 bg-slate-50/50 border-slate-200">
                                                                            <SelectValue placeholder="Select Product" className="truncate" />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        {productOptions.map((p, i) => {
                                                                            const inv = realInventory.find(item => item.itemName === p);
                                                                            const stock = inv ? inv.current : 0;
                                                                            return (
                                                                                <SelectItem key={i} value={p}>
                                                                                    {p} (Stock: {stock})
                                                                                </SelectItem>
                                                                            );
                                                                        })}
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
                                                                <FormLabel className="text-xs font-semibold text-slate-500 uppercase">
                                                                    Quantity <span className="text-destructive">*</span>
                                                                </FormLabel>
                                                                <FormControl>
                                                                    <Input
                                                                        type="number"
                                                                        className="h-10 bg-slate-50/50 border-slate-200"
                                                                        {...field}
                                                                        disabled={!groupHead}
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
                                                                <FormLabel className="text-xs font-semibold text-slate-500 uppercase">
                                                                    UOM <span className="text-destructive">*</span>
                                                                </FormLabel>
                                                                <Select
                                                                    onValueChange={field.onChange}
                                                                    value={field.value}
                                                                    disabled={!groupHead}
                                                                >
                                                                    <FormControl>
                                                                        <SelectTrigger className="w-full h-10 bg-slate-50/50 border-slate-200">
                                                                            <SelectValue placeholder="UOM" className="truncate" />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        {(options?.uoms || []).map((uom, i) => (
                                                                            <SelectItem key={i} value={uom}>
                                                                                {uom}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="pt-4 pb-10">
                            <Button
                                className="w-full h-11 font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-200/50 transition-all active:scale-[0.98]"
                                type="submit"
                                disabled={form.formState.isSubmitting}
                            >
                                {form.formState.isSubmitting ? (
                                    <Loader size={20} color="white" />
                                ) : (
                                    <>Submit Store Issue</>
                                )}
                            </Button>
                        </div>
                    </form>
                </Form>
            </div>
        </div>
    );
};

