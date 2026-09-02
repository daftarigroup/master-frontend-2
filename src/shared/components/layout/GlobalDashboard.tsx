import React from 'react';
import PageLayout from './PageLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Lock, Sparkles, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { isSystemPermitted } from '@/components/element/PermissionGuard';
import { getOrderedNavConfig } from '@/layouts/global/config/navConfig';
import { AppIcon } from '@/layouts/global/components/AppIcon';
import { usePlatform } from '@/layouts/global/context/PlatformContext';
import { cn } from '@/lib/utils';

export const GlobalDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setActiveSystemId } = usePlatform();

  // Get all systems except global itself
  const systems = getOrderedNavConfig().filter((s) => s.id !== 'global');

  return (
    <PageLayout
      title="Platform Enterprise Dashboard"
      breadcrumbs={[{ label: 'Platform' }, { label: 'Global Dashboard' }]}
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Welcome Hero Banner */}
        <Card className="relative overflow-hidden border-border/60 bg-gradient-to-r from-primary/10 via-primary/5 to-background shadow-xs">
          <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 size-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <CardContent className="p-6 relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                  <Sparkles className="size-3" /> Enterprise Master Platform
                </span>
              </div>
              <h2 className="text-xl font-extrabold tracking-tight text-foreground">
                Welcome to Enterprise Hub
              </h2>
              <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
                Select any functional system below to open its dedicated workspace and access operational views.
              </p>
            </div>

            <div className="hidden lg:flex items-center gap-3 text-xs text-muted-foreground bg-background/60 backdrop-blur-sm px-3.5 py-2 rounded-xl border border-border/50">
              <Layers className="size-4 text-primary" />
              <span>
                <strong className="text-foreground font-semibold">{systems.length}</strong> Enterprise Systems Available
              </span>
            </div>
          </CardContent>
        </Card>

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

        {/* Medium-Sized Grid Icons Navigation */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-4 sm:gap-5">
          {systems.map((system) => {
            const hasPermission = system.disabled ? false : isSystemPermitted(user, system);
            const isViewOnly = user?.modify_access === 'VIEW';
            const isCardDisabled = system.disabled || !hasPermission;
            const viewsCount = system.groups.reduce((acc, g) => acc + g.items.length, 0);

            let badgeText = `${viewsCount} ${viewsCount === 1 ? 'View' : 'Views'}`;
            let badgeStyle = 'bg-primary/10 text-primary border-primary/20';

            if (system.disabled) {
              badgeText = 'Coming Soon';
              badgeStyle = 'bg-muted text-muted-foreground border-border/40';
            } else if (!hasPermission) {
              badgeText = 'No Access';
              badgeStyle = 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
            } else if (isViewOnly) {
              badgeText = 'View Only';
              badgeStyle = 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20';
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
                className={cn(
                  'group relative flex flex-col items-center justify-between p-5 sm:p-6 rounded-2xl border transition-all duration-200 text-center min-h-[160px]',
                  isCardDisabled
                    ? 'cursor-not-allowed opacity-60 bg-muted/30 border-border/40'
                    : 'cursor-pointer bg-card/90 hover:bg-card border-border/80 hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 active:scale-[0.98]'
                )}
              >
                <div className="flex flex-col items-center gap-3 w-full">
                  <div className="relative">
                    <AppIcon
                      icon={system.icon}
                      accentClassName={system.accentClassName}
                      size="lg"
                      disabled={system.disabled}
                      className={cn(
                        'shadow-md transition-transform duration-200',
                        !isCardDisabled && 'group-hover:scale-110'
                      )}
                    />
                    {!hasPermission && !system.disabled && (
                      <span className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full shadow-sm ring-2 ring-background">
                        <Lock className="size-2.5" />
                      </span>
                    )}
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
                      'text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors inline-flex items-center gap-1',
                      badgeStyle
                    )}
                  >
                    {!hasPermission && !system.disabled && <Lock className="size-2.5" />}
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
