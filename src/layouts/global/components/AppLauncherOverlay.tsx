import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { usePlatform } from '../context/PlatformContext';
import { getOrderedNavConfig, type SystemNavConfig } from '../config/navConfig';
import { AppIcon } from './AppIcon';
import { X } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { isSystemPermitted } from '@/components/element/PermissionGuard';

gsap.registerPlugin(useGSAP);

/**
 * Launchpad-style full-screen overlay for switching systems — the TopBar's
 * "current app" pill opens this instead of a plain dropdown, giving every
 * system (including "Coming Soon" ones) equal visual weight as an app tile.
 */
export const AppLauncherOverlay: React.FC = () => {
  const { user } = useAuth();
  const { isLauncherOpen, setIsLauncherOpen, activeSystemId, setActiveSystemId } = usePlatform();
  const [shouldRender, setShouldRender] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const isClosingRef = useRef(false);
  const navigate = useNavigate();

  const systems = useMemo(() => {
    return getOrderedNavConfig().filter((sys) => sys.id === 'global' || isSystemPermitted(user, sys));
  }, [user]);

  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const selectedIndexRef = useRef<number>(0);
  selectedIndexRef.current = selectedIndex;

  const systemsRef = useRef(systems);
  systemsRef.current = systems;

  useLayoutEffect(() => {
    if (isLauncherOpen) setShouldRender(true);
  }, [isLauncherOpen]);

  useGSAP(
    () => {
      if (!shouldRender || !isLauncherOpen || !panelRef.current) return;
      gsap.fromTo(
        backdropRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.2, ease: 'power2.out' }
      );
      gsap.fromTo(
        panelRef.current,
        { opacity: 0, scale: 0.94 },
        { opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out' }
      );
      gsap.fromTo(
        '.gsap-launcher-tile',
        { opacity: 0, y: 12, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.25, stagger: 0.03, ease: 'power2.out', delay: 0.05 }
      );
    },
    { dependencies: [shouldRender, isLauncherOpen] }
  );

  const handleClose = () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    if (!panelRef.current) {
      setIsLauncherOpen(false);
      setShouldRender(false);
      return;
    }
    gsap.to(panelRef.current, {
      opacity: 0,
      scale: 0.94,
      duration: 0.18,
      ease: 'power1.in',
      onComplete: () => {
        setIsLauncherOpen(false);
        setShouldRender(false);
      },
    });
    gsap.to(backdropRef.current, { opacity: 0, duration: 0.18, ease: 'power1.in' });
  };

  const handleSelectSystem = (system: SystemNavConfig | undefined) => {
    if (!system || system.disabled || isClosingRef.current) return;
    setActiveSystemId(system.id);
    navigate(system.dashboardPath);
    handleClose();
  };

  const getColumnCount = () => {
    if (!gridRef.current) return 3;
    const computed = window.getComputedStyle(gridRef.current);
    const templateColumns = computed.gridTemplateColumns;
    if (!templateColumns) return 3;
    const count = templateColumns.split(' ').filter(Boolean).length;
    return count > 0 ? count : 3;
  };

  useEffect(() => {
    if (!isLauncherOpen && shouldRender) {
      handleClose();
    }
  }, [isLauncherOpen, shouldRender]);

  // Set initial selected item to active system when opened
  useEffect(() => {
    if (isLauncherOpen) {
      isClosingRef.current = false;
      const activeIdx = systems.findIndex((s) => s.id === activeSystemId);
      const startIdx = activeIdx >= 0 ? activeIdx : 0;
      setSelectedIndex(startIdx);
      requestAnimationFrame(() => {
        buttonRefs.current[startIdx]?.focus();
      });
    }
  }, [isLauncherOpen, activeSystemId, systems]);

  useEffect(() => {
    if (!isLauncherOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j')) {
        e.preventDefault();
        handleClose();
        return;
      }

      const currentSystems = systemsRef.current;
      const total = currentSystems.length;
      if (!total) return;

      const currentIdx = selectedIndexRef.current;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const nextIdx = (currentIdx + 1) % total;
        setSelectedIndex(nextIdx);
        buttonRefs.current[nextIdx]?.focus();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const nextIdx = (currentIdx - 1 + total) % total;
        setSelectedIndex(nextIdx);
        buttonRefs.current[nextIdx]?.focus();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const cols = getColumnCount();
        const rowCount = Math.ceil(total / cols);
        const currentRow = Math.floor(currentIdx / cols);
        const currentCol = currentIdx % cols;
        let nextIdx: number;

        if (currentRow < rowCount - 1) {
          nextIdx = currentIdx + cols;
          if (nextIdx >= total) {
            nextIdx = total - 1;
          }
        } else {
          nextIdx = currentCol;
          if (nextIdx >= total) {
            nextIdx = 0;
          }
        }
        setSelectedIndex(nextIdx);
        buttonRefs.current[nextIdx]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const cols = getColumnCount();
        const rowCount = Math.ceil(total / cols);
        const currentRow = Math.floor(currentIdx / cols);
        const currentCol = currentIdx % cols;
        let nextIdx: number;

        if (currentRow > 0) {
          nextIdx = currentIdx - cols;
        } else {
          nextIdx = (rowCount - 1) * cols + currentCol;
          if (nextIdx >= total) {
            nextIdx = total - 1;
          }
        }
        setSelectedIndex(nextIdx);
        buttonRefs.current[nextIdx]?.focus();
      } else if (e.key === 'Enter') {
        if (closeButtonRef.current && document.activeElement === closeButtonRef.current) {
          return;
        }
        e.preventDefault();
        const targetSystem = currentSystems[currentIdx];
        if (targetSystem && !targetSystem.disabled) {
          handleSelectSystem(targetSystem);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLauncherOpen]);

  if (!shouldRender) return null;

  return (
    <>
      <div
        ref={backdropRef}
        onClick={handleClose}
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-md"
      />

      <div
        ref={panelRef}
        className="fixed inset-0 z-50 flex items-center justify-center p-6 lg:items-start lg:pt-16 lg:p-4 pointer-events-none"
      >
        <div className="w-full max-w-3xl lg:max-w-sm bg-popover/95 backdrop-blur-xl border border-border/80 shadow-2xl rounded-3xl lg:rounded-2xl ring-1 ring-black/5 dark:ring-white/10 p-6 lg:p-4 pointer-events-auto">
          <div className="flex items-center justify-between mb-5 lg:mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm lg:text-xs font-extrabold uppercase tracking-wider text-foreground">Switch System</h2>
              <kbd className="hidden sm:inline-flex h-4.5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                Ctrl+J
              </kbd>
              <p className="text-[11px] text-muted-foreground lg:hidden">Choose a system</p>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
              title="Close (Esc or Ctrl+J)"
            >
              <X className="size-4" />
            </button>
          </div>

          <div ref={gridRef} className="grid grid-cols-2 sm:grid-cols-3 gap-4 lg:gap-2">
            {systems.map((system, index) => {
              const isActive = system.id === activeSystemId;
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={system.id}
                  ref={(el) => {
                    buttonRefs.current[index] = el;
                  }}
                  type="button"
                  disabled={system.disabled}
                  onClick={() => handleSelectSystem(system)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onFocus={() => setSelectedIndex(index)}
                  className={`gsap-launcher-tile relative flex flex-col items-center gap-2 lg:gap-1.5 p-4 lg:p-2 rounded-2xl lg:rounded-lg border transition-[background-color,border-color,box-shadow] text-center outline-none ${
                    system.disabled
                      ? 'border-transparent cursor-not-allowed opacity-60'
                      : isSelected
                      ? 'border-primary/50 bg-accent/90 ring-2 ring-primary/40 shadow-sm cursor-pointer'
                      : 'border-transparent hover:border-border hover:bg-accent/50 cursor-pointer'
                  }`}
                >
                  <AppIcon icon={system.icon} accentClassName={system.accentClassName} size="md" active={isActive} disabled={system.disabled} />
                  <span className={`text-xs lg:text-[10px] leading-tight transition-colors ${isSelected ? 'font-bold text-foreground' : 'font-semibold text-foreground'}`}>
                    {system.name}
                  </span>
                  {system.disabled ? (
                    <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">Coming Soon</span>
                  ) : isActive ? (
                    <span className="text-[9px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-bold">Active</span>
                  ) : isSelected ? (
                    <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">↵ Open</span>
                  ) : (
                    <span className="text-[9px] opacity-0 pointer-events-none select-none h-[18px]">Active</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Keyboard hints footer */}
          <div className="mt-5 pt-3 border-t border-border/40 hidden sm:flex items-center justify-between text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span>Navigate:</span>
              <span className="inline-flex items-center gap-1 font-mono text-[10px]">
                <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted/70 font-semibold shadow-xs">↑</kbd>
                <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted/70 font-semibold shadow-xs">↓</kbd>
                <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted/70 font-semibold shadow-xs">←</kbd>
                <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted/70 font-semibold shadow-xs">→</kbd>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>Open:</span>
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted/70 font-mono text-[10px] font-semibold shadow-xs">↵ Enter</kbd>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AppLauncherOverlay;
