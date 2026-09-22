import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { usePlatform } from '../context/PlatformContext';
import { NAV_CONFIG, getOrderedNavConfig } from '../config/navConfig';
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
  const navigate = useNavigate();

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

  useEffect(() => {
    if (!isLauncherOpen && shouldRender) {
      handleClose();
    }
  }, [isLauncherOpen, shouldRender]);

  useEffect(() => {
    if (!isLauncherOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j')) {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLauncherOpen]);

  const handleClose = () => {
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
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
              title="Close (Esc or Ctrl+J)"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 lg:gap-2">
            {getOrderedNavConfig().filter((sys) => sys.id === 'global' || isSystemPermitted(user, sys)).map((system) => {
              const isActive = system.id === activeSystemId;
              return (
                <button
                  key={system.id}
                  type="button"
                  disabled={system.disabled}
                  onClick={() => {
                    if (system.disabled) return;
                    setActiveSystemId(system.id);
                    navigate(system.dashboardPath);
                    handleClose();
                  }}
                  className={`gsap-launcher-tile flex flex-col items-center gap-2 lg:gap-1.5 p-4 lg:p-2 rounded-2xl lg:rounded-lg border transition-colors text-center ${
                    system.disabled
                      ? 'border-transparent cursor-not-allowed opacity-60'
                      : 'border-transparent hover:border-border hover:bg-accent/50 cursor-pointer'
                  }`}
                >
                  <AppIcon icon={system.icon} accentClassName={system.accentClassName} size="md" active={isActive} disabled={system.disabled} />
                  <span className="text-xs lg:text-[10px] font-semibold text-foreground leading-tight">{system.name}</span>
                  {system.disabled ? (
                    <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">Coming Soon</span>
                  ) : isActive ? (
                    <span className="text-[9px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-bold">Active</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

export default AppLauncherOverlay;
