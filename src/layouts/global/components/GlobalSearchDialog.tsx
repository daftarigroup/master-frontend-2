import React, { useEffect, useState, useMemo, useRef, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import { usePlatform } from '../context/PlatformContext';
import { useSheets } from '@/context/SheetsContext';
import { fetchPoMaster, fetchMasterData } from '@/services/poService';
import type { PoMasterSheet } from '@/types';
import {
  FilePlus2,
  CheckCircle2,
  Tag,
  Wrench,
  ShieldCheck,
  FileCheck,
  ShoppingBag,
  History,
  Truck,
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  Package,
  Users,
  Database,
  Building2,
  FileText,
  ClipboardList,
  LayoutDashboard,
  PlusCircle,
  CheckSquare,
  ClipboardCheck,
  X,
} from 'lucide-react';

export const GlobalSearchDialog: React.FC = () => {
  const { isSearchOpen, setIsSearchOpen } = usePlatform();
  const { indentSheet } = useSheets();
  const [poList, setPoList] = useState<PoMasterSheet[]>([]);
  const [masterDataState, setMasterDataState] = useState<any>(null);
  const [shouldRender, setShouldRender] = useState(false);
  const navigate = useNavigate();

  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Sync shouldRender with isSearchOpen
  useLayoutEffect(() => {
    if (isSearchOpen) {
      setShouldRender(true);
    }
  }, [isSearchOpen]);

  // Handle GSAP open animation
  useEffect(() => {
    if (shouldRender && isSearchOpen && panelRef.current) {
      const ctx = gsap.context(() => {
        gsap.fromTo(
          panelRef.current,
          {
            opacity: 0,
            y: -18,
            scale: 0.97,
            transformOrigin: 'top center',
          },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.35,
            ease: 'power3.out',
          }
        );

        if (backdropRef.current) {
          gsap.fromTo(
            backdropRef.current,
            { opacity: 0 },
            { opacity: 1, duration: 0.25, ease: 'power2.out' }
          );
        }

        gsap.fromTo(
          '.gsap-cmd-item',
          { opacity: 0, y: 8 },
          {
            opacity: 1,
            y: 0,
            duration: 0.25,
            stagger: 0.02,
            ease: 'power2.out',
            delay: 0.05,
          }
        );
      });

      return () => ctx.revert();
    }
  }, [shouldRender, isSearchOpen]);

  // Smooth close with GSAP exit animation
  const handleClose = () => {
    if (panelRef.current) {
      gsap.to(panelRef.current, {
        opacity: 0,
        y: -12,
        scale: 0.97,
        duration: 0.2,
        ease: 'power2.in',
        onComplete: () => {
          setIsSearchOpen(false);
          setShouldRender(false);
        },
      });
      if (backdropRef.current) {
        gsap.to(backdropRef.current, {
          opacity: 0,
          duration: 0.2,
          ease: 'power2.in',
        });
      }
    } else {
      setIsSearchOpen(false);
      setShouldRender(false);
    }
  };

  // Listen to Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSearchOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen]);

  // Fetch live PO Master records and MasterData when search panel opens
  useEffect(() => {
    if (isSearchOpen) {
      fetchPoMaster()
        .then((res) => {
          if (res.success && res.data) {
            setPoList(res.data);
          }
        })
        .catch((err: unknown) => console.error('Error loading POs for search:', err));

      fetchMasterData()
        .then((data: any) => setMasterDataState(data))
        .catch((err: unknown) => console.error('Error loading MasterData for search:', err));
    }
  }, [isSearchOpen]);

  // System Page Navigation Shortcuts
  const pages = useMemo(
    () => [
      { title: 'Create Indent', category: 'Indents', path: '/store/indents/create', icon: <FilePlus2 className="mr-2 h-4 w-4 text-blue-500" /> },
      { title: 'Indent Approval', category: 'Indents', path: '/store/indents/approve', icon: <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" /> },
      { title: 'Vendor Rate Update', category: 'Indents', path: '/store/indents/vendor-rates', icon: <Tag className="mr-2 h-4 w-4 text-purple-500" /> },
      { title: 'Technical Approval', category: 'Indents', path: '/store/indents/technical-approval', icon: <Wrench className="mr-2 h-4 w-4 text-indigo-500" /> },
      { title: 'Management Approval', category: 'Indents', path: '/store/indents/management-approval', icon: <ShieldCheck className="mr-2 h-4 w-4 text-teal-500" /> },
      { title: 'Pending PO to Make', category: 'Procurement', path: '/store/procurement/pending-po', icon: <FileCheck className="mr-2 h-4 w-4 text-amber-500" /> },
      { title: 'Create Purchase Order (PO)', category: 'Procurement', path: '/store/procurement/po', icon: <ShoppingBag className="mr-2 h-4 w-4 text-orange-500" /> },
      { title: 'PO Order History', category: 'Procurement', path: '/store/procurement/order-history', icon: <History className="mr-2 h-4 w-4 text-violet-500" /> },
      { title: 'Lifting & Dispatch', category: 'Procurement', path: '/store/procurement/lifting', icon: <Truck className="mr-2 h-4 w-4 text-cyan-500" /> },
      { title: 'Store In (GRN)', category: 'Receipts', path: '/store/receipts/store-in', icon: <ArrowDownLeft className="mr-2 h-4 w-4 text-emerald-500" /> },
      { title: 'Store Out (Issue)', category: 'Receipts', path: '/store/receipts/store-out', icon: <ArrowUpRight className="mr-2 h-4 w-4 text-rose-500" /> },
      { title: 'Full Kitting', category: 'Receipts', path: '/store/receipts/full-kitting', icon: <Boxes className="mr-2 h-4 w-4 text-blue-500" /> },
      { title: 'Inventory Stock', category: 'Inventory', path: '/store/inventory', icon: <Package className="mr-2 h-4 w-4 text-purple-500" /> },
      { title: 'Manage Users & Roles', category: 'Settings', path: '/store/settings/users', icon: <Users className="mr-2 h-4 w-4 text-blue-600" /> },
      { title: 'Master Management (Vendors & Items)', category: 'Settings', path: '/store/settings/masters', icon: <Database className="mr-2 h-4 w-4 text-indigo-600" /> },
      { title: 'Checklist Dashboard', category: 'Checklist', path: '/checklist/dashboard', icon: <LayoutDashboard className="mr-2 h-4 w-4 text-purple-500" /> },
      { title: 'Quick Task', category: 'Checklist', path: '/checklist/quick-task', icon: <PlusCircle className="mr-2 h-4 w-4 text-blue-500" /> },
      { title: 'Assign Task', category: 'Checklist', path: '/checklist/assign', icon: <ClipboardList className="mr-2 h-4 w-4 text-emerald-500" /> },
      { title: 'Checklist Submission', category: 'Checklist', path: '/checklist/submit/checklist', icon: <CheckSquare className="mr-2 h-4 w-4 text-indigo-500" /> },
      { title: 'Delegation Submission', category: 'Checklist', path: '/checklist/submit/delegation', icon: <ClipboardCheck className="mr-2 h-4 w-4 text-teal-500" /> },
      { title: 'Admin Approval', category: 'Checklist', path: '/checklist/approval', icon: <ShieldCheck className="mr-2 h-4 w-4 text-rose-500" /> },
    ],
    []
  );

  // Unique Vendors from masterDataState
  const vendors = useMemo(() => {
    if (!masterDataState?.vendors) return [];
    return masterDataState.vendors.slice(0, 15);
  }, [masterDataState]);

  // Unique Indents
  const recentIndents = useMemo(() => {
    if (!indentSheet) return [];
    const map = new Map<string, any>();
    indentSheet.forEach((item: any) => {
      const code = item.indentNumber || item.internal_code || item.internalCode;
      if (code && !map.has(code)) {
        map.set(code, item);
      }
    });
    return Array.from(map.values()).slice(0, 20);
  }, [indentSheet]);

  // Unique POs
  const recentPos = useMemo(() => {
    if (!poList) return [];
    const map = new Map<string, PoMasterSheet>();
    poList.forEach((item) => {
      const poNum = item.poNumber || (item as any).po_number;
      if (poNum && !map.has(poNum)) {
        map.set(poNum, item);
      }
    });
    return Array.from(map.values()).slice(0, 20);
  }, [poList]);

  const handleSelect = (action: () => void) => {
    handleClose();
    action();
  };

  if (!shouldRender) return null;

  return (
    <>
      {/* Click-away backdrop */}
      <div
        ref={backdropRef}
        onClick={handleClose}
        className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px] transition-opacity"
      />

      {/* Floating Dropdown Search Panel */}
      <div
        ref={panelRef}
        className="fixed top-14 left-1/2 -translate-x-1/2 z-50 w-[720px] max-w-[94vw] bg-popover/95 backdrop-blur-xl border border-border/80 shadow-2xl rounded-2xl overflow-hidden ring-1 ring-black/5 dark:ring-white/10"
      >
        <Command className="w-full bg-transparent">
          <div className="flex items-center justify-between border-b border-border/60 px-3 py-1">
            <div className="flex-1 flex items-center">
              <CommandInput
                placeholder="Search pages, indents (SI-XXXX), POs (26-27/XX), vendors, materials..."
                className="border-0 focus:ring-0 text-sm h-11"
                autoFocus
              />
            </div>
            <div className="flex items-center gap-2 pr-2 shrink-0">
              <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted/60 px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                ESC
              </kbd>
              <button
                type="button"
                onClick={handleClose}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
                title="Close"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          <CommandList className="max-h-[420px] overflow-y-auto p-2 space-y-1">
            <CommandEmpty className="py-8 text-center text-sm text-muted-foreground">
              No matching records or pages found.
            </CommandEmpty>

            {/* 1. Page Navigation */}
            <CommandGroup heading="System Navigation & Modules">
              {pages.map((page) => (
                <CommandItem
                  key={page.path}
                  value={`${page.title} ${page.category}`}
                  onSelect={() => handleSelect(() => navigate(page.path))}
                  className="gsap-cmd-item cursor-pointer flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-accent/70 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {page.icon}
                    <span className="font-medium text-foreground">{page.title}</span>
                  </div>
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground bg-muted/80 px-2 py-0.5 rounded-md">
                    {page.category}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator className="my-2" />

            {/* 2. Indents */}
            {recentIndents.length > 0 && (
              <CommandGroup heading="Indents">
                {recentIndents.map((item: any) => {
                  const indentNo = item.indentNumber || item.internal_code || item.internalCode || 'Indent';
                  const product = item.productName || item.product || '';
                  const project = item.projectName || item.firm_name || item.firmName || '';
                  return (
                    <CommandItem
                      key={indentNo}
                      value={`Indent ${indentNo} ${product} ${project}`}
                      onSelect={() => handleSelect(() => navigate('/store/indents/approve'))}
                      className="gsap-cmd-item cursor-pointer flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-accent/70 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <ClipboardList className="h-4 w-4 text-blue-500 shrink-0" />
                        <div className="truncate">
                          <span className="font-semibold text-xs text-foreground">{indentNo}</span>
                          {product && <span className="text-xs text-muted-foreground ml-2">— {product}</span>}
                        </div>
                      </div>
                      {project && <span className="text-[11px] text-muted-foreground italic truncate max-w-[140px] shrink-0 ml-2">{project}</span>}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            <CommandSeparator className="my-2" />

            {/* 3. Purchase Orders */}
            {recentPos.length > 0 && (
              <CommandGroup heading="Purchase Orders (PO)">
                {recentPos.map((po: any) => {
                  const poNum = po.poNumber || po.po_number || 'PO';
                  const party = po.partyName || po.party_name || '';
                  const product = po.product || '';
                  return (
                    <CommandItem
                      key={poNum}
                      value={`PO Purchase Order ${poNum} ${party} ${product}`}
                      onSelect={() => handleSelect(() => navigate('/store/procurement/order-history'))}
                      className="gsap-cmd-item cursor-pointer flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-accent/70 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-orange-500 shrink-0" />
                        <div className="truncate">
                          <span className="font-semibold text-xs text-primary">{poNum}</span>
                          {party && <span className="text-xs text-muted-foreground ml-2">— {party}</span>}
                        </div>
                      </div>
                      {product && <span className="text-[11px] text-muted-foreground truncate max-w-[140px] shrink-0 ml-2">{product}</span>}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            <CommandSeparator className="my-2" />

            {/* 4. Vendors */}
            {vendors.length > 0 && (
              <CommandGroup heading="Vendors & Suppliers">
                {vendors.map((v: any, idx: number) => (
                  <CommandItem
                    key={`${v.vendorName || 'v'}-${idx}`}
                    value={`Vendor Supplier ${v.vendorName || ''} ${v.email || ''} ${v.phone || ''}`}
                    onSelect={() => handleSelect(() => navigate('/store/settings/masters'))}
                    className="gsap-cmd-item cursor-pointer flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-accent/70 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span className="font-medium text-xs text-foreground truncate">{v.vendorName}</span>
                    </div>
                    {v.phone && <span className="text-[11px] text-muted-foreground shrink-0 ml-2">{v.phone}</span>}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </div>
    </>
  );
};

export default GlobalSearchDialog;
