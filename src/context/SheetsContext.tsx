import {
    fetchIndentRecords,
    type IndentRecord
} from '@/services/indentService';
import {
    fetchStoreInRecords,
    type StoreInRecord
} from '@/services/storeInService';
import {
    fetchPoMaster
} from '@/services/poService';
import {
    fetchTallyEntryRecords,
    type TallyEntryRecord
} from '@/services/tallyEntryService';
import {
    fetchFullkittingRecords,
    type FullkittingRecord
} from '@/services/fullkittingService';
import {
    fetchPayments,
    fetchPaymentHistory
} from '@/services/paymentService';
import {
    fetchIssueRecords,
    type IssueRecord
} from '@/services/issueService';
import { calculatePcReportCounts } from '@/lib/pcReportUtils';
import {
    fetchInventoryRecords
} from '@/services/inventoryService';
import {
    fetchMasterOptions
} from '@/services/masterService';
import { fetchStockTransferRecords } from '@/services/stockTransferService';

import type {
    IndentSheet,
    InventorySheet,
    MasterSheet,
    PoMasterSheet,
    ReceivedSheet,
    StoreInSheet,
    IssueSheet,
    TallyEntrySheet,
    PcReportSheet,
    FullkittingSheet,
    PaymentHistory,
} from '@/types';
import type { PaymentsSheet } from '@/types/sheets';

import { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

// ============================================================
// Domain context interfaces — each component subscribes only
// to the slice it actually needs
// ============================================================

interface IndentContextType {
    indentSheet: IndentSheet[];
    indentLoading: boolean;
    updateIndentSheet: (silent?: boolean) => void;
}

interface PurchaseContextType {
    storeInSheet: StoreInSheet[];
    sheets: StoreInSheet[];
    storeInLoading: boolean;
    updateStoreInSheet: (silent?: boolean) => void;
    poMasterSheet: PoMasterSheet[];
    poMasterLoading: boolean;
    updatePoMasterSheet: (silent?: boolean) => void;
    receivedSheet: ReceivedSheet[];
    receivedLoading: boolean;
    updateReceivedSheet: (silent?: boolean) => void;
    tallyEntrySheet: TallyEntrySheet[];
    tallyEntryLoading: boolean;
    updateTallyEntrySheet: (silent?: boolean) => void;
    fullkittingSheet: FullkittingSheet[];
    fullkittingLoading: boolean;
    updateFullkittingSheet: (silent?: boolean) => void;
}

interface IssueContextType {
    issueSheet: IssueSheet[];
    issueLoading: boolean;
    updateIssueSheet: (silent?: boolean) => void;
    stockTransferSheet: any[];
    updateStockTransferSheet: (silent?: boolean) => void;
}

interface PaymentContextType {
    paymentsSheet: PaymentsSheet[];
    paymentsLoading: boolean;
    updatePaymentsSheet: (silent?: boolean) => void;
    paymentHistorySheet: PaymentHistory[];
    paymentHistoryLoading: boolean;
    updatePaymentHistorySheet: (silent?: boolean) => void;
}

interface AppContextType {
    masterSheet: MasterSheet | undefined;
    updateMasterSheet: () => void;
    inventorySheet: InventorySheet[];
    inventoryLoading: boolean;
    updateInventorySheet: (silent?: boolean) => void;
    pcReportSheet: PcReportSheet[];
    updatePcReportSheet: () => void;
    allLoading: boolean;
    updateAll: (silent?: boolean) => void;
}

// Backward-compat composite (kept so useSheets() still compiles)
interface SheetsState extends
    IndentContextType,
    PurchaseContextType,
    IssueContextType,
    PaymentContextType,
    AppContextType {}

// ============================================================
// Context objects
// ============================================================

const IndentContext = createContext<IndentContextType | null>(null);
const PurchaseContext = createContext<PurchaseContextType | null>(null);
import { useProject } from './ProjectContext';

const IssueContext = createContext<IssueContextType | null>(null);
const PaymentContext = createContext<PaymentContextType | null>(null);
const AppContext = createContext<AppContextType | null>(null);

// ============================================================
// Provider
// ============================================================

export const SheetsProvider = ({ children }: { children: React.ReactNode }) => {
    const { user, loggedIn } = useAuth();
    const { selectedProject } = useProject();

    // Compute effective permitted firms for filtering based on active project
    const effectivePermittedFirms = useMemo(() => {
        if (!selectedProject || selectedProject.id === 'all') {
            return (user?.administrate || !user?.firm_access || user?.firm_access.length === 0) ? undefined : user.firm_access;
        }
        return [String(selectedProject.id)];
    }, [user, selectedProject]);

    // --- Raw state ---
    const [indentSheet, setIndentSheet] = useState<IndentSheet[]>([]);
    const [storeSheet, setStoreInSheet] = useState<StoreInSheet[]>([]);
    const [receivedSheet, setReceivedSheet] = useState<ReceivedSheet[]>([]);
    const [poMasterSheet, setPoMasterSheet] = useState<PoMasterSheet[]>([]);
    const [inventorySheet, setInventorySheet] = useState<InventorySheet[]>([]);
    const [masterSheet, setMasterSheet] = useState<MasterSheet>();
    const [tallyEntrySheet, setTallyEntrySheet] = useState<TallyEntrySheet[]>([]);
    const [fullkittingSheet, setFullkittingSheet] = useState<FullkittingSheet[]>([]);
    const [issueSheet, setIssueSheet] = useState<IssueSheet[]>([]);
    const [stockTransferSheet, setStockTransferSheet] = useState<any[]>([]);
    const [paymentsSheet, setPaymentsSheet] = useState<PaymentsSheet[]>([]);
    const [paymentHistorySheet, setPaymentHistorySheet] = useState<PaymentHistory[]>([]);

    const [indentLoading, setIndentLoading] = useState(true);
    const [storeInLoading, setStoreInLoading] = useState(true);
    const [receivedLoading, setReceivedLoading] = useState(true);
    const [poMasterLoading, setPoMasterLoading] = useState(true);
    const [inventoryLoading, setInventoryLoading] = useState(true);
    const [tallyEntryLoading, setTallyEntryLoading] = useState(true);
    const [fullkittingLoading, setFullkittingLoading] = useState(true);
    const [issueLoading, setIssueLoading] = useState(true);
    const [paymentsLoading, setPaymentsLoading] = useState(true);
    const [paymentHistoryLoading, setPaymentHistoryLoading] = useState(true);
    const [allLoading, setAllLoading] = useState(true);

    // --- Derived state ---
    const pcReportSheet = useMemo(() => calculatePcReportCounts(
        indentSheet, storeSheet, issueSheet, fullkittingSheet, tallyEntrySheet, paymentsSheet, poMasterSheet
    ), [indentSheet, storeSheet, issueSheet, fullkittingSheet, tallyEntrySheet, paymentsSheet, poMasterSheet]);

    // ============================================================
    // Update functions — useCallback prevents identity churn so
    // memoized context values stay stable between renders
    // ============================================================

    // ============================================================
    // Per-fetch AbortController registry + in-flight dedup set.
    // abortRefs holds the active controller for each sheet key so that
    // updateAll() can cancel every in-flight request before issuing
    // new ones — preventing stale project data from overwriting current data.
    // inFlight prevents duplicate concurrent fetches of the same sheet.
    // ============================================================
    const abortRefs = useRef<Map<string, AbortController>>(new Map());
    const inFlight  = useRef<Set<string>>(new Set());

    /** Cancel any in-flight fetch for `key` and return a fresh AbortController. */
    const freshController = useCallback((key: string): AbortController => {
        abortRefs.current.get(key)?.abort();
        const ctrl = new AbortController();
        abortRefs.current.set(key, ctrl);
        return ctrl;
    }, []);

    const updateStoreInSheet = useCallback((silent = false) => {
        if (inFlight.current.has('storeIn')) return;
        inFlight.current.add('storeIn');
        if (!silent) setStoreInLoading(true);
        const ctrl = freshController('storeIn');
        const permittedFirms = effectivePermittedFirms;
        fetchStoreInRecords(permittedFirms)
            .then((res) => {
                if (ctrl.signal.aborted) return;
                const mapped = res.map((r: any) => ({
                    ...r,
                    vendorType: r.vendor_type || '',
                    billStatus: r.billStatus || '',
                }));
                setStoreInSheet(mapped as unknown as StoreInSheet[]);
                setStoreInLoading(false);
            })
            .catch((error) => {
                if (ctrl.signal.aborted) return;
                console.error('Error fetching STORE IN from Supabase:', error);
                setStoreInLoading(false);
            })
            .finally(() => inFlight.current.delete('storeIn'));
    }, [effectivePermittedFirms, freshController]);

    const updateIssueSheet = useCallback((silent = false) => {
        if (inFlight.current.has('issue')) return;
        inFlight.current.add('issue');
        if (!silent) setIssueLoading(true);
        const ctrl = freshController('issue');
        const permittedFirms = effectivePermittedFirms;
        fetchIssueRecords(permittedFirms)
            .then((res) => {
                if (ctrl.signal.aborted) return;
                const mapped = res.map(r => ({
                    id: r.id,
                    issueNo: r.issue_no,
                    issueTo: r.issue_to,
                    uom: r.uom,
                    productName: r.product_name,
                    quantity: r.quantity,
                    // department: r.department,
                    groupHead: r.group_head,
                    planned1: r.planned1,
                    actual1: r.actual1,
                    location: r.location,
                    status: r.status,
                    givenQty: r.given_qty,
                    timestamp: r.timestamp || '',
                    projectName: r.firm_name,
                    firm_name: r.firm_name || '',
                    firmNameMatch: r.firmNameMatch || r.firm_name || '',
                    firm_id: r.firm_id,
                    firmId: r.firm_id,
                    constructorName: r.constructor_name,
                    siteLocation: r.site_location,
                    rejected_damage_qty: r.rejected_damage_qty,
                    return_slip: r.return_slip || '',
                    returnPersonName: r.return_person_name,
                    issuePersonName: r.issue_person_name,
                }));
                setIssueSheet(mapped as unknown as IssueSheet[]);
                setIssueLoading(false);
            })
            .catch((error) => {
                if (ctrl.signal.aborted) return;
                console.error('Error fetching ISSUE from Supabase:', error);
                setIssueLoading(false);
            })
            .finally(() => inFlight.current.delete('issue'));
    }, [effectivePermittedFirms, freshController]);

    const updateIndentSheet = useCallback((silent = false) => {
        if (inFlight.current.has('indent')) return;
        inFlight.current.add('indent');
        if (!silent) setIndentLoading(true);
        const ctrl = freshController('indent');
        const permittedFirms = effectivePermittedFirms;
        fetchIndentRecords(permittedFirms)
            .then((res) => {
                if (ctrl.signal.aborted) return;
                const mapped = res.map(r => ({
                    indentNumber: r.indent_number,
                    indenterName: r.indenter_name,
                    // department: r.department,
                    productName: r.product_name,
                    groupHead: r.group_head || '',
                    quantity: r.quantity,
                    uom: r.uom,
                    attachment: r.attachment,
                    specifications: r.specifications,
                    areaOfUse: r.area_of_use,
                    vendorType: r.vendor_type,
                    indentStatus: r.indent_status,
                    indentType: r.indent_type,
                    planned1: r.planned1,
                    actual1: r.actual1,
                    firmName: r.firm_name,
                    firmId: r.firm_id,
                    firmNameMatch: r.firm_name,
                    approvedQuantity: r.approved_quantity,
                    timestamp: r.timestamp,
                    planned2: r.planned2,
                    actual2: r.actual2,
                    planned3: r.planned3,
                    actual3: r.actual3,
                    approvedVendorName: r.approved_vendor_name || '',
                    planned4: r.planned4,
                    actual4: r.actual4,
                    poNumber: r.po_number,
                    planned5: r.planned5,
                    actual5: r.actual5,
                    status: r.status || r.indent_status || 'Pending',
                    poRequred: r.po_requred || (r.po_number ? 'Yes' : (r.actual4 ? 'Yes' : '')),
                    liftingStatus: r.lifting_status || 'Pending',
                    poQty: r.po_qty || 0,
                    // Prefer the DB's own pending_po_qty — po_qty is the PO-wide total,
                    // so deriving approved_quantity - po_qty gives wrong (negative) values
                    pendingPoQty: r.pending_po_qty != null ? Number(r.pending_po_qty) : (r.approved_quantity || 0) - (Number(r.po_qty) || 0),
                    pendingLiftQty: r.pending_lift_qty != null ? Number(r.pending_lift_qty) : (r.approved_quantity || 0) - (Number(r.received_quantity) || 0),
                    siteLocation: (r as any).site_location || (r as any).siteLocation || (r as any).area_of_use || '',
                    rowIndex: String(r.id),
                }));
                setIndentSheet(mapped as unknown as IndentSheet[]);
                setIndentLoading(false);
            })
            .catch((error) => {
                if (ctrl.signal.aborted) return;
                console.error('Error fetching INDENT from Supabase:', error);
                setIndentLoading(false);
            })
            .finally(() => inFlight.current.delete('indent'));
    }, [effectivePermittedFirms, freshController]);

    const updateReceivedSheet = useCallback((silent = false) => {
        if (inFlight.current.has('received')) return;
        inFlight.current.add('received');
        if (!silent) setReceivedLoading(true);
        const ctrl = freshController('received');
        const permittedFirms = effectivePermittedFirms;
        fetchStoreInRecords(permittedFirms)
            .then((res) => {
                if (ctrl.signal.aborted) return;
                const mapped = res.filter(r => r.actual6 !== '').map(r => ({
                    timestamp: r.timestamp,
                    indentNumber: r.indentNo,
                    poDate: r.poDate,
                    poNumber: r.poNumber,
                    vendor: r.vendorName,
                    receivedStatus: r.receivingStatus,
                    receivedQuantity: r.receivedQuantity,
                    uom: r.uom,
                    photoOfProduct: r.photoOfProduct,
                    billStatus: r.billStatus,
                    billNumber: r.billNo,
                    billAmount: r.billAmount,
                    photoOfBill: r.photoOfBill,
                    actual6: r.actual6,
                }));
                setReceivedSheet(mapped as unknown as ReceivedSheet[]);
                setReceivedLoading(false);
            })
            .catch((error) => {
                if (ctrl.signal.aborted) return;
                console.error('Error fetching RECEIVED from Supabase:', error);
                setReceivedLoading(false);
            })
            .finally(() => inFlight.current.delete('received'));
    }, [effectivePermittedFirms, freshController]);

    const updatePoMasterSheet = useCallback((silent = false) => {
        if (inFlight.current.has('poMaster')) return;
        inFlight.current.add('poMaster');
        if (!silent) setPoMasterLoading(true);
        const ctrl = freshController('poMaster');
        const permittedFirms = effectivePermittedFirms;
        fetchPoMaster(permittedFirms)
            .then((res) => {
                if (ctrl.signal.aborted) return;
                setPoMasterSheet(res as unknown as PoMasterSheet[]);
                setPoMasterLoading(false);
            })
            .catch((error) => {
                if (ctrl.signal.aborted) return;
                console.error('Error fetching PO MASTER from Supabase:', error);
                setPoMasterLoading(false);
            })
            .finally(() => inFlight.current.delete('poMaster'));
    }, [effectivePermittedFirms, freshController]);

    const updateInventorySheet = useCallback((silent = false) => {
        if (inFlight.current.has('inventory')) return;
        inFlight.current.add('inventory');
        if (!silent) setInventoryLoading(true);
        const ctrl = freshController('inventory');
        const permittedFirms = effectivePermittedFirms;
        fetchInventoryRecords(permittedFirms)
            .then((res) => {
                if (ctrl.signal.aborted) return;
                setInventorySheet(res as unknown as InventorySheet[]);
                setInventoryLoading(false);
            })
            .catch((error) => {
                if (ctrl.signal.aborted) return;
                console.error('Error fetching INVENTORY from Supabase:', error);
                setInventoryLoading(false);
            })
            .finally(() => inFlight.current.delete('inventory'));
    }, [effectivePermittedFirms, freshController]);

    const updateMasterSheet = useCallback(() => {
        if (inFlight.current.has('master')) return;
        inFlight.current.add('master');
        const ctrl = freshController('master');
        const permittedFirms = effectivePermittedFirms;
        fetchMasterOptions(permittedFirms)
            .then((res) => {
                if (ctrl.signal.aborted) return;
                setMasterSheet(res as unknown as MasterSheet);
            })
            .catch((error) => {
                if (ctrl.signal.aborted) return;
                console.error('Error fetching MASTER from Supabase:', error);
            })
            .finally(() => inFlight.current.delete('master'));
    }, [effectivePermittedFirms, freshController]);

    const updateFullkittingSheet = useCallback((silent = false) => {
        if (inFlight.current.has('fullkitting')) return;
        inFlight.current.add('fullkitting');
        if (!silent) setFullkittingLoading(true);
        const ctrl = freshController('fullkitting');
        const permittedFirms = effectivePermittedFirms;
        fetchFullkittingRecords(permittedFirms)
            .then((res: any[]) => {
                if (ctrl.signal.aborted) return;
                const mapped = res.map((r: any) => ({
                    ...r,
                    vehicleNo: r.vehicalNo,
                }));
                setFullkittingSheet(mapped as unknown as FullkittingSheet[]);
                setFullkittingLoading(false);
            })
            .catch((error: any) => {
                if (ctrl.signal.aborted) return;
                console.error('Error fetching Fullkitting from REST API:', error);
                setFullkittingLoading(false);
            })
            .finally(() => inFlight.current.delete('fullkitting'));
    }, [effectivePermittedFirms, freshController]);

    const updatePaymentsSheet = useCallback((silent = false) => {
        if (inFlight.current.has('payments')) return;
        inFlight.current.add('payments');
        if (!silent) setPaymentsLoading(true);
        const ctrl = freshController('payments');
        const permittedFirms = effectivePermittedFirms;
        fetchPayments(permittedFirms)
            .then((res) => {
                if (ctrl.signal.aborted) return;
                setPaymentsSheet(res as unknown as PaymentsSheet[]);
                setPaymentsLoading(false);
            })
            .catch((error) => {
                if (ctrl.signal.aborted) return;
                console.error('Error fetching PAYMENTS from Supabase:', error);
                setPaymentsLoading(false);
            })
            .finally(() => inFlight.current.delete('payments'));
    }, [effectivePermittedFirms, freshController]);

    const updatePaymentHistorySheet = useCallback((silent = false) => {
        if (inFlight.current.has('paymentHistory')) return;
        inFlight.current.add('paymentHistory');
        if (!silent) setPaymentHistoryLoading(true);
        const ctrl = freshController('paymentHistory');
        const permittedFirms = effectivePermittedFirms;
        fetchPaymentHistory(permittedFirms)
            .then((res) => {
                if (ctrl.signal.aborted) return;
                setPaymentHistorySheet(res as unknown as PaymentHistory[]);
                setPaymentHistoryLoading(false);
            })
            .catch((error) => {
                if (ctrl.signal.aborted) return;
                console.error('Error fetching PAYMENT HISTORY from Supabase:', error);
                setPaymentHistoryLoading(false);
            })
            .finally(() => inFlight.current.delete('paymentHistory'));
    }, [effectivePermittedFirms, freshController]);

    const updateStockTransferSheet = useCallback((silent = false) => {
        if (inFlight.current.has('stockTransfer')) return;
        inFlight.current.add('stockTransfer');
        if (!silent) setIssueLoading(true);
        const ctrl = freshController('stockTransfer');
        const permittedFirms = effectivePermittedFirms;
        fetchStockTransferRecords(permittedFirms)
            .then((res) => {
                if (ctrl.signal.aborted) return;
                setStockTransferSheet(res);
                setIssueLoading(false);
            })
            .catch((err) => {
                if (ctrl.signal.aborted) return;
                console.error(err);
                setIssueLoading(false);
            })
            .finally(() => inFlight.current.delete('stockTransfer'));
    }, [effectivePermittedFirms, freshController]);

    const updateTallyEntrySheet = useCallback((silent = false) => {
        if (inFlight.current.has('tallyEntry')) return;
        inFlight.current.add('tallyEntry');
        if (!silent) setTallyEntryLoading(true);
        const ctrl = freshController('tallyEntry');
        const permittedFirms = effectivePermittedFirms;
        fetchTallyEntryRecords(permittedFirms)
            .then((res) => {
                if (ctrl.signal.aborted) return;
                const mapped = res.map(r => ({
                    timestamp: r.timestamp,
                    indentNo: r.indentNumber,
                    purchaseDate: r.materialInDate,
                    indentDate: r.timestamp,
                    indentNumber: r.indentNumber,
                    liftNumber: r.liftNumber,
                    poNumber: r.poNumber,
                    materialInDate: r.materialInDate,
                    productName: r.productName,
                    billNo: r.billNo,
                    qty: r.qty,
                    partyName: r.partyName,
                    billAmt: r.billAmt,
                    billImage: r.billImage,
                    billReceivedLater: r.billReceivedLater,
                    location: r.location,
                    typeOfBills: r.typeOfBills,
                    productImage: r.productImage,
                    area: r.area,
                    // indentedFor: r.indentedFor,
                    approvedPartyName: r.approvedPartyName,
                    rate: r.rate,
                    indentQty: r.indentQty,
                    totalRate: r.totalRate,
                    planned1: r.planned1,
                    actual1: r.actual1,
                    delay1: r.delay1,
                    status1: r.status1,
                    remarks1: r.remarks1,
                    planned2: r.planned2,
                    actual2: r.actual2,
                    delay2: r.delay2,
                    status2: r.status2,
                    remarks2: r.remarks2,
                    planned3: r.planned3,
                    actual3: r.actual3,
                    delay3: r.delay3,
                    status3: r.status3,
                    remarks3: r.remarks3,
                    planned4: r.planned4,
                    actual4: r.actual4,
                    delay4: r.delay4,
                    status4: r.status4,
                    remarks4: r.remarks4,
                    planned5: r.planned5,
                    actual5: r.actual5,
                    status5: r.status5,
                    firmNameMatch: r.firmNameMatch,
                    id: r.id,
                    damageOrder: r.damageOrder,
                    quantityAsPerBill: r.quantityAsPerBill,
                    priceAsPerPoCheck: r.priceAsPerPoCheck,
                    hodStatus: r.hodStatus,
                    hodRemark: r.hodRemark,
                    receivingStatus: r.receivingStatus,
                    receivedQuantity: r.receivedQuantity,
                    firm_id: r.firm_id,
                }));
                setTallyEntrySheet(mapped as unknown as TallyEntrySheet[]);
                setTallyEntryLoading(false);
            })
            .catch((error) => {
                if (ctrl.signal.aborted) return;
                console.error('Error fetching TALLY ENTRY from Supabase:', error);
                setTallyEntryLoading(false);
            })
            .finally(() => inFlight.current.delete('tallyEntry'));
    }, [effectivePermittedFirms, freshController]);

    const updatePcReportSheet = useCallback(() => {
        // Computed automatically via useMemo — no manual refresh needed
    }, []);

    const updateAll = useCallback((silent = false) => {
        // Cancel every in-flight fetch from a previous context (e.g. previous project)
        // before kicking off new ones, so stale responses cannot overwrite current data.
        abortRefs.current.forEach((ctrl) => ctrl.abort());
        abortRefs.current.clear();
        inFlight.current.clear(); // reset dedup so the new round can actually start

        if (!silent) setAllLoading(true);
        updateMasterSheet();
        updateReceivedSheet(silent);
        updateIndentSheet(silent);
        updatePoMasterSheet(silent);
        updateInventorySheet(silent);
        updateStoreInSheet(silent);
        updateIssueSheet(silent);
        updateTallyEntrySheet(silent);
        updatePcReportSheet();
        updateFullkittingSheet(silent);
        updatePaymentHistorySheet(silent);
        updatePaymentsSheet(silent);
        updateStockTransferSheet(silent);
        if (!silent) setAllLoading(false);
    }, [
        updateMasterSheet, updateReceivedSheet, updateIndentSheet, updatePoMasterSheet,
        updateInventorySheet, updateStoreInSheet, updateIssueSheet, updateTallyEntrySheet,
        updatePcReportSheet, updateFullkittingSheet, updatePaymentHistorySheet,
        updatePaymentsSheet, updateStockTransferSheet,
    ]);

    // --- Initial load + visibility-aware auto-refresh ---
    // Rules:
    //  1. Interval runs only while this tab is VISIBLE — pausing it on hidden
    //     tabs eliminates the "5 open tabs all hammering the DB" problem.
    //  2. When the tab comes back into focus, refresh immediately if the data
    //     would have gone stale while the tab was in the background.
    //  3. Interval is 60 seconds — targeted update*Sheet() calls already handle
    //     immediate consistency after user actions; this is just a safety net
    //     for changes made by other users.

    // Guard: skip the first render so the project-change effect does NOT
    // duplicate the initial fetch that the interval effect already performs.
    const isFirstMount = useRef(true);

    // Re-fetch all data whenever selected project CHANGES (not on first mount).
    useEffect(() => {
        if (isFirstMount.current) {
            // First render: the interval effect below handles the initial load.
            isFirstMount.current = false;
            return;
        }
        if (user?.username) {
            updateAll(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedProject?.id, user?.username]);

    // Interval + visibility-aware polling (also owns the ONE initial full load).
    useEffect(() => {
        if (!user?.username) return;

        const INTERVAL_MS = 60 * 1000; // 60 seconds
        let intervalId: ReturnType<typeof setInterval> | null = null;
        let lastRefreshedAt = 0;

        const silentRefresh = () => {
            lastRefreshedAt = Date.now();
            updateAll(true);
        };

        const startInterval = () => {
            if (intervalId !== null) return;
            intervalId = setInterval(silentRefresh, INTERVAL_MS);
        };

        const stopInterval = () => {
            if (intervalId !== null) {
                clearInterval(intervalId);
                intervalId = null;
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                // Tab regained focus — catch up if interval fired while hidden
                if (Date.now() - lastRefreshedAt >= INTERVAL_MS) {
                    silentRefresh();
                }
                startInterval();
            } else {
                // Tab hidden — pause so background tabs don't hit the DB
                stopInterval();
            }
        };

        // Initial full load — this is the SINGLE canonical first fetch.
        try {
            updateAll();
            lastRefreshedAt = Date.now();
        } catch (e) {
            toast.error('Something went wrong while fetching data');
        }

        // Only start interval if this tab is currently active
        if (document.visibilityState === 'visible') {
            startInterval();
        }

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            stopInterval();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [updateAll]);

    // NOTE: Route-change refetch intentionally removed.
    // Navigating between pages does NOT trigger data fetches.
    // Freshness is maintained by the 60-second polling interval above
    // and by explicit project-switch refetch. Individual components
    // that need fresh data after a mutation should call their specific
    // update*Sheet() function directly.

    // ============================================================
    // Memoized context values — each value object only changes
    // when its own slice of state changes, not the whole app
    // ============================================================

    const indentValue = useMemo<IndentContextType>(() => ({
        indentSheet,
        indentLoading,
        updateIndentSheet,
    }), [indentSheet, indentLoading, updateIndentSheet]);

    const purchaseValue = useMemo<PurchaseContextType>(() => ({
        storeInSheet: storeSheet,
        sheets: storeSheet,
        storeInLoading,
        updateStoreInSheet,
        poMasterSheet,
        poMasterLoading,
        updatePoMasterSheet,
        receivedSheet,
        receivedLoading,
        updateReceivedSheet,
        tallyEntrySheet,
        tallyEntryLoading,
        updateTallyEntrySheet,
        fullkittingSheet,
        fullkittingLoading,
        updateFullkittingSheet,
    }), [
        storeSheet, storeInLoading, updateStoreInSheet,
        poMasterSheet, poMasterLoading, updatePoMasterSheet,
        receivedSheet, receivedLoading, updateReceivedSheet,
        tallyEntrySheet, tallyEntryLoading, updateTallyEntrySheet,
        fullkittingSheet, fullkittingLoading, updateFullkittingSheet,
    ]);

    const issueValue = useMemo<IssueContextType>(() => ({
        issueSheet,
        issueLoading,
        updateIssueSheet,
        stockTransferSheet,
        updateStockTransferSheet,
    }), [issueSheet, issueLoading, updateIssueSheet, stockTransferSheet, updateStockTransferSheet]);

    const paymentValue = useMemo<PaymentContextType>(() => ({
        paymentsSheet,
        paymentsLoading,
        updatePaymentsSheet,
        paymentHistorySheet,
        paymentHistoryLoading,
        updatePaymentHistorySheet,
    }), [paymentsSheet, paymentsLoading, updatePaymentsSheet, paymentHistorySheet, paymentHistoryLoading, updatePaymentHistorySheet]);

    const appValue = useMemo<AppContextType>(() => ({
        masterSheet,
        updateMasterSheet,
        inventorySheet,
        inventoryLoading,
        updateInventorySheet,
        pcReportSheet,
        updatePcReportSheet,
        allLoading,
        updateAll,
    }), [masterSheet, updateMasterSheet, inventorySheet, inventoryLoading, updateInventorySheet, pcReportSheet, updatePcReportSheet, allLoading, updateAll]);

    return (
        <IndentContext.Provider value={indentValue}>
            <PurchaseContext.Provider value={purchaseValue}>
                <IssueContext.Provider value={issueValue}>
                    <PaymentContext.Provider value={paymentValue}>
                        <AppContext.Provider value={appValue}>
                            {children}
                        </AppContext.Provider>
                    </PaymentContext.Provider>
                </IssueContext.Provider>
            </PurchaseContext.Provider>
        </IndentContext.Provider>
    );
};

// ============================================================
// Fine-grained hooks — prefer these in new/refactored code.
// Each component subscribes only to its relevant slice.
// ============================================================
export const useIndentData = () => useContext(IndentContext)!;
export const usePurchaseData = () => useContext(PurchaseContext)!;
export const useIssueData = () => useContext(IssueContext)!;
export const usePaymentData = () => useContext(PaymentContext)!;
export const useAppData = () => useContext(AppContext)!;

// ============================================================
// Backward-compatible hook — existing consumers keep working.
// Components using this still re-render on any slice change;
// migrate to fine-grained hooks above for full isolation.
// ============================================================
export const useSheets = (): SheetsState => ({
    ...useContext(IndentContext)!,
    ...useContext(PurchaseContext)!,
    ...useContext(IssueContext)!,
    ...useContext(PaymentContext)!,
    ...useContext(AppContext)!,
});
