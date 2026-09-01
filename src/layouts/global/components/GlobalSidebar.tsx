import React, { useEffect, useLayoutEffect, useRef, useState, useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useSheets } from '@/context/SheetsContext';
import { usePlatform } from '../context/PlatformContext';
import { filterByFirmAccess } from '@/lib/firmAccess';
import {
    getOrderedNavConfig,
    getSystemIdFromPath,
    type SystemNavConfig,
} from '../config/navConfig';
import { hasPageAccess, isSystemPermitted } from '@/components/element/PermissionGuard';
import type { UserPermissions } from '@/types/sheets';
import { getAccentStyle } from '../config/accentStyles';
import { AppIcon } from './AppIcon';
import { cn } from '@/lib/utils';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarFooter,
    SidebarRail,
    useSidebar,
} from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { LayoutDashboard, ChevronRight, KeyRound } from 'lucide-react';

gsap.registerPlugin(useGSAP);

/**
 * Animated expand/collapse wrapper (GSAP height/opacity tween) used for both
 * system-level sections and group-level accordions in the Hybrid sidebar.
 */
const CollapsibleSection: React.FC<{
    isOpen: boolean;
    children: React.ReactNode;
    className?: string;
}> = ({ isOpen, children, className }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const isFirstRender = useRef(true);

    useGSAP(
        () => {
            const el = containerRef.current;
            if (!el) return;

            if (isFirstRender.current) {
                isFirstRender.current = false;
                gsap.set(el, {
                    height: isOpen ? 'auto' : 0,
                    opacity: isOpen ? 1 : 0,
                    display: isOpen ? 'block' : 'none',
                });
                return;
            }

            if (isOpen) {
                gsap.set(el, { display: 'block' });
                gsap.fromTo(
                    el,
                    { height: 0, opacity: 0 },
                    { height: 'auto', opacity: 1, duration: 0.2, ease: 'power2.out' }
                );
            } else {
                gsap.to(el, {
                    height: 0,
                    opacity: 0,
                    duration: 0.18,
                    ease: 'power1.out',
                    onComplete: () => {
                        if (el) el.style.display = 'none';
                    },
                });
            }
        },
        { dependencies: [isOpen], scope: containerRef }
    );

    return (
        <div ref={containerRef} className={`overflow-hidden ${className || ''}`}>
            {children}
        </div>
    );
};

export const GlobalSidebar: React.FC = () => {
    const { user } = useAuth();
    const { activeSystemId, setActiveSystemId } = usePlatform();
    const { isMobile, openMobile, setOpenMobile, state, setOpen } = useSidebar();
    const location = useLocation();
    const navigate = useNavigate();
    const contentRef = useRef<HTMLDivElement>(null);
    const isRail = !isMobile && state === 'collapsed';

    useGSAP(
        () => {
            if (!contentRef.current) return;
            const sections = contentRef.current.querySelectorAll(
                ':scope > [data-slot="sidebar-group"]'
            );
            if (!sections.length) return;
            gsap.fromTo(
                sections,
                { opacity: 0, y: 5 },
                { opacity: 1, y: 0, duration: 0.22, ease: 'power2.out', stagger: 0.02 }
            );
        },
        { dependencies: [activeSystemId, isMobile ? openMobile : null], scope: contentRef }
    );

    const { indentSheet, storeInSheet, issueSheet, paymentsSheet } = useSheets();

    // Hybrid architecture: the active/"primary" system section starts expanded;
    // other systems remain visible as collapsed sections in global mode.
    const [openSystems, setOpenSystems] = useState<Record<string, boolean>>({
        [activeSystemId]: true,
    });

    // When activeSystemId switches, make sure that system is marked open
    useEffect(() => {
        if (activeSystemId && activeSystemId !== 'global') {
            setOpenSystems((prev) => ({ ...prev, [activeSystemId]: true }));
        }
    }, [activeSystemId]);

    // If global dashboard is selected, show all permitted systems;
    // If a specific system is selected, only show that system's tabs.
    const visibleSystems: SystemNavConfig[] = useMemo(() => {
        const permitted = getOrderedNavConfig().filter(
            (system) => system.id !== 'global' && isSystemPermitted(user, system)
        );
        if (activeSystemId === 'global') {
            return permitted;
        }
        const matched = permitted.filter((system) => system.id === activeSystemId);
        return matched.length > 0 ? matched : permitted;
    }, [user, activeSystemId]);

    // Whenever location.pathname changes, auto-detect and expand the system containing the active route
    useEffect(() => {
        const targetSystemId = getSystemIdFromPath(location.pathname);
        if (targetSystemId && activeSystemId !== targetSystemId) {
            setActiveSystemId(targetSystemId);
        }
        if (targetSystemId && targetSystemId !== 'global') {
            setOpenSystems((prev) =>
                prev[targetSystemId] ? prev : { ...prev, [targetSystemId]: true }
            );
        }
    }, [location.pathname, activeSystemId, setActiveSystemId]);

    // Instantly position active nav item into view when sidebar is opened or active route changes
    useLayoutEffect(() => {
        if ((isMobile && openMobile) || !isMobile) {
            const scrollToActive = () => {
                if (!contentRef.current) return;
                const activeEl =
                    contentRef.current.querySelector<HTMLElement>('[data-active="true"]');
                if (activeEl) {
                    activeEl.scrollIntoView({
                        block: 'center',
                        behavior: 'instant' as ScrollBehavior,
                    });
                }
            };

            scrollToActive();
            const rafId = requestAnimationFrame(scrollToActive);
            return () => cancelAnimationFrame(rafId);
        }
    }, [location.pathname, openMobile, isMobile]);

    const toggleSystem = (systemId: string) => {
        setOpenSystems((prev) => ({ ...prev, [systemId]: !prev[systemId] }));
    };

    const isPermitted = (gateKey?: string) => {
        if (!gateKey) return true;
        return hasPageAccess(user, undefined, 'VIEW', gateKey as keyof UserPermissions);
    };

    const getBadgeCount = (itemPath: string): number => {
        try {
            const permittedFirms =
                user?.administrate || !user?.firm_access || user?.firm_access.length === 0
                    ? undefined
                    : user.firm_access;

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
                return rows.filter((s: any) => !s.actual1 || s.actual1.toString().trim() === '')
                    .length;
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
                        !s.vendor1Rank &&
                        !s.vendor1_rank
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
                        (s.poRequred === 'Yes' ||
                            s.po_requred === 'Yes' ||
                            s.actual4 ||
                            s.approvedVendorName ||
                            s.approved_vendor_name) &&
                        (!s.poNumber || s.poNumber.toString().trim() === '') &&
                        (!s.po_number || s.po_number.toString().trim() === '')
                ).length;
            }
            if (itemPath === '/store/procurement/lifting') {
                const rows = filterByFirmAccess(indentSheet || [], permittedFirms);
                return rows.filter((s: any) => {
                    const poNum = String(s.poNumber || s.po_number || '').trim();
                    const isPoCreated = Boolean(poNum !== '' && poNum !== '-');
                    const appQty = Number(
                        s.approvedQuantity || s.approved_quantity || s.quantity || 0
                    );
                    const pendingQty = s.pendingPoQty != null ? Number(s.pendingPoQty) : appQty;
                    return isPoCreated && pendingQty > 0;
                }).length;
            }
            if (itemPath === '/store/receipts/store-in') {
                const rows = filterByFirmAccess(storeInSheet || [], permittedFirms);
                return rows.filter((i: any) => i.planned6 && i.planned6 !== '' && !i.actual6)
                    .length;
            }
            if (itemPath === '/store/receipts/hod-check') {
                const rows = filterByFirmAccess(storeInSheet || [], permittedFirms);
                return rows.filter(
                    (s: any) =>
                        s.hod_status === 'Pending' ||
                        s.hodStatus === 'Pending' ||
                        (s.plannedHod && (!s.actualHod || s.actualHod === ''))
                ).length;
            }
            if (itemPath === '/store/finance/make-payment') {
                const rows = filterByFirmAccess(paymentsSheet || [], permittedFirms);
                return rows.filter((p: any) => !p.actual && p.status1 !== 'hod_approval_pending')
                    .length;
            }
        } catch (e) {
            if (import.meta.env.DEV) {
                console.error(`[getBadgeCount] Failed for route "${itemPath}":`, e);
            }
            return 0;
        }
        return 0;
    };

    return (
        <Sidebar
            side="left"
            variant="inset"
            collapsible="icon"
            className="md:top-14 md:h-[calc(100vh-3.5rem)] bg-[#F8F9FB] dark:bg-[#111318] border-r border-black/[0.07] dark:border-white/[0.08]"
        >
            {/* Platform Header */}
            <SidebarHeader className="p-3 pb-2 border-b border-black/[0.06] dark:border-white/[0.06]">
                <NavLink
                    to="/dashboard"
                    onClick={() => {
                        setActiveSystemId('global');
                        if (isMobile) setOpenMobile(false);
                    }}
                    data-active={location.pathname === '/dashboard' ? 'true' : 'false'}
                    className={({ isActive }) =>
                        cn(
                            'flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-colors no-underline text-xs',
                            isActive
                                ? 'bg-slate-200/70 dark:bg-slate-800/80 text-foreground font-semibold'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/40 dark:hover:bg-slate-800/40 font-medium'
                        )
                    }
                >
                    <LayoutDashboard size={16} className="text-slate-500 shrink-0" />
                    <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 leading-none">
                            Global Platform
                        </span>
                        <span className="text-xs font-semibold text-foreground truncate mt-0.5">
                            Dashboard
                        </span>
                    </div>
                </NavLink>
            </SidebarHeader>

            <SidebarContent className="py-2 custom-scrollbar [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300/40 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700/40 [&::-webkit-scrollbar-thumb]:rounded-full">
                {isRail ? (
                    <div className="flex flex-col items-center gap-2.5 pt-2">
                        {visibleSystems.map((system) => {
                            const isPrimary = system.id === activeSystemId;
                            return (
                                <Tooltip key={system.id}>
                                    <TooltipTrigger asChild>
                                        <button
                                            type="button"
                                            disabled={system.disabled}
                                            onClick={() => {
                                                if (system.disabled) return;
                                                setActiveSystemId(system.id);
                                                navigate(system.dashboardPath);
                                                setOpen(true);
                                            }}
                                            className={cn(
                                                'relative p-1.5 rounded-lg transition-colors',
                                                system.disabled
                                                    ? 'cursor-not-allowed opacity-50'
                                                    : 'cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                                            )}
                                        >
                                            <AppIcon
                                                icon={system.icon}
                                                accentClassName={system.accentClassName}
                                                size="sm"
                                                active={isPrimary}
                                                disabled={system.disabled}
                                            />
                                            {isPrimary && !system.disabled && (
                                                <span className="absolute right-1 bottom-1 size-2 rounded-full bg-primary ring-2 ring-sidebar" />
                                            )}
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">
                                        {system.name}
                                        {system.disabled ? ' (Coming Soon)' : ''}
                                    </TooltipContent>
                                </Tooltip>
                            );
                        })}
                    </div>
                ) : (
                    <div ref={contentRef} className="px-1.5 space-y-1">
                        <div className="px-2.5 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 group-data-[collapsible=icon]:hidden select-none">
                            Applications
                        </div>

                        {visibleSystems.map((system) => {
                            const accent = getAccentStyle(system.accentClassName);
                            const isOpen = !!openSystems[system.id];
                            const isPrimary = system.id === activeSystemId;
                            const Icon = system.icon;

                            return (
                                <SidebarGroup key={system.id} className="p-0">
                                    {/* System / Application Header Row */}
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        aria-expanded={isOpen}
                                        onClick={() => !system.disabled && toggleSystem(system.id)}
                                        onKeyDown={(e) => {
                                            if (
                                                !system.disabled &&
                                                (e.key === 'Enter' || e.key === ' ')
                                            )
                                                toggleSystem(system.id);
                                        }}
                                        className={cn(
                                            'flex items-center justify-between px-2 py-1.5 my-0.5 rounded-lg text-sm transition-colors group-data-[collapsible=icon]:hidden select-none',
                                            system.disabled
                                                ? 'opacity-50 cursor-not-allowed text-muted-foreground'
                                                : 'cursor-pointer',
                                            isPrimary && !system.disabled
                                                ? 'bg-slate-200/60 dark:bg-slate-800/70 font-semibold text-foreground'
                                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/35 dark:hover:bg-slate-800/40 font-medium'
                                        )}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            {/* System Icon Badge: 18px icon with subtle soft container */}
                                            <div
                                                className={cn(
                                                    'p-1 rounded-md flex items-center justify-center shrink-0 transition-colors',
                                                    isPrimary
                                                        ? 'bg-primary/10 text-primary'
                                                        : 'bg-slate-200/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                                                )}
                                            >
                                                <Icon size={18} />
                                            </div>
                                            <span className="truncate text-sm font-semibold">{system.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {system.disabled && (
                                                <span className="text-[9px] font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                    Soon
                                                </span>
                                            )}
                                            {!system.disabled && (
                                                <ChevronRight
                                                    size={14}
                                                    className={cn(
                                                        'text-slate-400 transition-transform duration-200',
                                                        isOpen && 'rotate-90'
                                                    )}
                                                />
                                            )}
                                        </div>
                                    </div>

                                    {/* System Collapsible Content */}
                                    {!system.disabled && (
                                        <CollapsibleSection isOpen={isOpen}>
                                            <SidebarGroupContent className="pt-0.5 pb-1">
                                                <SidebarMenu className="space-y-0.5 pl-3 my-0.5">
                                                    {system.groups
                                                        .flatMap((grp) => grp.items)
                                                        .filter((item) => isPermitted(item.gateKey))
                                                        .map((item) => {
                                                            const count = getBadgeCount(item.path);
                                                            const isSelected = location.pathname === item.path;
                                                            const ItemIcon = item.icon;

                                                            return (
                                                                <SidebarMenuItem
                                                                    key={item.path}
                                                                    data-active={isSelected ? 'true' : 'false'}
                                                                >
                                                                    <SidebarMenuButton
                                                                        asChild
                                                                        isActive={isSelected}
                                                                        tooltip={item.name}
                                                                        className={cn(
                                                                            'py-1.5 px-2.5 h-auto text-[13px] rounded-md transition-all no-underline flex items-center justify-between w-full select-none',
                                                                            isSelected
                                                                                ? 'bg-primary/10 text-primary font-semibold dark:bg-primary/20'
                                                                                : 'text-slate-600 dark:text-slate-300 font-normal hover:bg-slate-200/40 dark:hover:bg-slate-800/40 hover:text-foreground'
                                                                        )}
                                                                    >
                                                                        <NavLink
                                                                            to={item.path}
                                                                            onClick={() => {
                                                                                if (
                                                                                    activeSystemId !==
                                                                                    system.id
                                                                                )
                                                                                    setActiveSystemId(
                                                                                        system.id
                                                                                    );
                                                                                if (isMobile)
                                                                                    setOpenMobile(
                                                                                        false
                                                                                    );
                                                                            }}
                                                                            className="flex justify-between items-center w-full no-underline hover:no-underline [text-decoration:none]"
                                                                        >
                                                                            <div className="flex items-center gap-2 min-w-0">
                                                                                {/* Flat 15px Page Icon */}
                                                                                <ItemIcon
                                                                                    size={15}
                                                                                    className={cn(
                                                                                        'shrink-0 transition-colors',
                                                                                        isSelected
                                                                                            ? 'text-primary'
                                                                                            : 'text-slate-400 dark:text-slate-500'
                                                                                    )}
                                                                                />
                                                                                <span className="truncate group-data-[collapsible=icon]:hidden">
                                                                                    {item.name}
                                                                                </span>
                                                                            </div>
                                                                            {count > 0 && (
                                                                                <span className="bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-bold px-1.5 py-0.2 rounded-md shrink-0 group-data-[collapsible=icon]:hidden">
                                                                                    {count > 99
                                                                                        ? '99+'
                                                                                        : count}
                                                                                </span>
                                                                            )}
                                                                        </NavLink>
                                                                    </SidebarMenuButton>
                                                                </SidebarMenuItem>
                                                            );
                                                        })}
                                                </SidebarMenu>
                                            </SidebarGroupContent>
                                        </CollapsibleSection>
                                    )}
                                </SidebarGroup>
                            );
                        })}
                    </div>
                )}
            </SidebarContent>

            <SidebarFooter className="p-2 border-t border-black/[0.06] dark:border-white/[0.06] flex flex-col gap-1">
                {/* Standalone Permanently Visible License Tab (Direct Link) */}
                <NavLink
                    to="/license"
                    onClick={() => {
                        if (isMobile) setOpenMobile(false);
                    }}
                    data-active={location.pathname === '/license' ? 'true' : 'false'}
                    className={({ isActive }) =>
                        cn(
                            'flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-colors no-underline select-none group-data-[collapsible=icon]:justify-center',
                            isActive
                                ? 'bg-primary/10 text-primary font-semibold dark:bg-primary/20'
                                : 'text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-200/40 dark:hover:bg-slate-800/40 hover:text-foreground'
                        )
                    }
                    title="License Agreement"
                >
                    <div
                        className={cn(
                            'p-1 rounded-md flex items-center justify-center shrink-0 transition-colors',
                            location.pathname === '/license'
                                ? 'bg-primary/10 text-primary'
                                : 'bg-slate-200/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                        )}
                    >
                        <KeyRound size={18} />
                    </div>
                    <span className="truncate text-sm font-semibold group-data-[collapsible=icon]:hidden">
                        License Agreement
                    </span>
                </NavLink>

                <div className="text-center text-[11px] text-muted-foreground/70 group-data-[collapsible=icon]:hidden pt-1 border-t border-black/[0.04] dark:border-white/[0.04]">
                    Powered by{' '}
                    <a
                        href="https://botivate.in"
                        target="_blank"
                        rel="noreferrer"
                        className="text-foreground/80 font-medium hover:text-primary transition-colors"
                    >
                        Botivate
                    </a>
                </div>
            </SidebarFooter>

            {/* Mouse Click + Hold Drag Handle to Resize, Collapse or Expand */}
            <SidebarRail />
        </Sidebar>
    );
};
