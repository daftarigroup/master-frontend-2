import React, { useRef } from 'react';
import PageLayout from './PageLayout';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { isSystemPermitted } from '@/components/element/PermissionGuard';
import { getOrderedNavConfig } from '@/layouts/global/config/navConfig';
import { AppIcon } from '@/layouts/global/components/AppIcon';
import { usePlatform } from '@/layouts/global/context/PlatformContext';
import { getAccentStyle } from '@/layouts/global/config/accentStyles';
import { cn } from '@/lib/utils';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

export const GlobalDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setActiveSystemId } = usePlatform();
  const containerRef = useRef<HTMLDivElement>(null);
  const iconRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Get all systems except global itself
  // Get all systems except global itself, then hide any that the user has no access to
  const allSystems = getOrderedNavConfig().filter((s) => s.id !== 'global');
  const systems = allSystems.filter((s) => {
    // Always show 'Coming Soon' disabled systems (optional — remove this line to hide them too)
    if (s.disabled) return true;
    // Hide if user has no permission at all for this system
    return isSystemPermitted(user, s);
  });

  // GSAP animations for lively wobbly motion and entrance
  useGSAP(
    () => {
      const cards = containerRef.current?.querySelectorAll('.system-card-item');
      if (!cards || cards.length === 0) return;

      // Staggered entrance animation for cards
      gsap.fromTo(
        cards,
        { scale: 0.9, opacity: 0, y: 16 },
        { scale: 1, opacity: 1, y: 0, duration: 0.45, stagger: 0.05, ease: 'back.out(1.5)' }
      );

      // Subtle lively ambient float & wobble on each system icon
      iconRefs.current.forEach((iconEl, idx) => {
        if (!iconEl) return;
        gsap.to(iconEl, {
          rotation: idx % 2 === 0 ? 3.5 : -3.5,
          y: -4,
          duration: 2 + (idx % 3) * 0.4,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: idx * 0.12,
        });
      });
    },
    { scope: containerRef, dependencies: [systems.length] }
  );

  const handleCardMouseEnter = (idx: number, disabled: boolean) => {
    if (disabled) return;
    const iconEl = iconRefs.current[idx];
    if (!iconEl) return;

    gsap.killTweensOf(iconEl);
    gsap
      .timeline()
      .to(iconEl, {
        scale: 1.18,
        rotation: idx % 2 === 0 ? -12 : 12,
        duration: 0.12,
        ease: 'power1.out',
      })
      .to(iconEl, {
        rotation: idx % 2 === 0 ? 10 : -10,
        duration: 0.12,
        ease: 'power1.inOut',
      })
      .to(iconEl, {
        rotation: idx % 2 === 0 ? -6 : 6,
        duration: 0.1,
        ease: 'power1.inOut',
      })
      .to(iconEl, {
        rotation: idx % 2 === 0 ? 3 : -3,
        duration: 0.1,
        ease: 'power1.inOut',
      })
      .to(iconEl, {
        rotation: 0,
        scale: 1.15,
        duration: 0.18,
        ease: 'power2.out',
      });
  };

  const handleCardMouseLeave = (idx: number, disabled: boolean) => {
    if (disabled) return;
    const iconEl = iconRefs.current[idx];
    if (!iconEl) return;

    gsap.killTweensOf(iconEl);
    gsap.to(iconEl, {
      scale: 1,
      rotation: 0,
      y: 0,
      duration: 0.35,
      ease: 'power2.out',
      onComplete: () => {
        // Resume ambient subtle wobble
        gsap.to(iconEl, {
          rotation: idx % 2 === 0 ? 3.5 : -3.5,
          y: -4,
          duration: 2 + (idx % 3) * 0.4,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      },
    });
  };

  return (
    <PageLayout
      title="Platform Enterprise Dashboard"
      breadcrumbs={[{ label: 'Platform' }, { label: 'Global Dashboard' }]}
    >
      <div ref={containerRef} className="space-y-6 max-w-7xl mx-auto">
        {/* Systems Section Header */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
              Systems & Modules
            </h3>
            <p className="text-xs text-muted-foreground">
              Click on any module to switch workspace
            </p>
          </div>
        </div>

        {/* Responsive Grid Icons Navigation */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-4 sm:gap-6">
          {systems.map((system, idx) => {
            const isViewOnly = user?.modify_access === 'VIEW';
            const isCardDisabled = system.disabled ?? false;
            const viewsCount = system.groups.reduce((acc, g) => acc + g.items.filter((it) => !it.hidden).length, 0);
            const accent = getAccentStyle(system.accentClassName);

            let badgeText = `${viewsCount} ${viewsCount === 1 ? 'View' : 'Views'}`;
            let badgeStyle = 'bg-primary/10 text-primary border-transparent';

            if (system.disabled) {
              badgeText = 'Coming Soon';
              badgeStyle = 'bg-muted text-muted-foreground border-transparent';
            } else if (isViewOnly) {
              badgeText = 'View Only';
              badgeStyle = 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-transparent';
            }

            return (
              <div
                key={system.id}
                role="button"
                tabIndex={isCardDisabled ? -1 : 0}
                onClick={() => {
                  if (isCardDisabled) return;
                  setActiveSystemId(system.id);
                  navigate(system.dashboardPath);
                }}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && !isCardDisabled) {
                    e.preventDefault();
                    setActiveSystemId(system.id);
                    navigate(system.dashboardPath);
                  }
                }}
                onMouseEnter={() => handleCardMouseEnter(idx, isCardDisabled)}
                onMouseLeave={() => handleCardMouseLeave(idx, isCardDisabled)}
                className={cn(
                  'system-card-item group relative flex flex-col items-center justify-between p-5 sm:p-6 rounded-2xl border border-transparent transition-all duration-200 text-center min-h-[175px]',
                  isCardDisabled
                    ? 'cursor-not-allowed opacity-50 bg-muted/10'
                    : 'cursor-pointer bg-card/40 hover:bg-card/90 hover:shadow-xl hover:-translate-y-1 active:scale-[0.98]'
                )}
              >
                <div className="flex flex-col items-center gap-3.5 w-full">
                  <div
                    ref={(el) => {
                      iconRefs.current[idx] = el;
                    }}
                    className="relative will-change-transform"
                  >
                    <AppIcon
                      icon={system.icon}
                      accentClassName={system.accentClassName}
                      size="lg"
                      disabled={system.disabled}
                      className={cn(
                        'shadow-xl border-2 border-white/95 dark:border-white/50 ring-4 ring-offset-2 ring-offset-background/80 transition-shadow duration-200',
                        !isCardDisabled ? accent.ring : 'ring-transparent'
                      )}
                    />

                  </div>

                  <div className="space-y-0.5 w-full">
                    <h4 className="text-xs sm:text-sm font-bold text-foreground tracking-tight line-clamp-1 group-hover:text-primary transition-colors">
                      {system.name}
                    </h4>
                  </div>
                </div>

                <div className="pt-2">
                  <span
                    className={cn(
                      'text-[10px] font-semibold px-2.5 py-0.5 rounded-full border transition-colors inline-flex items-center gap-1',
                      badgeStyle
                    )}
                  >
                    {badgeText}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PageLayout>
  );
};

export default GlobalDashboard;

