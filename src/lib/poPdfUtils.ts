import { pdf, type DocumentProps } from '@react-pdf/renderer';
import React from 'react';
import { toast } from 'sonner';
import POPdf, { type POPdfProps } from '@/components/element/POPdf';
import { getLogoBase64 } from '@/lib/issuePdfUtils';
import { calculateGrandTotal, calculateSubtotal, calculateTotal, calculateTotalGst, formatDate } from '@/lib/utils';
import { fetchMasterData, fetchPoMasterByPoNumber, type PoMasterRecord } from '@/services/poService';

/**
 * Context that disambiguates a PO when multiple historical records share the
 * same po_number (e.g. back-dated imports for different firms).
 * Providing firmId and/or date narrows the filter so only the correct rows
 * are used for PDF generation.
 */
export interface PoFilterContext {
    /** firm_id from the po_master row – preferred over firmName when available */
    firmId?: string | number;
    /** Fallback firm identifier when firm_id is not populated */
    firmName?: string;
    /** Vendor / party name from po_master (party_name / partyName) */
    vendorName?: string;
    /** ISO string or YYYY-MM-DD of the PO created date for disambiguation */
    date?: string;
    /** Optional indent number (legacy/manual fallback) */
    indentNumber?: string;
}

/** Normalise any date-like value to a YYYY-MM-DD string for comparison. */
function toDateKey(value: string | undefined): string {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
}

function buildTermsFromRow(row: PoMasterRecord): { num: string; text: string }[] {
    const terms: { num: string; text: string }[] = [];

    const rawTerms = (row as any).terms;
    if (rawTerms) {
        try {
            const parsed = typeof rawTerms === 'string' ? JSON.parse(rawTerms) : rawTerms;
            if (Array.isArray(parsed) && parsed.length > 0) {
                parsed.forEach((t: any, idx: number) => {
                    const text = typeof t === 'string' ? t : (t.text || (t.title ? `${t.title}: ${t.name}` : ''));
                    if (text) terms.push({ num: String(idx + 1), text });
                });
                if (terms.length > 0) return terms;
            } else if (typeof parsed === 'object' && parsed !== null) {
                let idx = 1;
                for (let i = 1; i <= 20; i++) {
                    if (parsed[`term${i}`]) {
                        terms.push({ num: String(idx++), text: parsed[`term${i}`] });
                    }
                }
                if (Array.isArray(parsed.localTerms)) {
                    parsed.localTerms.forEach((lt: any) => {
                        if (lt.title || lt.name) {
                            terms.push({ num: String(idx++), text: `${lt.title}: ${lt.name}` });
                        }
                    });
                }
                if (terms.length > 0) return terms;
            }
        } catch {
            if (typeof rawTerms === 'string' && rawTerms.trim() && !rawTerms.trim().startsWith('{')) {
                const lines = rawTerms.split('\n').filter(Boolean);
                lines.forEach((line: string, idx: number) => {
                    terms.push({ num: String(idx + 1), text: line });
                });
                if (terms.length > 0) return terms;
            }
        }
    }

    for (let i = 1; i <= 20; i++) {
        const text = (row as any)[`term${i}`];
        if (text) terms.push({ num: String(terms.length + 1), text });
    }
    return terms;
}

/**
 * Rebuilds the Purchase Order PDF props from the current po_master rows for a
 * given PO number, joined against live master data (company/vendor/firm details).
 * Disambiguates by PO number, firm ID, vendor name, and PO created date.
 */
export async function buildPoPdfProps(
    poNumber: string,
    allRows: PoMasterRecord[],
    context?: PoFilterContext,
): Promise<POPdfProps> {
    // Step 1: match by po_number / internal_code
    let targetRows = allRows.filter((r) => r.poNumber === poNumber || r.internalCode === poNumber);

    // Step 2: when a context is provided and there are still multiple candidate
    // groups (duplicate po_numbers from different firms / vendors / dates), narrow further.
    if (context && targetRows.length > 0) {
        const contextDateKey = toDateKey(context.date);

        const narrowed = targetRows.filter((r) => {
            // --- 1. Firm matching ---
            if (context.firmId != null && r.firm_id != null) {
                if (String(r.firm_id) !== String(context.firmId)) return false;
            } else if (context.firmName && r.firmNameMatch) {
                if (r.firmNameMatch.trim().toLowerCase() !== context.firmName.trim().toLowerCase()) return false;
            }

            // --- 2. Vendor name matching ---
            if (context.vendorName) {
                const targetVendor = context.vendorName.trim().toLowerCase();
                const rowVendor = String(r.partyName || (r as any).party_name || '').trim().toLowerCase();
                if (rowVendor && targetVendor && rowVendor !== targetVendor) return false;
            }

            // --- 3. Date matching ---
            if (contextDateKey) {
                const rowDateKey = toDateKey((r as any).po_created_date || r.poCreatedDate || r.timestamp);
                if (rowDateKey && rowDateKey !== contextDateKey) return false;
            }

            return true;
        });

        // Only apply the narrowed set when it actually returned rows — this prevents
        // old back-dated records (where po_created_date may be null) from silently
        // vanishing when the context date can't match them.
        if (narrowed.length > 0) {
            targetRows = narrowed;
        }
    }

    if (targetRows.length === 0) {
        throw new Error(`No PO Master records found for PO number or Indent ${poNumber}`);
    }

    const first = targetRows[0];
    const [masterData, logoBase64] = await Promise.all([fetchMasterData(), getLogoBase64()]);

    const normalizeStr = (s: any) => String(s || '').trim().toLowerCase();
    const firmKey = first.firmNameMatch
        ? Object.keys((masterData as any).firmCompanyMap || {}).find((k) => normalizeStr(k) === normalizeStr(first.firmNameMatch))
        : undefined;
    const firmCompany = firmKey ? (masterData as any).firmCompanyMap?.[firmKey] : undefined;
    const vendor = (masterData as any).vendors?.find((v: any) => normalizeStr(v.vendorName) === normalizeStr(first.partyName));

    // Resolve project destination address for delivery address
    let resolvedDeliveryAddress =
        (first as any).destinationAddress ||
        (first as any).destination_address ||
        (first as any).delivery_address ||
        firmCompany?.destinationAddress ||
        '';

    if (!resolvedDeliveryAddress && (first as any).terms) {
        try {
            const parsed = typeof (first as any).terms === 'string' ? JSON.parse((first as any).terms) : (first as any).terms;
            if (Array.isArray(parsed?.localTerms)) {
                const delTerm = parsed.localTerms.find((lt: any) => normalizeStr(lt.title) === 'delivery address');
                if (delTerm?.name) {
                    resolvedDeliveryAddress = String(delTerm.name).replace(/^\\?"|\\?"$/g, '').trim();
                }
            }
        } catch {
            // ignore
        }
    }

    if (!resolvedDeliveryAddress) {
        resolvedDeliveryAddress = (masterData as any).destinationAddress || '';
    }

    const mappedItems = targetRows.map((r) => ({
        rate: r.rate || 0,
        quantity: r.quantity || 0,
        discountPercent: r.discount || 0,
        gstPercent: r.gst || 0,
    }));

    return {
        poNumber: first.poNumber,
        poDate: first.po_created_date ? formatDate(first.po_created_date) : (first.timestamp ? formatDate(first.timestamp) : ((first as any).created_at ? formatDate((first as any).created_at) : '')),
        deliveryDate: first.deliveryDate ? formatDate(first.deliveryDate) : '',
        supplierName: first.partyName,
        supplierAddress: first.supplierAddress || vendor?.address || '',
        supplierGstin: first.supplierGstin || vendor?.gstin || '',
        supplierContactPerson: vendor?.personName || '',
        supplierPhone: vendor?.phone || '',
        supplierEmail: first.companyEmail || vendor?.vendorEmail || '',
        projectName: first.firmNameMatch || '',
        deliveryAddress: resolvedDeliveryAddress,
        deliveryContactPerson: '',
        deliveryPhone: '',
        deliveryEmail: '',
        siteEngineerName: first.siteEngineerName || '',
        siteEngineerEmail: first.siteEngineerEmail || '',
        siteEngineerPhoneNo: first.siteEngineerPhoneNo || '',
        siteEngineerName2: first.siteEngineerName2 || '',
        siteEngineerEmail2: first.siteEngineerEmail2 || '',
        siteEngineerPhoneNo2: first.siteEngineerPhoneNo2 || '',
        items: targetRows.map((r) => ({
            internalCode: r.internalCode || '',
            quotationNo: r.quotationNumber || '',
            product: r.product || '',
            paymentTerm: r.paymentTerms || '',
            qty: r.quantity || 0,
            unit: r.unit || '',
            rate: r.rate || 0,
            gst: r.gst || 0,
            discount: r.discount || 0,
            amount: calculateTotal(r.rate || 0, r.gst || 0, r.discount || 0, r.quantity || 0),
        })),
        totalAmount: calculateGrandTotal(mappedItems),
        subtotal: calculateSubtotal(mappedItems),
        totalGst: calculateTotalGst(mappedItems),
        terms: buildTermsFromRow(first),
        logo: logoBase64 || '/logo.png',
        companyName: firmCompany?.companyName || (masterData as any).companyName || '',
        companyAddress: firmCompany?.companyAddress || (masterData as any).companyAddress || '',
        companyPhone: (masterData as any).companyPhone || '',
        companyEmail: (masterData as any).companyEmail || '',
        companyGstin: firmCompany?.companyGstin || (masterData as any).companyGstin || '',
        companyPan: firmCompany?.companyPan || (masterData as any).companyPan || '',
        companyContactPerson: (masterData as any).companyContactPerson || '',
    };
}

/**
 * Dynamically regenerates the Purchase Order PDF for a PO number from live data
 * and opens it in a new browser tab. Mirrors openIssuePdfPreview's UX (pre-opened
 * tab with a loading state to dodge popup blockers).
 */
export const openPoPdfPreview = async (
    poNumber: string,
    allRows?: PoMasterRecord[],
    context?: PoFilterContext,
) => {
    const win = window.open('', '_blank');
    if (win) {
        win.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Generating Purchase Order...</title>
                    <style>
                        body {
                            margin: 0;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            height: 100vh;
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                            background-color: #f8fafc;
                            color: #334155;
                        }
                        .loader-container {
                            text-align: center;
                            padding: 2rem;
                            background: white;
                            border-radius: 12px;
                            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                        }
                        .spinner {
                            border: 3px solid #e2e8f0;
                            border-top: 3px solid #4f46e5;
                            border-radius: 50%;
                            width: 36px;
                            height: 36px;
                            animation: spin 0.8s linear infinite;
                            margin: 0 auto 1rem auto;
                        }
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    </style>
                </head>
                <body>
                    <div class="loader-container">
                        <div class="spinner"></div>
                        <p style="font-size: 16px; font-weight: 600; margin: 0 0 4px 0;">Generating Purchase Order</p>
                        <p style="font-size: 13px; color: #64748b; margin: 0;">Please wait while the PDF is generated...</p>
                    </div>
                </body>
            </html>
        `);
    }

    try {
        let rows = (allRows && allRows.length > 0)
            ? allRows.filter((r) => r.poNumber === poNumber || r.internalCode === poNumber)
            : [];

        // When context is provided, try to narrow the in-memory rows to the exact
        // batch that belongs to this firm + date before fetching from the server.
        if (context && rows.length > 0) {
            const contextDateKey = toDateKey(context.date);
            const narrowed = rows.filter((r) => {
                if (context.firmId != null && r.firm_id != null) {
                    if (String(r.firm_id) !== String(context.firmId)) return false;
                } else if (context.firmName && r.firmNameMatch) {
                    if (r.firmNameMatch.trim().toLowerCase() !== context.firmName.trim().toLowerCase()) return false;
                }
                if (contextDateKey) {
                    const rowDateKey = toDateKey((r as any).po_created_date || r.poCreatedDate || r.timestamp);
                    if (rowDateKey && rowDateKey !== contextDateKey) return false;
                }
                return true;
            });
            if (narrowed.length > 0) rows = narrowed;
        }

        if (rows.length === 0) {
            rows = await fetchPoMasterByPoNumber(poNumber);
        }

        if (!rows || rows.length === 0) {
            if (win && !win.closed) win.close();
            toast.info(`No Purchase Order has been created yet for "${poNumber}".`);
            return;
        }

        const props = await buildPoPdfProps(poNumber, rows, context);
        const blob = await pdf(React.createElement(POPdf, props) as React.ReactElement<DocumentProps>).toBlob();
        const blobUrl = URL.createObjectURL(blob);

        if (win && !win.closed) {
            win.location.href = blobUrl;
        } else {
            window.open(blobUrl, '_blank');
        }
    } catch (error) {
        console.error('Error generating PO PDF preview:', error);
        toast.error('Failed to generate Purchase Order PDF');
        if (win && !win.closed) {
            win.close();
        }
    }
};
