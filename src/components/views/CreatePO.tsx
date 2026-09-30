import { ChevronsRightLeft, FilePlus2, Pencil, Save, Trash, Eye, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { z } from 'zod';
import { Button } from '../ui/button';
import { SidebarTrigger } from '../ui/sidebar';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel } from '../ui/form';
import type { PoMasterSheet } from '@/types';
import { uploadFile } from '@/lib/fetchers';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
    calculateGrandTotal,
    calculateSubtotal,
    calculateTotal,
    calculateTotalGst,
    cn,
    formatDate,
    formatDateTime,
    parseCustomDate,
} from '@/lib/utils';
import { toast } from 'sonner';
import { useSheets } from '@/context/SheetsContext';
import { ClipLoader as Loader } from 'react-spinners';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '../ui/textarea';
import { pdf } from '@react-pdf/renderer';
import POPdf, { type POPdfProps } from '../element/POPdf';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '../ui/dialog';
import { PDFViewer } from '@react-pdf/renderer';
import {
    fetchIndents,
    fetchPoMaster,
    fetchMasterData,
    insertPoRecords,
    updateIndentsAfterPoCreation,
    createPOWithQueue,
    fetchNextPoNumber,
} from '@/services/poService';
import { upsertSiteEngineer, fetchTermsAndConditions } from '@/services/masterService';
import { emailApi } from '@/lib/apiClient';

function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const dataUrl = reader.result as string;
            const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

function getFinancialYear(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed, April is 3

    let startYear, endYear;
    if (month >= 3) {
        // April to December
        startYear = year;
        endYear = year + 1;
    } else {
        // January to March
        startYear = year - 1;
        endYear = year;
    }

    return `${startYear.toString().slice(-2)}-${endYear.toString().slice(-2)}`;
}

function generatePoNumber(poNumbers: string[]): string {
    const financialYear = getFinancialYear();
    const newPrefix = `${financialYear}/`;
    const oldPrefix = `STORE-PO-${financialYear}-`;

    if (!poNumbers || poNumbers.length === 0) {
        return `${newPrefix}01`;
    }

    // Extract all numbers for the current financial year
    const existingNumbers = poNumbers
        .filter((po) => po && typeof po === 'string' && po.trim() !== '')
        .map((po) => {
            const poStr = po.trim();

            // 1. Check for new format: YY-YY/NN or YY-YY/NN-RR
            if (poStr.startsWith(newPrefix)) {
                const afterPrefix = poStr.replace(newPrefix, '').trim();
                const baseNumberPart = afterPrefix.split('-')[0]; // Get the NN part
                const num = parseInt(baseNumberPart, 10);
                return isNaN(num) ? 0 : num;
            }

            // 2. Check for old format: STORE-PO-YY-YY-NN
            if (poStr.startsWith(oldPrefix)) {
                const afterPrefix = poStr.replace(oldPrefix, '').trim();
                const baseNumberPart = afterPrefix.split('-')[0]; // Get the NN part
                const num = parseInt(baseNumberPart, 10);
                return isNaN(num) ? 0 : num;
            }

            return 0;
        })
        .filter((n) => n > 0);

    // Find highest number and add 1
    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    const nextNumber = maxNumber + 1;

    // Pad with leading zero if less than 10
    const nextNumberStr = nextNumber.toString().padStart(2, '0');
    return `${newPrefix}${nextNumberStr}`;
}

function incrementPoRevision(poNumber: string, allPOs: any[]): string {
    // poNumber could be like 25-26/01 or 25-26/01-01
    const parts = poNumber.split('/');
    if (parts.length < 2) return poNumber; // Fallback for legacy format if needed

    const fyPart = parts[0]; // YY-YY
    const rest = parts[1]; // NN or NN-RR

    const baseNumber = rest.split('-')[0]; // NN
    const basePo = `${fyPart}/${baseNumber}`;

    // Find all POs that belong to this base number
    const allPoNumbers = allPOs
        .filter(
            (po: any) => po.poNumber && typeof po.poNumber === 'string' && po.poNumber.trim() !== ''
        )
        .map((po: any) => po.poNumber.trim());

    const relatedPos = allPoNumbers.filter((num) => num === basePo || num.startsWith(basePo + '-'));

    // Extract existing revision suffixes
    const revisionNumbers = relatedPos.map((num) => {
        if (num === basePo) return 0;
        const suffixPart = num.replace(basePo + '-', '');
        const n = parseInt(suffixPart, 10);
        return isNaN(n) ? 0 : n;
    });

    const maxRevision = revisionNumbers.length > 0 ? Math.max(...revisionNumbers) : 0;
    const nextRevision = maxRevision + 1;

    const nextRevisionStr = nextRevision.toString().padStart(2, '0');
    return `${basePo}-${nextRevisionStr}`;
}

function filterUniquePoNumbers(data: any[]): any[] {
    const seen = new Set<string>();
    const result: any[] = [];

    for (const po of data) {
        if (!seen.has(po.poNumber)) {
            seen.add(po.poNumber);
            result.push(po);
        }
    }

    return result;
}

const cleanAddress = (addr: string) => {
    if (!addr) return '';
    return addr.replace(/^Project\s+Name,\s*/i, '').trim();
};

interface IndentSheetItem {
    planned4?: string;
    actual4?: string;
    id?: number;
    approvedVendorName?: string | number; // ✅ Allow both string and number
    firmName?: string;
    firmNameMatch?: string;
    firm_id?: number;
    indentNumber?: string;
    productName?: string;
    specifications?: string;
    taxValue1?: string | number;
    taxValue4?: string | number;
    approvedQuantity?: number;
    indentQuantity?: number;
    uom?: string;
    approvedRate?: number;
    quotationNumber?: string;
    quotationDate?: string;
    approvedPaymentTerm?: string;
    approvedAdvancePercent?: string;
    vendorType?: string;
    poRequired?: string;
}

interface MasterDetails {
    destinationAddress: string;
    defaultTerms: string[];
    vendors: {
        vendorName: string;
        gstin: string;
        address: string;
        vendorEmail: string;
        personName?: string;
        email?: string;
        phone?: string;
    }[];
    items: {
        itemName: string;
        regularConditions: string[];
        thirdPartyConditions: string[];
    }[];
    firmCompanyMap: Record<
        string,
        {
            companyName: string;
            companyAddress: string;
            destinationAddress: string;
            companyGstin: string;
            companyPan: string;
            billingAddress?: string;
            companyContactPerson?: string;
        }
    >;
    companyName: string;
    companyPhone: string;
    companyGstin: string;
    companyPan: string;
    companyEmail: string;
    companyAddress: string;
    billingAddress: string;
    companyContactPerson: string;
    paymentTerms: string[];
    siteEngineers: { id: number; name: string; number: string; email: string }[];
}

const schema = z.object({
    poNumber: z.string().nonempty(),
    poDate: z.coerce.date(),
    supplierName: z.string().nonempty(),
    supplierAddress: z.string().nonempty(),
    gstin: z.string().optional(),
    companyEmail: z.union([z.string().email(), z.literal('')]).optional(),

    ourEnqNo: z.string().optional(),
    enquiryDate: z.union([z.coerce.date(), z.any().transform(() => undefined)]).optional(),
    description: z.string().optional(),
    indents: z.array(
        z.object({
            id: z.union([z.number(), z.string(), z.any()]).optional(),
            indentNumber: z.string().optional(),
            quotationNumber: z.string().optional(),
            productName: z.string().optional(),
            specifications: z.string().optional(),
            gst: z.coerce.number().optional(),
            discount: z.coerce.number().default(0).optional(),
            quantity: z.coerce.number().optional(),
            unit: z.string().optional(),
            rate: z.coerce.number().optional(),
            paymentTerm: z.string().optional(),
            numberOfDays: z.coerce.number().optional(),
        })
    ),
    terms: z.array(z.string()).optional(),
    deliveryDate: z.coerce.date(),
    deliveryDays: z.coerce.number().optional(),
    deliveryType: z.enum(['for', 'exfactory']).optional(),
    siteEngineerName: z.string().min(1, 'Site Incharge Details 1 Name is required'),
    siteEngineerEmail: z.string().min(1, 'Site Incharge Details 1 Email is required'),
    siteEngineerPhoneNo: z.string().min(1, 'Site Incharge Details 1 Phone is required'),
    siteEngineerName2: z.string().optional(),
    siteEngineerEmail2: z.string().optional(),
    siteEngineerPhoneNo2: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const normalize = (str: any) => {
    if (!str) return '';
    if (typeof str !== 'string') return String(str).trim().toLowerCase();
    return str.trim().toLowerCase();
};

import { useProject } from '@/context/ProjectContext';

const CreatePO = () => {
    const { user } = useAuth();
    const { effectivePermittedFirms } = useProject();
    const { updateMasterSheet, updateAll } = useSheets();

    // Supabase state
    const [indentSheet, setIndentSheet] = useState<IndentSheetItem[]>([]);
    const [poMasterSheet, setPoMasterSheet] = useState<any[]>([]);
    const [details, setDetails] = useState<MasterDetails | null>(null);
    const [dataLoading, setDataLoading] = useState(false);

    const [readOnly, setReadOnly] = useState(-1);
    const [mode, setMode] = useState<'create' | 'revise'>('create');
    const [isEditingDestination, setIsEditingDestination] = useState(false);
    const [destinationAddress, setDestinationAddress] = useState('');
    const [firmCompanyName, setFirmCompanyName] = useState('Project Name');
    const [firmCompanyAddress, setFirmCompanyAddress] = useState(
        'Shri Ram Business Park , Block - C, 2nd floor , Room No. 212'
    );
    const [firmCompanyGstin, setFirmCompanyGstin] = useState('');
    const [firmCompanyPan, setFirmCompanyPan] = useState('');
    const [currentProjectName, setCurrentProjectName] = useState('Project Name');
    const [showPreview, setShowPreview] = useState(false);
    const [previewData, setPreviewData] = useState<POPdfProps | null>(null);
    const [masterTerms, setMasterTerms] = useState<{ id: number; title: string; name: string }[]>(
        []
    );
    const [localTerms, setLocalTerms] = useState<{ id: number; title: string; name: string }[]>([]);
    const [editingTerm, setEditingTerm] = useState<{
        id: number;
        title: string;
        name: string;
    } | null>(null);
    const [showAddTerm, setShowAddTerm] = useState(false);
    const [newTerm, setNewTerm] = useState({ title: '', name: '' });

    // Fetch all data from REST API on mount
    const loadData = useCallback(async () => {
        try {
            setDataLoading(true);
            const permittedFirms = effectivePermittedFirms;
            const [indents, poMaster, masterData] = await Promise.all([
                fetchIndents(permittedFirms),
                fetchPoMaster(permittedFirms),
                fetchMasterData(),
            ]);

            setIndentSheet(indents);
            setPoMasterSheet(poMaster);

            if (!masterData || (!masterData.vendors?.length && !masterData.items?.length)) {
                setDetails({
                    destinationAddress: '',
                    defaultTerms: [],
                    vendors: [],
                    items: [],
                    firmCompanyMap: {},
                    companyName: '',
                    companyPhone: '',
                    companyGstin: '',
                    companyPan: '',
                    companyEmail: '',
                    companyAddress: '',
                    billingAddress: '',
                    companyContactPerson: '',
                    paymentTerms: [],
                    siteEngineers: [],
                } as MasterDetails);
            } else {
                setDetails(masterData as any);
            }
        } catch (error) {
            console.error('Error loading data:', error);
            toast.error('Failed to load data');
        } finally {
            setDataLoading(false);
        }
    }, [user?.username, effectivePermittedFirms]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        fetchTermsAndConditions()
            .then((data) => {
                setMasterTerms(data);
                setLocalTerms(data);
            })
            .catch(() => {});
    }, []);

    const handleEngineerSave = async () => {
        const name = form.getValues('siteEngineerName');
        const number = form.getValues('siteEngineerPhoneNo');
        const email = form.getValues('siteEngineerEmail');

        if (!name || !number || !email) {
            toast.error('Please fill all engineer details');
            return;
        }

        try {
            const res = await upsertSiteEngineer({ name, number, email });
            if (res.success) {
                toast.success('Engineer saved');
                loadData(); // Refresh local state
                updateMasterSheet(); // Sync other components
            } else {
                toast.error('Failed to save engineer');
            }
        } catch (error) {
            console.error('Error saving engineer:', error);
            toast.error('Error saving engineer');
        }
    };

    const handleEngineerSave2 = async () => {
        const name = form.getValues('siteEngineerName2');
        const number = form.getValues('siteEngineerPhoneNo2');
        const email = form.getValues('siteEngineerEmail2');

        if (!name || !number || !email) {
            toast.error('Please fill all engineer 2 details');
            return;
        }

        try {
            const res = await upsertSiteEngineer({ name, number, email });
            if (res.success) {
                toast.success('Engineer 2 saved');
                loadData(); // Refresh local state
                updateMasterSheet(); // Sync other components
            } else {
                toast.error('Failed to save engineer');
            }
        } catch (error) {
            console.error('Error saving engineer:', error);
            toast.error('Error saving engineer');
        }
    };

    useEffect(() => {
        if (details && (details as any).destinationAddress) {
            setDestinationAddress(cleanAddress((details as any).destinationAddress));
        }
    }, [details]);
    const form = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            poNumber: '',
            poDate: new Date(),
            supplierName: '',
            supplierAddress: '',
            gstin: '',
            companyEmail: '',
            ourEnqNo: '',
            enquiryDate: undefined as any,
            deliveryDate: new Date(),
            deliveryDays: undefined,
            deliveryType: undefined,
            description: '',
            indents: [],
            siteEngineerName: '',
            siteEngineerEmail: '',
            siteEngineerPhoneNo: '',
            siteEngineerName2: '',
            siteEngineerEmail2: '',
            siteEngineerPhoneNo2: '',
        },
    });

    const indents = form.watch('indents');
    const vendor = form.watch('supplierName');
    const poDate = form.watch('poDate');
    const poNumber = form.watch('poNumber');

    const termsArray = useFieldArray({
        control: form.control,
        name: 'terms' as any,
    });

    const itemsArray = useFieldArray({
        control: form.control,
        name: 'indents' as any,
    });

    const existingPoCompoundKeys = useMemo(() => {
        return new Set(
            (poMasterSheet || [])
                .map((p: any) => {
                    const code = String(p.internalCode || p.internal_code || '').trim();
                    const product = String(p.product || '').trim();
                    const party = String(p.partyName || p.party_name || '').trim();
                    return `${code}_${product}_${party}`;
                })
                .filter((k) => k !== '__')
        );
    }, [poMasterSheet]);

    // Vendor selection effect for CREATE mode
    useEffect(() => {
        if (!vendor || mode !== 'create') return;

        const normalize = (str: any) => {
            if (!str) return '';
            if (typeof str !== 'string') return String(str).trim().toLowerCase();
            return str.trim().toLowerCase();
        };

        const selectedVendor = (details as MasterDetails)?.vendors?.find(
            (v) => normalize(v.vendorName) === normalize(vendor)
        );

        const matchingIndents = indentSheet.filter((i: IndentSheetItem) => {
            const vendorName = i.approvedVendorName;
            const hasVendor =
                vendorName &&
                (typeof vendorName === 'string' || typeof vendorName === 'number') &&
                String(vendorName).trim() !== '';
            const normalizedVendorName = normalize(vendorName);
            const normalizedSelectedVendor = normalize(vendor);

            const hasPoNumber =
                Boolean((i as any).poNumber && String((i as any).poNumber).trim() !== '') ||
                Boolean((i as any).po_number && String((i as any).po_number).trim() !== '');
            const isManagementDone =
                i.actual4 !== '' ||
                i.planned4 !== '' ||
                (i as any).po_requred === 'Yes' ||
                i.poRequired === 'Yes' ||
                !!vendorName;

            return (
                hasVendor &&
                isManagementDone &&
                !hasPoNumber &&
                normalizedVendorName === normalizedSelectedVendor
            );
        });

        if (selectedVendor) {
            form.setValue(
                'supplierAddress',
                selectedVendor.address || (matchingIndents[0] as any)?.supplierAddress || '',
                { shouldValidate: true }
            );
            form.setValue(
                'gstin',
                selectedVendor.gstin || (matchingIndents[0] as any)?.supplierGstin || '',
                { shouldValidate: true }
            );
            form.setValue(
                'companyEmail',
                selectedVendor.vendorEmail || (matchingIndents[0] as any)?.companyEmail || '',
                { shouldValidate: true }
            );
        } else if (matchingIndents.length > 0) {
            form.setValue('supplierAddress', (matchingIndents[0] as any)?.supplierAddress || '', {
                shouldValidate: true,
            });
            form.setValue('gstin', (matchingIndents[0] as any)?.supplierGstin || '', {
                shouldValidate: true,
            });
            form.setValue('companyEmail', (matchingIndents[0] as any)?.companyEmail || '', {
                shouldValidate: true,
            });
        } else {
            console.warn('⚠️ Vendor details not found in master list or indents:', vendor);
            form.setValue('supplierAddress', '', { shouldValidate: true });
            form.setValue('gstin', '', { shouldValidate: true });
            form.setValue('companyEmail', '', { shouldValidate: true });
        }

        const firmName = matchingIndents[0]?.firmNameMatch || matchingIndents[0]?.firmName || '';
        setCurrentProjectName(firmName || 'Project Name');

        if (firmName && (details as MasterDetails)?.firmCompanyMap) {
            const firmKey = Object.keys((details as MasterDetails).firmCompanyMap!).find(
                (key) => normalize(key) === normalize(firmName)
            );

            const companyDetails = firmKey
                ? (details as MasterDetails).firmCompanyMap![firmKey]
                : null;

            const compName =
                companyDetails?.companyName ||
                (details as MasterDetails)?.companyName ||
                firmName ||
                'Project Name';
            const compAddr =
                companyDetails?.billingAddress ||
                companyDetails?.companyAddress ||
                (details as MasterDetails)?.billingAddress ||
                (details as MasterDetails)?.companyAddress ||
                '';
            const compGstin =
                companyDetails?.companyGstin || (details as MasterDetails)?.companyGstin || '';
            const compPan =
                companyDetails?.companyPan || (details as MasterDetails)?.companyPan || '';

            setFirmCompanyName(compName);
            setFirmCompanyAddress(cleanAddress(compAddr));
            setFirmCompanyGstin(compGstin);
            setFirmCompanyPan(compPan);

            if (companyDetails) {
                setDestinationAddress(
                    cleanAddress(
                        companyDetails.destinationAddress ||
                            (matchingIndents[0] as any)?.destinationAddress ||
                            (matchingIndents[0] as any)?.destination_address ||
                            ''
                    )
                );
            } else {
                setDestinationAddress(
                    cleanAddress(
                        (matchingIndents[0] as any)?.destinationAddress ||
                            (matchingIndents[0] as any)?.destination_address ||
                            ''
                    )
                );
            }
        }

        form.setValue(
            'indents',
            matchingIndents.map((i: IndentSheetItem) => {
                let gstValue = 0;

                if (i.taxValue1 && !isNaN(Number(i.taxValue1)) && Number(i.taxValue1) > 0) {
                    gstValue = Number(i.taxValue1);
                } else if (i.taxValue4 && !isNaN(Number(i.taxValue4)) && Number(i.taxValue4) > 0) {
                    gstValue = Number(i.taxValue4);
                }

                return {
                    id: i.id as number,
                    indentNumber: i.indentNumber || '',
                    quotationNumber: i.quotationNumber || '',
                    productName: i.productName || '',
                    specifications: i.specifications || '',
                    gst: gstValue || 18,
                    discount: 0,
                    quantity: i.approvedQuantity || i.indentQuantity || 0,
                    unit: i.uom || '',
                    rate: i.approvedRate || 0,
                    paymentTerm: i.approvedPaymentTerm || '',
                    numberOfDays: Number(i.approvedAdvancePercent) || 0,
                };
            })
        );

        if (mode === 'create' && matchingIndents.length > 0) {
            const rawDelivery =
                (matchingIndents[0] as any)?.deliveryDate ||
                (matchingIndents[0] as any)?.delivery_date ||
                (matchingIndents[0] as any)?.expected_req_date ||
                (matchingIndents[0] as any)?.expectedReqDate;
            if (rawDelivery) {
                const parsedDel = parseCustomDate(rawDelivery);
                if (!isNaN(parsedDel.getTime())) {
                    form.setValue('deliveryDate', parsedDel);
                }
            }
        }

        setTimeout(() => form.trigger(['supplierAddress', 'gstin']), 100);
    }, [vendor, details, indentSheet, poMasterSheet, mode, form]);

    // Mode change effect
    useEffect(() => {
        let isMounted = true;
        if (mode === 'revise') {
            form.reset({
                poNumber: '',
                poDate: new Date(),
                supplierName: '',
                supplierAddress: '',
                gstin: '',
                companyEmail: '',
                enquiryDate: undefined as any,
                indents: [],
                terms: [],
                deliveryDate: new Date(),
                deliveryDays: undefined,
                deliveryType: undefined,
                description: '',
            });
        } else {
            const poNumbers = (poMasterSheet || [])
                .map((p) => p.poNumber)
                .filter((po) => po && po.trim() !== '');
            const fallbackPoNumber =
                poNumbers.length > 0 ? generatePoNumber(poNumbers) : `${getFinancialYear()}/01`;

            form.reset({
                poNumber: fallbackPoNumber,
                poDate: new Date(),
                supplierName: '',
                supplierAddress: '',
                gstin: '',
                companyEmail: '',
                ourEnqNo: '',
                enquiryDate: undefined as any,
                indents: [],
                terms: [],
                deliveryDate: new Date(),
                deliveryDays: undefined,
                deliveryType: undefined,
                description: '',
            });

            // Fetch the authoritative latest sequence number from server
            fetchNextPoNumber()
                .then((serverPo) => {
                    if (isMounted && serverPo && mode === 'create') {
                        form.setValue('poNumber', serverPo);
                    }
                })
                .catch(() => {});
        }

        return () => {
            isMounted = false;
        };
    }, [mode, poMasterSheet, details, form]);

    // REVISE MODE - Load PO data when PO number is selected
    useEffect(() => {
        if (mode === 'revise' && poNumber && poNumber.trim() !== '') {
            const poItems = poMasterSheet.filter((p) => p.poNumber === poNumber);
            if (poItems.length > 0) {
                const firstPoItem = poItems[0];
                const vendor = (details as MasterDetails)?.vendors?.find((v) => {
                    const vendorName = v.vendorName?.toLowerCase()?.trim();
                    const partyName = firstPoItem.partyName?.toLowerCase()?.trim();
                    return vendorName === partyName;
                });
                const poDateParsed = parseCustomDate(firstPoItem.timestamp);
                form.setValue('poDate', isNaN(poDateParsed.getTime()) ? new Date() : poDateParsed);
                form.setValue('supplierName', firstPoItem.partyName || '');

                if (vendor) {
                    form.setValue(
                        'supplierAddress',
                        firstPoItem.supplierAddress || vendor.address || ''
                    );
                    form.setValue('gstin', firstPoItem.supplierGstin || vendor.gstin || '');
                    form.setValue(
                        'companyEmail',
                        firstPoItem.companyEmail || vendor.vendorEmail || ''
                    );
                } else {
                    form.setValue('supplierAddress', firstPoItem.supplierAddress || '');
                    form.setValue('gstin', firstPoItem.supplierGstin || '');
                    form.setValue('companyEmail', firstPoItem.companyEmail || '');
                }

                form.setValue('ourEnqNo', firstPoItem.enquiryNumber || '');
                const enqDate = parseCustomDate(firstPoItem.enquiryDate);
                form.setValue(
                    'enquiryDate',
                    isNaN(enqDate.getTime()) ? (undefined as any) : enqDate
                );
                const delDate = parseCustomDate(firstPoItem.deliveryDate);
                form.setValue('deliveryDate', isNaN(delDate.getTime()) ? new Date() : delDate);
                form.setValue('deliveryDays', firstPoItem.deliveryDays || 0);
                form.setValue(
                    'deliveryType',
                    firstPoItem.deliveryType === 'for' || firstPoItem.deliveryType === 'exfactory'
                        ? firstPoItem.deliveryType
                        : undefined
                );

                const poIndents = poItems.map((poItem) => {
                    const originalIndent = indentSheet.find(
                        (i) =>
                            i.indentNumber === poItem.internalCode &&
                            i.productName === poItem.product
                    );
                    return {
                        id: originalIndent?.id || 0,
                        indentNumber: poItem.internalCode || '',
                        quotationNumber: poItem.quotationNumber || '',
                        productName: poItem.product || '',
                        specifications: poItem.description || '',
                        gst: poItem.gstPercent || 18,
                        discount: poItem.discountPercent || 0,
                        quantity: poItem.quantity || 0,
                        unit: poItem.unit || '',
                        rate: poItem.rate || 0,
                        paymentTerm: poItem.paymentTerms || '',
                        numberOfDays: poItem.numberOfDays || 0,
                    };
                });
                form.setValue('indents', poIndents);

                const terms: string[] = [];
                // 1. Fetch from Term 1, 2, 3... legacy columns
                for (let i = 1; i <= 20; i++) {
                    const termKey = `term${i}` as keyof PoMasterSheet;
                    const term = firstPoItem[termKey] as string;
                    if (term && typeof term === 'string' && term.trim() !== '') {
                        terms.push(term.trim());
                    }
                }

                // 2. Also fetch from the JSONB 'terms' column
                if (firstPoItem.terms && typeof firstPoItem.terms === 'object') {
                    Object.keys(firstPoItem.terms).forEach((key) => {
                        const val = (firstPoItem.terms as any)[key];
                        if (
                            val &&
                            typeof val === 'string' &&
                            val.trim() !== '' &&
                            !terms.includes(val.trim())
                        ) {
                            terms.push(val.trim());
                        }
                    });
                }

                form.setValue('terms', terms);

                // Update Commercial Details for Revise Mode
                const firmName =
                    firstPoItem.firmNameMatch || poIndents[0]?.indentNumber.split('/')[0] || '';
                setCurrentProjectName(firmName || 'Project Name');

                if (firmName && (details as MasterDetails).firmCompanyMap) {
                    const normalize = (str: any) => {
                        if (!str) return '';
                        if (typeof str !== 'string') return String(str).trim().toLowerCase();
                        return str.trim().toLowerCase();
                    };

                    const firmKey = Object.keys((details as MasterDetails).firmCompanyMap!).find(
                        (key) => normalize(key) === normalize(firmName)
                    );

                    const companyDetails = firmKey
                        ? (details as MasterDetails).firmCompanyMap![firmKey]
                        : null;

                    const compName =
                        companyDetails?.companyName ||
                        (details as MasterDetails)?.companyName ||
                        firmName ||
                        'Project Name';
                    const compAddr =
                        companyDetails?.billingAddress ||
                        companyDetails?.companyAddress ||
                        (details as MasterDetails)?.billingAddress ||
                        (details as MasterDetails)?.companyAddress ||
                        '';
                    const compGstin =
                        companyDetails?.companyGstin ||
                        (details as MasterDetails)?.companyGstin ||
                        '';
                    const compPan =
                        companyDetails?.companyPan || (details as MasterDetails)?.companyPan || '';

                    setFirmCompanyName(compName);
                    setFirmCompanyAddress(cleanAddress(compAddr));
                    setFirmCompanyGstin(compGstin);
                    setFirmCompanyPan(compPan);

                    if (companyDetails) {
                        setDestinationAddress(
                            cleanAddress(
                                firstPoItem.destinationAddress ||
                                    companyDetails.destinationAddress ||
                                    (firstPoItem as any)?.destination_address ||
                                    ''
                            )
                        );
                    } else {
                        setDestinationAddress(
                            cleanAddress(
                                firstPoItem.destinationAddress ||
                                    (firstPoItem as any)?.destination_address ||
                                    ''
                            )
                        );
                    }
                }

                // Populate Site Incharge Details in Revise Mode
                form.setValue(
                    'siteEngineerName',
                    firstPoItem.siteEngineerName || (firstPoItem as any).site_engineer_name || ''
                );
                form.setValue(
                    'siteEngineerEmail',
                    firstPoItem.siteEngineerEmail || (firstPoItem as any).site_engineer_email || ''
                );
                form.setValue(
                    'siteEngineerPhoneNo',
                    firstPoItem.siteEngineerPhoneNo ||
                        (firstPoItem as any).site_engineer_phoneNo ||
                        ''
                );
                form.setValue(
                    'siteEngineerName2',
                    firstPoItem.siteEngineerName2 || (firstPoItem as any).site_engineer_name_2 || ''
                );
                form.setValue(
                    'siteEngineerEmail2',
                    firstPoItem.siteEngineerEmail2 ||
                        (firstPoItem as any).site_engineer_email_2 ||
                        ''
                );
                form.setValue(
                    'siteEngineerPhoneNo2',
                    firstPoItem.siteEngineerPhoneNo2 ||
                        (firstPoItem as any).site_engineer_phoneNo_2 ||
                        ''
                );
            }
        }
    }, [poNumber, mode, poMasterSheet, details, indentSheet, form]);

    // Auto-populate Site Incharge Details
    const watchedSiteEngineerName = form.watch('siteEngineerName');
    useEffect(() => {
        if (!watchedSiteEngineerName || !details?.siteEngineers) return;

        const engineer = details.siteEngineers.find(
            (e) => e.name.toLowerCase().trim() === watchedSiteEngineerName.toLowerCase().trim()
        );

        if (engineer) {
            const currentPhone = form.getValues('siteEngineerPhoneNo');
            const currentEmail = form.getValues('siteEngineerEmail');

            if (currentPhone !== engineer.number) {
                form.setValue('siteEngineerPhoneNo', engineer.number, { shouldDirty: true });
            }
            if (currentEmail !== engineer.email) {
                form.setValue('siteEngineerEmail', engineer.email, { shouldDirty: true });
            }
        }
    }, [watchedSiteEngineerName, details?.siteEngineers, form]);

    const handleDestinationEdit = () => setIsEditingDestination(true);
    const handleDestinationSave = () => {
        setIsEditingDestination(false);
        toast.success('Destination address updated');
    };
    const handleDestinationCancel = () => {
        const firmKey =
            currentProjectName && (details as MasterDetails)?.firmCompanyMap
                ? Object.keys((details as MasterDetails).firmCompanyMap!).find(
                      (k) => normalize(k) === normalize(currentProjectName)
                  )
                : undefined;
        const companyDetails = firmKey ? (details as MasterDetails).firmCompanyMap![firmKey] : null;
        setDestinationAddress(
            companyDetails?.destinationAddress ||
                (details as MasterDetails)?.destinationAddress ||
                ''
        );
        setIsEditingDestination(false);
    };

    const getLogoBase64 = async (): Promise<string> => {
        try {
            const res = await fetch(window.location.origin + '/logo.png');
            if (res.ok) {
                const blob = await res.blob();
                return await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve((reader.result as string) || '/logo.png');
                    reader.readAsDataURL(blob);
                });
            }
        } catch (e) {
            console.warn('Could not convert logo to base64:', e);
        }
        return '/logo.png';
    };

    async function generatePreviewData(): Promise<POPdfProps> {
        const values = form.getValues();

        const mappedItems = values.indents.map((indent) => ({
            quantity: indent.quantity || 0,
            rate: indent.rate || 0,
            discountPercent: indent.discount || 0,
            gstPercent: indent.gst || 0,
        }));
        const grandTotal = calculateGrandTotal(mappedItems);
        const subtotal = calculateSubtotal(mappedItems);
        const totalGst = calculateTotalGst(mappedItems);

        const selectedVendor = details?.vendors?.find((v) => v.vendorName === values.supplierName);
        const projectName = currentProjectName;

        // Parse terms from form values
        const userTerms = values.terms || [];
        const parsedTerms = [
            ...userTerms.map((text, index) => ({
                num: (index + 1).toString(),
                text: text,
            })),
            ...localTerms.map((t, index) => ({
                num: (userTerms.length + index + 1).toString(),
                text: `${t.title}: ${t.name}`,
            })),
        ];

        return {
            companyName: firmCompanyName,
            companyAddress: firmCompanyAddress,
            companyPhone: details?.companyPhone || '',
            companyEmail: details?.companyEmail || '',
            companyGstin: firmCompanyGstin,
            companyPan: firmCompanyPan,
            companyContactPerson: details?.companyContactPerson || '',
            supplierName: values.supplierName,
            supplierAddress: values.supplierAddress,
            supplierGstin: values.gstin || '',
            supplierContactPerson: selectedVendor?.personName || '',
            supplierPhone: selectedVendor?.phone || '',
            supplierEmail: values.companyEmail || '',
            poNumber:
                mode === 'create'
                    ? values.poNumber
                    : incrementPoRevision(values.poNumber, poMasterSheet),
            poDate: formatDate(values.poDate),
            deliveryDate: formatDate(values.deliveryDate),
            projectName: projectName,
            deliveryAddress: destinationAddress,
            deliveryContactPerson: '', // Could be dynamic if we knew where to get it
            deliveryPhone: '',
            deliveryEmail: '',
            siteEngineerName: values.siteEngineerName || '',
            siteEngineerEmail: values.siteEngineerEmail || '',
            siteEngineerPhoneNo: values.siteEngineerPhoneNo || '',
            siteEngineerName2: values.siteEngineerName2 || '',
            siteEngineerEmail2: values.siteEngineerEmail2 || '',
            siteEngineerPhoneNo2: values.siteEngineerPhoneNo2 || '',
            subtotal,
            totalGst,
            items: values.indents.map((item) => {
                const indent = indentSheet.find((i: IndentSheetItem) => i.id === item.id);
                return {
                    internalCode: item.indentNumber || indent?.indentNumber || '',
                    quotationNo: item.quotationNumber || indent?.quotationNumber || '',
                    product: item.productName || indent?.productName || '',
                    paymentTerm: item.paymentTerm || '',
                    qty: item.quantity || 0,
                    unit: item.unit || '',
                    rate: item.rate || 0,
                    gst: item.gst || 0,
                    discount: item.discount || 0,
                    amount: calculateTotal(
                        item.rate || 0,
                        item.gst || 0,
                        item.discount || 0,
                        item.quantity || 0
                    ),
                };
            }),
            totalAmount: grandTotal,
            terms: parsedTerms,
            logo: await getLogoBase64(),
        };
    }

    async function handlePreview() {
        try {
            const data = await generatePreviewData();
            setPreviewData(data);
            setShowPreview(true);
        } catch (error) {
            console.error('Preview error:', error);
            toast.error('Failed to generate preview');
        }
    }

    async function onSubmit(values: FormData) {
        try {
            const initialPoNumber =
                mode === 'create'
                    ? values.poNumber
                    : incrementPoRevision(values.poNumber, poMasterSheet);
            const mappedItems = values.indents.map((indent) => ({
                quantity: indent.quantity || 0,
                rate: indent.rate || 0,
                discountPercent: indent.discount || 0,
                gstPercent: indent.gst || 0,
            }));
            const grandTotal = calculateGrandTotal(mappedItems);
            const subtotal = calculateSubtotal(mappedItems);
            const totalGst = calculateTotalGst(mappedItems);

            const logoBase64 = await getLogoBase64();
            const normalizeVendorStr = (s: any) =>
                String(s || '')
                    .trim()
                    .toLowerCase();
            const selectedVendor = details?.vendors?.find(
                (v) => normalizeVendorStr(v.vendorName) === normalizeVendorStr(values.supplierName)
            );
            const projectName = currentProjectName;

            const userTerms = values.terms || [];
            const parsedTerms = [
                ...userTerms.map((text, index) => ({
                    num: (index + 1).toString(),
                    text: text,
                })),
                ...localTerms.map((t, index) => ({
                    num: (userTerms.length + index + 1).toString(),
                    text: `${t.title}: ${t.name}`,
                })),
            ];

            const missingFirmId = values.indents.some((v) => {
                const indent = indentSheet.find(
                    (i: IndentSheetItem) => i.indentNumber === v.indentNumber
                );
                return !indent?.firm_id;
            });
            if (missingFirmId) {
                toast.error('Project ID is required to create a PO');
                return;
            }

            const combinedTerms = [
                ...userTerms,
                ...localTerms.map((t) => `${t.title}: ${t.name}`),
            ].filter(Boolean);

            const safePoDateStr =
                values.poDate instanceof Date && !isNaN(values.poDate.getTime())
                    ? values.poDate.toISOString()
                    : values.poDate
                      ? parseCustomDate(values.poDate).toISOString()
                      : new Date().toISOString();

            const formattedPoCreatedDate = values.poDate
                ? formatDate(values.poDate)
                : formatDate(new Date());

            const rows: PoMasterSheet[] = values.indents.map((v) => {
                const indent = indentSheet.find(
                    (i: IndentSheetItem) => i.indentNumber === v.indentNumber
                );

                return {
                    discountPercent: v.discount || 0,
                    gstPercent: v.gst || 0,
                    timestamp: safePoDateStr,
                    po_created_date: formattedPoCreatedDate,
                    partyName: values.supplierName,
                    poNumber: initialPoNumber,
                    internalCode: v.indentNumber || '',
                    product: v.productName || indent?.productName || '',
                    description: values.description || '',
                    quantity: v.quantity || 0,
                    unit: v.unit || '',
                    rate: v.rate || 0,
                    gst: v.gst || 0,
                    companyEmail: values.companyEmail || '',
                    discount: v.discount || 0,
                    amount: calculateTotal(
                        v.rate || 0,
                        v.gst || 0,
                        v.discount || 0,
                        v.quantity || 0
                    ),
                    totalPoAmount: grandTotal,
                    pdf: '',
                    quotationNumber: v.quotationNumber || '',
                    quotationDate: '',
                    enquiryNumber: values.ourEnqNo || '',
                    enquiryDate: values.enquiryDate ? formatDateTime(values.enquiryDate) : '',
                    terms: JSON.stringify(combinedTerms),
                    deliveryDate: formatDateTime(values.deliveryDate),
                    paymentTerms: v.paymentTerm || '',
                    numberOfDays: v.numberOfDays || 0,
                    deliveryDays: values.deliveryDays || 0,
                    deliveryType: values.deliveryType || '',
                    firmNameMatch: (indent as any)?.firmNameMatch ?? '',
                    firm_id: indent?.firm_id,
                    advancePercent:
                        v.paymentTerm?.toLowerCase().includes('partly') &&
                        (v.paymentTerm?.toLowerCase().includes('advance') ||
                            v.paymentTerm?.toLowerCase().includes('pi'))
                            ? v.numberOfDays || 0
                            : 0,
                    advanceAmount:
                        v.paymentTerm?.toLowerCase().includes('partly') &&
                        (v.paymentTerm?.toLowerCase().includes('advance') ||
                            v.paymentTerm?.toLowerCase().includes('pi'))
                            ? (calculateTotal(
                                  v.rate || 0,
                                  v.gst || 0,
                                  v.discount || 0,
                                  v.quantity || 0
                              ) *
                                  (v.numberOfDays || 0)) /
                              100
                            : 0,
                    destinationAddress: destinationAddress,
                    supplierAddress: values.supplierAddress || selectedVendor?.address || '',
                    supplierGstin: values.gstin || selectedVendor?.gstin || '',
                    siteEngineerName: values.siteEngineerName || '',
                    siteEngineerEmail: values.siteEngineerEmail || '',
                    siteEngineerPhoneNo: values.siteEngineerPhoneNo || '',
                    siteEngineerName2: values.siteEngineerName2 || '',
                    siteEngineerEmail2: values.siteEngineerEmail2 || '',
                    siteEngineerPhoneNo2: values.siteEngineerPhoneNo2 || '',
                };
            });

            // Submit to the server-side FIFO queue for atomic sequence assignment & creation
            const indentIds = values.indents.map((v) => v.id).filter((id) => id > 0);
            const databaseDeliveryDate = values.deliveryDate.toISOString();

            const createResult = await createPOWithQueue({
                mode,
                poNumber: initialPoNumber,
                poDate: values.poDate,
                rows,
                indentIds,
                deliveryDate: databaseDeliveryDate,
                actualDate: safePoDateStr,
            });

            const finalPoNumber = createResult.poNumber;

            if (createResult.wasReassigned) {
                toast.info(
                    `Assigned next PO number in queue: ${finalPoNumber} (${initialPoNumber} was taken by another user)`,
                    { duration: 7000 }
                );
            }

            // Build PDF props with the final authoritative PO number
            const pdfProps: POPdfProps = {
                companyName: firmCompanyName,
                companyAddress: firmCompanyAddress,
                companyPhone: details?.companyPhone || '',
                companyEmail: details?.companyEmail || '',
                companyGstin: firmCompanyGstin,
                companyPan: firmCompanyPan,
                companyContactPerson: details?.companyContactPerson || '',
                supplierName: values.supplierName,
                supplierAddress: values.supplierAddress || selectedVendor?.address || '',
                supplierGstin: values.gstin || selectedVendor?.gstin || '',
                supplierContactPerson: selectedVendor?.personName || '',
                supplierPhone: selectedVendor?.phone || '',
                supplierEmail: values.companyEmail || '',
                poNumber: finalPoNumber,
                poDate: formatDate(values.poDate),
                deliveryDate: formatDate(values.deliveryDate),
                projectName: projectName,
                deliveryAddress: destinationAddress,
                deliveryContactPerson: '',
                deliveryPhone: '',
                deliveryEmail: '',
                siteEngineerName: values.siteEngineerName || '',
                siteEngineerEmail: values.siteEngineerEmail || '',
                siteEngineerPhoneNo: values.siteEngineerPhoneNo || '',
                siteEngineerName2: values.siteEngineerName2 || '',
                siteEngineerEmail2: values.siteEngineerEmail2 || '',
                siteEngineerPhoneNo2: values.siteEngineerPhoneNo2 || '',
                subtotal,
                totalGst,
                items: values.indents.map((item) => {
                    const indent = indentSheet.find((i: IndentSheetItem) => i.id === item.id);
                    return {
                        internalCode: item.indentNumber || indent?.indentNumber || '',
                        quotationNo: item.quotationNumber || indent?.quotationNumber || '',
                        product: item.productName || indent?.productName || '',
                        paymentTerm: item.paymentTerm || '',
                        qty: item.quantity || 0,
                        unit: item.unit || '',
                        rate: item.rate || 0,
                        gst: item.gst || 0,
                        discount: item.discount || 0,
                        amount: calculateTotal(
                            item.rate || 0,
                            item.gst || 0,
                            item.discount || 0,
                            item.quantity || 0
                        ),
                    };
                }),
                totalAmount: grandTotal,
                terms: parsedTerms,
                logo: logoBase64 || '/logo.png',
            };

            // Send generated PO PDF via email to selected vendor
            const vendorEmail =
                values.companyEmail || selectedVendor?.vendorEmail || selectedVendor?.email || '';
            if (vendorEmail && vendorEmail.trim() && vendorEmail.includes('@')) {
                try {
                    const blob = await pdf(<POPdf {...pdfProps} />).toBlob();
                    const base64Content = await blobToBase64(blob);

                    const emailSubject = `Purchase Order - ${finalPoNumber}`;
                    const emailHtml = `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                            <h2 style="color: #1e293b;">Purchase Order ${finalPoNumber}</h2>
                            <p>Dear ${values.supplierName},</p>
                            <p>Please find attached the Purchase Order <strong>${finalPoNumber}</strong> from <strong>${firmCompanyName || 'our company'}</strong>.</p>
                            <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
                                <p style="margin: 4px 0;"><strong>PO Number:</strong> ${finalPoNumber}</p>
                                <p style="margin: 4px 0;"><strong>PO Date:</strong> ${formatDate(values.poDate)}</p>
                                <p style="margin: 4px 0;"><strong>Delivery Date:</strong> ${formatDate(values.deliveryDate)}</p>
                                <p style="margin: 4px 0;"><strong>Total Amount:</strong> ₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                            </div>
                            <p>If you have any questions, please contact our Site Engineer: <strong>${values.siteEngineerName}</strong> (${values.siteEngineerPhoneNo}, ${values.siteEngineerEmail}).</p>
                            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                            <p style="font-size: 12px; color: #94a3b8;">This is an automated Purchase Order email.</p>
                        </div>
                    `;

                    await emailApi.sendEmail({
                        to: vendorEmail.trim(),
                        subject: emailSubject,
                        html: emailHtml,
                        attachments: [
                            {
                                filename: `PO-${finalPoNumber.replace(/\//g, '_')}.pdf`,
                                content: base64Content,
                            },
                        ],
                    });
                    toast.success(`Purchase Order saved and emailed to ${vendorEmail.trim()}`);
                } catch (emailErr: any) {
                    console.error('Failed to send PO email to vendor:', emailErr);
                    toast.warning(
                        `PO saved successfully, but email sending failed: ${emailErr?.message || 'Check email service'}`
                    );
                }
            } else {
                toast.success(`Successfully ${mode}d purchase order ${finalPoNumber}`);
            }

            form.reset();

            // Refresh data using loadData()
            await loadData();
            updateAll(true);

            // Fetch latest sequence number for the next entry
            try {
                const nextPo = await fetchNextPoNumber();
                if (nextPo && mode === 'create') {
                    form.setValue('poNumber', nextPo);
                }
            } catch {
                // Ignore
            }
        } catch (e) {
            console.error('Failed to submit PO:', e);
            toast.error(`Failed to ${mode} purchase order`);
        }
    }

    function onError(errors: any) {
        console.error('Form validation errors:', errors);
        const errorFields = Object.keys(errors);
        toast.error(`Please check form fields: ${errorFields.join(', ')}`);
    }

    return (
        <div className="grid place-items-center w-full bg-gradient-to-br from-blue-100 via-purple-50 to-blue-50 rounded-md">
            <div className="flex justify-between p-5 w-full">
                <div className="flex gap-2 items-center">
                    {/* <FilePlus2 size={50} className="text-primary" /> */}
                    <div>
                        <h1 className="text-2xl font-bold text-primary"></h1>
                        <p className="text-muted-foreground text-sm">
                            {/* Create purchase order for indents or revise previous orders */}
                        </p>
                    </div>
                </div>
                <SidebarTrigger />
            </div>
            <div className="w-full max-w-6xl px-2 sm:px-4 py-2">
                <div className="w-full">
                    <Tabs
                        defaultValue="create"
                        onValueChange={(v) => setMode(v === 'create' ? v : 'revise')}
                    >
                        <TabsList className="h-10 w-full rounded-none">
                            <TabsTrigger value="create">Create</TabsTrigger>
                            <TabsTrigger value="revise">Revise</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit, onError)}
                        className="flex flex-col items-center w-full"
                    >
                        <div className="space-y-4 p-3 sm:p-6 w-full max-w-full overflow-hidden bg-white shadow-md rounded-sm">
                            {/* Header Section */}
                            <div className="flex flex-col items-center justify-center gap-1 bg-blue-50/80 p-3 sm:p-4 rounded-md text-center w-full">
                                <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-foreground">
                                    {details?.companyName || 'Pooja Constructions'}
                                </h1>
                                <div className="space-y-0.5">
                                    <p className="text-xs sm:text-sm text-muted-foreground leading-normal max-w-2xl">
                                        Address: {details?.companyAddress || ''}
                                    </p>
                                    <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                                        Phone No: {details?.companyPhone || ''}{' '}
                                    </p>
                                </div>
                            </div>
                            <hr />
                            <h2 className="text-center font-bold text-lg">Purchase Order</h2>
                            <hr />

                            {/* Form Fields */}
                            <div className="grid gap-4 sm:gap-5 px-1 sm:px-4 py-2 text-foreground/80">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
                                    <FormField
                                        control={form.control}
                                        name="poNumber"
                                        render={({ field }) => (
                                            <FormItem>
                                                {mode === 'create' ? (
                                                    <>
                                                        <FormLabel>PO Number</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                className="h-9"
                                                                readOnly
                                                                placeholder="Enter PO number"
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                    </>
                                                ) : (
                                                    <FormControl>
                                                        <Select
                                                            onValueChange={field.onChange}
                                                            value={field.value || ''}
                                                        >
                                                            <FormLabel>PO Number</FormLabel>
                                                            <FormControl>
                                                                <SelectTrigger
                                                                    size="sm"
                                                                    className="w-full"
                                                                >
                                                                    <SelectValue placeholder="Select PO" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {filterUniquePoNumbers(
                                                                    poMasterSheet
                                                                )
                                                                    .filter(
                                                                        (i) =>
                                                                            i.poNumber &&
                                                                            i.poNumber.trim() !== ''
                                                                    )
                                                                    .map((i, k) => (
                                                                        <SelectItem
                                                                            key={k}
                                                                            value={i.poNumber}
                                                                        >
                                                                            {i.poNumber}
                                                                        </SelectItem>
                                                                    ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </FormControl>
                                                )}
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="poDate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>PO Date</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        className="h-9"
                                                        type="date"
                                                        value={
                                                            field.value &&
                                                            !isNaN(field.value.getTime())
                                                                ? field.value
                                                                      .toISOString()
                                                                      .split('T')[0]
                                                                : ''
                                                        }
                                                        onChange={(e) =>
                                                            field.onChange(
                                                                e.target.value
                                                                    ? new Date(e.target.value)
                                                                    : undefined
                                                            )
                                                        }
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5">
                                    <FormField
                                        control={form.control}
                                        name="supplierName"
                                        render={({ field }) => (
                                            <FormItem>
                                                {mode === 'create' ? (
                                                    <FormControl>
                                                        <Select
                                                            onValueChange={field.onChange}
                                                            value={field.value || ''}
                                                        >
                                                            <FormLabel>Supplier Name</FormLabel>
                                                            <FormControl>
                                                                <SelectTrigger
                                                                    size="sm"
                                                                    className="w-full"
                                                                >
                                                                    <SelectValue placeholder="Select supplier" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {(() => {
                                                                    const pendingApprovedVendors =
                                                                        Array.from(
                                                                            new Set(
                                                                                indentSheet
                                                                                    .filter(
                                                                                        (
                                                                                            i: IndentSheetItem
                                                                                        ) => {
                                                                                            const vendorName =
                                                                                                i.approvedVendorName;
                                                                                            const hasVendor =
                                                                                                vendorName &&
                                                                                                String(
                                                                                                    vendorName
                                                                                                ).trim() !==
                                                                                                    '';
                                                                                            const hasPoNumber =
                                                                                                Boolean(
                                                                                                    (
                                                                                                        i as any
                                                                                                    )
                                                                                                        .poNumber &&
                                                                                                    String(
                                                                                                        (
                                                                                                            i as any
                                                                                                        )
                                                                                                            .poNumber
                                                                                                    ).trim() !==
                                                                                                        ''
                                                                                                ) ||
                                                                                                Boolean(
                                                                                                    (
                                                                                                        i as any
                                                                                                    )
                                                                                                        .po_number &&
                                                                                                    String(
                                                                                                        (
                                                                                                            i as any
                                                                                                        )
                                                                                                            .po_number
                                                                                                    ).trim() !==
                                                                                                        ''
                                                                                                );
                                                                                            const isManagementDone =
                                                                                                i.actual4 !==
                                                                                                    '' ||
                                                                                                i.planned4 !==
                                                                                                    '' ||
                                                                                                (
                                                                                                    i as any
                                                                                                )
                                                                                                    .po_requred ===
                                                                                                    'Yes' ||
                                                                                                i.poRequired ===
                                                                                                    'Yes' ||
                                                                                                !!vendorName;
                                                                                            return (
                                                                                                hasVendor &&
                                                                                                isManagementDone &&
                                                                                                !hasPoNumber
                                                                                            );
                                                                                        }
                                                                                    )
                                                                                    .map((i) =>
                                                                                        String(
                                                                                            i.approvedVendorName
                                                                                        ).trim()
                                                                                    )
                                                                            )
                                                                        );

                                                                    if (
                                                                        pendingApprovedVendors.length ===
                                                                        0
                                                                    ) {
                                                                        return (
                                                                            <SelectItem
                                                                                value="none"
                                                                                disabled
                                                                            >
                                                                                No pending suppliers
                                                                                available
                                                                            </SelectItem>
                                                                        );
                                                                    }

                                                                    return pendingApprovedVendors.map(
                                                                        (vendorName, k) => (
                                                                            <SelectItem
                                                                                key={k}
                                                                                value={vendorName}
                                                                            >
                                                                                {vendorName}
                                                                            </SelectItem>
                                                                        )
                                                                    );
                                                                })()}
                                                            </SelectContent>
                                                        </Select>
                                                    </FormControl>
                                                ) : (
                                                    <>
                                                        <FormLabel>Supplier Name</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                className="h-9"
                                                                readOnly
                                                                placeholder="Enter supplier name"
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                    </>
                                                )}
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5">
                                    {/* Supplier Address - Changed to always be editable */}
                                    <FormField
                                        control={form.control}
                                        name="supplierAddress"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Supplier Address</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        className="h-9"
                                                        readOnly={false}
                                                        placeholder="Enter supplier address"
                                                        {...field}
                                                        value={field.value || ''}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    {/* GSTIN - Changed to always be editable */}
                                    <FormField
                                        control={form.control}
                                        name="gstin"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>GSTIN</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        className="h-9"
                                                        readOnly={false}
                                                        placeholder="Enter GSTIN"
                                                        {...field}
                                                        value={field.value || ''}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    {/* Company Email - Changed to always be editable */}
                                    <FormField
                                        control={form.control}
                                        name="companyEmail"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Company Email</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        className="h-9"
                                                        type="email"
                                                        readOnly={false}
                                                        placeholder="Enter company email"
                                                        {...field}
                                                        value={field.value || ''}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5">
                                    <FormField
                                        control={form.control}
                                        name="deliveryDate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Delivery Date</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        className="h-9"
                                                        type="date"
                                                        value={
                                                            field.value &&
                                                            !isNaN(field.value.getTime())
                                                                ? field.value
                                                                      .toISOString()
                                                                      .split('T')[0]
                                                                : ''
                                                        }
                                                        onChange={(e) =>
                                                            field.onChange(
                                                                e.target.value
                                                                    ? new Date(e.target.value)
                                                                    : undefined
                                                            )
                                                        }
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <hr />

                            {/* Commercial Details Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                                <Card className="p-0 gap-0 shadow-xs rounded-[3px]">
                                    <CardHeader className="bg-muted px-4 py-1.5">
                                        <CardTitle className="text-center truncate text-[12px]">
                                            Project Name
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-3 text-sm flex items-center justify-center min-h-[70px]">
                                        <p className="text-[14px] font-bold text-center leading-tight text-gray-700">
                                            {currentProjectName}
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card className="p-0 gap-0 shadow-xs rounded-[3px]">
                                    <CardHeader className="bg-muted px-4 py-1.5">
                                        <CardTitle className="text-center flex items-center justify-between text-[12px]">
                                            Delivery Address
                                            {vendor && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={
                                                        isEditingDestination
                                                            ? handleDestinationSave
                                                            : handleDestinationEdit
                                                    }
                                                    className="h-5 w-5 p-0 hover:bg-gray-200"
                                                >
                                                    {isEditingDestination ? (
                                                        <Save
                                                            size={12}
                                                            className="text-green-600"
                                                        />
                                                    ) : (
                                                        <Pencil
                                                            size={12}
                                                            className="text-gray-600"
                                                        />
                                                    )}
                                                </Button>
                                            )}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-3 text-[12px]">
                                        {vendor ? (
                                            <>
                                                {isEditingDestination ? (
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Input
                                                            value={destinationAddress}
                                                            onChange={(e) =>
                                                                setDestinationAddress(
                                                                    e.target.value
                                                                )
                                                            }
                                                            className="h-7 text-sm"
                                                            placeholder="Enter destination address"
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    handleDestinationSave();
                                                                } else if (e.key === 'Escape') {
                                                                    handleDestinationCancel();
                                                                }
                                                            }}
                                                            autoFocus
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={handleDestinationCancel}
                                                            className="h-6 w-6 p-0 hover:bg-red-100"
                                                        >
                                                            <Trash
                                                                size={12}
                                                                className="text-red-500"
                                                            />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <p>{destinationAddress}</p>
                                                )}
                                            </>
                                        ) : (
                                            <p className="text-gray-400 text-center">
                                                Select Supplier
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Card 3: Site Incharge Details 1 */}
                                <Card className="p-0 gap-0 shadow-xs rounded-[3px]">
                                    <CardHeader className="bg-muted px-4 py-1.5">
                                        <CardTitle className="text-center flex items-center justify-between text-[12px]">
                                            <span>
                                                Site Incharge Details 1{' '}
                                                <span className="text-red-500">*</span>
                                            </span>
                                            {mode === 'create' && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={handleEngineerSave}
                                                    className="h-5 w-5 p-0 hover:bg-gray-200"
                                                >
                                                    <Save size={12} className="text-blue-600" />
                                                </Button>
                                            )}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-3 space-y-1">
                                        {/* Name Field */}
                                        <FormField
                                            control={form.control}
                                            name="siteEngineerName"
                                            render={({ field }) => (
                                                <FormItem className="flex items-center gap-2 space-y-0">
                                                    <FormLabel className="w-14 text-[10px] font-bold text-gray-500 uppercase shrink-0">
                                                        Name <span className="text-red-500">*</span>
                                                    </FormLabel>
                                                    <FormControl>
                                                        <div className="flex-1">
                                                            <Input
                                                                {...field}
                                                                className="h-7 text-[11px]"
                                                                placeholder="Enter Name"
                                                                list="siteEngineerNameList"
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    field.onChange(val);
                                                                    const eng =
                                                                        details?.siteEngineers.find(
                                                                            (e) =>
                                                                                e.name
                                                                                    .toLowerCase()
                                                                                    .trim() ===
                                                                                val
                                                                                    .toLowerCase()
                                                                                    .trim()
                                                                        );
                                                                    if (eng) {
                                                                        form.setValue(
                                                                            'siteEngineerPhoneNo',
                                                                            eng.number
                                                                        );
                                                                        form.setValue(
                                                                            'siteEngineerEmail',
                                                                            eng.email
                                                                        );
                                                                    }
                                                                }}
                                                            />
                                                            <datalist id="siteEngineerNameList">
                                                                {(details?.siteEngineers || []).map(
                                                                    (eng) => (
                                                                        <option
                                                                            key={eng.number}
                                                                            value={eng.name}
                                                                        />
                                                                    )
                                                                )}
                                                            </datalist>
                                                        </div>
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />

                                        {/* Phone Field */}
                                        <FormField
                                            control={form.control}
                                            name="siteEngineerPhoneNo"
                                            render={({ field }) => (
                                                <FormItem className="flex items-center gap-2 space-y-0">
                                                    <FormLabel className="w-14 text-[10px] font-bold text-gray-500 uppercase shrink-0">
                                                        Phone{' '}
                                                        <span className="text-red-500">*</span>
                                                    </FormLabel>
                                                    <FormControl>
                                                        <div className="flex-1">
                                                            <Input
                                                                {...field}
                                                                className="h-7 text-[11px]"
                                                                placeholder="Enter Phone"
                                                                list="siteEngineerPhoneList"
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    field.onChange(val);
                                                                    const eng =
                                                                        details?.siteEngineers.find(
                                                                            (e) => e.number === val
                                                                        );
                                                                    if (eng) {
                                                                        form.setValue(
                                                                            'siteEngineerName',
                                                                            eng.name
                                                                        );
                                                                        form.setValue(
                                                                            'siteEngineerEmail',
                                                                            eng.email
                                                                        );
                                                                    }
                                                                }}
                                                            />
                                                            <datalist id="siteEngineerPhoneList">
                                                                {(details?.siteEngineers || []).map(
                                                                    (eng) => (
                                                                        <option
                                                                            key={eng.number}
                                                                            value={eng.number}
                                                                        >
                                                                            {eng.name}
                                                                        </option>
                                                                    )
                                                                )}
                                                            </datalist>
                                                        </div>
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />

                                        {/* Email Field */}
                                        <FormField
                                            control={form.control}
                                            name="siteEngineerEmail"
                                            render={({ field }) => (
                                                <FormItem className="flex items-center gap-2 space-y-0">
                                                    <FormLabel className="w-14 text-[10px] font-bold text-gray-500 uppercase shrink-0">
                                                        Email{' '}
                                                        <span className="text-red-500">*</span>
                                                    </FormLabel>
                                                    <FormControl>
                                                        <div className="flex-1">
                                                            <Input
                                                                {...field}
                                                                className="h-7 text-[11px]"
                                                                placeholder="Enter Email"
                                                                list="siteEngineerEmailList"
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    field.onChange(val);
                                                                    const eng =
                                                                        details?.siteEngineers.find(
                                                                            (e) => e.email === val
                                                                        );
                                                                    if (eng) {
                                                                        form.setValue(
                                                                            'siteEngineerName',
                                                                            eng.name
                                                                        );
                                                                        form.setValue(
                                                                            'siteEngineerPhoneNo',
                                                                            eng.number
                                                                        );
                                                                    }
                                                                }}
                                                            />
                                                            <datalist id="siteEngineerEmailList">
                                                                {(details?.siteEngineers || []).map(
                                                                    (eng) => (
                                                                        <option
                                                                            key={eng.number}
                                                                            value={eng.email}
                                                                        >
                                                                            {eng.name}
                                                                        </option>
                                                                    )
                                                                )}
                                                            </datalist>
                                                        </div>
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </CardContent>
                                </Card>

                                {/* Card 4: Site Incharge Details */}
                                <Card className="p-0 gap-0 shadow-xs rounded-[3px]">
                                    <CardHeader className="bg-muted px-4 py-1.5">
                                        <CardTitle className="text-center flex items-center justify-between text-[12px]">
                                            <span>
                                                Site Incharge Details 2
                                                <span className="text-gray-400 font-normal"></span>
                                            </span>
                                            {mode === 'create' && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={handleEngineerSave2}
                                                    className="h-5 w-5 p-0 hover:bg-gray-200"
                                                >
                                                    <Save size={12} className="text-blue-600" />
                                                </Button>
                                            )}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-3 space-y-1">
                                        {/* Name Field 2 */}
                                        <FormField
                                            control={form.control}
                                            name="siteEngineerName2"
                                            render={({ field }) => (
                                                <FormItem className="flex items-center gap-2 space-y-0">
                                                    <FormLabel className="w-14 text-[10px] font-bold text-gray-500 uppercase shrink-0">
                                                        Name
                                                    </FormLabel>
                                                    <FormControl>
                                                        <div className="flex-1">
                                                            <Input
                                                                {...field}
                                                                className="h-7 text-[11px]"
                                                                placeholder="Enter Name"
                                                                list="siteEngineerName2List"
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    field.onChange(val);
                                                                    const eng =
                                                                        details?.siteEngineers.find(
                                                                            (e) =>
                                                                                e.name
                                                                                    .toLowerCase()
                                                                                    .trim() ===
                                                                                val
                                                                                    .toLowerCase()
                                                                                    .trim()
                                                                        );
                                                                    if (eng) {
                                                                        form.setValue(
                                                                            'siteEngineerPhoneNo2',
                                                                            eng.number
                                                                        );
                                                                        form.setValue(
                                                                            'siteEngineerEmail2',
                                                                            eng.email
                                                                        );
                                                                    }
                                                                }}
                                                            />
                                                            <datalist id="siteEngineerName2List">
                                                                {(details?.siteEngineers || []).map(
                                                                    (eng) => (
                                                                        <option
                                                                            key={eng.number}
                                                                            value={eng.name}
                                                                        />
                                                                    )
                                                                )}
                                                            </datalist>
                                                        </div>
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />

                                        {/* Phone Field 2 */}
                                        <FormField
                                            control={form.control}
                                            name="siteEngineerPhoneNo2"
                                            render={({ field }) => (
                                                <FormItem className="flex items-center gap-2 space-y-0">
                                                    <FormLabel className="w-14 text-[10px] font-bold text-gray-500 uppercase shrink-0">
                                                        Phone
                                                    </FormLabel>
                                                    <FormControl>
                                                        <div className="flex-1">
                                                            <Input
                                                                {...field}
                                                                className="h-7 text-[11px]"
                                                                placeholder="Enter Phone"
                                                                list="siteEngineerPhone2List"
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    field.onChange(val);
                                                                    const eng =
                                                                        details?.siteEngineers.find(
                                                                            (e) => e.number === val
                                                                        );
                                                                    if (eng) {
                                                                        form.setValue(
                                                                            'siteEngineerName2',
                                                                            eng.name
                                                                        );
                                                                        form.setValue(
                                                                            'siteEngineerEmail2',
                                                                            eng.email
                                                                        );
                                                                    }
                                                                }}
                                                            />
                                                            <datalist id="siteEngineerPhone2List">
                                                                {(details?.siteEngineers || []).map(
                                                                    (eng) => (
                                                                        <option
                                                                            key={eng.number}
                                                                            value={eng.number}
                                                                        >
                                                                            {eng.name}
                                                                        </option>
                                                                    )
                                                                )}
                                                            </datalist>
                                                        </div>
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />

                                        {/* Email Field 2 */}
                                        <FormField
                                            control={form.control}
                                            name="siteEngineerEmail2"
                                            render={({ field }) => (
                                                <FormItem className="flex items-center gap-2 space-y-0">
                                                    <FormLabel className="w-14 text-[10px] font-bold text-gray-500 uppercase shrink-0">
                                                        Email
                                                    </FormLabel>
                                                    <FormControl>
                                                        <div className="flex-1">
                                                            <Input
                                                                {...field}
                                                                className="h-7 text-[11px]"
                                                                placeholder="Enter Email"
                                                                list="siteEngineerEmail2List"
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    field.onChange(val);
                                                                    const eng =
                                                                        details?.siteEngineers.find(
                                                                            (e) => e.email === val
                                                                        );
                                                                    if (eng) {
                                                                        form.setValue(
                                                                            'siteEngineerName2',
                                                                            eng.name
                                                                        );
                                                                        form.setValue(
                                                                            'siteEngineerPhoneNo2',
                                                                            eng.number
                                                                        );
                                                                    }
                                                                }}
                                                            />
                                                            <datalist id="siteEngineerEmail2List">
                                                                {(details?.siteEngineers || []).map(
                                                                    (eng) => (
                                                                        <option
                                                                            key={eng.number}
                                                                            value={eng.email}
                                                                        >
                                                                            {eng.name}
                                                                        </option>
                                                                    )
                                                                )}
                                                            </datalist>
                                                        </div>
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </CardContent>
                                </Card>
                            </div>

                            <hr />

                            {/* Description */}
                            <div>
                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Description</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Enter message"
                                                    className="resize-y"
                                                    {...field}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <hr />

                            {/* Items Table */}
                            <div className="w-full px-1 sm:px-4 grid overflow-hidden">
                                <div className="rounded-[3px] w-full max-w-full overflow-x-auto max-h-[400px] overflow-y-auto border">
                                    <Table className="min-w-[650px]">
                                        <TableHeader className="bg-muted">
                                            <TableRow>
                                                <TableHead>S/N</TableHead>
                                                <TableHead>Internal Code</TableHead>
                                                <TableHead>Product</TableHead>
                                                <TableHead>Qty</TableHead>
                                                <TableHead>Unit</TableHead>
                                                <TableHead>Rate</TableHead>
                                                <TableHead>GST (%)</TableHead>
                                                <TableHead>Discount (%)</TableHead>
                                                <TableHead>Amount</TableHead>
                                                <TableHead></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {itemsArray.fields.map((field, index) => {
                                                const formValue = form.watch(`indents.${index}`);
                                                const amount = calculateTotal(
                                                    formValue?.rate || 0,
                                                    formValue?.gst || 0,
                                                    formValue?.discount || 0,
                                                    formValue?.quantity || 0
                                                );

                                                return (
                                                    <TableRow key={field.id}>
                                                        <TableCell>{index + 1}</TableCell>
                                                        <TableCell className="font-medium">
                                                            {formValue?.indentNumber || 'N/A'}
                                                        </TableCell>
                                                        <TableCell>
                                                            {formValue?.productName || 'No Product'}
                                                        </TableCell>
                                                        <TableCell>
                                                            <FormField
                                                                control={form.control}
                                                                name={`indents.${index}.quantity`}
                                                                render={({ field }) => (
                                                                    <FormItem className="flex justify-center">
                                                                        <FormControl>
                                                                            <Input
                                                                                type="number"
                                                                                step="any"
                                                                                className="h-9 w-20 text-center bg-gray-50"
                                                                                value={
                                                                                    field.value || 0
                                                                                }
                                                                                onChange={
                                                                                    field.onChange
                                                                                }
                                                                            />
                                                                        </FormControl>
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <FormField
                                                                control={form.control}
                                                                name={`indents.${index}.unit`}
                                                                render={({ field }) => (
                                                                    <FormItem className="flex justify-center">
                                                                        <FormControl>
                                                                            <Input
                                                                                readOnly
                                                                                className="h-9 w-16 text-center bg-gray-50 cursor-not-allowed"
                                                                                value={
                                                                                    field.value ||
                                                                                    ''
                                                                                }
                                                                                onChange={
                                                                                    field.onChange
                                                                                }
                                                                            />
                                                                        </FormControl>
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <FormField
                                                                control={form.control}
                                                                name={`indents.${index}.rate`}
                                                                render={({ field }) => (
                                                                    <FormItem className="flex justify-center">
                                                                        <FormControl>
                                                                            <Input
                                                                                type="number"
                                                                                step="any"
                                                                                readOnly
                                                                                className="h-9 w-24 text-center bg-gray-50 cursor-not-allowed"
                                                                                value={
                                                                                    field.value || 0
                                                                                }
                                                                                onChange={
                                                                                    field.onChange
                                                                                }
                                                                            />
                                                                        </FormControl>
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <FormField
                                                                control={form.control}
                                                                name={`indents.${index}.gst`}
                                                                render={({ field }) => (
                                                                    <FormItem className="flex items-center justify-center gap-1">
                                                                        <FormControl>
                                                                            <Input
                                                                                type="number"
                                                                                className="h-9 w-16 text-center bg-background"
                                                                                value={
                                                                                    field.value || 0
                                                                                }
                                                                                onChange={
                                                                                    field.onChange
                                                                                }
                                                                            />
                                                                        </FormControl>
                                                                        <span>%</span>
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <FormField
                                                                control={form.control}
                                                                name={`indents.${index}.discount`}
                                                                render={({ field }) => (
                                                                    <FormItem className="flex items-center justify-center gap-1">
                                                                        <FormControl>
                                                                            <Input
                                                                                type="number"
                                                                                className="h-9 w-16 text-center bg-background"
                                                                                value={
                                                                                    field.value || 0
                                                                                }
                                                                                onChange={
                                                                                    field.onChange
                                                                                }
                                                                            />
                                                                        </FormControl>
                                                                        <span>%</span>
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        </TableCell>
                                                        <TableCell className="font-medium">
                                                            ₹{amount.toFixed(2)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() =>
                                                                    itemsArray.remove(index)
                                                                }
                                                            >
                                                                <Trash
                                                                    size={16}
                                                                    className="text-red-500"
                                                                />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Total Calculation */}
                                <div className="flex justify-stretch sm:justify-end p-2 sm:p-4">
                                    <div className="w-full sm:w-80 rounded-[3px] bg-muted">
                                        <p className="flex px-7 py-2 justify-between">
                                            <span>Total:</span>
                                            <span className="text-end">
                                                {calculateSubtotal(
                                                    form.watch('indents').map((indent) => ({
                                                        quantity: indent.quantity || 0,
                                                        rate: indent.rate || 0,
                                                        discountPercent: indent.discount || 0,
                                                    }))
                                                )}
                                            </span>
                                        </p>
                                        <hr />
                                        <p className="flex px-7 py-2 justify-between">
                                            <span>GST Amount:</span>
                                            <span className="text-end">
                                                {calculateTotalGst(
                                                    form.watch('indents').map((indent) => ({
                                                        quantity: indent.quantity || 0,
                                                        rate: indent.rate || 0,
                                                        discountPercent: indent.discount || 0,
                                                        gstPercent: indent.gst || 0,
                                                    }))
                                                )}
                                            </span>
                                        </p>
                                        <hr />
                                        <p className="flex px-7 py-2 justify-between font-bold">
                                            <span>Grand Total:</span>
                                            <span className="text-end">
                                                {calculateGrandTotal(
                                                    form.watch('indents').map((indent) => ({
                                                        quantity: indent.quantity || 0,
                                                        rate: indent.rate || 0,
                                                        discountPercent: indent.discount || 0,
                                                        gstPercent: indent.gst || 0,
                                                    }))
                                                )}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <hr />

                            {/* Terms Section */}
                            <div>
                                <p className="text-sm px-3 font-semibold">THE ABOVE</p>
                                <div>
                                    {termsArray.fields.map((field, index) => {
                                        const write = readOnly === index;
                                        return (
                                            <div className="flex items-center" key={field.id}>
                                                <span className="px-3">{index + 1}.</span>
                                                <FormField
                                                    control={form.control}
                                                    name={`terms.${index}`}
                                                    render={({ field: termField }) => (
                                                        <FormItem className="w-full">
                                                            <FormControl>
                                                                <Input
                                                                    className={cn(
                                                                        'border-transparent rounded-xs h-6 shadow-none',
                                                                        !write
                                                                            ? ''
                                                                            : 'border-b border-b-foreground'
                                                                    )}
                                                                    readOnly={!write}
                                                                    {...termField}
                                                                />
                                                            </FormControl>
                                                        </FormItem>
                                                    )}
                                                />
                                                <Button
                                                    variant="ghost"
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        if (write) {
                                                            setReadOnly(-1);
                                                        } else if (readOnly === -1) {
                                                            setReadOnly(index);
                                                        } else {
                                                            toast.error(
                                                                `Please save term ${readOnly + 1} before editing`
                                                            );
                                                        }
                                                    }}
                                                >
                                                    {!write ? (
                                                        <Pencil size={20} />
                                                    ) : (
                                                        <Save size={20} />
                                                    )}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        if (readOnly === index) setReadOnly(-1);
                                                        termsArray.remove(index);
                                                    }}
                                                >
                                                    <Trash className="text-red-300" size={20} />
                                                </Button>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="w-full flex flex-col gap-2 p-3">
                                    {localTerms.length > 0 && (
                                        <div className="space-y-1 mb-1">
                                            {localTerms.map((t, i) => (
                                                <div
                                                    key={t.id}
                                                    className="flex items-center gap-2 text-sm"
                                                >
                                                    <span className="text-muted-foreground shrink-0 w-5 text-right">
                                                        {i + 1}.
                                                    </span>
                                                    <span className="flex-1">
                                                        <span className="font-medium">
                                                            {t.title}:{' '}
                                                        </span>
                                                        {t.name}
                                                    </span>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        type="button"
                                                        className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0"
                                                        onClick={() => setEditingTerm({ ...t })}
                                                    >
                                                        <Pencil size={13} />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        type="button"
                                                        className="h-6 w-6 text-muted-foreground hover:text-red-500 shrink-0"
                                                        onClick={() =>
                                                            setLocalTerms((prev) =>
                                                                prev.filter((x) => x.id !== t.id)
                                                            )
                                                        }
                                                    >
                                                        <X size={13} />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <Button
                                        className="w-48"
                                        variant="outline"
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setNewTerm({ title: '', name: '' });
                                            setShowAddTerm(true);
                                        }}
                                    >
                                        Add Term
                                    </Button>
                                </div>
                            </div>

                            <hr />

                            <div className="text-center flex justify-between gap-5 px-7 items-center"></div>
                        </div>

                        {/* Submit Buttons — stacked + sticky to the viewport bottom on mobile */}
                        <div className="hidden sm:grid grid-cols-3 gap-3 p-3 w-full max-w-6xl bg-background m-5 shadow-md rounded-md">
                            <Button type="reset" variant="outline" onClick={() => form.reset()}>
                                Reset
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={handlePreview}
                                disabled={!vendor || indents.length === 0}
                            >
                                <Eye size={20} className="mr-2" />
                                Preview
                            </Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && (
                                    <Loader size={20} color="white" aria-label="Loading Spinner" />
                                )}
                                Save And Send PO
                            </Button>
                        </div>

                        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 flex flex-col gap-2 p-3 bg-background border-t shadow-[0_-2px_8px_-2px_rgba(0,0,0,0.08)]">
                            <Button
                                type="submit"
                                disabled={form.formState.isSubmitting}
                                className="w-full"
                            >
                                {form.formState.isSubmitting && (
                                    <Loader size={20} color="white" aria-label="Loading Spinner" />
                                )}
                                Save And Send PO
                            </Button>
                            <div className="grid grid-cols-2 gap-2">
                                <Button type="reset" variant="outline" onClick={() => form.reset()}>
                                    Reset
                                </Button>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={handlePreview}
                                    disabled={!vendor || indents.length === 0}
                                >
                                    <Eye size={16} className="mr-1.5" />
                                    Preview
                                </Button>
                            </div>
                        </div>
                        {/* Spacer so the fixed mobile action bar doesn't cover the last form field */}
                        <div className="sm:hidden h-24" />

                        {/* Edit Term Dialog */}
                        <Dialog
                            open={!!editingTerm}
                            onOpenChange={(open) => {
                                if (!open) setEditingTerm(null);
                            }}
                        >
                            <DialogContent className="sm:max-w-lg">
                                <DialogHeader>
                                    <DialogTitle>Edit Term</DialogTitle>
                                    <DialogDescription className="sr-only">
                                        Edit purchase order term details
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-2">
                                    <div className="grid gap-1.5">
                                        <label
                                            htmlFor="edit-term-title"
                                            className="text-sm font-medium"
                                        >
                                            Heading
                                        </label>
                                        <Input
                                            id="edit-term-title"
                                            value={editingTerm?.title ?? ''}
                                            onChange={(e) =>
                                                setEditingTerm((prev) =>
                                                    prev ? { ...prev, title: e.target.value } : prev
                                                )
                                            }
                                            placeholder="e.g. Payment Terms"
                                        />
                                    </div>
                                    <div className="grid gap-1.5">
                                        <label
                                            htmlFor="edit-term-name"
                                            className="text-sm font-medium"
                                        >
                                            Condition
                                        </label>
                                        <Textarea
                                            id="edit-term-name"
                                            value={editingTerm?.name ?? ''}
                                            onChange={(e) =>
                                                setEditingTerm((prev) =>
                                                    prev ? { ...prev, name: e.target.value } : prev
                                                )
                                            }
                                            placeholder="e.g. Payment within 30 days of invoice"
                                            rows={6}
                                            className="resize-y"
                                        />
                                    </div>
                                </div>
                                <DialogFooter className="gap-2">
                                    <Button
                                        variant="outline"
                                        type="button"
                                        onClick={() => setEditingTerm(null)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={() => {
                                            if (editingTerm) {
                                                setLocalTerms((prev) =>
                                                    prev.map((x) =>
                                                        x.id === editingTerm.id ? editingTerm : x
                                                    )
                                                );
                                                setEditingTerm(null);
                                            }
                                        }}
                                    >
                                        Save
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        {/* Add Term Dialog */}
                        <Dialog open={showAddTerm} onOpenChange={setShowAddTerm}>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Add Term</DialogTitle>
                                    <DialogDescription className="sr-only">
                                        Add a new purchase order term
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-2">
                                    <div className="grid gap-1.5">
                                        <label
                                            htmlFor="add-term-title"
                                            className="text-sm font-medium"
                                        >
                                            Heading
                                        </label>
                                        <input
                                            id="add-term-title"
                                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                                            value={newTerm.title}
                                            onChange={(e) =>
                                                setNewTerm((prev) => ({
                                                    ...prev,
                                                    title: e.target.value,
                                                }))
                                            }
                                            placeholder="e.g. Payment Terms"
                                        />
                                    </div>
                                    <div className="grid gap-1.5">
                                        <label
                                            htmlFor="add-term-name"
                                            className="text-sm font-medium"
                                        >
                                            Condition
                                        </label>
                                        <input
                                            id="add-term-name"
                                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                                            value={newTerm.name}
                                            onChange={(e) =>
                                                setNewTerm((prev) => ({
                                                    ...prev,
                                                    name: e.target.value,
                                                }))
                                            }
                                            placeholder="e.g. Payment within 30 days of invoice"
                                        />
                                    </div>
                                </div>
                                <DialogFooter className="gap-2">
                                    <Button
                                        variant="outline"
                                        type="button"
                                        onClick={() => setShowAddTerm(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={() => {
                                            if (!newTerm.title.trim() || !newTerm.name.trim()) {
                                                toast.error(
                                                    'Please fill in both heading and condition'
                                                );
                                                return;
                                            }
                                            setLocalTerms((prev) => [
                                                ...prev,
                                                {
                                                    id: Date.now(),
                                                    title: newTerm.title.trim(),
                                                    name: newTerm.name.trim(),
                                                },
                                            ]);
                                            setShowAddTerm(false);
                                        }}
                                    >
                                        Add
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        {/* Preview Dialog */}
                        <Dialog open={showPreview} onOpenChange={setShowPreview}>
                            <DialogContent className="max-w-[95vw] w-[95vw] h-[95vh] p-0 gap-0">
                                <DialogHeader className="px-6 py-4 border-b">
                                    <DialogTitle>PO Preview</DialogTitle>
                                    <DialogDescription className="sr-only">
                                        Purchase order PDF preview
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="w-full h-[calc(95vh-70px)]">
                                    {previewData && (
                                        <PDFViewer
                                            width="100%"
                                            height="100%"
                                            showToolbar={true}
                                            style={{ border: 'none' }}
                                        >
                                            <POPdf {...previewData} />
                                        </PDFViewer>
                                    )}
                                </div>
                            </DialogContent>
                        </Dialog>
                    </form>
                </Form>
            </div>
        </div>
    );
};

export default CreatePO;
