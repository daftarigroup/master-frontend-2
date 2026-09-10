import { FileText, Building, DollarSign, CheckCircle, AlertCircle, ExternalLink, CheckSquare, XSquare, History, Trash, Loader2 } from 'lucide-react';
import { apiClient, storeApi } from '@/lib/apiClient';
import { hasNoFirmAccess, normalizeFirmAccess } from '@/lib/firmAccess';
import { useSheets } from '@/context/SheetsContext';
import { useEffect, useState } from 'react';
import type { ColumnDef, Row } from '@tanstack/react-table';
import DataTable from '../element/DataTable';
import { useAuth } from '@/context/AuthContext';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { AttachmentUploadField } from '../element/AttachmentUploadField';
import { useAttachmentUpload } from '@/hooks/useAttachmentUpload';
import { toast } from 'sonner';
import { Checkbox } from '../ui/checkbox';
import { formatDate, formatDateTime as formatTimestamp, getPublicFileUrl } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Input } from "../ui/input";
import { uploadPaymentImage } from '@/services/storeInService';
import { applyFirmAccessFilter, isAllowedFirm } from '@/lib/firmAccess';
import { fetchPoMaster } from '@/services/poService';
import { openPoPdfPreview } from '@/lib/poPdfUtils';
import { canDeleteStoreStage } from '@/lib/roleAccess';
import StageDeleteDialog from '../element/StageDeleteDialog';
import { resetPaymentStage } from '@/services/paymentService';
import { useProject } from '@/context/ProjectContext';

interface PaymentsRecord {
    rowIndex?: number;
    timestamp?: string;
    uniqueNo?: string;
    partyName?: string;
    poNumber?: string;
    totalPoAmount?: string | number;
    internalCode?: string;
    product?: string;
    deliveryDate?: string;
    paymentTerms?: string;
    numberOfDays?: string | number;
    pdf?: string;
    payAmount?: string | number;
    file?: string;
    remark?: string;
    totalPaidAmount?: string | number;
    outstandingAmount?: string | number;
    status?: string;
    planned?: string;
    actual?: string;
    delay?: string;
    status1?: string;
    paymentForm?: string;
    firmNameMatch?: string;
    firm_id?: number;
    paymentDone?: boolean;
    billImageStatus?: string;
    billNo?: string;
    rowIds?: number[];
}

interface PaymentHistoryRecord {
    id?: number;
    rowIndex?: number;
    timestamp?: string;
    apPaymentNumber?: string;  // Column B (AP-Payment Number)
    status?: string;
    uniqueNumber?: string;
    fmsName?: string;
    payTo?: string;
    amountToBePaid?: string | number;
    remarks?: string;
    anyAttachments?: string;
    firm_id?: number;
}

interface DisplayPayment {
    rowIndex: number;
    uniqueNo: string;
    partyName: string;
    poNumber: string;
    totalPoAmount: number;
    internalCode: string;
    product: string;
    deliveryDate: string;
    paymentTerms: string;
    numberOfDays: number;
    pdf: string;
    payAmount: number;
    file: string;
    remark: string;
    totalPaidAmount: number;
    outstandingAmount: number;
    status: string;
    planned: string;
    actual: string;
    delay: string;
    status1: string;
    paymentForm: string;
    firmNameMatch: string;
    firm_id?: number;
    billImageStatus?: string;
    billNo?: string;
    rowIds: number[];
}

interface DisplayPaymentHistory {
    id?: number;
    rowIndex: number;
    timestamp: string;
    apPaymentNumber: string;
    status: string;
    uniqueNumber: string;
    fmsName: string;
    payTo: string;
    amountToBePaid: number;
    remarks: string;
    anyAttachments: string;
    planned: string;
    paymentTerms: string;
    billImage: string;
    poImage: string;
    billImageStatus?: string;
    indentNo: string;
    poNumber: string;
    vendorName: string;
    productName: string;
    billNo: string;
    timestamp1: string;
}

interface UpdatePayload {
    rowIndex: number;
    actual: string;
    status: string;
    status1: string;
}

export default function MakePayment() {
    const { user } = useAuth();
    const { effectivePermittedFirms } = useProject();
    // Grab context updaters so global sheets and sidebar badges reflect payment status immediately
    const { updatePaymentsSheet, updateAll: updateGlobalSheets } = useSheets();
    const [paymentsLoading, setPaymentsLoading] = useState(false);
    const [paymentsSheet, setPaymentsSheet] = useState<PaymentsRecord[]>([]);
    const [paymentHistoryLoading, setPaymentHistoryLoading] = useState(false);
    const [paymentHistorySheet, setPaymentHistorySheet] = useState<PaymentHistoryRecord[]>([]);
    const [reloadKey, setReloadKey] = useState(0);
    const updateAll = () => {
        setReloadKey(k => k + 1);
        updateGlobalSheets(true);
    };
    const [pendingData, setPendingData] = useState<DisplayPayment[]>([]);
    const [historyData, setHistoryData] = useState<DisplayPaymentHistory[]>([]);
    const [storeInRecords, setStoreInRecords] = useState<any[]>([]); // To store full metadata
    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
    const [viewingPoNumber, setViewingPoNumber] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<DisplayPaymentHistory | null>(null);

    // TODO(migration): PDF is now generated on-demand, no longer stored — remove after verification
    // payments.pdf/po_master.pdf used to hold a stored PO PDF URL; the PO PDF is now
    // regenerated fresh from po_master + master data on every "View PO" click instead.
    const handleViewPo = async (poNumber: string) => {
        if (!poNumber) return;
        try {
            setViewingPoNumber(poNumber);
            const permittedFirms = effectivePermittedFirms;
            const freshPoMaster = await fetchPoMaster(permittedFirms);
            await openPoPdfPreview(poNumber, freshPoMaster);
        } catch (error) {
            console.error('Error generating PO PDF:', error);
            toast.error('Failed to generate Purchase Order PDF');
        } finally {
            setViewingPoNumber(null);
        }
    };
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [originalData, setOriginalData] = useState<PaymentsRecord[]>([]);
    const [activeTab, setActiveTab] = useState('pending');

    // Payment Modal State
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedPaymentItem, setSelectedPaymentItem] = useState<DisplayPayment | null>(null);
    const [paymentModalStatus, setPaymentModalStatus] = useState('Paid');
    const [paymentModalRemark, setPaymentModalRemark] = useState('');
    const [paymentModalAmount, setPaymentModalAmount] = useState<number | string>('');
    const paymentAttachment = useAttachmentUpload(uploadPaymentImage);

    // No close-reset existed for this modal before — Cancel/Esc/backdrop-click
    // used to leave a stale selected file in state until the next "Make
    // Payment" click overwrote it. Fixed here, matching the pattern elsewhere.
    useEffect(() => {
        if (!isPaymentModalOpen) {
            paymentAttachment.reset();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPaymentModalOpen]);

    const [stats, setStats] = useState({
        total: 0,
        totalAmount: 0,
        pendingCount: 0,
        historyCount: 0
    });

    const parseDateHelper = (dateString: string): Date => {
        if (!dateString) return new Date(0);
        try {
            // Try Standard Parsing
            let date = new Date(dateString);
            if (!isNaN(date.getTime())) return date;

            // Try DD/MM/YYYY
            const parts = dateString.split('/');
            if (parts.length === 3) {
                const day = parseInt(parts[0]);
                const month = parseInt(parts[1]) - 1;
                const year = parts[2].length === 2 ? 2000 + parseInt(parts[2]) : parseInt(parts[2]);
                date = new Date(year, month, day);
                if (!isNaN(date.getTime())) return date;
            }

            // Try YYYY-MM-DD
            date = new Date(dateString.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1'));
            if (!isNaN(date.getTime())) return date;

            return new Date(0);
        } catch {
            return new Date(0);
        }
    };

    useEffect(() => {
        // fetch payments and payment_history from REST API
        const fetchData = async () => {
            try {
                setPaymentsLoading(true);
                setPaymentHistoryLoading(true);

                if (hasNoFirmAccess(effectivePermittedFirms)) {
                    setPaymentsLoading(false);
                    setPaymentHistoryLoading(false);
                    return;
                }
                const firms = normalizeFirmAccess(effectivePermittedFirms);
                const queryParams: Record<string, any> = {};
                if (firms) {
                    const ids = firms.filter(f => /^\d+$/.test(f)).map(Number);
                    const names = firms.filter(f => !/^\d+$/.test(f));
                    if (ids.length > 0) {
                        queryParams['in__firm_id'] = ids.join(',');
                    } else if (names.length > 0) {
                        queryParams['in__firm_name'] = names.join(',');
                    }
                }

                const [paymentsRes, storeInRes, historyRes]: any[] = await Promise.all([
                    apiClient.get('/store/entity/payments', { params: { ...queryParams, order: 'id.desc', limit: 'all' } }),
                    apiClient.get('/store/entity/store_in', { params: { ...queryParams, order: 'indent_no.desc', limit: 'all' } }),
                    apiClient.get('/store/entity/payment_history', { params: { ...queryParams, order: 'id.desc', limit: 'all' } }),
                ]);

                const paymentsData = paymentsRes?.data || [];
                const storeInData = storeInRes?.data || [];
                const historyDbData = historyRes?.data || [];

                const storeInMap = new Map();
                if (storeInData) {
                    setStoreInRecords(storeInData);
                    storeInData.forEach((item: any) => {
                        const indentKey = item.indent_no || item.indent_number || '';
                        if (indentKey) {
                            storeInMap.set(indentKey, {
                                billImageStatus: item.bill_image_status || '',
                                billNo: item.bill_no || ''
                            });
                        }
                    });
                }

                const allPaymentsData = Array.isArray(paymentsData) ? paymentsData : [];

                const mappedPayments: PaymentsRecord[] = allPaymentsData.map((r: any) => ({
                    rowIndex: r.id,
                    timestamp: r.timestamp,
                    uniqueNo: r.unique_no,
                    partyName: r.party_name,
                    poNumber: r.po_number,
                    totalPoAmount: r.total_po_amount,
                    internalCode: r.internal_code,
                    product: r.product,
                    deliveryDate: r.delivery_date,
                    paymentTerms: r.payment_terms,
                    numberOfDays: r.number_of_days,
                    pdf: r.pdf,
                    payAmount: r.pay_amount,
                    file: r.file,
                    remark: r.remark,
                    totalPaidAmount: r.total_paid_amount,
                    outstandingAmount: r.outstanding_amount,
                    status: r.status,
                    planned: r.planned,
                    actual: r.actual,
                    delay: r.delay,
                    paymentForm: r.payment_form,
                    firmNameMatch: r.firm_name,
                    firm_id: r.firm_id,
                    paymentDone: r.payment_done || false,
                    billImageStatus: storeInMap.get(r.internal_code)?.billImageStatus || '',
                    billNo: storeInMap.get(r.internal_code)?.billNo || '',
                    rowIds: [r.id],
                }));

                setOriginalData(mappedPayments);
                setPaymentsSheet(mappedPayments);

                const permittedFirms = (user?.firm_access || []).map((f: string) => f.trim().toLowerCase());
                const hasAllAccess = permittedFirms.includes('all');

                // Filter Pending: Has planned date, status is not 'Completed', and firm access matches
                const pendingBasic = mappedPayments
                    .filter((sheet: PaymentsRecord) => {
                        if (!isAllowedFirm({ id: sheet.firm_id, name: sheet.firmNameMatch }, user?.firm_access)) return false;
                        const status = String(sheet?.status || '').toLowerCase();
                        const isCompleted = status === 'completed';

                        // Check payment terms: Show if term contains advance or PI (any variant)
                        const terms = String(sheet?.paymentTerms || '').toLowerCase();
                        const isAdvanceTerm = terms.includes('advance') || terms.includes('pi');

                        // Check linked Store In for HOD status: Only show if at least one matching store_in entry is Approved
                        const matchingStoreIns = (storeInData || []).filter((s: any) =>
                            (s.indent_no || s.indent_number) === sheet.internalCode &&
                            (!sheet.product || (s.product_name || s.productName || s.product) === sheet.product)
                        );
                        if (matchingStoreIns.length > 0) {
                            const hasApproved = matchingStoreIns.some((s: any) => (s.hod_status || s.hodStatus) === 'Approved');
                            if (!hasApproved) return false;
                        }

                        return !isCompleted;
                    });

                // Filter to show only the latest record for each Indent Number and Product
                const seenPending = new Set();
                const latestPending = [];
                for (const record of pendingBasic) {
                    const key = `${record.internalCode}-${record.product}`;
                    if (!seenPending.has(key)) {
                        seenPending.add(key);
                        latestPending.push(record);
                    }
                }

                const pendingItems: DisplayPayment[] = latestPending.map((sheet: PaymentsRecord, index) => ({
                    rowIndex: sheet?.rowIndex || index,
                    uniqueNo: sheet?.uniqueNo || '',
                    partyName: sheet?.partyName || '',
                    poNumber: sheet?.poNumber || '',
                    totalPoAmount: Number(sheet?.totalPoAmount || 0),
                    internalCode: sheet?.internalCode || '',
                    product: sheet?.product || '',
                    deliveryDate: sheet?.deliveryDate || '',
                    paymentTerms: sheet?.paymentTerms || '',
                    numberOfDays: Number(sheet?.numberOfDays || 0),
                    pdf: sheet?.pdf || '',
                    payAmount: Number(sheet?.payAmount || 0),
                    file: sheet?.file || '',
                    remark: sheet?.remark || '',
                    totalPaidAmount: Number(sheet?.totalPaidAmount || 0),
                    outstandingAmount: Number(sheet?.outstandingAmount || 0),
                    status: sheet?.status || 'Pending',
                    planned: sheet?.planned || '',
                    actual: sheet?.actual || '',
                    delay: sheet?.delay || '',
                    status1: sheet?.status1 || '',
                    paymentForm: sheet?.paymentForm || '',
                    firmNameMatch: sheet?.firmNameMatch || '',
                    firm_id: sheet?.firm_id,
                    billImageStatus: sheet?.billImageStatus || '',
                    billNo: sheet?.billNo || '',
                    rowIds: sheet?.rowIds || [],
                }));

                // Group by Bill No + Party Name
                const groupedPendingMap = new Map<string, DisplayPayment>();
                pendingItems.forEach((item: any) => {
                    const billKey = item.billNo || item.uniqueNo || item.poNumber || String(item.rowIndex);
                    const uniqueKey = `${item.partyName || 'NoVendor'}-${billKey}`;

                    if (!groupedPendingMap.has(uniqueKey)) {
                        groupedPendingMap.set(uniqueKey, { ...item });
                    } else {
                        const existing = groupedPendingMap.get(uniqueKey)!;
                        // Add rowIds
                        existing.rowIds = [...existing.rowIds, ...item.rowIds];

                        // Concatenate products
                        const existingProducts = existing.product.split(', ').map((p: any) => p.trim());
                        if (item.product && !existingProducts.includes(item.product.trim())) {
                            existing.product = [...existingProducts, item.product.trim()].join(', ');
                        }

                        // Sum Amounts
                        existing.payAmount += item.payAmount;
                        existing.outstandingAmount += item.outstandingAmount;
                        existing.totalPaidAmount += item.totalPaidAmount;
                    }
                });

                const sortedPending = Array.from(groupedPendingMap.values()).sort((a, b) => b.rowIndex - a.rowIndex);
                setPendingData(sortedPending);

                // 2. Fetch History directly from payment_history table
                const historyItemsFromDb = (historyDbData || [])
                    .filter((r: any) => {
                        return isAllowedFirm({ id: r.firm_id, name: r.fms_name }, user?.firm_access);
                    })
                    .map((r: any, index: number) => ({
                        id: r.id,
                        rowIndex: r.id || index,
                        timestamp: r.timestamp || '',
                        apPaymentNumber: r.ap_payment_number || '',
                        status: r.status || '',
                        uniqueNumber: r.unique_number || '',
                        fmsName: r.fms_name || '',
                        payTo: r.pay_to || '',
                        amountToBePaid: Number(r.amount_to_be_paid) || 0,
                        remarks: r.remarks || '',
                        anyAttachments: r.any_attachments || '',
                        firm_id: r.firm_id,
                        planned: r.planned || '',
                        paymentTerms: r.payment_terms || r.paymentTerms || '',
                        billImage: r.photo_of_bill || r.any_attachments || '',
                        poImage: r.any_attachments || '',
                        billImageStatus: r.bill_status || '',
                        indentNo: r.indent_no || '',
                        poNumber: r.po_number || '',
                        vendorName: r.vendor_name || '',
                        productName: r.product_name || '',
                        billNo: r.bill_no || '',
                        timestamp1: r.timestamp1 || '',
                    }));

                // 3. Merge History: items from payment_history table + completed items from payments table
                const completedPaymentsFromTable = mappedPayments
                    .filter((p: any) => p.paymentDone && isAllowedFirm({ id: p.firm_id, name: p.firmNameMatch }, user?.firm_access))
                    .map((p) => ({
                        id: p.rowIndex || 0,
                        rowIndex: p.rowIndex || 0,
                        timestamp: p.actual || p.timestamp || '',
                        apPaymentNumber: `AP-AUTO-${p.rowIndex}`,
                        status: 'Paid',
                        uniqueNumber: p.uniqueNo || '',
                        fmsName: p.firmNameMatch || '',
                        payTo: p.partyName || '',
                        amountToBePaid: Number(p.payAmount) || 0,
                        remarks: p.remark || 'Payment Completed',
                        anyAttachments: p.file || p.pdf || '',
                        firm_id: p.firm_id,
                        planned: p.planned || '',
                        paymentTerms: p.paymentTerms || '',
                        billImage: p.file || p.pdf || '',
                        poImage: p.pdf || '',
                        billImageStatus: p.billImageStatus || '',
                        liftNumber: '',
                        indentNo: p.internalCode || '',
                        poNumber: p.poNumber || '',
                        vendorName: p.partyName || '',
                        productName: p.product || '',
                        billNo: p.billNo || '',
                        qty: '',
                        typeOfBill: '',
                        billAmount: String(p.payAmount),
                        discountAmount: '',
                        paymentType: '',
                        advanceAmountIfAny: '',
                        transportationInclude: '',
                        transporterName: '',
                        amount: String(p.payAmount),
                        billRemark: p.remark || '',
                        timestamp1: p.actual || '',
                        vehicle_no: '',
                        driver_name: '',
                        driver_mobile_no: '',
                    }));

                // Combine and deduplicate by uniqueNumber + amount
                const combinedHistory = [...historyItemsFromDb];
                const seenHistoryKeys = new Set(historyItemsFromDb.map((h: any) => `${h.uniqueNumber}-${h.amountToBePaid}`));
                
                completedPaymentsFromTable.forEach((p: any) => {
                    const key = `${p.uniqueNumber}-${p.amountToBePaid}`;
                    if (!seenHistoryKeys.has(key)) {
                        combinedHistory.push(p);
                        seenHistoryKeys.add(key);
                    }
                });

                // Sort by timestamp descending
                combinedHistory.sort((a, b) => {
                    const dateA = new Date(a.timestamp).getTime();
                    const dateB = new Date(b.timestamp).getTime();
                    return dateB - dateA;
                });

                setHistoryData(combinedHistory);

                const totalAmount = sortedPending.reduce((sum, item) => sum + item.outstandingAmount, 0);
                setStats({
                    total: sortedPending.length,
                    totalAmount,
                    pendingCount: sortedPending.length,
                    historyCount: combinedHistory.length
                });

                setSelectedRows(new Set());

            } catch (error) {
                console.error('❌ Error in Make Payment fetchData:', error);
                setPendingData([]);
                setHistoryData([]);
            } finally {
                setPaymentsLoading(false);
                setPaymentHistoryLoading(false);
            }
        };

        fetchData();
    }, [reloadKey, user?.username, effectivePermittedFirms]);

    const handleSelectAll = () => {
        if (selectedRows.size === pendingData.length) {
            setSelectedRows(new Set());
        } else {
            const allRowIndices = pendingData.map((_, index) => index);
            setSelectedRows(new Set(allRowIndices));
        }
    };

    const handleSelectRow = (rowIndex: number) => {
        const newSelected = new Set(selectedRows);
        if (newSelected.has(rowIndex)) {
            newSelected.delete(rowIndex);
        } else {
            newSelected.add(rowIndex);
        }
        setSelectedRows(newSelected);
    };

    const handleSubmitSelected = async () => {
        if (selectedRows.size === 0) {
            toast.error('Please select at least one payment to mark as completed');
            return;
        }

        setIsSubmitting(true);
        const isoNow = new Date().toISOString();
        const currentDateOnly = isoNow.split('T')[0];

        try {
            const selectedItems = Array.from(selectedRows).map((index: any) => pendingData[index]);
            const ids = selectedItems.flatMap(item => item.rowIds).filter(Boolean);
            
            if (ids.length === 0) {
                toast.error('Could not find matching records to update');
                setIsSubmitting(false);
                return;
            }

            await storeApi.updateWhere('payments', { in__id: ids.join(',') }, {
                actual: currentDateOnly,
                status: 'Completed',
                status1: 'ok',
                payment_done: true
            });

            const historyRows = selectedItems.map((item: any) => {
                const storeIn = storeInRecords.find((si: any) =>
                    si.po_number === item.poNumber &&
                    (si.indent_no === item.internalCode || si.indent_number === item.internalCode)
                );
                const apPaymentNumber = `AP-${Math.floor(1000 + Math.random() * 9000)}`;

                return {
                    timestamp: isoNow,
                    ap_payment_number: apPaymentNumber,
                    status: 'Paid',
                    unique_number: item.uniqueNo,
                    fms_name: item.firmNameMatch,
                    pay_to: item.partyName,
                    amount_to_be_paid: String(item.payAmount),
                    remarks: item.remark || `Payment completed for ${item.uniqueNo}`,
                    any_attachments: item.file || item.pdf || '',
                    timestamp1: isoNow,
                    planned: item.planned || null,
                    payment_terms: item.paymentTerms || null,
                    indent_no: item.internalCode,
                    po_number: item.poNumber,
                    product_name: item.product,
                    bill_no: item.billNo || '',
                    firm_id: item.firm_id || null,
                };
            });

            try {
                await storeApi.insert('payment_history', historyRows);
            } catch (historyErr) {
                console.warn('⚠️ Error inserting into payment_history:', historyErr);
            }

            toast.success(`Successfully updated ${ids.length} payment(s)`);
            setTimeout(() => updateAll(), 800);
            // Refresh context so sidebar badge decrements immediately
            updatePaymentsSheet(true);
            setSelectedRows(new Set());
        } catch (error) {
            console.error('❌ Error submitting payments:', error);
            toast.error('Error updating payments.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSinglePaymentSubmit = async () => {
        if (!selectedPaymentItem) return;

        setIsSubmitting(true);
        const isoNow = new Date().toISOString();
        const currentDateOnly = isoNow.split('T')[0];

        try {
            // Already uploaded directly to S3 at selection time (falls back to
            // any pre-existing file if the user didn't pick a new one).
            const attachmentUrl = paymentAttachment.url || selectedPaymentItem.file || selectedPaymentItem.pdf || '';

            const ids = selectedPaymentItem.rowIds || [selectedPaymentItem.rowIndex];
            
            await storeApi.updateWhere('payments', { in__id: ids.join(',') }, {
                actual: currentDateOnly,
                status: paymentModalStatus === 'Complete' ? 'Completed' : paymentModalStatus,
                status1: 'ok',
                payment_done: paymentModalStatus === 'Complete',
                pay_amount: paymentModalAmount
            });

            const storeIn = storeInRecords.find((si: any) =>
                si.po_number === selectedPaymentItem.poNumber &&
                (si.indent_no === selectedPaymentItem.internalCode || si.indent_number === selectedPaymentItem.internalCode)
            );

            const apPaymentNumber = `AP-${Math.floor(1000 + Math.random() * 9000)}`;

            const historyRow = {
                timestamp: isoNow,
                ap_payment_number: apPaymentNumber,
                status: paymentModalStatus,
                unique_number: selectedPaymentItem.uniqueNo,
                fms_name: selectedPaymentItem.firmNameMatch,
                firm_id: selectedPaymentItem.firm_id || null,
                pay_to: selectedPaymentItem.partyName,
                amount_to_be_paid: String(paymentModalAmount),
                remarks: paymentModalRemark || `Payment completed for ${selectedPaymentItem.uniqueNo}`,
                any_attachments: attachmentUrl,
                timestamp1: isoNow,
                planned: selectedPaymentItem.planned ? selectedPaymentItem.planned : null,
                payment_terms: selectedPaymentItem.paymentTerms || '',
                indent_no: selectedPaymentItem.internalCode,
                po_number: selectedPaymentItem.poNumber,
                product_name: selectedPaymentItem.product,
                lift_number: storeIn?.lift_number || '',
                bill_status: storeIn?.bill_status || '',
                bill_no: String(storeIn?.bill_no || ''),
                qty: String(storeIn?.qty || ''),
                vendor_name: storeIn?.vendor_name || selectedPaymentItem.partyName,
                type_of_bill: storeIn?.type_of_bill || '',
                bill_amount: String(storeIn?.bill_amount || ''),
                discount_amount: String(storeIn?.discount_amount || ''),
                payment_type: storeIn?.payment_type || '',
                advance_amount_if_any: String(storeIn?.advance_amount_if_any || ''),
                photo_of_bill: storeIn?.photo_of_bill || selectedPaymentItem.file || '',
                transportation_include: storeIn?.transportation_include || '',
                transporter_name: storeIn?.transporter_name || '',
                amount: String(storeIn?.amount || ''),
                vehicle_no: storeIn?.vehicle_no || '',
                driver_name: storeIn?.driver_name || '',
                driver_mobile_no: storeIn?.driver_mobile_no || '',
                bill_remark: storeIn?.bill_remark || paymentModalRemark || '',
            };

            try {
                await storeApi.insert('payment_history', [historyRow]);
            } catch (historyErr) {
                console.warn('⚠️ Error inserting into payment_history:', historyErr);
            }

            toast.success(`Successfully recorded payment`);
            setIsPaymentModalOpen(false);
            paymentAttachment.reset({ committed: true });
            setTimeout(() => updateAll(), 800);
            // Refresh context so sidebar badge decrements immediately
            updatePaymentsSheet(true);
            
        } catch (error) {
            console.error('❌ Error submitting payment:', error);
            toast.error('Error updating payment.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const pendingColumns: ColumnDef<DisplayPayment>[] = [
        {
            id: 'select',
            header: () => (
                <div className="flex items-center">
                    <Checkbox
                        checked={selectedRows.size === pendingData.length && pendingData.length > 0}
                        onCheckedChange={handleSelectAll}
                        className="mr-2"
                    />
                    Select
                </div>
            ),
            cell: ({ row }: { row: Row<DisplayPayment> }) => {
                const isSelected = selectedRows.has(row.index);
                return (
                    <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleSelectRow(row.index)}
                        className="mr-2"
                    />
                );
            },
        },
        {
            id: 'action',
            header: 'Action',
            cell: ({ row }: { row: Row<DisplayPayment> }) => {
                const item = row.original;
                const hasPaymentForm = item.paymentForm?.trim() !== '';

                return (
                    <div className="flex gap-2">
                        {hasPaymentForm ? (
                            <Button
                                variant="default"
                                size="sm"
                                onClick={() => {
                                    setSelectedPaymentItem(item);
                                    setPaymentModalRemark(item.remark || '');
                                    setPaymentModalStatus('Complete');
                                    setPaymentModalAmount(item.payAmount || '');
                                    paymentAttachment.reset();
                                    setIsPaymentModalOpen(true);
                                }}
                                className="bg-green-600 hover:bg-green-700 shadow-sm"
                            >
                                <DollarSign className="mr-2 h-3 w-3" />
                                Make Payment
                            </Button>
                        ) : (
                            <Button
                                variant="outline"
                                size="sm"
                                disabled
                                className="text-gray-400"
                            >
                                No Form Link
                            </Button>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'firmNameMatch',
            header: 'Project Name',
            cell: ({ row }) => (
                <span className="font-medium text-blue-700">{row.original.firmNameMatch || '-'}</span>
            )
        },
        {
            accessorKey: 'planned',
            header: 'Planned Date',
            cell: ({ row }) => (
                <span className="text-sm font-medium text-blue-600">
                    {formatDate(row.original.planned) || '-'}
                </span>
            )
        },
        {
            accessorKey: 'uniqueNo',
            header: 'Payment No.',
            cell: ({ row }) => (
                <div className="bg-gray-50 py-1 px-3 rounded-md inline-block border">
                    {row.original.uniqueNo || '-'}
                </div>
            )
        },
        {
            accessorKey: 'poNumber',
            header: 'PO Number',
            cell: ({ row }) => (
                <div className="font-medium text-purple-700">
                    <div>{row.original.poNumber || '-'}</div>
                </div>
            )
        },
        {
            accessorKey: 'partyName',
            header: 'Party Name',
            cell: ({ row }) => (
                <span className="font-medium">{row.original.partyName || '-'}</span>
            )
        },
        {
            accessorKey: 'paymentTerms',
            header: 'Payment Terms',
            cell: ({ row }) => (
                <span className="text-sm italic text-gray-600">{row.original.paymentTerms || '-'}</span>
            )
        },
        {
            accessorKey: 'internalCode',
            header: 'Indent No.',
            cell: ({ row }) => (
                <div className="bg-gray-50 py-1 px-3 rounded-md inline-block border">
                    {row.original.internalCode || '-'}
                </div>
            )
        },
        {
            accessorKey: 'product',
            header: 'Product',
            cell: ({ row }) => (
                <span className="text-sm">{row.original.product || '-'}</span>
            )
        },
        {
            accessorKey: 'totalPoAmount',
            header: 'Total Amount',
            cell: ({ row }) => (
                <span className="font-bold text-purple-600">₹{row.original.totalPoAmount?.toLocaleString('en-IN')}</span>
            )
        },
        {
            accessorKey: 'payAmount',
            header: 'Pay Amount',
            cell: ({ row }) => (
                <span className="font-bold text-emerald-600">
                    ₹{row.original.payAmount?.toLocaleString('en-IN')}
                </span>
            )
        },
        {
            accessorKey: 'outstandingAmount',
            header: 'Pending',
            cell: ({ row }) => {
                const total = Number(row.original.totalPoAmount) || 0;
                const paid = Number(row.original.payAmount) || 0;
                const pending = total - paid;
                return (
                    <span className="font-semibold text-red-600">
                        ₹{pending.toLocaleString('en-IN')}
                    </span>
                );
            }
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => {
                const status = row.original.status?.toLowerCase() || '';
                const isPending = status === 'pending' || status === '';
                const isComplete = status === 'complete' || status === 'completed';

                return (
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${isComplete
                        ? 'bg-green-100 text-green-800 border border-green-300'
                        : isPending
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-gray-100 text-gray-800 border border-gray-300'
                        }`}>
                        {isComplete && <CheckCircle className="mr-1 h-3 w-3" />}
                        {isPending && <AlertCircle className="mr-1 h-3 w-3" />}
                        {row.original.status || 'Pending'}
                    </span>
                );
            }
        },
        {
            accessorKey: 'remark',
            header: 'Remark',
            cell: ({ row }) => (
                <span className="text-xs text-gray-500 truncate max-w-[150px] inline-block">
                    {row.original.remark || '-'}
                </span>
            )
        }
    ];

    const historyColumns: ColumnDef<DisplayPaymentHistory>[] = [
        {
            accessorKey: 'timestamp',
            header: 'Date',
            cell: ({ getValue }) => (
                <span className="text-xs">{formatTimestamp(getValue() as string) || '-'}</span>
            )
        },
        {
            accessorKey: 'apPaymentNumber',
            header: 'AP No.',
            cell: ({ row }) => (
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200">
                    {row.original.apPaymentNumber || '-'}
                </span>
            )
        },
        {
            accessorKey: 'uniqueNumber',
            header: 'Payment No.',
            cell: ({ row }) => (
                <span className="text-xs font-medium">{row.original.uniqueNumber || '-'}</span>
            )
        },
        {
            accessorKey: 'fmsName',
            header: 'Project Name',
            cell: ({ row }) => (
                <span className="text-xs font-medium text-slate-700">{row.original.fmsName || '-'}</span>
            )
        },
        {
            accessorKey: 'payTo',
            header: 'Paid To',
            cell: ({ row }) => (
                <span className="text-xs font-semibold text-slate-800">{row.original.payTo || '-'}</span>
            )
        },
        {
            accessorKey: 'productName',
            header: 'Product',
            cell: ({ row }) => (
                <span className="text-xs text-slate-600 truncate max-w-[120px] inline-block">
                    {row.original.productName || '-'}
                </span>
            )
        },
        {
            accessorKey: 'amountToBePaid',
            header: 'Amount Paid',
            cell: ({ row }) => (
                <span className="font-bold text-emerald-700">₹{row.original.amountToBePaid?.toLocaleString('en-IN')}</span>
            )
        },
        {
            accessorKey: 'remarks',
            header: 'Remarks',
            cell: ({ row }) => (
                <span className="text-xs italic text-slate-500 truncate max-w-[150px] inline-block">
                    {row.original.remarks || '-'}
                </span>
            )
        },
        {
            id: 'attachments',
            header: 'Attachments',
            cell: ({ row }) => {
                const attachments = row.original.anyAttachments;
                const bill = row.original.billImage;
                const poNumber = row.original.poNumber;
                const isGeneratingPo = viewingPoNumber === poNumber;
                return (
                    <div className="flex gap-2">
                        {attachments && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600" asChild>
                                <a href={getPublicFileUrl(attachments)} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                            </Button>
                        )}
                        {bill && bill !== attachments && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-purple-600" asChild title="View Bill">
                                <a href={getPublicFileUrl(bill)} target="_blank" rel="noopener noreferrer">
                                    <FileText className="h-3.5 w-3.5" />
                                </a>
                            </Button>
                        )}
                        {/* TODO(migration): PDF is now generated on-demand, no longer stored — remove after verification */}
                        {poNumber && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-amber-600"
                                title="View PO"
                                disabled={isGeneratingPo}
                                onClick={() => handleViewPo(poNumber)}
                            >
                                {isGeneratingPo ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <FileText className="h-3.5 w-3.5" />
                                )}
                            </Button>
                        )}
                    </div>
                );
            }
        },
        {
            id: 'stage_delete_action',
            header: 'Action',
            cell: ({ row }: { row: Row<DisplayPaymentHistory> }) => {
                const canDelete = canDeleteStoreStage(user as any, 'finance_logistics');
                if (!canDelete) return null;
                return (
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteTarget(row.original)}
                        className="flex items-center gap-1 text-red-600 hover:text-red-800 hover:bg-red-50 h-7 px-2 text-xs"
                        title="Delete Payment Record"
                    >
                        <Trash className="h-3.5 w-3.5" />
                        Delete
                    </Button>
                );
            },
        }
    ];

    return (
        <div className="container mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-7xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 sm:p-6 rounded-xl shadow-xs border border-slate-100">
                <div className="flex items-center gap-3 sm:gap-4">
                    <div className="bg-primary/10 p-2.5 sm:p-3 rounded-full shrink-0">
                        <DollarSign className="size-6 sm:size-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">Make Payment</h1>
                        <p className="text-slate-500 text-xs sm:text-sm">Schedule and confirm vendor transactions</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 sm:flex gap-3 sm:gap-6 w-full md:w-auto">
                    <Card className="shadow-none border border-emerald-100 sm:border-none bg-emerald-50/50 flex-1 sm:flex-none">
                        <CardContent className="p-2.5 sm:p-3 flex flex-col items-center text-center">
                            <span className="text-[10px] sm:text-xs text-emerald-600 font-semibold uppercase tracking-wider">Total Pending</span>
                            <span className="text-sm sm:text-2xl font-bold text-emerald-700 truncate max-w-full">₹{stats.totalAmount.toLocaleString('en-IN')}</span>
                        </CardContent>
                    </Card>
                    <Card className="shadow-none border border-blue-100 sm:border-none bg-blue-50/50 flex-1 sm:flex-none">
                        <CardContent className="p-2.5 sm:p-3 flex flex-col items-center text-center">
                            <span className="text-[10px] sm:text-xs text-blue-600 font-semibold uppercase tracking-wider">Pending Tasks</span>
                            <span className="text-sm sm:text-2xl font-bold text-blue-700">{stats.pendingCount}</span>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Tabs defaultValue="pending" className="w-full" onValueChange={setActiveTab}>
                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 mb-4">
                    <TabsList className="bg-slate-100/60 p-1 w-full sm:w-auto">
                        <TabsTrigger value="pending" className="flex-1 sm:flex-none text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-xs">
                            <DollarSign className="w-4 h-4 mr-1.5" />
                            Pending Payments
                        </TabsTrigger>
                        <TabsTrigger value="history" className="flex-1 sm:flex-none text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-xs">
                            <History className="w-4 h-4 mr-1.5" />
                            Payment History
                        </TabsTrigger>
                    </TabsList>

                    {activeTab === 'pending' && selectedRows.size > 0 && (
                        <Button 
                            onClick={handleSubmitSelected} 
                            disabled={isSubmitting}
                            className="w-full sm:w-auto bg-primary hover:bg-primary/90 shadow-md"
                        >
                            {isSubmitting ? 'Updating...' : `Mark ${selectedRows.size} as Paid`}
                        </Button>
                    )}
                </div>

                <TabsContent value="pending">
                    <Card className="border-slate-200 shadow-sm overflow-hidden">
                        <CardContent className="p-0">
                            <DataTable
                                columns={pendingColumns}
                                data={pendingData}
                                dataLoading={paymentsLoading}
                                searchFields={['partyName', 'uniqueNo', 'poNumber', 'internalCode', 'firmNameMatch']}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="history">
                    <Card className="border-slate-200 shadow-sm overflow-hidden">
                        <CardContent className="p-0">
                            <DataTable
                                columns={historyColumns}
                                data={historyData}
                                dataLoading={paymentHistoryLoading}
                                searchFields={['payTo', 'uniqueNumber', 'apPaymentNumber', 'fmsName']}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Payment Confirmation Modal */}
            <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
                <DialogContent className="w-[95vw] sm:w-full sm:max-w-[500px] p-4 sm:p-6 rounded-2xl sm:rounded-xl max-h-[92vh] flex flex-col overflow-hidden">
                    <DialogHeader className="text-left pr-6 shrink-0">
                        <DialogTitle className="text-lg sm:text-xl font-bold">Confirm Payment</DialogTitle>
                        <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                            Enter details for payment <span className="font-bold text-primary">{selectedPaymentItem?.uniqueNo}</span>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 sm:gap-6 py-3 overflow-y-auto pr-1 flex-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs sm:text-sm text-slate-600">Vendor</Label>
                                <div className="text-xs sm:text-sm font-semibold p-2.5 bg-slate-50 rounded-lg border truncate" title={selectedPaymentItem?.partyName}>{selectedPaymentItem?.partyName}</div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs sm:text-sm text-slate-600">PO Number</Label>
                                <div className="text-xs sm:text-sm font-semibold p-2.5 bg-slate-50 rounded-lg border truncate">{selectedPaymentItem?.poNumber}</div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="amount" className="text-xs sm:text-sm">Payment Amount (₹)</Label>
                            <Input
                                id="amount"
                                type="number"
                                value={paymentModalAmount}
                                onChange={(e) => setPaymentModalAmount(e.target.value)}
                                placeholder="Enter amount paid"
                                className="text-base sm:text-lg font-bold text-emerald-700 h-10 sm:h-11"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="status" className="text-xs sm:text-sm">Status</Label>
                                <Select value={paymentModalStatus} onValueChange={setPaymentModalStatus}>
                                    <SelectTrigger id="status" className="h-10 sm:h-11">
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Complete">Complete (Paid)</SelectItem>
                                        <SelectItem value="Partial">Partial Payment</SelectItem>
                                        <SelectItem value="Scheduled">Scheduled</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="file" className="text-xs sm:text-sm">Attachment (Proof)</Label>
                                <AttachmentUploadField
                                    id="make-payment-proof"
                                    status={paymentAttachment.status}
                                    progress={paymentAttachment.progress}
                                    fileName={paymentAttachment.fileName}
                                    error={paymentAttachment.error}
                                    onSelect={(file) => { paymentAttachment.select(file); }}
                                    onRemove={paymentAttachment.remove}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="remark" className="text-xs sm:text-sm">Remarks</Label>
                            <Textarea
                                id="remark"
                                value={paymentModalRemark}
                                onChange={(e) => setPaymentModalRemark(e.target.value)}
                                placeholder="Add internal payment notes..."
                                className="resize-none text-xs sm:text-sm"
                                rows={3}
                            />
                        </div>
                    </div>

                    <DialogFooter className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-3 border-t shrink-0">
                        <Button variant="outline" className="w-full sm:w-auto" onClick={() => setIsPaymentModalOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleSinglePaymentSubmit}
                            disabled={isSubmitting || !paymentModalAmount || paymentAttachment.status === 'uploading'}
                            className="w-full sm:w-auto bg-primary hover:bg-primary/90 shadow-md min-w-[120px]"
                        >
                            {isSubmitting ? 'Processing...' : 'Confirm Payment'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <StageDeleteDialog
                open={!!deleteTarget}
                onOpenChange={(v) => !v && setDeleteTarget(null)}
                stageName="Make Payment"
                isPermanentDelete={false}
                indentNumber={deleteTarget?.indentNo || deleteTarget?.uniqueNumber}
                productName={deleteTarget?.productName}
                customMessage={`Are you sure you want to delete this payment record (${deleteTarget?.uniqueNumber || deleteTarget?.apPaymentNumber})? This will restore the item to Pending Payment.`}
                onConfirm={async () => {
                    if (!deleteTarget) return;
                    const targetId = deleteTarget.id || deleteTarget.rowIndex;
                    const paymentNum = deleteTarget.uniqueNumber || deleteTarget.apPaymentNumber;
                    await resetPaymentStage(targetId);
                    toast.success(`Payment record for ${paymentNum} deleted and reset`);
                    setDeleteTarget(null);
                    setHistoryData(prev => prev.filter(r => (r.id || r.rowIndex) !== targetId));
                    setPaymentHistorySheet(prev => prev.filter(r => (r.id || (r as any).rowIndex) !== targetId));
                    updateAll();
                }}
            />
        </div>
    );
}
