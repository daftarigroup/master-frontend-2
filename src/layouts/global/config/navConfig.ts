import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Store,
  Wrench,
  ClipboardList,
  RotateCcw,
  ClipboardCheck,
  PlusCircle,
  CheckSquare,
  UserCog,
  Users,
  ShieldCheck,
  Clock,
  FilePlus,
  History,
  ArrowUpCircle,
  CheckCircle2,
  UserCheck,
  Truck,
  CreditCard,
  FileX,
  Send,
  BarChart,
  FileWarning,
  PackageCheck,
  FileSpreadsheet,
  KeyRound,
  FilePlus2,
  Building2,
  FileText,
  Wallet,
  Settings,
  CalendarOff,
} from 'lucide-react';

export interface NavItem {
  name: string;
  path: string;
  icon: LucideIcon;
  gateKey?: string;
}

export interface NavGroup {
  key: string;
  title: string;
  items: NavItem[];
}

export interface SystemNavConfig {
  id: string;
  name: string;
  icon: LucideIcon;
  accentClassName: string;
  dashboardPath: string;
  disabled?: boolean;
  groups: NavGroup[];
}

/**
 * Single source of truth for sidebar + system-switcher navigation.
 * Keyed by systemId so the sidebar can render any system's tree
 * (Hybrid architecture: primary system expanded, others collapsed).
 */
export const NAV_CONFIG: SystemNavConfig[] = [
  {
    id: 'global',
    name: 'Global Dashboard',
    icon: LayoutDashboard,
    accentClassName: 'indigo',
    dashboardPath: '/dashboard',
    groups: [],
  },
  {
    id: 'store',
    name: 'Store & Inventory',
    icon: Store,
    accentClassName: 'blue',
    dashboardPath: '/store/dashboard',
    groups: [
      {
        key: 'store_overview',
        title: 'Store Overview',
        items: [
          { name: 'Store Dashboard', path: '/store/dashboard', icon: LayoutDashboard },
        ],
      },
      {
        key: 'store_enquiry',
        title: 'Enquiry',
        items: [
          { name: 'Enquiry / Quotation', path: '/store/procurement/enquiry', icon: FilePlus2, gateKey: 'createPo' },
        ],
      },
      {
        key: 'store_inv',
        title: 'Inventory Management',
        items: [
          { name: 'Inventory', path: '/store/inventory/stock', icon: Store, gateKey: 'inventory' },
          { name: 'Store Issue', path: '/store/inventory/issue', icon: ClipboardList, gateKey: 'storeIssue' },
          { name: 'Store Issue Return', path: '/store/inventory/issue-return', icon: RotateCcw, gateKey: 'storeIssueReturn' },
          { name: 'Store Data', path: '/store/inventory/issue-data', icon: ClipboardCheck, gateKey: 'issueData' },
        ],
      },
      {
        key: 'store_req',
        title: 'Requisitions & Indents',
        items: [
          { name: 'Create Indent', path: '/store/indents/create', icon: PlusCircle, gateKey: 'createIndent' },
          { name: 'Indent Approval', path: '/store/indents/approve', icon: CheckSquare, gateKey: 'indentApprovalView' },
          { name: 'Vendor Rate Update', path: '/store/indents/vendor-rates', icon: UserCog, gateKey: 'updateVendorView' },
          { name: 'Technical Approval', path: '/store/indents/technical-approval', icon: Users, gateKey: 'threePartyApprovalView' },
          { name: 'Management Approval', path: '/store/indents/management-approval', icon: ShieldCheck, gateKey: 'threePartyApprovalView' },
        ],
      },
      {
        key: 'store_proc',
        title: 'Procurement & PO',
        items: [
          { name: 'Pending PO to Make', path: '/store/procurement/pending-po', icon: Clock, gateKey: 'pendingPo' },
          { name: 'Create PO', path: '/store/procurement/create-po', icon: FilePlus, gateKey: 'createPo' },
          { name: 'PO History', path: '/store/procurement/po-history', icon: History, gateKey: 'ordersView' },
          { name: 'Lifting', path: '/store/procurement/lifting', icon: ArrowUpCircle, gateKey: 'ordersView' },
        ],
      },
      {
        key: 'store_rec',
        title: 'Store Receipts (GRN)',
        items: [
          { name: 'Store Check', path: '/store/receipts/store-in', icon: CheckCircle2, gateKey: 'storeIn' },
          { name: 'HOD Check', path: '/store/receipts/hod-check', icon: UserCheck, gateKey: 'hodStoreApproval' },
          { name: 'Reject For GRN', path: '/store/receipts/grn-rejection', icon: FileX, gateKey: 'insteadOfQualityCheckInReceivedItem' },
          { name: 'Bill Not Received', path: '/store/receipts/bill-pending', icon: FileWarning, gateKey: 'billNotReceived' },
        ],
      },
      {
        key: 'store_fin',
        title: 'Finance & Payments',
        items: [
          { name: 'Make Payment', path: '/store/finance/make-payment', icon: CreditCard, gateKey: 'makePayment' },
          { name: 'Freight Payment', path: '/store/finance/freight-payment', icon: Truck, gateKey: 'fullkiting' },
          { name: 'Send Debit Note', path: '/store/finance/debit-note', icon: Send, gateKey: 'sendDebitNote' },
        ],
      },
      {
        key: 'store_audit',
        title: 'Auditing & Tally',
        items: [
          { name: 'Audit Data', path: '/store/auditing/audit-data', icon: BarChart, gateKey: 'auditData' },
          { name: 'Take Entry By Tally', path: '/store/auditing/tally-entry', icon: ClipboardList, gateKey: 'takeEntryByTelly' },
          { name: 'DB For PC', path: '/store/auditing/pc-report', icon: PackageCheck, gateKey: 'dbForPc' },
        ],
      },
      {
        key: 'store_admin',
        title: 'Store Administration',
        items: [
          { name: 'License', path: '/store/admin/license', icon: KeyRound },
        ],
      },
    ],
  },
  {
    id: 'checklist',
    name: 'Checklist & Delegation',
    icon: CheckSquare,
    accentClassName: 'purple',
    dashboardPath: '/checklist/dashboard',
    groups: [
      {
        key: 'checklist_ops',
        title: 'Task Operations',
        items: [
          { name: 'Dashboard', path: '/checklist/dashboard', icon: LayoutDashboard },
          { name: 'Quick Task', path: '/checklist/quick-task', icon: PlusCircle },
          { name: 'Assign Task', path: '/checklist/assign', icon: ClipboardList },
          { name: 'Checklist Submission', path: '/checklist/submit/checklist', icon: CheckSquare },
          { name: 'Delegation Submission', path: '/checklist/submit/delegation', icon: ClipboardCheck },
          { name: 'Admin Approval', path: '/checklist/approval', icon: ShieldCheck },
        ],
      },
    ],
  },
  {
    id: 'master_settings',
    name: 'Master Settings',
    icon: Settings,
    accentClassName: 'indigo',
    dashboardPath: '/store/admin/master-registry',
    groups: [
      {
        key: 'global_master_registry',
        title: 'Master Management',
        items: [
          { name: 'Master Registry', path: '/store/admin/master-registry', icon: FileSpreadsheet, gateKey: 'masterRegistry' },
        ],
      },
      {
        key: 'global_user_management',
        title: 'User Management',
        items: [
          { name: 'Manage Users', path: '/store/admin/manage-users', icon: Users, gateKey: 'manageUsers' },
        ],
      },
      {
        key: 'global_calendar',
        title: 'Calendar & Holidays',
        items: [
          { name: 'Working Calendar', path: '/store/admin/working-calendar', icon: Clock, gateKey: 'workingCalendar' },
          { name: 'Holidays', path: '/store/admin/holidays', icon: CalendarOff, gateKey: 'holidays' },
        ],
      },
    ],
  },
/*
  {
    id: 'maintenance',
    name: 'Maintenance',
    icon: Wrench,
    accentClassName: 'orange',
    dashboardPath: '/maintenance/dashboard',
    groups: [
      {
        key: 'maint_ops',
        title: 'Maintenance Operations',
        items: [
          { name: 'Maintenance Overview', path: '/maintenance/dashboard', icon: Wrench },
          { name: 'Machine Registry', path: '/maintenance/machines', icon: Building2 },
          { name: 'Breakdown Requests', path: '/maintenance/breakdowns', icon: FileWarning },
        ],
      },
    ],
  },
*/
  {
    id: 'document',
    name: 'Document & Subscription',
    icon: FileText,
    accentClassName: 'emerald',
    dashboardPath: '/document/dashboard',
    groups: [
      {
        key: 'document_overview',
        title: 'Document Overview',
        items: [
          { name: 'Dashboard', path: '/document/dashboard', icon: LayoutDashboard },
          { name: 'Resource Manager', path: '/document/resources', icon: Users },
        ],
      },
      {
        key: 'document_vault',
        title: 'Document Vault',
        items: [
          { name: 'All Documents', path: '/document/all', icon: FileText },
          { name: 'Document Renewal', path: '/document/renewal', icon: RotateCcw },
          { name: 'Shared Documents', path: '/document/shared', icon: Send },
        ],
      },
      {
        key: 'document_subscriptions',
        title: 'Subscriptions',
        items: [
          { name: 'All Subscriptions', path: '/document/subscription/all', icon: CreditCard },
          { name: 'Subscription Approval', path: '/document/subscription/approval', icon: ShieldCheck },
          { name: 'Subscription Payment', path: '/document/subscription/payment', icon: CreditCard },
          { name: 'Subscription Renewal', path: '/document/subscription/renewal', icon: RotateCcw },
        ],
      },
      {
        key: 'document_loans',
        title: 'Loans & NOC',
        items: [
          { name: 'All Loans', path: '/document/loan/all', icon: Building2 },
          { name: 'Foreclosure Request', path: '/document/loan/foreclosure', icon: Clock },
          { name: 'Collect NOC', path: '/document/loan/noc', icon: CheckCircle2 },
        ],
      },
    ],
  },
  {
    id: 'petty_cash',
    name: 'Petty Cash',
    icon: Wallet,
    accentClassName: 'amber',
    dashboardPath: '/petty-cash/dashboard',
    groups: [
      {
        key: 'petty_cash_ops',
        title: 'Cash Operations',
        items: [
          { name: 'Dashboard', path: '/petty-cash/dashboard', icon: LayoutDashboard },
          { name: 'Cash Entries (Add Case)', path: '/petty-cash/entries', icon: PlusCircle },
          { name: 'Ledger', path: '/petty-cash/ledger', icon: ClipboardList },
          { name: 'Spend Reports', path: '/petty-cash/reports', icon: BarChart },
          { name: 'Settings', path: '/petty-cash/settings', icon: Settings },
        ],
      },
    ],
  },
];

/**
 * Returns NAV_CONFIG dynamically ordered so all active operational systems come first,
 * followed by Master Settings placed below all active systems, followed by Coming Soon systems.
 */
export const getOrderedNavConfig = (config: SystemNavConfig[] = NAV_CONFIG): SystemNavConfig[] => {
  const globalSystem = config.filter((s) => s.id === 'global');
  const activeSystems = config.filter((s) => !s.disabled && s.id !== 'master_settings' && s.id !== 'global');
  const masterSettings = config.filter((s) => s.id === 'master_settings');
  const disabledSystems = config.filter((s) => s.disabled);

  return [...globalSystem, ...activeSystems, ...masterSettings, ...disabledSystems];
};

export const getSystemConfig = (systemId: string): SystemNavConfig | undefined =>
  NAV_CONFIG.find((sys) => sys.id === systemId);
