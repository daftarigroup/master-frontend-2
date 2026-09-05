import { pdf, type DocumentProps } from '@react-pdf/renderer';
import IssuePdf, { type IssuePdfGroupProps, type Product } from '@/components/element/IssuePdf';
import { formatDate } from '@/lib/utils';
import { type IssueRecord } from '@/services/issueService';
import { toast } from 'sonner';
import React from 'react';

const logoUrl = '/logo.png';

let logoBase64Promise: Promise<string> | null = null;
export const getLogoBase64 = (url: string = logoUrl): Promise<string> => {
    if (!logoBase64Promise) {
        logoBase64Promise = (async () => {
            try {
                const response = await fetch(url);
                const blob = await response.blob();
                return await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(blob);
                });
            } catch (error) {
                console.error('Error fetching logo:', error);
                logoBase64Promise = null;
                return '';
            }
        })();
    }
    return logoBase64Promise;
};

/**
 * Dynamically generates a grouped multi-page Issue or Return PDF slip
 * for an array of IssueRecords (e.g. filtered by date), grouping records by
 * (contractor_name && site_location) into separate pages with Original & Duplicate copies.
 */
export const openGroupedIssuePdfPreview = async (
    type: 'issue' | 'return',
    records: IssueRecord[],
    targetDate?: string
) => {
    if (!records || records.length === 0) {
        toast.error('No records found to generate slip');
        return;
    }

    // Open blank window synchronously on user click to prevent popup blockers
    const win = window.open('', '_blank');
    if (win) {
        win.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Generating ${type === 'issue' ? 'Issue' : 'Return'} Slip...</title>
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
                        <p style="font-size: 16px; font-weight: 600; margin: 0 0 4px 0;">Generating ${type === 'issue' ? 'Issue' : 'Return'} Slip</p>
                        <p style="font-size: 13px; color: #64748b; margin: 0;">Please wait while the PDF preview is generated...</p>
                    </div>
                </body>
            </html>
        `);
    }

    try {
        const logoBase64 = await getLogoBase64(logoUrl);

        // Group records by contractor_name && site_location
        const groupsMap = new Map<string, IssueRecord[]>();
        for (const r of records) {
            const contractor = (r.constructor_name || '').trim();
            const site = (r.site_location || '').trim();
            const key = `${contractor.toLowerCase()}____${site.toLowerCase()}`;
            if (!groupsMap.has(key)) {
                groupsMap.set(key, []);
            }
            groupsMap.get(key)!.push(r);
        }

        const ITEMS_PER_PAGE = 14;
        const pages: IssuePdfGroupProps[] = [];

        for (const [, groupRecords] of groupsMap) {
            const first = groupRecords[0];

            // Resolve date representation
            const rawDate = groupRecords.find((r) => r.actual1)?.actual1 ||
                            groupRecords.find((r) => r.timestamp)?.timestamp ||
                            targetDate;
            const dateStr = rawDate
                ? new Date(rawDate).toLocaleString('en-IN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true,
                  })
                : new Date().toLocaleString('en-IN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true,
                  });

            const rawPlanned = groupRecords.find((r) => r.planned1)?.planned1 || targetDate;
            const plannedDateStr = rawPlanned ? formatDate(new Date(rawPlanned)) : '';

            // Collect distinct remarks
            const distinctRemarks = Array.from(new Set(groupRecords.map((r) => r.issue_to).filter(Boolean)));
            const remarks = distinctRemarks.join(', ') || '-';

            const issuePersonName = groupRecords.find((r) => r.issue_person_name)?.issue_person_name || '';
            const returnPersonName = groupRecords.find((r) => r.return_person_name)?.return_person_name || '';
            const damageRemark = groupRecords.find((r) => r.damage_remark)?.damage_remark || '';
            const totalRejectedDamage = groupRecords.reduce((sum, r) => sum + (Number(r.rejected_damage_qty) || 0), 0);

            const totalPagesForGroup = Math.ceil(groupRecords.length / ITEMS_PER_PAGE);

            for (let p = 0; p < totalPagesForGroup; p++) {
                const chunk = groupRecords.slice(p * ITEMS_PER_PAGE, (p + 1) * ITEMS_PER_PAGE);

                // Format issue numbers cleanly for this chunk so they never overflow
                const chunkIssueNos = Array.from(new Set(chunk.map((r) => r.issue_no).filter(Boolean)));
                let issueNumber = 'IS-UNKNOWN';
                if (chunkIssueNos.length === 1) {
                    issueNumber = chunkIssueNos[0];
                } else if (chunkIssueNos.length <= 3) {
                    issueNumber = chunkIssueNos.join(', ');
                } else {
                    issueNumber = `${chunkIssueNos[0]} - ${chunkIssueNos[chunkIssueNos.length - 1]} (${chunkIssueNos.length} items)`;
                }

                const products: Product[] = chunk.map((r) => {
                    const issuedQty = Number(r.given_qty) > 0 ? Number(r.given_qty) : (Number(r.quantity) || 0);
                    const returnQty = Number(r.rejected_damage_qty) || Number(r.quantity) || 0;
                    return {
                        productName: r.product_name || '',
                        groupHead: r.group_head || '',
                        quantity: type === 'issue' ? issuedQty : returnQty,
                        uom: r.uom || '',
                        remarks: r.issue_to || '',
                        rejectedDamageQty: Number(r.rejected_damage_qty) || 0,
                    };
                });

                pages.push({
                    type,
                    issueNumber,
                    date: dateStr,
                    plannedDate: plannedDateStr,
                    constructorName: first.constructor_name || '',
                    siteLocation: first.site_location || '',
                    projectName: first.firm_name || '',
                    remarks,
                    issuePersonName,
                    returnPersonName,
                    damageRemark,
                    rejectedDamageQty: totalRejectedDamage,
                    products,
                    logo: logoBase64,
                    pageNumber: p + 1,
                    totalPages: totalPagesForGroup,
                    startSr: p * ITEMS_PER_PAGE + 1,
                });
            }
        }

        const pdfDoc = React.createElement(IssuePdf, {
            pages,
        });

        const blob = await pdf(pdfDoc as React.ReactElement<DocumentProps>).toBlob();
        const blobUrl = URL.createObjectURL(blob);

        if (win && !win.closed) {
            win.location.href = blobUrl;
        } else {
            window.open(blobUrl, '_blank');
        }
    } catch (error) {
        console.error(`Error generating ${type} PDF preview:`, error);
        toast.error(`Failed to generate ${type} slip PDF`);
        if (win && !win.closed) {
            win.close();
        }
    }
};

/**
 * Single-record wrapper for backwards compatibility
 */
export const openIssuePdfPreview = async (type: 'issue' | 'return', record: IssueRecord) => {
    return openGroupedIssuePdfPreview(type, [record]);
};
