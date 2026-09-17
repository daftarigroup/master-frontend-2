import { 
    Building, ShieldCheck, User as UserIcon, Users, Eye, EyeClosed, MoreHorizontal, Pencil, 
    ShieldUser, Trash, UserPlus, Fingerprint, Lock, Shield, Settings, CheckSquare, 
    ListTodo, ClipboardCheck, Truck, BarChart3, Box, Crown, ChevronDown, ChevronRight,
    Wrench, Layers, AlertCircle, Edit3, ShieldAlert, Wallet, FileText, Files, Package, UserCog
} from 'lucide-react';
import Heading from '../element/Heading';
import { useEffect, useMemo, useRef, useState } from 'react';
import { allPermissionKeys, type UserPermissions } from '@/types/sheets';
import type { ColumnDef } from '@tanstack/react-table';
import DataTable from '../element/DataTable';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { useAuth } from '@/context/AuthContext';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { PuffLoader as Loader } from 'react-spinners';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Pill } from '../ui/pill';
import { fetchUsers, createUser, updateUser, deleteUser } from '@/services/userService';
import { fetchMasterOptions } from '@/services/masterService';
import { Card, CardContent } from '../ui/card';
import { Separator } from '../ui/separator';
import { cn } from '@/lib/utils';

interface UsersTableData {
    id: number;
    username: string;
    name: string;
    password: string;
    role: 'SUPER_ADMIN' | 'ADMIN' | 'USER';
    modify_access: 'EDIT' | 'VIEW';
    firmNameMatch: string;
    firm_access: string[];
    permissions: string[];
    page_access?: Record<string, any>;
    system_access?: string[];
}

interface SystemPageConfig {
    id: string;
    name: string;
    description: string;
    viewKeys: string[];
    editKeys: string[];
}

interface SystemConfig {
    id: string;
    name: string;
    badgeBg: string;
    badgeText: string;
    icon: React.ReactNode;
    description: string;
    pages: SystemPageConfig[];
}

const SYSTEM_HIERARCHY: SystemConfig[] = [
    {
        id: 'master_settings',
        name: 'Master Settings & User Management',
        badgeBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
        badgeText: 'Master Settings',
        icon: <Users className="size-5 text-indigo-500" />,
        description: 'Universal master repository, user access administration, roles, and global permissions settings',
        pages: [
            {
                id: 'master_registry',
                name: 'Master Registry',
                description: 'Universal repository for Vendors, Items, Group Heads, Projects, Companies, Document Types & Categories',
                viewKeys: ['masterRegistry'],
                editKeys: ['masterRegistry'],
            },
            {
                id: 'manage_users',
                name: 'Manage Users',
                description: 'User access administration, user accounts, and permissions settings',
                viewKeys: ['manageUsers'],
                editKeys: ['manageUsers'],
            },
            {
                id: 'working_calendar',
                name: 'Working Calendar',
                description: 'Configure organization working days and weekly off schedules',
                viewKeys: ['workingCalendar'],
                editKeys: ['workingCalendar'],
            },
            {
                id: 'holidays',
                name: 'Holidays',
                description: 'Manage company holidays excluded from task generation',
                viewKeys: ['holidays'],
                editKeys: ['holidays'],
            },
        ]
    },
    {
        id: 'store',
        name: 'Store Management System',
        badgeBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
        badgeText: 'Store Module',
        icon: <Box className="size-5 text-blue-500" />,
        description: 'Inventory control, indent approvals, purchase orders, store check-in/issue, and financial audits',
        pages: [
            {
                id: 'create_enquiry',
                name: 'Enquiry / Quotation',
                description: 'Send vendor quotation inquiries and manage enquiry responses',
                viewKeys: ['createEnquiry'],
                editKeys: ['createEnquiry'],
            },
            {
                id: 'inventory',
                name: 'Inventory',
                description: 'Monitor warehouse inventory stock levels',
                viewKeys: ['inventory'],
                editKeys: ['inventory'],
            },
            {
                id: 'store_issue',
                name: 'Store Issue',
                description: 'Issue materials to doers/projects from store inventory',
                viewKeys: ['storeIssue'],
                editKeys: ['storeIssue'],
            },
            {
                id: 'store_issue_return',
                name: 'Store Issue Return',
                description: 'Handle returns of issued materials back to store',
                viewKeys: ['storeIssueReturn'],
                editKeys: ['storeIssueReturn'],
            },
            {
                id: 'store_data',
                name: 'Store Data',
                description: 'View consolidated store issue and return data records',
                viewKeys: ['issueData'],
                editKeys: ['issueData'],
            },
            {
                id: 'create_indent',
                name: 'Create Indent',
                description: 'Create store requisitions and material indents',
                viewKeys: ['createIndent'],
                editKeys: ['createIndent'],
            },
            {
                id: 'indent_approval',
                name: 'Indent Approval',
                description: 'Review, approve, or reject material indents',
                viewKeys: ['indentApprovalView'],
                editKeys: ['indentApprovalView', 'indentApprovalAction'],
            },
            {
                id: 'vendor_rates',
                name: 'Vendor Rate Update',
                description: 'Update and approve vendor item rate lists',
                viewKeys: ['updateVendorView'],
                editKeys: ['updateVendorView', 'updateVendorAction'],
            },
            {
                id: 'technical_approval',
                name: 'Technical Approval',
                description: 'Multi-stage technical ranking of vendor quotations',
                viewKeys: ['threePartyApprovalView'],
                editKeys: ['threePartyApprovalView', 'threePartyApprovalAction'],
            },
            {
                id: 'management_approval',
                name: 'Management Approval',
                description: 'Final management-level approval of vendor rate selection',
                viewKeys: ['managementApprovalView'],
                editKeys: ['managementApprovalView', 'managementApprovalAction'],
            },
            {
                id: 'pending_po',
                name: 'Pending PO to Make',
                description: 'Track pending purchase orders awaiting creation from approved indents',
                viewKeys: ['pendingPo'],
                editKeys: ['pendingPo'],
            },
            {
                id: 'create_po',
                name: 'Create PO',
                description: 'Generate purchase orders for approved vendor items',
                viewKeys: ['createPo'],
                editKeys: ['createPo'],
            },
            {
                id: 'po_history',
                name: 'PO History',
                description: 'Track purchase order history and status records',
                viewKeys: ['poHistory'],
                editKeys: ['poHistory'],
            },
            {
                id: 'orders_view',
                name: 'Lifting',
                description: 'Track material lifting logs against purchase orders',
                viewKeys: ['ordersView'],
                editKeys: ['ordersView'],
            },
            {
                id: 'store_in',
                name: 'Store Check',
                description: 'Verify goods received notes against purchase orders',
                viewKeys: ['storeIn'],
                editKeys: ['storeIn'],
            },
            {
                id: 'hod_check',
                name: 'HOD Check',
                description: 'HOD sign-off and verification of received goods',
                viewKeys: ['hodStoreApproval'],
                editKeys: ['hodStoreApproval'],
            },
            {
                id: 'grn_rejection',
                name: 'Reject For GRN',
                description: 'Process rejected or damaged items during GRN check',
                viewKeys: ['insteadOfQualityCheckInReceivedItem'],
                editKeys: ['insteadOfQualityCheckInReceivedItem'],
            },
            {
                id: 'bill_not_received',
                name: 'Bill Not Received',
                description: 'Track receipts pending vendor bill submission',
                viewKeys: ['billNotReceived'],
                editKeys: ['billNotReceived'],
            },
            {
                id: 'make_payment',
                name: 'Make Payment',
                description: 'Record and process vendor payments',
                viewKeys: ['makePayment'],
                editKeys: ['makePayment'],
            },
            {
                id: 'freight_payment',
                name: 'Freight Payment',
                description: 'Process freight and full-kitting charge settlements',
                viewKeys: ['fullKiting'],
                editKeys: ['fullKiting'],
            },
            {
                id: 'debit_note',
                name: 'Send Debit Note',
                description: 'Raise debit notes against vendors for discrepancies',
                viewKeys: ['sendDebitNote'],
                editKeys: ['sendDebitNote'],
            },
            {
                id: 'audit_data',
                name: 'Audit Data',
                description: 'Store audit data entries and financial reconciliation',
                viewKeys: ['auditData'],
                editKeys: ['auditData'],
            },
            {
                id: 'tally_entry',
                name: 'Take Entry By Tally',
                description: 'Record store transactions as Tally accounting entries',
                viewKeys: ['takeEntryByTelly'],
                editKeys: ['takeEntryByTelly'],
            },
            {
                id: 'pc_report',
                name: 'DB For PC',
                description: 'View real-time report of pending and completed store stages',
                viewKeys: ['dbForPc'],
                editKeys: ['dbForPc'],
            },
        ]
    },
    {
        id: 'checklist',
        name: 'Checklist & Delegation System',
        badgeBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
        badgeText: 'Checklist Module',
        icon: <CheckSquare className="size-5 text-purple-500" />,
        description: 'Recurring checklist tasks, delegation assignments, doer submissions, and admin approval workflows',
        pages: [
            {
                id: 'checklist_dash',
                name: 'Checklist Operations Dashboard',
                description: 'Central operational dashboard for checklist and delegation tasks',
                viewKeys: ['checklistDash'],
                editKeys: ['checklistDash'],
            },
            {
                id: 'checklist_quick',
                name: 'Quick Task',
                description: 'Task management page to manage, edit, or delete existing task definitions',
                viewKeys: ['checklistQuickTask'],
                editKeys: ['checklistQuickTask'],
            },
            {
                id: 'checklist_assign',
                name: 'Assign Task',
                description: 'Configure task schedules, frequencies, attachments, and assignees',
                viewKeys: ['checklistAssign'],
                editKeys: ['checklistAssign'],
            },
            {
                id: 'checklist_submit_check',
                name: 'Checklist Doer Submission',
                description: 'Perform assigned recurring checklist tasks with proof uploads',
                viewKeys: ['checklistSubmitChecklist'],
                editKeys: ['checklistSubmitChecklist'],
            },
            {
                id: 'checklist_submit_del',
                name: 'Delegation Doer Submission',
                description: 'Perform assigned one-time delegation tasks with audio/photo proof',
                viewKeys: ['checklistSubmitDelegation'],
                editKeys: ['checklistSubmitDelegation'],
            },
            {
                id: 'checklist_approval',
                name: 'Admin Task Approval',
                description: 'Verify, approve, or reject completed tasks and review extension requests',
                viewKeys: ['checklistApproval'],
                editKeys: ['checklistApproval'],
            },
        ]
    },
    {
        id: 'document',
        name: 'Document & Subscription System',
        badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
        badgeText: 'Document Module',
        icon: <FileText className="size-5 text-emerald-500" />,
        description: 'Document vault, agreements, resource directory, recurring subscriptions, and loan/NOC portfolio',
        pages: [
            {
                id: 'doc_dashboard',
                name: 'Document Dashboard',
                description: 'Overview metrics, renewal calendars, alerts, and compliance summaries',
                viewKeys: ['docDash'],
                editKeys: ['docDash'],
            },
            {
                id: 'doc_resources',
                name: 'Resource Manager',
                description: 'Personnel, vendor contacts, and corporate resource registry',
                viewKeys: ['docResourceManager'],
                editKeys: ['docResourceManager'],
            },
            {
                id: 'doc_all',
                name: 'All Documents',
                description: 'Central digital vault and master file repository with metadata and categorization',
                viewKeys: ['docAllDocuments'],
                editKeys: ['docAllDocuments'],
            },
            {
                id: 'doc_renewal',
                name: 'Document Renewal',
                description: 'Track expiring documents, renewal approvals, and reminder alerts',
                viewKeys: ['docRenewal'],
                editKeys: ['docRenewal'],
            },
            {
                id: 'doc_shared',
                name: 'Shared Documents',
                description: 'Manage public/shared document links, access history, and downloads',
                viewKeys: ['docShared'],
                editKeys: ['docShared'],
            },
            {
                id: 'doc_sub_all',
                name: 'All Subscriptions',
                description: 'Software licenses, AMC agreements, and active recurring services',
                viewKeys: ['docAllSubscriptions'],
                editKeys: ['docAllSubscriptions'],
            },
            {
                id: 'doc_sub_approval',
                name: 'Subscription Approval',
                description: 'Review, authorize, and approve renewal or new subscription requisitions',
                viewKeys: ['docSubApproval'],
                editKeys: ['docSubApproval'],
            },
            {
                id: 'doc_sub_payment',
                name: 'Subscription Payment',
                description: 'Record payments, upload transaction receipts, and track payment schedules',
                viewKeys: ['docSubPayment'],
                editKeys: ['docSubPayment'],
            },
            {
                id: 'doc_sub_renewal',
                name: 'Subscription Renewal',
                description: 'Process upcoming service renewals, terms, and cost adjustments',
                viewKeys: ['docSubRenewal'],
                editKeys: ['docSubRenewal'],
            },
            {
                id: 'doc_loan_all',
                name: 'All Loans',
                description: 'Commercial loans, equipment financing portfolio, and EMI schedules',
                viewKeys: ['docAllLoans'],
                editKeys: ['docAllLoans'],
            },
            {
                id: 'doc_loan_foreclosure',
                name: 'Foreclosure Request',
                description: 'Request and track early loan closures, settlements, and calculations',
                viewKeys: ['docLoanForeclosure'],
                editKeys: ['docLoanForeclosure'],
            },
            {
                id: 'doc_loan_noc',
                name: 'Collect NOC',
                description: 'Track, verify, and store No Objection Certificates from banking institutions',
                viewKeys: ['docLoanNoc'],
                editKeys: ['docLoanNoc'],
            },
        ]
    },
    {
        id: 'petty_cash',
        name: 'Petty Cash Management System',
        badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
        badgeText: 'Petty Cash Module',
        icon: <Wallet className="size-5 text-amber-500" />,
        description: 'Cash disbursements, daily voucher logs, credit/debit transaction ledger, and expense analytics',
        pages: [
            {
                id: 'petty_cash_dash',
                name: 'Petty Cash Dashboard',
                description: 'Real-time balance monitor, total disbursements, and monthly expense overview',
                viewKeys: ['pettyCashDash'],
                editKeys: ['pettyCashDash'],
            },
            {
                id: 'petty_cash_entries',
                name: 'Cash Entries (Add Case)',
                description: 'Record daily cash disbursements, voucher entries, and bill uploads',
                viewKeys: ['pettyCashEntries'],
                editKeys: ['pettyCashEntries'],
            },
            {
                id: 'petty_cash_ledger',
                name: 'Cash Ledger',
                description: 'Complete double-entry ledger history of all credit and debit cash flows',
                viewKeys: ['pettyCashLedger'],
                editKeys: ['pettyCashLedger'],
            },
            {
                id: 'petty_cash_reports',
                name: 'Spend Reports',
                description: 'Project-wise and category-wise spend analytics and visual summaries',
                viewKeys: ['pettyCashReports'],
                editKeys: ['pettyCashReports'],
            },
            {
                id: 'petty_cash_settings',
                name: 'Petty Cash Settings',
                description: 'Configure payment modes, expense categories, and system thresholds',
                viewKeys: ['pettyCashSettings'],
                editKeys: ['pettyCashSettings'],
            },
        ]
    },
    {
        id: 'hr',
        name: 'HR & Facilities Management System',
        badgeBg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800',
        badgeText: 'HR Module',
        icon: <UserCog className="size-5 text-teal-500" />,
        description: 'Recruitment, employee lifecycle, attendance, leave, gate pass, payroll, and HR documentation',
        pages: [
            {
                id: 'hr_dashboard',
                name: 'HR Dashboard',
                description: 'Overview metrics for headcount, attendance, recruitment pipeline, and HR alerts',
                viewKeys: ['hrDash'],
                editKeys: ['hrDash'],
            },
            {
                id: 'hr_indent',
                name: 'Job Requisitions',
                description: 'Raise and track manpower requisitions for open positions',
                viewKeys: ['hrIndent'],
                editKeys: ['hrIndent'],
            },
            {
                id: 'hr_candidate',
                name: 'Candidate Pipeline & Social Postings',
                description: 'Track candidate enquiries through the hiring pipeline and manage job postings on social platforms',
                viewKeys: ['hrCandidate'],
                editKeys: ['hrCandidate'],
            },
            {
                id: 'hr_employee',
                name: 'Employee Directory & Operations',
                description: 'Employee directory, manpower deployment, and after-joining/after-leaving workflows',
                viewKeys: ['hrEmployee'],
                editKeys: ['hrEmployee'],
            },
            {
                id: 'hr_gate_pass',
                name: 'Gate Pass',
                description: 'Issue and track employee gate passes for entry/exit movement',
                viewKeys: ['hrGatePass'],
                editKeys: ['hrGatePass'],
            },
            {
                id: 'hr_attendance',
                name: 'Daily Attendance',
                description: 'Record and monitor daily employee attendance and shift logs',
                viewKeys: ['hrAttendance'],
                editKeys: ['hrAttendance'],
            },
            {
                id: 'hr_leave',
                name: 'Leave Management',
                description: 'Review, approve, or reject employee leave requests and balances',
                viewKeys: ['hrLeave'],
                editKeys: ['hrLeave'],
            },
            {
                id: 'hr_calendar',
                name: 'Company Calendar',
                description: 'Manage the shared company calendar of working days, holidays, and events',
                viewKeys: ['hrCalendar'],
                editKeys: ['hrCalendar'],
            },
            {
                id: 'hr_salary',
                name: 'Salary Management',
                description: 'Configure and process employee salary and payroll records',
                viewKeys: ['hrSalary'],
                editKeys: ['hrSalary'],
            },
            {
                id: 'hr_advance',
                name: 'Advance Approval',
                description: 'Review and approve employee salary advance requests',
                viewKeys: ['hrAdvance'],
                editKeys: ['hrAdvance'],
            },
            {
                id: 'hr_letter',
                name: 'Letter Formatter',
                description: 'Generate and manage official HR letters and document templates',
                viewKeys: ['hrLetter'],
                editKeys: ['hrLetter'],
            },
        ]
    }
    /*
    {
        id: 'maintenance',
        name: 'Maintenance & Machinery System',
        badgeBg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800',
        badgeText: 'Maintenance Module',
        icon: <Wrench className="size-5 text-orange-500" />,
        description: 'Preventive maintenance schedules, machine breakdown logs, work orders, and spare parts',
        pages: [
            {
                id: 'maint_dash',
                name: 'Maintenance Overview',
                description: 'Asset health dashboards, pending service alerts, and uptime tracking',
                viewKeys: ['maintDash'],
                editKeys: ['maintDash'],
            },
            {
                id: 'maint_machines',
                name: 'Machine Registry',
                description: 'Equipment assets, serial numbers, specifications, and warranty logs',
                viewKeys: ['maintMachines'],
                editKeys: ['maintMachines'],
            },
            {
                id: 'maint_breakdowns',
                name: 'Breakdown Requests',
                description: 'Urgent breakdown tickets, downtime tracking, and repair work orders',
                viewKeys: ['maintBreakdowns'],
                editKeys: ['maintBreakdowns'],
            },
        ]
    }
    */
];

export default function ManageUsers() {
    const { user: currentUser, refreshUser } = useAuth();
    // Stable ref for currentUser to avoid re-creating columns on every context update
    const currentUserRef = useRef(currentUser);
    currentUserRef.current = currentUser;

    const [tableData, setTableData] = useState<UsersTableData[]>([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UsersTableData | null>(null);
    // Ref to access selectedUser inside effects without making the full object a dependency
    const selectedUserRef = useRef<UsersTableData | null>(null);
    selectedUserRef.current = selectedUser;
    const [showPassword, setShowPassword] = useState(false);
    const [allProjectOptions, setAllProjectOptions] = useState<{ id: number; name: string }[]>([]);
    const [expandedSystems, setExpandedSystems] = useState<Record<string, boolean>>({
        master_settings: true,
        store: true,
        checklist: true,
        document: true,
        petty_cash: true,
    });
    const [pageAccessModes, setPageAccessModes] = useState<Record<string, 'VIEW' | 'EDIT'>>({});
    const [pageDeleteModes, setPageDeleteModes] = useState<Record<string, boolean>>({});

    const permittedProjects = useMemo(() => {
        return [...allProjectOptions].sort((a, b) => a.name.localeCompare(b.name));
    }, [allProjectOptions]);

    useEffect(() => {
        fetchMasterOptions()
            .then((masterOptions) => setAllProjectOptions(masterOptions.firmObjects || []))
            .catch((error) => {
                console.error('Failed to fetch project options:', error);
                toast.error('Failed to load project options');
            });
    }, []);



    async function fetchUser() {
        setDataLoading(true);
        try {
            const users = await fetchUsers();
            const sortedUsers = users.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            setTableData(
                sortedUsers.map((user) => {
                    const permissionKeys = allPermissionKeys.filter(
                        (key) => user[key as keyof UserPermissions] === true
                    );

                    const userRole: 'SUPER_ADMIN' | 'ADMIN' | 'USER' =
                        user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'USER'
                            ? user.role
                            : (user.administrate ? 'SUPER_ADMIN' : 'USER');

                    return {
                        id: user.id,
                        username: user.username,
                        name: user.name,
                        password: user.password,
                        role: userRole,
                        modify_access: user.modify_access || 'EDIT',
                        firmNameMatch: user.firmNameMatch,
                        firm_access: (user.firm_access || []).map(String),
                        permissions: permissionKeys,
                        page_access: user.page_access || {},
                        system_access: user.system_access || [],
                    };
                })
            );
        } catch (error) {
            console.error('Failed to fetch users:', error);
            toast.error('Failed to load users');
        } finally {
            setDataLoading(false);
        }
    }

    useEffect(() => {
        fetchUser();
    }, []);

    const columns = useMemo<ColumnDef<UsersTableData>[]>(() => [
        {
            accessorKey: 'name',
            header: 'User Profile',
            cell: ({ row }) => (
                <div className="flex items-center gap-3 justify-start pl-4 group">
                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 transition-transform duration-300 group-hover:scale-110 ring-4 ring-transparent group-hover:ring-primary/5">
                        {row.original.role === 'SUPER_ADMIN' ? (
                            <Crown size={18} className="text-purple-600 dark:text-purple-400" />
                        ) : row.original.role === 'ADMIN' ? (
                            <ShieldCheck size={18} className="text-blue-600 dark:text-blue-400" />
                        ) : (
                            <UserIcon size={18} />
                        )}
                    </div>
                    <div className="flex flex-col min-w-0 text-left">
                        <span className="font-bold text-sm truncate tracking-tight">{row.original.name}</span>
                        <span className="text-[11px] text-muted-foreground truncate opacity-70 group-hover:opacity-100 transition-opacity">@{row.original.username}</span>
                    </div>
                </div>
            )
        },
        {
            accessorKey: 'role',
            header: 'System Role',
            cell: ({ row }) => {
                const role = row.original.role;
                if (role === 'SUPER_ADMIN') {
                    return (
                        <Pill variant="primary" className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-none shadow-sm shadow-purple-500/20 font-bold px-2.5 py-1">
                            <Crown size={12} className="mr-1 inline shrink-0" /> SUPER ADMIN
                        </Pill>
                    );
                }
                if (role === 'ADMIN') {
                    return (
                        <Pill variant="primary" className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-none shadow-sm shadow-blue-500/20 font-bold px-2.5 py-1">
                            <ShieldCheck size={12} className="mr-1 inline shrink-0" /> ADMIN
                        </Pill>
                    );
                }
                return (
                    <Pill variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold px-2.5 py-1">
                        <UserIcon size={12} className="mr-1 inline shrink-0" /> USER
                    </Pill>
                );
            }
        },
        {
            accessorKey: 'firm_access',
            header: 'Project Scope',
            cell: ({ row }) => (
                <div className="flex items-center gap-2 text-sm justify-start pl-4">
                    <Building size={14} className="text-muted-foreground shrink-0" />
                    <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                        row.original.role === 'SUPER_ADMIN' || row.original.firm_access.length === 0
                            ? "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                            : "bg-muted text-muted-foreground border-border"
                    )}>
                        {row.original.role === 'SUPER_ADMIN'
                            ? "All Projects (Global)"
                            : row.original.firm_access.length > 0
                                ? `${row.original.firm_access.length} Project(s)`
                                : "No Access"}
                    </span>
                </div>
            )
        },
        {
            accessorKey: 'permissions',
            header: 'Page Access Level',
            cell: ({ row }) => {
                const permissions = row.original.permissions;
                const isSuperAdmin = row.original.role === 'SUPER_ADMIN';

                if (isSuperAdmin) {
                    return (
                        <div className="grid place-items-start pl-4">
                            <Pill variant="primary" className="bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800 font-bold text-[11px]">
                                Full Unrestricted Access
                            </Pill>
                        </div>
                    );
                }

                return (
                    <div className="grid place-items-start pl-4">
                        <div className="flex flex-wrap gap-1.5 items-center">
                            <Pill variant="secondary" className="bg-secondary/70 text-foreground font-bold text-[11px]">
                                {permissions.length} Page Permission(s)
                            </Pill>
                            {permissions.length > 0 && (
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <button type="button" className="cursor-pointer focus:outline-hidden">
                                            <Pill variant="default" className="text-[10px] bg-muted hover:bg-muted/80">View Details</Pill>
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent align="start" className="w-80 p-4 shadow-xl border-primary/10 bg-background/95 backdrop-blur-md z-50">
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Enabled System Permissions</h4>
                                            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                                                {permissions.map((perm, i) => (
                                                    <Pill key={i} variant="secondary" className="text-[10px]">{perm}</Pill>
                                                ))}
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            )}
                        </div>
                    </div>
                );
            },
        },
        {
            id: 'actions',
            cell: ({ row }) => {
                const user = row.original;
                return (
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:bg-primary/10"
                            onClick={() => {
                                setSelectedUser(user);
                                setOpenDialog(true);
                            }}
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            disabled={user.username === 'admin' || (currentUserRef.current ? user.username === currentUserRef.current.username : false)}
                            onClick={async () => {
                                if (confirm(`Are you sure you want to permanently delete user "${user.name}"?`)) {
                                    try {
                                        await deleteUser(user.id);
                                        toast.success(`User deleted successfully`);
                                        fetchUser();
                                    } catch {
                                        toast.error('Failed to delete user');
                                    }
                                }
                            }}
                        >
                            <Trash className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                asChild
                                disabled={
                                    user.username === 'admin' || (currentUserRef.current ? user.username === currentUserRef.current.username : false)
                                }
                            >
                                <Button variant="ghost" className="h-8 w-8 p-0 mr-4 hover:bg-primary/10 hover:text-primary transition-colors">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-5 w-5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 p-1">
                                <DropdownMenuItem
                                    className="cursor-pointer gap-2 focus:bg-primary/5 focus:text-primary"
                                    onClick={() => {
                                        setSelectedUser(user);
                                        setOpenDialog(true);
                                    }}
                                >
                                    <Pencil className="h-4 w-4" /> Edit User Access
                                </DropdownMenuItem>
                                <Separator className="my-1" />
                                <DropdownMenuItem
                                    className="cursor-pointer gap-2 focus:bg-destructive/5 focus:text-destructive text-destructive"
                                    onClick={async () => {
                                        if (confirm(`Are you sure you want to permanently delete user "${user.name}"? This action cannot be undone.`)) {
                                            try {
                                                if (user.username === 'admin') {
                                                    throw new Error();
                                                }
                                                const userId = user.id;
                                                await deleteUser(userId);
                                                toast.success(`User deleted successfully`);
                                                setTableData(prev => prev.filter(u => u.id !== userId));
                                                await fetchUser();
                                            } catch {
                                                toast.error('Failed to delete user');
                                            }
                                        }
                                    }}
                                >
                                    <Trash className="h-4 w-4" /> Delete User
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                );
            },
        },
    ], [currentUser?.username]);

    const schema = z.object({
        name: z.string().min(1, 'Full name is required'),
        username: z.string().min(3, 'Username must be at least 3 characters'),
        password: z.string().min(4, 'Password must be at least 4 characters'),
        role: z.enum(['SUPER_ADMIN', 'ADMIN', 'USER']),
        firmNameMatch: z.string().optional(),
        firm_access: z.array(z.string()),
        permissions: z.array(z.string()),
    });

    const form = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
        defaultValues: {
            username: '',
            name: '',
            password: '',
            role: 'USER',
            firmNameMatch: '',
            firm_access: [],
            permissions: [],
        },
    });

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setOpenDialog(false);
            setShowPassword(false);
            requestAnimationFrame(() => {
                setSelectedUser(null);
            });
        } else {
            setOpenDialog(true);
        }
    };

    useEffect(() => {
        if (!openDialog) return;

        const user = selectedUserRef.current;
        const initialModes: Record<string, 'VIEW' | 'EDIT'> = {};
        const initialDeletes: Record<string, boolean> = {};
        const userPerms = user?.permissions || [];
        const isUserViewOnly = user?.modify_access === 'VIEW';
        const userPageAccess = user?.page_access || {};

        SYSTEM_HIERARCHY.forEach((system) => {
            system.pages.forEach((page) => {
                const pageAcc = userPageAccess[page.id];
                const explicitMode = typeof pageAcc === 'object' && pageAcc !== null ? pageAcc.mode : (typeof pageAcc === 'string' ? pageAcc : undefined);

                if (explicitMode === 'VIEW' || explicitMode === 'EDIT') {
                    initialModes[page.id] = explicitMode;
                } else if (isUserViewOnly) {
                    initialModes[page.id] = 'VIEW';
                } else if (page.editKeys.length > page.viewKeys.length) {
                    const hasAllEdit = page.editKeys.every((k) => userPerms.includes(k));
                    initialModes[page.id] = hasAllEdit ? 'EDIT' : 'VIEW';
                } else {
                    initialModes[page.id] = 'EDIT';
                }

                const explicitDelete = userPageAccess[`${page.id}_delete`] === true || 
                    (typeof pageAcc === 'object' && pageAcc !== null && pageAcc.canDelete === true);
                initialDeletes[page.id] = !!explicitDelete;
            });
        });
        setPageAccessModes(initialModes);
        setPageDeleteModes(initialDeletes);

        if (user) {
            form.reset({
                username: user.username,
                name: user.name,
                password: user.password,
                role: user.role || 'USER',
                firmNameMatch: user.firmNameMatch,
                firm_access: (user.firm_access || []).map(String),
                permissions: user.permissions || [],
            });
        } else {
            form.reset({
                name: '',
                username: '',
                password: '',
                role: 'USER',
                firmNameMatch: '',
                firm_access: [],
                permissions: [],
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [openDialog]);

    async function onSubmit(value: z.infer<typeof schema>) {
        if (
            tableData.map((d) => d.username).includes(value.username) &&
            (!selectedUser || value.username !== selectedUser.username)
        ) {
            toast.error('Username already exists. Please choose a unique one.');
            return;
        }

        const effectivePermissions = value.role === 'SUPER_ADMIN'
            ? [...allPermissionKeys]
            : value.permissions;

        let computedModifyAccess: 'EDIT' | 'VIEW' = 'EDIT';
        if (value.role === 'USER') {
            const allPages = SYSTEM_HIERARCHY.flatMap((s) => s.pages);
            const enabledPages = allPages.filter((p) =>
                p.viewKeys.some((k) => effectivePermissions.includes(k)) ||
                p.editKeys.some((k) => effectivePermissions.includes(k))
            );

            const hasAnyEditPage = enabledPages.some((p) => (pageAccessModes[p.id] || 'EDIT') === 'EDIT');
            computedModifyAccess = hasAnyEditPage ? 'EDIT' : 'VIEW';
        }

        // Calculate system_access and page_access JSON structures
        const activeSystemAccess: string[] = value.role === 'SUPER_ADMIN' ? ['ALL'] : [];
        const activePageAccess: Record<string, any> = value.role === 'SUPER_ADMIN' ? { ALL: 'EDIT' } : {};

        if (value.role !== 'SUPER_ADMIN') {
            SYSTEM_HIERARCHY.forEach((system) => {
                let systemHasAccess = false;
                system.pages.forEach((page) => {
                    const isEnabled = page.viewKeys.some((k) => effectivePermissions.includes(k)) ||
                        page.editKeys.some((k) => effectivePermissions.includes(k));

                    if (isEnabled) {
                        systemHasAccess = true;
                        const mode = pageAccessModes[page.id] || 'EDIT';
                        activePageAccess[page.id] = mode;
                        if (value.role === 'ADMIN' && mode === 'EDIT' && pageDeleteModes[page.id]) {
                            activePageAccess[`${page.id}_delete`] = true;
                        }
                    }
                });
                if (systemHasAccess) {
                    activeSystemAccess.push(system.id);
                }
            });
        }

        const userData: any = {
            username: value.username,
            name: value.name,
            password: value.password,
            role: value.role,
            modify_access: computedModifyAccess,
            firmNameMatch: value.firmNameMatch || '',
            firm_access: value.firm_access.map(String).filter(Boolean),
            system_access: activeSystemAccess,
            page_access: activePageAccess,
            administrate: value.role === 'SUPER_ADMIN' || effectivePermissions.includes('administrate'),
        };

        allPermissionKeys.forEach((perm) => {
            userData[perm] = effectivePermissions.includes(perm);
        });

        try {
            if (selectedUser) {
                await updateUser(selectedUser.id, userData);
                if (selectedUser.username === currentUser?.username) {
                    await refreshUser();
                }
                toast.success('User updated successfully');
            } else {
                await createUser(userData);
                toast.success('New user profile created');
            }
            setOpenDialog(false);
            fetchUser();
        } catch (error) {
            console.error('Error saving user:', error);
            toast.error('Caught an error while saving user profile');
        }
    }

    function onError(e: any) {
        console.error('Form errors:', e);
        toast.error('Validation failed. Please check the required form fields.');
    }

    const currentRole = form.watch('role');
    const currentPermissions = form.watch('permissions') || [];

    // Helper functions for page access logic
    const isPageEnabled = (page: SystemPageConfig) => {
        if (currentRole === 'SUPER_ADMIN') return true;
        return page.viewKeys.some((k) => currentPermissions.includes(k)) ||
               page.editKeys.some((k) => currentPermissions.includes(k));
    };

    const getPageAccessMode = (page: SystemPageConfig): 'VIEW' | 'EDIT' => {
        if (currentRole === 'SUPER_ADMIN') return 'EDIT';
        return pageAccessModes[page.id] || 'EDIT';
    };

    const isPageDeleteEnabled = (page: SystemPageConfig) => {
        if (currentRole === 'SUPER_ADMIN') return true;
        if (currentRole !== 'ADMIN') return false;
        return !!pageDeleteModes[page.id];
    };

    const handleTogglePageDelete = (page: SystemPageConfig, checked: boolean) => {
        setPageDeleteModes((prev) => ({ ...prev, [page.id]: checked }));
    };

    const handleTogglePageAccess = (page: SystemPageConfig, checked: boolean) => {
        if (!checked) {
            setPageDeleteModes((prev) => ({ ...prev, [page.id]: false }));
        }
        const nextPermsSet = new Set(currentPermissions);
        if (checked) {
            const mode = pageAccessModes[page.id] || 'EDIT';
            page.viewKeys.forEach((k) => nextPermsSet.add(k));
            if (mode === 'EDIT') {
                page.editKeys.forEach((k) => nextPermsSet.add(k));
            } else {
                const actionKeys = page.editKeys.filter((k) => !page.viewKeys.includes(k));
                actionKeys.forEach((k) => nextPermsSet.delete(k));
            }
        } else {
            page.viewKeys.forEach((k) => nextPermsSet.delete(k));
            page.editKeys.forEach((k) => nextPermsSet.delete(k));
        }
        form.setValue('permissions', Array.from(nextPermsSet));
    };

    const handleSetPageAccessMode = (page: SystemPageConfig, mode: 'VIEW' | 'EDIT') => {
        setPageAccessModes((prev) => ({ ...prev, [page.id]: mode }));
        if (mode === 'VIEW') {
            setPageDeleteModes((prev) => ({ ...prev, [page.id]: false }));
        }

        const nextPermsSet = new Set(currentPermissions);
        page.viewKeys.forEach((k) => nextPermsSet.add(k));
        if (mode === 'EDIT') {
            page.editKeys.forEach((k) => nextPermsSet.add(k));
        } else {
            const actionKeys = page.editKeys.filter((k) => !page.viewKeys.includes(k));
            actionKeys.forEach((k) => nextPermsSet.delete(k));
        }
        form.setValue('permissions', Array.from(nextPermsSet));
    };

    const handleToggleSystemAllPages = (system: SystemConfig, checked: boolean) => {
        if (!checked) {
            setPageDeleteModes((prev) => {
                const next = { ...prev };
                system.pages.forEach((p) => delete next[p.id]);
                return next;
            });
        }
        const nextPermsSet = new Set(currentPermissions);

        system.pages.forEach((page) => {
            if (checked) {
                const mode = pageAccessModes[page.id] || 'EDIT';
                page.viewKeys.forEach((k) => nextPermsSet.add(k));
                if (mode === 'EDIT') {
                    page.editKeys.forEach((k) => nextPermsSet.add(k));
                } else {
                    const actionKeys = page.editKeys.filter((k) => !page.viewKeys.includes(k));
                    actionKeys.forEach((k) => nextPermsSet.delete(k));
                }
            } else {
                page.viewKeys.forEach((k) => nextPermsSet.delete(k));
                page.editKeys.forEach((k) => nextPermsSet.delete(k));
            }
        });

        form.setValue('permissions', Array.from(nextPermsSet));
    };

    return (
        <div className="h-full space-y-6">
            <div className="relative">
                <Heading
                    heading="Manage Users & Permissions"
                    subtext="Create users, assign system roles, and configure granular multi-system page access"
                >
                    <div className="flex -space-x-2">
                         <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-2xl shadow-lg shadow-blue-500/20 text-white transform -rotate-12">
                            <ShieldUser size={40} />
                        </div>
                    </div>
                </Heading>

                <div className="mt-8">
                    <DataTable
                        data={tableData}
                        columns={columns}
                        searchFields={['name', 'username', 'role', 'firmNameMatch']}
                        dataLoading={dataLoading}
                        className="h-[calc(100dvh-200px)] overflow-hidden rounded-xl border-primary/5 bg-card shadow-xl shadow-black/5"
                        extraActions={
                            <Button
                                className="h-10 px-6 gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20 transition-all active:scale-95"
                                onClick={() => {
                                    setSelectedUser(null);
                                    setOpenDialog(true);
                                }}
                            >
                                <UserPlus size={18} />
                                <span className="hidden sm:inline">Add New User</span>
                            </Button>
                        }
                    />
                </div>
            </div>

            <Dialog open={openDialog} onOpenChange={handleOpenChange}>
                <DialogContent className="w-[95vw] sm:w-full sm:max-w-4xl max-h-[92vh] flex flex-col p-0 rounded-2xl sm:rounded-3xl border shadow-2xl bg-card text-left gap-0 overflow-hidden">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit, onError)} className="flex flex-col h-full overflow-hidden">
                            {/* Fixed Header Banner */}
                            <DialogHeader className="p-4 sm:p-6 border-b shrink-0 bg-muted/20 text-left space-y-0 relative">
                                <div className="flex items-center gap-3 pr-8">
                                    <div className="p-2 sm:p-2.5 bg-primary/10 text-primary rounded-xl shrink-0">
                                        {selectedUser ? <Pencil size={20} className="sm:size-[22px]" /> : <UserPlus size={20} className="sm:size-[22px]" />}
                                    </div>
                                    <div className="min-w-0">
                                        <DialogTitle className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-foreground truncate">
                                            {selectedUser ? 'Edit User Profile & Access' : 'Register New User'}
                                        </DialogTitle>
                                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 sm:line-clamp-none">
                                            Configure user identification, assigned system role, project access, and granular page permissions.
                                        </p>
                                    </div>
                                </div>
                                <DialogDescription className="sr-only">
                                    Configure user identification, assigned system role, project access, and granular page permissions.
                                </DialogDescription>
                            </DialogHeader>

                            {/* Scrollable Form Content Body */}
                            <div className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 overflow-y-auto flex-1 custom-scrollbar">
                                {/* User Details & Role Section */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 bg-muted/30 p-4 sm:p-6 rounded-2xl border border-border/50">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
                                                    <Fingerprint size={14} className="text-primary shrink-0" /> Full Name
                                                </FormLabel>
                                                <FormControl>
                                                    <Input className="bg-background text-xs sm:text-sm h-9 sm:h-10" placeholder="e.g. John Doe" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="username"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
                                                    <UserIcon size={14} className="text-primary shrink-0" /> Username
                                                </FormLabel>
                                                <FormControl>
                                                    <Input className="bg-background text-xs sm:text-sm h-9 sm:h-10" placeholder="johndoe123" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="password"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
                                                    <Lock size={14} className="text-primary shrink-0" /> Password
                                                </FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Input
                                                            type={showPassword ? 'text' : 'password'}
                                                            className="bg-background text-xs sm:text-sm h-9 sm:h-10 pr-10"
                                                            placeholder="••••••••"
                                                            {...field}
                                                        />
                                                        <button
                                                            type="button"
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                                                            onMouseDown={(e) => {
                                                                e.preventDefault();
                                                                setShowPassword(!showPassword);
                                                            }}
                                                        >
                                                            {showPassword ? <EyeClosed size={18} /> : <Eye size={18} />}
                                                        </button>
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Role Selector */}
                                    <FormField
                                        control={form.control}
                                        name="role"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
                                                    <Crown size={14} className="text-purple-600 dark:text-purple-400 shrink-0" /> System Role
                                                </FormLabel>
                                                <Select value={field.value} onValueChange={(val) => {
                                                    field.onChange(val);
                                                    if (val === 'SUPER_ADMIN') {
                                                        form.setValue('permissions', [...allPermissionKeys]);
                                                    } else if (val === 'USER') {
                                                        setPageDeleteModes({});
                                                    }
                                                }}>
                                                    <FormControl>
                                                        <SelectTrigger className="bg-background w-full text-xs sm:text-sm h-9 sm:h-10">
                                                            <SelectValue placeholder="Select system role" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="SUPER_ADMIN" className="font-semibold text-purple-700 dark:text-purple-300">
                                                            👑 SUPER ADMIN — Full control over every system
                                                        </SelectItem>
                                                        <SelectItem value="ADMIN" className="font-semibold text-blue-700 dark:text-blue-300">
                                                            🛡️ ADMIN — Administrative access
                                                        </SelectItem>
                                                        <SelectItem value="USER" className="font-semibold text-slate-700 dark:text-slate-300">
                                                            👤 USER — Standard user with custom permissions
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Permitted Projects */}
                                    <div className="sm:col-span-2 space-y-3 sm:space-y-4 pt-2 border-t border-border/40">
                                        <FormLabel className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
                                            <Building size={14} className="text-primary shrink-0" /> Permitted Projects (Firm Scope)
                                        </FormLabel>
                                        
                                        {permittedProjects.length > 0 && (
                                            <FormField
                                                control={form.control}
                                                name="firm_access"
                                                render={({ field }) => {
                                                    const selectedFirms = (field.value || []).map(String);
                                                    const allSelected = permittedProjects.length > 0 && 
                                                        permittedProjects.every((p) => selectedFirms.includes(String(p.id)) || selectedFirms.includes(p.name));

                                                    return (
                                                        <FormItem className="flex items-center justify-between rounded-xl border bg-background p-3">
                                                            <div className="space-y-0.5 min-w-0 pr-2">
                                                                <FormLabel htmlFor="select-all-projects" className="text-xs sm:text-sm font-bold cursor-pointer block truncate">
                                                                    Select All Projects
                                                                </FormLabel>
                                                                <p className="text-[11px] text-muted-foreground line-clamp-1">
                                                                    Grant access to every project listed in the Master Registry.
                                                                </p>
                                                            </div>
                                                            <FormControl>
                                                                <Checkbox
                                                                    id="select-all-projects"
                                                                    checked={allSelected}
                                                                    onCheckedChange={(checked) => {
                                                                        field.onChange(checked ? permittedProjects.map(p => String(p.id)) : []);
                                                                    }}
                                                                    className="shrink-0"
                                                                />
                                                            </FormControl>
                                                        </FormItem>
                                                    );
                                                }}
                                            />
                                        )}

                                        <div className="bg-background border rounded-xl p-3 sm:p-4 max-h-48 overflow-y-auto custom-scrollbar grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                            {permittedProjects.map((firm) => (
                                                <FormField
                                                    key={firm.id}
                                                    control={form.control}
                                                    name="firm_access"
                                                    render={({ field }) => {
                                                        const values = (field.value || []).map(String);
                                                        const firmIdStr = String(firm.id);
                                                        const checked = values.includes(firmIdStr) || values.includes(firm.name);

                                                        return (
                                                            <FormItem className="flex items-center space-x-2.5 space-y-0 p-2 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border/60">
                                                                <FormControl>
                                                                    <Checkbox
                                                                        id={`firm-access-${firm.id}`}
                                                                        checked={checked}
                                                                        onCheckedChange={(isChecked) => {
                                                                            if (isChecked) {
                                                                                field.onChange(Array.from(new Set([...values, firmIdStr])));
                                                                            } else {
                                                                                field.onChange(values.filter((v) => v !== firmIdStr && v !== firm.name));
                                                                            }
                                                                        }}
                                                                        className="shrink-0"
                                                                    />
                                                                </FormControl>
                                                                <FormLabel htmlFor={`firm-access-${firm.id}`} className="text-xs font-semibold leading-tight cursor-pointer select-none truncate">
                                                                    {firm.name}
                                                                </FormLabel>
                                                            </FormItem>
                                                        );
                                                    }}
                                                />
                                            ))}
                                            {permittedProjects.length === 0 && (
                                                <p className="text-xs text-muted-foreground italic col-span-full text-center py-4">No projects found in Master Registry</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Hierarchical Multi-System Page Permissions Interface */}
                                <div className="space-y-4 sm:space-y-6">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-1">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0">
                                                <Layers size={18} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-base sm:text-lg tracking-tight">System & Page Permissions Interface</h3>
                                                <p className="text-[11px] sm:text-xs text-muted-foreground">Order: Systems Permissions → Page → Edit / View Access</p>
                                            </div>
                                        </div>
                                        {currentRole !== 'SUPER_ADMIN' && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="text-xs gap-1.5 h-8 self-start sm:self-auto"
                                                onClick={() => {
                                                    const allKeys = [...allPermissionKeys];
                                                    const isAll = currentPermissions.length === allKeys.length;
                                                    form.setValue('permissions', isAll ? [] : allKeys);
                                                }}
                                            >
                                                <CheckSquare size={14} />
                                                {currentPermissions.length === allPermissionKeys.length ? 'Deselect All Pages' : 'Grant All Pages'}
                                            </Button>
                                        )}
                                    </div>

                                    {currentRole === 'SUPER_ADMIN' ? (
                                        <div className="p-4 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-2xl flex items-center gap-3">
                                            <Crown className="size-6 text-purple-600 shrink-0" />
                                            <div>
                                                <p className="text-sm font-bold text-purple-900 dark:text-purple-200">SUPER ADMIN Unrestricted System Access</p>
                                                <p className="text-xs text-purple-700 dark:text-purple-300">
                                                    Users with the Super Admin role automatically receive full administrative access and edit rights across all systems and pages.
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {SYSTEM_HIERARCHY.map((system) => {
                                                const isExpanded = expandedSystems[system.id] ?? true;
                                                const systemPages = system.pages;
                                                const enabledCount = systemPages.filter((p) => isPageEnabled(p)).length;

                                                return (
                                                    <Card key={system.id} className="border border-border/70 shadow-sm overflow-hidden">
                                                        <div className="p-3.5 sm:p-4 bg-muted/40 flex flex-wrap items-center justify-between border-b border-border/50 gap-2">
                                                            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                                                                <button
                                                                    type="button"
                                                                    className="p-1 hover:bg-muted rounded-md transition-colors text-muted-foreground shrink-0"
                                                                    onClick={() => setExpandedSystems((prev) => ({ ...prev, [system.id]: !isExpanded }))}
                                                                >
                                                                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                                                </button>
                                                                <div className="p-1.5 sm:p-2 rounded-lg bg-background shadow-xs border border-border/50 shrink-0">
                                                                    {system.icon}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                                                        <h4 className="font-bold text-xs sm:text-sm text-foreground truncate">{system.name}</h4>
                                                                        <span className={cn("text-[9px] sm:text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border shrink-0", system.badgeBg)}>
                                                                            {system.badgeText}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-[10px] sm:text-[11px] text-muted-foreground line-clamp-1">{system.description}</p>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 ml-auto">
                                                                <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground hidden md:inline">
                                                                    {enabledCount} / {systemPages.length} pages enabled
                                                                </span>
                                                                <div className="flex items-center gap-1.5 sm:gap-2 pl-2 sm:pl-3 border-l border-border/60">
                                                                    <Checkbox
                                                                        id={`sys-all-${system.id}`}
                                                                        checked={enabledCount === systemPages.length}
                                                                        onCheckedChange={(chk) => handleToggleSystemAllPages(system, !!chk)}
                                                                        className="shrink-0"
                                                                    />
                                                                    <label htmlFor={`sys-all-${system.id}`} className="text-xs font-bold cursor-pointer select-none">
                                                                        Select All
                                                                    </label>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {isExpanded && (
                                                            <CardContent className="p-3 sm:p-4 space-y-3 bg-background">
                                                                <div className="grid gap-2">
                                                                    {system.pages.map((page) => {
                                                                        const enabled = isPageEnabled(page);
                                                                        const accessMode = getPageAccessMode(page);

                                                                        return (
                                                                            <div
                                                                                key={page.id}
                                                                                className={cn(
                                                                                    "p-3 rounded-xl border transition-all flex flex-col gap-2.5",
                                                                                    enabled
                                                                                        ? "bg-muted/20 border-primary/20 shadow-2xs"
                                                                                        : "bg-background border-border/40 opacity-75 hover:opacity-100"
                                                                                )}
                                                                            >
                                                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                                                    <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                                                                                        <Checkbox
                                                                                            id={`page-enable-${page.id}`}
                                                                                            checked={enabled}
                                                                                            className="mt-0.5 shrink-0"
                                                                                            onCheckedChange={(chk) => handleTogglePageAccess(page, !!chk)}
                                                                                        />
                                                                                        <div className="min-w-0">
                                                                                            <label htmlFor={`page-enable-${page.id}`} className="text-xs font-bold text-foreground cursor-pointer hover:text-primary transition-colors block leading-tight">
                                                                                                {page.name}
                                                                                            </label>
                                                                                            <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-snug mt-0.5">{page.description}</p>
                                                                                        </div>
                                                                                    </div>

                                                                                    {enabled && (
                                                                                        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center shrink-0">
                                                                                            <div className="flex flex-wrap items-center gap-1.5 bg-background p-1 rounded-lg border border-border/60 shrink-0">
                                                                                                <button
                                                                                                    type="button"
                                                                                                    className={cn(
                                                                                                        "px-2 sm:px-2.5 py-1 rounded-md text-[10px] sm:text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer",
                                                                                                        accessMode === 'VIEW'
                                                                                                            ? "bg-blue-600 text-white shadow-2xs font-bold"
                                                                                                            : "text-muted-foreground hover:bg-muted"
                                                                                                    )}
                                                                                                    onClick={() => handleSetPageAccessMode(page, 'VIEW')}
                                                                                                >
                                                                                                    <Eye size={12} className="shrink-0" /> View Only
                                                                                                </button>

                                                                                                <button
                                                                                                    type="button"
                                                                                                    className={cn(
                                                                                                        "px-2 sm:px-2.5 py-1 rounded-md text-[10px] sm:text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer",
                                                                                                        accessMode === 'EDIT'
                                                                                                            ? "bg-purple-600 text-white shadow-2xs"
                                                                                                            : "text-muted-foreground hover:bg-muted"
                                                                                                    )}
                                                                                                    onClick={() => handleSetPageAccessMode(page, 'EDIT')}
                                                                                                >
                                                                                                    <Edit3 size={12} className="shrink-0" /> Edit (View & Edit)
                                                                                                </button>
                                                                                            </div>

                                                                                            {/* Delete Checkbox: shown for ADMIN role only, placed at right of the toggle switching button */}
                                                                                            {currentRole === 'ADMIN' && (
                                                                                                <div className={cn(
                                                                                                    "flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all",
                                                                                                    accessMode === 'EDIT'
                                                                                                        ? (isPageDeleteEnabled(page)
                                                                                                            ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
                                                                                                            : "bg-background border-border/60 hover:bg-muted/50 text-foreground")
                                                                                                        : "opacity-40 pointer-events-none bg-muted/20 border-border/40 text-muted-foreground"
                                                                                                )}>
                                                                                                    <Checkbox
                                                                                                        id={`page-delete-${page.id}`}
                                                                                                        checked={isPageDeleteEnabled(page)}
                                                                                                        disabled={accessMode !== 'EDIT'}
                                                                                                        onCheckedChange={(chk) => handleTogglePageDelete(page, !!chk)}
                                                                                                        className="data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600 shrink-0 size-3.5"
                                                                                                    />
                                                                                                    <label
                                                                                                        htmlFor={`page-delete-${page.id}`}
                                                                                                        className="text-[10px] sm:text-[11px] font-bold cursor-pointer select-none flex items-center gap-1 leading-none"
                                                                                                    >
                                                                                                        <Trash size={11} className="shrink-0" />
                                                                                                        Delete
                                                                                                    </label>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </CardContent>
                                                        )}
                                                    </Card>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Fixed Footer */}
                            <DialogFooter className="p-3.5 sm:p-5 bg-muted/50 border-t flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 shrink-0">
                                <DialogClose asChild>
                                    <Button variant="outline" className="w-full sm:w-auto h-9 sm:h-10 px-6 rounded-xl font-semibold text-xs sm:text-sm">
                                        Cancel
                                    </Button>
                                </DialogClose>

                                <Button 
                                    type="submit" 
                                    className="w-full sm:w-auto h-9 sm:h-10 px-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs sm:text-sm shadow-lg shadow-primary/20 transition-all active:scale-95"
                                    disabled={form.formState.isSubmitting}
                                >
                                    {form.formState.isSubmitting ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <Loader size={16} color="currentColor" />
                                            <span>Processing...</span>
                                        </div>
                                    ) : (
                                        selectedUser ? 'Save Changes' : 'Create User Profile'
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
};
