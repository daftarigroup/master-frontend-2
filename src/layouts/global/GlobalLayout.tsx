import React from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { TopBar } from './components/TopBar';
import { GlobalSidebar } from './components/GlobalSidebar';
import { RouteTransition } from './components/RouteTransition';
import ViewOnlyGuard from '@/components/element/ViewOnlyGuard';
import { PlatformProvider } from './context/PlatformContext';

export const GlobalLayout: React.FC = () => {
  return (
    <PlatformProvider>
      <SidebarProvider>
        <div className="min-h-screen w-full flex flex-col bg-background text-foreground antialiased">
          {/* Layer 1 TopBar Header */}
          <TopBar />

          {/* Outer Workspace Body — recessed "OS desktop" backdrop the
              workspace window floats over (OS-shell redesign, Direction 3). */}
          <div className="flex-1 flex w-full overflow-hidden relative bg-muted/40 dark:bg-muted/10">
            <div
              aria-hidden
              className="absolute inset-0 opacity-40 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)',
                backgroundSize: '22px 22px',
              }}
            />

            {/* Layer 1 Platform System Sidebar */}
            <GlobalSidebar />

            {/* Inner System Workspace Canvas — floating "window" card (rounded
                corners + soft layered shadow per APP_DESIGN_LAYOUT_DOCUMENTATION.md
                §4A) rather than a flat, edge-to-edge surface. */}
            <SidebarInset className="relative flex-1 min-w-0 flex flex-col overflow-y-auto bg-background shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05),0_1px_4px_-1px_rgba(0,0,0,0.03)]">
              <main className="flex-1 flex flex-col min-h-0 p-4 md:p-6">
                <ViewOnlyGuard>
                  <RouteTransition>
                    <Outlet />
                  </RouteTransition>
                </ViewOnlyGuard>
              </main>
            </SidebarInset>
          </div>
        </div>
      </SidebarProvider>
    </PlatformProvider>
  );
};

export default GlobalLayout;
