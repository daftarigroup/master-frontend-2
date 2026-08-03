import { pdf, type DocumentProps } from '@react-pdf/renderer';
import IssuePdf from '@/components/element/IssuePdf';
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
 * Dynamically generates an Issue or Return PDF slip for an IssueRecord
 * and opens it in a new browser tab for preview without saving to DB.
 */
export const openIssuePdfPreview = async (type: 'issue' | 'return', record: IssueRecord) => {
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

        const issuedQty = Number(record.given_qty) > 0 ? Number(record.given_qty) : (Number(record.quantity) || 0);
        const returnQty = Number(record.rejected_damage_qty) || Number(record.quantity) || 0;

        const rawDate = record.actual1 || record.timestamp;
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

        const pdfDoc = React.createElement(IssuePdf, {
            type,
            issueNumber: record.issue_no || 'IS-UNKNOWN',
            date: dateStr,
            plannedDate: record.planned1 ? formatDate(new Date(record.planned1)) : '',
            constructorName: record.constructor_name || '',
            siteLocation: record.site_location || '',
            projectName: record.firm_name || '',
            remarks: record.issue_to || '',
            issuePersonName: record.issue_person_name || '',
            returnPersonName: record.return_person_name || '',
            damageRemark: record.damage_remark || '',
            rejectedDamageQty: record.rejected_damage_qty ? Number(record.rejected_damage_qty) : 0,
            products: [
                {
                    productName: record.product_name || '',
                    groupHead: record.group_head || '',
                    quantity: type === 'issue' ? issuedQty : returnQty,
                    uom: record.uom || '',
                },
            ],
            logo: logoBase64,
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
