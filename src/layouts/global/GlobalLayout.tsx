import React from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { TopBar } from './components/TopBar';
import { GlobalSidebar } from './components/GlobalSidebar';
import ViewOnlyGuard from '@/components/element/ViewOnlyGuard';
import { PlatformProvider } from './context/PlatformContext';

export const GlobalLayout: React.FC = () => {
  return (
    <PlatformProvider>
      <SidebarProvider>
        <div className="min-h-screen w-full flex flex-col bg-background text-foreground antialiased">
          {/* Layer 1 TopBar Header */}
          <TopBar />

          {/* Outer Workspace Body */}
          <div className="flex-1 flex w-full overflow-hidden">
            {/* Layer 1 Platform System Sidebar */}
            <GlobalSidebar />

            {/* Inner System Workspace Canvas */}
            <SidebarInset className="flex-1 min-w-0 flex flex-col overflow-y-auto bg-muted/20">
              <main className="flex-1 p-4 md:p-6">
                <ViewOnlyGuard>
                  <Outlet />
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
