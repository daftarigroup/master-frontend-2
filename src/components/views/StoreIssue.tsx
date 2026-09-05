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
import { ClipboardList, Trash, Search, RotateCcw, AlertTriangle } from 'lucide-react';
import { isAllowedFirm } from '@/lib/firmAccess';

import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import type { IndentSheet } from '@/types';

import type { IssueSheet } from '@/types';
import { SearchableSelect, type SearchableOption } from '@/components/ui/searchable-select';
import Heading from '../element/Heading';
import { useEffect, useState, useMemo } from 'react';

import { fetchIssueRecords, createIssueRecords, updateIssueRecordById, type IssueRecord } from '@/services/issueService';
import { fetchMasterOptions, type MasterData } from '@/services/masterService';
import { useAuth } from '@/context/AuthContext';
import { useSheets } from '@/context/SheetsContext';
import { useProject } from '@/context/ProjectContext';
import { calculateRealInventory } from '@/lib/inventoryUtils';

interface ProductItemRowProps {
    index: number;
    fieldId: string;
    canDelete: boolean;
    onRemove: () => void;
    form: any;
    options: MasterData | null;
    allProductNames: string[];
    realInventory: any[];
}

function ProductItemRow({
    index,
    fieldId,
    canDelete,
    onRemove,
    form,
    options,
    allProductNames,
    realInventory,
}: ProductItemRowProps) {
    const groupHead = form.watch(`products.${index}.groupHead`);
    const productName = form.watch(`products.${index}.productName`);

    const productOptions = useMemo(() => {
        if (groupHead && options?.products?.[groupHead]) {
            return options.products[groupHead];
        }
        return allProductNames;
    }, [groupHead, options?.products, allProductNames]);

    const searchableOptions: SearchableOption[] = useMemo(() => {
        return productOptions
            .map((p) => {
                const inv = realInventory.find((item) => item.itemName === p);
                const stock = inv ? inv.current : 0;
                const gh = options?.itemGroupHeadMap?.[p];
                const sublabel = !groupHead && gh
                    ? `${gh} • Stock: ${stock}`
                    : `Stock: ${stock}`;
                return {
                    value: p,
                    label: p,
                    sublabel,
                    stock,
                };
            })
            .filter((item) => item.stock > 0 || item.value === productName);
    }, [productOptions, realInventory, options?.itemGroupHeadMap, groupHead, productName]);

    const inv = realInventory.find((item) => item.itemName === productName);
    const currentStock = inv ? inv.current : 0;
    const isOutOfStock = Boolean(productName) && currentStock <= 0;

    return (
        <Card
            key={fieldId}
            className="border-slate-200 shadow-sm hover:border-primary/30 transition-colors"
        >
            <CardContent className="p-4 sm:p-6">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <div className="bg-slate-100 px-3 py-1 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Product Item #{index + 1}
                        </div>
                        {isOutOfStock && (
                            <span className="text-[11px] font-semibold text-destructive bg-destructive/10 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                <AlertTriangle className="size-3" />
                                Stock: {currentStock} (Cannot issue)
                            </span>
                        )}
                    </div>
                    {canDelete && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-full"
                            onClick={onRemove}
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
                                    onValueChange={(val) => {
                                        field.onChange(val);
                                        const currentProd = form.getValues(`products.${index}.productName`);
                                        if (
                                            currentProd &&
                                            options?.products?.[val] &&
                                            !options.products[val].includes(currentProd)
                                        ) {
                                            form.setValue(`products.${index}.productName`, '');
                                            form.setValue(`products.${index}.uom`, '');
                                        }
                                    }}
                                    value={field.value}
                                >
                                    <FormControl>
                                        <SelectTrigger className="w-full h-10 bg-slate-50/50 border-slate-200">
                                            <SelectValue placeholder="Select Head" className="truncate" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {(options?.allGroupHeads || []).map((gh, i) => (
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
                                <FormControl>
                                    <SearchableSelect
                                        options={searchableOptions}
                                        value={field.value}
                                        onValueChange={(val) => {
                                            field.onChange(val);
                                            // Auto-fill groupHead if not already selected
                                            const currentGh = form.getValues(`products.${index}.groupHead`);
                                            if (!currentGh && options?.itemGroupHeadMap?.[val]) {
                                                form.setValue(`products.${index}.groupHead`, options.itemGroupHeadMap[val]);
                                            }
                                            // Auto-fill UOM from itemUomMap if available
                                            if (options?.itemUomMap?.[val]) {
                                                form.setValue(`products.${index}.uom`, options.itemUomMap[val]);
                                            }
                                        }}
                                        placeholder="Select Product"
                                        searchPlaceholder="Search product name..."
                                        emptyText="No products with available stock"
                                        className="w-full h-10 bg-slate-50/50 border-slate-200 text-sm"
                                    />
                                </FormControl>
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
                                    {productName && currentStock > 0 && (
                                        <span className="ml-1 text-[11px] text-slate-400 font-normal lowercase">
                                            (max: {currentStock})
                                        </span>
                                    )}
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        step="any"
                                        min="0.01"
                                        max={currentStock > 0 ? currentStock : 0}
                                        className="h-10 bg-slate-50/50 border-slate-200"
                                        {...field}
                                        disabled={(!groupHead && !productName) || isOutOfStock}
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
                                    disabled={!groupHead && !productName}
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
}

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
        updateAll,
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

    const {
        effectivePermittedFirms,
        selectedProject: globalSelectedProject,
        isAllProjects,
    } = useProject();

    const isSpecificProjectSelected = !isAllProjects && Boolean(globalSelectedProject) && globalSelectedProject?.id !== 'all';

    useEffect(() => {
        if (user?.username) {
            fetchData();
        }
    }, [user?.username, effectivePermittedFirms]);

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
            projectName: (isSpecificProjectSelected && globalSelectedProject) ? globalSelectedProject.name : '',
            firmId: (isSpecificProjectSelected && typeof globalSelectedProject?.id === 'number') ? globalSelectedProject.id : undefined,
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

    // Automatically set project name when a specific project is selected globally
    useEffect(() => {
        if (isSpecificProjectSelected && globalSelectedProject) {
            const targetName = globalSelectedProject.name;
            const currentName = form.getValues('projectName');
            if (currentName !== targetName) {
                form.setValue('projectName', targetName);
                const firmObj = options?.firmObjects?.find(
                    f => (typeof globalSelectedProject.id === 'number' && f.id === globalSelectedProject.id) ||
                         f.name.trim().toLowerCase() === targetName.trim().toLowerCase()
                );
                if (firmObj) {
                    form.setValue('firmId', firmObj.id);
                }
                // Clear contractor and site location on project change so new cascaded options are picked
                form.setValue('constructorName', '');
                form.setValue('siteLocation', '');
            }
        }
    }, [isSpecificProjectSelected, globalSelectedProject, options?.firmObjects, form]);

    const projectOptions = useMemo(() => {
        const allFirms = (options?.firmObjects || []).filter(f =>
            isAllowedFirm({ id: f.id, name: f.name }, user?.firm_access || [])
        );

        if (isSpecificProjectSelected && globalSelectedProject) {
            const targetName = (globalSelectedProject.name || '').trim().toLowerCase();
            const targetId = globalSelectedProject.id;
            const matched = allFirms.filter(f =>
                (typeof targetId === 'number' && f.id === targetId) ||
                (f.name && f.name.trim().toLowerCase() === targetName)
            );
            return matched.length > 0 ? matched : allFirms;
        }

        return allFirms;
    }, [options?.firmObjects, user?.firm_access, isSpecificProjectSelected, globalSelectedProject]);

    const products = form.watch('products');
    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'products',
    });

    const selectedProject = form.watch('projectName') || 'All';
    const selectedProjectName = form.watch('projectName');
    const selectedFirmId = form.watch('firmId');

    const cascadedContractors = useMemo(() => {
        if (!selectedProjectName) {
            return [];
        }

        const projLower = selectedProjectName.trim().toLowerCase();
        const matchesProject = (firmName?: string | null, firmId?: number | string | null) => {
            if (firmName) {
                const parts = firmName.split(',').map(s => s.trim().toLowerCase());
                if (parts.includes(projLower)) return true;
            }
            if (selectedFirmId && firmId && Number(firmId) === Number(selectedFirmId)) return true;
            return false;
        };

        const contractorSet = new Set<string>();

        // 1. From options?.contractors (registry)
        (options?.contractors || []).forEach((c: any) => {
            const name = (c.contractorName || c.contractor_name || '').trim();
            if (!name) return;

            if (matchesProject(c.firmName, c.firmId)) {
                contractorSet.add(name);
            }
        });

        // 2. From historical sheetIssues for this project
        (sheetIssues || []).forEach((is: any) => {
            const isFirmName = is.projectName || is.firm_name || is.firmNameMatch;
            const isFirmId = is.firm_id || is.firmId;
            if (matchesProject(isFirmName, isFirmId)) {
                const cName = (is.constructorName || is.constructor_name || '').trim();
                if (cName && cName !== 'N/A' && cName !== '-') {
                    contractorSet.add(cName);
                }
            }
        });

        // 3. Fallback: If no project-specific contractor found, include unassigned contractors from registry
        if (contractorSet.size === 0) {
            (options?.contractors || []).forEach((c: any) => {
                const name = (c.contractorName || c.contractor_name || '').trim();
                const hasFirm = Boolean(c.firmId || (c.firmName && c.firmName !== '--' && c.firmName.trim() !== ''));
                if (name && !hasFirm) {
                    contractorSet.add(name);
                }
            });
        }

        return Array.from(contractorSet).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    }, [selectedProjectName, selectedFirmId, options?.contractors, sheetIssues]);

    const cascadedSiteLocations = useMemo(() => {
        if (!selectedProjectName) {
            return [];
        }

        const projLower = selectedProjectName.trim().toLowerCase();
        const matchesProject = (firmName?: string | null, firmId?: number | string | null) => {
            if (firmName) {
                const parts = firmName.split(',').map(s => s.trim().toLowerCase());
                if (parts.includes(projLower)) return true;
            }
            if (selectedFirmId && firmId && Number(firmId) === Number(selectedFirmId)) return true;
            return false;
        };

        const locationSet = new Set<string>();

        // 1. From options?.siteLocationDetails (registry with firm metadata)
        (options?.siteLocationDetails || []).forEach((l: any) => {
            const loc = (l.location || '').trim();
            if (!loc) return;
            if (matchesProject(l.firmName, l.firmId)) {
                locationSet.add(loc);
            }
        });

        // 2. From historical sheetIssues for this project
        (sheetIssues || []).forEach((is: any) => {
            const isFirmName = is.projectName || is.firm_name || is.firmNameMatch;
            const isFirmId = is.firm_id || is.firmId;
            if (matchesProject(isFirmName, isFirmId)) {
                const loc = (is.siteLocation || is.site_location || '').trim();
                if (loc && loc !== 'N/A' && loc !== '-') {
                    locationSet.add(loc);
                }
            }
        });

        // 3. From matched contractors' location property
        (options?.contractors || []).forEach((c: any) => {
            if (matchesProject(c.firmName, c.firmId)) {
                const loc = (c.location || '').trim();
                if (loc && loc !== 'N/A' && loc !== '-') {
                    locationSet.add(loc);
                }
            }
        });

        // 4. Fallback: If no locations found for this project, include unassigned locations from registry
        if (locationSet.size === 0) {
            (options?.siteLocationDetails || []).forEach((l: any) => {
                const loc = (l.location || '').trim();
                const hasFirm = Boolean(l.firmId || (l.firmName && l.firmName !== '--' && l.firmName.trim() !== ''));
                if (loc && !hasFirm) {
                    locationSet.add(loc);
                }
            });
            if (locationSet.size === 0 && (options?.siteLocations || []).length > 0) {
                (options?.siteLocations || []).forEach((loc: string) => {
                    const l = (loc || '').trim();
                    if (l) locationSet.add(l);
                });
            }
        }

        return Array.from(locationSet).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    }, [selectedProjectName, selectedFirmId, options?.siteLocationDetails, options?.siteLocations, options?.contractors, sheetIssues]);

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

    const allProductNames = useMemo(() => {
        const set = new Set<string>();
        if (options?.products) {
            Object.values(options.products).forEach(arr => {
                arr.forEach(p => {
                    if (p && p.trim()) set.add(p.trim());
                });
            });
        }
        if (options?.itemUomMap) {
            Object.keys(options.itemUomMap).forEach(p => {
                if (p && p.trim()) set.add(p.trim());
            });
        }
        return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    }, [options?.products, options?.itemUomMap]);

    const hasOutOfStockItems = useMemo(() => {
        if (!products || products.length === 0) return false;
        return products.some((p: any) => {
            if (!p.productName) return false;
            const inv = realInventory.find((item) => item.itemName === p.productName);
            const stock = inv ? inv.current : 0;
            return stock <= 0;
        });
    }, [products, realInventory]);

    async function onSubmit(data: z.infer<typeof schema>) {
        try {
            if (!data.id) {
                // Prevent issuing any item with stock <= 0 or quantity > available stock
                for (const product of data.products) {
                    const inv = realInventory.find(item => item.itemName === product.productName);
                    const availableStock = inv ? inv.current : 0;
                    if (availableStock <= 0) {
                        toast.error(`Cannot issue "${product.productName}". Available stock is 0 or less (${availableStock}).`);
                        return;
                    }
                    if (Number(product.quantity) > availableStock) {
                        toast.error(`Cannot issue ${product.quantity} of "${product.productName}". Available stock is only ${availableStock}.`);
                        return;
                    }
                }
            }

            const firmObj = options?.firmObjects?.find(f => f.name === data.projectName);
            const firmId = data.firmId || firmObj?.id;

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
                    firm_id: firmId,
                    planned1: data.issueDate,
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
            updateAll(true);

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
                                                        // Cascade reset contractor and site location on project change
                                                        form.setValue('constructorName', '');
                                                        form.setValue('siteLocation', '');
                                                    }}
                                                    value={field.value}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger className="w-full h-11 bg-white border-slate-200 focus:ring-primary/20">
                                                            <SelectValue placeholder="Select project" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {projectOptions.map((firm) => (
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
                                                <Select
                                                    onValueChange={field.onChange}
                                                    value={field.value}
                                                    disabled={!selectedProjectName}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger className="w-full h-11 bg-white border-slate-200 focus:ring-primary/20 disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-50">
                                                            <SelectValue placeholder={!selectedProjectName ? "Select project first" : "Select contractor"} />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {cascadedContractors.length > 0 ? (
                                                            cascadedContractors.map((cName, i) => (
                                                                <SelectItem key={i} value={cName}>
                                                                    {cName}
                                                                </SelectItem>
                                                            ))
                                                        ) : (
                                                            <div className="py-2 px-3 text-xs text-muted-foreground italic text-center">
                                                                No contractors for this project
                                                            </div>
                                                        )}
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
                                                <Select
                                                    onValueChange={field.onChange}
                                                    value={field.value}
                                                    disabled={!selectedProjectName}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger className="w-full h-11 bg-white border-slate-200 focus:ring-primary/20 disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-50">
                                                            <SelectValue placeholder={!selectedProjectName ? "Select project first" : "Select location"} />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {cascadedSiteLocations.length > 0 ? (
                                                            cascadedSiteLocations.map((loc, i) => (
                                                                <SelectItem key={i} value={loc}>
                                                                    {loc}
                                                                </SelectItem>
                                                            ))
                                                        ) : (
                                                            <div className="py-2 px-3 text-xs text-muted-foreground italic text-center">
                                                                No site locations for this project
                                                            </div>
                                                        )}
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
                                {fields.map((field, index) => (
                                    <ProductItemRow
                                        key={field.id}
                                        index={index}
                                        fieldId={field.id}
                                        canDelete={fields.length > 1}
                                        onRemove={() => remove(index)}
                                        form={form}
                                        options={options}
                                        allProductNames={allProductNames}
                                        realInventory={realInventory}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="pt-4 pb-10 space-y-3">
                            {hasOutOfStockItems && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-semibold flex items-center gap-2">
                                    <AlertTriangle className="size-4 shrink-0 text-red-600" />
                                    One or more selected products have 0 or less stock. Items with zero stock cannot be issued.
                                </div>
                            )}
                            <Button
                                className="w-full h-11 font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-200/50 transition-all active:scale-[0.98]"
                                type="submit"
                                disabled={form.formState.isSubmitting || hasOutOfStockItems}
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

