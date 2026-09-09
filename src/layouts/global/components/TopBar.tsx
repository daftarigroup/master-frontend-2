import React, { useMemo, useEffect, useRef } from 'react';
import Logo from '@/components/element/Logo';
import { useAuth } from '@/context/AuthContext';
import { useSheets } from '@/context/SheetsContext';
import { usePlatform } from '../context/PlatformContext';
import { filterByFirmAccess } from '@/lib/firmAccess';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useProject } from '@/context/ProjectContext';
import { getSystemIdFromPath, getSystemConfig } from '../config/navConfig';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);
import {
    LogOut,
    RotateCw,
    Search,
    Bell,
    Grid,
    Store,
    CheckSquare,
    FileText,
    Wallet,
    CheckCircle2,
    Wrench,
    ChevronDown,
    LayoutDashboard,
    Settings,
    Building2,
    Layers,
    Package,
    Users,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { GlobalSearchDialog } from './GlobalSearchDialog';
import { AppLauncherOverlay } from './AppLauncherOverlay';

export const TopBar: React.FC = () => {
    const { user, logout } = useAuth();
    const {
        selectedProject,
        selectProject,
        availableProjects,
        isAllProjects,
    } = useProject();
    const { updateAll, allLoading, indentSheet, storeInSheet, issueSheet, paymentsSheet } =
        useSheets();
    const { activeSystemId, setActiveSystemId, isSearchOpen, setIsSearchOpen, setIsLauncherOpen } =
        usePlatform();
    const navigate = useNavigate();
    const location = useLocation();

    const canSelectAll = useMemo(() => {
        if (!user) return false;
        if (user.administrate || user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') return true;
        if (!user.firm_access || user.firm_access.length === 0 || user.firm_access.length > 1) return true;
        return false;
    }, [user]);

    const systemTitleRef = useRef<HTMLSpanElement>(null);

    // Sync activeSystemId immediately with current URL path
    useEffect(() => {
        const targetSystemId = getSystemIdFromPath(location.pathname);
        if (targetSystemId && activeSystemId !== targetSystemId) {
            setActiveSystemId(targetSystemId);
        }
    }, [location.pathname, activeSystemId, setActiveSystemId]);

    // GSAP smooth transition for system name pill
    useGSAP(
        () => {
            if (!systemTitleRef.current) return;
            gsap.fromTo(
                systemTitleRef.current,
                { opacity: 0, y: -4 },
                { opacity: 1, y: 0, duration: 0.22, ease: 'power2.out' }
            );
        },
        { dependencies: [activeSystemId] }
    );

    // Cmd+K / Ctrl+K keyboard shortcut listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setIsSearchOpen(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [setIsSearchOpen]);

    // Kept in sync with `NAV_CONFIG` (src/layouts/global/config/navConfig.ts) —
    // both the sidebar and this switcher read from the same set of systems.
    const systems = [
        {
            id: 'global',
            name: 'Global Dashboard',
            icon: <LayoutDashboard className="size-4" />,
            path: '/dashboard',
        },
        {
            id: 'store',
            name: 'Store & Inventory',
            icon: <Store className="size-4" />,
            path: '/store/dashboard',
        },
        // { id: 'maintenance', name: 'Maintenance', icon: <Wrench className="size-4" />, path: '/maintenance/dashboard' },
        {
            id: 'checklist',
            name: 'Checklist & Delegation',
            icon: <CheckSquare className="size-4" />,
            path: '/checklist/dashboard',
        },
        {
            id: 'master_settings',
            name: 'Master Settings',
            icon: <Settings className="size-4" />,
            path: '/store/admin/manage-users',
        },
        {
            id: 'document',
            name: 'Document & Subscription',
            icon: <FileText className="size-4" />,
            path: '/document/dashboard',
            disabled: true,
        },
        {
            id: 'petty_cash',
            name: 'Petty Cash',
            icon: <Wallet className="size-4" />,
            path: '/petty-cash/dashboard',
        },
        {
            id: 'asset',
            name: 'Asset Management',
            icon: <Package className="size-4" />,
            path: '/asset/dashboard',
        },
        {
            id: 'hr',
            name: 'HR & Facilities',
            icon: <Users className="size-4" />,
            path: '/hr/dashboard',
        },
    ];

    // Superseded by AppLauncherOverlay (opened via setIsLauncherOpen above) —
    // kept for diffing against the old dropdown-based switcher.
    // const handleSystemChange = (sys: typeof systems[0]) => {
    //   if (sys.disabled) return;
    //   setActiveSystemId(sys.id);
    //   navigate(sys.path);
    // };

    // Calculate pending reminders across all workflow stages
    const pendingReminders = useMemo(() => {
        try {
            const permittedFirms =
                user?.administrate || !user?.firm_access || user?.firm_access.length === 0
                    ? undefined
                    : user.firm_access;
            const list = [];

            // 1. Indent Approval
            const indentsPending = filterByFirmAccess(indentSheet || [], permittedFirms).filter(
                (s: any) => !s.actual1 || s.actual1.toString().trim() === ''
            ).length;
            if (indentsPending > 0) {
                list.push({
                    title: 'Indent Approval',
                    path: '/store/indents/approve',
                    count: indentsPending,
                    subtitle: `${indentsPending} indents pending approval`,
                    color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40',
                });
            }

            // 2. Vendor Rate Update
            const ratesPending = filterByFirmAccess(indentSheet || [], permittedFirms).filter(
                (s: any) =>
                    s.planned2 &&
                    s.planned2.toString().trim() !== '' &&
                    (!s.actual2 || s.actual2.toString().trim() === '')
            ).length;
            if (ratesPending > 0) {
                list.push({
                    title: 'Vendor Rate Update',
                    path: '/store/indents/vendor-rates',
                    count: ratesPending,
                    subtitle: `${ratesPending} indents awaiting vendor rates`,
                    color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40',
                });
            }

            // 3. Technical Approval
            const techPending = filterByFirmAccess(indentSheet || [], permittedFirms).filter(
                (s: any) =>
                    s.planned3 &&
                    s.planned3.toString().trim() !== '' &&
                    (!s.actual3 || s.actual3.toString().trim() === '') &&
                    !s.vendor1Rank &&
                    !s.vendor1_rank
            ).length;
            if (techPending > 0) {
                list.push({
                    title: 'Technical Approval',
                    path: '/store/indents/technical-approval',
                    count: techPending,
                    subtitle: `${techPending} indents awaiting technical review`,
                    color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40',
                });
            }

            // 4. Management Approval
            const mgmtPending = filterByFirmAccess(indentSheet || [], permittedFirms).filter(
                (s: any) =>
                    s.planned4 &&
                    s.planned4.toString().trim() !== '' &&
                    (!s.actual4 || s.actual4.toString().trim() === '') &&
                    (!s.approvedVendorName || s.approvedVendorName.toString().trim() === '') &&
                    (!s.approved_vendor_name || s.approved_vendor_name.toString().trim() === '')
            ).length;
            if (mgmtPending > 0) {
                list.push({
                    title: 'Management Approval',
                    path: '/store/indents/management-approval',
                    count: mgmtPending,
                    subtitle: `${mgmtPending} indents awaiting management sign-off`,
                    color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40',
                });
            }

            // 5. Pending PO to Make
            const poPending = filterByFirmAccess(indentSheet || [], permittedFirms).filter(
                (s: any) =>
                    (s.poRequred === 'Yes' ||
                        s.po_requred === 'Yes' ||
                        s.actual4 ||
                        s.approvedVendorName ||
                        s.approved_vendor_name) &&
                    (!s.poNumber || s.poNumber.toString().trim() === '') &&
                    (!s.po_number || s.po_number.toString().trim() === '')
            ).length;
            if (poPending > 0) {
                list.push({
                    title: 'Pending PO to Make',
                    path: '/store/procurement/pending-po',
                    count: poPending,
                    subtitle: `${poPending} approved indents ready for PO creation`,
                    color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40',
                });
            }

            // 6. Lifting
            const liftingPending = filterByFirmAccess(indentSheet || [], permittedFirms).filter(
                (s: any) => {
                    const poNum = String(s.poNumber || s.po_number || '').trim();
                    const isPoCreated = Boolean(poNum !== '' && poNum !== '-');
                    const appQty = Number(
                        s.approvedQuantity || s.approved_quantity || s.quantity || 0
                    );
                    const pendingQty = s.pendingPoQty != null ? Number(s.pendingPoQty) : appQty;
                    return isPoCreated && pendingQty > 0;
                }
            ).length;
            if (liftingPending > 0) {
                list.push({
                    title: 'Lifting',
                    path: '/store/procurement/lifting',
                    count: liftingPending,
                    subtitle: `${liftingPending} items pending lifting`,
                    color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-950/40',
                });
            }

            // 7. Store Check (GRN)
            const storeInPending = filterByFirmAccess(storeInSheet || [], permittedFirms).filter(
                (i: any) => i.planned6 && i.planned6 !== '' && !i.actual6
            ).length;
            if (storeInPending > 0) {
                list.push({
                    title: 'Store Check (GRN)',
                    path: '/store/receipts/store-in',
                    count: storeInPending,
                    subtitle: `${storeInPending} items awaiting physical store check`,
                    color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40',
                });
            }

            // 8. HOD Check
            const hodCheckPending = filterByFirmAccess(storeInSheet || [], permittedFirms).filter(
                (s: any) =>
                    s.hod_status === 'Pending' ||
                    s.hodStatus === 'Pending' ||
                    (s.plannedHod && (!s.actualHod || s.actualHod === ''))
            ).length;
            if (hodCheckPending > 0) {
                list.push({
                    title: 'HOD Check',
                    path: '/store/receipts/hod-check',
                    count: hodCheckPending,
                    subtitle: `${hodCheckPending} GRN items awaiting HOD verification`,
                    color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40',
                });
            }

            // 9. Make Payment
            const paymentsPending = filterByFirmAccess(paymentsSheet || [], permittedFirms).filter(
                (p: any) => !p.actual && p.status1 !== 'hod_approval_pending'
            ).length;
            if (paymentsPending > 0) {
                list.push({
                    title: 'Make Payment',
                    path: '/store/finance/make-payment',
                    count: paymentsPending,
                    subtitle: `${paymentsPending} vendor payments pending`,
                    color: 'text-violet-600 bg-violet-50 dark:bg-violet-950/40',
                });
            }

            // 10. Store Issue Data
            const issuePending = filterByFirmAccess(issueSheet || [], permittedFirms).filter(
                (s: any) =>
                    s.planned1 &&
                    s.planned1.toString().trim() !== '' &&
                    (!s.actual1 || s.actual1.toString().trim() === '')
            ).length;
            if (issuePending > 0) {
                list.push({
                    title: 'Store Issue Data',
                    path: '/store/inventory/issue-data',
                    count: issuePending,
                    subtitle: `${issuePending} store issues pending completion`,
                    color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/40',
                });
            }

            return list;
        } catch (e) {
            return [];
        }
    }, [indentSheet, storeInSheet, paymentsSheet, issueSheet, user]);

    const totalPending = useMemo(
        () => pendingReminders.reduce((acc, item) => acc + item.count, 0),
        [pendingReminders]
    );

    const isGlobalDashboard = location.pathname === '/' || location.pathname === '/dashboard';

    return (
        <header className="h-14 border-b bg-card px-4 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-xs">
            {/* Left: Sidebar Toggle Button + Brand Logo & System Switcher */}
            <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
                {!isGlobalDashboard && (
                    <SidebarTrigger className="size-8 rounded-md border border-input text-primary hover:bg-accent shrink-0" />
                )}
                <div
                    className="flex items-center gap-2 cursor-pointer shrink-0"
                    onClick={() => navigate('/dashboard')}
                >
                    <Logo />
                    <div className="hidden sm:block">
                        <h1 className="text-base font-bold leading-none">
                            Pooja Constructions PMS
                        </h1>
                        <span className="text-[10px] text-muted-foreground font-mono">v2.0 </span>
                    </div>
                </div>

                <div className="h-6 w-px bg-border hidden sm:block" />

                {/* System Switcher — opens the Launchpad-style AppLauncherOverlay */}
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 h-8 font-medium px-2 sm:px-3 shrink-0"
                    onClick={() => setIsLauncherOpen(true)}
                    title="Switch system"
                >
                    <Grid className="size-4 text-primary shrink-0" />
                    <span ref={systemTitleRef} className="capitalize hidden sm:inline">
                        {systems.find((s) => s.id === activeSystemId)?.name || getSystemConfig(activeSystemId)?.name || 'Select System'}
                    </span>
                    <ChevronDown className="size-3 text-muted-foreground hidden sm:inline shrink-0" />
                </Button>

                {/* Project Switcher — icon-only on mobile to prevent crowding search/action buttons */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 h-8 font-medium px-2 sm:px-2.5 bg-blue-50/60 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100/60 transition-colors shrink-0"
                            title={`Active Project: ${selectedProject?.name || 'All Projects'}`}
                        >
                            <Building2 className="size-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                            <span className="max-w-[140px] truncate text-xs font-semibold hidden sm:inline">
                                {selectedProject?.name || 'All Projects'}
                            </span>
                            <ChevronDown className="size-3 opacity-60 hidden sm:inline shrink-0" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-64">
                        <div className="px-2 py-1.5 flex items-center justify-between">
                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                Project Filter
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate('/select-project')}
                                className="h-5 px-1.5 text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                            >
                                Project Grid ➔
                            </Button>
                        </div>
                        <DropdownMenuSeparator />
                        {canSelectAll && (
                            <DropdownMenuItem
                                onClick={() => selectProject({ id: 'all', name: 'All Projects' })}
                                className={`gap-2 cursor-pointer text-xs ${isAllProjects ? 'bg-accent font-bold text-primary' : ''}`}
                            >
                                <Layers className="size-3.5 text-blue-500" />
                                <span className="font-medium">All Projects (Consolidated)</span>
                            </DropdownMenuItem>
                        )}
                        {availableProjects.map((p) => (
                            <DropdownMenuItem
                                key={p.id}
                                onClick={() => selectProject(p)}
                                className={`gap-2 cursor-pointer text-xs ${selectedProject?.id === p.id ? 'bg-accent font-bold text-primary' : ''}`}
                            >
                                <Building2 className="size-3.5 text-slate-500" />
                                <span className="truncate">{p.name}</span>
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
                {/*
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 h-8 font-medium px-2 sm:px-3">
              <Grid className="size-4 text-primary" />
              <span className="capitalize hidden sm:inline">{systems.find(s => s.id === activeSystemId)?.name || 'Select System'}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Switch Platform System</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {systems.map((sys) => (
              <DropdownMenuItem
                key={sys.id}
                disabled={sys.disabled}
                onClick={() => handleSystemChange(sys)}
                className={`gap-3 cursor-pointer ${activeSystemId === sys.id ? 'bg-accent font-semibold text-primary' : ''}`}
              >
                {sys.icon}
                <div className="flex-1 flex justify-between items-center">
                  <span>{sys.name}</span>
                  {sys.disabled && <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">Soon</span>}
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        */}
            </div>

            {/* Middle: Global Search — full bar on desktop, icon trigger on mobile/tablet */}
            <div className="flex-1 max-w-md hidden md:block">
                <button
                    type="button"
                    onClick={() => setIsSearchOpen(true)}
                    className="w-full h-9 pl-9 pr-3 text-xs rounded-md border border-input bg-background hover:bg-accent/40 transition-colors flex items-center justify-between text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring relative"
                >
                    <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                    <span>Search across all systems...</span>
                    <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                        <span className="text-xs">⌘</span>K
                    </kbd>
                </button>
            </div>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSearchOpen(true)}
                className="md:hidden size-8 text-muted-foreground hover:text-foreground shrink-0 ml-auto"
                title="Search across all systems"
            >
                <Search className="size-4" />
            </Button>

            {/* Right: Actions & User Menu */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                {/* 1st Button: Refresh Page & Data */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                        updateAll();
                        window.location.reload();
                    }}
                    disabled={allLoading}
                    title="Refresh Page"
                >
                    <RotateCw className={`size-4 ${allLoading ? 'animate-spin' : ''}`} />
                </Button>

                {/* 2nd Button: Stage Reminders Notification Popover */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:text-foreground relative"
                            title="Pending Stage Reminders"
                        >
                            <Bell className="size-4" />
                            {totalPending > 0 && (
                                <span className="absolute top-1 right-1 size-2.5 rounded-full bg-destructive animate-pulse ring-2 ring-background" />
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-80 p-0 shadow-lg border">
                        <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
                            <div className="flex items-center gap-2 font-bold text-xs">
                                <Bell size={15} className="text-primary" />
                                <span>Pending Stage Reminders</span>
                            </div>
                            {totalPending > 0 && (
                                <span className="bg-destructive/15 text-destructive text-[10px] font-black px-2 py-0.5 rounded-full">
                                    {totalPending} Items
                                </span>
                            )}
                        </div>
                        <div
                            className={cn(
                                "divide-y",
                                pendingReminders.length > 5 && "max-h-[310px] overflow-y-auto custom-scrollbar-thin"
                            )}
                        >
                            {pendingReminders.length > 0 ? (
                                pendingReminders.map((reminder) => (
                                    <div
                                        key={reminder.path}
                                        onClick={() => navigate(reminder.path)}
                                        className="p-3 hover:bg-accent/60 cursor-pointer transition-colors flex items-start gap-3 group"
                                    >
                                        <div
                                            className={`p-2 rounded-lg text-xs font-bold shrink-0 ${reminder.color}`}
                                        >
                                            {reminder.count}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                                                {reminder.title}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground truncate">
                                                {reminder.subtitle}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-6 text-center text-xs text-muted-foreground">
                                    <CheckCircle2 className="size-8 mx-auto text-emerald-500 mb-2" />
                                    <p className="font-semibold text-foreground">All Clear!</p>
                                    <p className="text-[11px]">
                                        No pending stage reminders at this moment.
                                    </p>
                                </div>
                            )}
                        </div>
                    </PopoverContent>
                </Popover>

                <div className="h-6 w-px bg-border" />

                {/* User Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 gap-2 px-2">
                            <div className="size-6 rounded-full bg-primary/10 grid place-items-center text-xs font-bold text-primary">
                                {user?.name?.[0] || user?.username?.[0] || 'U'}
                            </div>
                            <div className="hidden lg:block text-left text-xs">
                                <p className="font-semibold leading-tight">
                                    {user?.name || user?.username}
                                </p>
                                <p className="text-[10px] text-muted-foreground leading-tight">
                                    {user?.administrate ? 'Superadmin' : 'User'}
                                </p>
                            </div>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuLabel>
                            <p className="font-semibold text-xs">{user?.name}</p>
                            <p className="text-[11px] text-muted-foreground font-mono">
                                @{user?.username}
                            </p>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => navigate('/store/admin/manage-users')}
                            className="cursor-pointer"
                        >
                            User Access & Roles
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => navigate('/license')}
                            className="cursor-pointer"
                        >
                            System License
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => logout()}
                            className="text-destructive cursor-pointer gap-2"
                        >
                            <LogOut className="size-4" />
                            <span>Log out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <GlobalSearchDialog />
            <AppLauncherOverlay />
        </header>
    );
};

export default TopBar;
