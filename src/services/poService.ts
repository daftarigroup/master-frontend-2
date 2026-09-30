import { apiClient, storeApi } from '@/lib/apiClient';
import { hasNoFirmAccess, normalizeFirmAccess } from '@/lib/firmAccess';

/**
 * PO Service
 * Handles indent fetching, PO creation, and PO master operations via REST API
 */

export interface IndentRecord {
    id: number;
    planned4: string;
    actual4: string;
    approvedVendorName: string;
    firmName: string;
    firm_id?: number;
    indentNumber: string;
    productName: string;
    specifications: string;
    taxValue1: number;
    taxValue4: number;
    approvedQuantity: number;
    indentQuantity?: number;
    pendingPoQty?: number;
    uom: string;
    approvedRate: number;
    quotationNumber?: string;
    quotationDate?: string;
    approvedPaymentTerm?: string;
    approvedAdvancePercent?: string | number;
    vendorType: string;
    poRequired: string;
    poNumber: string;
    po_number?: string;
    poDate?: string;
    deliveryDate?: string;
    withTax?: string;
    areaOfUse?: string;
    totalRate?: number;
    totalAmount?: number;
    negotiatedRate?: number;
    negotiatedAmount?: number;
    attachment?: string;
    attachment3?: string;
    taxValue?: number;
    paymentTerms?: string;
    rate?: number;
    rate1?: number;
    rate2?: number;
    rate3?: number;
    vendorRate?: number;
    noDay?: number;
    timestamp?: string;
}

export interface PoMasterRecord {
    timestamp: string;
    poCreatedDate?: string;
    po_created_date?: string;
    poDate?: string;
    partyName: string;
    supplierAddress: string;
    supplierGstin: string;
    poNumber: string;
    internalCode: string;
    product: string;
    description: string;
    quantity: number;
    unit: string;
    rate: number;
    gst: number;
    gstPercent: number;
    companyEmail: string;
    discount: number;
    discountPercent: number;
    amount: number;
    totalPoAmount: number;
    pdf?: string;
    quotationNumber?: string;
    quotationDate?: string;
    enquiryNumber?: string;
    enquiryDate?: string;
    term1?: string;
    term2?: string;
    term3?: string;
    term4?: string;
    term5?: string;
    term6?: string;
    term7?: string;
    term8?: string;
    term9?: string;
    term10?: string;
    term11?: string;
    term12?: string;
    term13?: string;
    term14?: string;
    term15?: string;
    term16?: string;
    term17?: string;
    term18?: string;
    term19?: string;
    term20?: string;
    terms?: string;
    deliveryDate?: string;
    paymentTerms?: string;
    numberOfDays?: number;
    deliveryDays?: number;
    deliveryType?: string;
    firmNameMatch?: string;
    firm_id?: number;
    status?: string;
    totalPaidAmount?: number;
    outstandingAmount?: number;
    emailSendStatus?: string;
    preparedBy?: string;
    approvedBy?: string;
    siteEngineerName?: string;
    siteEngineerEmail?: string;
    siteEngineerPhoneNo?: string;
    site_engineer_name?: string;
    site_engineer_email?: string;
    site_engineer_phoneNo?: string;
    siteEngineerName2?: string;
    siteEngineerEmail2?: string;
    siteEngineerPhoneNo2?: string;
    site_engineer_name_2?: string;
    site_engineer_email_2?: string;
    site_engineer_phoneNo_2?: string;
    advancePercent?: number;
    advanceAmount?: number;
}

export interface MasterOptions {
    vendors: {
        vendorName: string;
        gstin: string;
        address: string;
        vendorEmail: string;
        personName: string;
        phone: string;
    }[];
    paymentTerms: string[];
    companyName: string;
    companyPhone: string;
    companyGstin: string;
    companyPan: string;
    companyEmail: string;
    companyAddress: string;
    billingAddress: string;
    destinationAddress: string;
    companyContactPerson: string;
    defaultTerms: string[];
    firmCompanyMap: Record<string, {
        companyName: string;
        companyAddress: string;
        destinationAddress: string;
        billingAddress: string;
        companyGstin: string;
        companyPan: string;
    }>;
    items: {
        itemName: string;
        regularConditions: string[];
        thirdPartyConditions: string[];
    }[];
    siteEngineers: {
        name: string;
        number: string;
        email: string;
    }[];
}

export interface PoCreationData {
    selectedIndents: IndentRecord[];
    vendorName: string;
    vendorGstin: string;
    vendorAddress: string;
    vendorEmail: string;
    vendorContactPerson: string;
    vendorContactNo: string;
    poNumber: string;
    poDate: string;
    quotationNumber: string;
    quotationDate: string;
    enquiryNumber: string;
    enquiryDate: string;
    deliveryDate: string;
    paymentTerms: string;
    deliveryType: string;
    numberOfDays: number;
    deliveryDays: number;
    companyEmail: string;
    billingAddress: string;
    destinationAddress: string;
    siteEngineerName: string;
    siteEngineerEmail: string;
    siteEngineerPhoneNo: string;
    siteEngineerName2?: string;
    siteEngineerEmail2?: string;
    siteEngineerPhoneNo2?: string;
    terms: string[];
    advancePercent?: number;
    advanceAmount?: number;
}

export async function fetchIndents(permittedFirms?: string[]) {
    try {
        if (hasNoFirmAccess(permittedFirms)) return [];
        const firms = normalizeFirmAccess(permittedFirms);

        const params: Record<string, any> = {
            order: 'indent_number.desc',
        };

        if (firms) {
            const ids = firms.filter((firm) => /^\d+$/.test(firm)).map(Number);
            const names = firms.filter((firm) => !/^\d+$/.test(firm));
            if (ids.length > 0) {
                params['in__firm_id'] = ids.join(',');
            } else if (names.length > 0) {
                params['in__firm_name'] = names.join(',');
            } else {
                return [];
            }
        }

        const res: any = await apiClient.get('/store/entity/indent', { params });
        const data = res?.data || [];

        return data.map((r: any) => {
            const rawPending = Number(r.pending_po_qty) || 0;
            const rawApproved = Number(r.approved_quantity) || 0;
            const rawQuantity = Number(r.quantity) || 0;

            const finalQty = rawApproved > 0 ? rawApproved : (rawPending > 0 ? rawPending : rawQuantity);

            return {
                id: r.id,
                planned4: r.planned4 || '',
                actual4: r.actual4 || '',
                approvedVendorName: r.approved_vendor_name || r.vendor_name1 || '',
                firmName: r.firm_name || '',
                firmNameMatch: r.firm_name || '',
                firm_id: r.firm_id,
                indentNumber: r.indent_number || '',
                productName: r.product_name || '',
                specifications: r.specifications || '',
                taxValue1: r.tax_value1 || 0,
                taxValue4: r.tax_value4 || 0,
                approvedQuantity: finalQty,
                indentQuantity: rawQuantity,
                pendingPoQty: rawPending,
                uom: r.uom || '',
                approvedRate: r.approved_rate || 0,
                quotationNumber: r.approved_quotation_no || '',
                quotationDate: r.approved_quotation_date || '',
                approvedPaymentTerm: r.approved_payment_term || '',
                approvedAdvancePercent: r.approved_advance_percent || '',
                vendorType: r.vendor_type || 'Regular',
                poRequired: r.po_requred || '',
                poNumber: r.po_number || '',
                po_number: r.po_number || '',
            };
        });
    } catch (error) {
        console.error('Error fetching indents:', error);
        throw error;
    }
}

export async function fetchPoMaster(permittedFirms?: string[]) {
    try {
        if (hasNoFirmAccess(permittedFirms)) return [];
        const firms = normalizeFirmAccess(permittedFirms);

        const params: Record<string, any> = {
            order: 'timestamp.desc',
            limit: 'all',
        };

        if (firms) {
            const ids = firms.filter((firm) => /^\d+$/.test(firm)).map(Number);
            const names = firms.filter((firm) => !/^\d+$/.test(firm));
            
            if (ids.length > 0) {
                params['in__firm_id'] = ids.join(',');
            } else if (names.length > 0) {
                params['in__firm_name'] = names.join(',');
            } else {
                return [];
            }
        }

        const res: any = await apiClient.get('/store/entity/po_master', { params });
        const data = res?.data || [];

        return data.map((r: any) => ({
            timestamp: r.timestamp,
            poCreatedDate: r.po_created_date || r.timestamp || '',
            poDate: r.po_created_date || r.timestamp || '',
            partyName: r.party_name || '',
            supplierAddress: r.supplier_address || '',
            supplierGstin: r.supplier_gstin || '',
            poNumber: r.po_number || '',
            internalCode: r.internal_code || '',
            product: r.product || '',
            description: r.description || '',
            quantity: Number(r.quantity) || 0,
            unit: r.unit || '',
            rate: Number(r.rate) || 0,
            gst: Number(r.gst) || 0,
            gstPercent: Number(r.gst) || 0,
            companyEmail: r.company_email || '',
            discount: Number(r.discount) || 0,
            discountPercent: Number(r.discount) || 0,
            amount: Number(r.amount) || 0,
            totalPoAmount: Number(r.total_po_amount) || 0,
            pdf: r.pdf || '',
            quotationNumber: r.quotation_number || '',
            quotationDate: r.quotation_date || '',
            enquiryNumber: r.enquiry_number || '',
            enquiryDate: r.enquiry_date || '',
            term1: r.term1 || '',
            term2: r.term2 || '',
            term3: r.term3 || '',
            term4: r.term4 || '',
            term5: r.term5 || '',
            term6: r.term6 || '',
            term7: r.term7 || '',
            term8: r.term8 || '',
            term9: r.term9 || '',
            term10: r.term10 || '',
            term11: r.term11 || '',
            term12: r.term12 || '',
            term13: r.term13 || '',
            term14: r.term14 || '',
            term15: r.term15 || '',
            term16: r.term16 || '',
            term17: r.term17 || '',
            term18: r.term18 || '',
            term19: r.term19 || '',
            term20: r.term20 || '',
            terms: r.terms || '',
            deliveryDate: r.delivery_date || '',
            paymentTerms: r.payment_terms || '',
            numberOfDays: Number(r.number_of_days) || 0,
            deliveryDays: Number(r.delivery_days) || 0,
            deliveryType: r.delivery_type || '',
            firmNameMatch: r.firm_name || '',
            firm_id: r.firm_id,
            status: r.status || '',
            totalPaidAmount: Number(r.total_paid_amount) || 0,
            outstandingAmount: Number(r.outstanding_amount) || 0,
            emailSendStatus: r.email_send_status || '',
            preparedBy: r.prepared_by || '',
            approvedBy: r.approved_by || '',
            siteEngineerName: r.site_engineer_name || '',
            siteEngineerEmail: r.site_engineer_email || '',
            siteEngineerPhoneNo: r.site_engineer_phoneNo || '',
            site_engineer_name: r.site_engineer_name || '',
            site_engineer_email: r.site_engineer_email || '',
            site_engineer_phoneNo: r.site_engineer_phoneNo || '',
            siteEngineerName2: r.site_engineer_name_2 || '',
            siteEngineerEmail2: r.site_engineer_email_2 || '',
            siteEngineerPhoneNo2: r.site_engineer_phoneNo_2 || '',
            site_engineer_name_2: r.site_engineer_name_2 || '',
            site_engineer_email_2: r.site_engineer_email_2 || '',
            site_engineer_phoneNo_2: r.site_engineer_phoneNo_2 || '',
        }));
    } catch (error) {
        console.error('Error fetching PO master:', error);
        throw error;
    }
}

export async function fetchPoMasterByPoNumber(poNumber: string): Promise<PoMasterRecord[]> {
    try {
        const res: any = await apiClient.get('/store/entity/po_master', {
            params: {
                or__po_number: poNumber,
                or__internal_code: poNumber,
                limit: 'all',
            },
        });
        const data = res?.data || [];

        return (data || []).map((r: any) => ({
            timestamp: r.timestamp,
            poCreatedDate: r.po_created_date || r.timestamp || '',
            poDate: r.po_created_date || r.timestamp || '',
            partyName: r.party_name || '',
            supplierAddress: r.supplier_address || '',
            supplierGstin: r.supplier_gstin || '',
            poNumber: r.po_number || '',
            internalCode: r.internal_code || '',
            product: r.product || '',
            description: r.description || '',
            quantity: Number(r.quantity) || 0,
            unit: r.unit || '',
            rate: Number(r.rate) || 0,
            gst: Number(r.gst) || 0,
            gstPercent: Number(r.gst) || 0,
            companyEmail: r.company_email || '',
            discount: Number(r.discount) || 0,
            discountPercent: Number(r.discount) || 0,
            amount: Number(r.amount) || 0,
            totalPoAmount: Number(r.total_po_amount) || 0,
            pdf: r.pdf || '',
            quotationNumber: r.quotation_number || '',
            quotationDate: r.quotation_date || '',
            enquiryNumber: r.enquiry_number || '',
            enquiryDate: r.enquiry_date || '',
            term1: r.term1 || '',
            term2: r.term2 || '',
            term3: r.term3 || '',
            term4: r.term4 || '',
            term5: r.term5 || '',
            term6: r.term6 || '',
            term7: r.term7 || '',
            term8: r.term8 || '',
            term9: r.term9 || '',
            term10: r.term10 || '',
            term11: r.term11 || '',
            term12: r.term12 || '',
            term13: r.term13 || '',
            term14: r.term14 || '',
            term15: r.term15 || '',
            term16: r.term16 || '',
            term17: r.term17 || '',
            term18: r.term18 || '',
            term19: r.term19 || '',
            term20: r.term20 || '',
            terms: r.terms || '',
            deliveryDate: r.delivery_date || '',
            paymentTerms: r.payment_terms || '',
            numberOfDays: Number(r.number_of_days) || 0,
            deliveryDays: Number(r.delivery_days) || 0,
            deliveryType: r.delivery_type || '',
            firmNameMatch: r.firm_name || '',
            emailSendStatus: r.email_send_status || '',
            preparedBy: r.prepared_by || '',
            firm_id: r.firm_id,
            status: r.status,
            totalPaidAmount: Number(r.total_paid_amount) || 0,
            outstandingAmount: Number(r.outstanding_amount) || 0,
            siteEngineerName: r.site_engineer_name || '',
            siteEngineerEmail: r.site_engineer_email || '',
            siteEngineerPhoneNo: r.site_engineer_phoneNo || '',
            siteEngineerName2: r.site_engineer_name_2 || '',
            siteEngineerEmail2: r.site_engineer_email_2 || '',
            siteEngineerPhoneNo2: r.site_engineer_phoneNo_2 || '',
            site_engineer_name: r.site_engineer_name || '',
            site_engineer_email: r.site_engineer_email || '',
            site_engineer_phoneNo: r.site_engineer_phoneNo || '',
            site_engineer_name_2: r.site_engineer_name_2 || '',
            site_engineer_email_2: r.site_engineer_email_2 || '',
            site_engineer_phoneNo_2: r.site_engineer_phoneNo_2 || '',
        }));
    } catch (error) {
        console.error('Error fetching PO master by PO number:', error);
        throw error;
    }
}

let masterDataCache: any = null;
let masterDataPromise: Promise<any> | null = null;

export function invalidateMasterDataCache() {
    masterDataCache = null;
    masterDataPromise = null;
}

export async function fetchMasterData(forceRefresh = false) {
    if (!forceRefresh && masterDataCache) return masterDataCache;
    if (!forceRefresh && masterDataPromise) return masterDataPromise;

    masterDataPromise = (async () => {
        try {
            const [
                companiesRes,
                firmsRes,
                vendorsRes,
                itemsRes,
                termsRes,
                seRes,
            ]: any[] = await Promise.all([
                apiClient.get('/store/entity/company', { params: { order: 'company_name.asc', limit: 'all' } }),
                apiClient.get('/store/entity/firm', { params: { order: 'firm_name.asc', limit: 'all' } }),
                apiClient.get('/store/entity/vendors', { params: { order: 'vendor_name.asc', limit: 'all' } }),
                apiClient.get('/store/entity/item', { params: { order: 'item_name.asc', limit: 'all' } }),
                apiClient.get('/store/entity/default_po_terms', { params: { active: true, order: 'sort_order.asc', limit: 'all' } }),
                apiClient.get('/store/entity/site_engineer_details', { params: { limit: 'all' } }),
            ]);

            const companies = companiesRes?.data || [];
            const firms = firmsRes?.data || [];
            const vendorRows = vendorsRes?.data || [];
            const itemRows = itemsRes?.data || [];
            const termRows = termsRes?.data || [];
            const firstCompany: any = companies[0] || {};
            const siteEngineers = seRes?.data || [];

            const vendors = vendorRows.map((r: any) => ({
                vendorName: r.vendor_name,
                gstin: r.gstin || '',
                address: r.address || '',
                vendorEmail: r.email || '',
                personName: r.person_name || '',
                phone: r.phone || '',
            }));

            const uniqueVendors = Array.from(new Map(vendors.map((v: any) => [v.vendorName, v])).values());
            const paymentTerms = Array.from(new Set(vendorRows.map((r: any) => r.payment_term).filter(Boolean)));

            const firmCompanyMap: Record<string, any> = {};
            firms.forEach((r: any) => {
                const company = r.company || {};
                if (r.firm_name) {
                    firmCompanyMap[r.firm_name] = {
                        companyName: company.company_name || firstCompany.company_name || '',
                        companyAddress: company.billing_address || company.address || firstCompany.billing_address || firstCompany.address || '',
                        billingAddress: company.billing_address || company.address || firstCompany.billing_address || firstCompany.address || '',
                        destinationAddress: r.destination_address || '',
                        companyGstin: company.gstin || firstCompany.gstin || '',
                        companyPan: company.pan || firstCompany.pan || '',
                    };
                }
            });

            const items = itemRows.map((r: any) => ({
                itemName: r.item_name,
                regularConditions: typeof r.regular_pay_condition === 'string' && r.regular_pay_condition
                    ? r.regular_pay_condition.split(',').map((s: string) => s.trim()).filter(Boolean)
                    : (Array.isArray(r.regular_pay_condition) ? r.regular_pay_condition : []),
                thirdPartyConditions: typeof r.third_party_pay_condition === 'string' && r.third_party_pay_condition
                    ? r.third_party_pay_condition.split(',').map((s: string) => s.trim()).filter(Boolean)
                    : (Array.isArray(r.third_party_pay_condition) ? r.third_party_pay_condition : []),
            }));

            masterDataCache = {
                destinationAddress: firstCompany.destination_address || '',
                defaultTerms: termRows.map((term: any) => term.term_text).filter(Boolean),
                vendors: uniqueVendors,
                items,
                firmCompanyMap,
                companyName: firstCompany.company_name || '',
                companyPhone: firstCompany.phone || '',
                companyGstin: firstCompany.gstin || '',
                companyPan: firstCompany.pan || '',
                companyEmail: firstCompany.email || '',
                companyAddress: firstCompany.address || '',
                billingAddress: firstCompany.billing_address || '',
                companyContactPerson: firstCompany.contact_person || '',
                paymentTerms,
                siteEngineers,
            };
            masterDataPromise = null;
            return masterDataCache;
        } catch (error) {
            masterDataPromise = null;
            throw error;
        }
    })();

    return masterDataPromise;
}

export async function fetchNextPoNumber(fy?: string): Promise<string> {
    try {
        const res: any = await apiClient.get('/store/po/next-number', { params: fy ? { fy } : {} });
        return res?.data?.nextPoNumber || res?.nextPoNumber || '';
    } catch (error) {
        console.warn('Failed to fetch next PO number from server, falling back to local computation:', error);
        return '';
    }
}

export interface CreatePOWithQueuePayload {
    mode?: 'create' | 'revise';
    poNumber?: string;
    poDate?: Date | string;
    financialYear?: string;
    rows: any[];
    indentIds?: number[];
    deliveryDate?: string;
    actualDate?: string;
}

export interface CreatePOResult {
    success: boolean;
    poNumber: string;
    wasReassigned: boolean;
    originalPoNumber?: string;
    count?: number;
}

export async function createPOWithQueue(payload: CreatePOWithQueuePayload): Promise<CreatePOResult> {
    try {
        if (!payload.rows || payload.rows.length === 0) {
            throw new Error('Cannot create PO without items');
        }
        if (payload.rows.some((record) => !record.firm_id)) {
            throw new Error('Project ID is required for PO records');
        }

        const mappedRecords = payload.rows.map((record) => ({
            timestamp: record.timestamp,
            po_created_date: record.po_created_date || record.timestamp || new Date().toISOString(),
            party_name: record.partyName || '',
            po_number: record.poNumber || '',
            internal_code: record.internalCode || '',
            product: record.product || '',
            description: record.description || '',
            quantity: String(record.quantity || 0),
            unit: record.unit || '',
            rate: String(record.rate || 0),
            gst: String(record.gstPercent || record.gst || 0),
            discount: String(record.discountPercent || record.discount || 0),
            amount: String(record.amount || 0),
            total_po_amount: String(record.totalPoAmount || 0),
            pdf: record.pdf || '',
            quotation_number: record.quotationNumber || '',
            quotation_date: record.quotationDate || '',
            enquiry_number: record.enquiryNumber || '',
            enquiry_date: record.enquiryDate || '',
            delivery_date: record.deliveryDate || '',
            payment_terms: record.paymentTerms || '',
            number_of_days: String(record.numberOfDays || 0),
            delivery_days: String(record.deliveryDays || 0),
            delivery_type: record.deliveryType || '',
            firm_name: record.firmNameMatch || '',
            firm_id: record.firm_id,
            company_email: record.companyEmail || '',
            advance_percent: record.advancePercent || 0,
            advance_amount: record.advanceAmount || 0,
            terms: typeof record.terms === 'string'
                ? record.terms
                : (record.terms ? JSON.stringify(record.terms) : ''),
            site_engineer_name: record.siteEngineerName || '',
            site_engineer_email: record.siteEngineerEmail || '',
            site_engineer_phoneNo: record.siteEngineerPhoneNo || '',
            site_engineer_name_2: record.siteEngineerName2 || record.site_engineer_name_2 || '',
            site_engineer_email_2: record.siteEngineerEmail2 || record.site_engineer_email_2 || '',
            site_engineer_phoneNo_2: record.siteEngineerPhoneNo2 || record.site_engineer_phoneNo_2 || '',
        }));

        const res: any = await apiClient.post('/store/po/create', {
            mode: payload.mode || 'create',
            poNumber: payload.poNumber,
            poDate: payload.poDate,
            financialYear: payload.financialYear,
            rows: mappedRecords,
            indentIds: payload.indentIds || [],
            deliveryDate: payload.deliveryDate,
            actualDate: payload.actualDate,
        });

        const data = res?.data || res;
        return {
            success: Boolean(data?.success),
            poNumber: data?.poNumber || payload.poNumber || '',
            wasReassigned: Boolean(data?.wasReassigned),
            originalPoNumber: data?.originalPoNumber || payload.poNumber,
            count: data?.count || mappedRecords.length,
        };
    } catch (error) {
        console.error('Error creating PO with queue:', error);
        throw error;
    }
}

export async function insertPoRecords(poRecords: any[]) {
    try {
        if (poRecords.some((record) => !record.firm_id)) {
            throw new Error('Project ID is required for PO records');
        }

        const mappedRecords = poRecords.map((record) => ({
            timestamp: record.timestamp,
            po_created_date: record.po_created_date || record.timestamp || new Date().toISOString(),
            party_name: record.partyName || '',
            po_number: record.poNumber || '',
            internal_code: record.internalCode || '',
            product: record.product || '',
            description: record.description || '',
            quantity: String(record.quantity || 0),
            unit: record.unit || '',
            rate: String(record.rate || 0),
            gst: String(record.gstPercent || record.gst || 0),
            discount: String(record.discountPercent || record.discount || 0),
            amount: String(record.amount || 0),
            total_po_amount: String(record.totalPoAmount || 0),
            pdf: record.pdf || '',
            quotation_number: record.quotationNumber || '',
            quotation_date: record.quotationDate || '',
            enquiry_number: record.enquiryNumber || '',
            enquiry_date: record.enquiryDate || '',
            delivery_date: record.deliveryDate || '',
            payment_terms: record.paymentTerms || '',
            number_of_days: String(record.numberOfDays || 0),
            delivery_days: String(record.deliveryDays || 0),
            delivery_type: record.deliveryType || '',
            firm_name: record.firmNameMatch || '',
            firm_id: record.firm_id,
            company_email: record.companyEmail || '',
            advance_percent: record.advancePercent || 0,
            advance_amount: record.advanceAmount || 0,
            terms: typeof record.terms === 'string'
                ? record.terms
                : (record.terms ? JSON.stringify(record.terms) : ''),
            site_engineer_name: record.siteEngineerName || '',
            site_engineer_email: record.siteEngineerEmail || '',
            site_engineer_phoneNo: record.siteEngineerPhoneNo || '',
            site_engineer_name_2: record.siteEngineerName2 || record.site_engineer_name_2 || '',
            site_engineer_email_2: record.siteEngineerEmail2 || record.site_engineer_email_2 || '',
            site_engineer_phoneNo_2: record.siteEngineerPhoneNo2 || record.site_engineer_phoneNo_2 || '',
        }));

        const data = await storeApi.insert('po_master', mappedRecords);
        return data;
    } catch (error) {
        console.error('Error inserting PO records:', error);
        throw error;
    }
}

export async function updateIndentsAfterPoCreation(ids: number[], deliveryDate?: string, poNumber?: string) {
    try {
        const now = new Date().toISOString();
        const updateData: any = {
            actual4: now,
            planned5: now
        };
        if (deliveryDate) {
            updateData.delivery_date = deliveryDate;
        }
        if (poNumber) {
            updateData.po_number = poNumber;
        }

        await storeApi.updateWhere('indent', { in__id: ids.join(',') }, updateData);
    } catch (error) {
        console.error('Error updating indents after PO creation:', error);
        throw error;
    }
}

export interface ResetPoStageScope {
    firmId?: number | null;
    vendorName?: string;
    poCreatedDate?: string;
}

/**
 * Reset/Delete PO Stage:
 * Clears PO assignment from linked indents, removes downstream store_in records (if any),
 * and deletes records from po_master. Can be scoped to a specific firm/vendor/date to safely
 * delete only one duplicate PO instance without affecting others sharing the same PO number.
 * @param poNumber The PO number to reset/delete
 * @param scope Optional scope (firmId, vendorName, poCreatedDate) for disambiguation
 */
export async function resetPoStage(poNumber: string, scope?: ResetPoStageScope): Promise<boolean> {
    try {
        if (!poNumber || !poNumber.trim()) {
            throw new Error('PO Number is required for stage reset');
        }

        await apiClient.post('/store/stage-reset/po', {
            poNumber: poNumber.trim(),
            firmId: scope?.firmId != null ? scope.firmId : undefined,
            vendorName: scope?.vendorName ? scope.vendorName.trim() : undefined,
            poCreatedDate: scope?.poCreatedDate ? scope.poCreatedDate.trim() : undefined,
        });
        return true;
    } catch (error) {
        console.error(`Error resetting PO '${poNumber}':`, error);
        throw error;
    }
}

