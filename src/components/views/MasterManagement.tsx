import { Plus, Building2, Package, FileSpreadsheet, Boxes, LayoutGrid, Building, Trash, Pencil, X, Search, MapPin, UserCog, Mail, Phone, Users, Map, Loader2, FileText, FileCode2, FolderTree } from 'lucide-react';
import Heading from '../element/Heading';
import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import DataTable from '../element/DataTable';
import MasterListTab from '@/systems/petty-cash/pages/MasterListTab';
import { useAuth } from '@/context/AuthContext';

export const ALL_REGISTRY_SECTIONS = [
    { id: 'vendors', label: 'Vendors', icon: Building2, color: 'text-indigo-500' },
    { id: 'items', label: 'Items', icon: Boxes, color: 'text-blue-500' },
    { id: 'group-heads', label: 'Group Head & UOM', icon: LayoutGrid, color: 'text-orange-500' },
    { id: 'companies', label: 'Companies', icon: Building, color: 'text-emerald-500' },
    { id: 'contractors', label: 'Contractors', icon: Users, color: 'text-indigo-500' },
    { id: 'site_locations', label: 'Site Locations', icon: Map, color: 'text-rose-500' },
    { id: 'projects', label: 'Projects', icon: Building, color: 'text-purple-500' },
    { id: 'site_engineers', label: 'Site Engineers', icon: UserCog, color: 'text-amber-500' },
    { id: 'terms_conditions', label: 'Terms & Conditions', icon: FileText, color: 'text-teal-500' },
    { id: 'doc_types', label: 'Document Types', icon: FileCode2, color: 'text-violet-500' },
    { id: 'doc_categories', label: 'Document Categories', icon: FolderTree, color: 'text-pink-500' },
];
import { Button } from '../ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '../ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { z } from 'zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import {
    fetchMasterRecords,
    insertMasterData,
    insertNormalizedMasterData,
    updateMasterData,
    deleteMasterData,
    fetchSiteEngineers,
    insertSiteEngineer,
    updateSiteEngineer,
    deleteSiteEngineer,
    fetchContractors,
    insertContractor,
    updateContractor,
    deleteContractor,
    fetchSiteLocations,
    insertSiteLocation,
    updateSiteLocation,
    deleteSiteLocation,
    fetchTermsAndConditions,
    insertTermsAndCondition,
    updateTermsAndCondition,
    deleteTermsAndCondition,
} from '@/services/masterService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@/lib/utils';
import { Checkbox } from '../ui/checkbox';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { addItemToInventory, fetchItemInventoryRecord } from '@/services/inventoryService';
import { useSheets } from '@/context/SheetsContext';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../ui/select';
import { ClipLoader as Loader } from 'react-spinners';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "../ui/tooltip";

const nullishToUndefined = (value: unknown) => (value === null || value === '' ? undefined : value);
const optionalText = () => z.preprocess(nullishToUndefined, z.string().optional());
const optionalEmail = () => z.preprocess(nullishToUndefined, z.string().email().optional());
const optionalPaymentType = () => z.preprocess(nullishToUndefined, z.enum(['regular', 'thirdparty']).optional());

const vendorSchema = z.object({
    vendor_name: z.string().min(1, 'Required'),
    vendor_gstin: optionalText(),
    vendor_address: optionalText(),
    vendor_email: optionalEmail(),
    payment_term: optionalText(),
    responsible_person: optionalText(),
    location: optionalText(),
    phone: optionalText(),
    selected_firms: z.array(z.string()).min(1, 'Please select at least one project/firm'),
    firm_name: optionalText(),
});
type VendorFormValues = {
    vendor_name: string;
    vendor_gstin: string;
    vendor_address: string;
    vendor_email: string;
    payment_term: string;
    responsible_person: string;
    location: string;
    phone: string;
    selected_firms?: string[];
    firm_name?: string;
};
const contractorSchema = z.object({
    contractor_name: z.string().min(1, 'Required'),
    contractor_gstin: optionalText(),
    contractor_address: optionalText(),
    contractor_email: optionalEmail(),
    responsible_person: optionalText(),
    location: optionalText(),
    phone: optionalText(),
    selected_firms: z.array(z.string()).min(1, 'Please select at least one project/firm'),
    firm_name: optionalText(),
});
type ContractorFormValues = {
    contractor_name: string;
    contractor_gstin: string;
    contractor_address: string;
    contractor_email: string;
    responsible_person: string;
    location: string;
    phone: string;
    selected_firms?: string[];
    firm_name?: string;
};
const siteLocationSchema = z.object({
    location: z.string().min(1, 'Required'),
    selected_firms: z.array(z.string()).min(1, 'Please select at least one project/firm'),
    firm_name: optionalText(),
});
const itemSchema = z.object({
    firm_name: optionalText(),
    selected_firms: z.array(z.string()).min(1, 'Please select at least one project/firm'),
    firm_id: optionalText(),
    item_name: z.string().min(1, 'Required'),
    group_head: z.string().min(1, 'Required'),
    uom: optionalText(),
    include_in_inventory: z.boolean().default(false),
    inventory_quantity: z.coerce.number().min(0, 'Quantity cannot be negative').default(0),
    regular_conditions: z.any().optional(),
    third_party_conditions: z.any().optional(),
}).superRefine((data, ctx) => {
    if (data.include_in_inventory && data.inventory_quantity <= 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['inventory_quantity'],
            message: 'Quantity must be greater than 0',
        });
    }
    if (data.include_in_inventory && (!data.selected_firms || data.selected_firms.length === 0)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['selected_firms'],
            message: 'At least one project is required for inventory',
        });
    }
});
const departmentSchema = z.object({ department: z.string().min(1, 'Required') });
const projectSchema = z.object({ firm_name: z.string().min(1, 'Required'), destination_address: optionalText() });
const ghSchema = z.object({
    group_head: z.string().min(1, 'Required'),
    selected_firms: z.array(z.string()).min(1, 'Please select at least one project/firm'),
    firm_name: optionalText(),
});
const uomSchema = z.object({
    uom: z.string().min(1, 'Required'),
    selected_firms: z.array(z.string()).min(1, 'Please select at least one project/firm'),
    firm_name: optionalText(),
});
const aouSchema = z.object({
    area_of_use: z.string().min(1, 'Required'),
    selected_firms: z.array(z.string()).min(1, 'Please select at least one project/firm'),
    firm_name: optionalText(),
});
const ghUomSchema = z.object({
    group_head: optionalText(),
    uom: optionalText(),
    selected_firms: z.array(z.string()).min(1, 'Please select at least one project/firm'),
    firm_name: optionalText(),
}).refine(data => data.group_head || data.uom, {
    message: "At least one field is required",
    path: ["group_head"]
});
const companySchema = z.object({
    company_name: z.string().min(1, 'Required'),
    company_gstin: optionalText(),
    company_pan: optionalText(),
    company_email: optionalEmail(),
    company_phone: optionalText(),
    company_address: optionalText(),
    billing_address: optionalText(),
    destination_address: optionalText(),
    company_contact_person: optionalText(),
    selected_firms: z.array(z.string()).optional().default([]),
    firm_name: optionalText(),
});
const siteEngineerSchema = z.object({
    name: z.string().min(1, 'Required'),
    number: z.string().min(1, 'Required'),
    email: z.string().email('Invalid email'),
    selected_firms: z.array(z.string()).min(1, 'Please select at least one project/firm'),
    firm_name: optionalText(),
});
const termsSchema = z.object({
    title: z.string().min(1, 'Heading is required'),
    name: z.string().min(1, 'Condition text is required'),
    selected_firms: z.array(z.string()).optional().default([]),
    firm_name: optionalText(),
});

const ProjectSelectorField = ({
    control,
    name = "selected_firms",
    allFirms = [],
}: {
    control: any;
    name?: string;
    allFirms?: string[];
}) => {
    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => {
                const selectedList: string[] = Array.isArray(field.value) ? field.value : [];
                const isAllSelected = allFirms.length > 0 && selectedList.length === allFirms.length;

                const toggleSelectAll = () => {
                    if (isAllSelected) {
                        field.onChange([]);
                    } else {
                        field.onChange([...allFirms]);
                    }
                };

                const toggleFirm = (firm: string) => {
                    if (selectedList.includes(firm)) {
                        field.onChange(selectedList.filter(f => f !== firm));
                    } else {
                        field.onChange([...selectedList, firm]);
                    }
                };

                return (
                    <FormItem className="space-y-2">
                        <div className="flex items-center justify-between">
                            <FormLabel className="text-sm font-semibold">Select Project / Firm *</FormLabel>
                            <span className="text-xs text-muted-foreground font-medium">
                                {selectedList.length} of {allFirms.length} selected
                            </span>
                        </div>

                        <div className="border rounded-lg p-3 bg-muted/10 space-y-2.5">
                            {allFirms.length > 0 && (
                                <div className="flex items-center space-x-2 border-b pb-2 mb-1">
                                    <input
                                        type="checkbox"
                                        id={`select-all-${name}`}
                                        checked={isAllSelected}
                                        onChange={toggleSelectAll}
                                        className="h-4 w-4 rounded border-input accent-primary cursor-pointer shrink-0"
                                    />
                                    <label htmlFor={`select-all-${name}`} className="text-xs font-bold text-primary cursor-pointer select-none">
                                        Select All Projects / Firms
                                    </label>
                                </div>
                            )}

                            <ScrollArea className="max-h-36 pr-2">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {allFirms.map((firm) => {
                                        const isChecked = selectedList.includes(firm);
                                        return (
                                            <div
                                                key={firm}
                                                onClick={() => toggleFirm(firm)}
                                                className={cn(
                                                    "flex items-center space-x-2 p-2 rounded-md border text-xs cursor-pointer transition-colors select-none",
                                                    isChecked
                                                        ? "bg-primary/10 border-primary/40 font-semibold text-primary"
                                                        : "bg-background hover:bg-muted/50 border-border/60"
                                                )}
                                            >
                                                <input
                                                    type="checkbox"
                                                    id={`chk-${name}-${firm}`}
                                                    checked={isChecked}
                                                    onChange={(e) => {
                                                        e.stopPropagation();
                                                        toggleFirm(firm);
                                                    }}
                                                    className="h-4 w-4 rounded border-input accent-primary cursor-pointer shrink-0"
                                                />
                                                <span className="cursor-pointer truncate flex-1">
                                                    {firm}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                        </div>
                        <FormMessage />
                    </FormItem>
                );
            }}
        />
    );
};

const ConditionsCell = ({ val }: { val: any }) => {
    if (!val) return <span className="text-muted-foreground italic text-xs">--</span>;
    try {
        const parsed = typeof val === 'string' ? JSON.parse(val) : val;
        if (!Array.isArray(parsed) || parsed.length === 0) return <span className="text-muted-foreground italic text-xs">--</span>;

        const first = parsed[0];
        const remaining = parsed.length - 1;

        if (remaining === 0) return <div className="text-xs truncate max-w-[150px]">{first}</div>;

        return (
            <div className="flex items-center gap-1.5 text-xs">
                <span className="truncate max-w-[80px] sm:max-w-[120px]">{first}</span>
                <TooltipProvider>
                    <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                            <div className="cursor-help px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold border border-indigo-100 dark:border-indigo-900/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors shrink-0">
                                +{remaining} more
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs p-3 bg-popover text-popover-foreground border shadow-xl rounded-xl">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 border-b border-border/50 pb-1.5 mb-1.5">
                                    <FileSpreadsheet size={14} className="text-primary" />
                                    <p className="font-bold text-xs uppercase tracking-wider">Terms & Conditions</p>
                                </div>
                                <ul className="space-y-1.5">
                                    {parsed.map((c, i) => (
                                        <li key={i} className="flex gap-2 items-start leading-relaxed animate-in fade-in slide-in-from-left-1 duration-200" style={{ animationDelay: `${i * 30}ms` }}>
                                            <span className="text-primary/70 font-bold shrink-0 mt-0.5">{i + 1}.</span>
                                            <span className="text-xs font-medium">{c}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        );
    } catch (e) {
        return <span className="text-muted-foreground italic text-xs">--</span>;
    }
};

const MultiPaymentTermInput = ({
    value,
    onChange,
    options = [],
}: {
    value?: string;
    onChange: (val: string) => void;
    options?: string[];
}) => {
    const [customTerm, setCustomTerm] = useState('');

    const selectedTerms = useMemo(() => {
        if (!value) return [];
        return value
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);
    }, [value]);

    const addTerm = (termToAdd: string) => {
        const trimmed = termToAdd.trim();
        if (!trimmed) return;
        if (!selectedTerms.includes(trimmed)) {
            const next = [...selectedTerms, trimmed];
            onChange(next.join(', '));
        }
        setCustomTerm('');
    };

    const removeTerm = (termToRemove: string) => {
        const next = selectedTerms.filter((t) => t !== termToRemove);
        onChange(next.join(', '));
    };

    const presetTerms = Array.from(
        new Set([
            'Advance',
            '30 Days',
            '45 Days',
            '60 Days',
            '90 Days',
            'Partly Advance/ Partly PI',
            '100% Against Dispatch',
            'Against Delivery',
            'Immediate',
            ...(options || []),
        ])
    );

    const availablePresets = presetTerms.filter((t) => !selectedTerms.includes(t));

    return (
        <div className="space-y-2">
            {selectedTerms.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2 bg-muted/20 border rounded-md min-h-[38px] items-center">
                    {selectedTerms.map((term, idx) => (
                        <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-sm"
                        >
                            {term}
                            <button
                                type="button"
                                onClick={() => removeTerm(term)}
                                className="hover:text-destructive focus:outline-none transition-colors"
                            >
                                <X size={12} />
                            </button>
                        </span>
                    ))}
                </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Select
                    onValueChange={(val) => {
                        if (val) addTerm(val);
                    }}
                    value=""
                >
                    <SelectTrigger className="flex-1 text-xs">
                        <SelectValue placeholder="Select from presets..." />
                    </SelectTrigger>
                    <SelectContent>
                        {availablePresets.map((term, i) => (
                            <SelectItem key={`preset-pt-${i}`} value={term} className="text-xs">
                                {term}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <div className="flex items-center gap-1.5 flex-1">
                    <Input
                        value={customTerm}
                        onChange={(e) => setCustomTerm(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                addTerm(customTerm);
                            }
                        }}
                        placeholder="Or add custom payment term..."
                        className="text-xs h-9"
                    />
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => addTerm(customTerm)}
                        disabled={!customTerm.trim()}
                        className="shrink-0 h-9 text-xs px-3"
                    >
                        Add
                    </Button>
                </div>
            </div>
        </div>
    );
};

interface TabDataState {
    data: any[];
    offset: number;
    hasMore: boolean;
    loading: boolean;
    loadingMore: boolean;
    search: string;
}

const initialTabState: TabDataState = {
    data: [],
    offset: 0,
    hasMore: false,
    loading: false,
    loadingMore: false,
    search: '',
};

export default function MasterManagement() {
    const { updateInventorySheet, masterSheet, updateAll } = useSheets();
    const [allRecords, setAllRecords] = useState<any[]>([]);
    const [contractors, setContractors] = useState<any[]>([]);
    const [siteLocations, setSiteLocations] = useState<any[]>([]);
    const [siteEngineers, setSiteEngineers] = useState<any[]>([]);
    const [termsConditions, setTermsConditions] = useState<any[]>([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [editingRecord, setEditingRecord] = useState<any>(null);
    const [openDialog, setOpenDialog] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [existingInventoryId, setExistingInventoryId] = useState<number | null>(null);
    const [currentOpeningQty, setCurrentOpeningQty] = useState<number | null>(null);
    const [searchTermDept, setSearchTermDept] = useState('');
    const [isAddingDept, setIsAddingDept] = useState(false);
    const { user } = useAuth();

    const allowedSections = useMemo(() => {
        if (!user) return ALL_REGISTRY_SECTIONS;
        if (user.role === 'SUPER_ADMIN' || user.administrate) {
            return ALL_REGISTRY_SECTIONS;
        }
        const perms = (user.page_access as any)?.['master_sections'] || (user.page_access as any)?.['master_registry_sections'];
        if (Array.isArray(perms) && perms.length > 0) {
            const filtered = ALL_REGISTRY_SECTIONS.filter((s) => perms.includes(s.id));
            return filtered.length > 0 ? filtered : ALL_REGISTRY_SECTIONS;
        }
        // Fallback: If user has masterRegistry permission and no granular filter, allow all
        if (user.masterRegistry || (user.page_access as any)?.['master_registry']) {
            return ALL_REGISTRY_SECTIONS;
        }
        return [];
    }, [user]);

    const [activeTab, setActiveTab] = useState<string>(() => allowedSections[0]?.id || 'vendors');

    useEffect(() => {
        if (allowedSections.length > 0 && !allowedSections.some((s) => s.id === activeTab)) {
            setActiveTab(allowedSections[0].id);
        }
    }, [allowedSections, activeTab]);

    const vForm = useForm<VendorFormValues>({
        resolver: zodResolver(vendorSchema) as any,
        defaultValues: {
            vendor_name: '',
            vendor_gstin: '',
            vendor_address: '',
            vendor_email: '',
            payment_term: '',
            responsible_person: '',
            location: '',
            phone: '',
        }
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const iForm = useForm<any>({ resolver: zodResolver(itemSchema) as any, defaultValues: { item_name: '', group_head: '', uom: '', include_in_inventory: false, inventory_quantity: 0, firm_name: '', regular_conditions: [{ value: '' }], third_party_conditions: [{ value: '' }] } });
    const dForm = useForm<any>({ resolver: zodResolver(departmentSchema) as any, defaultValues: { department: '' } });
    const pForm = useForm<any>({ resolver: zodResolver(projectSchema) as any, defaultValues: { firm_name: '', destination_address: '' } });
    const ghForm = useForm<any>({ resolver: zodResolver(ghSchema) as any, defaultValues: { group_head: '' } });
    const uomForm = useForm<any>({ resolver: zodResolver(uomSchema) as any, defaultValues: { uom: '' } });
    const aouForm = useForm<any>({ resolver: zodResolver(aouSchema) as any, defaultValues: { area_of_use: '' } });
    const ghUomForm = useForm<any>({ resolver: zodResolver(ghUomSchema) as any, defaultValues: { group_head: '', uom: '' } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cForm = useForm<any>({ resolver: zodResolver(companySchema) as any, defaultValues: { company_name: '', company_gstin: '', company_pan: '', company_email: '', company_phone: '', company_address: '', billing_address: '', destination_address: '', company_contact_person: '' } });
    const seForm = useForm<any>({ resolver: zodResolver(siteEngineerSchema) as any, defaultValues: { name: '', number: '', email: '' } });
    const conForm = useForm<any>({ resolver: zodResolver(contractorSchema) as any, defaultValues: { contractor_name: '', contractor_gstin: '', contractor_address: '', contractor_email: '', responsible_person: '', location: '', phone: '' } });
    const slForm = useForm<any>({ resolver: zodResolver(siteLocationSchema) as any, defaultValues: { location: '' } });
    const tcForm = useForm<any>({ resolver: zodResolver(termsSchema) as any, defaultValues: { title: '', name: '' } });

    const { fields: regFields, append: regAppend, remove: regRemove } = useFieldArray({ control: iForm.control, name: "regular_conditions" });
    const { fields: tpFields, append: tpAppend, remove: tpRemove } = useFieldArray({ control: iForm.control, name: "third_party_conditions" });

    const includeInInventory = iForm.watch('include_in_inventory');
    const watchedFirmName = iForm.watch('firm_name');

    const onInvalid = (errors: any) => {
        console.error('Validation errors:', errors);
        const errorMessages = Object.entries(errors)
            .map(([key, err]: [string, any]) => {
                const message = err.message || (err.value?.message) || 'Invalid value';
                return `${key}: ${message}`;
            });
        if (errorMessages.length > 0) {
            toast.error(`Validation failed: ${errorMessages.join(', ')}`);
        }
    };

    useEffect(() => {
        if (!editingRecord || openDialog !== 'item' || !watchedFirmName) {
            setExistingInventoryId(null);
            setCurrentOpeningQty(null);
            return;
        }
        const firmObj = masterSheet?.firmObjects?.find((f: any) => f.name === watchedFirmName);
        fetchItemInventoryRecord(editingRecord.item_name, firmObj?.id, watchedFirmName)
            .then(({ id, opening }) => {
                setExistingInventoryId(id);
                setCurrentOpeningQty(opening);
                iForm.setValue('inventory_quantity', 0);
            });
    }, [watchedFirmName, openDialog]);

    const loadData = useCallback(async () => {
        setDataLoading(true);
        try {
            const [masterRes, contRes, locRes, engRes, termsRes] = await Promise.all([
                fetchMasterRecords(),
                fetchContractors(),
                fetchSiteLocations(),
                fetchSiteEngineers(),
                fetchTermsAndConditions(),
            ]);
            setAllRecords(masterRes || []);
            setContractors(contRes || []);
            setSiteLocations(locRes || []);
            setSiteEngineers(engRes || []);
            setTermsConditions(termsRes || []);
        } catch (error) {
            console.error('Error loading master records:', error);
            toast.error('Failed to load master records');
        } finally {
            setDataLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        if (openDialog) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = previousOverflow;
        }

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [openDialog]);

    useEffect(() => {
        const parseConds = (val: any) => {
            if (!val) return [{ value: '' }];
            try {
                const parsed = typeof val === 'string' ? JSON.parse(val) : val;
                if (Array.isArray(parsed)) return parsed.map(c => ({ value: typeof c === 'object' ? (c.value || c.text || '') : String(c) }));
                return [{ value: String(parsed) }];
            } catch {
                return [{ value: String(val) }];
            }
        };

        if (editingRecord) {
            const existingFirms = editingRecord.selected_firms && editingRecord.selected_firms.length > 0
                ? editingRecord.selected_firms
                : (editingRecord.firm_name && editingRecord.firm_name !== '--'
                    ? editingRecord.firm_name.split(',').map((s: string) => s.trim()).filter(Boolean)
                    : (masterSheet?.firms ? [...masterSheet.firms] : []));

            const normalized = {
                ...editingRecord,
                vendor_gstin: editingRecord.vendor_gstin ?? '',
                vendor_address: editingRecord.vendor_address ?? '',
                vendor_email: editingRecord.vendor_email ?? '',
                payment_term: editingRecord.payment_term ?? '',
                responsible_person: editingRecord.responsible_person ?? '',
                location: editingRecord.location ?? '',
                phone: editingRecord.phone ?? '',
                regular_conditions: parseConds(editingRecord.regular_conditions),
                third_party_conditions: parseConds(editingRecord.third_party_conditions),
                firm_name: editingRecord.firm_name ?? '',
                selected_firms: existingFirms,
                company_contact_person: editingRecord.company_contact_person ?? '',
                group_head: editingRecord.group_head ?? '',
                uom: editingRecord.uom ?? '',
                area_of_use: editingRecord.area_of_use ?? '',
                company_gstin: editingRecord.company_gstin ?? '',
                company_pan: editingRecord.company_pan ?? '',
                company_email: editingRecord.company_email ?? '',
                company_phone: editingRecord.company_phone ?? '',
                company_address: editingRecord.company_address ?? '',
                billing_address: editingRecord.billing_address ?? '',
                destination_address: editingRecord.destination_address ?? '',
            };
            if (openDialog === 'vendor') vForm.reset({ ...normalized, selected_firms: existingFirms });
            if (openDialog === 'item') {
                iForm.reset({ ...normalized, selected_firms: existingFirms, include_in_inventory: false, inventory_quantity: 0 });
            }
            if (openDialog === 'dept') dForm.reset(normalized);
            if (openDialog === 'project') pForm.reset(normalized);
            if (openDialog === 'gh') ghForm.reset({ ...normalized, selected_firms: existingFirms });
            if (openDialog === 'uom') uomForm.reset({ ...normalized, selected_firms: existingFirms });
            if (openDialog === 'areaofuse') aouForm.reset({ ...normalized, selected_firms: existingFirms });
            if (openDialog === 'ghuom') ghUomForm.reset({ ...normalized, selected_firms: existingFirms });
            if (openDialog === 'company') cForm.reset({ ...normalized, selected_firms: [] });
            if (openDialog === 'site_engineer') seForm.reset({ ...normalized, selected_firms: existingFirms });
            if (openDialog === 'contractor') conForm.reset({ ...normalized, selected_firms: existingFirms });
            if (openDialog === 'site_location') slForm.reset({ ...normalized, selected_firms: existingFirms });
            if (openDialog === 'terms_condition') tcForm.reset({ title: editingRecord.title ?? '', name: editingRecord.name ?? '', selected_firms: [] });
        } else if (openDialog) {
            const allFirmsList = masterSheet?.firms ? [...masterSheet.firms] : [];
            if (openDialog === 'vendor') vForm.reset({ vendor_name: '', vendor_gstin: '', vendor_address: '', vendor_email: '', payment_term: '', responsible_person: '', location: '', phone: '', selected_firms: allFirmsList });
            if (openDialog === 'item') iForm.reset({ item_name: '', group_head: '', uom: '', include_in_inventory: false, inventory_quantity: 0, firm_name: '', selected_firms: allFirmsList, regular_conditions: [{ value: '' }], third_party_conditions: [{ value: '' }] });
            if (openDialog === 'dept') dForm.reset({ department: '' });
            if (openDialog === 'project') pForm.reset({ firm_name: '', destination_address: '' });
            if (openDialog === 'gh') ghForm.reset({ group_head: '', selected_firms: allFirmsList });
            if (openDialog === 'uom') uomForm.reset({ uom: '', selected_firms: allFirmsList });
            if (openDialog === 'areaofuse') aouForm.reset({ area_of_use: '', selected_firms: allFirmsList });
            if (openDialog === 'ghuom') ghUomForm.reset({ group_head: '', uom: '', selected_firms: allFirmsList });
            if (openDialog === 'company') cForm.reset({ company_name: '', company_gstin: '', company_pan: '', company_email: '', company_phone: '', company_address: '', billing_address: '', destination_address: '', company_contact_person: '', selected_firms: [] });
            if (openDialog === 'site_engineer') seForm.reset({ name: '', number: '', email: '', selected_firms: allFirmsList });
            if (openDialog === 'contractor') conForm.reset({ contractor_name: '', contractor_gstin: '', contractor_address: '', contractor_email: '', responsible_person: '', location: '', phone: '', selected_firms: allFirmsList });
            if (openDialog === 'site_location') slForm.reset({ location: '', selected_firms: allFirmsList });
            if (openDialog === 'terms_condition') tcForm.reset({ title: '', name: '', selected_firms: [] });
        }
    }, [editingRecord, openDialog]);

    const handleDeleteGHUom = async (record: any) => {
        if (confirm(`Remove this record?`)) {
            const allIds: number[] = Array.isArray(record.all_ids) && record.all_ids.length > 0 ? record.all_ids : (record.id ? [record.id] : []);
            const ops = allIds.map((id: number) => deleteMasterData(id, record.__table || 'group_head'));
            const results = await Promise.all(ops);
            if (results.every(r => r.success)) {
                toast.success('Deleted');
                await loadData();
                updateAll();
            } else {
                toast.error('Delete failed');
            }
        }
    };

    const handleDeleteByDept = async (deptName: string) => {
        if (confirm(`Remove department "${deptName}"?`)) {
            const targets = allRecords.filter(r => r.department === deptName);
            const ops = targets.map(t => deleteMasterData(t.id, 'department'));
            await Promise.all(ops);
            toast.success('Department removed');
            await loadData();
            updateAll();
        }
    };

    const handleDelete = async (record: any, type?: string) => {
        if (confirm('Permanently delete this record?')) {
            let res;
            const allIds: number[] = Array.isArray(record.all_ids) && record.all_ids.length > 0 ? record.all_ids : (record.id ? [record.id] : []);

            if (type === 'site_engineer') {
                const ops = allIds.length > 0
                    ? allIds.map((id: number) => deleteSiteEngineer(id))
                    : [deleteSiteEngineer(record.number)];
                const results = await Promise.all(ops);
                res = { success: results.every(r => r.success) };
            } else if (type === 'contractor') {
                const ops = allIds.map((id: number) => deleteContractor(id));
                const results = await Promise.all(ops);
                res = { success: results.every(r => r.success) };
            } else if (type === 'site_location') {
                const ops = allIds.map((id: number) => deleteSiteLocation(id));
                const results = await Promise.all(ops);
                res = { success: results.every(r => r.success) };
            } else if (type === 'terms_condition') {
                const ops = allIds.map((id: number) => deleteTermsAndCondition(id));
                const results = await Promise.all(ops);
                res = { success: results.every(r => r.success) };
            } else {
                const tableType = type || record.__table;
                const ops = allIds.map((id: number) => deleteMasterData(id, tableType));
                const results = await Promise.all(ops);
                res = { success: results.every(r => r.success) };
            }

            if (res.success) {
                toast.success('Deleted');
                await loadData();
                updateAll();
            } else {
                toast.error('Delete failed');
            }
        }
    };

    const getActions = (row: any, type: string) => (
        <div className="flex items-center gap-1 justify-end pr-4">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => { setEditingRecord(row); setOpenDialog(type); }}><Pencil size={14} /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => (type === 'ghuom' ? handleDeleteGHUom(row) : handleDelete(row, type))}><Trash size={14} /></Button>
        </div>
    );

    const handleAddDeptInline = async (formInstance: any, fieldName: string) => {
        if (!searchTermDept.trim()) return;
        setIsAddingDept(true);
        try {
            const res = await insertMasterData({ department: searchTermDept.trim() });
            if (res.success) {
                toast.success(`Department "${searchTermDept}" added successfully!`);
                updateAll();
                formInstance.setValue(fieldName, searchTermDept.trim());
                setSearchTermDept('');
            } else {
                toast.error('Failed to add department');
            }
        } catch (error) {
            console.error('Error adding department:', error);
            toast.error('Error adding department');
        } finally {
            setIsAddingDept(false);
        }
    };

    const ghUomColumns: ColumnDef<any>[] = [
        { accessorKey: 'firm_name', header: 'Project Name', cell: ({ row }) => <div className="flex items-center gap-2 font-medium"><Building size={16} className="text-purple-500 shrink-0" /><span className="truncate max-w-[140px]" title={row.original.firm_name || '--'}>{row.original.firm_name || '--'}</span></div> },
        { accessorKey: 'group_head', header: 'Group Head', cell: ({ row }) => <div className="flex items-center gap-2 font-medium"><LayoutGrid size={16} className="text-blue-500" />{row.original.group_head || '--'}</div> },
        { accessorKey: 'uom', header: 'UOM', cell: ({ row }) => <div className="flex items-center gap-2 font-medium"><Package size={16} className="text-emerald-500" />{row.original.uom || '--'}</div> },
        { id: 'actions', cell: ({ row }) => getActions(row.original, 'ghuom') }
    ];

    const ghColumns: ColumnDef<any>[] = [
        { accessorKey: 'firm_name', header: 'Project Name', cell: ({ row }) => <div className="flex items-center gap-2 font-medium"><Building size={16} className="text-purple-500 shrink-0" /><span className="truncate max-w-[140px]" title={row.original.firm_name || '--'}>{row.original.firm_name || '--'}</span></div> },
        { accessorKey: 'group_head', header: 'Group Head', cell: ({ row }) => <div className="flex items-center gap-2 font-medium"><LayoutGrid size={16} className="text-blue-500" />{row.original.group_head || '--'}</div> },
        { id: 'actions', cell: ({ row }) => getActions(row.original, 'gh') }
    ];

    const uomColumns: ColumnDef<any>[] = [
        { accessorKey: 'firm_name', header: 'Project Name', cell: ({ row }) => <div className="flex items-center gap-2 font-medium"><Building size={16} className="text-purple-500 shrink-0" /><span className="truncate max-w-[140px]" title={row.original.firm_name || '--'}>{row.original.firm_name || '--'}</span></div> },
        { accessorKey: 'uom', header: 'UOM', cell: ({ row }) => <div className="flex items-center gap-2 font-medium"><Package size={16} className="text-emerald-500" />{row.original.uom || '--'}</div> },
        { id: 'actions', cell: ({ row }) => getActions(row.original, 'uom') }
    ];

    const aouColumns: ColumnDef<any>[] = [
        { accessorKey: 'firm_name', header: 'Project Name', cell: ({ row }) => <div className="flex items-center gap-2 font-medium"><Building size={16} className="text-purple-500 shrink-0" /><span className="truncate max-w-[140px]" title={row.original.firm_name || '--'}>{row.original.firm_name || '--'}</span></div> },
        { accessorKey: 'area_of_use', header: 'Area of Use', cell: ({ row }) => <div className="flex items-center gap-2 font-medium"><MapPin size={16} className="text-red-500" />{row.original.area_of_use || '--'}</div> },
        { id: 'actions', cell: ({ row }) => getActions(row.original, 'areaofuse') }
    ];

    const vendorColumns: ColumnDef<any>[] = [
        { accessorKey: 'firm_name', header: 'Project Name', cell: ({ row }) => <div className="flex items-center gap-2 font-medium"><Building size={16} className="text-purple-500 shrink-0" /><span className="truncate max-w-[140px]" title={row.original.firm_name || '--'}>{row.original.firm_name || '--'}</span></div> },
        { accessorKey: 'vendor_name', header: 'Vendor Name', cell: ({ row }) => <div className="flex items-center gap-2 font-medium"><Building2 size={16} className="text-primary" />{row.original.vendor_name}</div> },
        { accessorKey: 'vendor_gstin', header: 'GSTIN' },
        { accessorKey: 'vendor_email', header: 'Email' },
        {
            accessorKey: 'payment_term',
            header: 'Payment Terms',
            cell: ({ row }) => {
                const val = row.original.payment_term;
                if (!val) return <span className="text-muted-foreground italic text-xs">--</span>;
                const terms = val.split(',').map((t: string) => t.trim()).filter(Boolean);
                return (
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {terms.map((t: string, i: number) => (
                            <span key={i} className="px-1.5 py-0.5 rounded text-[11px] bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-medium border border-indigo-100 dark:border-indigo-900">
                                {t}
                            </span>
                        ))}
                    </div>
                );
            }
        },
        { accessorKey: 'responsible_person', header: 'Responsible Person' },
        { accessorKey: 'phone', header: 'Phone' },
        { accessorKey: 'location', header: 'Location' },
        { id: 'actions', cell: ({ row }) => getActions(row.original, 'vendor') }
    ];

    const itemColumns: ColumnDef<any>[] = [
        { header: 'Actions', id: 'actions', cell: ({ row }) => getActions(row.original, 'item') },
        { accessorKey: 'firm_name', header: 'Project Name', cell: ({ row }) => <div className="flex items-center gap-2 font-medium"><Building size={16} className="text-purple-500" />{row.original.firm_name || row.original.firm?.firm_name || '--'}</div> },
        { accessorKey: 'item_name', header: 'Product Name', cell: ({ row }) => <div className="flex items-center gap-2 font-medium"><Package size={16} className="text-blue-500" />{row.original.item_name}</div> },
        { accessorKey: 'group_head', header: 'Group Head' },
        { accessorKey: 'uom', header: 'UOM' },
        {
            accessorKey: 'regular_conditions',
            header: 'Regular Terms Conditions',
            cell: ({ row }) => <ConditionsCell val={row.original.regular_conditions} />
        },
        {
            accessorKey: 'third_party_conditions',
            header: '3rd Party terms Conditions',
            cell: ({ row }) => <ConditionsCell val={row.original.third_party_conditions} />
        }
    ];

    const departmentColumns: ColumnDef<any>[] = [
        { accessorKey: 'department', header: 'Dept Name', cell: ({ row }) => <div className="flex items-center gap-2 font-medium"><LayoutGrid size={16} className="text-orange-500" />{row.original.department}</div> },
        {
            id: 'actions', cell: ({ row }) => (
                <div className="flex items-center gap-1 justify-end pr-4">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => { setEditingRecord(row.original); setOpenDialog('dept'); }}><Pencil size={14} /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteByDept(row.original.department)}><Trash size={14} /></Button>
                </div>
            )
        }
    ];
    const projectColumns: ColumnDef<any>[] = [
        { accessorKey: 'firm_name', header: 'Project Name', cell: ({ row }) => <div className="flex items-center gap-2 font-medium"><Building size={16} className="text-purple-500" />{row.original.firm_name}</div> },
        { accessorKey: 'destination_address', header: 'Destination Address', cell: ({ row }) => <span className="text-xs truncate max-w-[200px] block" title={row.original.destination_address}>{row.original.destination_address || '--'}</span> },
        { id: 'actions', cell: ({ row }) => getActions(row.original, 'project') }
    ];

    const companyColumns: ColumnDef<any>[] = [
        // { accessorKey: 'firm_name', header: 'Project Name', cell: ({ row }) => <div className="flex items-center gap-2 font-medium"><Building size={16} className="text-purple-500 shrink-0" /><span className="truncate max-w-[140px]" title={row.original.firm_name || '--'}>{row.original.firm_name || '--'}</span></div> },
        { accessorKey: 'company_name', header: 'Company Name', cell: ({ row }) => <div className="flex items-center gap-2 font-medium"><Building size={16} className="text-emerald-500" />{row.original.company_name}</div> },
        { accessorKey: 'company_gstin', header: 'GSTIN' },
        { accessorKey: 'company_pan', header: 'PAN' },
        { accessorKey: 'company_email', header: 'Email' },
        { accessorKey: 'company_phone', header: 'Phone' },
        { accessorKey: 'company_contact_person', header: 'Contact Person' },
        { accessorKey: 'company_address', header: 'Address', cell: ({ row }) => <span className="text-xs truncate max-w-[120px] block" title={row.original.company_address}>{row.original.company_address || '--'}</span> },
        { accessorKey: 'billing_address', header: 'Billing Address', cell: ({ row }) => <span className="text-xs truncate max-w-[120px] block" title={row.original.billing_address}>{row.original.billing_address || '--'}</span> },
        { accessorKey: 'destination_address', header: 'Destination', cell: ({ row }) => <span className="text-xs truncate max-w-[120px] block" title={row.original.destination_address}>{row.original.destination_address || '--'}</span> },
        { id: 'actions', cell: ({ row }) => getActions(row.original, 'company') }
    ];

    const siteEngineerColumns: ColumnDef<any>[] = [
        { accessorKey: 'firm_name', header: 'Project Name', cell: ({ row }) => <div className="flex items-center gap-2 font-medium"><Building size={16} className="text-purple-500 shrink-0" /><span className="truncate max-w-[140px]" title={row.original.firm_name || '--'}>{row.original.firm_name || '--'}</span></div> },
        { accessorKey: 'name', header: 'Engineer Name', cell: ({ row }) => <div className="flex items-center gap-2 font-medium"><UserCog size={16} className="text-orange-500" />{row.original.name}</div> },
        { accessorKey: 'number', header: 'Phone Number', cell: ({ row }) => <div className="flex items-center gap-2"><Phone size={14} className="text-muted-foreground" />{row.original.number}</div> },
        { accessorKey: 'email', header: 'Email Address', cell: ({ row }) => <div className="flex items-center gap-2"><Mail size={14} className="text-muted-foreground" />{row.original.email}</div> },
        { id: 'actions', cell: ({ row }) => getActions(row.original, 'site_engineer') }
    ];

    const contractorColumns: ColumnDef<any>[] = [
        { accessorKey: 'firm_name', header: 'Project Name', cell: ({ row }) => <div className="flex items-center gap-2 font-medium"><Building size={16} className="text-purple-500 shrink-0" /><span className="truncate max-w-[140px]" title={row.original.firm_name || '--'}>{row.original.firm_name || '--'}</span></div> },
        { accessorKey: 'contractor_name', header: 'Contractor Name', cell: ({ row }) => <div className="flex items-center gap-2 font-medium"><Users size={16} className="text-primary" />{row.original.contractor_name}</div> },
        { accessorKey: 'contractor_gstin', header: 'GSTIN' },
        { accessorKey: 'contractor_email', header: 'Email' },
        { accessorKey: 'responsible_person', header: 'Responsible Person' },
        { accessorKey: 'phone', header: 'Phone' },
        { accessorKey: 'location', header: 'Location' },
        { id: 'actions', cell: ({ row }) => getActions(row.original, 'contractor') }
    ];

    const siteLocationColumns: ColumnDef<any>[] = [
        { accessorKey: 'firm_name', header: 'Project Name', cell: ({ row }) => <div className="flex items-center gap-2 font-medium"><Building size={16} className="text-purple-500 shrink-0" /><span className="truncate max-w-[140px]" title={row.original.firm_name || '--'}>{row.original.firm_name || '--'}</span></div> },
        { accessorKey: 'location', header: 'Location', cell: ({ row }) => <div className="flex items-center gap-2 font-medium"><Map size={16} className="text-indigo-500" />{row.original.location}</div> },
        { id: 'actions', cell: ({ row }) => getActions(row.original, 'site_location') }
    ];

    const termsColumns: ColumnDef<any>[] = [
        // { accessorKey: 'firm_name', header: 'Project Name', cell: ({ row }) => <div className="flex items-center gap-2 font-medium"><Building size={16} className="text-purple-500 shrink-0" /><span className="truncate max-w-[140px]" title={row.original.firm_name || '--'}>{row.original.firm_name || '--'}</span></div> },
        { accessorKey: 'title', header: 'Heading', cell: ({ row }) => <div className="flex items-center gap-2 font-medium"><FileText size={16} className="text-teal-500 shrink-0" />{row.original.title}</div> },
        { accessorKey: 'name', header: 'Condition' },
        { id: 'actions', cell: ({ row }) => getActions(row.original, 'terms_condition') }
    ];

    const onSubmit = async (values: any, type: string) => {
        setIsSubmitting(true);
        try {
            let res;
            const selectedFirms: string[] = (values.selected_firms && values.selected_firms.length > 0)
                ? values.selected_firms
                : (values.firm_name ? [values.firm_name] : []);

            if (type === 'item') {
                if (editingRecord) {
                    const firstFirm = selectedFirms[0] || values.firm_name || '';
                    const selectedFirmObj = masterSheet?.firmObjects?.find((f) => f.name === firstFirm);
                    const firmIdVal = selectedFirmObj?.id ? Number(selectedFirmObj.id) : null;

                    const payload = {
                        firm_name: firstFirm,
                        firm_id: firmIdVal,
                        item_name: values.item_name,
                        group_head: values.group_head,
                        uom: values.uom,
                        regular_conditions: values.regular_conditions?.map((c: any) => c.value).filter(Boolean) || [],
                        third_party_conditions: values.third_party_conditions?.map((c: any) => c.value).filter(Boolean) || [],
                    };
                    res = await updateMasterData(editingRecord.id, payload);

                    if (selectedFirms.length > 1) {
                        const extraFirms = selectedFirms.slice(1);
                        const extraPromises = extraFirms.map((firmName: string) => {
                            const sObj = masterSheet?.firmObjects?.find((f) => f.name === firmName);
                            return insertMasterData({
                                firm_name: firmName,
                                firm_id: sObj?.id ? Number(sObj.id) : null,
                                item_name: values.item_name,
                                group_head: values.group_head,
                                uom: values.uom,
                                regular_conditions: values.regular_conditions?.map((c: any) => c.value).filter(Boolean) || [],
                                third_party_conditions: values.third_party_conditions?.map((c: any) => c.value).filter(Boolean) || [],
                            });
                        });
                        await Promise.all(extraPromises);
                    }
                } else {
                    const insertPromises = selectedFirms.map((firmName: string) => {
                        const selectedFirmObj = masterSheet?.firmObjects?.find((f) => f.name === firmName);
                        const firmIdVal = selectedFirmObj?.id ? Number(selectedFirmObj.id) : null;

                        const payload = {
                            firm_name: firmName,
                            firm_id: firmIdVal,
                            item_name: values.item_name,
                            group_head: values.group_head,
                            uom: values.uom,
                            regular_conditions: values.regular_conditions?.map((c: any) => c.value).filter(Boolean) || [],
                            third_party_conditions: values.third_party_conditions?.map((c: any) => c.value).filter(Boolean) || [],
                        };
                        return insertMasterData(payload);
                    });

                    const results = await Promise.all(insertPromises);
                    res = { success: results.every((r) => r.success) };
                }
            } else if (type === 'vendor') {
                const getPayload = (firmName?: string) => {
                    const firmObj = firmName ? masterSheet?.firmObjects?.find((f) => f.name === firmName) : null;
                    return {
                        vendor_name: values.vendor_name,
                        vendor_gstin: values.vendor_gstin || null,
                        vendor_address: values.vendor_address || null,
                        vendor_email: values.vendor_email || null,
                        payment_term: values.payment_term || null,
                        responsible_person: values.responsible_person || null,
                        location: values.location || null,
                        phone: values.phone || null,
                        firm_name: firmName || null,
                        firm_id: firmObj?.id ? Number(firmObj.id) : null,
                    };
                };

                if (editingRecord) {
                    const firstFirm = selectedFirms[0] || values.firm_name || '';
                    res = await updateMasterData(editingRecord.id, getPayload(firstFirm));

                    if (selectedFirms.length > 1) {
                        const extraPromises = selectedFirms.slice(1).map((fName) => insertMasterData(getPayload(fName)));
                        await Promise.all(extraPromises);
                    }
                } else {
                    const insertPromises = selectedFirms.length > 0
                        ? selectedFirms.map((fName) => insertMasterData(getPayload(fName)))
                        : [insertMasterData(getPayload())];
                    const results = await Promise.all(insertPromises);
                    res = { success: results.every((r) => r.success) };
                }
            } else if (type === 'contractor') {
                const getPayload = (firmName?: string) => {
                    const firmObj = firmName ? masterSheet?.firmObjects?.find((f) => f.name === firmName) : null;
                    return {
                        contractor_name: values.contractor_name,
                        contractor_gstin: values.contractor_gstin || null,
                        contractor_address: values.contractor_address || null,
                        contractor_email: values.contractor_email || null,
                        responsible_person: values.responsible_person || null,
                        location: values.location || null,
                        phone: values.phone || null,
                        firm_name: firmName || null,
                        firm_id: firmObj?.id ? Number(firmObj.id) : null,
                    };
                };

                if (editingRecord) {
                    const firstFirm = selectedFirms[0] || values.firm_name || '';
                    res = await updateContractor(editingRecord.id, getPayload(firstFirm));

                    if (selectedFirms.length > 1) {
                        const extraPromises = selectedFirms.slice(1).map((fName) => insertContractor(getPayload(fName)));
                        await Promise.all(extraPromises);
                    }
                } else {
                    const insertPromises = selectedFirms.length > 0
                        ? selectedFirms.map((fName) => insertContractor(getPayload(fName)))
                        : [insertContractor(getPayload())];
                    const results = await Promise.all(insertPromises);
                    res = { success: results.every((r) => r.success) };
                }
            } else if (type === 'site_location') {
                const getPayload = (firmName?: string) => {
                    const firmObj = firmName ? masterSheet?.firmObjects?.find((f) => f.name === firmName) : null;
                    return {
                        location: values.location,
                        firm_name: firmName || null,
                        firm_id: firmObj?.id ? Number(firmObj.id) : null,
                    };
                };

                if (editingRecord) {
                    const firstFirm = selectedFirms[0] || values.firm_name || '';
                    res = await updateSiteLocation(editingRecord.id, getPayload(firstFirm));

                    if (selectedFirms.length > 1) {
                        const extraPromises = selectedFirms.slice(1).map((fName) => insertSiteLocation(getPayload(fName)));
                        await Promise.all(extraPromises);
                    }
                } else {
                    const insertPromises = selectedFirms.length > 0
                        ? selectedFirms.map((fName) => insertSiteLocation(getPayload(fName)))
                        : [insertSiteLocation(getPayload())];
                    const results = await Promise.all(insertPromises);
                    res = { success: results.every((r) => r.success) };
                }
            } else if (type === 'site_engineer') {
                const getPayload = (firmName?: string) => {
                    const firmObj = firmName ? masterSheet?.firmObjects?.find((f) => f.name === firmName) : null;
                    return {
                        name: values.name,
                        number: values.number,
                        email: values.email,
                        firm_name: firmName || null,
                        firm_id: firmObj?.id ? Number(firmObj.id) : null,
                    };
                };

                if (editingRecord) {
                    const firstFirm = selectedFirms[0] || values.firm_name || '';
                    res = await updateSiteEngineer(editingRecord.id, getPayload(firstFirm));

                    if (selectedFirms.length > 1) {
                        const extraPromises = selectedFirms.slice(1).map((fName) => insertSiteEngineer(getPayload(fName)));
                        await Promise.all(extraPromises);
                    }
                } else {
                    const insertPromises = selectedFirms.length > 0
                        ? selectedFirms.map((fName) => insertSiteEngineer(getPayload(fName)))
                        : [insertSiteEngineer(getPayload())];
                    const results = await Promise.all(insertPromises);
                    res = { success: results.every((r) => r.success) };
                }
            } else if (type === 'terms_condition') {
                const payload = {
                    title: values.title,
                    name: values.name,
                    firm_name: null,
                    firm_id: null,
                };

                if (editingRecord) {
                    res = await updateTermsAndCondition(editingRecord.id, payload);
                } else {
                    res = await insertTermsAndCondition(payload);
                }
            } else if (type === 'company') {
                const payload = {
                    company_name: values.company_name,
                    company_gstin: values.company_gstin || null,
                    company_pan: values.company_pan || null,
                    company_email: values.company_email || null,
                    company_phone: values.company_phone || null,
                    company_address: values.company_address || null,
                    billing_address: values.billing_address || null,
                    destination_address: values.destination_address || null,
                    company_contact_person: values.company_contact_person || null,
                    firm_name: null,
                    firm_id: null,
                };

                if (editingRecord) {
                    res = await updateMasterData(editingRecord.id, payload);
                } else {
                    res = await insertMasterData(payload);
                }
            } else if (type === 'gh') {
                const getPayload = (firmName?: string) => {
                    const firmObj = firmName ? masterSheet?.firmObjects?.find((f) => f.name === firmName) : null;
                    return {
                        group_head: values.group_head,
                        firm_name: firmName || null,
                        firm_id: firmObj?.id ? Number(firmObj.id) : null,
                    };
                };

                if (editingRecord) {
                    const firstFirm = selectedFirms[0] || values.firm_name || '';
                    res = await updateMasterData(editingRecord.id, getPayload(firstFirm));

                    if (selectedFirms.length > 1) {
                        const extraPromises = selectedFirms.slice(1).map((fName) => insertMasterData(getPayload(fName)));
                        await Promise.all(extraPromises);
                    }
                } else {
                    const insertPromises = selectedFirms.length > 0
                        ? selectedFirms.map((fName) => insertMasterData(getPayload(fName)))
                        : [insertMasterData(getPayload())];
                    const results = await Promise.all(insertPromises);
                    res = { success: results.every((r) => r.success) };
                }
            } else if (type === 'uom') {
                const getPayload = (firmName?: string) => {
                    const firmObj = firmName ? masterSheet?.firmObjects?.find((f) => f.name === firmName) : null;
                    return {
                        uom: values.uom,
                        firm_name: firmName || null,
                        firm_id: firmObj?.id ? Number(firmObj.id) : null,
                    };
                };

                if (editingRecord) {
                    const firstFirm = selectedFirms[0] || values.firm_name || '';
                    res = await updateMasterData(editingRecord.id, getPayload(firstFirm));

                    if (selectedFirms.length > 1) {
                        const extraPromises = selectedFirms.slice(1).map((fName) => insertMasterData(getPayload(fName)));
                        await Promise.all(extraPromises);
                    }
                } else {
                    const insertPromises = selectedFirms.length > 0
                        ? selectedFirms.map((fName) => insertMasterData(getPayload(fName)))
                        : [insertMasterData(getPayload())];
                    const results = await Promise.all(insertPromises);
                    res = { success: results.every((r) => r.success) };
                }
            } else if (type === 'areaofuse') {
                const getPayload = (firmName?: string) => {
                    const firmObj = firmName ? masterSheet?.firmObjects?.find((f) => f.name === firmName) : null;
                    return {
                        area_of_use: values.area_of_use,
                        firm_name: firmName || null,
                        firm_id: firmObj?.id ? Number(firmObj.id) : null,
                    };
                };

                if (editingRecord) {
                    const firstFirm = selectedFirms[0] || values.firm_name || '';
                    res = await updateMasterData(editingRecord.id, getPayload(firstFirm));

                    if (selectedFirms.length > 1) {
                        const extraPromises = selectedFirms.slice(1).map((fName) => insertMasterData(getPayload(fName)));
                        await Promise.all(extraPromises);
                    }
                } else {
                    const insertPromises = selectedFirms.length > 0
                        ? selectedFirms.map((fName) => insertMasterData(getPayload(fName)))
                        : [insertMasterData(getPayload())];
                    const results = await Promise.all(insertPromises);
                    res = { success: results.every((r) => r.success) };
                }
            } else if (type === 'ghuom') {
                const getPayload = (firmName?: string) => {
                    const firmObj = firmName ? masterSheet?.firmObjects?.find((f) => f.name === firmName) : null;
                    return {
                        group_head: values.group_head || null,
                        uom: values.uom || null,
                        firm_name: firmName || null,
                        firm_id: firmObj?.id ? Number(firmObj.id) : null,
                    };
                };

                if (editingRecord) {
                    const firstFirm = selectedFirms[0] || values.firm_name || '';
                    res = await updateMasterData(editingRecord.id, getPayload(firstFirm));

                    if (selectedFirms.length > 1) {
                        const extraPromises = selectedFirms.slice(1).map((fName) => insertMasterData(getPayload(fName)));
                        await Promise.all(extraPromises);
                    }
                } else {
                    const insertPromises = selectedFirms.length > 0
                        ? selectedFirms.map((fName) => insertMasterData(getPayload(fName)))
                        : [insertMasterData(getPayload())];
                    const results = await Promise.all(insertPromises);
                    res = { success: results.every((r) => r.success) };
                }
            } else if (editingRecord) {
                if (type === 'dept') {
                    // dept tab is hidden; update single record by id
                    res = await updateMasterData(editingRecord.id, { department: values.department });
                } else if (type === 'project') {
                    const targets = allRecords.filter((r) => (r.firm_name === editingRecord.firm_name || r.id === editingRecord.id) && r.__table === 'firm');
                    const targetList = targets.length > 0 ? targets : [{ id: editingRecord.id }];
                    const updates = targetList.map((t) => updateMasterData(t.id, {
                        firm_name: values.firm_name,
                        destination_address: values.destination_address || null,
                    }));
                    const results = await Promise.all(updates);
                    res = { success: results.every((r) => r.success) };
                } else {
                    res = await updateMasterData(editingRecord.id, values);
                }
            } else {
                res = await insertMasterData(values);
            }

            if (res?.success && type === 'item' && values.include_in_inventory) {
                const selectedFirms: string[] = (values.selected_firms && values.selected_firms.length > 0)
                    ? values.selected_firms
                    : [values.firm_name];

                const invPromises = selectedFirms.map((firmName: string) => {
                    const firmId = masterSheet?.firmObjects?.find((firm) => firm.name === firmName)?.id;
                    return addItemToInventory({
                        itemName: values.item_name,
                        groupHead: values.group_head,
                        uom: values.uom,
                        quantity: values.inventory_quantity,
                        firmName: firmName,
                        firmId,
                        inventoryRecordId: existingInventoryId ?? undefined,
                    });
                });

                const invResults = await Promise.all(invPromises);
                if (!invResults.every((r) => r.success)) {
                    toast.error('Item saved, but inventory could not be updated for all projects');
                    return;
                }

                updateInventorySheet();
            }

            if (res?.success) {
                toast.success('Saved');
                setOpenDialog(null);
                setEditingRecord(null);
                setExistingInventoryId(null);
                await loadData();
                updateAll();
            }
            else { toast.error(res?.error?.message || res?.error?.details || 'Save failed. Please try again.'); }
        } finally {
            setIsSubmitting(false);
        }
    };

    // Grouping helper for master entities by primary identity
    const buildGroupedData = (records: any[], keyFn: (r: any) => string) => {
        const dataMap: Record<string, any> = {};
        records.forEach((r: any) => {
            const key = keyFn(r);
            if (!key) return;
            const firmName = r.firm_name || r.firm?.firm_name || '';
            if (!dataMap[key]) {
                dataMap[key] = {
                    ...r,
                    all_ids: r.id ? [r.id] : [],
                    all_firm_names: firmName ? [firmName] : [],
                };
            } else {
                if (r.id && !dataMap[key].all_ids.includes(r.id)) {
                    dataMap[key].all_ids.push(r.id);
                }
                if (firmName && !dataMap[key].all_firm_names.includes(firmName)) {
                    dataMap[key].all_firm_names.push(firmName);
                }
            }
        });
        return Object.values(dataMap).map((item: any) => ({
            ...item,
            firm_name: item.all_firm_names.join(', ') || '--',
            selected_firms: item.all_firm_names,
        }));
    };

    const vendorsData = useMemo(() => buildGroupedData(allRecords.filter((r) => r.__table === 'vendors'), (v) => `${(v.vendor_name || '').trim().toLowerCase()}__${(v.vendor_gstin || '').trim()}`), [allRecords]);
    const itemsData = useMemo(() => buildGroupedData(allRecords.filter((r) => r.__table === 'item'), (i) => (i.item_name || '').trim().toLowerCase()), [allRecords]);
    const ghData = useMemo(() => buildGroupedData(allRecords.filter((r) => r.__table === 'group_head'), (g) => (g.group_head || '').trim().toLowerCase()), [allRecords]);
    const uomData = useMemo(() => buildGroupedData(allRecords.filter((r) => r.__table === 'uom'), (u) => (u.uom || '').trim().toLowerCase()), [allRecords]);
    const aouData = useMemo(() => buildGroupedData(allRecords.filter((r) => r.__table === 'area_of_use'), (a) => (a.area_of_use || '').trim().toLowerCase()), [allRecords]);
    const companiesData = useMemo(() => buildGroupedData(allRecords.filter((r) => r.__table === 'company'), (c) => (c.company_name || '').trim().toLowerCase()), [allRecords]);
    const projectsData = useMemo(() => allRecords.filter((r) => r.__table === 'firm'), [allRecords]);
    const contractorsData = useMemo(() => buildGroupedData(contractors, (c) => `${(c.contractor_name || '').trim().toLowerCase()}__${(c.contractor_gstin || '').trim()}`), [contractors]);
    const siteLocationsData = useMemo(() => buildGroupedData(siteLocations, (l) => (l.location || '').trim().toLowerCase()), [siteLocations]);
    const siteEngineersData = useMemo(() => buildGroupedData(siteEngineers, (se) => `${(se.name || '').trim().toLowerCase()}__${(se.number || '').trim()}`), [siteEngineers]);
    const termsData = useMemo(() => buildGroupedData(termsConditions, (tc) => `${(tc.title || '').trim().toLowerCase()}__${(tc.name || '').trim().toLowerCase()}`), [termsConditions]);

    return (
        <div className="h-full space-y-4 md:space-y-6 flex flex-col px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            <Heading heading="Master Registry" subtext="Universal repository for Vendors, Items, Departments, and Corporate Profiles"><div className="bg-gradient-to-br from-indigo-500 to-cyan-500 p-2 sm:p-3 rounded-2xl text-white"><FileSpreadsheet size={32} className="sm:w-10 sm:h-10" /></div></Heading>

            {allowedSections.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 bg-card border rounded-2xl text-center space-y-3">
                    <div className="p-3 bg-muted rounded-full text-muted-foreground">
                        <FileSpreadsheet size={32} />
                    </div>
                    <h3 className="text-base font-bold text-foreground">Access Restricted</h3>
                    <p className="text-xs text-muted-foreground max-w-md">
                        You do not currently have permission to view any Master Registry sections. Please contact your system administrator to assign registry permissions.
                    </p>
                </div>
            ) : (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                    <div className="mb-4">
                        <Select value={activeTab} onValueChange={setActiveTab}>
                            <SelectTrigger className="w-full sm:w-[300px] bg-background border-border/50 rounded-xl h-10 sm:h-12 shadow-sm font-medium">
                                <SelectValue placeholder="Select Registry" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                {allowedSections.map((sec) => {
                                    const IconComponent = sec.icon;
                                    return (
                                        <SelectItem key={sec.id} value={sec.id} className="cursor-pointer">
                                             <div className="flex items-center gap-2">
                                                <IconComponent size={16} className={sec.color} /> {sec.label}
                                            </div>
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>

                <TabsContent value="vendors" className="flex-1 outline-none">
                    <DataTable
                        data={vendorsData}
                        columns={vendorColumns}
                        dataLoading={dataLoading}
                        extraActions={<Button className="bg-indigo-600" onClick={() => { vForm.reset(); setEditingRecord(null); setOpenDialog('vendor'); }}><Plus size={18} /> Add Vendor</Button>}
                    />
                </TabsContent>
                <TabsContent value="items" className="flex-1 outline-none">
                    <DataTable
                        data={itemsData}
                        columns={itemColumns}
                        dataLoading={dataLoading}
                        extraActions={<Button className="bg-blue-600" onClick={() => { iForm.reset(); setEditingRecord(null); setOpenDialog('item'); }}><Plus size={18} /> Add Item</Button>}
                    />
                </TabsContent>
                <TabsContent value="group-heads" className="flex-1 outline-none">
                    <Tabs defaultValue="gh-table" className="h-full flex flex-col">
                        <div className="flex w-full mb-4">
                            <TabsList className="bg-muted/50 p-1 rounded-lg w-full">
                                <TabsTrigger value="gh-table" className="text-xs px-4">Group Head</TabsTrigger>
                                <TabsTrigger value="uom-table" className="text-xs px-4">UOM</TabsTrigger>
                                <TabsTrigger value="aou-table" className="text-xs px-4">Area of Use</TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="gh-table" className="flex-1 outline-none">
                            <DataTable
                                data={ghData}
                                columns={ghColumns}
                                dataLoading={dataLoading}
                                extraActions={
                                    <Button className="bg-blue-600" onClick={() => { ghForm.reset(); setEditingRecord(null); setOpenDialog('gh'); }}>
                                        <Plus size={18} /> Add Group Head
                                    </Button>
                                }
                            />
                        </TabsContent>

                        <TabsContent value="uom-table" className="flex-1 outline-none">
                            <DataTable
                                data={uomData}
                                columns={uomColumns}
                                dataLoading={dataLoading}
                                extraActions={
                                    <Button className="bg-emerald-600" onClick={() => { uomForm.reset(); setEditingRecord(null); setOpenDialog('uom'); }}>
                                        <Plus size={18} /> Add UOM
                                    </Button>
                                }
                            />
                        </TabsContent>

                        <TabsContent value="aou-table" className="flex-1 outline-none">
                            <DataTable
                                data={aouData}
                                columns={aouColumns}
                                dataLoading={dataLoading}
                                extraActions={
                                    <Button className="bg-red-600" onClick={() => { aouForm.reset(); setEditingRecord(null); setOpenDialog('areaofuse'); }}>
                                        <Plus size={18} /> Add Area of Use
                                    </Button>
                                }
                            />
                        </TabsContent>
                    </Tabs>
                </TabsContent>
                <TabsContent value="projects" className="flex-1 outline-none">
                    <DataTable
                        data={projectsData}
                        columns={projectColumns}
                        dataLoading={dataLoading}
                        extraActions={<Button className="bg-purple-600" onClick={() => { pForm.reset(); setEditingRecord(null); setOpenDialog('project'); }}><Plus size={18} /> Add Project</Button>}
                    />
                </TabsContent>
                <TabsContent value="companies" className="flex-1 outline-none">
                    <DataTable
                        data={companiesData}
                        columns={companyColumns}
                        dataLoading={dataLoading}
                        extraActions={<Button className="bg-emerald-600" onClick={() => { cForm.reset(); setEditingRecord(null); setOpenDialog('company'); }}><Plus size={18} /> Add Company</Button>}
                    />
                </TabsContent>
                <TabsContent value="contractors" className="flex-1 outline-none">
                    <DataTable
                        data={contractorsData}
                        columns={contractorColumns}
                        dataLoading={dataLoading}
                        extraActions={<Button className="bg-indigo-600" onClick={() => { conForm.reset(); setEditingRecord(null); setOpenDialog('contractor'); }}><Plus size={18} /> Add Contractor</Button>}
                    />
                </TabsContent>
                <TabsContent value="site_locations" className="flex-1 outline-none">
                    <DataTable
                        data={siteLocationsData}
                        columns={siteLocationColumns}
                        dataLoading={dataLoading}
                        extraActions={<Button className="bg-indigo-600" onClick={() => { slForm.reset(); setEditingRecord(null); setOpenDialog('site_location'); }}><Plus size={18} /> Add Location</Button>}
                    />
                </TabsContent>
                <TabsContent value="site_engineers" className="flex-1 outline-none">
                    <DataTable
                        data={siteEngineersData}
                        columns={siteEngineerColumns}
                        dataLoading={dataLoading}
                        extraActions={<Button className="bg-orange-600" onClick={() => { seForm.reset(); setEditingRecord(null); setOpenDialog('site_engineer'); }}><Plus size={18} /> Add Engineer</Button>}
                    />
                </TabsContent>
                <TabsContent value="terms_conditions" className="flex-1 outline-none">
                    <DataTable
                        data={termsData}
                        columns={termsColumns}
                        dataLoading={dataLoading}
                        extraActions={<Button className="bg-teal-600" onClick={() => { tcForm.reset(); setEditingRecord(null); setOpenDialog('terms_condition'); }}><Plus size={18} /> Add Condition</Button>}
                    />
                </TabsContent>
                <TabsContent value="doc_types" className="flex-1 outline-none">
                    <MasterListTab type="docDocumentType" title="Document Types" placeholder="Enter document type (e.g. Agreement, License, Certificate, Policy)" />
                </TabsContent>
                <TabsContent value="doc_categories" className="flex-1 outline-none">
                    <MasterListTab type="docCategory" title="Document Categories" placeholder="Enter category (e.g. Company, Personal, Director, Operations)" />
                </TabsContent>
            </Tabs>
            )}

            <Dialog open={!!openDialog} onOpenChange={(o) => {
                if (!o) {
                    setOpenDialog(null);
                    setEditingRecord(null);
                    cForm.reset();
                    conForm.reset();
                    slForm.reset();
                    pForm.reset();
                    tcForm.reset();
                }
            }}>
                <DialogContent className="max-w-2xl max-h-[85vh] p-0 flex flex-col overflow-hidden bg-background">
                    <div className="flex flex-col h-full overflow-hidden">
                        <div className="sticky top-0 z-20 px-4 sm:px-6 pt-4 sm:pt-6 pb-2 flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border/40 shadow-sm">
                            <DialogHeader><DialogTitle className="text-lg sm:text-xl font-bold">{editingRecord ? 'Edit' : 'Add'} {openDialog === 'ghuom' ? 'Group Head & UOM' : openDialog?.toUpperCase()}</DialogTitle></DialogHeader>
                        </div>
                        <ScrollArea className="flex-1 min-h-0 scroll-smooth overflow-y-auto" type="always">
                            <div className="space-y-4 sm:space-y-6 px-4 sm:px-6 pb-24 sm:pb-24">
                                {openDialog === 'vendor' && (
                                    <Form {...vForm}>
                                        <form className="grid gap-4" onSubmit={vForm.handleSubmit(v => onSubmit(v, 'vendor'), onInvalid)}>
                                            <ProjectSelectorField control={vForm.control} allFirms={masterSheet?.firms || []} />
                                            <FormField control={vForm.control} name="vendor_name" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Vendor Name</FormLabel>
                                                    <FormControl><Input {...field} placeholder="e.g., ABC Enterprises" /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <FormField control={vForm.control} name="vendor_gstin" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>GSTIN</FormLabel>
                                                    <FormControl><Input {...field} placeholder="e.g., 22AAAAA0000A1Z5" /></FormControl>
                                                </FormItem>
                                            )} />
                                            <FormField control={vForm.control} name="vendor_email" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Email</FormLabel>
                                                    <FormControl><Input {...field} placeholder="e.g., vendor@example.com" /></FormControl>
                                                </FormItem>
                                            )} />
                                            <FormField control={vForm.control} name="payment_term" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Payment Terms</FormLabel>
                                                    <FormControl>
                                                        <MultiPaymentTermInput
                                                            value={field.value}
                                                            onChange={field.onChange}
                                                            options={masterSheet?.paymentTerms}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <FormField control={vForm.control} name="phone" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Phone (Optional)</FormLabel>
                                                    <FormControl><Input {...field} placeholder="+91 XXXXX XXXXX" /></FormControl>
                                                </FormItem>
                                            )} />
                                            <FormField control={vForm.control} name="vendor_address" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Vendor Address</FormLabel>
                                                    <FormControl><Input {...field} placeholder="e.g., Plot No. 45, Industrial Area, Phase-I" /></FormControl>
                                                </FormItem>
                                            )} />
                                            <FormField control={vForm.control} name="location" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Location (Optional)</FormLabel>
                                                    <FormControl><Input {...field} placeholder="e.g., New Delhi" /></FormControl>
                                                </FormItem>
                                            )} />
                                            <FormField control={vForm.control} name="responsible_person" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Responsible Person</FormLabel>
                                                    <FormControl><Input {...field} placeholder="e.g., Mr. Rajesh Kumar" /></FormControl>
                                                </FormItem>
                                            )} />
                                            <Button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-700 text-sm sm:text-base py-2 sm:py-3 mt-2">{isSubmitting ? <><Loader2 size={16} className="animate-spin mr-2" />Saving...</> : 'Save Vendor'}</Button>
                                        </form>
                                    </Form>
                                )}
                                {openDialog === 'contractor' && (
                                    <Form {...conForm}>
                                        <form className="grid gap-4" onSubmit={conForm.handleSubmit(v => onSubmit(v, 'contractor'), onInvalid)}>
                                            <ProjectSelectorField control={conForm.control} allFirms={masterSheet?.firms || []} />
                                            <FormField control={conForm.control} name="contractor_name" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Contractor Name</FormLabel>
                                                    <FormControl><Input {...field} placeholder="e.g., John Doe" /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <FormField control={conForm.control} name="contractor_gstin" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>GSTIN</FormLabel>
                                                    <FormControl><Input {...field} placeholder="e.g., 22AAAAA0000A1Z5" /></FormControl>
                                                </FormItem>
                                            )} />
                                            <FormField control={conForm.control} name="contractor_email" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Email</FormLabel>
                                                    <FormControl><Input {...field} placeholder="e.g., contractor@example.com" /></FormControl>
                                                </FormItem>
                                            )} />
                                            <FormField control={conForm.control} name="phone" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Phone (Optional)</FormLabel>
                                                    <FormControl><Input {...field} placeholder="+91 XXXXX XXXXX" /></FormControl>
                                                </FormItem>
                                            )} />
                                            <FormField control={conForm.control} name="contractor_address" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Contractor Address</FormLabel>
                                                    <FormControl><Input {...field} placeholder="e.g., 123 Main St" /></FormControl>
                                                </FormItem>
                                            )} />
                                            <FormField control={conForm.control} name="location" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Location (Optional)</FormLabel>
                                                    <FormControl><Input {...field} placeholder="e.g., New York" /></FormControl>
                                                </FormItem>
                                            )} />
                                            <FormField control={conForm.control} name="responsible_person" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Responsible Person</FormLabel>
                                                    <FormControl><Input {...field} placeholder="e.g., Jane Doe" /></FormControl>
                                                </FormItem>
                                            )} />
                                            <Button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-700 text-sm sm:text-base py-2 sm:py-3 mt-2">{isSubmitting ? <><Loader2 size={16} className="animate-spin mr-2" />Saving...</> : 'Save Contractor'}</Button>
                                        </form>
                                    </Form>
                                )}
                                {openDialog === 'site_location' && (
                                    <Form {...slForm}>
                                        <form className="grid gap-4" onSubmit={slForm.handleSubmit(v => onSubmit(v, 'site_location'), onInvalid)}>
                                            <ProjectSelectorField control={slForm.control} allFirms={masterSheet?.firms || []} />
                                            <FormField control={slForm.control} name="location" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Location</FormLabel>
                                                    <FormControl><Input {...field} placeholder="e.g., Sector 15, Gurgaon" /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <Button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-700 text-sm sm:text-base py-2 sm:py-3 mt-2">{isSubmitting ? <><Loader2 size={16} className="animate-spin mr-2" />Saving...</> : 'Save Location'}</Button>
                                        </form>
                                    </Form>
                                )}
                                {openDialog === 'item' && (
                                    <Form {...iForm}>
                                        <form className="grid gap-4" onSubmit={iForm.handleSubmit(v => onSubmit(v, 'item'), onInvalid)}>
                                            <ProjectSelectorField control={iForm.control} allFirms={masterSheet?.firms || []} />
                                            <FormField control={iForm.control} name="item_name" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Item Name</FormLabel>
                                                    <FormControl><Input {...field} placeholder="Enter item name..." /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormField control={iForm.control} name="group_head" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Group Head</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger className="w-full">
                                                                    <SelectValue placeholder="Select Group Head" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {Array.from(new Set(masterSheet?.allGroupHeads || [])).map((gh) => (
                                                                    <SelectItem key={gh} value={gh}>{gh}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                                <FormField control={iForm.control} name="uom" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>UOM</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger className="w-full">
                                                                    <SelectValue placeholder="Select UOM" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {Array.from(new Set(masterSheet?.uoms || [])).map((uom) => (
                                                                    <SelectItem key={uom} value={uom}>{uom}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                            </div>
                                            <div className="space-y-6 border rounded-xl p-4 sm:p-6 bg-muted/20 border-border/60">
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <FormLabel className="text-base font-bold text-indigo-700 dark:text-indigo-400">Regular Payment Conditions</FormLabel>
                                                        <Button type="button" variant="outline" size="sm" onClick={() => regAppend({ value: '' })} className="h-7 px-2 text-xs gap-1 border-indigo-200 hover:bg-indigo-50 dark:border-indigo-900/50"><Plus size={12} /> Add</Button>
                                                    </div>
                                                    <div className="space-y-3">
                                                        {regFields.map((field, index) => (
                                                            <div key={field.id} className="flex gap-2 items-center group animate-in slide-in-from-left-2 duration-200">
                                                                <div className="bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center shrink-0">{index + 1}</div>
                                                                <FormField control={iForm.control} name={`regular_conditions.${index}.value` as any} render={({ field }) => (
                                                                    <div className="flex-1 shrink-0"><Input {...field} placeholder="" className="h-9 text-sm" /></div>
                                                                )} />
                                                                <Button type="button" variant="ghost" size="icon" onClick={() => regRemove(index)} className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"><X size={14} /></Button>
                                                            </div>
                                                        ))}
                                                        {regFields.length === 0 && <p className="text-xs text-muted-foreground italic pl-7">No regular conditions added</p>}
                                                    </div>
                                                </div>

                                                <div className="h-px bg-border/40" />

                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <FormLabel className="text-base font-bold text-emerald-700 dark:text-emerald-400">Third Party Conditions</FormLabel>
                                                        <Button type="button" variant="outline" size="sm" onClick={() => tpAppend({ value: '' })} className="h-7 px-2 text-xs gap-1 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-900/50"><Plus size={12} /> Add</Button>
                                                    </div>
                                                    <div className="space-y-3">
                                                        {tpFields.map((field, index) => (
                                                            <div key={field.id} className="flex gap-2 items-center group animate-in slide-in-from-left-2 duration-200">
                                                                <div className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center shrink-0">{index + 1}</div>
                                                                <FormField control={iForm.control} name={`third_party_conditions.${index}.value` as any} render={({ field }) => (
                                                                    <div className="flex-1 shrink-0"><Input {...field} placeholder="" className="h-9 text-sm" /></div>
                                                                )} />
                                                                <Button type="button" variant="ghost" size="icon" onClick={() => tpRemove(index)} className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"><X size={14} /></Button>
                                                            </div>
                                                        ))}
                                                        {tpFields.length === 0 && <p className="text-xs text-muted-foreground italic pl-7">No third party conditions added</p>}
                                                    </div>
                                                </div>
                                            </div>
                                            <FormField control={iForm.control} name="include_in_inventory" render={({ field }) => (
                                                <FormItem className="flex flex-row items-start gap-3 rounded-xl border p-4">
                                                    <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} /></FormControl>
                                                    <div className="space-y-1 leading-none">
                                                        <FormLabel>Add to Inventory</FormLabel>
                                                        <p className="text-sm text-muted-foreground">Include this item in stock immediately after saving.</p>
                                                    </div>
                                                </FormItem>
                                            )} />
                                            {includeInInventory && (
                                                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                                    <FormField control={iForm.control} name="inventory_quantity" render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Opening Quantity {currentOpeningQty !== null && `(${currentOpeningQty})`}</FormLabel>
                                                            <FormControl><Input type="number" min={0} {...field} onChange={(e) => field.onChange(e.target.value)} /></FormControl>
                                                            {currentOpeningQty !== null && (
                                                                <p className="text-[11px] text-muted-foreground">
                                                                    Entered quantity will be added to the current {currentOpeningQty}.
                                                                </p>
                                                            )}
                                                            <FormMessage />
                                                        </FormItem>
                                                    )} />
                                                </div>
                                            )}
                                            <Button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-sm sm:text-base py-2 sm:py-3 mt-2">{isSubmitting ? <><Loader2 size={16} className="animate-spin mr-2" />Saving...</> : 'Save Item'}</Button>
                                        </form>
                                    </Form>
                                )}
                                {openDialog === 'ghuom' && (
                                    <Form {...ghUomForm}>
                                        <form className="grid gap-4 m-5" onSubmit={ghUomForm.handleSubmit(v => onSubmit(v, 'ghuom'), onInvalid)}>
                                            <ProjectSelectorField control={ghUomForm.control} allFirms={masterSheet?.firms || []} />
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <FormField control={ghUomForm.control} name="group_head" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Group Head</FormLabel>
                                                        <FormControl><Input {...field} placeholder="e.g., Electrical" /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                                <FormField control={ghUomForm.control} name="uom" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>UOM Name</FormLabel>
                                                        <FormControl><Input {...field} placeholder="e.g., NOS" /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                            </div>
                                            <Button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-sm sm:text-base py-2 sm:py-3 mt-2">{isSubmitting ? <><Loader2 size={16} className="animate-spin mr-2" />Saving...</> : 'Save Record'}</Button>
                                        </form>
                                    </Form>
                                )}
                                {openDialog === 'project' && (
                                    <Form {...pForm}>
                                        <form className="grid gap-4 p-5" onSubmit={pForm.handleSubmit(v => onSubmit(v, 'project'), onInvalid)}>
                                            <FormField control={pForm.control} name="firm_name" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Project Name</FormLabel>
                                                    <FormControl><Input {...field} placeholder="e.g., Project Raipur Phase 2" /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <FormField control={pForm.control} name="destination_address" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Destination Address</FormLabel>
                                                    <FormControl><Input {...field} placeholder="Enter destination address" /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <Button type="submit" disabled={isSubmitting} className="w-full bg-purple-600 hover:bg-purple-700 text-sm sm:text-base py-2 sm:py-3 mt-2">{isSubmitting ? <><Loader2 size={16} className="animate-spin mr-2" />Saving...</> : 'Save Project'}</Button>
                                        </form>
                                    </Form>
                                )}
                                {openDialog === 'gh' && (
                                    <Form {...ghForm}>
                                        <form className="grid gap-4 p-5" onSubmit={ghForm.handleSubmit(v => onSubmit(v, 'gh'), onInvalid)}>
                                            <ProjectSelectorField control={ghForm.control} allFirms={masterSheet?.firms || []} />
                                            <FormField control={ghForm.control} name="group_head" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Group Head</FormLabel>
                                                    <FormControl><Input {...field} placeholder="e.g., Electrical" /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <Button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-sm sm:text-base py-2 sm:py-3 mt-2">{isSubmitting ? <><Loader2 size={16} className="animate-spin mr-2" />Saving...</> : 'Save Group Head'}</Button>
                                        </form>
                                    </Form>
                                )}
                                {openDialog === 'uom' && (
                                    <Form {...uomForm}>
                                        <form className="grid gap-4 p-5" onSubmit={uomForm.handleSubmit(v => onSubmit(v, 'uom'), onInvalid)}>
                                            <ProjectSelectorField control={uomForm.control} allFirms={masterSheet?.firms || []} />
                                            <FormField control={uomForm.control} name="uom" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>UOM Name</FormLabel>
                                                    <FormControl><Input {...field} placeholder="e.g., NOS" /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <Button type="submit" disabled={isSubmitting} className="w-full bg-emerald-600 hover:bg-emerald-700 text-sm sm:text-base py-2 sm:py-3 mt-2">{isSubmitting ? <><Loader2 size={16} className="animate-spin mr-2" />Saving...</> : 'Save UOM'}</Button>
                                        </form>
                                    </Form>
                                )}
                                {openDialog === 'areaofuse' && (
                                    <Form {...aouForm}>
                                        <form className="grid gap-4 p-5" onSubmit={aouForm.handleSubmit(v => onSubmit(v, 'areaofuse'), onInvalid)}>
                                            <ProjectSelectorField control={aouForm.control} allFirms={masterSheet?.firms || []} />
                                            <FormField control={aouForm.control} name="area_of_use" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Area of Use</FormLabel>
                                                    <FormControl><Input {...field} placeholder="e.g., Site Office" /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <Button type="submit" disabled={isSubmitting} className="w-full bg-red-600 hover:bg-red-700 text-sm sm:text-base py-2 sm:py-3 mt-2">{isSubmitting ? <><Loader2 size={16} className="animate-spin mr-2" />Saving...</> : 'Save Area of Use'}</Button>
                                        </form>
                                    </Form>
                                )}
                                {openDialog === 'company' && (
                                    <Form {...cForm}>
                                        <form className="grid gap-6" onSubmit={cForm.handleSubmit(v => onSubmit(v, 'company'), onInvalid)}>
                                            <FormField control={cForm.control} name="company_name" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Company Name</FormLabel>
                                                    <FormControl><Input {...field} placeholder="e.g., Pooja Constructions Pvt Ltd" /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                                <FormField control={cForm.control} name="company_gstin" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>GSTIN</FormLabel>
                                                        <FormControl><Input {...field} placeholder="e.g., 22AAAAA0000A1Z5" /></FormControl>
                                                    </FormItem>
                                                )} />
                                                <FormField control={cForm.control} name="company_pan" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>PAN</FormLabel>
                                                        <FormControl><Input {...field} placeholder="e.g., ABCDE1234F" /></FormControl>
                                                    </FormItem>
                                                )} />
                                                <FormField control={cForm.control} name="company_contact_person" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Company Contact Person</FormLabel>
                                                        <FormControl><Input {...field} placeholder="e.g., John Doe" /></FormControl>
                                                    </FormItem>
                                                )} />
                                                <FormField control={cForm.control} name="company_email" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Email</FormLabel>
                                                        <FormControl><Input {...field} placeholder="e.g., info@company.com" /></FormControl>
                                                    </FormItem>
                                                )} />
                                                <FormField control={cForm.control} name="company_phone" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Phone</FormLabel>
                                                        <FormControl><Input {...field} placeholder="e.g., +91 99999 00000" /></FormControl>
                                                    </FormItem>
                                                )} />
                                                <FormField control={cForm.control} name="company_address" render={({ field }) => (
                                                    <FormItem className="sm:col-span-1">
                                                        <FormLabel>Address</FormLabel>
                                                        <FormControl><Input {...field} placeholder="e.g., 123 Business Park, Sector 5..." /></FormControl>
                                                    </FormItem>
                                                )} />
                                                <FormField control={cForm.control} name="billing_address" render={({ field }) => (
                                                    <FormItem className="sm:col-span-1">
                                                        <FormLabel>Billing Address</FormLabel>
                                                        <FormControl><Input {...field} placeholder="e.g., Same as above or specify billing office" /></FormControl>
                                                    </FormItem>
                                                )} />
                                                <FormField control={cForm.control} name="destination_address" render={({ field }) => (
                                                    <FormItem className="sm:col-span-1">
                                                        <FormLabel>Destination Address</FormLabel>
                                                        <FormControl><Input {...field} placeholder="e.g., Site Office, Raipur Project" /></FormControl>
                                                    </FormItem>
                                                )} />
                                            </div>
                                            <Button type="submit" disabled={isSubmitting} className="w-full bg-emerald-600 hover:bg-emerald-700 text-sm sm:text-base py-2 sm:py-3 mt-2">{isSubmitting ? <><Loader2 size={16} className="animate-spin mr-2" />Saving...</> : 'Save Company'}</Button>
                                        </form>
                                    </Form>
                                )}
                                {openDialog === 'terms_condition' && (
                                    <Form {...tcForm}>
                                        <form className="grid gap-4 p-5" onSubmit={tcForm.handleSubmit(v => onSubmit(v, 'terms_condition'), onInvalid)}>
                                            <FormField control={tcForm.control} name="title" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Heading</FormLabel>
                                                    <FormControl><Input {...field} placeholder="e.g., Payment Terms" /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <FormField control={tcForm.control} name="name" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Condition Text</FormLabel>
                                                    <FormControl><Input {...field} placeholder="e.g., Payment within 30 days of invoice" /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <Button type="submit" disabled={isSubmitting} className="w-full bg-teal-600 hover:bg-teal-700 text-sm sm:text-base py-2 sm:py-3 mt-2">{isSubmitting ? <><Loader2 size={16} className="animate-spin mr-2" />Saving...</> : 'Save Condition'}</Button>
                                        </form>
                                    </Form>
                                )}
                                {openDialog === 'site_engineer' && (
                                    <Form {...seForm}>
                                        <form className="grid gap-4 p-5" onSubmit={seForm.handleSubmit(v => onSubmit(v, 'site_engineer'), onInvalid)}>
                                            <ProjectSelectorField control={seForm.control} allFirms={masterSheet?.firms || []} />
                                            <FormField control={seForm.control} name="name" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Engineer Name</FormLabel>
                                                    <FormControl><Input {...field} placeholder="e.g., John Smith" /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <FormField control={seForm.control} name="number" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Phone Number</FormLabel>
                                                    <FormControl><Input {...field} placeholder="e.g., +91 9876543210" /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <FormField control={seForm.control} name="email" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Email Address</FormLabel>
                                                    <FormControl><Input {...field} placeholder="e.g., john@example.com" /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <Button type="submit" disabled={isSubmitting} className="w-full bg-orange-600 hover:bg-orange-700 text-sm sm:text-base py-2 sm:py-3 mt-2">{isSubmitting ? <><Loader2 size={16} className="animate-spin mr-2" />Saving...</> : 'Save Engineer Details'}</Button>
                                        </form>
                                    </Form>
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

