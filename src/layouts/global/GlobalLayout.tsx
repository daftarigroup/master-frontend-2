import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { TopBar } from './components/TopBar';
import { GlobalSidebar } from './components/GlobalSidebar';
import { RouteTransition } from './components/RouteTransition';
import ViewOnlyGuard from '@/components/element/ViewOnlyGuard';
import { PlatformProvider } from './context/PlatformContext';
import { Toaster } from 'react-hot-toast';
import { cn } from '@/lib/utils';

export const GlobalLayout: React.FC = () => {
  const location = useLocation();
  const isGlobalDashboard = location.pathname === '/' || location.pathname === '/dashboard';

  return (
    <PlatformProvider>
      <SidebarProvider defaultOpen={!isGlobalDashboard}>
        <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
        <div className="min-h-screen w-full flex flex-col bg-background text-foreground antialiased">
          {/* Layer 1 TopBar Header */}
          <TopBar />

          {/* Outer Workspace Body — recessed "OS desktop" backdrop */}
          <div className="flex-1 flex w-full overflow-hidden relative bg-muted/40 dark:bg-muted/10">
            <div
              aria-hidden
              className="absolute inset-0 opacity-40 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)',
                backgroundSize: '22px 22px',
              }}
            />

            {/* Layer 1 Platform System Sidebar — hidden entirely on global dashboard */}
            {!isGlobalDashboard && <GlobalSidebar />}

            {/* Inner System Workspace Canvas */}
            <SidebarInset
              className={cn(
                'relative flex-1 min-w-0 flex flex-col overflow-y-auto bg-background shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05),0_1px_4px_-1px_rgba(0,0,0,0.03)]',
                isGlobalDashboard && 'w-full ml-0 md:peer-data-[variant=inset]:m-0 md:peer-data-[variant=inset]:ml-0'
              )}
            >
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

