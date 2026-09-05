import { apiClient, storeApi } from '@/lib/apiClient';
import { isAllowedFirm } from '@/lib/firmAccess';
import { invalidateMasterDataCache } from '@/services/poService';

/**
 * Master Service
 * Handles fetching global options and master data via master-backend REST API
 */

export interface MasterData {
    vendors: {
        vendorName: string;
        gstin: string;
        address: string;
        email: string;
        paymentTerm: string;
        personName: string;
        phone: string;
    }[];
    vendorNames: string[];
    paymentTerms: string[];
    departments: string[];
    groupHeads: Record<string, string[]>;
    products: Record<string, string[]>;
    /** item_name → uom name — avoids per-selection DB lookups in forms */
    itemUomMap: Record<string, string>;
    /** item_name → group_head name */
    itemGroupHeadMap: Record<string, string>;
    uoms: string[];
    firms: string[];
    firmObjects: any[];
    firmsnames: string[];
    fmsNames: string[];
    locations: string[];
    companyName: string;
    companyAddress: string;
    companyEmail: string;
    companyGstin: string;
    companyPhone: string;
    billingAddress: string;
    companyPan: string;
    destinationAddress: string;
    companyContactPerson: string;
    areaOfUses: string[];
    allGroupHeads: string[];
    siteEngineers: { name: string; number: string; email: string; firmId?: number; firmName?: string }[];
    contractors: { contractorName: string; contractorGstin: string; contractorAddress: string; contractorEmail: string; responsiblePerson: string; location: string; phone: string; firmId?: number; firmName?: string }[];
    siteLocations: string[];
    siteLocationDetails?: { location: string; firmId?: number; firmName?: string }[];
    defaultTerms: string[];
    firmCompanyMap: Record<string, { companyName: string; companyAddress: string; billingAddress: string; destinationAddress: string; companyGstin: string; companyPan: string }>;
}

/**
 * Fetch all master data options for dropdowns via REST API
 */
export async function fetchMasterOptions(permittedFirms?: string[]): Promise<MasterData> {
    try {
        const [
            companyRes,
            firmRes,
            ghRes,
            uomRes,
            aouRes,
            itemRes,
            vendorRes,
            deptRes,
            termsRes,
            seRes,
            contractorRes,
            locationRes,
            tcRes,
        ]: any[] = await Promise.all([
            apiClient.get('/store/entity/company', { params: { order: 'id.asc', limit: 'all' } }),
            apiClient.get('/store/entity/firm', { params: { active: true, order: 'firm_name.asc', limit: 'all' } }),
            apiClient.get('/store/entity/group_head', { params: { order: 'name.asc', limit: 'all' } }),
            apiClient.get('/store/entity/uom', { params: { order: 'name.asc', limit: 'all' } }),
            apiClient.get('/store/entity/area_of_use', { params: { order: 'name.asc', limit: 'all' } }),
            apiClient.get('/store/entity/item', { params: { order: 'item_name.asc', limit: 'all' } }),
            apiClient.get('/store/entity/vendors', { params: { order: 'vendor_name.asc', limit: 'all' } }),
            apiClient.get('/store/entity/department', { params: { order: 'name.asc', limit: 'all' } }),
            apiClient.get('/store/entity/default_po_terms', { params: { active: true, order: 'sort_order.asc', limit: 'all' } }),
            apiClient.get('/store/entity/site_engineer_details', { params: { limit: 'all' } }),
            apiClient.get('/store/entity/contractor_details', { params: { limit: 'all' } }),
            apiClient.get('/store/entity/site_location_details', { params: { limit: 'all' } }),
            apiClient.get('/store/entity/terms_and_condition', { params: { order: 'id.asc', limit: 'all' } }),
        ]);

        const directCompanyRows = companyRes?.data || [];
        const primaryCompany = directCompanyRows[0] || null;

        const firmData = firmRes?.data || [];
        const ghData = ghRes?.data || [];
        const uomData = uomRes?.data || [];
        const aouData = aouRes?.data || [];
        const itemData = itemRes?.data || [];
        const vendorData = vendorRes?.data || [];
        const departmentData = deptRes?.data || [];
        const defaultTermsData = termsRes?.data || [];
        const seData = seRes?.data || [];
        const contractorData = contractorRes?.data || [];
        const locationData = locationRes?.data || [];

        // Site Engineers, Contractors, Site Locations
        const siteEngineers = (seData || []).map((se: any) => ({
            name: se.name,
            number: se.number,
            email: se.email,
            firmId: se.firm_id,
            firmName: se.firm?.firm_name || se.firm_name || '',
        }));

        const contractors = (contractorData || []).map((c: any) => ({
            contractorName: c.contractor_name,
            contractorGstin: c.contractor_gstin || '',
            contractorAddress: c.contractor_address || '',
            contractorEmail: c.contractor_email || '',
            responsiblePerson: c.responsible_person || '',
            location: c.location || '',
            phone: c.phone || '',
            firmId: c.firm_id,
            firmName: c.firm?.firm_name || c.firm_name || '',
        }));

        const siteLocationDetails = (locationData || [])
            .map((l: any) => ({
                location: String(l.location || '').trim(),
                firmId: l.firm_id ? Number(l.firm_id) : (l.firm?.id ? Number(l.firm.id) : undefined),
                firmName: l.firm?.firm_name || l.firm_name || '',
            }))
            .filter((l: any) => Boolean(l.location));

        const siteLocations: string[] = Array.from(
            new Set<string>(
                siteLocationDetails.map((l: any) => l.location)
            )
        );

        // --- Processing Data for Return ---
        
        // Firms and Company Map
        const firms: string[] = [];
        const firmObjects: { id: number; name: string }[] = [];
        const firmCompanyMap: Record<string, any> = {};
        let firstCompany: any = null;

        (firmData || []).forEach((f: any) => {
            const firmName = String(f.firm_name || '').trim();
            const firmId = f.id;
            
            if (!firmName) return;

            // Use isAllowedFirm helper to check permissions (supports both name and ID)
            if (!isAllowedFirm({ id: firmId, name: firmName }, permittedFirms)) {
                return;
            }

            if (!firms.includes(firmName)) {
                firms.push(firmName);
            }
            if (!firmObjects.some((fo) => fo.name === firmName)) {
                firmObjects.push({ id: firmId, name: firmName });
            }
            
            const company = (f.company && f.company.company_name) ? f.company : (primaryCompany || {});
            if (!firstCompany && company?.company_name) firstCompany = company;

            firmCompanyMap[firmName] = {
                companyName: company.company_name || primaryCompany?.company_name || firstCompany?.company_name || '',
                companyAddress: company.billing_address || company.address || primaryCompany?.billing_address || primaryCompany?.address || firstCompany?.billing_address || firstCompany?.address || '',
                destinationAddress: f.destination_address || company.destination_address || primaryCompany?.destination_address || '',
                companyContactPerson: f.contact_person || company.contact_person || primaryCompany?.contact_person || firstCompany?.contact_person || '',
                billingAddress: company.billing_address || company.address || primaryCompany?.billing_address || primaryCompany?.address || firstCompany?.billing_address || firstCompany?.address || '',
                companyGstin: company.gstin || primaryCompany?.gstin || firstCompany?.gstin || '',
                companyPan: company.pan || primaryCompany?.pan || firstCompany?.pan || '',
            };
        });

        firms.sort((a, b) => a.localeCompare(b));
        firmObjects.sort((a, b) => a.name.localeCompare(b.name));


        const uoms: string[] = Array.from(new Set<string>((uomData || []).map((u: any) => String(u.name || '').trim()).filter(Boolean)));
        const areaOfUses: string[] = Array.from(new Set<string>((aouData || []).map((a: any) => String(a.name || '').trim()).filter(Boolean)));
        const allGroupHeads: string[] = Array.from(new Set<string>((ghData || []).map((g: any) => String(g.name || '').trim()).filter(Boolean)));
        const departments: string[] = Array.from(new Set<string>((departmentData || []).map((d: any) => String(d.name || '').trim()).filter(Boolean)));
        const defaultTerms: string[] = Array.from(new Set<string>((defaultTermsData || []).map((t: any) => String(t.term_text || '').trim()).filter(Boolean)));

        // Group Heads and Products mapping
        const groupHeadsMap: Record<string, string[]> = {};
        const productsMap: Record<string, string[]> = {};
        const itemUomMap: Record<string, string> = {};
        const itemGroupHeadMap: Record<string, string> = {};

        (itemData || []).forEach((item: any) => {
            const ghName = item.group_head?.name;
            const uomName = item.uom?.name;
            if (ghName) {
                if (!productsMap[ghName]) productsMap[ghName] = [];
                if (!productsMap[ghName].includes(item.item_name)) {
                    productsMap[ghName].push(item.item_name);
                }
                itemGroupHeadMap[item.item_name] = ghName;
            }
            if (uomName) itemUomMap[item.item_name] = uomName;
        });

        // Vendors
        const vendors = (vendorData || []).map((v: any) => ({
            vendorName: (v.vendor_name || '').trim(),
            gstin: v.gstin || '',
            address: v.address || '',
            email: v.email || '',
            paymentTerm: v.payment_term || '',
            personName: v.person_name || '',
            phone: v.phone || '',
        }));
        const vendorNames = Array.from(
            new Set<string>(
                vendors
                    .map((v: any) => (v.vendorName || '').trim())
                    .filter(Boolean)
            )
        );

        const paymentTerms = Array.from(
            new Set<string>(
                vendors
                    .flatMap((v: any) => String(v.paymentTerm || '').split(',').map((t: string) => t.trim()))
                    .filter(Boolean)
            )
        );

        return {
            groupHeads: groupHeadsMap,
            allGroupHeads,
            products: productsMap,
            itemUomMap,
            itemGroupHeadMap,
            uoms,
            firms,
            firmObjects,
            firmsnames: firms,

            fmsNames: [],
            paymentTerms,
            departments,
            locations: [],
            vendors,
            vendorNames,
            companyName: primaryCompany?.company_name || firstCompany?.company_name || '',
            companyAddress: primaryCompany?.address || primaryCompany?.billing_address || firstCompany?.address || '',
            companyEmail: primaryCompany?.email || firstCompany?.email || '',
            companyGstin: primaryCompany?.gstin || firstCompany?.gstin || '',
            companyPhone: primaryCompany?.phone || firstCompany?.phone || '',
            billingAddress: primaryCompany?.billing_address || primaryCompany?.address || firstCompany?.billing_address || '',
            companyPan: primaryCompany?.pan || firstCompany?.pan || '',
            destinationAddress: primaryCompany?.destination_address || primaryCompany?.address || firstCompany?.destination_address || '',
            companyContactPerson: primaryCompany?.contact_person || firstCompany?.contact_person || '',
            areaOfUses,
            siteEngineers,
            contractors,
            siteLocations,
            siteLocationDetails,
            defaultTerms,
            firmCompanyMap,
        };
    } catch (error) {
        console.error('Error fetching master options:', error);
        return {
            groupHeads: {},
            allGroupHeads: [],
            products: {},
            uoms: [],
            firms: [],
            firmObjects: [],
            firmsnames: [],

            fmsNames: [],
            paymentTerms: [],
            locations: [],
            vendors: [],
            vendorNames: [],
            departments: [],
            companyName: '',
            companyAddress: '',
            companyEmail: '',
            companyGstin: '',
            companyPhone: '',
            billingAddress: '',
            companyPan: '',
            destinationAddress: '',
            companyContactPerson: '',
            areaOfUses: [],
            siteEngineers: [],
            contractors: [],
            siteLocations: [],
            siteLocationDetails: [],
            defaultTerms: [],
            firmCompanyMap: {},
            itemUomMap: {},
            itemGroupHeadMap: {},
        };
    }
}

/**
 * Normalized Master Record Fetcher
 * Reads each master dimension from its dedicated normalized PostgreSQL table
 * via REST API and returns a unified array for backward-compatibility with views that expect it.
 */
export async function fetchMasterRecords(): Promise<any[]> {
    try {
        const [
            companiesRes,
            firmsRes,
            groupHeadsRes,
            uomsRes,
            areaOfUsesRes,
            vendorsRes,
            itemsRes,
            departmentsRes,
            defaultTermsRes,
        ]: any[] = await Promise.all([
            apiClient.get('/store/entity/company', { params: { order: 'company_name.asc', limit: 'all' } }),
            apiClient.get('/store/entity/firm', { params: { order: 'firm_name.asc', limit: 'all' } }),
            apiClient.get('/store/entity/group_head', { params: { order: 'name.asc', limit: 'all' } }),
            apiClient.get('/store/entity/uom', { params: { order: 'name.asc', limit: 'all' } }),
            apiClient.get('/store/entity/area_of_use', { params: { order: 'name.asc', limit: 'all' } }),
            apiClient.get('/store/entity/vendors', { params: { order: 'vendor_name.asc', limit: 'all' } }),
            apiClient.get('/store/entity/item', { params: { order: 'item_name.asc', limit: 'all' } }),
            apiClient.get('/store/entity/department', { params: { order: 'name.asc', limit: 'all' } }),
            apiClient.get('/store/entity/default_po_terms', { params: { order: 'sort_order.asc', limit: 'all' } }),
        ]);

        const companies = companiesRes?.data || [];
        const firms = firmsRes?.data || [];
        const groupHeads = groupHeadsRes?.data || [];
        const uoms = uomsRes?.data || [];
        const areaOfUses = areaOfUsesRes?.data || [];
        const vendors = vendorsRes?.data || [];
        const items = itemsRes?.data || [];
        const departments = departmentsRes?.data || [];
        const defaultTerms = defaultTermsRes?.data || [];

        return [
            ...companies.map((c: any) => ({
                id: c.id,
                __table: 'company',
                company_name: c.company_name,
                company_gstin: c.gstin,
                company_pan: c.pan,
                company_email: c.email,
                company_phone: c.phone,
                company_address: c.address,
                company_contact_person: c.contact_person,
                billing_address: c.billing_address,
                destination_address: c.destination_address,
                firm_id: c.firm_id,
                firm_name: c.firm?.firm_name || c.firm_name || '',
            })),
            ...firms.map((f: any) => ({
                id: f.id,
                __table: 'firm',
                firm_name: f.firm_name,
                company_name: f.company?.company_name,
                company_address: f.company?.address,
                company_gstin: f.company?.gstin,
                company_pan: f.company?.pan,
                billing_address: f.billing_address || '',
                destination_address: f.destination_address || '',
                company_contact_person: f.contact_person || '',
            })),
            ...groupHeads.map((g: any) => ({ id: g.id, __table: 'group_head', group_head: g.name, firm_id: g.firm_id, firm_name: g.firm?.firm_name || g.firm_name || '' })),
            ...uoms.map((u: any) => ({ id: u.id, __table: 'uom', uom: u.name, firm_id: u.firm_id, firm_name: u.firm?.firm_name || u.firm_name || '' })),
            ...areaOfUses.map((a: any) => ({ id: a.id, __table: 'area_of_use', area_of_use: a.name, firm_id: a.firm_id, firm_name: a.firm?.firm_name || a.firm_name || '' })),
            ...vendors.map((v: any) => ({
                id: v.id,
                __table: 'vendors',
                vendor_name: v.vendor_name,
                vendor_gstin: v.gstin,
                vendor_address: v.address,
                vendor_email: v.email,
                payment_term: v.payment_term,
                person_name: v.person_name,
                responsible_person: v.person_name,
                phone: v.phone,
                location: v.location,
                billing_address: v.address,
                destination_address: v.address,
                firm_id: v.firm_id,
                firm_name: v.firm?.firm_name || v.firm_name || '',
            })),
            ...items.map((i: any) => ({
                id: i.id,
                __table: 'item',
                item_name: i.item_name,
                firm_id: i.firm_id,
                firm_name: i.firm?.firm_name || i.firm_name,
                group_head: i.group_head?.name,
                uom: i.uom?.name,
                regular_conditions: typeof i.regular_pay_condition === 'string' && i.regular_pay_condition
                    ? i.regular_pay_condition.split(',').map((s: string) => s.trim()).filter(Boolean)
                    : (Array.isArray(i.regular_pay_condition) ? i.regular_pay_condition : []),
                third_party_conditions: typeof i.third_party_pay_condition === 'string' && i.third_party_pay_condition
                    ? i.third_party_pay_condition.split(',').map((s: string) => s.trim()).filter(Boolean)
                    : (Array.isArray(i.third_party_pay_condition) ? i.third_party_pay_condition : []),
            })),
            ...departments.map((d: any) => ({ id: d.id, __table: 'department', department: d.name })),
            ...defaultTerms.map((t: any) => ({
                id: t.id,
                __table: 'default_po_terms',
                default_terms: t.term_text,
                sort_order: t.sort_order,
            })),
        ];
    } catch (error) {
        console.error('Error fetching normalized master records:', error);
        throw error;
    }
}

export async function fetchItemsPaginated(params: { offset?: number; limit?: number; q?: string; order?: string } = {}) {
    const { offset = 0, limit = 50, q, order = 'item_name.asc' } = params;
    const res: any = await apiClient.get('/store/entity/item', { params: { offset, limit, q, order } });
    const raw = res?.data || [];
    const data = raw.map((i: any) => ({
        id: i.id,
        __table: 'item',
        item_name: i.item_name,
        firm_id: i.firm_id,
        firm_name: i.firm?.firm_name || i.firm_name || '--',
        group_head: i.group_head?.name || '',
        uom: i.uom?.name || '',
        regular_conditions: typeof i.regular_pay_condition === 'string' && i.regular_pay_condition
            ? i.regular_pay_condition.split(',').map((s: string) => s.trim()).filter(Boolean)
            : (Array.isArray(i.regular_pay_condition) ? i.regular_pay_condition : []),
        third_party_conditions: typeof i.third_party_pay_condition === 'string' && i.third_party_pay_condition
            ? i.third_party_pay_condition.split(',').map((s: string) => s.trim()).filter(Boolean)
            : (Array.isArray(i.third_party_pay_condition) ? i.third_party_pay_condition : []),
    }));
    return { data, hasMore: !!res?.hasMore, nextCursor: res?.nextCursor };
}

export async function fetchVendorsPaginated(params: { offset?: number; limit?: number; q?: string; order?: string } = {}) {
    const { offset = 0, limit = 50, q, order = 'vendor_name.asc' } = params;
    const res: any = await apiClient.get('/store/entity/vendors', { params: { offset, limit, q, order } });
    const raw = res?.data || [];
    const data = raw.map((v: any) => ({
        id: v.id,
        __table: 'vendors',
        vendor_name: v.vendor_name,
        vendor_gstin: v.gstin || '',
        vendor_address: v.address || '',
        vendor_email: v.email || '',
        payment_term: v.payment_term || '',
        person_name: v.person_name || '',
        responsible_person: v.person_name || '',
        phone: v.phone || '',
        location: v.location || '',
        billing_address: v.address || '',
        destination_address: v.address || '',
        firm_id: v.firm_id,
        firm_name: v.firm?.firm_name || v.firm_name || '--',
    }));
    return { data, hasMore: !!res?.hasMore, nextCursor: res?.nextCursor };
}

export async function fetchContractorsPaginated(params: { offset?: number; limit?: number; q?: string; order?: string } = {}) {
    const { offset = 0, limit = 50, q, order = 'contractor_name.asc' } = params;
    const res: any = await apiClient.get('/store/entity/contractor_details', { params: { offset, limit, q, order } });
    const raw = res?.data || [];
    const data = raw.map((c: any) => ({
        id: c.id,
        contractor_name: c.contractor_name,
        contractor_gstin: c.contractor_gstin || '',
        contractor_address: c.contractor_address || '',
        contractor_email: c.contractor_email || '',
        responsible_person: c.responsible_person || '',
        location: c.location || '',
        phone: c.phone || '',
        firm_id: c.firm_id,
        firm_name: c.firm?.firm_name || c.firm_name || '--',
    }));
    return { data, hasMore: !!res?.hasMore, nextCursor: res?.nextCursor };
}

export async function fetchSiteLocationsPaginated(params: { offset?: number; limit?: number; q?: string; order?: string } = {}) {
    const { offset = 0, limit = 50, q, order = 'location.asc' } = params;
    const res: any = await apiClient.get('/store/entity/site_location_details', { params: { offset, limit, q, order } });
    const raw = res?.data || [];
    const data = raw.map((l: any) => ({
        id: l.id,
        location: l.location,
        firm_id: l.firm_id,
        firm_name: l.firm?.firm_name || l.firm_name || '--',
    }));
    return { data, hasMore: !!res?.hasMore, nextCursor: res?.nextCursor };
}

export async function fetchSiteEngineersPaginated(params: { offset?: number; limit?: number; q?: string; order?: string } = {}) {
    const { offset = 0, limit = 50, q, order = 'name.asc' } = params;
    const res: any = await apiClient.get('/store/entity/site_engineer_details', { params: { offset, limit, q, order } });
    const raw = res?.data || [];
    const data = raw.map((se: any) => ({
        id: se.id,
        name: se.name,
        number: se.number,
        email: se.email,
        firm_id: se.firm_id,
        firm_name: se.firm?.firm_name || se.firm_name || '--',
    }));
    return { data, hasMore: !!res?.hasMore, nextCursor: res?.nextCursor };
}

export async function fetchCompaniesPaginated(params: { offset?: number; limit?: number; q?: string; order?: string } = {}) {
    const { offset = 0, limit = 50, q, order = 'company_name.asc' } = params;
    const res: any = await apiClient.get('/store/entity/company', { params: { offset, limit, q, order } });
    const raw = res?.data || [];
    const data = raw.map((c: any) => ({
        id: c.id,
        __table: 'company',
        company_name: c.company_name,
        company_gstin: c.gstin || '',
        company_pan: c.pan || '',
        company_email: c.email || '',
        company_phone: c.phone || '',
        company_address: c.address || '',
        company_contact_person: c.contact_person || '',
        billing_address: c.billing_address || '',
        destination_address: c.destination_address || '',
    }));
    return { data, hasMore: !!res?.hasMore, nextCursor: res?.nextCursor };
}

export async function fetchFirmsPaginated(params: { offset?: number; limit?: number; q?: string; order?: string } = {}) {
    const { offset = 0, limit = 50, q, order = 'firm_name.asc' } = params;
    const res: any = await apiClient.get('/store/entity/firm', { params: { offset, limit, q, order } });
    const raw = res?.data || [];
    const data = raw.map((f: any) => ({
        id: f.id,
        __table: 'firm',
        firm_name: f.firm_name,
        company_name: f.company?.company_name || '',
        company_address: f.company?.address || '',
        company_gstin: f.company?.gstin || '',
        company_pan: f.company?.pan || '',
        billing_address: f.billing_address || '',
        destination_address: f.destination_address || '',
        company_contact_person: f.contact_person || '',
    }));
    return { data, hasMore: !!res?.hasMore, nextCursor: res?.nextCursor };
}

export async function fetchGroupHeadsPaginated(params: { offset?: number; limit?: number; q?: string; order?: string } = {}) {
    const { offset = 0, limit = 50, q, order = 'name.asc' } = params;
    const res: any = await apiClient.get('/store/entity/group_head', { params: { offset, limit, q, order } });
    const raw = res?.data || [];
    const data = raw.map((g: any) => ({
        id: g.id,
        __table: 'group_head',
        group_head: g.name,
        firm_id: g.firm_id,
        firm_name: g.firm?.firm_name || g.firm_name || '--',
    }));
    return { data, hasMore: !!res?.hasMore, nextCursor: res?.nextCursor };
}

export async function fetchUomsPaginated(params: { offset?: number; limit?: number; q?: string; order?: string } = {}) {
    const { offset = 0, limit = 50, q, order = 'name.asc' } = params;
    const res: any = await apiClient.get('/store/entity/uom', { params: { offset, limit, q, order } });
    const raw = res?.data || [];
    const data = raw.map((u: any) => ({
        id: u.id,
        __table: 'uom',
        uom: u.name,
        firm_id: u.firm_id,
        firm_name: u.firm?.firm_name || u.firm_name || '--',
    }));
    return { data, hasMore: !!res?.hasMore, nextCursor: res?.nextCursor };
}

export async function fetchAreaOfUsesPaginated(params: { offset?: number; limit?: number; q?: string; order?: string } = {}) {
    const { offset = 0, limit = 50, q, order = 'name.asc' } = params;
    const res: any = await apiClient.get('/store/entity/area_of_use', { params: { offset, limit, q, order } });
    const raw = res?.data || [];
    const data = raw.map((a: any) => ({
        id: a.id,
        __table: 'area_of_use',
        area_of_use: a.name,
        firm_id: a.firm_id,
        firm_name: a.firm?.firm_name || a.firm_name || '--',
    }));
    return { data, hasMore: !!res?.hasMore, nextCursor: res?.nextCursor };
}

export async function fetchTermsAndConditionsPaginated(params: { offset?: number; limit?: number; q?: string; order?: string } = {}) {
    const { offset = 0, limit = 50, q, order = 'id.asc' } = params;
    const res: any = await apiClient.get('/store/entity/terms_and_condition', { params: { offset, limit, q, order } });
    const raw = res?.data || [];
    const data = raw.map((t: any) => ({
        id: t.id,
        title: t.title || '',
        name: t.name || '',
        firm_name: t.firm?.firm_name || t.firm_name || '--',
    }));
    return { data, hasMore: !!res?.hasMore, nextCursor: res?.nextCursor };
}

/**
 * Insert a new master registry record into the normalized table for that field.
 */
export async function insertMasterData(data: Record<string, any>): Promise<{ success: boolean; error?: any }> {
    try {
        await upsertNormalizedMasterRecord(data);
        return { success: true };
    } catch (error) {
        console.error('Error inserting normalized master data:', error);
        return { success: false, error };
    }
}

async function upsertNormalizedMasterRecord(values: Record<string, any>, id?: number) {
    invalidateMasterDataCache();
    if ('company_name' in values) {
        const payload = {
            company_name: values.company_name,
            gstin: values.company_gstin || null,
            pan: values.company_pan || null,
            email: values.company_email || null,
            phone: values.company_phone || null,
            address: values.company_address || null,
            contact_person: values.company_contact_person || null,
            billing_address: values.billing_address || null,
            destination_address: values.destination_address || null,
            firm_id: values.firm_id ? Number(values.firm_id) : null,
            firm_name: values.firm_name || null,
        };
        return id ? storeApi.update('company', id, payload) : storeApi.insert('company', payload);
    }

    if ('firm_name' in values && !('item_name' in values) && !('vendor_name' in values) && !('group_head' in values) && !('uom' in values) && !('area_of_use' in values) && !('company_name' in values)) {
        const payload = {
            firm_name: values.firm_name,
            destination_address: values.destination_address || null,
        };
        return id ? storeApi.update('firm', id, payload) : storeApi.insert('firm', payload);
    }

    if ('group_head' in values && !('item_name' in values) && !('uom' in values)) {
        const payload = {
            name: values.group_head,
            firm_id: values.firm_id ? Number(values.firm_id) : null,
            firm_name: values.firm_name || null,
        };
        return id ? storeApi.update('group_head', id, payload) : storeApi.insert('group_head', payload);
    }

    if ('uom' in values && !('item_name' in values) && !('group_head' in values)) {
        const payload = {
            name: values.uom,
            firm_id: values.firm_id ? Number(values.firm_id) : null,
            firm_name: values.firm_name || null,
        };
        return id ? storeApi.update('uom', id, payload) : storeApi.insert('uom', payload);
    }

    if ('area_of_use' in values) {
        const payload = {
            name: values.area_of_use,
            firm_id: values.firm_id ? Number(values.firm_id) : null,
            firm_name: values.firm_name || null,
        };
        return id ? storeApi.update('area_of_use', id, payload) : storeApi.insert('area_of_use', payload);
    }

    if ('department' in values) {
        const payload = { name: values.department };
        return id ? storeApi.update('department', id, payload) : storeApi.insert('department', payload);
    }

    if ('default_terms' in values) {
        const payload = {
            term_text: values.default_terms,
            active: true,
            firm_id: values.firm_id ? Number(values.firm_id) : null,
            firm_name: values.firm_name || null,
        };
        return id ? storeApi.update('default_po_terms', id, payload) : storeApi.insert('default_po_terms', payload);
    }

    if ('vendor_name' in values) {
        const payload = {
            vendor_name: values.vendor_name,
            gstin: values.vendor_gstin || null,
            address: values.vendor_address || null,
            email: values.vendor_email || null,
            payment_term: values.payment_term || null,
            person_name: values.person_name || values.responsible_person || null,
            phone: values.phone || null,
            location: values.location || null,
            firm_id: values.firm_id ? Number(values.firm_id) : null,
            firm_name: values.firm_name || null,
        };
        return id ? storeApi.update('vendors', id, payload) : storeApi.insert('vendors', payload);
    }

    if ('item_name' in values) {
        values.item_name = String(values.item_name ?? '').replace(/\s+/g, ' ').trim();

        let oldName: string | null = null;
        if (id) {
            try {
                const oldItem: any = await storeApi.fetchById('item', id);
                if (oldItem) {
                    oldName = oldItem.item_name;
                }
            } catch {}
        }

        const groupHeadId = await findOrCreateLookupId('group_head', values.group_head);
        const uomId = await findOrCreateLookupId('uom', values.uom);

        let firmId: number | null = null;
        const parsedFirmId = values.firm_id ? Number(values.firm_id) : NaN;
        if (!isNaN(parsedFirmId) && parsedFirmId > 0) {
            firmId = parsedFirmId;
        } else if (values.firm_name && String(values.firm_name).trim()) {
            const firmRecords: any[] = await storeApi.fetch('firm', { firm_name: String(values.firm_name).trim() });
            if (firmRecords?.[0]?.id) {
                firmId = Number(firmRecords[0].id);
            }
        }

        const normalizeConditions = (conditions: any): string | null => {
            if (!Array.isArray(conditions)) return null;
            const items = conditions.map((condition: any) => String((condition?.value ?? condition) || '').trim()).filter(Boolean);
            return items.length > 0 ? items.join(',') : null;
        };
        const payload = {
            item_name: values.item_name,
            group_head_id: groupHeadId,
            uom_id: uomId,
            firm_id: firmId,
            regular_pay_condition: normalizeConditions(values.regular_conditions),
            third_party_pay_condition: normalizeConditions(values.third_party_conditions),
        };
        
        const updateResult = id ? await storeApi.update('item', id, payload) : await storeApi.insert('item', payload);

        if (id && oldName && oldName !== values.item_name) {
            const newName = values.item_name;
            await Promise.all([
                storeApi.updateWhere('inventory', { item_name: oldName }, { item_name: newName }).catch(() => {}),
                storeApi.updateWhere('indent', { product_name: oldName }, { product_name: newName }).catch(() => {}),
                storeApi.updateWhere('store_in', { product_name: oldName }, { product_name: newName }).catch(() => {}),
                storeApi.updateWhere('store_in_direct', { product_name: oldName }, { product_name: newName }).catch(() => {}),
                storeApi.updateWhere('issue', { product_name: oldName }, { product_name: newName }).catch(() => {}),
                storeApi.updateWhere('stock_transfers', { product_name: oldName }, { product_name: newName }).catch(() => {}),
            ]);
        }

        return updateResult;
    }

    if ('group_head' in values || 'uom' in values) {
        if (values.group_head) await findOrCreateLookupId('group_head', values.group_head);
        if (values.uom) await findOrCreateLookupId('uom', values.uom);
        return { error: null };
    }

    throw new Error('Unsupported normalized master payload');
}

async function findOrCreateLookupId(table: 'group_head' | 'uom', name?: string | null) {
    const normalizedName = String(name || '').trim();
    if (!normalizedName) return null;

    const existing: any[] = await storeApi.fetch(table, { ilike__name: normalizedName });
    if (existing?.[0]?.id) return existing[0].id;

    try {
        const inserted: any = await storeApi.insert(table, { name: normalizedName });
        return inserted?.id || null;
    } catch {
        const retry: any[] = await storeApi.fetch(table, { ilike__name: normalizedName });
        return retry?.[0]?.id || null;
    }
}

/**
 * Backward-compatible alias. Writes now go directly to normalized tables.
 */
export async function insertNormalizedMasterData(_type: string, values: Record<string, any>): Promise<{ success: boolean; error?: any }> {
    try {
        void values;
        return { success: true };
    } catch (error) {
        console.error('Error inserting normalized master data:', error);
        return { success: false, error };
    }
}

/**
 * Update an existing normalized master record by ID.
 */
export async function updateMasterData(id: number, data: Record<string, any>): Promise<{ success: boolean; error?: any }> {
    try {
        await upsertNormalizedMasterRecord(data, id);
        return { success: true };
    } catch (error) {
        console.error('Error updating master data:', error);
        return { success: false, error };
    }
}

/**
 * Delete a normalized master record by ID and table/type.
 */
export async function deleteMasterData(id: number, type?: string): Promise<{ success: boolean; error?: any }> {
    try {
        invalidateMasterDataCache();
        const tableByType: Record<string, string> = {
            company: 'company',
            project: 'firm',
            firm: 'firm',
            gh: 'group_head',
            group_head: 'group_head',
            uom: 'uom',
            areaofuse: 'area_of_use',
            area_of_use: 'area_of_use',
            vendor: 'vendors',
            vendors: 'vendors',
            item: 'item',
            dept: 'department',
            department: 'department',
            default_terms: 'default_po_terms',
            default_po_terms: 'default_po_terms',
        };
        const table = tableByType[type || ''];
        if (!table) throw new Error('Delete requires a normalized master record type');

        await storeApi.delete(table, id);
        return { success: true };
    } catch (error) {
        console.error('Error deleting master data:', error);
        return { success: false, error };
    }
}

/**
 * Fetch all Site Incharge Details
 */
export async function fetchSiteEngineers() {
    try {
        const data: any[] = await storeApi.fetch('site_engineer_details', { order: 'name.asc' });
        return (data || []).map((s: any) => ({
            ...s,
            firm_name: s.firm?.firm_name || s.firm_name || '',
        }));
    } catch (error) {
        console.error('Error fetching site engineers:', error);
        throw error;
    }
}

export async function upsertSiteEngineer(data: { id?: number; name: string; number: string; email: string; firm_id?: number | null; firm_name?: string | null }): Promise<{ success: boolean; error?: any }> {
    try {
        invalidateMasterDataCache();
        const payload = {
            name: data.name,
            number: data.number,
            email: data.email,
            firm_id: data.firm_id || null,
            firm_name: data.firm_name || null,
        };
        if (data.id) {
            await storeApi.update('site_engineer_details', data.id, payload);
        } else {
            await storeApi.insert('site_engineer_details', payload);
        }
        return { success: true };
    } catch (error) {
        console.error('Error upserting site engineer:', error);
        return { success: false, error };
    }
}

/**
 * Insert a new site engineer (legacy, now uses upsert)
 */
export async function insertSiteEngineer(data: { id?: number; name: string; number: string; email: string; firm_id?: number | null; firm_name?: string | null }): Promise<{ success: boolean; error?: any }> {
    return upsertSiteEngineer(data);
}

/**
 * Update a site engineer by id
 */
export async function updateSiteEngineer(id: number, data: { name: string; number: string; email: string; firm_id?: number | null; firm_name?: string | null }): Promise<{ success: boolean; error?: any }> {
    try {
        invalidateMasterDataCache();
        await storeApi.update('site_engineer_details', id, {
            name: data.name,
            number: data.number,
            email: data.email,
            firm_id: data.firm_id || null,
            firm_name: data.firm_name || null,
        });
        return { success: true };
    } catch (error) {
        console.error('Error updating site engineer:', error);
        return { success: false, error };
    }
}

/**
 * Delete a site engineer by id
 */
export async function deleteSiteEngineer(id: number): Promise<{ success: boolean; error?: any }> {
    try {
        invalidateMasterDataCache();
        await storeApi.delete('site_engineer_details', id);
        return { success: true };
    } catch (error) {
        console.error('Error deleting site engineer:', error);
        return { success: false, error };
    }
}

/**
 * Contractor Details Functions
 */
export async function fetchContractors() {
    try {
        const data: any[] = await storeApi.fetch('contractor_details', { order: 'contractor_name.asc' });
        return (data || []).map((c: any) => ({
            ...c,
            firm_name: c.firm?.firm_name || c.firm_name || '',
        }));
    } catch (error) {
        console.error('Error fetching contractors:', error);
        throw error;
    }
}

export async function insertContractor(data: any): Promise<{ success: boolean; error?: any }> {
    try {
        invalidateMasterDataCache();
        const payload = {
            ...data,
            firm_id: data.firm_id ? Number(data.firm_id) : null,
            firm_name: data.firm_name || null,
        };
        await storeApi.insert('contractor_details', payload);
        return { success: true };
    } catch (error) {
        console.error('Error inserting contractor:', error);
        return { success: false, error };
    }
}

export async function updateContractor(id: number, data: any): Promise<{ success: boolean; error?: any }> {
    try {
        invalidateMasterDataCache();
        const payload = {
            ...data,
            firm_id: data.firm_id ? Number(data.firm_id) : null,
            firm_name: data.firm_name || null,
        };
        await storeApi.update('contractor_details', id, payload);
        return { success: true };
    } catch (error) {
        console.error('Error updating contractor:', error);
        return { success: false, error };
    }
}

export async function deleteContractor(id: number): Promise<{ success: boolean; error?: any }> {
    try {
        invalidateMasterDataCache();
        await storeApi.delete('contractor_details', id);
        return { success: true };
    } catch (error) {
        console.error('Error deleting contractor:', error);
        return { success: false, error };
    }
}

/**
 * Site Location Functions
 */
export async function fetchSiteLocations() {
    try {
        const data: any[] = await storeApi.fetch('site_location_details', { order: 'location.asc' });
        return (data || []).map((l: any) => ({
            ...l,
            firm_name: l.firm?.firm_name || l.firm_name || '',
        }));
    } catch (error) {
        console.error('Error fetching site locations:', error);
        throw error;
    }
}

export async function insertSiteLocation(data: { location: string; firm_id?: number | null; firm_name?: string | null }): Promise<{ success: boolean; error?: any }> {
    try {
        invalidateMasterDataCache();
        const payload = {
            location: data.location,
            firm_id: data.firm_id ? Number(data.firm_id) : null,
            firm_name: data.firm_name || null,
        };
        await storeApi.insert('site_location_details', payload);
        return { success: true };
    } catch (error) {
        console.error('Error inserting site location:', error);
        return { success: false, error };
    }
}

export async function updateSiteLocation(id: number, data: { location: string; firm_id?: number | null; firm_name?: string | null }): Promise<{ success: boolean; error?: any }> {
    try {
        invalidateMasterDataCache();
        const payload = {
            location: data.location,
            firm_id: data.firm_id ? Number(data.firm_id) : null,
            firm_name: data.firm_name || null,
        };
        await storeApi.update('site_location_details', id, payload);
        return { success: true };
    } catch (error) {
        console.error('Error updating site location:', error);
        return { success: false, error };
    }
}

export async function deleteSiteLocation(id: number): Promise<{ success: boolean; error?: any }> {
    try {
        invalidateMasterDataCache();
        await storeApi.delete('site_location_details', id);
        return { success: true };
    } catch (error) {
        console.error('Error deleting site location:', error);
        return { success: false, error };
    }
}

export async function fetchTermsAndConditions() {
    try {
        const data: any[] = await storeApi.fetch('terms_and_condition', { order: 'id.asc' });
        return (data || []).map((t: any) => ({
            ...t,
            firm_name: t.firm?.firm_name || t.firm_name || '',
        }));
    } catch (error) {
        console.error('Error fetching terms and conditions:', error);
        throw error;
    }
}

export async function insertTermsAndCondition(data: { title: string; name: string; firm_id?: number | null; firm_name?: string | null }): Promise<{ success: boolean; error?: any }> {
    try {
        invalidateMasterDataCache();
        const payload = {
            title: data.title,
            name: data.name,
            firm_id: data.firm_id ? Number(data.firm_id) : null,
            firm_name: data.firm_name || null,
        };
        await storeApi.insert('terms_and_condition', payload);
        return { success: true };
    } catch (error) {
        console.error('Error inserting terms and condition:', error);
        return { success: false, error };
    }
}

export async function updateTermsAndCondition(id: number, data: { title: string; name: string; firm_id?: number | null; firm_name?: string | null }): Promise<{ success: boolean; error?: any }> {
    try {
        invalidateMasterDataCache();
        const payload = {
            title: data.title,
            name: data.name,
            firm_id: data.firm_id ? Number(data.firm_id) : null,
            firm_name: data.firm_name || null,
        };
        await storeApi.update('terms_and_condition', id, payload);
        return { success: true };
    } catch (error) {
        console.error('Error updating terms and condition:', error);
        return { success: false, error };
    }
}

export async function deleteTermsAndCondition(id: number): Promise<{ success: boolean; error?: any }> {
    try {
        invalidateMasterDataCache();
        await storeApi.delete('terms_and_condition', id);
        return { success: true };
    } catch (error) {
        console.error('Error deleting terms and condition:', error);
        return { success: false, error };
    }
}
