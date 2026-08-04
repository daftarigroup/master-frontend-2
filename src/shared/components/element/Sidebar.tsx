// TODO(migration): LEGACY SIDEBAR — superseded by GlobalSidebar.tsx as of 2026-08-05.
// This file is no longer rendered. The active layout is: App.tsx → GlobalLayout → GlobalSidebar.tsx
// The badge logic here (item.notifications pattern) has known wrong sheet mappings:
//   - make-payment uses storeInSheet instead of paymentsSheet (line ~100)
// DO NOT use this component. It is kept only for diff history reference.
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarHeader,
    SidebarFooter,
    SidebarSeparator,
} from '@/shared/components/ui/sidebar';
import { useAuth } from '@/core/auth';
import { useSheets } from '@/context/SheetsContext';
import type { RouteAttributes } from '@/core/routing';
import { LogOut, RotateCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';
import Logo from './Logo';
import { SystemSwitcher } from './SystemSwitcher';

interface SidebarProps {
    items: RouteAttributes[];
}

export default ({ items }: SidebarProps) => {
    const navigate = useNavigate();
    const {
        indentSheet,
        storeInSheet,
        issueSheet,
        fullkittingSheet,
        pcReportSheet,
        poMasterSheet,
        tallyEntrySheet,
        receivedSheet,
        paymentHistorySheet,
        paymentsSheet,
        updateAll,
        allLoading
    } = useSheets();
    const { user, logout } = useAuth();

    const allItems = [...items];

    return (
        <Sidebar side="left" variant="inset" collapsible="icon">
            <SidebarHeader className="p-4 border-b">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                        <Logo />
                        <div className="group-data-[collapsible=icon]:hidden">
                            <h2 className="text-xl font-bold">Store App</h2>
                            <p className="text-sm">Management System</p>
                        </div>
                    </div>
                    <Button variant="ghost" className="size-7 group-data-[collapsible=icon]:hidden" onClick={() => updateAll()} disabled={allLoading}>
                        <RotateCw />
                    </Button>
                </div>
                <div className="group-data-[collapsible=icon]:hidden">
                    <SystemSwitcher />
                </div>
                <SidebarSeparator className="mt-3" />
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarMenu>
                        {allItems.filter(item => !item.hidden).map((item) => {
                            const isAdmin = user?.administrate === true || String(user?.administrate).toLowerCase() === 'true';
                            if (!isAdmin && item.gateKey) {
                                const allowed = user?.[item.gateKey];
                                const isAllowed = typeof allowed === 'boolean' ? allowed : String(allowed).toLowerCase() === 'true';
                                if (!isAllowed) return null;
                            }

                            let notificationCount = 0;

                            if (item.path === 'approve-indent' || item.path === 'vendor-rate-update' || item.path === 'technical-approval' || item.path === 'rate-approval' || item.path === 'pending-po-to-be-created') {
                                notificationCount = item.notifications(indentSheet, user);
                            } else if (item.path === 'Issue-data') {
                                notificationCount = item.notifications(issueSheet, user);
                            } else if (item.path === 'lifting') {
                                notificationCount = item.notifications(poMasterSheet, user);
                            } else if (item.path === 'store-in') {
                                notificationCount = item.notifications(poMasterSheet, user);
                            } else if (item.path === 'quality-check-receive-item') {
                                notificationCount = item.notifications(storeInSheet, user);
                            } else if (item.path === 'rectify-the-mistake') {
                                notificationCount = item.notifications(storeInSheet, user);
                            } else if (item.path === 'audit-data') {
                                notificationCount = item.notifications(storeInSheet, user);
                            } else if (item.path === 'reaudit-data') {
                                notificationCount = item.notifications(storeInSheet, user);
                            } else if (item.path === 'again-auditing') {
                                notificationCount = item.notifications(storeInSheet, user);
                            } else if (item.path === 'full-kitting') {
                                notificationCount = item.notifications(fullkittingSheet, user);
                            } else if (item.path === 'make-payment') {
                                notificationCount = item.notifications(storeInSheet, user);
                            } else if (item.path === 'tally-entry') {
                                notificationCount = item.notifications(tallyEntrySheet, user);
                            } else if (item.path === 'bill-not-received') {
                                notificationCount = item.notifications(storeInSheet, user);
                            } else if (item.path === 'send-debit-note') {
                                notificationCount = item.notifications(storeInSheet, user);
                            } else if (item.path === 'exchange-materials') {
                                notificationCount = item.notifications(storeInSheet, user);
                            } else if (item.path === 'payment-status') {
                                notificationCount = item.notifications(paymentsSheet, user);
                            }

                            const isActive = window.location.pathname.endsWith(`/${item.path}`) || (item.path === '' && window.location.pathname === '/');

                            return (
                                <SidebarMenuItem key={item.name}>
                                    <SidebarMenuButton
                                        onClick={() => navigate(`/${item.path}`)}
                                        isActive={isActive}
                                        tooltip={item.name}
                                    >
                                        {item.icon}
                                        <span>{item.name}</span>
                                        {notificationCount > 0 && (
                                            <span className="ml-auto bg-primary text-primary-foreground text-xs font-semibold px-2 py-0.5 rounded-full">
                                                {notificationCount}
                                            </span>
                                        )}
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            );
                        })}
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="p-4 border-t-1">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                            {user?.name?.[0] || 'U'}
                        </div>
                        <div>
                            <p className="text-sm font-semibold truncate max-w-[120px]">{user?.name || 'User'}</p>
                            <p className="text-xs text-muted-foreground">{user?.administrate ? 'Admin' : 'User'}</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={logout} title="Logout">
                        <LogOut size={18} />
                    </Button>
                </div>
            </SidebarFooter>
        </Sidebar>
    );
};
