import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useSheets } from '@/context/SheetsContext';
import { usePlatform } from '../context/PlatformContext';
import { filterByFirmAccess } from '@/lib/firmAccess';
import { NAV_CONFIG } from '../config/navConfig';
import { getAccentStyle } from '../config/accentStyles';
import { AppIcon } from './AppIcon';
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
  useSidebar,
} from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { LayoutDashboard, ChevronDown } from 'lucide-react';

gsap.registerPlugin(useGSAP);

/**
 * Animated expand/collapse wrapper (GSAP height/opacity tween) used for both
 * system-level sections and group-level accordions in the Hybrid sidebar.
 */
const CollapsibleSection: React.FC<{ isOpen: boolean; children: React.ReactNode; className?: string }> = ({
  isOpen,
  children,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  useGSAP(
    () => {
      const el = containerRef.current;
      if (!el) return;

      if (isFirstRender.current) {
        isFirstRender.current = false;
        gsap.set(el, { height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0, display: isOpen ? 'block' : 'none' });
        return;
      }

      if (isOpen) {
        gsap.set(el, { display: 'block' });
        gsap.fromTo(el, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: 0.25, ease: 'power2.out' });
      } else {
        gsap.to(el, {
          height: 0,
          opacity: 0,
          duration: 0.2,
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

// ACCENT_STYLES moved to `../config/accentStyles.ts` — shared with AppIcon /
// AppLauncherOverlay so every "system" surface draws from one palette.
// const ACCENT_STYLES = { ... };

export const GlobalSidebar: React.FC = () => {
  const { user } = useAuth();
  const { activeSystemId, setActiveSystemId } = usePlatform();
  const { isMobile, openMobile, state, setOpen } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement>(null);
  const isRail = !isMobile && state === 'collapsed';

  // The mobile drawer's slide-in/out transform is owned by Radix's Sheet
  // primitive (`ui/sheet.tsx`, CSS `data-[state]:animate-in/out` classes) —
  // Radix's Presence waits for that CSS animation to finish before unmounting
  // the portal, so re-driving the same transform with GSAP would race Radix's
  // own exit timing and risk breaking focus-trap/unmount cleanup. Instead,
  // GSAP owns a complementary entrance (stagger fade/slide) on the nav content
  // *inside* the already-sliding panel, which doesn't fight Radix for the same
  // transform target.
  useGSAP(
    () => {
      if (!isMobile || !openMobile || !contentRef.current) return;
      const sections = contentRef.current.querySelectorAll(':scope > [data-slot="sidebar-group"]');
      if (!sections.length) return;
      gsap.fromTo(
        sections,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out', stagger: 0.04 }
      );
    },
    { dependencies: [isMobile, openMobile], scope: contentRef }
  );

  const {
    indentSheet,
    storeInSheet,
    issueSheet,
    paymentsSheet,
  } = useSheets();

  // Hybrid architecture: the active/"primary" system section starts expanded;
  // other systems remain visible as collapsed sections for quick jump access.
  const [openSystems, setOpenSystems] = useState<Record<string, boolean>>({ [activeSystemId]: true });

  // Whenever the TopBar switcher changes the active system, force that
  // system's section open (without collapsing sections the user opened manually).
  useEffect(() => {
    setOpenSystems((prev) => (prev[activeSystemId] ? prev : { ...prev, [activeSystemId]: true }));
  }, [activeSystemId]);

  const toggleSystem = (systemId: string) => {
    setOpenSystems((prev) => ({ ...prev, [systemId]: !prev[systemId] }));
  };

  // Expanded group accordions, namespaced per system to avoid key collisions.
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
      // eslint-disable-next-line no-console
      if (import.meta.env.DEV) {
        console.error(`[getBadgeCount] Failed for route "${itemPath}" at ${new Date().toISOString()}:`, e);
      }
      return 0;
    }
    return 0;
  };

  // ---------------------------------------------------------------------
  // REPLACED BY `NAV_CONFIG` (src/layouts/global/config/navConfig.ts) — the
  // hardcoded per-system arrays below are kept commented out for diffing.
  // ---------------------------------------------------------------------
  // const storeGroups: { key: string; title: string; items: NavItem[] }[] = [ ... ];
  // const maintenanceGroups = [ ... ];

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

      <SidebarContent className="py-2 border-b-1">
        {isRail ? (
          // Icon dock (rail mode): one colored AppIcon per system, no group/item
          // detail — click switches system, navigates to its dashboard, and
          // re-expands the sidebar into the full labeled accordion.
          <div className="flex flex-col items-center gap-3 pt-2">
            {NAV_CONFIG.map((system) => {
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
                      className={`relative ${system.disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <AppIcon icon={system.icon} accentClassName={system.accentClassName} active={isPrimary} disabled={system.disabled} />
                      {isPrimary && !system.disabled && (
                        <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-primary ring-2 ring-sidebar" />
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
        <div ref={contentRef} className="space-y-3">
        {NAV_CONFIG.map((system) => {
          const accent = getAccentStyle(system.accentClassName);
          const isOpen = !!openSystems[system.id];
          const isPrimary = system.id === activeSystemId;
          const Icon = system.icon;

          return (
            <SidebarGroup key={system.id}>
              <div
                role="button"
                tabIndex={0}
                aria-expanded={isOpen}
                onClick={() => !system.disabled && toggleSystem(system.id)}
                onKeyDown={(e) => {
                  if (!system.disabled && (e.key === 'Enter' || e.key === ' ')) toggleSystem(system.id);
                }}
                className={`flex items-center justify-between px-3 py-2 mx-1 my-1.5 rounded-lg bg-gradient-to-r border-l-4 shadow-2xs group-data-[collapsible=icon]:hidden transition-transform duration-150 ${
                  accent.gradient
                } ${accent.border} ${system.disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.01]'}`}
              >
                <div className={`flex items-center gap-2.5 font-extrabold text-xs tracking-wider uppercase ${accent.text}`}>
                  <div className={`p-1 rounded-md text-white shadow-2xs ${accent.iconBg}`}>
                    <Icon size={14} />
                  </div>
                  <span>{system.name}</span>
                  {isPrimary && !system.disabled && (
                    <span className="text-[9px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-bold normal-case tracking-normal">
                      Active
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {system.disabled && (
                    <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground normal-case tracking-normal">
                      Coming Soon
                    </span>
                  )}
                  {!system.disabled && (
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${accent.text}`}
                    />
                  )}
                </div>
              </div>

              {!system.disabled && (
                <CollapsibleSection isOpen={isOpen}>
                  <SidebarGroupContent className="mt-1">
                    {system.groups.map((grp) => {
                      const namespacedKey = grp.key;
                      const groupOpen = openGroups[namespacedKey] ?? true;

                      return (
                        <div key={grp.key} className="mb-1">
                          <button
                            type="button"
                            onClick={() => toggleGroup(namespacedKey)}
                            className={`w-full flex items-center justify-between px-3 py-2 my-0.5 text-xs font-bold rounded-md transition-all duration-200 group-data-[collapsible=icon]:hidden ${
                              groupOpen
                                ? 'text-slate-900 dark:text-slate-100 bg-slate-100/70 dark:bg-slate-800/60 shadow-2xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span className={`w-1.5 h-1.5 rounded-full transition-colors ${groupOpen ? 'bg-primary ring-2 ring-primary/20' : 'bg-slate-300 dark:bg-slate-600'}`}></span>
                              <span>{grp.title}</span>
                            </span>
                            <ChevronDown size={14} className={`transition-transform duration-200 ${groupOpen ? 'rotate-180 text-primary font-bold' : 'text-slate-400'}`} />
                          </button>

                          <CollapsibleSection isOpen={groupOpen}>
                            <SidebarMenu className="pl-3 ml-2.5 my-1 border-l-2 border-slate-200/80 dark:border-slate-800/80 space-y-1">
                              {grp.items
                                .filter((item) => isPermitted(item.gateKey))
                                .map((item) => {
                                  const count = getBadgeCount(item.path);
                                  const isSelected = location.pathname === item.path;
                                  const ItemIcon = item.icon;

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
                                        <NavLink
                                          to={item.path}
                                          onClick={() => {
                                            if (activeSystemId !== system.id) setActiveSystemId(system.id);
                                          }}
                                          className="flex justify-between items-center w-full no-underline hover:no-underline [text-decoration:none]"
                                        >
                                          <div className="flex items-center gap-2.5 min-w-0">
                                            <div className={`shrink-0 transition-colors ${isSelected ? 'text-primary-foreground' : 'text-slate-500 group-hover:text-primary'}`}>
                                              <ItemIcon size={18} />
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
                          </CollapsibleSection>
                        </div>
                      );
                    })}
                  </SidebarGroupContent>
                </CollapsibleSection>
              )}
            </SidebarGroup>
          );
        })}
        </div>
        )}
      </SidebarContent>

      <SidebarFooter className="p-2 border-t">
        <div className="text-center text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          Powered by <a href="https://botivate.in" target="_blank" rel="noreferrer" className="text-primary font-semibold">Botivate</a>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};
