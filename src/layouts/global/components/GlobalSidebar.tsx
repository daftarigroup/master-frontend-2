import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useSheets } from '@/context/SheetsContext';
import { usePlatform } from '../context/PlatformContext';
import { filterByFirmAccess } from '@/lib/firmAccess';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Store,
  Wrench,
  ChevronDown,
  ChevronRight,
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
  VideoIcon,
  FilePlus2,
  Building2,
  Settings,
  HelpCircle,
} from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  gateKey?: string;
  hidden?: boolean;
  notificationKey?: string;
}

interface NavGroup {
  title: string;
  icon: React.ReactNode;
  systemId: string;
  items: NavItem[];
}

export const GlobalSidebar: React.FC = () => {
  const { user } = useAuth();
  const { activeSystemId, setActiveSystemId } = usePlatform();
  const location = useLocation();

  const {
    indentSheet,
    storeInSheet,
    issueSheet,
    fullkittingSheet,
    pcReportSheet,
    poMasterSheet,
    tallyEntrySheet,
    paymentsSheet,
  } = useSheets();

  // Expanded accordion groups
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    store_overview: true,
    store_inv: true,
    store_req: true,
    store_proc: true,
    store_rec: true,
    store_fin: true,
    store_audit: true,
    store_admin: true,
    maint_ops: true,
  });

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isAdmin = user?.administrate === true || (user?.administrate as any) === 'true';

  const isPermitted = (gateKey?: string) => {
    if (!gateKey) return true;
    if (isAdmin) return true;
    const userObj = user as any;
    return userObj?.[gateKey] === true || userObj?.[gateKey] === 'true';
  };

  // Helper notification counter calculation
  const getBadgeCount = (itemPath: string): number => {
    try {
      const permittedFirms = (user?.administrate || !user?.firm_access || user?.firm_access.length === 0) ? undefined : user.firm_access;

      if (itemPath === '/store/inventory/issue-data') {
        const rows = filterByFirmAccess(issueSheet || [], permittedFirms);
        return rows.filter(
          (s: any) =>
            s.planned1 &&
            s.planned1.toString().trim() !== '' &&
            (!s.actual1 || s.actual1.toString().trim() === '')
        ).length;
      }
      if (itemPath === '/store/indents/approve') {
        const rows = filterByFirmAccess(indentSheet || [], permittedFirms);
        return rows.filter(
          (s: any) => (!s.actual1 || s.actual1.toString().trim() === '')
        ).length;
      }
      if (itemPath === '/store/indents/vendor-rates') {
        const rows = filterByFirmAccess(indentSheet || [], permittedFirms);
        return rows.filter(
          (s: any) =>
            s.planned2 &&
            s.planned2.toString().trim() !== '' &&
            (!s.actual2 || s.actual2.toString().trim() === '')
        ).length;
      }
      if (itemPath === '/store/indents/technical-approval') {
        const rows = filterByFirmAccess(indentSheet || [], permittedFirms);
        return rows.filter(
          (s: any) =>
            s.planned3 &&
            s.planned3.toString().trim() !== '' &&
            (!s.actual3 || s.actual3.toString().trim() === '') &&
            !s.vendor1Rank && !s.vendor1_rank
        ).length;
      }
      if (itemPath === '/store/indents/management-approval') {
        const rows = filterByFirmAccess(indentSheet || [], permittedFirms);
        return rows.filter(
          (s: any) =>
            s.planned4 &&
            s.planned4.toString().trim() !== '' &&
            (!s.actual4 || s.actual4.toString().trim() === '') &&
            (!s.approvedVendorName || s.approvedVendorName.toString().trim() === '') &&
            (!s.approved_vendor_name || s.approved_vendor_name.toString().trim() === '')
        ).length;
      }
      if (itemPath === '/store/procurement/pending-po') {
        const rows = filterByFirmAccess(indentSheet || [], permittedFirms);
        return rows.filter(
          (s: any) =>
            (s.poRequred === 'Yes' || s.po_requred === 'Yes' || s.actual4 || s.approvedVendorName || s.approved_vendor_name) &&
            (!s.poNumber || s.poNumber.toString().trim() === '') &&
            (!s.po_number || s.po_number.toString().trim() === '')
        ).length;
      }
      if (itemPath === '/store/procurement/lifting') {
        const rows = filterByFirmAccess(indentSheet || [], permittedFirms);
        return rows.filter(
          (s: any) => {
            const poNum = String(s.poNumber || s.po_number || '').trim();
            const isPoCreated = Boolean(poNum !== '' && poNum !== '-');
            const appQty = Number(s.approvedQuantity || s.approved_quantity || s.quantity || 0);
            const pendingQty = s.pendingPoQty != null ? Number(s.pendingPoQty) : appQty;
            return isPoCreated && pendingQty > 0;
          }
        ).length;
      }
      if (itemPath === '/store/receipts/store-in') {
        const rows = filterByFirmAccess(storeInSheet || [], permittedFirms);
        return rows.filter(
          (i: any) => i.planned6 && i.planned6 !== '' && !i.actual6
        ).length;
      }
      if (itemPath === '/store/receipts/hod-check') {
        const rows = filterByFirmAccess(storeInSheet || [], permittedFirms);
        return rows.filter(
          (s: any) => (s.hod_status === 'Pending' || s.hodStatus === 'Pending' || (s.plannedHod && (!s.actualHod || s.actualHod === '')))
        ).length;
      }
      if (itemPath === '/store/finance/make-payment') {
        const rows = filterByFirmAccess(paymentsSheet || [], permittedFirms);
        return rows.filter(
          (p: any) => !p.actual && p.status1 !== 'hod_approval_pending'
        ).length;
      }
    } catch (e) {
      return 0;
    }
    return 0;
  };

  // Store Groups Structure
  const storeGroups: { key: string; title: string; items: NavItem[] }[] = [
    {
      key: 'store_overview',
      title: 'Store Overview',
      items: [
        { name: 'Store Dashboard', path: '/store/dashboard', icon: <LayoutDashboard size={18} /> },
      ],
    },
    {
      key: 'store_enquiry',
      title: 'Enquiry',
      items: [
        { name: 'Enquiry / Quotation', path: '/store/procurement/enquiry', icon: <FilePlus2 size={18} />, gateKey: 'createPo' },
      ],
    },
    {
      key: 'store_inv',
      title: 'Inventory Management',
      items: [
        { name: 'Inventory', path: '/store/inventory/stock', icon: <Store size={18} />, gateKey: 'inventory' },
        { name: 'Store Issue', path: '/store/inventory/issue', icon: <ClipboardList size={18} />, gateKey: 'storeIssue' },
        { name: 'Store Issue Return', path: '/store/inventory/issue-return', icon: <RotateCcw size={18} />, gateKey: 'storeIssueReturn' },
        { name: 'Store Data', path: '/store/inventory/issue-data', icon: <ClipboardCheck size={18} />, gateKey: 'issueData' },
      ],
    },
    {
      key: 'store_req',
      title: 'Requisitions & Indents',
      items: [
        { name: 'Create Indent', path: '/store/indents/create', icon: <PlusCircle size={18} />, gateKey: 'createIndent' },
        { name: 'Indent Approval', path: '/store/indents/approve', icon: <CheckSquare size={18} />, gateKey: 'indentApprovalView' },
        { name: 'Vendor Rate Update', path: '/store/indents/vendor-rates', icon: <UserCog size={18} />, gateKey: 'updateVendorView' },
        { name: 'Technical Approval', path: '/store/indents/technical-approval', icon: <Users size={18} />, gateKey: 'threePartyApprovalView' },
        { name: 'Management Approval', path: '/store/indents/management-approval', icon: <ShieldCheck size={18} />, gateKey: 'threePartyApprovalView' },
      ],
    },
    {
      key: 'store_proc',
      title: 'Procurement & PO',
      items: [
        { name: 'Pending PO to Make', path: '/store/procurement/pending-po', icon: <Clock size={18} />, gateKey: 'pendingPo' },
        { name: 'Create PO', path: '/store/procurement/create-po', icon: <FilePlus size={18} />, gateKey: 'createPo' },
        { name: 'PO History', path: '/store/procurement/po-history', icon: <History size={18} />, gateKey: 'ordersView' },
        { name: 'Lifting', path: '/store/procurement/lifting', icon: <ArrowUpCircle size={18} />, gateKey: 'ordersView' },
      ],
    },
    {
      key: 'store_rec',
      title: 'Store Receipts (GRN)',
      items: [
        { name: 'Store Check', path: '/store/receipts/store-in', icon: <CheckCircle2 size={18} />, gateKey: 'storeIn' },
        { name: 'HOD Check', path: '/store/receipts/hod-check', icon: <UserCheck size={18} />, gateKey: 'hodStoreApproval' },
        { name: 'Reject For GRN', path: '/store/receipts/grn-rejection', icon: <FileX size={18} />, gateKey: 'insteadOfQualityCheckInReceivedItem' },
        { name: 'Bill Not Received', path: '/store/receipts/bill-pending', icon: <FileWarning size={18} />, gateKey: 'billNotReceived' },
      ],
    },
    {
      key: 'store_fin',
      title: 'Finance & Payments',
      items: [
        { name: 'Make Payment', path: '/store/finance/make-payment', icon: <CreditCard size={18} />, gateKey: 'makePayment' },
        { name: 'Freight Payment', path: '/store/finance/freight-payment', icon: <Truck size={18} />, gateKey: 'fullkiting' },
        { name: 'Send Debit Note', path: '/store/finance/debit-note', icon: <Send size={18} />, gateKey: 'sendDebitNote' },
      ],
    },
    {
      key: 'store_audit',
      title: 'Auditing & Tally',
      items: [
        { name: 'Audit Data', path: '/store/auditing/audit-data', icon: <BarChart size={18} />, gateKey: 'auditData' },
        { name: 'Take Entry By Tally', path: '/store/auditing/tally-entry', icon: <ClipboardList size={18} />, gateKey: 'takeEntryByTelly' },
        { name: 'DB For PC', path: '/store/auditing/pc-report', icon: <PackageCheck size={18} />, gateKey: 'dbForPc' },
      ],
    },
    {
      key: 'store_admin',
      title: 'Store Administration',
      items: [
        { name: 'Master Registry', path: '/store/admin/master-registry', icon: <FileSpreadsheet size={18} />, gateKey: 'administrate' },
        { name: 'Manage Users', path: '/store/admin/manage-users', icon: <Users size={18} />, gateKey: 'administrate' },
        { name: 'License', path: '/store/admin/license', icon: <KeyRound size={18} /> },
      ],
    },
  ];

  const maintenanceGroups = [
    {
      key: 'maint_ops',
      title: 'Maintenance Operations',
      items: [
        { name: 'Maintenance Overview', path: '/maintenance/dashboard', icon: <Wrench size={18} /> },
        { name: 'Machine Registry', path: '/maintenance/machines', icon: <Building2 size={18} /> },
        { name: 'Breakdown Requests', path: '/maintenance/breakdowns', icon: <FileWarning size={18} /> },
      ],
    },
  ];

  return (
    <Sidebar side="left" variant="inset" collapsible="icon" className="top-14 h-[calc(100vh-3.5rem)]">
      <SidebarHeader className="p-3 border-b border-sidebar-border/60">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg font-bold text-xs tracking-wider transition-all duration-200 shadow-2xs no-underline hover:no-underline [text-decoration:none] ${
              isActive
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-primary/5 text-primary hover:bg-primary/15 border border-primary/20'
            }`
          }
        >
          <LayoutDashboard size={18} />
          <span className="group-data-[collapsible=icon]:hidden font-extrabold uppercase">Global Platform Dashboard</span>
        </NavLink>
      </SidebarHeader>

      <SidebarContent className="py-2 border-b-1 space-y-3">
        {/* STORE MODULE ACCORDIONS */}
        <SidebarGroup>
          <div
            className="flex items-center justify-between px-3 py-2 mx-1 my-1.5 rounded-lg bg-gradient-to-r from-blue-600/15 via-blue-600/10 to-transparent border-l-4 border-blue-600 shadow-2xs cursor-pointer group-data-[collapsible=icon]:hidden transition-transform duration-150 hover:scale-[1.01]"
            onClick={() => setActiveSystemId('store')}
          >
            <div className="flex items-center gap-2.5 text-blue-700 dark:text-blue-400 font-extrabold text-xs tracking-wider uppercase">
              <div className="p-1 rounded-md bg-blue-600 text-white shadow-2xs">
                <Store size={14} />
              </div>
              <span>Store Module</span>
            </div>
          </div>

          <SidebarGroupContent className="mt-1">
            {storeGroups.map((grp) => (
              <div key={grp.key} className="mb-1">
                <button
                  type="button"
                  onClick={() => toggleGroup(grp.key)}
                  className={`w-full flex items-center justify-between px-3 py-2 my-0.5 text-xs font-bold rounded-md transition-all duration-200 group-data-[collapsible=icon]:hidden ${
                    openGroups[grp.key]
                      ? 'text-slate-900 dark:text-slate-100 bg-slate-100/70 dark:bg-slate-800/60 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full transition-colors ${openGroups[grp.key] ? 'bg-primary ring-2 ring-primary/20' : 'bg-slate-300 dark:bg-slate-600'}`}></span>
                    <span>{grp.title}</span>
                  </span>
                  <ChevronDown size={14} className={`transition-transform duration-200 ${openGroups[grp.key] ? 'rotate-180 text-primary font-bold' : 'text-slate-400'}`} />
                </button>

                {openGroups[grp.key] && (
                  <SidebarMenu className="pl-3 ml-2.5 my-1 border-l-2 border-slate-200/80 dark:border-slate-800/80 space-y-1">
                    {grp.items
                      .filter((item) => isPermitted(item.gateKey))
                      .map((item) => {
                        const count = getBadgeCount(item.path);
                        const isSelected = location.pathname === item.path;

                        return (
                          <SidebarMenuItem key={item.path}>
                            <SidebarMenuButton
                              asChild
                              isActive={isSelected}
                              tooltip={item.name}
                              className={`py-2 px-2.5 text-xs rounded-md transition-all duration-150 no-underline hover:no-underline [text-decoration:none] ${
                                isSelected
                                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary'
                              }`}
                            >
                              <NavLink to={item.path} className="flex justify-between items-center w-full no-underline hover:no-underline [text-decoration:none]">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className={`shrink-0 transition-colors ${isSelected ? 'text-primary-foreground' : 'text-slate-500 group-hover:text-primary'}`}>
                                    {item.icon}
                                  </div>
                                  <span className="truncate group-data-[collapsible=icon]:hidden no-underline">{item.name}</span>
                                </div>
                                {count > 0 && (
                                  <span className="bg-gradient-to-r from-red-500 to-rose-600 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full shrink-0 shadow-xs group-data-[collapsible=icon]:hidden">
                                    {count > 99 ? '99+' : count}
                                  </span>
                                )}
                              </NavLink>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                  </SidebarMenu>
                )}
              </div>
            ))}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2 border-t">
        <div className="text-center text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          Powered by <a href="https://botivate.in" target="_blank" rel="noreferrer" className="text-primary font-semibold">Botivate</a>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};
