import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { toast } from 'sonner';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
import { RotateCcw, Trash, Plus } from 'lucide-react';
import Heading from '../element/Heading';
import { useEffect, useState, useMemo } from 'react';

import { createIssueRecords, type IssueRecord } from '@/services/issueService';
import { fetchMasterOptions, type MasterData } from '@/services/masterService';
import { useAuth } from '@/context/AuthContext';
import { useSheets } from '@/context/SheetsContext';
import { useProject } from '@/context/ProjectContext';
import { calculateRealInventory } from '@/lib/inventoryUtils';
import { isAllowedFirm } from '@/lib/firmAccess';
import { IssueKindPicker, type IssueKind } from '@/components/element/IssueKindPicker';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { MaintenanceIssueReturnForm } from '@/components/views/MaintenanceIssueReturnForm';
import { useSearchParams } from 'react-router-dom';
import { hasPageAccess } from '@/lib/permissions';


export default () => {
    const { user } = useAuth();
    const { effectivePermittedFirms, selectedProjectName, isAllProjects } = useProject();
    const {
        inventorySheet,
        indentSheet,
        storeInSheet,
        issueSheet: sheetIssues,
        stockTransferSheet,
        updateIssueSheet,
        updateStockTransferSheet,
        updateAll,
    } = useSheets();

    const [searchParams] = useSearchParams();
    const linkedWorkOrderId = searchParams.get('woId') ?? undefined;
    const linkedIssueId = searchParams.get('issueId') ?? undefined;

    const orderKinds = useMemo<IssueKind[]>(() => {
        const kinds: IssueKind[] = ['MATERIAL'];
        if (
            hasPageAccess(user, 'store_issue_maintenance', 'EDIT', 'storeIssueMaintenance') ||
            hasPageAccess(user, 'store_issue_return', 'EDIT', 'storeIssueReturn') ||
            user?.role === 'ADMIN' ||
            user?.role === 'SUPER_ADMIN'
        ) {
            kinds.push('MAINTENANCE');
        }
        return kinds;
    }, [user]);

    const [orderType, setOrderType] = useState<IssueKind>(() => {
        const wanted = searchParams.get('kind');
        return wanted === 'MAINTENANCE' ? 'MAINTENANCE' : 'MATERIAL';
    });

    const [options, setOptions] = useState<MasterData | null>(null);
    const [dataLoading, setDataLoading] = useState(true);

    const fetchData = async () => {
        try {
            setDataLoading(true);
            updateIssueSheet(true);
            updateStockTransferSheet(true);
            const masterOptions = await fetchMasterOptions();
            setOptions(masterOptions);
        } catch (error) {
            console.error('Error fetching data for StoreIssueReturn:', error);
        } finally {
            setDataLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [effectivePermittedFirms]);

    const schema = z.object({
        returnDate: z.string().nonempty('Return date is required'),
        projectName: z.string().optional(),
        returnPersonName: z.string().nonempty('Returner Name is required'),
        damageRemark: z.string().optional(),
        products: z
            .array(
                z.object({
                    groupHead: z.string().nonempty('Select group head'),
                    productName: z.string().nonempty('Select product'),
                    uom: z.string().optional(),
                    quantity: z.coerce.number().min(0, 'Cannot be negative'),
                    damageQty: z.coerce.number().min(0, 'Cannot be negative'),
                }).refine((p) => p.quantity > 0 || p.damageQty > 0, {
                    message: 'Enter good or damaged qty',
                    path: ['quantity'],
                })
            )
            .min(1, 'At least one product is required'),
    });

    const emptyItem = { groupHead: '', productName: '', uom: '', quantity: 0, damageQty: 0 };
    const todayStr = () => new Date().toLocaleDateString('en-CA');

    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            returnDate: todayStr(),
            projectName: '',
            returnPersonName: '',
            damageRemark: '',
            products: [{ ...emptyItem }],
        },
    });

    const products = form.watch('products');
    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'products',
    });

    // Return is booked against the active project; with "All Projects" the user picks one.
    const needsProjectPick = isAllProjects || !selectedProjectName;
    const effectiveProjectName = needsProjectPick ? (form.watch('projectName') || '') : selectedProjectName;

    const allGroupHeads = options?.allGroupHeads || [];
    const productsFor = (groupHead: string): string[] => {
        if (groupHead && options?.products?.[groupHead]) return options.products[groupHead];
        return Object.values(options?.products || {}).flat();
    };

    // Net quantity still out with the project for a product = issued - already returned.
    const netIssued = (productName: string, projectName: string) =>
        (sheetIssues || []).reduce((sum: number, i: any) => {
            if (i.productName !== productName) return sum;
            if (projectName && (i.projectName || i.firm_name) !== projectName) return sum;
            return sum + Number(i.givenQty || 0) - Number(i.rejected_damage_qty || 0);
        }, 0);

    async function onSubmit(data: z.infer<typeof schema>) {
        try {
            const projectName = effectiveProjectName;
            if (!projectName) {
                toast.error('Please select a project');
                return;
            }

            // Combine repeated products so the stock check sees the full quantity.
            const totals: Record<string, number> = {};
            for (const p of data.products) totals[p.productName] = (totals[p.productName] || 0) + Number(p.quantity || 0);
            for (const [name, qty] of Object.entries(totals)) {
                const max = Math.round(netIssued(name, projectName) * 100) / 100;
                if (qty > max) {
                    toast.error(`Cannot return ${qty} of "${name}". Only ${max} is issued to ${projectName}.`);
                    return;
                }
            }

            const firmId = options?.firmObjects?.find((f) => f.name === projectName)?.id;
            const stamp = new Date(`${data.returnDate}T${new Date().toTimeString().slice(0, 8)}`).toISOString();

            const rows: Partial<IssueRecord>[] = data.products.map((p) => {
                const remark = [
                    data.damageRemark?.trim(),
                    p.damageQty > 0 ? `Damaged qty: ${p.damageQty}` : '',
                ].filter(Boolean).join(' | ');
                return {
                    timestamp: stamp,
                    uom: p.uom || options?.itemUomMap?.[p.productName] || '',
                    group_head: p.groupHead,
                    product_name: p.productName,
                    quantity: 0,
                    given_qty: 0,
                    status: 'Returned',
                    actual1: stamp,
                    firm_name: projectName,
                    firm_id: firmId,
                    return_person_name: data.returnPersonName,
                    damage_remark: remark,
                    // inventory counts rejected_damage_qty as stock coming back; only good qty goes back to stock
                    rejected_damage_qty: String(p.quantity || 0),
                };
            });

            await createIssueRecords(rows);
            toast.success(`${rows.length} item(s) returned successfully`);

            fetchData();
            updateAll(true);

            form.reset({
                returnDate: todayStr(),
                projectName: '',
                returnPersonName: '',
                damageRemark: '',
                products: [{ ...emptyItem }],
            });
        } catch (error) {
            console.error('Error in onSubmit:', error);
            toast.error('Error while processing return! Please try again');
        }
    }

    function onError(e: any) {
        console.error(e);
        toast.error('Please fill all required fields');
    }

    return (
        <div className="pb-10">
            <Heading
                heading="Store Issue Return"
                subtext="Process material returns"
            >
                <RotateCcw size={50} className="text-primary" />
            </Heading>

            <div className="max-w-6xl mx-auto px-4">
                {orderKinds.length > 1 && (
                    <IssueKindPicker value={orderType} onChange={setOrderType} kinds={orderKinds} />
                )}

                {orderType === 'MAINTENANCE' ? (
                    <MaintenanceIssueReturnForm
                        sheetIssues={sheetIssues}
                        user={user}
                        initialWorkOrderId={linkedWorkOrderId}
                        initialIssueId={linkedIssueId}
                        onSuccess={() => {
                            fetchData();
                            updateAll(true);
                        }}
                    />
                ) : (
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-8">
                        <Card className="border-slate-200 shadow-sm overflow-hidden">
                            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                                <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500">Return Details</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="returnDate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-600 font-semibold">Date <span className="text-destructive">*</span></FormLabel>
                                                <FormControl>
                                                    <Input type="date" className="h-11 bg-white border-slate-200" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {needsProjectPick && (
                                        <FormField
                                            control={form.control}
                                            name="projectName"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-slate-600 font-semibold">Project <span className="text-destructive">*</span></FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="w-full h-11 bg-white border-slate-200">
                                                                <SelectValue placeholder="Select project" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {(options?.firmObjects || []).map((f: any) => (
                                                                <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )}
                                        />
                                    )}

                                    <FormField
                                        control={form.control}
                                        name="returnPersonName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-600 font-semibold">Returner Name <span className="text-destructive">*</span></FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Who is returning?" className="h-11 bg-white border-slate-200 focus:ring-primary/20" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="damageRemark"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-slate-600 font-semibold">Damage Remarks</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Condition of returned items" className="h-11 bg-white border-slate-200 focus:ring-primary/20" {...field} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <div className="space-y-4">
                            <div className="flex items-center gap-2 px-1">
                                <div className="w-2 h-6 bg-primary rounded-full" />
                                <h3 className="text-lg font-bold text-slate-700">Material Being Returned</h3>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {fields.map((field, index) => {
                                    const groupHead = products[index]?.groupHead;
                                    const productName = products[index]?.productName;
                                    const maxQty = productName && effectiveProjectName
                                        ? Math.round(netIssued(productName, effectiveProjectName) * 100) / 100
                                        : null;

                                    return (
                                        <Card
                                            key={field.id}
                                            className="border-slate-200 shadow-sm hover:border-primary/30 transition-colors"
                                        >
                                            <CardContent className="p-4 sm:p-6">
                                                <div className="flex justify-between items-center mb-4">
                                                    <div className="bg-slate-100 px-3 py-1 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                                        Returning Item #{index + 1}
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
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                                                    <FormField
                                                        control={form.control}
                                                        name={`products.${index}.groupHead`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-xs font-semibold text-slate-500 uppercase">Group Head <span className="text-destructive">*</span></FormLabel>
                                                                <Select
                                                                    onValueChange={(val) => {
                                                                        field.onChange(val);
                                                                        const cur = form.getValues(`products.${index}.productName`);
                                                                        if (cur && options?.products?.[val] && !options.products[val].includes(cur)) {
                                                                            form.setValue(`products.${index}.productName`, '');
                                                                            form.setValue(`products.${index}.uom`, '');
                                                                        }
                                                                    }}
                                                                    value={field.value}
                                                                >
                                                                    <FormControl>
                                                                        <SelectTrigger className="w-full h-11 bg-white border-slate-200">
                                                                            <SelectValue placeholder="Select Head" className="truncate" />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        {allGroupHeads.map((gh) => (
                                                                            <SelectItem key={gh} value={gh}>{gh}</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />

                                                    <FormField
                                                        control={form.control}
                                                        name={`products.${index}.productName`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-xs font-semibold text-slate-500 uppercase">Product Name <span className="text-destructive">*</span></FormLabel>
                                                                <FormControl>
                                                                    <SearchableSelect
                                                                        options={productsFor(groupHead).map((p) => ({ value: p, label: p }))}
                                                                        value={field.value}
                                                                        onValueChange={(val) => {
                                                                            field.onChange(val);
                                                                            if (!form.getValues(`products.${index}.groupHead`) && options?.itemGroupHeadMap?.[val]) {
                                                                                form.setValue(`products.${index}.groupHead`, options.itemGroupHeadMap[val]);
                                                                            }
                                                                            form.setValue(`products.${index}.uom`, options?.itemUomMap?.[val] || '');
                                                                        }}
                                                                        placeholder="Select Product"
                                                                        searchPlaceholder="Search product name..."
                                                                        emptyText="No products found"
                                                                        className="w-full h-11 bg-white border-slate-200"
                                                                    />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />

                                                    <FormField
                                                        control={form.control}
                                                        name={`products.${index}.quantity`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-xs font-semibold text-slate-700 uppercase">
                                                                    Good Qty to Return {maxQty !== null ? `(Max: ${maxQty})` : ''}
                                                                </FormLabel>
                                                                <FormControl>
                                                                    <Input type="number" step="any" min={0} className="h-11 bg-white border-primary/20 focus:ring-primary/20 font-bold text-primary" {...field} />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />

                                                    <FormField
                                                        control={form.control}
                                                        name={`products.${index}.damageQty`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-xs font-semibold text-red-500 uppercase">Rejected/Damage Qty</FormLabel>
                                                                <FormControl>
                                                                    <Input type="number" step="any" min={0} placeholder="0" className="h-11 bg-white border-red-200 focus:ring-red-100 text-red-600 font-bold" {...field} />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>

                            <Button
                                type="button"
                                variant="outline"
                                className="w-full h-11 border-dashed border-primary/40 text-primary hover:bg-primary/5"
                                onClick={() => append({ ...emptyItem })}
                            >
                                <Plus size={18} className="mr-2" /> Add Returning Item
                            </Button>
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
                                    <span className="flex items-center gap-2">
                                        <RotateCcw size={20} />
                                        Process Material Return
                                    </span>
                                )}
                            </Button>
                        </div>
                    </form>
                </Form>
                )}
            </div>
        </div>
    );
};
