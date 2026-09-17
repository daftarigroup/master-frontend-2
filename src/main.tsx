import '@/index.css';
import { Buffer } from 'buffer';
if (typeof window !== 'undefined') {
    window.Buffer = Buffer;
}


import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider, useAuth } from '@/context/AuthContext.tsx';
import { ProjectProvider } from './context/ProjectContext';
import ProjectGuard from './app/guards/ProjectGuard';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import App from './App';
import { SheetsProvider } from './context/SheetsContext';
import { ChecklistProvider } from './context/ChecklistContext';
const Login = React.lazy(() => import('./components/views/Login'));
const SelectProject = React.lazy(() => import('./components/views/SelectProject'));
const CreateAccount = React.lazy(() => import('./components/views/CreateAccount'));
const CreateIndent = React.lazy(() => import('./components/views/CreateIndent'));
const Dashboard = React.lazy(() => import('./components/views/Dashboard'));
const ApproveIndent = React.lazy(() => import('./components/views/ApproveIndent'));
const VendorUpdate = React.lazy(() => import('./components/views/VendorUpdate'));
const DepartmentApproval = React.lazy(() => import('./components/views/TechnicalApproval'));
const RateApproval = React.lazy(() => import('./components/views/RateApproval'));
const StoreOutApproval = React.lazy(() => import('./components/views/StoreOutApproval'));
const TrainnigVideo = React.lazy(() => import('./components/views/TrainingVideo'));
const Liecense = React.lazy(() => import('./components/views/License'));
const MakePayment = React.lazy(() => import('./components/views/MakePayment'));
import type { RouteAttributes } from './types';
import {
    LayoutDashboard,
    ClipboardList,
    UserCheck,
    Users,
    ClipboardCheck,
    Truck,
    PackageCheck,
    ShieldUser,
    FilePlus2,
    ListTodo,
    Package2,
    Store,
    KeyRound,
    VideoIcon,
    RotateCcw,
    PlusCircle,
    CheckSquare,
    UserCog,
    ShieldCheck,
    Clock,
    FilePlus,
    History,
    ArrowUpCircle,
    CheckCircle2,
    FileX,
    HandCoins,
    RefreshCw,
    CreditCard,
    Send,
    BarChart,
    FileWarning,
    FileSpreadsheet,
} from 'lucide-react';
import type { UserPermissions } from './types/sheets';
import { hasPageAccess } from './components/element/PermissionGuard';
import Loading from './components/views/Loading';
const ManageUsers = React.lazy(() => import('./components/views/ManageUsers'));
const CreatePO = React.lazy(() => import('./components/views/CreatePO'));
const PendingIndents = React.lazy(() => import('./components/views/PendingIndents'));
const Order = React.lazy(() => import('./components/views/Order'));
const Inventory = React.lazy(() => import('./components/views/Inventory'));
const POMaster = React.lazy(() => import('./components/views/POMaster'));
const StoreIssue = React.lazy(() => import('./components/views/StoreIssue'));
const StoreIssueReturn = React.lazy(() => import('./components/views/StoreIssueReturn'));
const QuantityCheckInReceiveItem = React.lazy(() => import('./components/views/QuantityCheckInReceiveItem'));
const ReturnMaterialToParty = React.lazy(() => import('./components/views/ReturnMaterialToParty'));
const SendDebitNote = React.lazy(() => import('./components/views/SendDebitNote'));
const IssueData = React.lazy(() => import('./components/views/IssueData'));
const GetLift = React.lazy(() => import('./components/views/GetLift'));
const StoreIn = React.lazy(() => import('./components/views/StoreIn'));
const AuditData = React.lazy(() => import('./components/views/AuditData'));
const RectifyTheMistake = React.lazy(() => import('./components/views/RectifyTheMistake'));
const ReauditData = React.lazy(() => import('./components/views/ReauditData'));
const TakeEntryByTally = React.lazy(() => import('./components/views/TakeEntryByTally'));
const ExchangeMaterials = React.lazy(() => import('./components/views/ExchangeMaterials'));
const DBforPc = React.lazy(() => import('./components/views/DBforPC'));
const AgainAuditing = React.lazy(() => import('./components/views/AgainAuditing'));
const BillNotReceived = React.lazy(() => import('./components/views/BillNotReceived'));
const FullKiting = React.lazy(() => import('./components/views/FullKiting'));
const PendingPo = React.lazy(() => import('./components/views/PendingPo'));
const PaymentStatus = React.lazy(() => import('./components/views/PaymentStatus'));
const HodStoreApproval = React.lazy(() => import('./components/views/HodStoreApproval'));
const MasterManagement = React.lazy(() => import('./components/views/MasterManagement'));
const QuotationPage = React.lazy(() => import('./components/views/Quotation'));
const VendorBidding = React.lazy(() => import('./components/views/VendorBidding'));
import { isAllowedFirm } from '@/lib/firmAccess';
import GlobalDashboard from '@/shared/components/layout/GlobalDashboard';
import StoreSystemLayout from '@/systems/store/layout/StoreSystemLayout';
import MaintenanceSystemLayout from '@/systems/maintenance/layout/MaintenanceSystemLayout';
import MaintenanceDashboard from '@/systems/maintenance/views/MaintenanceDashboard';
import ChecklistSystemLayout from '@/systems/checklist/layout/ChecklistSystemLayout';

const ChecklistDashboard = React.lazy(() => import('./components/views/checklist/ChecklistDashboard'));
const QuickTask = React.lazy(() => import('./components/views/checklist/QuickTask'));
const AssignTask = React.lazy(() => import('./components/views/checklist/AssignTask'));
const ChecklistSubmission = React.lazy(() => import('./components/views/checklist/ChecklistSubmission'));
const DelegationSubmission = React.lazy(() => import('./components/views/checklist/DelegationSubmission'));
const AdminApproval = React.lazy(() => import('./components/views/checklist/AdminApproval'));
const WorkingCalendar = React.lazy(() => import('./components/views/WorkingCalendar'));
const Holidays = React.lazy(() => import('./components/views/Holidays'));

// Petty Cash Lazy Components
import PettyCashSystemLayout from '@/systems/petty-cash/layout/PettyCashSystemLayout';
const PettyCashDashboard = React.lazy(() => import('@/systems/petty-cash/pages/PettyCashDashboard'));
const AddCase = React.lazy(() => import('@/systems/petty-cash/pages/AddCase'));
const Ledger = React.lazy(() => import('@/systems/petty-cash/pages/Ledger'));
const PettyCashReports = React.lazy(() => import('@/systems/petty-cash/pages/Reports'));
const PettyCashMasterPage = React.lazy(() => import('@/systems/petty-cash/pages/MasterPage'));
const PettyCashSettings = React.lazy(() => import('@/systems/petty-cash/pages/Settings'));

// Document Lazy Components
import DocumentSystemLayout from '@/systems/document/layout/DocumentSystemLayout';
const DocumentDashboard = React.lazy(() => import('@/systems/document/pages/DocumentDashboard'));
const ResourceManager = React.lazy(() => import('@/systems/document/pages/ResourceManager'));
const AllDocuments = React.lazy(() => import('@/systems/document/pages/document/AllDocuments'));
const DocumentRenewal = React.lazy(() => import('@/systems/document/pages/document/Renewal'));
const SharedDocuments = React.lazy(() => import('@/systems/document/pages/document/Shared'));
const AllSubscriptions = React.lazy(() => import('@/systems/document/pages/subscription/AllSubscriptions'));
const SubscriptionApproval = React.lazy(() => import('@/systems/document/pages/subscription/Approval'));
const SubscriptionPayment = React.lazy(() => import('@/systems/document/pages/subscription/Payment'));
const SubscriptionRenewal = React.lazy(() => import('@/systems/document/pages/subscription/Renewal'));
const AllLoans = React.lazy(() => import('@/systems/document/pages/loan/AllLoans'));
const Foreclosure = React.lazy(() => import('@/systems/document/pages/loan/Foreclosure'));
const LoanNOC = React.lazy(() => import('@/systems/document/pages/loan/NOC'));


// TanStack Query Client for HR System
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const hrQueryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});

// HR & Facilities Management System Components
import HrSystemLayout from '@/systems/hr/layout/HrSystemLayout';
import {
    HrDashboardPage,
    HrIndentPage,
    HrFindEnquiryPage,
    HrEmployeePage,
    HrDeploymentPage,
    HrAttendancePage,
    HrLeavePage,
    HrGatePassPage,
    HrAdvancePage,
    HrLoanTransactionPage,
    HrSalaryManagementPage,
    HrSalaryDetailPage,
    HrAfterJoiningPage,
    HrAfterLeavingPage,
    HrLetterFormatterPage,
    HrCalendarPage,
    HrSocialSitePage,
    HrReportsPage,
} from '@/systems/hr/pages';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { loggedIn, loading } = useAuth();
    if (loading) return <Loading />;
    return loggedIn ? children : <Navigate to="/login" />;
}

function GatedRoute({
    children,
    page,
    identifier,
    requiredMode = 'VIEW',
}: {
    children: React.ReactNode;
    page?: string;
    identifier?: keyof UserPermissions;
    requiredMode?: 'VIEW' | 'EDIT';
}) {
    const { user } = useAuth();
    if (!page && !identifier) return <>{children}</>;

    const isPermitted = hasPageAccess(user, page, requiredMode, identifier);
    if (!isPermitted) {
        return <Navigate to="/" replace />;
    }
    return <>{children}</>;
}

function firmMatchesAccess(record: any, user: any) {
    return isAllowedFirm(
        {
            id: record?.firm_id,
            name: record?.firmNameMatch || record?.firm_name || record?.firmName || record?.firm
        },
        user?.firm_access
    );
}

const routes: RouteAttributes[] = [
    {
        path: '',
        name: 'Dashboard',
        icon: <LayoutDashboard size={20} />,
        element: <Dashboard />,
        notifications: () => 0,
    },
    {
        path: 'quotation',
        gateKey: 'createPo',
        name: 'Enquiry',
        icon: <FilePlus2 size={20} />,
        element: <QuotationPage />,
        notifications: () => 0,
    },
    {
        path: 'store-issue',
        gateKey: 'storeIssue',
        name: 'Store Issue',
        icon: <ClipboardList size={20} />,
        element: <StoreIssue />,
        notifications: () => 0,
    },
    {
        path: 'store-issue-return',
        gateKey: 'storeIssueReturn',
        name: 'Store Issue Return',
        icon: <RotateCcw size={20} />,
        element: <StoreIssueReturn />,
        notifications: () => 0,
    },

    {
        path: 'Issue-data',
        gateKey: 'issueData',
        name: 'Store Data',
        icon: <ClipboardCheck size={20} />,
        element: <IssueData />,
        notifications: (issueSheet: any[], user: any) =>
            issueSheet.filter((sheet: any) => {
                return firmMatchesAccess(sheet, user) &&
                    sheet.planned1 &&
                    sheet.planned1.toString().trim() !== '' &&
                    (!sheet.actual1 || sheet.actual1.toString().trim() === '') &&
                    !(sheet.rejected_damage_qty && sheet.rejected_damage_qty !== '0' && sheet.rejected_damage_qty !== '');
            }).length,
    },


    {
        path: 'inventory',
        name: 'Inventory',
        gateKey: 'inventory',
        icon: <Store size={20} />,
        element: <Inventory />,
        notifications: () => 0,
    },


    {
        path: 'create-indent',
        gateKey: 'createIndent',
        name: 'Create Indent',
        icon: <PlusCircle size={20} />,
        element: <CreateIndent />,
        notifications: () => 0,
    },
    {
        path: 'approve-indent',
        gateKey: 'indentApprovalView',
        name: 'Indent Approval',
        icon: <CheckSquare size={20} />,
        element: <ApproveIndent />,
        notifications: (sheets: any[], user: any) => {
            const data = Array.isArray(sheets[0]) ? sheets[0] : sheets;

            return data.filter(
                (sheet: any) => {
                    return firmMatchesAccess(sheet, user) &&
                        sheet.planned1 && sheet.planned1 !== '' &&
                        (!sheet.actual1 || sheet.actual1 === '');
                }
            ).length;
        },
    },
    {
        path: 'vendor-rate-update',
        gateKey: 'updateVendorView',
        name: 'Vendor Rate Update',
        icon: <UserCog size={20} />,
        element: <VendorUpdate />,
        notifications: (sheets: any[], user: any) => {
            return sheets.filter((sheet: any) => {
                const vType = sheet.vendorType || sheet.vendor_type;
                const status = (sheet.status || '').toLowerCase();
                return firmMatchesAccess(sheet, user) &&
                    vType !== 'Reject' && status !== 'rejected' &&
                    sheet.planned2 !== '' && sheet.actual2 === '';
            }).length;
        },
    },
    {
        path: 'technical-approval',
        gateKey: 'threePartyApprovalView',
        name: 'Technical Approval',
        icon: <Users size={20} />,
        element: <DepartmentApproval />,
        notifications: (sheetsData: any[], user: any) => {
            const sheets = Array.isArray(sheetsData[0]) ? sheetsData[0] : sheetsData;

            return sheets.filter(
                (sheet: any) => {
                    const vType = sheet.vendorType || sheet.vendor_type;
                    const status = (sheet.status || '').toLowerCase();
                    return firmMatchesAccess(sheet, user) &&
                        vType !== 'Direct' && vType !== 'Reject' && status !== 'rejected' &&
                        sheet.planned3 && sheet.planned3 !== '' &&
                        (!sheet.actual3 || sheet.actual3 === '') &&
                        !(sheet.vendor1_rank || sheet.vendor2_rank || sheet.vendor3_rank);
                }
            ).length;
        },
    },
    {
        path: 'management-approval',
        gateKey: 'threePartyApprovalView',
        name: 'Management Approval',
        icon: <ShieldCheck size={20} />,
        element: <RateApproval />,
        notifications: (sheetsData: any[], user: any) => {
            const sheets = Array.isArray(sheetsData[0]) ? sheetsData[0] : sheetsData;

            return sheets.filter(
                (sheet: any) => {
                    const vType = sheet.vendorType || sheet.vendor_type;
                    const status = (sheet.status || '').toLowerCase();
                    return firmMatchesAccess(sheet, user) &&
                        vType !== 'Direct' && vType !== 'Reject' && status !== 'rejected' &&
                        sheet.planned4 && sheet.planned4 !== '' &&
                        (!sheet.approvedVendorName && !sheet.approved_vendor_name) &&
                        (sheet.vendor1_rank || sheet.vendor2_rank || sheet.vendor3_rank);
                }
            ).length;
        },
    },
    // {
    //     path: 'pending-pos',
    //     gateKey: 'pendingIndentsView',
    //     name: 'PO to Make/Not',
    //     icon: <ListTodo size={20} />,
    //     element: <PendingIndents />,
    //     notifications: (sheets: any[]) =>
    //         sheets.filter((sheet: any) =>
    //             sheet.status === "Pending" &&
    //             sheet.approvedVendorName &&
    //             sheet.approvedVendorName.toString().trim() !== '' &&
    //             (!sheet.poRequred ||
    //                 sheet.poRequred.toString().trim() === '' ||
    //                 sheet.poRequred.toString().trim() === 'undefined' ||
    //                 sheet.poRequred === null)
    //         ).length,
    // },

    {
        path: 'pending-poss',
        gateKey: 'pendingPo', // ✅ CHANGE: lowercase 'o'
        name: 'Pending PO to be Created',
        icon: <Clock size={20} />,
        element: <PendingPo />,
        notifications: (sheets: any[], user: any) => {
            return sheets.filter((sheet: any) => {
                return firmMatchesAccess(sheet, user) &&
                    sheet.poRequred &&
                    sheet.poRequred.toString().trim() === 'Yes' &&
                    sheet.pendingPoQty &&
                    sheet.pendingPoQty > 0 &&
                    sheet.approvedVendorName &&
                    sheet.approvedVendorName.toString().trim() !== '';
            }).length;
        },
    },

    {
        path: 'create-po',
        gateKey: 'createPo',
        name: 'Create PO',
        icon: <FilePlus size={20} />,
        element: <CreatePO />,
        notifications: () => 0,
    },

    {
        path: 'po-history',
        gateKey: 'ordersView',
        name: 'PO History',
        icon: <History size={20} />,
        element: <Order />, // Changed from <Order /> to <POHistory />
        notifications: (sheets: any[], user: any) => {
            if (!Array.isArray(sheets) || sheets.length === 0) {
                return 0;
            }

            try {
                // Filter by allowed projects and valid PO numbers
                const sheetsWithPoNumbers = sheets.filter((sheet: any) => {
                    return firmMatchesAccess(sheet, user) &&
                        sheet?.poNumber &&
                        sheet?.poNumber.toString().trim() !== '';
                });

                if (sheetsWithPoNumbers.length === 0) {
                    return 0;
                }

                // Create a Map to store unique PO numbers
                const uniquePOMap = new Map<string, any>();

                // Add only unique PO numbers to the Map
                sheetsWithPoNumbers.forEach((sheet: any) => {
                    const poNumber = sheet?.poNumber.toString().trim();
                    if (poNumber && !uniquePOMap.has(poNumber)) {
                        uniquePOMap.set(poNumber, sheet);
                    }
                });

                // Return count of unique PO numbers
                return uniquePOMap.size;
            } catch (error) {
                console.error('Error calculating PO notifications:', error);
                return 0;
            }
        },
    },

    {
        path: 'get-lift',
        gateKey: 'ordersView',
        name: 'Lifting',
        icon: <ArrowUpCircle size={20} />,
        element: <GetLift />,
        notifications: (sheetsData: any[], user: any) => {
            const indentSheet = Array.isArray(sheetsData[0]) ? sheetsData[0] : [];
            const storeInSheet = Array.isArray(sheetsData[1]) ? sheetsData[1] : [];

            // Unique PO numbers that satisfy the criteria
            const uniquePOs = new Set<string>();

            indentSheet.forEach((sheet: any) => {
                // Calculate received quantity dynamically as done in GetLift.tsx
                const receivedQty = (Number(sheet.receivedQuantity) || 0) + storeInSheet
                    .filter(
                        (store: any) =>
                            (store.indentNo === sheet.indentNumber?.toString() || store.indent_no === sheet.indentNumber?.toString()) &&
                            (store.firmNameMatch === sheet.firmNameMatch || store.firm_name === sheet.firmNameMatch)
                    )
                    .reduce(
                        (sum: number, store: any) =>
                            sum + (Number(store.qty) || 0),
                        0
                    );

                const approvedQtySafe = Number(sheet.approvedQuantity) || Number(sheet.quantity) || 0;
                const pendingPoQty = (approvedQtySafe - receivedQty);

                const hasPlanned5 = sheet.planned5 && sheet.planned5.toString().trim() !== '';
                const hasNoActual5 = !sheet.actual5 || sheet.actual5.toString().trim() === '';
                const isPending = sheet.liftingStatus === 'Pending' || sheet.liftingStatus === '' || !sheet.liftingStatus;

                if (firmMatchesAccess(sheet, user) && hasPlanned5 && hasNoActual5 && isPending && pendingPoQty > 0) {
                    uniquePOs.add(sheet.poNumber || `NO_PO_${sheet.indentNumber}`);
                }
            });

            return uniquePOs.size;
        },
    },


    {
        path: 'store-in',
        gateKey: 'storeIn',
        name: 'Store Check',
        icon: <CheckCircle2 size={20} />,
        element: <StoreIn />,
        notifications: (sheetsData: any[], user: any) => {
            const sheets = Array.isArray(sheetsData[0]) ? sheetsData[0] : sheetsData;
            const filteredByFirm = sheets.filter((item: any) => {
                return firmMatchesAccess(item, user);
            });

            // Filter for pending items (planned6 set, actual6 empty)
            // Matching StoreIn.tsx line 228
            const pendingItems = filteredByFirm.filter(
                (i) => (i.planned6 || i.planned_6) && (i.planned6 || i.planned_6) !== '' &&
                    (!i.actual6 && !i.actual_6) &&
                    ((i.billStatus || i.bill_status) === 'Bill Received' || (i.billStatus || i.bill_status) === 'Not Received')
            );

            return pendingItems.length;
        },
    },
    {
        path: 'hod-store-check',
        gateKey: 'hodStoreApproval',
        name: 'HOD Check',
        icon: <UserCheck size={20} />,
        element: <HodStoreApproval />,
        notifications: (storeInSheet: any[], user: any) => {
            const data = Array.isArray(storeInSheet[0]) ? storeInSheet[0] : storeInSheet;

            return data.filter((sheet: any) => {
                const isPlanned = (sheet.plannedHod || sheet.hod_planned || sheet.hodPlanned);
                const isActual = (sheet.actualHod || sheet.hod_actual || sheet.hodActual);

                return firmMatchesAccess(sheet, user) &&
                    isPlanned && isPlanned.toString().trim() !== '' &&
                    (!isActual || isActual.toString().trim() === '');
            }).length;
        },
    },
    {
        path: 'Full-Kiting',
        gateKey: 'fullKiting',
        name: 'Freight Payment',
        icon: <Truck size={20} />,
        element: <FullKiting />,
        notifications: (sheets: any[], user: any) => {
            return sheets.filter((sheet: any) => {
                return firmMatchesAccess(sheet, user) &&
                    sheet.planned &&
                    sheet.planned.toString().trim() !== '' &&
                    (!sheet.actual || sheet.actual.toString().trim() === '');
            }).length;
        },
    },
    // {
    //     path: 'Payment-Status',
    //     name: 'Process for Payment / Debit Note',
    //     icon: <RefreshCw size={20} />,
    //     element: <PaymentStatus />,
    //     notifications: (sheetsData: any[]) => {
    //         try {
    //             // ✅ IMPORTANT: Expect [poMasterSheet, paymentsSheet, user, storeInSheet] from Sidebar
    //             const [poMasterSheet = [], paymentsSheet = [], user = null, storeInSheet = []] = sheetsData;

    //             if (!Array.isArray(poMasterSheet)) return 0;

    //             // 1. Identify received PO numbers from storeInSheet
    //             const receivedPos = new Set(
    //                 (storeInSheet || [])
    //                     .filter((s: any) => s.actual6 && s.actual6.toString().trim() !== '')
    //                     .map((s: any) => s.poNumber || s.po_number)
    //                     .filter(Boolean)
    //             );

    //             // 2. Calculate payment totals per PO from payments table
    //             const paymentsByPo: { [key: string]: number } = {};
    //             (paymentsSheet || []).forEach((p: any) => {
    //                 const key = p.poNumber || p.po_number || '';
    //                 if (key) {
    //                     paymentsByPo[key] = (paymentsByPo[key] || 0) + Number(p.payAmount || p.pay_amount || 0);
    //                 }
    //             });

    //             // 3. Collect unique bills by Party + Bill No
    //             const uniqueBills = new Set<string>();

    //             // Process PO-based items
    //             poMasterSheet.forEach((record: any) => {
    //                 const userFirm = (user?.firmNameMatch || '').trim().toLowerCase();
    //                 const recordFirm = (record.firmNameMatch || record.firm_name || '').trim().toLowerCase();
    //                 const firmMatch = userFirm === "all" || recordFirm === userFirm;
    //                 if (!firmMatch) return;

    //                 const poNum = record.poNumber || '';
    //                 const isReceived = receivedPos.has(poNum);
    //                 const paymentTerms = (record.paymentTerms || record.payment_terms || '').toString().trim().toLowerCase();
    //                 const isPI = paymentTerms.includes("partly pi") || paymentTerms.includes("partly advance");

    //                 // Link with StoreIn for HOD and Bill checks
    //                 const linkedStoreIn = (storeInSheet || []).find((s: any) =>
    //                     (s.poNumber || s.po_number || '') === (record.poNumber || record.po_number || '')
    //                 );

    //                 if (linkedStoreIn) {
    //                     if (linkedStoreIn.typeOfBill && linkedStoreIn.typeOfBill.toLowerCase() !== 'independent') return;
    //                     if ((linkedStoreIn.hodStatus || linkedStoreIn.hod_status) !== 'Approved') return;
    //                 }

    //                 if (!isReceived && !isPI) return;

    //                 const totalPo = Number(record.totalPoAmount || 0);
    //                 const totalPaid = paymentsByPo[poNum] || 0;
    //                 const outstanding = totalPo - totalPaid;
    //                 const status = (record.status || '').toString().trim().toLowerCase();
    //                 const isPending = status === 'pending' || status === '';

    //                 if (outstanding > 0 && isPending) {
    //                     // ✅ Count ONLY if it matches the 'Advance Terms' logical filter
    //                     const pt = (record.paymentTerms || record.payment_terms || '').toLowerCase();
    //                     if (pt.includes('advance') || pt.includes('pi')) {
    //                         const billNo = linkedStoreIn?.billNo || linkedStoreIn?.bill_no || 'NoBill';
    //                         const uniqueKey = `${record.partyName || record.party_name || 'NoVendor'}-${billNo}`;
    //                         uniqueBills.add(uniqueKey);
    //                     }
    //                 }
    //             });

    //             // Process Payment-based items
    //             (paymentsSheet || []).forEach((payment: any) => {
    //                 const userFirm = (user?.firmNameMatch || '').trim().toLowerCase();
    //                 const paymentFirm = (payment.firmNameMatch || payment.firm_name || payment.firm_name || '').trim().toLowerCase();
    //                 const firmMatch = userFirm === "all" || paymentFirm === userFirm;
    //                 if (!firmMatch) return;

    //                 const status = String(payment.status || '').toLowerCase();
    //                 const isPending = status === 'pending';
    //                 const notScheduled = !payment.planned || String(payment.planned || '').trim() === '';

    //                 if (isPending && notScheduled) {
    //                     // ✅ Count ONLY if it matches 'Advance Terms'
    //                     const pt = (payment.paymentTerms || payment.payment_terms || '').toLowerCase();
    //                     if (pt.includes('advance') || pt.includes('pi')) {
    //                         const linkedStoreIn = (storeInSheet || []).find((s: any) =>
    //                             (s.indentNo || s.indentNumber) === (payment.internalCode || payment.internal_code)
    //                         );
    //                         if (linkedStoreIn) {
    //                             if (linkedStoreIn.typeOfBill && linkedStoreIn.typeOfBill.toLowerCase() !== 'independent') return;
    //                             if ((linkedStoreIn.hodStatus || linkedStoreIn.hod_status) !== 'Approved') return;
    //                         }

    //                         const billNo = payment.billNo || payment.bill_no || linkedStoreIn?.billNo || linkedStoreIn?.bill_no || 'NoBill';
    //                         const uniqueKey = `${payment.partyName || payment.party_name || 'NoVendor'}-${billNo}`;
    //                         uniqueBills.add(uniqueKey);
    //                     }
    //                 }
    //             });

    //             return uniqueBills.size;
    //         } catch (error) {
    //             console.error('Error calculating Payment-Status notifications:', error);
    //             return 0;
    //         }
    //     }
    // },


    {
        path: 'Make-Payment',
        gateKey: 'makePayment',
        name: 'Make Payment',
        icon: <CreditCard size={20} />,
        element: <MakePayment />,
        notifications: (sheets: any[], user: any) => {
            const paymentsData = Array.isArray(sheets[0]) ? sheets[0] : sheets;
            const storeInSheet = Array.isArray(sheets[1]) ? sheets[1] : [];

            if (paymentsData.length === 0) return 0;

            const pendingItems = paymentsData.filter((payment: any) => {
                const firmMatch = firmMatchesAccess(payment, user);
                if (!firmMatch) return false;

                // Check payment terms: Only count if Partly Advance or Partly PI
                const terms = String(payment?.paymentTerms || payment?.payment_terms || '').toLowerCase();
                const paymentForm = String(payment?.paymentForm || payment?.payment_form || '').toLowerCase();
                const isPartlyTerms = terms.includes('partly') && (terms.includes('advance') || terms.includes('pi'));
                const isDirectPayment = paymentForm === 'store_in' || paymentForm === 'freight';
                if (!isPartlyTerms && !isDirectPayment) return false;

                // Check linked Store In for HOD status: Only count if Approved
                const linkedStoreIn = storeInSheet.find((s: any) =>
                    (s.indentNo || s.indentNumber) === (payment.internalCode || payment.internal_code)
                );
                if (linkedStoreIn && (linkedStoreIn.hodStatus || linkedStoreIn.hod_status) !== 'Approved') {
                    return false;
                }

                const actual = String(payment?.actual || '').trim();
                const status1 = String(payment?.status1 || '').toLowerCase();

                const noActual = actual === '';
                const isNotHodPending = status1 !== 'hod_approval_pending';

                return noActual && isNotHodPending;
            });

            // Filter to keep ONLY the latest record per Indent and Product
            const seen = new Set<string>();
            let count = 0;
            pendingItems.forEach((item: any) => {
                const key = `${item.internal_code || item.internalCode || ''}-${item.product || ''}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    count++;
                }
            });
            return count;
        },
    },



    // {
    //     path: 'Exchange-Materials',
    //     gateKey: 'exchangeMaterials',
    //     name: 'Exchange Materials',
    //     icon: <PackageCheck size={20} />,
    //     element: <ExchangeMaterials />,
    //     notifications: (sheets: any[]) =>
    //         sheets.filter((sheet: any) =>
    //             sheet.planned10 &&
    //             sheet.planned10.toString().trim() !== '' &&
    //             (!sheet.actual10 || sheet.actual10.toString().trim() === '')
    //         ).length,
    // },

    // {
    //     path: 'Return-Material-To-Party',
    //     gateKey: 'returnMaterialToParty',
    //     name: 'Return Material To Party',
    //     icon: <RotateCcw size={20} />,
    //     element: <ReturnMaterialToParty />,
    //     notifications: (sheets: any[]) =>
    //         sheets.filter((sheet: any) =>
    //             sheet.planned8 &&
    //             sheet.planned8.toString().trim() !== '' &&
    //             (!sheet.actual8 || sheet.actual8.toString().trim() === '')
    //         ).length,
    // },

    {
        path: 'Quality-Check-In-Received-Item',
        gateKey: 'insteadOfQualityCheckInReceivedItem',
        name: 'Reject For GRN',
        icon: <FileX size={20} />,
        element: <QuantityCheckInReceiveItem />,
        notifications: (sheetsData: any[], user: any) => {
            const sheets = Array.isArray(sheetsData[0]) ? sheetsData[0] : sheetsData;

            return sheets.filter((sheet: any) => {
                return firmMatchesAccess(sheet, user) &&
                    (sheet.planned7 || sheet.planned_7) &&
                    (sheet.planned7 || sheet.planned_7).toString().trim() !== '' &&
                    (!sheet.actual7 && !sheet.actual_7)
            }).length;
        },
    },
    {
        path: 'Send-Debit-Note',
        gateKey: 'sendDebitNote',
        name: 'Send Debit Note',
        icon: <Send size={20} />,
        element: <SendDebitNote />,
        notifications: (sheetsData: any[], user: any) => {
            const sheets = Array.isArray(sheetsData[0]) ? sheetsData[0] : sheetsData;

            return sheets.filter((sheet: any) => {
                return firmMatchesAccess(sheet, user) &&
                    (sheet.planned9 || sheet.planned_9) &&
                    (sheet.planned9 || sheet.planned_9).toString().trim() !== '' &&
                    (!sheet.actual9 && !sheet.actual_9)
            }).length;
        },
    },

    {
        path: 'audit-data',
        gateKey: 'auditData',
        name: 'Audit Data',
        icon: <BarChart size={20} />,
        element: <AuditData />,
        notifications: (sheets: any[], user: any) => {
            return sheets.filter((sheet: any) => {
                return firmMatchesAccess(sheet, user) &&
                    sheet.planned1 &&
                    sheet.planned1.toString().trim() !== '' &&
                    (!sheet.actual1 || sheet.actual1.toString().trim() === '');
            }).length;
        },
    },

    // {
    //     path: 'rectify-the-mistake',
    //     gateKey: 'rectifyTheMistake',
    //     name: 'Rectify the mistake',
    //     icon: <Users size={20} />,
    //     element: <RectifyTheMistake />,
    //     notifications: (sheets: any[]) => {
    //         if (!sheets || !Array.isArray(sheets) || sheets.length === 0) return 0;

    //         const sheetData = Array.isArray(sheets[0]) ? sheets[0] : sheets;

    //         let count = 0;
    //         sheetData.forEach((item: any) => {
    //             const planned2 = item['Planned 2'] || item['planned2'];
    //             const actual2 = item['Actual 2'] || item['actual2'];

    //             const hasPlanned2 = planned2 && planned2.toString().trim() !== '';
    //             const noActual2 = !actual2 || actual2.toString().trim() === '';

    //             if (hasPlanned2 && noActual2) {
    //                 count++;
    //             }
    //         });

    //         return count;
    //     },
    // },

    // {
    //     path: 'reaudit-data',
    //     gateKey: 'reauditData',
    //     name: 'Reaudit Data',
    //     icon: <Users size={20} />,
    //     element: <ReauditData />,
    //     notifications: (sheets: any[]) => {
    //         if (!sheets || !Array.isArray(sheets) || sheets.length === 0) return 0;

    //         const sheetData = Array.isArray(sheets[0]) ? sheets[0] : sheets;

    //         let count = 0;
    //         sheetData.forEach((item: any) => {
    //             const planned3 = item['Planned 3'] || item['planned3'];
    //             const actual3 = item['Actual 3'] || item['actual3'];

    //             const hasPlanned3 = planned3 && planned3.toString().trim() !== '';
    //             const noActual3 = !actual3 || actual3.toString().trim() === '';

    //             if (hasPlanned3 && noActual3) {
    //                 count++;
    //             }
    //         });

    //         return count;
    //     },
    // },


    //     {
    //     path: 'take-entry-by-tally',
    //     gateKey: 'takeEntryByTelly',
    //     name: 'Take Entry By Tally',
    //     icon: <ClipboardList size={20} />,
    //     element: <TakeEntryByTally />,
    //     notifications: (sheets: any[]) => {
    //         if (!sheets || !Array.isArray(sheets) || sheets.length === 0) return 0;

    //         const sheetData = Array.isArray(sheets[0]) ? sheets[0] : sheets;

    //         let count = 0;
    //         sheetData.forEach((item: any) => {
    //             const planned4 = item['Planned 4'] || item['planned4'];
    //             const actual4 = item['Actual 4'] || item['actual4'];

    //             const hasPlanned4 = planned4 && planned4.toString().trim() !== '';
    //             const noActual4 = !actual4 || actual4.toString().trim() === '';

    //             if (hasPlanned4 && noActual4) {
    //                 count++;
    //             }
    //         });

    //         return count;
    //     },
    // },

    //   {
    //     path: 'AgainAuditing',
    //     gateKey: 'againAuditing',
    //     name: 'Again Auditing',
    //     icon: <UserCheck size={20} />,
    //     element: <AgainAuditing />,
    //     notifications: (sheets: any[]) => {
    //         if (!sheets || !Array.isArray(sheets) || sheets.length === 0) return 0;

    //         // The sheet data is passed as the first item in the array
    //         const sheetData = sheets[0];
    //         if (!Array.isArray(sheetData)) return 0;

    //         console.log('🔍 Again Auditing - Sheet data count:', sheetData.length);

    //         let count = 0;
    //         sheetData.forEach((item: any) => {
    //             const planned5 = item['Planned 5'] || item['planned5'];
    //             const actual5 = item['Actual 5'] || item['actual5'];

    //             const hasPlanned5 = planned5 && planned5.toString().trim() !== '';
    //             const noActual5 = !actual5 || actual5.toString().trim() === '';

    //             if (hasPlanned5 && noActual5) {
    //                 count++;
    //             }
    //         });

    //         console.log('📈 Again Auditing - Final count:', count);
    //         return count;
    //     },
    // },
    // {
    //     path: 'store-out-approval',
    //     gateKey: 'storeOutApprovalView',
    //     name: 'Store Out Approval',
    //     icon: <PackageCheck size={20} />,
    //     element: <StoreOutApproval />,
    //     notifications: (sheets: any[]) =>
    //         sheets.filter(
    //             (sheet: any) =>
    //                 sheet.planned6 !== '' &&
    //                 sheet.actual6 === '' &&
    //                 sheet.indentType === 'Store Out'
    //         ).length,
    // },
    {
        path: 'Bill-Not-Received',
        gateKey: 'billNotReceived',
        name: 'Bill Not Received',
        icon: <FileWarning size={20} />,
        element: <BillNotReceived />,
        notifications: (sheets: any[], user: any) => {
            // Count items where planned11 is set but actual11 is not
            return sheets.filter((sheet: any) => {
                if (!firmMatchesAccess(sheet, user)) return false;

                const hasPlanned11 = sheet.planned11 && sheet.planned11.toString().trim() !== '';
                const noActual11 = !sheet.actual11 || sheet.actual11.toString().trim() === '';

                return hasPlanned11 && noActual11;
            }).length;
        },
    },

    {
        path: 'DBforPc',
        gateKey: 'dbForPc',
        name: 'DB For PC',
        icon: <PackageCheck size={20} />,
        element: <DBforPc />,
        notifications: (pcReportSheet: any[]) => {
            const data = Array.isArray(pcReportSheet[0]) ? pcReportSheet[0] : pcReportSheet;
            return data.reduce((sum: number, stage: any) => sum + (Number(stage.totalPending) || 0), 0);
        },
    },
    {
        path: 'master-registry',
        gateKey: 'masterRegistry',
        name: 'Master Registry',
        icon: <FileSpreadsheet size={20} />,
        element: <MasterManagement />,
        notifications: () => 0,
    },
    {
        path: 'training-video',
        name: 'Training Video',
        icon: <VideoIcon size={20} />,
        element: <TrainnigVideo />,
        notifications: () => 0,
        hidden: true,
    },
    {
        path: 'license',
        name: 'License',
        icon: <KeyRound size={20} />,
        element: <Liecense />,
        notifications: () => 0,
    },
    {
        path: 'manage-users',
        gateKey: 'manageUsers',
        name: 'Manage Users',
        icon: <Users size={20} />,
        element: <ManageUsers />,
        notifications: () => 0,
    },
];

const rootElement = document.getElementById('root');

if (rootElement) {
    // Attach root to container element to prevent re-creation during Vite HMR module re-evaluations
    const container = rootElement as any;
    if (!container._reactRootContainer) {
        container._reactRootContainer = createRoot(rootElement);
    }
    const root = container._reactRootContainer;

    root.render(
        <StrictMode>
            <AuthProvider>
                <ProjectProvider>
                    <QueryClientProvider client={hrQueryClient}>
                        <BrowserRouter>
                            <React.Suspense fallback={<Loading />}>
                                <Routes>
                                {/* Public Routes */}
                                <Route path="/login" element={<Login />} />
                                <Route path="/create-account" element={<CreateAccount />} />
                                <Route path="/bid/:token" element={<VendorBidding />} />

                                {/* Project Selection Guarded Route */}
                                <Route
                                    path="/select-project"
                                    element={
                                        <ProtectedRoute>
                                            <SelectProject />
                                        </ProtectedRoute>
                                    }
                                />

                                {/* Layer 1 Protected Master Platform Shell */}
                                <Route
                                    path="/"
                                    element={
                                        <ProtectedRoute>
                                            <ProjectGuard>
                                                <SheetsProvider>
                                                    <App />
                                                </SheetsProvider>
                                            </ProjectGuard>
                                        </ProtectedRoute>
                                    }
                                >
                                {/* Platform Dashboards */}
                                <Route index element={<GlobalDashboard />} />
                                <Route path="dashboard" element={<GlobalDashboard />} />

                                {/* Layer 2 STORE & INVENTORY SYSTEM MODULE */}
                                <Route path="store" element={<StoreSystemLayout />}>
                                    <Route index element={<Navigate to="/store/dashboard" replace />} />
                                    <Route path="dashboard" element={<Dashboard />} />

                                    {/* Inventory Sub-Routes */}
                                    <Route path="inventory/stock" element={<GatedRoute identifier="inventory"><Inventory /></GatedRoute>} />
                                    <Route path="inventory/issue" element={<GatedRoute identifier="storeIssue"><StoreIssue /></GatedRoute>} />
                                    <Route path="inventory/issue-return" element={<GatedRoute identifier="storeIssueReturn"><StoreIssueReturn /></GatedRoute>} />
                                    <Route path="inventory/issue-data" element={<GatedRoute identifier="issueData"><IssueData /></GatedRoute>} />

                                    {/* Indents Sub-Routes */}
                                    <Route path="indents/create" element={<GatedRoute identifier="createIndent"><CreateIndent /></GatedRoute>} />
                                    <Route path="indents/approve" element={<GatedRoute identifier="indentApprovalView"><ApproveIndent /></GatedRoute>} />
                                    <Route path="indents/vendor-rates" element={<GatedRoute identifier="updateVendorView"><VendorUpdate /></GatedRoute>} />
                                    <Route path="indents/technical-approval" element={<GatedRoute identifier="threePartyApprovalView"><DepartmentApproval /></GatedRoute>} />
                                    <Route path="indents/management-approval" element={<GatedRoute identifier="managementApprovalView"><RateApproval /></GatedRoute>} />

                                    {/* Procurement Sub-Routes */}
                                    <Route path="procurement/enquiry" element={<GatedRoute identifier="createEnquiry"><QuotationPage /></GatedRoute>} />
                                    <Route path="procurement/pending-po" element={<GatedRoute identifier="pendingPo"><PendingPo /></GatedRoute>} />
                                    <Route path="procurement/create-po" element={<GatedRoute identifier="createPo"><CreatePO /></GatedRoute>} />
                                    <Route path="procurement/po-history" element={<GatedRoute identifier="poHistory"><Order /></GatedRoute>} />
                                    <Route path="procurement/lifting" element={<GatedRoute identifier="ordersView"><GetLift /></GatedRoute>} />

                                    {/* Receipts Sub-Routes */}
                                    <Route path="receipts/store-in" element={<GatedRoute identifier="storeIn"><StoreIn /></GatedRoute>} />
                                    <Route path="receipts/hod-check" element={<GatedRoute identifier="hodStoreApproval"><HodStoreApproval /></GatedRoute>} />
                                    <Route path="receipts/grn-rejection" element={<GatedRoute identifier="insteadOfQualityCheckInReceivedItem"><QuantityCheckInReceiveItem /></GatedRoute>} />
                                    <Route path="receipts/bill-pending" element={<GatedRoute identifier="billNotReceived"><BillNotReceived /></GatedRoute>} />

                                    {/* Finance Sub-Routes */}
                                    <Route path="finance/make-payment" element={<GatedRoute identifier="makePayment"><MakePayment /></GatedRoute>} />
                                    <Route path="finance/freight-payment" element={<GatedRoute identifier="fullKiting"><FullKiting /></GatedRoute>} />
                                    <Route path="finance/debit-note" element={<GatedRoute identifier="sendDebitNote"><SendDebitNote /></GatedRoute>} />

                                    {/* Auditing Sub-Routes */}
                                    <Route path="auditing/audit-data" element={<GatedRoute identifier="auditData"><AuditData /></GatedRoute>} />
                                    <Route path="auditing/tally-entry" element={<GatedRoute identifier="takeEntryByTelly"><TakeEntryByTally /></GatedRoute>} />
                                    <Route path="auditing/pc-report" element={<GatedRoute identifier="dbForPc"><DBforPc /></GatedRoute>} />

                                    {/* Admin Sub-Routes */}
                                    <Route path="admin/master-registry" element={<GatedRoute identifier="masterRegistry"><MasterManagement /></GatedRoute>} />
                                    <Route path="admin/manage-users" element={<GatedRoute identifier="manageUsers"><ManageUsers /></GatedRoute>} />
                                    <Route path="admin/working-calendar" element={<GatedRoute identifier="workingCalendar"><WorkingCalendar /></GatedRoute>} />
                                    <Route path="admin/holidays" element={<GatedRoute identifier="holidays"><Holidays /></GatedRoute>} />
                                    <Route path="admin/license" element={<Navigate to="/license" replace />} />
                                </Route>

                                {/* Layer 2 MAINTENANCE SYSTEM MODULE (Proof of Concept) */}
                                <Route path="maintenance" element={<MaintenanceSystemLayout />}>
                                    <Route index element={<Navigate to="/maintenance/dashboard" replace />} />
                                    <Route path="dashboard" element={<MaintenanceDashboard />} />
                                    <Route path="machines" element={<MaintenanceDashboard />} />
                                    <Route path="breakdowns" element={<MaintenanceDashboard />} />
                                </Route>

                                {/* Layer 2 CHECKLIST & DELEGATION SYSTEM MODULE */}
                                <Route
                                    path="checklist"
                                    element={
                                        <ChecklistProvider>
                                            <ChecklistSystemLayout />
                                        </ChecklistProvider>
                                    }
                                >
                                    <Route index element={<Navigate to="/checklist/dashboard" replace />} />
                                    <Route path="dashboard" element={<GatedRoute identifier="checklistDash"><ChecklistDashboard /></GatedRoute>} />
                                    <Route path="quick-task" element={<GatedRoute identifier="checklistQuickTask"><QuickTask /></GatedRoute>} />
                                    <Route path="assign" element={<GatedRoute identifier="checklistAssign"><AssignTask /></GatedRoute>} />
                                    <Route path="submit/checklist" element={<GatedRoute identifier="checklistSubmitChecklist"><ChecklistSubmission /></GatedRoute>} />
                                    <Route path="submit/delegation" element={<GatedRoute identifier="checklistSubmitDelegation"><DelegationSubmission /></GatedRoute>} />
                                    <Route path="approval" element={<GatedRoute identifier="checklistApproval"><AdminApproval /></GatedRoute>} />
                                </Route>

                                {/* Layer 2 PETTY CASH SYSTEM MODULE */}
                                <Route path="petty-cash" element={<PettyCashSystemLayout />}>
                                    <Route index element={<Navigate to="/petty-cash/dashboard" replace />} />
                                    <Route path="dashboard" element={<GatedRoute identifier="pettyCashDash"><PettyCashDashboard /></GatedRoute>} />
                                    <Route path="entries" element={<GatedRoute identifier="pettyCashEntries"><AddCase /></GatedRoute>} />
                                    <Route path="ledger" element={<GatedRoute identifier="pettyCashLedger"><Ledger /></GatedRoute>} />
                                    <Route path="reports" element={<GatedRoute identifier="pettyCashReports"><PettyCashReports /></GatedRoute>} />
                                    <Route path="master" element={<Navigate to="/store/admin/master-registry" replace />} />
                                    <Route path="settings" element={<GatedRoute identifier="pettyCashSettings"><PettyCashSettings /></GatedRoute>} />
                                </Route>

                                {/* Layer 2 DOCUMENT & SUBSCRIPTION SYSTEM MODULE */}
                                <Route path="document" element={<DocumentSystemLayout />}>
                                    <Route index element={<Navigate to="/document/dashboard" replace />} />
                                    <Route path="dashboard" element={<GatedRoute identifier="docDash"><DocumentDashboard /></GatedRoute>} />
                                    <Route path="resources" element={<GatedRoute identifier="docResourceManager"><ResourceManager /></GatedRoute>} />
                                    <Route path="all" element={<GatedRoute identifier="docAllDocuments"><AllDocuments /></GatedRoute>} />
                                    <Route path="renewal" element={<GatedRoute identifier="docRenewal"><DocumentRenewal /></GatedRoute>} />
                                    <Route path="shared" element={<GatedRoute identifier="docShared"><SharedDocuments /></GatedRoute>} />

                                    {/* Subscription subroutes */}
                                    <Route path="subscription/all" element={<GatedRoute identifier="docAllSubscriptions"><AllSubscriptions /></GatedRoute>} />
                                    <Route path="subscription/approval" element={<GatedRoute identifier="docSubApproval"><SubscriptionApproval /></GatedRoute>} />
                                    <Route path="subscription/payment" element={<GatedRoute identifier="docSubPayment"><SubscriptionPayment /></GatedRoute>} />
                                    <Route path="subscription/renewal" element={<GatedRoute identifier="docSubRenewal"><SubscriptionRenewal /></GatedRoute>} />

                                    {/* Loan subroutes */}
                                    <Route path="loan/all" element={<GatedRoute identifier="docAllLoans"><AllLoans /></GatedRoute>} />
                                    <Route path="loan/foreclosure" element={<GatedRoute identifier="docLoanForeclosure"><Foreclosure /></GatedRoute>} />
                                    <Route path="loan/noc" element={<GatedRoute identifier="docLoanNoc"><LoanNOC /></GatedRoute>} />
                                </Route>


                                {/* Layer 2 HR & FACILITIES MANAGEMENT SYSTEM MODULE */}
                                <Route path="hr" element={<HrSystemLayout />}>
                                    <Route index element={<Navigate to="/hr/dashboard" replace />} />
                                    <Route path="dashboard" element={<HrDashboardPage />} />
                                    <Route path="indent" element={<HrIndentPage />} />
                                    <Route path="find-enquiry" element={<HrFindEnquiryPage />} />
                                    <Route path="employee" element={<HrEmployeePage />} />
                                    <Route path="deployment" element={<HrDeploymentPage />} />
                                    <Route path="attendance" element={<HrAttendancePage />} />
                                    <Route path="leave" element={<HrLeavePage />} />
                                    <Route path="gate-pass" element={<HrGatePassPage />} />
                                    <Route path="advance" element={<HrAdvancePage />} />
                                    <Route path="advance/loan/:advanceId" element={<HrLoanTransactionPage />} />
                                    <Route path="salary-management" element={<HrSalaryManagementPage />} />
                                    <Route path="salary-management/:employeeId" element={<HrSalaryDetailPage />} />
                                    <Route path="after-joining" element={<HrAfterJoiningPage />} />
                                    <Route path="after-leaving" element={<HrAfterLeavingPage />} />
                                    <Route path="letter-formatter" element={<HrLetterFormatterPage />} />
                                    <Route path="calendar" element={<HrCalendarPage />} />
                                    <Route path="social-site" element={<HrSocialSitePage />} />
                                    {/* <Route path="reports" element={<HrReportsPage />} /> */}
                                </Route>

                                {/* Doc-submanager backward compatibility aliases */}
                                <Route path="doc-submanager/*" element={<Navigate to="/document/dashboard" replace />} />

                                {/* LEGACY FLAT ROUTE BACKWARD COMPATIBILITY REDIRECTS */}
                                <Route path="quotation" element={<Navigate to="/store/procurement/enquiry" replace />} />
                                <Route path="store-issue" element={<Navigate to="/store/inventory/issue" replace />} />
                                <Route path="store-issue-return" element={<Navigate to="/store/inventory/issue-return" replace />} />
                                <Route path="Issue-data" element={<Navigate to="/store/inventory/issue-data" replace />} />
                                <Route path="inventory" element={<Navigate to="/store/inventory/stock" replace />} />
                                <Route path="create-indent" element={<Navigate to="/store/indents/create" replace />} />
                                <Route path="approve-indent" element={<Navigate to="/store/indents/approve" replace />} />
                                <Route path="vendor-rate-update" element={<Navigate to="/store/indents/vendor-rates" replace />} />
                                <Route path="technical-approval" element={<Navigate to="/store/indents/technical-approval" replace />} />
                                <Route path="management-approval" element={<Navigate to="/store/indents/management-approval" replace />} />
                                <Route path="pending-poss" element={<Navigate to="/store/procurement/pending-po" replace />} />
                                <Route path="create-po" element={<Navigate to="/store/procurement/create-po" replace />} />
                                <Route path="po-history" element={<Navigate to="/store/procurement/po-history" replace />} />
                                <Route path="get-lift" element={<Navigate to="/store/procurement/lifting" replace />} />
                                <Route path="store-in" element={<Navigate to="/store/receipts/store-in" replace />} />
                                <Route path="hod-store-check" element={<Navigate to="/store/receipts/hod-check" replace />} />
                                <Route path="Full-Kiting" element={<Navigate to="/store/finance/freight-payment" replace />} />
                                <Route path="Make-Payment" element={<Navigate to="/store/finance/make-payment" replace />} />
                                <Route path="Quality-Check-In-Received-Item" element={<Navigate to="/store/receipts/grn-rejection" replace />} />
                                <Route path="Send-Debit-Note" element={<Navigate to="/store/finance/debit-note" replace />} />
                                <Route path="audit-data" element={<Navigate to="/store/auditing/audit-data" replace />} />
                                <Route path="Bill-Not-Received" element={<Navigate to="/store/receipts/bill-pending" replace />} />
                                <Route path="DBforPc" element={<Navigate to="/store/auditing/pc-report" replace />} />
                                <Route path="master-registry" element={<Navigate to="/store/admin/master-registry" replace />} />
                                <Route path="manage-users" element={<Navigate to="/store/admin/manage-users" replace />} />
                                <Route path="license" element={<Liecense />} />

                                {/* Fallback route */}
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Route>
                        </Routes>
                    </React.Suspense>
                </BrowserRouter>
                    </QueryClientProvider>
            </ProjectProvider>
        </AuthProvider>
    </StrictMode>
    );
}
