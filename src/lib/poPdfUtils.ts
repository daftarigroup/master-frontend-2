import { pdf, type DocumentProps } from '@react-pdf/renderer';
import React from 'react';
import { toast } from 'sonner';
import POPdf, { type POPdfProps } from '@/components/element/POPdf';
import { getLogoBase64 } from '@/lib/issuePdfUtils';
import { calculateGrandTotal, calculateSubtotal, calculateTotal, calculateTotalGst, formatDate } from '@/lib/utils';
import { fetchMasterData, type PoMasterRecord } from '@/services/poService';

function buildTermsFromRow(row: PoMasterRecord): { num: string; text: string }[] {
    const terms: { num: string; text: string }[] = [];
    for (let i = 1; i <= 20; i++) {
        const text = (row as any)[`term${i}`];
        if (text) terms.push({ num: String(terms.length + 1), text });
    }
    return terms;
}

/**
 * Rebuilds the Purchase Order PDF props from the current po_master rows for a
 * given PO number, joined against live master data (company/vendor/firm details).
 * Because this re-reads live data, the PDF reflects the current state of those
 * records, not necessarily the exact document as originally issued.
 */
export async function buildPoPdfProps(poNumber: string, allRows: PoMasterRecord[]): Promise<POPdfProps> {
    const rows = allRows.filter((r) => r.poNumber === poNumber || r.internalCode === poNumber);
    if (rows.length === 0) {
        throw new Error(`No PO Master records found for PO number or Indent ${poNumber}`);
    }

    const first = rows[0];
    const [masterData, logoBase64] = await Promise.all([fetchMasterData(), getLogoBase64()]);

    const firmCompany = first.firmNameMatch ? (masterData as any).firmCompanyMap?.[first.firmNameMatch] : undefined;
    const vendor = (masterData as any).vendors?.find((v: any) => v.vendorName === first.partyName);

    const mappedItems = rows.map((r) => ({
        rate: r.rate || 0,
        quantity: r.quantity || 0,
        discountPercent: r.discount || 0,
        gstPercent: r.gst || 0,
    }));

    return {
        poNumber: first.poNumber,
        poDate: first.timestamp ? formatDate(first.timestamp) : ((first as any).created_at ? formatDate((first as any).created_at) : ''),
        deliveryDate: first.deliveryDate ? formatDate(first.deliveryDate) : '',
        supplierName: first.partyName,
        supplierAddress: first.supplierAddress,
        supplierGstin: first.supplierGstin,
        supplierContactPerson: vendor?.personName || '',
        supplierPhone: vendor?.phone || '',
        supplierEmail: first.companyEmail || vendor?.vendorEmail || '',
        projectName: first.firmNameMatch || '',
        deliveryAddress: (masterData as any).destinationAddress || '',
        deliveryContactPerson: '',
        deliveryPhone: '',
        deliveryEmail: '',
        siteEngineerName: first.siteEngineerName || '',
        siteEngineerEmail: first.siteEngineerEmail || '',
        siteEngineerPhoneNo: first.siteEngineerPhoneNo || '',
        siteEngineerName2: first.siteEngineerName2 || '',
        siteEngineerEmail2: first.siteEngineerEmail2 || '',
        siteEngineerPhoneNo2: first.siteEngineerPhoneNo2 || '',
        items: rows.map((r) => ({
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
export const openPoPdfPreview = async (poNumber: string, allRows: PoMasterRecord[]) => {
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

    const hasPoRecord = allRows.some((r) => r.poNumber === poNumber || r.internalCode === poNumber);
    if (!hasPoRecord) {
        if (win && !win.closed) win.close();
        toast.info(`No Purchase Order has been created yet for "${poNumber}".`);
        return;
    }

    try {
        const props = await buildPoPdfProps(poNumber, allRows);
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
