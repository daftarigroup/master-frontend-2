import { SidebarInset, SidebarProvider } from '@/shared/components/ui/sidebar';
import Sidebar from '@/shared/components/element/Sidebar';
import { Outlet } from 'react-router-dom';
import type { RouteAttributes } from '@/core/routing';
import ViewOnlyGuard from '@/app/guards/ViewOnlyGuard';

export default ({ routes }: { routes: RouteAttributes[] }) => {
    return (
        <div className="flex w-full h-screen">
            <SidebarProvider>
                <Sidebar items={routes} />
                <SidebarInset>
                    <main className="flex-1 overflow-y-auto overflow-x-hidden rounded-md min-w-0">
                        <div className="h-full">
                            <ViewOnlyGuard>
                                <Outlet />
                            </ViewOnlyGuard>
                        </div>
                    </main>
                </SidebarInset>
            </SidebarProvider>
        </div>
    );
};
